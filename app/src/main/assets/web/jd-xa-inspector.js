/* JD-XA read-only named-parameter inspector; addresses checked against Roland MIDI Implementation v1.00 pp.8–10. */
(()=>{'use strict';
const xa=window.JDXA,$=id=>document.getElementById(id);
const defs=[
 ['Temporary Program · Name', '18000000',12,'ascii'],
 ['Temporary Program · Level', '1800000C',1,'number'],
 ['Temporary Program · Mic Level', '18000052',1,'number'],
 ['Temporary Program · Mic Mode', '18000053',1,'micmode'],
 ['Temporary Program · Poly Stack', '18000056',1,'onoff'],
 ['Temporary Program · Poly Stack Part', '18000057',1,'part'],
 ['Temporary Program · CV/Gate 1 Channel', '1800005C',1,'cvch'],
 ['Temporary Program · CV/Gate 2 Channel', '1800005E',1,'cvch'],
 ['Temporary Program · Program Tempo (4 nibbles)', '18000067',4,'tempo'],
 ['System · Master EQ On', '02000100',1,'onoff'],
 ['System · Mic Reverb On', '02000200',1,'onoff'],
 ['System · Mic Reverb Type', '02000201',1,'reverb'],
 ['System · Mic Reverb Time', '02000202',1,'number'],
 ['System · Mic Reverb Level', '02000203',1,'number'],
 ['System · Mic Noise Suppressor', '02000204',1,'onoff'],
 ['System · MIDI TX Program Change', '02000300',1,'onoff'],
 ['System · MIDI TX Bank Select', '02000301',1,'onoff'],
 ['System · Wheel 1 Assign Source', '02000313',1,'source'],
 ['System · Wheel 2 Assign Source', '02000317',1,'source']
];
const view=$('xa-inspect-result'),select=$('xa-inspect-param');
for(const [name,hex] of defs){const option=document.createElement('option');option.value=hex;option.textContent=name+' · '+hex.match(/../g).join(' ');select.append(option)}
const recorded=[];let requested=null;
const hex=x=>x.map(n=>n.toString(16).padStart(2,'0').toUpperCase()).join(' ');
function decode(type,data){const value=data[0];switch(type){
case 'ascii':return String.fromCharCode(...data).trim();
case 'onoff':return value===0?'OFF':value===1?'ON':'Raw: '+value;
case 'micmode':return ['OFF','VOCODER','MOD','BYPASS'][value]??'Raw: '+value;
case 'part':return value<4?'Analog '+(value+1):'Raw: '+value;
case 'cvch':return value===16?'OFF':value<16?'CH '+(value+1):'Raw: '+value;
case 'reverb':return ['ROOM1','ROOM2','STAGE1','STAGE2','HALL1','HALL2','DELAY','PAN-DLY'][value]??'Raw: '+value;
case 'source':return value===0?'SYSTEM':value===1?'PROGRAM':'Raw: '+value;
case 'tempo':{if(data.some(v=>v>15))return 'Invalid nibble data';const raw=data.reduce((s,n)=>s*16+n,0);return (raw/100).toFixed(2)+' BPM (raw '+raw+')'}
default:return String(value);
}}
// RQ1 is only answered for exact block start + size, so read the whole block and cut the value out.
const BLK=[['18000000',0x6b],['02000100',0x0f],['02000200',0x0b],['02000300',0x20]];
const blockOf=hex=>{const a=xa.encodedAddress(hex);let r=null;for(const [h,sz] of BLK){const b=xa.encodedAddress(h);if(a>=b&&a<b+sz)r={addr:b,size:sz,off:a-b}}return r};
$('xa-inspect-read').onclick=()=>{
 const item=defs.find(d=>d[1]===select.value);if(!item)return;
 const [name,hex,count]=item,blk=blockOf(hex);if(!blk){view.textContent='Ingen känd blockstorlek för '+hex;return}
 requested={name,hex,count,blk,at:Date.now()};
 try{const ok=xa.rq(blk.addr,blk.size);view.textContent=ok?'RQ1: '+name+'\nBlock: '+xa.addrBytes(blk.addr).map(x=>x.toString(16).padStart(2,'0').toUpperCase()).join(' ')+' ('+blk.size+' byte), offset '+blk.off+'\nWaiting for DT1…':'MIDI not connected or SysEx blocked.'}catch(e){view.textContent=e.message}
};
window.addEventListener('jdxa-dt1',ev=>{
 const {addr,body}=ev.detail;if(!requested||addr!==requested.blk.addr)return;
 const def=defs.find(d=>d[1]===requested.hex);if(!def)return;
 const [name,address,count,type]=def,off=requested.blk.off;
 if(body.length<off+count){view.textContent='Partial DT1 response: '+body.length+'/'+(off+count)+' bytes. Retry.';return}
 const bytes=body.slice(off,off+count),val=decode(type,bytes),result={parameter:name,address,bytes,value:val,time:new Date().toISOString()};
 recorded.push(result);if(recorded.length>1000)recorded.shift();
 view.textContent='MATCHED DT1 \u2713\n'+name+'\nAddress: '+address.match(/../g).join(' ')+'\nRaw: '+hex(result.bytes)+'\nDecoded: '+val+'\n\nRead-only. No write performed.';
 requested=null;
});
$('xa-inspect-export').onclick=()=>{
 const blob=new Blob([JSON.stringify({format:'jdxa-readback-v1',readings:recorded},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='JD-XA-readback.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)
};
window.JDXAInspector={definitions:defs,readings:recorded,decode};
})();
