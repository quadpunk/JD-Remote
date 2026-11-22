/* JD-XA verified temporary-memory tools. No permanent store, no fabricated preset names.
 * Address reference: Roland JD-XA MIDI Implementation v1.00, parameter address map pp.8-19.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id), xa=window.JDXA;
if(!xa)return;
const BASE=xa.encodedAddress('18000000');
const region=(label,hex,size)=>({label,addr:xa.encodedAddress(hex),size});
// Contiguous documented blocks ONLY; do not assume undocumented gaps contain a writable patch.
const blocks=[region('Program Common (includes name)','18000000',0x57),region('Program Reverb','18000200',0x64),region('Program Delay','18000300',0x7c),region('Program Vocoder','18000400',0x2b),region('Program TFX1 (header + params)','18000500',0x40),region('Program TFX2 (header + params)','18000600',0x40),region('Arpeggio Common','18006000',8)];
for(let i=0;i<8;i++){
 const part=(i<4?'Analog ':'Digital ')+(i%4+1);
 const h=xa.addrBytes(BASE+((0x20+i)*128**2)).map(n=>n.toString(16).padStart(2,'0')).join('');
 blocks.push(region(part+' Part Settings',h,0x14));
 const eq=xa.addrBytes(BASE+((0x30+i)*128**2)).map(n=>n.toString(16).padStart(2,'0')).join('');
 blocks.push(region(part+' EQ',eq,8));
}
// All sixteen program-part and zone regions, preserving raw data for offline analysis.
// Zone length 0x21 per MIDI implementation (offset 00 00 21).
for(let i=0;i<16;i++){
 const kind=i<4?'Analog':i<8?'Digital':'MIDI Control';const num=i<8?(i%4+1):(i-7);
 const suffix=kind+' '+num;
 if(i>=8){
  const partAddr=xa.addrBytes(BASE+(0x20+i)*128**2).map(v=>v.toString(16).padStart(2,'0')).join('');
  blocks.push(region(suffix+' Part Settings',partAddr,0x14));
 }
 const zoneAddr=xa.addrBytes(BASE+(0x40+i)*128**2).map(v=>v.toString(16).padStart(2,'0')).join('');
 blocks.push(region(suffix+' Zone',zoneAddr,0x21));
}
// Separate temporary tone data; documented offsets 00 00 00 (common),
// 00 01 00 (analog partial), 00 02 00 (MFX), 00 20-22 00 (digital partials).
for(let i=0;i<8;i++){
 const base=xa.encodedAddress(i<4?'19000000':'1a000000')+(i%4)*0x20*128**2;
 const add=(name,offset,size)=>{const h=xa.addrBytes(base+offset).map(v=>v.toString(16).padStart(2,'0')).join('');blocks.push(region(name,h,size))};
 const prefix=(i<4?'Analog ':'Digital ')+(i%4+1);
 add(prefix+' Tone Common',0,32);
 add(prefix+' MFX (type and parameters, partial region)',2*128,48);
 if(i<4)add(prefix+' Tone Partial',128,48);
 else for(let j=0;j<3;j++)add(prefix+' Partial '+(j+1),(0x20+j)*128,48);
}
// Additional arpeggio note pattern blocks (16 slots; each block read conservatively).
for(let i=0;i<16;i++){
 const h=xa.addrBytes(BASE+((0x61+i)*128**2)).map(n=>n.toString(16).padStart(2,'0')).join('');
 blocks.push(region(`Arpeggio Note ${i+1} (32 steps, nibble pairs)`,h,0x42));
}
const factory={A01:'Massive Pad',A02:'Masaki Brass',A03:'Pomona Lead',A04:'Square Rip',A05:'Rounder Bass',A06:'Pillbox Bass',A07:'Anthem Lead',A16:'TR Drums'};
const status=(s)=>{$('xa-deep-status').textContent=s};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const hex=b=>b.map(x=>x.toString(16).padStart(2,'0').toUpperCase()).join(' ');
let busy=false,lastCapture=null,imported=null;
const getModel=()=>xa.model()==='xa';
function ensure(){if(!getModel())throw Error('Välj JD-XA-läget först.');if(!xa.identified())throw Error('IDENTIFIERA ENHET först. Förhindrar oavsiktlig skrivning till fel synt.');}
function readChunk(addr,size,timeout=1800){return new Promise((resolve,reject)=>{
 let buff=new Array(size).fill(null);const cleanup=()=>{clearTimeout(t);window.removeEventListener('jdxa-dt1',onData);window.removeEventListener('jd-model-change',onMode)};
 const fail=msg=>{cleanup();reject(Error(msg))};const onMode=()=>{if(!getModel())fail('Modellen ändrades under överföringen')};
 const onData=e=>{const a=e.detail.addr,bytes=e.detail.body;if(a<addr||a>=addr+size)return;for(let i=0;i<bytes.length&&a+i<addr+size;i++)buff[a+i-addr]=bytes[i];if(buff.every(v=>v!==null)){cleanup();resolve(buff)}};
 const t=setTimeout(()=>fail('Timeout: JD-XA svarade inte på '+hex(xa.addrBytes(addr))+' ('+size+' byte).'),timeout);
 window.addEventListener('jdxa-dt1',onData);window.addEventListener('jd-model-change',onMode);
 try{if(!xa.rq(addr,size))fail('MIDI skickades inte')}catch(e){fail(e.message)}
 })}
async function guardedRead(block){const result=[];for(let off=0;off<block.size;off+=32){ensure();const size=Math.min(32,block.size-off);result.push(...await readChunk(block.addr+off,size));await pause(45)}return result}
async function lock(work){if(busy){status('En annan MIDI-överföring pågår.');return}busy=true;try{await work()}catch(e){status('Fel: '+e.message)}finally{busy=false}}
function download(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function validateCapture(v){if(v?.format!=='jdxa-temporary-snapshot-v1'||!Array.isArray(v.blocks)||v.blocks.length<1)throw Error('Inte en JD-XA snapshot');let used=new Set();for(const b of v.blocks){const known=blocks.find(x=>x.label===b.label&&x.addr===b.addr&&x.size===b.bytes?.length);if(!known||used.has(b.label)||b.bytes.some(x=>!Number.isInteger(x)||x<0||x>127))throw Error('Ogiltig region eller data i '+b.label);used.add(b.label)}return v}
const select=$('xa-deep-block');blocks.forEach((b,i)=>{const o=document.createElement('option');o.value=i;o.textContent=b.label+' ('+b.size+' bytes)';select.append(o)});
$('xa-deep-read').onclick=()=>lock(async()=>{ensure();const b=blocks[+select.value];status('Läser '+b.label+'…');const bytes=await guardedRead(b);lastCapture={format:'jdxa-temporary-snapshot-v1',created:new Date().toISOString(),blocks:[{...b,bytes}]};status('Läst '+b.label+': '+bytes.length+' bytes. '+hex(bytes.slice(0,16))+' …');});
$('xa-deep-backup').onclick=()=>lock(async()=>{ensure();const pick=blocks;const result=[];for(let i=0;i<pick.length;i++){const b=pick[i];status(`Läser ${i+1}/${pick.length}: ${b.label}…`);try{result.push({...b,bytes:await guardedRead(b)})}catch(e){status(`Avbrutet på ${b.label}: ${e.message}. Tidigare block kan exporteras.`);lastCapture={format:'jdxa-temporary-snapshot-v1',created:new Date().toISOString(),partial:true,blocks:result};return}}lastCapture={format:'jdxa-temporary-snapshot-v1',created:new Date().toISOString(),partial:false,blocks:result};status(`Läst ${result.length} delblock; teknisk ögonblicksbild (INTE fullständig patchbackup). Exportera JSON.`)});
$('xa-deep-export').onclick=()=>{if(!lastCapture){status('Läs minst ett block först');return}download('JD-XA-temporary-data.json',lastCapture)};
$('xa-deep-import').onchange=async e=>{try{const f=e.target.files?.[0];if(!f||f.size>150000)throw Error('Fil saknas eller är för stor');imported=validateCapture(JSON.parse(await f.text()));status('Importerade '+imported.blocks.length+' dokumenterade regioner lokalt. Ingen data skickad.');}catch(err){imported=null;status('Import: '+err.message)}};
// Bytes are written in SMALL DT1 sections to temporary program, NEVER to bank/persistent memory.
// Reserved bytes are written only as part of exact previously acquired snapshots, no synthesized patch values.
$('xa-deep-restore').onclick=()=>lock(async()=>{ensure();const snap=imported||lastCapture;if(!snap)throw Error('Importera/läs data först.');validateCapture(snap);
 if(!confirm(`Skriv ${snap.blocks.length} block till JD-XA:s TEMPORARY program?\n\nDetta ändrar ljudet som spelas och kan skriva över osparade ändringar. Den skriver INTE till INT/USB-programminnet. Gör helst en backup direkt på synten innan.`))return;
 if(!confirm('Bekräfta JD-XA TEMPORARY WRITE. Data är inte hårdvarutestade. Fortsätta?'))return;
 let count=0;for(const b of snap.blocks){ensure();for(let off=0;off<b.bytes.length;off+=16){const chunk=b.bytes.slice(off,off+16);if(!xa.sysex(0x12,b.addr+off,chunk))throw Error('Skrivningen avbröts efter '+count+' byte.');count+=chunk.length;status('TEMPORARY WRITE '+b.label+' '+count+' byte…');await pause(45)}}status('DT1 skickad: '+count+' byte till TEMPORARY minne. Syntens mottagning är inte verifierad automatiskt.')});
// One-field editor: read the actual current value before changing it; precise documented offsets.
const params=[
 ['PROGRAM','Program Level','1800000c',0,127],
 ['REVERB','Reverb On','18000200',0,1],['REVERB','Reverb Type (index)','18000201',0,6],['REVERB','Reverb Level','18000202',0,127],
 ['DELAY','Delay On','18000300',0,1],['DELAY','Delay Level','18000302',0,127],
 ['TFX1','TFX1 On','18000500',0,1],['TFX1','TFX1 Type (index)','18000501',0,29],['TFX1','Headroom','18000502',0,6],
 ['TFX2','TFX2 On','18000600',0,1],['TFX2','TFX2 Type (index)','18000601',0,29],['TFX2','Headroom','18000602',0,6],
 ['ARP','Grid','18006000',0,8],['ARP','Duration','18006001',0,9],['ARP','Motif','18006002',0,11],['ARP','Octave range (encoded -3…+3)','18006003',61,67],['ARP','Accent Rate','18006004',0,100],['ARP','Velocity (0 = real)','18006005',0,127],['ARP','End Step MSB','18006006',0,15],['ARP','End Step LSB','18006007',0,15]
];
for(let i=0;i<8;i++){
 const a=xa.encodedAddress(i<4?'19000000':'1a000000')+((i%4)*0x20+(i<4?2:1))*128**2+2*128;
 const h=xa.addrBytes(a).map(v=>v.toString(16).padStart(2,'0')).join('');
 params.push(['MFX','MFX '+(i<4?'Analog ':'Digital ')+(i%4+1)+' Type (index)',h,0,67]);
}
const grid=['04' ,'08','08L','08H','08t','16','16L','16H','16t'],duration=['30','40','50','60','70','80','90','100','120','FUL'],motif=['UP/L','UP/L&H','UP/_','DOWN/L','DOWN/L&H','DOWN/_','UP&DOWN/L','UP&DOWN/L&H','UP&DOWN/_','RANDOM/L','RANDOM/_','PHRASE'];
const psel=$('xa-deep-param');for(let i=0;i<params.length;i++){const o=document.createElement('option');o.value=i;o.textContent=params[i][0]+' · '+params[i][1];psel.append(o)}
let readValue=null,readParam=-1;
function show(){const p=params[+psel.value],v=readParam===+psel.value?readValue:null;const inp=$('xa-deep-value');inp.min=p[3];inp.max=p[4];inp.value=v??p[3];$('xa-deep-range').textContent=`${p[3]}–${p[4]}`;const x=p[1];const names=x==='Grid'?grid:x==='Duration'?duration:x==='Motif'?motif:null;$('xa-deep-readable').textContent=v===null?'Ej avläst':names?`${v} · ${names[v]||'?'}`:x.startsWith('Octave')?`${v-64} oktav`:String(v)}
psel.onchange=()=>{show()};$('xa-deep-value').oninput=()=>{$('xa-deep-readable').textContent='Nytt värde '+$('xa-deep-value').value};show();
$('xa-deep-param-read').onclick=()=>lock(async()=>{ensure();const idx=+psel.value,p=params[idx],v=(await readChunk(xa.encodedAddress(p[2]),1))[0];readValue=v;readParam=idx;show();status('JD-XA readback: '+p[1]+' = '+v)});
$('xa-deep-param-write').onclick=()=>lock(async()=>{ensure();const idx=+psel.value,p=params[idx],v=Number($('xa-deep-value').value);if(idx!==readParam||readValue===null)throw Error('Läs parametern från hårdvaran innan skrivning.');if(!Number.isInteger(v)||v<p[3]||v>p[4])throw Error('Värde utanför verifierat intervall.');if(!confirm(`Ändra ${p[1]} i JD-XA:s TEMPORARY program: ${readValue} → ${v}?`))return;
 if(!xa.sysex(0x12,xa.encodedAddress(p[2]),[v]))throw Error('Kunde inte skicka DT1.');status('Skrivet '+p[1]+' = '+v+' (DT1, TEMPORARY). Läs tillbaka för kvittens.');readValue=null;readParam=-1;show()});
// Algorithm-specific effect parameters: signed, four nibble encoded, per official Roland map.
const fxSelect=$('xa-fx-param'),fxValue=$('xa-fx-value'),fxStatus=$('xa-fx-status');
for(let i=1;i<=14;i++){const op=document.createElement('option');op.value=i;op.textContent='Reverb Parameter '+i;fxSelect.append(op)}
let fxRead=null;
const fxAddress=i=>xa.encodedAddress('18000200')+4*i;
const decodeNibbles=b=>{if(b.length!==4||b.some(x=>x<0||x>15))throw Error('Unexpected 4-nibble encoded data');return ((b[0]<<12)|(b[1]<<8)|(b[2]<<4)|b[3])-32768};
const encodeNibbles=v=>{const x=v+32768;return [x>>12&15,x>>8&15,x>>4&15,x&15]};
fxSelect.onchange=()=>{fxRead=null;fxStatus.textContent='Läs aktuell parameter från synt innan redigering.'};
$('xa-fx-read').onclick=()=>lock(async()=>{ensure();const i=+fxSelect.value,b=await readChunk(fxAddress(i),4),v=decodeNibbles(b);fxRead={i,v};fxValue.value=String(v);fxStatus.textContent=`Reverb Parameter ${i}: ${v} (raw ${hex(b)}). Algoritmberoende. Läsning lyckades.`});
$('xa-fx-write').onclick=()=>lock(async()=>{ensure();const i=+fxSelect.value,v=Number(fxValue.value);if(!fxRead||fxRead.i!==i)throw Error('Läs samma effektparameter innan skrivning.');if(!Number.isInteger(v)||v< -20000||v>20000)throw Error('Tillåtet område är −20000…+20000.');if(!confirm(`Skriv Reverb Parameter ${i}: ${fxRead.v} → ${v}? Detta ändrar endast JD-XA:s temporary program.`))return;
 if(!xa.sysex(0x12,fxAddress(i),encodeNibbles(v)))throw Error('Sändning misslyckades');fxRead=null;fxStatus.textContent='DT1 skickad. Läs tillbaka parametern för att kontrollera verkligt resultat.'});
// Scan REAL names on a connected JD-XA. Program changes alter the temporary sound,
// never memory slots. Never call these names "factory" without independent verification.
let scanning=false,scanStop=false;
const slotId=(i,storage)=>`${storage?'USB':'INT'}:${String.fromCharCode(65+(i>>4))}${String(i%16+1).padStart(2,'0')}`;
$('xa-deep-scan-stop').onclick=()=>{scanStop=true;status('Stop requested; finishing current read…')};
$('xa-deep-scan').onclick=()=>lock(async()=>{
 ensure();const storage=+$('xa-storage').value,bank=+$('xa-bank').value,full=$('xa-deep-scan-all').checked;
 const ids=full?Array.from({length:256},(_,i)=>i):Array.from({length:16},(_,i)=>bank*16+i);
 if(!confirm(`Scan ${ids.length} ${storage?'USB':'INT'} programs by loading them one at a time?\nThis changes the CURRENT sound, not permanent memory. Stop performance/playback before scanning. Original live sound cannot be guaranteed to return automatically.`))return;
 scanStop=false;scanning=true;let count=0,visited=0;
 try{for(const i of ids){if(scanStop)break;visited++;ensure();const ch=+$('xa-pc-channel').value;if(!xa.send([0xb0|ch,0,85])||!xa.send([0xb0|ch,32,storage*32+(i>=128?1:0)])||!xa.send([0xc0|ch,i%128]))throw Error('Program Change transmission failed');
 await pause(280);ensure();const bytes=await readChunk(BASE,12,2500),name=bytes.map(b=>b>=32&&b<=126?String.fromCharCode(b):' ').join('').trim();
 if(name){window.dispatchEvent(new CustomEvent('jdxa-library-scan',{detail:{slot:slotId(i,storage),name}}));count++}
 status(`Scanning ${visited}/${ids.length}: ${slotId(i,storage)} · ${name||'unreadable'} · ${count} names`);
 }}finally{scanning=false;status(`Scan finished: ${count} observed names. These are not necessarily factory presets. Export catalog from the library panel. The active synth program may have changed.`)}});
// Hardware variation matters: verified Roland v1.50 examples, not fictional blanket names.
const div=$('xa-deep-factory');for(const [slot,name] of Object.entries(factory)){const b=document.createElement('button');b.type='button';b.textContent=slot+' · '+name;b.onclick=()=>{$('xa-bank').value=slot.charCodeAt(0)-65;$('xa-program').value=+slot.slice(1);$('xa-bank').dispatchEvent(new Event('change'));status('Valt '+slot+' · '+name+' (Roland v1.50). Klicka LOAD PROGRAM om du vill ladda det på synten.');};div.append(b)}
$('xa-deep-factory-note').textContent='8 namngivna fabriksprogram (Roland v1.50, källbelagda). JD-XA har 256 platser; resterande namn är inte belagda och fylls inte med gissningar. Läs från en JD-XA eller importera katalog.';
window.JDXADeep={blocks,params,validateCapture};
})();
