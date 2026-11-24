(()=>{'use strict';
/* JD-XA Synth page: tone overview, advanced editor, arpeggio, My patches.
   Addresses/ranges from Roland JD-XA MIDI Implementation v1.00 (Temporary Tone 19/1A + tone offset 02 00 00 analog / 01 00 00 digital, Program 18). Model ID 00 00 00 0F. */
const $=id=>document.getElementById(id),api=()=>window.JDXiPerformance;
const ls={g:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},s:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const num=a=>((a[0]*128+a[1])*128+a[2])*128+a[3],b4=n=>[Math.floor(n/2097152)&127,Math.floor(n/16384)&127,Math.floor(n/128)&127,n&127];
const hx=n=>b4(n).map(x=>x.toString(16).padStart(2,'0')).join(' ').toUpperCase();
const PARTS=[0,1,2,3].map(i=>({id:'a'+i,name:'Analog '+(i+1),an:true,base:num([0x19,i*0x20+2,0,0]),i,ch:i})).concat([0,1,2,3].map(i=>({id:'d'+i,name:'Digital '+(i+1),an:false,base:num([0x1a,i*0x20+1,0,0]),i,ch:4+i})));
const NOTE=['16','12','8','4','2','1','3/4','2/3','1/2','3/8','1/3','1/4','3/16','1/6','1/8','3/32','1/12','1/16','1/24','1/32'],SH=['TRI','SIN','SAW','SQR','S&H','RND'],OSCS=['OSC1+2','OSC1','OSC2'];
const sg=v=>(v>0?'+':'')+v;
const N=(o,l,max=127)=>({o,l,min:0,max}),B=(o,l,min=1,max=127)=>({o,l,min,max,f:v=>sg(v-64)}),K=(o,l)=>({o,l,min:54,max:74,f:v=>sg((v-64)*10)});
const S=(o,l)=>({o,l,min:0,max:1,opt:['OFF','ON']}),O=(o,l,opt)=>({o,l,min:0,max:opt.length-1,opt}),PAN=(o,l)=>({o,l,min:0,max:127,f:v=>v<64?'L'+(64-v):v===64?'C':(v-64)+'R'});
const SRC=(o,l)=>({o,l,min:0,max:100,f:v=>v===0?'OFF':v<=31?'CC'+String(v).padStart(2,'0'):v<=94?'CC'+(v+1):v===95?'BEND':v===96?'AFT':'raw '+v});
const DST=['OFF','CUTOFF','RESO','AMP-LEV','X-MOD','PIT-OSC1','PIT-OSC2','PW-OSC1','PW-OSC2','PIT-LFO1','PIT-LFO2','FLT-LFO1','FLT-LFO2','AMP-LFO1','AMP-LFO2','LFO1-RATE','LFO2-RATE'];
const lfo=(b,k)=>[O(b,'Shape',SH),N(b+1,'Rate'),N(b+2,'Fade time'),S(b+3,'Tempo sync'),O(b+4,'Sync note',NOTE),O(b+5,'Pitch destination',OSCS),B(b+6,'Pitch depth'),B(b+7,'Filter depth'),B(b+8,'Amp depth'),O(b+9,'PW destination',[...OSCS,'OFF']),S(b+k,'Key trigger')];
const osc=b=>[O(b,'Waveform',['SAW','SQR','PW-SQR','TRI','SIN']),O(b+1,'Pitch range',['0 oct','1 oct','2 oct','3 oct','4 oct']),B(b+2,'Pitch (semi)',16,112),B(b+3,'Fine (cent)',14,114),N(b+4,'Pulse width'),N(b+5,'PWM depth'),N(b+7,'Level'),B(b+8,'Pitch env velocity'),N(b+9,'Pitch env attack'),N(b+10,'Pitch env decay'),B(b+11,'Pitch env depth')];
const mx=[];for(let m=0;m<4;m++){const b=0x2a+m*9;mx.push({n:'Matrix control '+(m+1),c:'ac',p:[SRC(b,'Source'),...[0,1,2,3].flatMap(k=>[O(b+1+k*2,'Destination '+(k+1),DST),B(b+2+k*2,'Sens '+(k+1))])]})}
const AN={ac:{off:[0,0,0],size:0x4e},ap:{off:[0,1,0],size:0x65}};
const AG=[
{n:'Oscillator 1',c:'ap',e:1,p:osc(0x2a)},{n:'Oscillator 2',c:'ap',e:1,p:osc(0x36)},
{n:'Oscillator common',c:'ap',p:[S(0x25,'Sync'),S(0x26,'Ring'),N(0x27,'Cross mod'),O(0x28,'Mod source',['OSC2','AUX']),S(0x29,'Phase sync'),O(0x42,'Pitch env select',OSCS),N(0x43,'AUX level'),O(0x44,'AUX source',['White noise','Pink noise','Digital part','Mic'])]},
{n:'Filter',c:'ap',e:1,p:[O(0x46,'Type',['BYPASS','LPF1','LPF2','LPF3','HPF','BPF']),N(0x47,'Cutoff'),B(0x48,'Cutoff fine',14,114),K(0x49,'Key follow'),B(0x4a,'Key follow fine',14,114),N(0x4b,'Resonance'),N(0x52,'HPF cutoff'),N(0x54,'Drive')]},
{n:'Filter envelope',c:'ap',e:1,p:[B(0x4c,'Velocity sens'),N(0x4d,'Attack'),N(0x4e,'Decay'),N(0x4f,'Sustain'),N(0x50,'Release'),B(0x51,'Depth')]},
{n:'Amp',c:'ap',p:[N(0x55,'Level'),K(0x56,'Key follow'),B(0x57,'Velocity sens')]},
{n:'Amp envelope',c:'ap',e:1,p:[N(0x58,'Attack'),N(0x59,'Decay'),N(0x5a,'Sustain'),N(0x5b,'Release')]},
{n:'LFO 1',c:'ap',e:1,p:lfo(0,0x0b)},{n:'LFO 2',c:'ap',p:lfo(0x0c,0x17)},
{n:'Modulation LFO',c:'ap',p:[...lfo(0x18,0x23),O(0x24,'LFO select',['LFO1','LFO2'])]},
{n:'Tone common',c:'ac',p:[S(0x0e,'MFX'),S(0x0f,'Portamento'),N(0x10,'Porta time'),S(0x13,'Unison'),S(0x15,'Legato'),B(0x17,'Octave shift',61,67),N(0x18,'Bend up',24),N(0x19,'Bend down',24),O(0x1a,'Bend mode',['NORMAL','CATCH+LAST'])]},
...mx];
const DG={dc:{off:[0,0,0],size:0x40},dm:{off:[0,0x50,0],size:0x25}};
const WV=window.JDXA_WAVES||[];
const DP=g=>[
{n:'Oscillator',c:g,e:1,p:[O(0,'Waveform',['SAW','SQR','PW-SQR','TRI','SINE','NOISE','SUPER-SAW','PCM']),O(1,'Variation',['A','B','C']),B(3,'Pitch (semi)',40,88),B(4,'Detune (cent)',14,114),N(5,'PWM depth'),N(6,'Pulse width'),N(0x2a,'PW shift'),{o:0x35,l:'PCM wave (1–'+WV.length+')',min:0,max:WV.length,nib:4,sel:1,opt:['OFF',...WV.map((w,i)=>String(i+1).padStart(3,'0')+' '+w)]},O(0x34,'Wave gain',['-6 dB','0 dB','+6 dB','+12 dB']),N(0x3a,'Super-saw detune'),N(7,'Pitch env attack'),N(8,'Pitch env decay'),B(9,'Pitch env depth')]},
{n:'Filter',c:g,e:1,p:[O(0x0a,'Mode',['BYPASS','LPF','HPF','BPF','PKG','LPF2','LPF3','LPF4']),O(0x0b,'Slope',['-12 dB','-24 dB']),N(0x0c,'Cutoff'),K(0x0d,'Key follow'),N(0x0f,'Resonance'),N(0x39,'HPF cutoff')]},
{n:'Filter envelope',c:g,e:1,p:[B(0x0e,'Velocity sens'),N(0x10,'Attack'),N(0x11,'Decay'),N(0x12,'Sustain'),N(0x13,'Release'),B(0x14,'Depth')]},
{n:'Amp',c:g,e:1,p:[N(0x15,'Level'),B(0x16,'Velocity sens'),PAN(0x1b,'Pan'),K(0x3c,'Key follow')]},
{n:'Amp envelope',c:g,e:1,p:[N(0x17,'Attack'),N(0x18,'Decay'),N(0x19,'Sustain'),N(0x1a,'Release')]},
{n:'LFO',c:g,e:1,p:[O(0x1c,'Shape',SH),N(0x1d,'Rate'),S(0x1e,'Tempo sync'),O(0x1f,'Sync note',NOTE),N(0x20,'Fade time'),S(0x21,'Key trigger'),B(0x22,'Pitch depth'),B(0x23,'Filter depth'),B(0x24,'Amp depth'),B(0x25,'Pan depth')]},
{n:'Modulation LFO',c:g,p:[O(0x26,'Shape',SH),N(0x27,'Rate'),S(0x28,'Tempo sync'),O(0x29,'Sync note',NOTE),B(0x2c,'Pitch depth'),B(0x2d,'Filter depth'),B(0x2e,'Amp depth'),B(0x2f,'Pan depth'),B(0x3b,'Rate control')]},
{n:'Aftertouch',c:g,p:[B(0x30,'Cutoff sens'),B(0x31,'Level sens')]}];
const DGR=[{n:'Tone common',c:'dc',p:[N(0x0c,'Tone level'),S(0x12,'Portamento'),N(0x13,'Porta time'),O(0x31,'Porta mode',['NORMAL','LEGATO']),S(0x14,'Mono'),S(0x32,'Legato'),S(0x2e,'Unison'),O(0x3c,'Unison size',['2','4','6','8']),B(0x15,'Octave shift',61,67),N(0x16,'Bend up',24),N(0x17,'Bend down',24),O(0x18,'Bend mode',['NORMAL','CATCH+LAST']),S(0x19,'Partial 1'),S(0x1b,'Partial 2'),S(0x1d,'Partial 3'),O(0x1f,'Ring mod',['OFF','---','ON']),S(0x20,'MFX'),N(0x34,'Analog feel'),N(0x35,'Wave shape')]},
{n:'Interval / envelope loop',c:'dm',p:[N(1,'Attack interval sens'),N(2,'Release interval sens'),N(3,'Porta interval sens'),O(4,'Envelope loop',['OFF','FREE-RUN','TEMPO-SYNC']),O(5,'Loop sync note',NOTE),S(6,'Chromatic porta')]}];
const CH=(part,c)=>{const o=part.an?AN[c]:(DG[c]||{off:[0,0x20+(+c.slice(2)),0],size:0x3d});return {a:part.base+num([0,...o.off]),size:o.size}};
const groups=(part,pi)=>part.an?AG:[...DGR,...DP('dp'+pi)];
const chunkKeys=part=>part.an?['ac','ap']:['dc','dm','dp0','dp1','dp2'];
/* readback store */
const store=new Map();let waiters=[];
const dev=()=>{try{return api().deviceId()}catch{return 16}};
const cs=a=>(128-a.reduce((x,y)=>x+y,0)%128)%128;
const send=b=>{const a=api();return a&&a.connected()&&a.send(b)};
const dt1=(addr,data)=>{const a=b4(addr);return send([0xf0,0x41,dev(),0,0,0,0x0f,0x12,...a,...data,cs([...a,...data]),0xf7])};
const rq=(addr,size)=>{const a=b4(addr),s=[0,0,size>>7,size&127];return send([0xf0,0x41,dev(),0,0,0,0x0f,0x11,...a,...s,cs([...a,...s]),0xf7])};
const prev=window.JDXiPerformanceReceive;
window.JDXiPerformanceReceive=m=>{try{prev&&prev(m)}catch{}
 if(m.length<14||m[0]!==0xf0||m[1]!==0x41||m[6]!==0x0f||m[7]!==0x12)return;
 const base=num(m.slice(8,12)),d=m.slice(12,-2);d.forEach((v,i)=>store.set(base+i,v));
 waiters=waiters.filter(w=>{if(w.done())return false;return true});window.dispatchEvent(new CustomEvent('jdxa-synth-dt1',{detail:{base,len:d.length}}))};
function readChunks(list,done){const a=api();if(!a||!a.connected())return done(false);
 list.forEach((x,i)=>{setTimeout(()=>rq(x.a,x.size),i*110)});
 const need=list.map(x=>x.a),t0=Date.now(),tm=setInterval(()=>{const ok=need.every(n=>store.has(n));if(ok||Date.now()-t0>2200+list.length*110){clearInterval(tm);done(ok)}},120)}
const val=(a,def=0)=>store.has(a)?store.get(a):def;
const name12=a=>{let s='';for(let i=0;i<12;i++)s+=String.fromCharCode(val(a+i,32));return s.trim()};
/* ---------- control rendering ---------- */
function ctl(part,pi,g,p,state){
 const ch=CH(part,g.c),addr=ch.a+p.o,card=document.createElement('div');card.className='paramcard';
 const lab=document.createElement('label'),out=document.createElement('output'),have=store.has(addr);
 lab.append(p.l+' ');lab.append(out);
 let inp;const show=v=>p.opt?(p.opt[v-p.min]??v):p.f?p.f(v):String(v);
 const rd=a=>p.nib?[0,1,2,3].reduce((x,k)=>x*16+(store.get(a+k)||0),0):store.get(a);
 const v0=have?rd(addr):p.min;
 if(p.opt&&(p.opt.length<=24||p.sel)){inp=document.createElement('select');p.opt.forEach((t,i)=>{const o=document.createElement('option');o.value=p.min+i;o.textContent=t;inp.append(o)})}
 else{inp=document.createElement('input');inp.type='range';inp.min=p.min;inp.max=p.max}
 inp.value=Math.max(p.min,Math.min(p.max,v0));out.textContent=have?show(+inp.value):'—';
 inp.disabled=!have&&!state.force;
 const targets=()=>state.link&&!part.an&&g.c.startsWith('dp')?[0,1,2].map(k=>CH(part,'dp'+k).a+p.o):[addr];
 inp.oninput=()=>{const v=+inp.value;out.textContent=show(v);targets().forEach(t=>{const d=p.nib?[(v>>12)&15,(v>>8)&15,(v>>4)&15,v&15]:[v];dt1(t,d);d.forEach((x,k)=>store.set(t+k,x))});state.touched&&state.touched(p.l)};
 lab.append(inp);card.append(lab);return card}
function renderGroups(host,part,pi,list,state){host.replaceChildren();
 for(const g of list){const sec=document.createElement('section');sec.className='paramcard';const h=document.createElement('h3');h.textContent=g.n;sec.append(h);
  for(const p of g.p)sec.append(ctl(part,pi,g,p,state));host.append(sec)}}
/* ---------- overview ---------- */
const st={force:false,link:false};
const P=()=>PARTS.find(p=>p.id===$('xs-part').value)||PARTS[0],PI=()=>+$('xs-partial').value;
function fillParts(sel){PARTS.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;sel.append(o)})}
fillParts($('xs-part'));fillParts($('xs-editpart'));fillParts($('xs-uppart'));
const status=t=>{$('xs-status').textContent=t};
function chunkList(part){return chunkKeys(part).map(k=>CH(part,k))}
function paintOverview(){const part=P(),pi=PI();$('xs-partial').disabled=part.an;
 const list=groups(part,pi).filter(g=>!$('xs-simple').checked||g.e);
 st.force=$('xs-force').checked;st.link=$('xs-link').checked&&!part.an;
 renderGroups($('xs-overview'),part,pi,list,st);
 const cm=CH(part,part.an?'ac':'dc').a;$('xs-name').textContent=store.has(cm)?name12(cm):''}
