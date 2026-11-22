(()=>{'use strict';
/* JD-XA Patch browser: INT/USB programs A01–P16 (Bank Select MSB 85, LSB 0/1 = INT, 32/33 = USB; PC 0–127).
   The JD-XA names are not in any public list this app can ship, so they come from your own synth:
   "Scan names" selects each program and reads Program Common (18 00 00 00, 12 ASCII bytes). */
const $=id=>document.getElementById(id),api=()=>window.JDXiPerformance;
const ls={g:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},s:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const code=(mem,i)=>mem+':'+String.fromCharCode(65+(i>>4))+String((i&15)+1).padStart(2,'0');
let names=ls.g('jdxa-program-names-v1',{}),favs=ls.g('jdxa-program-favs-v1',[]),cur=null,pending=null,scanning=false;
const status=t=>{$('xp-status').textContent=t};
const ch=()=>{const v=+($('perfchan')&&$('perfchan').value||1);return v>=1&&v<=16?v-1:0};
const dev=()=>{try{return api().deviceId()}catch{return 16}};
const cs=a=>(128-a.reduce((x,y)=>x+y,0)%128)%128;
const send=b=>{const a=api();return a&&a.connected()&&a.send(b)};
function select(mem,i){const lsb=(mem==='USB'?32:0)+(i>=128?1:0),c=ch();
 return send([0xb0|c,0,85])&&send([0xb0|c,32,lsb])&&send([0xc0|c,i%128])}
function readName(){const a=[0x18,0,0,0],s=[0,0,0,12];return send([0xf0,0x41,dev(),0,0,0,0x0f,0x11,...a,...s,cs([...a,...s]),0xf7])}
const prevRx=window.JDXiPerformanceReceive;
window.JDXiPerformanceReceive=m=>{try{prevRx&&prevRx(m)}catch{}
 if(m.length<26||m[0]!==0xf0||m[1]!==0x41||m[6]!==0x0f||m[7]!==0x12)return;
 if(m[8]===0x18&&m[9]===0&&m[10]===0&&m[11]===0&&pending){const n=String.fromCharCode(...m.slice(12,24)).trim();if(n){names[pending]=n;ls.s('jdxa-program-names-v1',names)}pending=null;paint()}};
const mem=()=>$('xp-mem').value;
function load(i){if(!api()||!api().connected()){status('Connect MIDI first (Info → MIDI connection).');return}
 if(!select(mem(),i)){status('Could not send.');return}cur=code(mem(),i);pending=cur;setTimeout(readName,350);
 status('Loaded '+cur+(names[cur]?' · '+names[cur]:'')+' on MIDI channel '+(ch()+1)+'. Program change stops the JD-XA sequencer.');$('xp-num').value=i+1;paint()}
$('xp-load').onclick=()=>{const n=Math.max(1,Math.min(256,Math.round(+$('xp-num').value||1)));load(n-1)};
$('xp-fav').onclick=()=>{const c=code(mem(),Math.max(0,Math.min(255,(+$('xp-num').value||1)-1)));if(!favs.includes(c))favs.push(c);ls.s('jdxa-program-favs-v1',favs);paint()};
$('xp-search').oninput=()=>paint();$('xp-mem').onchange=()=>paint();
const idxOf=c=>{const m=/^(INT|USB):([A-P])(\d\d)$/.exec(c);return m?{mem:m[1],i:(m[2].charCodeAt(0)-65)*16+(+m[3]-1)}:null};
function row(c,i,m){const b=document.createElement('button');b.type='button';b.textContent=c+'  '+(names[c]||'—')+(cur===c?'  ◀ loaded':'');b.onclick=()=>{$('xp-mem').value=m;load(i)};return b}
function paint(){const q=$('xp-search').value.trim().toLowerCase(),m=mem(),host=$('xp-list'),fh=$('xp-favs');host.replaceChildren();fh.replaceChildren();
 favs.forEach(c=>{const x=idxOf(c);if(!x)return;const r=row(c,x.i,x.mem);const d=document.createElement('button');d.type='button';d.textContent='✕';d.title='Remove favorite';d.onclick=e=>{e.stopPropagation();favs=favs.filter(f=>f!==c);ls.s('jdxa-program-favs-v1',favs);paint()};fh.append(r,d)});
 if(!favs.length)fh.textContent='No favorites yet.';
 for(let i=0;i<256;i++){const c=code(m,i),n=(names[c]||'').toLowerCase();if(q&&!c.toLowerCase().includes(q)&&!n.includes(q)&&String(i+1)!==q)continue;host.append(row(c,i,m))}
 const known=Object.keys(names).length;$('xp-known').textContent=known?known+' program names read from your JD-XA.':'No names yet. Names are read from the synth: use “Scan names”, or load a program.'}
$('xp-scan').onclick=async()=>{if(scanning)return;if(!api()||!api().connected()){status('Connect MIDI (with SysEx and an input) first.');return}
 if(!confirm('Scanning selects all 256 '+mem()+' programs one by one (about 1.5 minutes). The synth sound and sequencer will change while it runs. Continue?'))return;
 scanning=true;$('xp-scan').disabled=true;$('xp-scanstop').disabled=false;const m=mem();
 for(let i=0;i<256&&scanning;i++){const c=code(m,i);if(!select(m,i)){status('Scan stopped: MIDI send failed.');break}
  await new Promise(r=>setTimeout(r,140));pending=c;readName();await new Promise(r=>setTimeout(r,170));status('Scanning '+c+' … '+Math.round((i+1)/2.56)+' %');if(i%16===15)paint()}
 scanning=false;pending=null;$('xp-scan').disabled=false;$('xp-scanstop').disabled=true;paint();status('Scan finished.')};
$('xp-scanstop').onclick=()=>{scanning=false;status('Scan stopped.')};$('xp-scanstop').disabled=true;
$('xp-clear').onclick=()=>{if(confirm('Forget all stored program names?')){names={};ls.s('jdxa-program-names-v1',names);paint()}};
paint();
})();
