(()=>{'use strict';
/* JD-XA punch-in pads: hold = effect on, release = back. Only documented Temporary Program addresses (model 0F). */
const $=id=>document.getElementById(id),api=window.JDXiPerformance,host=$('perfpunch');if(!host||!api)return;
const st=t=>{const s=$('perfstatus');if(s)s.textContent=t},bpm=()=>Math.max(40,Math.min(240,+$('perfbpm').value||120));
const sw=(name,addr)=>({name,sub:'hold = ON',start(){api.dt1(addr,[1]);return()=>api.dt1(addr,[0])}});
const mute=(i)=>({name:(i<4?'MUTE A':'MUTE D')+(i%4+1),sub:'hold = mute part',start(){const a=0x18002025+i*0x100;api.dt1(a,[1]);return()=>api.dt1(a,[0])}});
const chans=[0,1,2,3,4,5,6,7];
const stutter={name:'STUTTER',sub:'1/16 gate · all parts',start(){let on=false;const t=setInterval(()=>{on=!on;chans.forEach(c=>api.send([0xb0|c,11,on?0:127]))},60000/bpm()/4/2);return()=>{clearInterval(t);chans.forEach(c=>api.send([0xb0|c,11,127]))}}};
const dive={name:'PITCH DIVE',sub:'bend down · all parts',start(){let v=8192;const t=setInterval(()=>{v=Math.max(0,v-420);chans.forEach(c=>api.send([0xe0|c,v&127,v>>7]))},20);return()=>{clearInterval(t);chans.forEach(c=>api.send([0xe0|c,0,64]))}}};
const PADS=[sw('REVERB',0x18000200),sw('DELAY',0x18000300),sw('VOCODER',0x18000400),sw('TFX 1',0x18000500),sw('TFX 2',0x18000600),stutter,dive,...chans.map(mute)];
PADS.slice(0,16).forEach(fx=>{const b=document.createElement('button');b.type='button';b.className='perf-pad';const t=document.createElement('b');t.textContent=fx.name;const s=document.createElement('small');s.textContent=fx.sub;b.append(t,s);
 let stop=null;const up=()=>{if(stop){const f=stop;stop=null;b.classList.remove('active');try{f()}catch{}}};
 b.addEventListener('pointerdown',e=>{e.preventDefault();if(!api.connected()){st('Connect MIDI first');return}try{b.setPointerCapture(e.pointerId)}catch{}up();stop=fx.start();b.classList.add('active')});
 ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,up));host.append(b)});
})();