$('xs-read').onclick=()=>{const part=P();if(!api()||!api().connected()){status('Connect MIDI first (Info → MIDI connection).');return}
 chunkList(part).forEach(c=>{for(let i=0;i<c.size;i++)store.delete(c.a+i)});status('Reading '+part.name+'…');
 readChunks(chunkList(part),ok=>{paintOverview();status(ok?part.name+' read from the JD-XA. Changes are sent live.':'Partial reply. Check MIDI in/out, SysEx permission and Device ID, then read again.')})};
['xs-part','xs-partial','xs-simple','xs-link','xs-force'].forEach(id=>$(id).onchange=()=>{paintOverview();paintAdv()});
/* ---------- advanced ---------- */
function advParts(){const part=PARTS.find(p=>p.id===$('xs-editpart').value)||PARTS[0];return part}
function fillBlocks(){const part=advParts(),sel=$('xs-block');sel.replaceChildren();groups(part,+$('xs-editpartial').value).forEach((g,i)=>{const o=document.createElement('option');o.value=i;o.textContent=g.n;sel.append(o)});$('xs-editpartial').disabled=part.an}
function paintAdv(){const part=advParts(),pi=+$('xs-editpartial').value,gs=groups(part,pi),g=gs[+$('xs-block').value]||gs[0];
 renderGroups($('xs-paramgrid'),part,pi,[g],{force:$('xs-eforce').checked,link:false})}
