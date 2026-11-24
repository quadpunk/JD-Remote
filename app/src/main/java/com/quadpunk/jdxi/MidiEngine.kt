package com.quadpunk.jdxi

import android.content.Context
import android.media.midi.MidiDevice
import android.media.midi.MidiDeviceInfo
import android.media.midi.MidiInputPort
import android.media.midi.MidiManager
import android.media.midi.MidiOutputPort
import android.media.midi.MidiReceiver
import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Owns every Android MIDI port. Both the WebView (through [WebMidiBridge]) and the native [Sequencer] send through
 * this one object, because a MIDI port can only be opened by one client at a time.
 *
 * Port ids: "o:<deviceId>:<port>" = a port we SEND to (Web MIDI "output"), "i:<deviceId>:<port>" = a port we RECEIVE from.
 */
class MidiEngine(ctx: Context) {
    private val mm = ctx.getSystemService(Context.MIDI_SERVICE) as? MidiManager
    private val main = Handler(Looper.getMainLooper())

    class PortRef(val id: String, val name: String, val manufacturer: String, val sendable: Boolean, val deviceId: Int)

    private val sendPorts = ConcurrentHashMap<String, MidiInputPort>()
    private val recvPorts = ConcurrentHashMap<String, MidiOutputPort>()
    private val devices = ConcurrentHashMap<Int, MidiDevice>()
    private val opening = ConcurrentHashMap<Int, CountDownLatch>()
    /** How many times opening a device returned null (busy / not ready yet); it is retried a few times. */
    private val openFailures = ConcurrentHashMap<Int, Int>()

    @Volatile var ports: List<PortRef> = emptyList(); private set
    var status by mutableStateOf("Looking for MIDI devices…"); private set

    /** Called (on the main thread) whenever the port list changed. */
    var onPortsChanged: (() -> Unit)? = null
    /** Called on the MIDI thread for every chunk received from a port. */
    val incoming = CopyOnWriteArrayList<(String, ByteArray) -> Unit>()

    val available: Boolean get() = mm != null

    private val deviceCallback = object : MidiManager.DeviceCallback() {
        override fun onDeviceAdded(info: MidiDeviceInfo) { openDevice(info); refresh() }
        override fun onDeviceRemoved(info: MidiDeviceInfo) { closeDevice(info.id); refresh() }
    }

    init {
        mm?.let { m ->
            m.registerDeviceCallback(deviceCallback, main)
            for (info in m.devices) openDevice(info)
            refresh()
        } ?: run { status = "This device has no MIDI support" }
    }

    // ───── device handling ─────

    private fun deviceName(info: MidiDeviceInfo): String {
        val p = info.properties
        return p.getString(MidiDeviceInfo.PROPERTY_NAME)
            ?: p.getString(MidiDeviceInfo.PROPERTY_PRODUCT)
            ?: "MIDI device ${info.id}"
    }

    private fun openDevice(info: MidiDeviceInfo) {
        val m = mm ?: return
        if (devices.containsKey(info.id) || opening.containsKey(info.id)) return
        val latch = CountDownLatch(1)
        opening[info.id] = latch
        m.openDevice(info, { dev ->
            try {
                if (dev != null) { openFailures.remove(info.id); attach(info, dev) }
                else scheduleRetry(info)
            } finally {
                opening.remove(info.id)
                latch.countDown()
                refresh()
            }
        }, main)
    }

    /** The system sometimes hands back null right after the USB device appears (or while another app still holds it). Try again a few times. */
    private fun scheduleRetry(info: MidiDeviceInfo) {
        val n = (openFailures[info.id] ?: 0) + 1
        openFailures[info.id] = n
        if (n > 3) return
        main.postDelayed({
            val stillThere = mm?.devices?.any { it.id == info.id } == true
            if (stillThere && !devices.containsKey(info.id)) openDevice(info)
        }, 1200L * n)
    }

    private fun attach(info: MidiDeviceInfo, dev: MidiDevice) {
        devices[info.id] = dev
        for (p in info.ports) {
            if (p.type == MidiDeviceInfo.PortInfo.TYPE_INPUT) {
                dev.openInputPort(p.portNumber)?.let { sendPorts["o:${info.id}:${p.portNumber}"] = it }
            } else {
                val id = "i:${info.id}:${p.portNumber}"
                dev.openOutputPort(p.portNumber)?.let { op ->
                    op.connect(object : MidiReceiver() {
                        override fun onSend(msg: ByteArray, offset: Int, count: Int, timestamp: Long) {
                            if (count <= 0) return
                            val data = msg.copyOfRange(offset, offset + count)
                            for (l in incoming) l(id, data)
                        }
                    })
                    recvPorts[id] = op
                }
            }
        }
    }

