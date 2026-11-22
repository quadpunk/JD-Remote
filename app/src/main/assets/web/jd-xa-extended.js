/* JD-XA extended MIDI controls: explicit CC/NRPN maps, non-destructive name library, test log. */
(()=>{'use strict';
const $=id=>document.getElementById(id), xa=window.JDXA;
if(!xa)return;
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const clamp=v=>Math.max(0,Math.min(127,Math.round(Number(v)||0)));
// Definitions: [label, CC or null, NRPN LSB or null]. NRPN MSB=0 (Roland JD-XA Parameter Guide, CC Assignments pp68-73).
const C=(label,cc)=>[label,cc,null], N=(label,n)=>[label,null,n];
const common={General:[C('Modulation',1),C('Volume',7),C('Pan',10),C('Expression',11),C('Reverb Send',91),C('Portamento Time',5)]};
const analog={
 'LFO':[C('LFO 1 Rate',16),C('LFO 2 Rate',17),N('LFO 1 Fade',6),N('LFO 2 Fade',7),N('LFO 1 Pitch Depth',9),N('LFO 2 Pitch Depth',10),N('LFO 1 Filter Depth',12),N('LFO 2 Filter Depth',13),N('LFO 1 Amp Depth',15),N('LFO 2 Amp Depth',16)],
 'Oscillators':[C('OSC 1 Pitch',19),C('OSC 2 Pitch',20),C('OSC 1 Fine',22),C('OSC 2 Fine',23),N('OSC 1 Pulse Width',28),N('OSC 2 Pulse Width',29),N('OSC 1 PWM Depth',31),N('OSC 2 PWM Depth',32),C('Cross Mod',25),C('OSC 1 Level',29),C('OSC 2 Level',30),C('AUX Level',31)],
 'Pitch ENV':[C('OSC 1 Pitch ENV Depth',26),C('OSC 2 Pitch ENV Depth',27),N('OSC 1 Pitch ENV Velo',37),N('OSC 2 Pitch ENV Velo',38),N('OSC 1 Pitch ENV Attack',43),N('OSC 2 Pitch ENV Attack',44),N('OSC 1 Pitch ENV Decay',46),N('OSC 2 Pitch ENV Decay',47)],
 'Filter':[C('HPF Cutoff',114),C('Filter Drive',115),C('Filter Cutoff',102),C('Cutoff Fine',103),C('Resonance',105),C('Filter Key Follow',111),C('Key Follow Fine',112),C('Filter ENV Depth',108),N('Filter ENV Velo',58),N('Filter ENV Attack',70),N('Filter ENV Decay',73),N('Filter ENV Sustain',76),N('Filter ENV Release',79)],
 'AMP':[C('Amp Level',117),N('Amp Level Velo Sens',85),N('Amp ENV Attack',88),N('Amp ENV Decay',91),N('Amp ENV Sustain',94),N('Amp ENV Release',97)]
};
const digital={
 'LFO':[], 'Oscillators':[], 'Pitch ENV':[], 'Filter':[], 'AMP':[]
};
for(let j=0;j<3;j++){
 const id=j+1;
 digital.LFO.push(C(`Partial ${id} LFO Rate`,16+j),N(`Partial ${id} LFO Fade`,6+j),N(`Partial ${id} LFO Pitch Depth`,9+j),N(`Partial ${id} LFO Filter Depth`,12+j),N(`Partial ${id} LFO Amp Depth`,15+j),N(`Partial ${id} LFO Pan Depth`,18+j));
 digital.Oscillators.push(C(`Partial ${id} OSC Pitch`,19+j),C(`Partial ${id} OSC Detune`,22+j),N(`Partial ${id} Pulse Width`,28+j),N(`Partial ${id} PWM Depth`,31+j));
 digital['Pitch ENV'].push(C(`Partial ${id} Pitch ENV Depth`,26+j),N(`Partial ${id} Pitch ENV Attack`,43+j),N(`Partial ${id} Pitch ENV Decay`,46+j));
 digital.Filter.push(C(`Partial ${id} HPF Cutoff`,114+j),C(`Partial ${id} Cutoff`,102+j),C(`Partial ${id} Resonance`,105+j),C(`Partial ${id} Key Follow`,111+j),C(`Partial ${id} Filter ENV Depth`,108+j),N(`Partial ${id} Filter ENV Velo`,58+j),N(`Partial ${id} Filter ENV Attack`,70+j),N(`Partial ${id} Filter ENV Decay`,73+j),N(`Partial ${id} Filter ENV Sustain`,76+j),N(`Partial ${id} Filter ENV Release`,79+j));
 digital.AMP.push(N(`Partial ${id} Pan`,100+j),C(`Partial ${id} AMP Level`,117+j),N(`Partial ${id} AMP Velocity`,85+j),N(`Partial ${id} AMP ENV Attack`,88+j),N(`Partial ${id} AMP ENV Decay`,91+j),N(`Partial ${id} AMP ENV Sustain`,94+j),N(`Partial ${id} AMP ENV Release`,97+j));
}
const program={'Program FX':[C('TFX 1 Select',80),C('TFX 1 Control',14),C('TFX 2 Select',81),C('TFX 2 Control',15),C('Reverb Level',12),C('Delay Level',13),C('Delay Time',82),C('Mic Level',83)]};
const partSelect=$('xa-editor-part'),grpSelect=$('xa-editor-group'),panel=$('xa-editor-controls'),editStatus=$('xa-editor-status');
const names=xa.parts.slice(0,8).map(x=>x.name);
const addOption=(select,value,label)=>{const op=document.createElement('option');op.value=value;op.textContent=label;select.append(op)};
names.forEach((n,i)=>{addOption(partSelect,i,n);addOption($('xa-audition-part'),i,n)});addOption(partSelect,8,'PROGRAM FX');
let edits=get('jdxa-editor-values-v2',{});
const defs=()=>+partSelect.value===8?program:{...common,...(+partSelect.value<4?analog:digital)};
const groups=()=>{grpSelect.replaceChildren();Object.keys(defs()).forEach(n=>addOption(grpSelect,n,n))};
const sendNrpn=(ch,n,v)=>{const messages=[[0xb0|ch,99,0],[0xb0|ch,98,n],[0xb0|ch,6,v],[0xb0|ch,38,0],[0xb0|ch,99,127],[0xb0|ch,98,127]];return messages.every(msg=>xa.send(msg))};
function editorRender(){panel.replaceChildren();const part=+partSelect.value,group=grpSelect.value;
 for(const [label,cc,nrpn] of defs()[group]||[]){
  const key=`${part}:${cc===null?'nrpn'+nrpn:'cc'+cc}`;const value=Number.isFinite(edits[key])?edits[key]:64;
  const wrap=document.createElement('div');wrap.className='xa-param';const header=document.createElement('header');const nm=document.createElement('strong');nm.textContent=label;const output=document.createElement('output');output.textContent=Number.isFinite(edits[key])?String(value):'—';header.append(nm,output);
  const inp=document.createElement('input');inp.type='range';inp.min='0';inp.max='127';inp.value=value;inp.title=`${label} ${cc===null?'NRPN 0:'+nrpn:'CC '+cc}`;
  const sub=document.createElement('small');sub.textContent=cc===null?`NRPN MSB 0 / LSB ${nrpn}`:`CC ${cc}`;
  // Change sends exactly one current value; no blind bulk patch overwrite.
  inp.oninput=()=>{output.textContent=inp.value};
  inp.onchange=()=>{const v=clamp(inp.value);const ch=part===8?clamp(+$('xa-pc-channel').value):xa.parts[part].ch;const ok=cc===null?sendNrpn(ch,nrpn,v):xa.cc(ch,cc,v);if(ok){edits[key]=v;save('jdxa-editor-values-v2',edits);editStatus.textContent=`${names[part]||'PROGRAM FX'} · ${label} → ${v}, ${cc===null?'NRPN '+nrpn:'CC '+cc}, channel ${ch+1}.`}};
  wrap.append(header,inp,sub);panel.append(wrap)
 }
}
partSelect.onchange=()=>{groups();editorRender()};grpSelect.onchange=editorRender;groups();editorRender();
$('xa-editor-reset').onclick=()=>{edits={};save('jdxa-editor-values-v2',edits);editorRender();editStatus.textContent='Lokala reglage nollställda. Ingenting skickat till synt.'};
function download(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function importJSON(input){const f=input.files?.[0];if(!f)return null;if(f.size>2000000)throw Error('File too large');return JSON.parse(await f.text())}
$('xa-editor-export').onclick=()=>download('JD-XA-editor-values.json',{format:'jdxa-editor-v2',values:edits,note:'Local values only; not a full synthesizer patch.'});
$('xa-editor-import').onchange=async e=>{try{const v=await importJSON(e.target);if(v?.format!=='jdxa-editor-v2'||!v.values||typeof v.values!=='object')throw Error('Wrong editor format');edits=Object.fromEntries(Object.entries(v.values).filter(([k,x])=>/^([0-8]):(cc|nrpn)\d+$/.test(k)&&Number.isInteger(x)&&x>=0&&x<=127));save('jdxa-editor-values-v2',edits);editorRender();editStatus.textContent='Editorvärden importerade lokalt. Inget skickat till JD-XA.'}catch(err){editStatus.textContent=err.message}};
// 256 internal and 256 external slots. Name is user-supplied or read from temporary program, never guessed.
let library=get('jdxa-library-v1',{}),selectedName='';
const slot=()=>{const idx=+$('xa-bank').value*16+(+$('xa-program').value-1);return `${+$('xa-storage').value?'USB':'INT'}:${String.fromCharCode(65+Math.floor(idx/16))}${String(idx%16+1).padStart(2,'0')}`};
function libraryRender(){const target=$('xa-library');target.replaceChildren();const filter=$('xa-lib-search').value.trim().toLowerCase(),prefix=+$('xa-storage').value?'USB':'INT';let matches=0;
 for(let i=0;i<256;i++){const id=`${prefix}:${String.fromCharCode(65+Math.floor(i/16))}${String(i%16+1).padStart(2,'0')}`,name=library[id]||'';if(filter&&!`${id} ${name}`.toLowerCase().includes(filter))continue;matches++;
 const btn=document.createElement('button');btn.type='button';btn.textContent=id+' · '+(name||'(name unknown)');btn.classList.toggle('selected',id===slot());btn.onclick=()=>{$('xa-bank').value=Math.floor(i/16);$('xa-program').value=i%16+1;syncSelected();libraryRender()};target.append(btn)}$('xa-lib-count').textContent=`${matches} slots shown · ${Object.keys(library).filter(k=>k.startsWith(prefix+':')&&library[k]).length} named`;
}
function syncSelected(){const k=slot();$('xa-lib-name').value=library[k]||'';selectedName=k}
for(const el of ['xa-bank','xa-program','xa-storage'])$(el).addEventListener('change',()=>{syncSelected();libraryRender()});
$('xa-lib-search').oninput=libraryRender;
window.addEventListener('jdxa-library-scan',event=>{const {slot,name}=event.detail||{};if(/^(INT|USB):[A-P](0[1-9]|1[0-6])$/.test(slot||'')&&typeof name==='string'&&name.length){library[slot]=name.slice(0,48);save('jdxa-library-v1',library);syncSelected();libraryRender()}});
$('xa-lib-save').onclick=()=>{const id=slot(),name=$('xa-lib-name').value.trim().slice(0,48);if(name)library[id]=name;else delete library[id];save('jdxa-library-v1',library);libraryRender()};
$('xa-lib-export').onclick=()=>download('JD-XA-program-catalog.json',{format:'jdxa-library-v1',programs:library});
$('xa-lib-import').onchange=async e=>{try{const v=await importJSON(e.target);if(v?.format!=='jdxa-library-v1'||!v.programs||typeof v.programs!=='object')throw Error('Wrong library format');for(const [k,n] of Object.entries(v.programs)){if(/^(INT|USB):[A-P](0[1-9]|1[0-6])$/.test(k)&&typeof n==='string')library[k]=n.slice(0,48)}save('jdxa-library-v1',library);syncSelected();libraryRender()}catch(err){$('xa-lib-count').textContent=err.message}};
let readNameSlot=null;
$('xa-program-name-read').onclick=()=>{readNameSlot=slot();if(xa.rq(xa.encodedAddress('18000000'),12))$('xa-sysex-status').textContent='Reading name of temporary program. Awaiting JD-XA response…'};
function log(s){const text=$('xa-monitor');const at=new Date().toLocaleTimeString();text.textContent=(at+' '+s+'\n'+text.textContent).slice(0,14000)}
window.addEventListener('jdxa-out',ev=>log('OUT '+ev.detail.map(n=>n.toString(16).padStart(2,'0')).join(' ').toUpperCase()));
window.addEventListener('jdxa-dt1',ev=>{const {addr,body}=ev.detail;log('IN  DT1 '+addr.toString(16).toUpperCase()+' '+body.map(v=>v.toString(16).padStart(2,'0')).join(' '));if(addr===xa.encodedAddress('18000000')&&body.length>=12){const name=body.slice(0,12).map(n=>n>=32&&n<=126?String.fromCharCode(n):'').join('').trim();if(name){$('xa-lib-name').value=name;log('NAME '+JSON.stringify(name)+' read from temporary program'+(readNameSlot?' for '+readNameSlot:''));$('xa-sysex-status').textContent='Read temporary program name: '+name+'. Click SAVE NAME TO SLOT to assign to selected bank. (Name is not automatically proof of slot identity.)'}readNameSlot=null;}});
$('xa-monitor-clear').onclick=()=>{$('xa-monitor').textContent=''};
$('xa-monitor-export').onclick=()=>{const blob=new Blob([$('xa-monitor').textContent],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.download='JD-XA-test-log.txt';a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('xa-audition').onclick=()=>{const p=xa.parts[+$('xa-audition-part').value],note=clamp($('xa-audition-note').value),vel=Math.max(1,clamp($('xa-audition-vel').value)),ch=p.ch;if(xa.send([0x90|ch,note,vel]))setTimeout(()=>xa.send([0x80|ch,note,0]),300)};
syncSelected();libraryRender();
})();