$('xs-editpart').onchange=()=>{fillBlocks();paintAdv()};$('xs-editpartial').onchange=()=>{fillBlocks();paintAdv()};$('xs-block').onchange=paintAdv;$('xs-eforce').onchange=paintAdv;
$('xs-readblock').onclick=()=>{const part=advParts(),pi=+$('xs-editpartial').value,g=groups(part,pi)[+$('xs-block').value];if(!g)return;const c=CH(part,g.c);
 for(let i=0;i<c.size;i++)store.delete(c.a+i);readChunks([c],()=>{paintAdv();paintOverview()})};
fillBlocks();paintAdv();paintOverview();
/* ---------- arpeggio (Program 18 00 60 00, switches 18 00 50 08/09, zones 18 00 4x 03) ---------- */
const AR=num([0x18,0,0x60,0]),ARP=[
 O(0,'Grid',['04_','08_','08L','08H','08t','16_','16L','16H','16t']),O(1,'Duration',['30','40','50','60','70','80','90','100','120','FUL']),
 O(2,'Motif',['UP/L','UP/L&H','UP/_','DOWN/L','DOWN/L&H','DOWN/_','UP&DOWN/L','UP&DOWN/L&H','UP&DOWN/_','RANDOM/L','RANDOM/_','PHRASE']),
 B(3,'Octave range',61,67),N(4,'Accent rate',100),{o:5,l:'Velocity (0 = REAL)',min:0,max:127}];