    private fun closeDevice(deviceId: Int) {
        val prefixO = "o:$deviceId:"; val prefixI = "i:$deviceId:"
        sendPorts.keys.filter { it.startsWith(prefixO) }.forEach { runCatching { sendPorts.remove(it)?.close() } }
        recvPorts.keys.filter { it.startsWith(prefixI) }.forEach { runCatching { recvPorts.remove(it)?.close() } }
        runCatching { devices.remove(deviceId)?.close() }
        openFailures.remove(deviceId)
    }

    private fun refresh() {
        val m = mm ?: return
        val list = ArrayList<PortRef>()
        val infos = m.devices
        for (info in infos) {
            val name = deviceName(info)
            val maker = info.properties.getString(MidiDeviceInfo.PROPERTY_MANUFACTURER) ?: ""
            val multi = info.ports.size > 2
            for (p in info.ports) {
                val send = p.type == MidiDeviceInfo.PortInfo.TYPE_INPUT
                val id = (if (send) "o" else "i") + ":${info.id}:${p.portNumber}"
                // A port that could not be opened would only give "Port busy" when chosen, so hide it
                // (ports of a device that is still being opened stay listed; openPort() waits for them).
                if (!sendPorts.containsKey(id) && !recvPorts.containsKey(id) && !opening.containsKey(info.id)) continue
                val full = if (multi && !p.name.isNullOrBlank()) "$name ${p.name}" else name
                list.add(PortRef(id, full, maker, send, info.id))
            }
        }
        ports = list
        val out = defaultSend()
        status = when {
            out != null -> "MIDI: ${out.name}"
            infos.isEmpty() -> "No MIDI device found. Connect the JD-Xi or JD-XA with a USB cable."
            else -> "MIDI device found, but no port could be opened (is another app using it?)"
        }
        onPortsChanged?.invoke()
    }

    fun portsJson(): String {
        val a = JSONArray()
        for (p in ports) a.put(JSONObject().put("id", p.id).put("name", p.name).put("manufacturer", p.manufacturer).put("type", if (p.sendable) "output" else "input"))
        return a.toString()
    }

    private val jdName = Regex("JD.?-?X[ia]|Roland", RegexOption.IGNORE_CASE)
    private val softPort = Regex("through|peripheral|virtual|wavetable|gs synth", RegexOption.IGNORE_CASE)

    /**
     * The port the native sequencer sends to: the JD-Xi / JD-XA by name, then anything made by Roland (with USB Drv = GENERIC
     * the product string does not always contain the model), then any real port. Software / virtual ports and MIDI-through
     * ports come last, so they are never picked while a real synth is connected.
     */
    private fun defaultSend(): PortRef? {
        val sendable = ports.filter { it.sendable && sendPorts.containsKey(it.id) }
        return sendable.firstOrNull { jdName.containsMatchIn(it.name) && !softPort.containsMatchIn(it.name) }
            ?: sendable.firstOrNull { it.manufacturer.contains("Roland", true) && !softPort.containsMatchIn(it.name) }
            ?: sendable.firstOrNull { !softPort.containsMatchIn(it.name) }
            ?: sendable.firstOrNull()
    }

    // ───── used by the WebView bridge ─────

    /** Waits (max 2 s, on the caller's background thread) for the device to be opened, then reports whether the port is usable. */
    fun openPort(id: String): Boolean {
        val dev = id.split(":").getOrNull(1)?.toIntOrNull() ?: return false
        opening[dev]?.await(2, TimeUnit.SECONDS)
        return sendPorts.containsKey(id) || recvPorts.containsKey(id)
    }

    /** [delayMs] > 0 schedules the message on the Android MIDI clock so that timing stays tight even if the WebView jitters. */
    fun sendTo(id: String, data: ByteArray, delayMs: Double): Boolean {
        val port = sendPorts[id] ?: return false
        return try {
            if (delayMs > 0.5) port.send(data, 0, data.size, System.nanoTime() + (delayMs * 1_000_000).toLong())
            else port.send(data, 0, data.size)
            true
        } catch (_: Exception) { false }
    }

    // ───── used by the native sequencer ─────

    fun send(data: ByteArray) {
        val id = defaultSend()?.id ?: return
        sendTo(id, data, 0.0)
    }

    fun audition(ch: Int, key: Int, vel: Int) {
        send(byteArrayOf((0x90 or ch).toByte(), key.toByte(), vel.toByte()))
        main.postDelayed({ send(byteArrayOf((0x80 or ch).toByte(), key.toByte(), 0)) }, 220)
    }

    fun jdxiStart() = send(byteArrayOf(0xFA.toByte()))
    fun jdxiStop() = send(byteArrayOf(0xFC.toByte()))
    fun jdxiContinue() = send(byteArrayOf(0xFB.toByte()))

    fun close() {
        runCatching { mm?.unregisterDeviceCallback(deviceCallback) }
        devices.keys.toList().forEach { closeDevice(it) }
    }
}
