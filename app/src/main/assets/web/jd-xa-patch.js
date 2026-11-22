/* JD-XA patch capture / restoration. Roland JD-XA MIDI Implementation v1.00 pp.8–19.
 * Reads only documented temporary-memory regions. No permanent bank write.
 * This component is intentionally independent of the JD-Xi patch engine.
 */
(()=>{'use strict';
const xa=window.JDXA, $=id=>document.getElementById(id);
if(!xa || !$('xa-patch-card'))return;
const enc=xa.encodedAddress, B=128, root=enc('18000000');
const addr=bytes=>xa.addrNumber(bytes);
const hex=n=>xa.addrBytes(n).map(x=>x.toString(16).padStart(2,'0').toUpperCase()).join(' ');
const regions=[];
function add(id,title,a,len,section='program'){
 if(regions.some(r=>r.id===id))throw Error('Duplicate patch region '+id);
 if(!Number.isInteger(len)||len<1||len>256)throw Error('Invalid size '+id);
 regions.push(Object.freeze({id,title,addr:a,size:len,section}));
}
const pr=(id,title,offset,len,section='program')=>add(id,title,root+offset,len,section);
pr('common','Program Common + Name',0,0x6b);
pr('reverb','Reverb (24 algorithm values)',2*B,0x64);
pr('delay','Delay (30 algorithm values)',3*B,0x7c);
pr('vocoder','Vocoder',4*B,0x2b);
pr('tfx1','TFX 1',5*B,0x27);
pr('tfx2','TFX 2',6*B,0x27);
for(let i=0;i<16;i++){
 let t=i<4?`Analog ${i+1}`:i<8?`Digital ${i-3}`:`MIDI Control ${i-7}`;
 pr(`part${i}`,`${t} · Part`,(0x20+i)*B,0x4f);
 pr(`zone${i}`,`${t} · Zone`,(0x40+i)*B,0x21);
 if(i<8)pr(`eq${i}`,`${t} · EQ`,(0x30+i)*B,8);
}
pr('controller','Controller + Arp On/Hold',0x50*B,0x14);
pr('arpcommon','Arpeggio Common',0x60*B,8);
for(let i=0;i<16;i++)pr(`arp${i}`,`Arpeggio Note ${i+1} (32 steps)`,(0x61+i)*B,0x42,'extended');
for(let i=0;i<50;i++)pr(`knob${i}`,`MIDI Controller ${i+1}`,0x71*B+i*0x10,5,'extended');
for(let i=0;i<16;i++)pr(`trigger${i}`,`Trigger ${i+1}`,0x78*B+i*0x10,0x10,'extended');
// Roland temporary tone map: 19 xx 00 00/1A xx 00 00 encloses tone at offset 02 00 00 (analog) or 01 00 00 (digital).
for(let i=0;i<8;i++){
 const analog=i<4,n=i%4,base=enc(analog?'19000000':'1a000000')+n*0x20*B**2+(analog?2:1)*B**2;
 const label=`${analog?'Analog':'Digital'} ${n+1}`;
 add(`tone${i}-common`,`${label} · Tone Common`,base,analog?0x4e:0x40,'tone');
 if(analog){add(`tone${i}-partial`,`${label} · Analog Partial`,base+B,0x65,'tone');}
 else{
  for(let j=0;j<3;j++)add(`tone${i}-partial${j}`,`${label} · Digital Partial ${j+1}`,base+(0x20+j)*B,0x3d,'tone');
  add(`tone${i}-modify`,`${label} · Tone Modify`,base+0x50*B,0x25,'tone');
 }
 add(`tone${i}-mfx`,`${label} · MFX (32 params)`,base+2*B, B+0x11,'tone');
}
const idMap=new Map(regions.map(r=>[r.id,r]));
const checksum=bytes=>{let h=2166136261;for(const x of bytes){h^=x;h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
const ascii=bytes=>bytes.slice(0,12).map(n=>n>=32&&n<=126?String.fromCharCode(n):' ').join('').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let busy=false,stopRequested=false,snapshot=null,loaded=null;
const status=s=>{$('xa-patch-status').textContent=s};
const progress=(done,total)=>{$('xa-patch-progress').value=total?Math.round(done/total*100):0};
function guard(){if(xa.model()!=='xa')throw Error('Välj JD-XA först.');if(!xa.identified())throw Error('Identifiera JD-XA innan patchöverföring.');if(stopRequested)throw Error('Avbruten på användarens begäran.');}
function validated(input){
 if(!input||input.format!=='roland-jdxa-patch-snapshot-v2'||input.model!=='JD-XA'||!Array.isArray(input.blocks)||input.blocks.length===0||input.blocks.length>regions.length)throw Error('Felaktigt eller tomt JD-XA-patchformat');
 const set=new Set();let sum=0;
 for(const b of input.blocks){const r=idMap.get(b.id);if(!r||set.has(b.id)||b.address!==hex(r.addr)||!Array.isArray(b.data)||b.data.length!==r.size||b.data.some(v=>!Number.isInteger(v)||v<0||v>127)||b.checksum!==checksum(b.data))throw Error('Ogiltig adress, blocklängd eller checksumma: '+b.id);set.add(b.id);sum+=b.data.length;}
 if(sum>24000)throw Error('Orimlig datamängd');return input;
}
function readChunk(address,length,timeout=2800){
 return new Promise((resolve,reject)=>{
  const data=new Array(length).fill(null);let settled=false;
  const cleanup=()=>{clearTimeout(timer);window.removeEventListener('jdxa-dt1',onMessage);window.removeEventListener('jd-model-change',onModel)};
  const fail=(s)=>{if(settled)return;settled=true;cleanup();reject(new Error(s))};
  const onModel=()=>fail('Modellbyte under patchöverföring');
  const onMessage=e=>{const {addr:a,body,device}=e.detail||{};const selected=Number.parseInt($('xa-device').value,16);if(device!==selected||!Number.isInteger(a)||!Array.isArray(body))return;
   if(a>=address+length||a+body.length<=address)return;
   for(let i=0;i<body.length;i++){const k=a+i-address;if(k>=0&&k<length){if(data[k]!==null&&data[k]!==body[i])return fail('Motstridiga data under läsning');data[k]=body[i]}}
   if(data.every(v=>v!==null)){settled=true;cleanup();resolve(data)}
  };
  const timer=setTimeout(()=>fail(`Svar saknas för ${hex(address)} (${length} byte)`),timeout);
  window.addEventListener('jdxa-dt1',onMessage);window.addEventListener('jd-model-change',onModel);
  try{guard();if(!xa.rq(address,length))fail('Kunde inte skicka RQ1')}catch(e){fail(e.message)}
 });
}
async function readBlock(r){const result=[];for(let offset=0;offset<r.size;offset+=32){guard();let len=Math.min(32,r.size-offset),tries=0;
 while(true){try{result.push(...await readChunk(r.addr+offset,len));break}catch(e){if(++tries>=2)throw e;await sleep(180)}}await sleep(65)}return result}
async function operate(action){if(busy)return status('En patchöverföring pågår redan.');busy=true;stopRequested=false;[...document.querySelectorAll('#xa-patch-card button')].forEach(b=>{if(b.id!=='xa-patch-cancel')b.disabled=true});try{await action()}catch(e){status('Avbrutet/fel: '+e.message)}finally{busy=false;[...document.querySelectorAll('#xa-patch-card button')].forEach(b=>b.disabled=false)}}
const groups=$('xa-patch-section');groups.value='standard';
function selectedRegions(){return regions.filter(r=>groups.value==='full'||(groups.value==='standard'&&r.section!=='extended')||(groups.value==='tone'&&r.section==='tone')||(groups.value==='program'&&r.section==='program'))}
function toBlock(r,bytes){return{id:r.id,address:hex(r.addr),data:bytes,checksum:checksum(bytes)}}
function createSnap(rows,partial){return {format:'roland-jdxa-patch-snapshot-v2',model:'JD-XA',created:new Date().toISOString(),source:'JD-XA temporary memory',name:rows.find(x=>x.id==='common')?ascii(rows.find(x=>x.id==='common').data):null,partial,documentedRegions:regions.length,blocks:rows}}
function render(s){if(!s)return;$('xa-patch-name').value=s.name||'';$('xa-patch-count').textContent=`${s.blocks.length}/${regions.length} dokumenterade block · ${s.blocks.reduce((n,b)=>n+b.data.length,0)} byte${s.partial?' · DELVIS':' '}`;
 const table=$('xa-patch-regions');table.replaceChildren();for(const b of s.blocks){const tr=document.createElement('tr'),r=idMap.get(b.id);for(const value of [r.title,b.address,b.data.length,b.checksum]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}table.append(tr)}
}
$('xa-patch-read').onclick=()=>operate(async()=>{guard();loaded=null;let rows=[],picks=selectedRegions();progress(0,picks.length);for(let i=0;i<picks.length;i++){
 if(stopRequested){snapshot=createSnap(rows,true);render(snapshot);throw Error(`Läsningen stoppades efter ${rows.length} block. Delvis backup tillgänglig.`)}
 const r=picks[i];status(`Läser ${i+1}/${picks.length}: ${r.title} (${hex(r.addr)})`);
 try{rows.push(toBlock(r,await readBlock(r)))}catch(e){snapshot=rows.length?createSnap(rows,true):null;render(snapshot);throw Error(`Läsning stoppades på ${r.title}: ${e.message}. Tidigare block kan exporteras.`)}
 progress(i+1,picks.length)
 }snapshot=createSnap(rows,false);render(snapshot);status(`Patchläst: ${rows.length} regioner. Exportera JSON innan någon skrivning.`)
});
$('xa-patch-cancel').onclick=()=>{stopRequested=true;status('Stoppar efter pågående MIDI-fråga…')};
function download(obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='JD-XA_'+(obj.name||'temporary').replace(/[^a-z0-9_-]+/gi,'_').slice(0,32)+'_patch.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
$('xa-patch-export').onclick=()=>{const s=snapshot||loaded;if(!s)return status('Läs eller importera en patch först.');download(validated(s))};
$('xa-patch-import').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>400000)throw Error('Filen är för stor');loaded=validated(JSON.parse(await file.text()));snapshot=null;render(loaded);status(`Importerad ${loaded.name||'(namnlös)'}: ${loaded.blocks.length} block. Ingen MIDI skickad.`)}catch(err){loaded=null;status('Importfel: '+err.message)}};
$('xa-patch-rename').onclick=()=>{try{const base=loaded||snapshot;if(!base)throw Error('Läs/importera patch först');const s=validated(base),entry=s.blocks.find(b=>b.id==='common');if(!entry)throw Error('Program Common saknas; kan inte byta namn');let name=$('xa-patch-name').value;if(name.length<1||name.length>12||[...name].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)>126))throw Error('Namnet måste vara 1–12 ASCII-tecken');let cloned=structuredClone(s);const target=cloned.blocks.find(b=>b.id==='common');target.data.splice(0,12,...[...name.padEnd(12,' ')].map(c=>c.charCodeAt(0)));target.checksum=checksum(target.data);cloned.name=name;cloned.edited=new Date().toISOString();loaded=validated(cloned);render(loaded);status('Namnet ändrat lokalt. EXPORTERA JSON eller skriv till JD-XA:s TEMPORARY-minne.')}catch(e){status('Namnfel: '+e.message)}};
// Restoration sends only address-exact DT1 values and confirms each written block with RQ1 readback.
$('xa-patch-restore').onclick=()=>operate(async()=>{
 guard();const s=validated(loaded||snapshot);if(s.partial)throw Error('Delvis snapshot får inte återställas som patch.');if(s.blocks.length!==regions.length)status('Varning: valda block, inte alla dokumenterade regioner.');
 if(!confirm(`Skriv ${s.blocks.length} block av ”${s.name||'okänd'}” till JD-XA:s TEMPORARY-minne?\n\nInget permanent program sparas. Osparade ljudändringar kan gå förlorade. Ha en egen säkerhetskopia.`))return;
 if(!confirm('SISTA BEKRÄFTELSEN: JD-XA är identifierad och du vill skriva temporary-data. Fortsätta?'))return;
 const rows=s.blocks.map(b=>({r:idMap.get(b.id),data:b.data}));let completed=0;progress(0,rows.length);
 for(const {r,data} of rows){guard();status(`Skriver och verifierar ${completed+1}/${rows.length}: ${r.title}`);
  for(let i=0;i<data.length;i+=16){guard();if(!xa.sysex(0x12,r.addr+i,data.slice(i,i+16)))throw Error('DT1 kunde inte skickas');await sleep(65)}
  // Some firmware versions apply blocks asynchronously; wait then perform full readback.
  await sleep(200);let seen=await readBlock(r);if(seen.length!==data.length||seen.some((v,i)=>v!==data[i])){
   const mismatch=seen.findIndex((v,i)=>v!==data[i]);throw Error(`VERIFIERING MISSLYCKADES: ${r.title}, byte ${mismatch} (skrivning avbruten efter ${completed} hela block).`)
  }
  completed++;progress(completed,rows.length)
 }
 status(`VERIFIERAT: ${completed} av ${rows.length} block återlästa identiskt från temporary memory. För permanent lagring: använd WRITE på själva JD-XA.`)
});
$('xa-patch-diff').onclick=()=>operate(async()=>{guard();const s=validated(loaded||snapshot),rows=s.blocks;let changed=[];progress(0,rows.length);
 for(let i=0;i<rows.length;i++){guard();const b=rows[i],r=idMap.get(b.id);status(`Jämför ${i+1}/${rows.length}: ${r.title}`);const current=await readBlock(r),d=current.reduce((n,x,j)=>n+(x!==b.data[j]),0);if(d)changed.push(`${r.title}: ${d} byte`);progress(i+1,rows.length)}
 $('xa-patch-differences').textContent=changed.length?changed.join('\n'):'Inga skillnader i de valda dokumenterade blocken.';status(`${changed.length} block skiljer sig från den aktuella JD-XA temporary-patchen.`)
});
$('xa-patch-count').textContent=`${regions.length} dokumenterade block tillgängliga`;
window.JDXAPatch={regions,checksum,validated,selectedRegions};
})();