const PC=num([0x18,0,0x50,0]),zone=i=>num([0x18,0,0x40+i,3]);
const ast={force:true};
function paintArp(){const host=$('xs-arpgrid');host.replaceChildren();const sec=document.createElement('section');sec.className='paramcard';
 const h=document.createElement('h3');h.textContent='Arpeggio common';sec.append(h);
 for(const p of ARP)sec.append(ctl({an:true,base:AR-0,i:0},0,{c:'x'},p,ast));host.append(sec)}
/* ctl() resolves addresses via CH(); give arp its own chunk */
AN.x={off:[0,0,0],size:8};
const partSw=[];
function paintSwitches(){const h=$('xs-arp-switches');h.replaceChildren();partSw.length=0;PARTS.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.dataset.i=i;
 const upd=()=>{const on=val(zone(i),0)===1;b.textContent=p.name+' · ARP '+(on?'ON':'OFF');b.classList.toggle('arp-part-active',on)};
 b.onclick=()=>{const on=val(zone(i),0)===1?0:1;if(dt1(zone(i),[on])){store.set(zone(i),on);upd();$('xs-arpstatus').textContent=p.name+' ARP '+(on?'ON':'OFF')+' sent. Use “Read arpeggio” to confirm.'}else $('xs-arpstatus').textContent='Connect MIDI first.'};
 upd();h.append(b);partSw.push(upd)});
 const g=document.createElement('button');g.type='button';const gu=()=>{const on=val(PC+8,0)===1;g.textContent='Program ARP · '+(on?'ON':'OFF');g.classList.toggle('arp-part-active',on)};
 g.onclick=()=>{const on=val(PC+8,0)===1?0:1;if(dt1(PC+8,[on])){store.set(PC+8,on);gu()}};gu();h.append(g);partSw.push(gu);
 const hd=document.createElement('button');hd.type='button';const hu=()=>{const on=val(PC+9,0)===1;hd.textContent='ARP Hold · '+(on?'ON':'OFF');hd.classList.toggle('arp-part-active',on)};
 hd.onclick=()=>{const on=val(PC+9,0)===1?0:1;if(dt1(PC+9,[on])){store.set(PC+9,on);hu()}};hu();h.append(hd);partSw.push(hu)}
