/* JD-XA companion mode. Hardware-specific operations are intentionally separate from JD-Xi. */
(()=>{'use strict';
const $=id=>document.getElementById(id), api=()=>window.JDXiPerformance;
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
let model='xa';
const names=['ANALOG 1','ANALOG 2','ANALOG 3','ANALOG 4','DIGITAL 1','DIGITAL 2','DIGITAL 3','DIGITAL 4','MIDI CTRL 1','MIDI CTRL 2','MIDI CTRL 3','MIDI CTRL 4','MIDI CTRL 5','MIDI CTRL 6','MIDI CTRL 7','MIDI CTRL 8'];
const parts=names.map((name,i)=>({name,ch:i,volume:100,pan:64,expression:127,mod:0,hold:false,note: i<4?48+i*3:i<8?60+(i-4)*3:60}));
let pattern=names.map(()=>Array(64).fill(false));let timer=null,step=0,held=[];let pending=null;
const status=(msg)=>{$('xa-status').textContent=msg};
const ready=()=>!!api()?.connected();
function send(bytes){if(model!=='xa')return false;if(!ready()){status('Anslut en JD-XA via Connect USB MIDI först.');return false}let ok=false;window.JDXAOutbound=true;try{ok=api().send(bytes)}finally{window.JDXAOutbound=false}if(ok)window.dispatchEvent(new CustomEvent('jdxa-out',{detail:Array.from(bytes)}));return ok}
function cc(ch,n,v){return send([0xb0|ch,n,Math.max(0,Math.min(127,v|0))])}
function panic(){held.forEach(([ch,n])=>send([0x80|ch,n,0]));held=[];for(let ch=0;ch<16;ch++)cc(ch,123,0)}
function applyModel(next){
 if(next===model && document.body.dataset.model===next)return;
 
 model=next;document.body.dataset.model=model;window.JDModel={current:()=>model};
 $('model-title').textContent=model==='xa'?'JD-XA Remote':'JD-Xi Remote';
 $('model-subtitle').textContent=model==='xa'?'8-part synth / MIDI studio':'Web MIDI controller';
 for(let v of ['xi','xa']){$('model-'+v).classList.toggle('is-selected',model===v);$('model-'+v).setAttribute('aria-pressed',String(model===v))}
 document.title=model==='xa'?'JD-XA Remote Web':'JD-Xi Remote Web';
 const page='performance';
 document.querySelectorAll('#nav button,.page').forEach(n=>n.classList.remove('active'));
 document.querySelector('#nav button[data-page="'+page+'"]').classList.add('active');$(page).classList.add('active');
 status('Läge: JD-XA. MIDI ch 1–4 Analog, 5–8 Digital (standard). Välj rätt MIDI-port ovan.');
 invalidateIdentity('Modell ändrad: identifiera JD-XA före SysEx-skrivning.');
 window.dispatchEvent(new Event('jd-model-change'));
}
window.JDModel={current:()=>model};
$('model-xi').onclick=()=>{location.href='./jdxi.html'};
// XA Program Change uses bank select MSB 85 and LSB 0/1, 256 internal slots.
for(let i=0;i<16;i++){const o=document.createElement('option');o.value=i;o.textContent=String.fromCharCode(65+i)+' · INT LSB '+(i<8?'0':'1')+' / USB '+(i<8?'32':'33');$('xa-bank').append(o)}
for(let i=1;i<=16;i++){const o=document.createElement('option');o.value=i;o.textContent=String(i).padStart(2,'0');$('xa-program').append(o)}
const channels=()=>parts.map(x=>x.ch);
const bars=()=>Math.max(1,Math.min(4,+$('xa-bars').value||1));const editBar=()=>Math.max(0,Math.min(bars()-1,+$('xa-edit-bar').value||0));
$('xa-bars').onchange=()=>{if(editBar()>=bars())$('xa-edit-bar').value=bars()-1;stop();drawSteps()};$('xa-edit-bar').onchange=drawSteps;
function channelSelect(select,value){for(let c=1;c<=16;c++){let o=document.createElement('option');o.value=c-1;o.textContent='CH '+c;select.append(o)}select.value=value}
channelSelect($('xa-pc-channel'),15);
$('xa-program-send').onclick=()=>{
 const idx=+$('xa-bank').value*16+(+$('xa-program').value-1),ch=+$('xa-pc-channel').value;
 const storage=+$('xa-storage').value;const msgs=[[0xb0|ch,0,85],[0xb0|ch,32,storage*32+(idx>=128?1:0)],[0xc0|ch,idx%128]];
 if(msgs.every(send))status('Program '+(storage?'USB':'INT')+':'+String.fromCharCode(65+(idx>>4))+String((idx%16)+1).padStart(2,'0')+' skickat på MIDI CH '+(ch+1)+'. Kontrollera JD-XA:s Program Ctrl Rx-kanal.');
};
$('xa-start').onclick=()=>{if(send([0xfa]))status('MIDI START skickat. JD-XA:s Sync Mode avgör om intern sequencer reagerar.')};
$('xa-stop').onclick=()=>{send([0xfc]);status('MIDI STOP skickat.')};
$('xa-panic').onclick=()=>{panic();status('All Notes Off skickat till alla 16 kanaler.')};
// Valid Roland JD-XA messages: F0 41 ID 00 00 00 0F command address payload checksum F7.
// MIDI addresses/sizes are FOUR BASE-128 bytes (not four base-256 bytes).
const addrNumber=b=>b.reduce((n,v)=>n*128+v,0);
const addrBytes=n=>{if(!Number.isSafeInteger(n)||n<0||n>=128**4)throw Error('Invalid 4-byte MIDI address');return [Math.floor(n/128**3)%128,Math.floor(n/128**2)%128,Math.floor(n/128)%128,n%128]};
const hex4=n=>addrBytes(n);
const encodedAddress=hex=>{if(!/^[0-7][0-9a-f]{7}$/i.test(hex))throw Error('Invalid address');const b=hex.match(/../g).map(x=>parseInt(x,16));if(b.some(x=>x>127))throw Error('Address bytes must be 00–7F');return addrNumber(b)};
const addrDisplay=n=>addrBytes(n).map(x=>x.toString(16).padStart(2,'0').toUpperCase()).join(' ');
function deviceId(){const v=$('xa-device').value.trim();if(!/^[0-9a-f]{1,2}$/i.test(v))throw Error('Device ID måste anges i hex (exempel 10).');const n=parseInt(v,16);if(n<16||n>31)throw Error('JD-XA Device ID: 10–1F hex (Roland Device ID).');return n}
function sx(cmd,addr,payload){const a=hex4(addr);if([...a,...payload].some(v=>v>127||v<0))throw Error('Sysex innehåller otillåtet MIDI-datavärde.');const sum=[...a,...payload].reduce((s,v)=>s+v,0);return send([240,65,deviceId(),0,0,0,15,cmd,...a,...payload,(128-sum%128)%128,247])}
function rq(addr,count){if(!Number.isInteger(count)||count<1||count>0x200)throw Error('Tillåten läslängd 1–512 (JD-XA kräver exakt blockstorlek enligt Parameter Address Map).');pending={addr,count,at:Date.now()};$('xa-readout').textContent='Waiting for JD-XA DT1 response…';return sx(0x11,addr,hex4(count))}
function getAddr(){const base=encodedAddress($('xa-region').value);const tok=$('xa-offset').value.trim().split(/[\s,]+/);if(tok.length!==4||tok.some(v=>!/^[0-7]?[0-9a-f]$/i.test(v)))throw Error('Offset: exakt fyra hex-byte 00–7F.');const off=tok.reduce((n,v)=>n*128+parseInt(v,16),0);return base+off}
$('xa-read').onclick=()=>{try{const addr=getAddr(),n=+$('xa-length').value;if(rq(addr,n))$('xa-sysex-status').textContent='RQ1 → '+addrDisplay(addr)+' ('+n+' bytes)'}catch(e){$('xa-sysex-status').textContent=e.message}};
$('xa-test').onclick=()=>{try{if(rq(encodedAddress('18000000'),0x6b))$('xa-sysex-status').textContent='Test-RQ1 skickad (Program Common, 0x6B byte); väntar på DT1 från JD-XA.'}catch(e){$('xa-sysex-status').textContent=e.message}};
$('xa-rq').onclick=()=>{try{if(rq(encodedAddress('18000000'),0x6b))$('xa-sysex-status').textContent='Läser temporary program common (107 byte).'}catch(e){$('xa-sysex-status').textContent=e.message}};
let identified=false;
function invalidateIdentity(reason){identified=false;const el=$('xa-ident-status');if(el)el.textContent=reason||'Identifiera JD-XA innan skrivning.';}
function receive(bytes){
 // Universal Identity Reply: F0 7E dev 06 02 41 0F 03 00 00 00 03 00 00 F7
 if(bytes[0]===240&&bytes[1]===126&&bytes[3]===6&&bytes[4]===2){
   const isXA=bytes.length>=15&&bytes.at(-1)===247&&bytes[5]===65&&bytes[6]===15&&bytes[7]===3;
   identified=isXA;
   $('xa-ident-status').textContent=isXA?'JD-XA IDENTIFIERAD · Device '+bytes[2].toString(16).toUpperCase(): 'Fel MIDI-enhet svarade på identifieringen. JD-XA kunde inte bekräftas.';
   window.dispatchEvent(new CustomEvent('jdxa-identity',{detail:{isXA,bytes:Array.from(bytes)}}));return;
 }
 if(bytes[0]!==240||bytes[1]!==65||bytes[2]!==deviceId()||bytes[3]!==0||bytes[4]!==0||bytes[5]!==0||bytes[6]!==15||bytes[7]!==18||bytes.at(-1)!==247||bytes.length<15)return;
 const b=bytes.slice(8,-2),cs=(128-b.reduce((s,n)=>s+n,0)%128)%128;
 if(cs!==bytes.at(-2)){$('xa-sysex-status').textContent='JD-XA DT1 inkom men checksum felaktig.';return}
 const addr=addrNumber(b.slice(0,4)),body=b.slice(4);
 $('xa-readout').textContent='Address: '+addrDisplay(addr)+'\nData: '+body.map(v=>v.toString(16).padStart(2,'0')).join(' ').toUpperCase();
 $('xa-sysex-status').textContent='JD-XA SysEx DT1 received: '+body.length+' byte(s)'+(pending&&addr===pending.addr?' · RQ1 match ✓':'')+'.';window.dispatchEvent(new CustomEvent('jdxa-dt1',{detail:{addr,body,device:bytes[2]}}));pending=null;
}
window.JDXA={receive,parts,send,cc,rq,sysex:sx,model:()=>model,addrBytes,addrNumber,encodedAddress,identified:()=>identified};
$('xa-identify').onclick=()=>{identified=false;$('xa-ident-status').textContent='Väntar på svar på Identity Request…';send([240,126,127,6,1,247])};
window.addEventListener('jdxi-connected',()=>invalidateIdentity('Ny MIDI-anslutning: identifiera JD-XA igen.'));
$('xa-device').addEventListener('change',()=>{identified=false;$('xa-ident-status').textContent='Device ID ändrat. Identifiera enheten på nytt.'});
const controls=[['LEVEL',7,'volume'],['PAN',10,'pan'],['EXPR',11,'expression'],['MOD',1,'mod']];
function renderMixer(){const dest=$('xa-mixer');dest.replaceChildren();parts.slice(0,8).forEach((p,i)=>{
 const strip=document.createElement('div');strip.className='xa-strip';const h=document.createElement('div');h.className='xa-strip-head';const title=document.createElement('strong');title.textContent=p.name;const cs=document.createElement('select');channelSelect(cs,p.ch);cs.setAttribute('aria-label',p.name+' channel');cs.onchange=()=>{p.ch=+cs.value;drawSteps();};h.append(title,cs);strip.append(h);
 for(const [label,num,key] of controls){const wrap=document.createElement('label');wrap.className='xa-fader';wrap.textContent=label;const val=document.createElement('output');val.textContent=p[key];const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=127;slider.value=p[key];slider.setAttribute('aria-label',p.name+' '+label);let last=0;slider.oninput=()=>{p[key]=+slider.value;val.textContent=slider.value;if(performance.now()-last>30){cc(p.ch,num,p[key]);last=performance.now()}};slider.onchange=()=>cc(p.ch,num,p[key]);wrap.append(slider,val);strip.append(wrap)}
 const hold=document.createElement('button');hold.className='xa-hold';hold.type='button';hold.textContent='HOLD OFF';hold.onclick=()=>{p.hold=!p.hold;hold.textContent=p.hold?'HOLD ON':'HOLD OFF';hold.classList.toggle('on',p.hold);cc(p.ch,64,p.hold?127:0)};strip.append(hold);dest.append(strip)
})}
function drawSteps(){const box=$('xa-steps');box.replaceChildren();const head=document.createElement('div');head.className='xa-step-row xa-step-head';const blank=document.createElement('span');blank.textContent='PART / NOTE';head.append(blank);for(let c=0;c<16;c++){const label=document.createElement('span');label.textContent=c+1;head.append(label)}box.append(head);
 parts.forEach((p,r)=>{const row=document.createElement('div');row.className='xa-step-row';const cell=document.createElement('label');cell.className='xa-step-label';cell.textContent=p.name+' · ch'+(p.ch+1);const note=document.createElement('input');note.type='number';note.min=0;note.max=127;note.value=p.note;note.title='MIDI note number';note.onchange=()=>{p.note=Math.max(0,Math.min(127,+note.value|0))};cell.append(note);row.append(cell);
 for(let c=0;c<16;c++){let b=document.createElement('button');b.type='button';b.className='xa-step'+(pattern[r][editBar()*16+c]?' enabled':'');b.setAttribute('aria-label',p.name+' step '+(c+1));b.setAttribute('aria-pressed',String(pattern[r][editBar()*16+c]));b.onclick=()=>{const idx=editBar()*16+c;pattern[r][idx]=!pattern[r][idx];b.classList.toggle('enabled',pattern[r][idx]);b.setAttribute('aria-pressed',String(pattern[r][idx]));};row.append(b)}box.append(row)});
}
function stop(){if(timer){clearInterval(timer);timer=null}held.forEach(([ch,n])=>send([0x80|ch,n,0]));held=[];document.querySelectorAll('.xa-step.playing').forEach(x=>x.classList.remove('playing'));}
function stepPlay(){held.forEach(([ch,n])=>send([0x80|ch,n,0]));held=[];const v=Math.max(1,Math.min(127,+$('xa-vel').value||100));for(let r=0;r<parts.length;r++){if(pattern[r][step]){const p=parts[r];if(send([0x90|p.ch,p.note,v]))held.push([p.ch,p.note])}}
 document.querySelectorAll('.xa-step-row').forEach(row=>{row.querySelectorAll('.xa-step').forEach((b,c)=>b.classList.toggle('playing',c===step%16&&Math.floor(step/16)===editBar()))});step=(step+1)%(bars()*16);
}
$('xa-play').onclick=()=>{if(!ready())return status('Anslut JD-XA innan uppspelning.');stop();step=0;const bpm=Math.max(40,Math.min(240,+$('xa-bpm').value||120));stepPlay();timer=setInterval(stepPlay,60000/bpm/4);$('xa-seq-status').textContent='Lokal sequencer spelar '+bpm+' BPM (16th notes).'};
$('xa-seq-stop').onclick=()=>{stop();$('xa-seq-status').textContent='Sequencer stopped.'};
$('xa-save').onclick=()=>{save('jd-xa-pattern',{name:$('xa-pattern-name').value,parts:parts.map(p=>({ch:p.ch,note:p.note})),pattern,bars:bars(),bpm:+$('xa-bpm').value});$('xa-seq-status').textContent='JD-XA pattern saved locally.'};
$('xa-load').onclick=()=>{stop();const s=get('jd-xa-pattern',null);if(!s)return $('xa-seq-status').textContent='Inget JD-XA pattern är sparat.';pattern=Array.from({length:parts.length},(_,r)=>Array.from({length:64},(_,c)=>!!s.pattern?.[r]?.[c]));s.parts?.forEach((x,i)=>{if(parts[i]){parts[i].note=x.note|0;parts[i].ch=x.ch|0}});$('xa-pattern-name').value=s.name||'My JD-XA Pattern';$('xa-bpm').value=s.bpm||120;$('xa-bars').value=s.bars||1;$('xa-edit-bar').value=0;renderMixer();drawSteps();$('xa-seq-status').textContent='Pattern loaded.'};
$('xa-clear').onclick=()=>{stop();pattern=names.map(()=>Array(64).fill(false));drawSteps();$('xa-seq-status').textContent='Pattern cleared (saved version unchanged).'};
const vlq=n=>{const a=[n&127];while(n>>=7)a.unshift((n&127)|128);return a};
function chunk(tag,body){return [...tag.split('').map(x=>x.charCodeAt(0)),(body.length>>>24)&255,(body.length>>>16)&255,(body.length>>>8)&255,body.length&255,...body]}
function exportMidi(){const bpm=Math.max(40,Math.min(240,+$('xa-bpm').value||120)),tempo=Math.round(60000000/bpm),tracks=[];tracks.push(chunk('MTrk',[0,255,81,3,(tempo>>>16)&255,(tempo>>>8)&255,tempo&255,0,255,47,0]));
 parts.forEach((p,i)=>{const title=Array.from(p.name,x=>x.charCodeAt(0)),events=[];for(let s=0;s<bars()*16;s++)if(pattern[i][s]){const tick=s*120;events.push({tick,data:[0x90|p.ch,p.note,Math.max(1,Math.min(127,+$('xa-vel').value||100))]},{tick:tick+108,data:[0x80|p.ch,p.note,0]})}events.sort((a,b)=>a.tick-b.tick);let pos=0;const body=[0,255,3,title.length,...title];for(const e of events){body.push(...vlq(e.tick-pos),...e.data);pos=e.tick}body.push(...vlq(bars()*1920-pos),255,47,0);tracks.push(chunk('MTrk',body))});
 const header=chunk('MThd',[0,1,0,tracks.length,1,224]),blob=new Blob([Uint8Array.from([...header,...tracks.flat()])],{type:'audio/midi'});const link=document.createElement('a');const url=URL.createObjectURL(blob);link.href=url;link.download=($('xa-pattern-name').value||'JD-XA-pattern').replace(/[^\w-]+/g,'_')+'.mid';link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);$('xa-seq-status').textContent='16 MIDI part tracks exported. Importera SMF via JD-XA:s externa workflow.';
}
$('xa-export').onclick=exportMidi;
renderMixer();drawSteps();applyModel(model);
window.addEventListener('beforeunload',stop);
})();
