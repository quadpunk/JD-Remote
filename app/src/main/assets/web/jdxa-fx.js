(()=>{
'use strict';
const api=window.JDXiPerformance;
const status=t=>document.getElementById('fx-status').textContent=t;
const groups=[{"base": 402653696, "size": 100, "fields": [[0, "Switch", ["Off", "On"]], [1, "Type", ["Type 1", "Type 2", "Type 3", "Type 4", "Type 5", "Type 6", "Type 7"]], [2, "Level"]]}, {"base": 402653952, "size": 124, "fields": [[0, "Switch", ["Off", "On"]], [2, "Level"]]}, {"base": 402654208, "size": 43, "fields": [[0, "Switch", ["Off", "On"]], [4, "Reverb send"]]}, {"base": 402654464, "size": 39, "fields": [[0, "Switch", ["Off", "On"]], [1, "Type (0\u201329)", ["Type 1", "Type 2", "Type 3", "Type 4", "Type 5", "Type 6", "Type 7", "Type 8", "Type 9", "Type 10", "Type 11", "Type 12", "Type 13", "Type 14", "Type 15", "Type 16", "Type 17", "Type 18", "Type 19", "Type 20", "Type 21", "Type 22", "Type 23", "Type 24", "Type 25", "Type 26", "Type 27", "Type 28", "Type 29", "Type 30"]], [2, "Headroom", ["-18 dB", "-15 dB", "-12 dB", "-9 dB", "-6 dB", "-3 dB", "0 dB"]]]}, {"base": 402654720, "size": 39, "fields": [[0, "Switch", ["Off", "On"]], [1, "Type (0\u201329)", ["Type 1", "Type 2", "Type 3", "Type 4", "Type 5", "Type 6", "Type 7", "Type 8", "Type 9", "Type 10", "Type 11", "Type 12", "Type 13", "Type 14", "Type 15", "Type 16", "Type 17", "Type 18", "Type 19", "Type 20", "Type 21", "Type 22", "Type 23", "Type 24", "Type 25", "Type 26", "Type 27", "Type 28", "Type 29", "Type 30"]], [2, "Headroom", ["-18 dB", "-15 dB", "-12 dB", "-9 dB", "-6 dB", "-3 dB", "0 dB"]]]}, {"base": 402661376, "size": 79, "fields": [[9, "Level"], [10, "Pan"], [47, "Reverb send"], [37, "Mute", ["Off", "Mute"]]]}, {"base": 402661632, "size": 79, "fields": [[9, "Level"], [10, "Pan"], [47, "Reverb send"], [37, "Mute", ["Off", "Mute"]]]}, {"base": 402661888, "size": 79, "fields": [[9, "Level"], [10, "Pan"], [47, "Reverb send"], [37, "Mute", ["Off", "Mute"]]]}, {"base": 402662144, "size": 79, "fields": [[9, "Level"], [10, "Pan"], [47, "Reverb send"], [37, "Mute", ["Off", "Mute"]]]}, {"base": 402662400, "size": 79, "fields": [[9, "Level"], [10, "Pan"], [47, "Reverb send"], [37, "Mute", ["Off", "Mute"]]]}, {"base": 402662656, "size": 79, "fields": [[9, "Level"], [10, "Pan"], [47, "Reverb send"], [37, "Mute", ["Off", "Mute"]]]}, {"base": 402662912, "size": 79, "fields": [[9, "Level"], [10, "Pan"], [47, "Reverb send"], [37, "Mute", ["Off", "Mute"]]]}, {"base": 402663168, "size": 79, "fields": [[9, "Level"], [10, "Pan"], [47, "Reverb send"], [37, "Mute", ["Off", "Mute"]]]}];
const controls=new Map();
let generation=0;
groups.forEach(({base,fields},i)=>{
 const host=document.getElementById('fx-'+i);
 for(const [offset,name,options] of fields){
  const address=base+offset,label=document.createElement('label');
  label.append(name);
  const input=document.createElement(options?'select':'input'),out=document.createElement('output');
  if(options){
   input.add(new Option('—',''));
   options.forEach((v,n)=>{if(v)input.add(new Option(v,n))});
   if(i===3){const kit=new Option('Kit (individual drum sounds)',5);kit.disabled=true;input.add(kit)}
  }else{input.type='range';input.min=0;input.max=127;input.setAttribute('aria-label',name);label.append(out)}
  input.disabled=true;label.append(input);host.append(label);
  function show(value){
   input.disabled=value==null;
   if(options)input.value=value==null?'':String(value);
   else{input.value=value??0;out.textContent=value??'—'}
  }
  show(null);
  controls.set(address,{show,input});
  input.oninput=()=>{if(!options)out.textContent=input.value};
  input.onchange=()=>{
   if(input.value==='')return;
   const value=Number(input.value);
   if(api.connected()&&api.hasSysex()&&api.dt1(address,[value])){
    api.readback().set(address,value);status(name+' sent to JD-XA.');
   }else{reset();status('Write failed. Reconnect with SysEx permission and read FX again.')}
  };
 }
});
function reset(){
 generation++;
 for(const c of controls.values())c.show(null);
 status('Read the current program from the JD-XA.');
}
api.onReply((address,length)=>{
 for(const [addr,c] of controls)if(addr>=address&&addr<address+length)c.show(api.readback().get(addr));
});
function read(){
 reset();
 if(!api.connected()||!api.hasInput()||!api.hasSysex()){status('Select a MIDI input and output and allow SysEx, then press Read FX.');return}
 const token=generation;status('Reading program effects…');
 groups.forEach(({base,size},i)=>setTimeout(()=>{if(token===generation)api.rq1(base,size)},i*85));
 setTimeout(()=>{
  if(token!==generation)return;
  const count=[...controls.values()].filter(c=>!c.input.disabled).length;
  status(count===controls.size?'Current program effects loaded.':count+' of '+controls.size+' settings received. Check the ports and device ID, then read again.');
 },1500);
}
document.getElementById('fx-read').onclick=read;
document.querySelector('[data-page="fx"]').addEventListener('click',read);
window.JDXiFx={reset};
})();