$('xs-arpread').onclick=()=>{if(!api()||!api().connected()){$('xs-arpstatus').textContent='Connect MIDI first.';return}
 const list=[{a:AR,size:8},{a:PC,size:0x14},...PARTS.map((p,i)=>({a:zone(i)-3,size:0x21}))];
 list.forEach(c=>{for(let i=0;i<c.size;i++)store.delete(c.a+i)});$('xs-arpstatus').textContent='Reading arpeggio and part ARP switches…';
 readChunks(list,ok=>{paintArp();paintSwitches();$('xs-arpstatus').textContent=ok?'Arpeggio read from the JD-XA.':'Partial reply: some values are missing.'})};
paintArp();paintSwitches();
/* ---------- My patches ---------- */
let mine=ls.g('jdxa-my-patches-v1',[]);const saveMine=()=>ls.s('jdxa-my-patches-v1',mine);
const mst=t=>{$('xs-upstatus').textContent=t};
function paintMine(){const host=$('xs-uplist');host.replaceChildren();
 const sorted=[...mine].sort((a,b)=>(b.fav?1:0)-(a.fav?1:0)||a.name.localeCompare(b.name));
 if(!sorted.length){host.textContent='No saved patches yet.';return}
 for(const m of sorted){const row=document.createElement('div');row.className='performance-toolbar';const t=document.createElement('strong');t.textContent=(m.fav?'★ ':'')+m.name+' · '+m.partName;
  const mk=(x,f)=>{const b=document.createElement('button');b.type='button';b.textContent=x;b.onclick=f;return b};
  row.append(t,mk('Load into selected part',()=>loadMine(m)),mk(m.fav?'☆ Unfavorite':'★ Favorite',()=>{m.fav=!m.fav;saveMine();paintMine()}),mk('Delete',()=>{mine=mine.filter(x=>x!==m);saveMine();paintMine()}));host.append(row)}}
$('xs-upsave').onclick=()=>{const part=PARTS.find(p=>p.id===$('xs-uppart').value)||PARTS[0];if(!api()||!api().connected()){mst('Connect MIDI first.');return}
 const list=chunkList(part);list.forEach(c=>{for(let i=0;i<c.size;i++)store.delete(c.a+i)});mst('Reading '+part.name+'…');
 readChunks(list,ok=>{if(!ok){mst('Incomplete readback, nothing saved.');return}
  const cm=CH(part,part.an?'ac':'dc').a,nm=($('xs-upname').value.trim()||name12(cm)||'Untitled').slice(0,40);
  mine.push({name:nm,part:part.id,partName:part.name,an:part.an,chunks:list.map(c=>Array.from({length:c.size},(_,i)=>val(c.a+i))),created:new Date().toISOString()});saveMine();paintMine();mst('Saved “'+nm+'”.')})};
function loadMine(m){const part=PARTS.find(p=>p.id===$('xs-uppart').value)||PARTS[0];if(part.an!==m.an){mst('This patch is '+(m.an?'an Analog':'a Digital')+' tone: choose an '+(m.an?'Analog':'Digital')+' part.');return}
 if(!api()||!api().connected()){mst('Connect MIDI first.');return}
 chunkList(part).forEach((c,i)=>{const d=m.chunks[i];if(d)setTimeout(()=>{dt1(c.a,d);d.forEach((v,k)=>store.set(c.a+k,v))},i*80)});
 setTimeout(()=>{paintOverview();mst('“'+m.name+'” sent to '+part.name+'.')},600)}
$('xs-upexport').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify({format:'jdxa-my-patches-v1',patches:mine},null,1)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='jdxa-my-patches.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)};
$('xs-upimport').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const j=JSON.parse(await f.text());if(j.format!=='jdxa-my-patches-v1'||!Array.isArray(j.patches))throw Error('Not a JD-XA patch file');
 j.patches.forEach(p=>{if(p&&p.name&&Array.isArray(p.chunks)&&typeof p.an==='boolean')mine.push({name:String(p.name).slice(0,40),part:p.part,partName:p.partName||'',an:p.an,chunks:p.chunks.map(c=>c.map(v=>v&127)),created:p.created||'',fav:!!p.fav})});saveMine();paintMine();mst('Imported.')}catch(err){mst('Import failed: '+err.message)}e.target.value=''};
paintMine();
window.JDXASynth={store,rq,dt1,num,b4};
})();
