(()=>{
/* Motion layer (shared by the JD-Xi and JD-XA pages).
   1) tab -> tab page sweep, 2) folding sections (called from collapse.js), 3) <details> panels,
   4) the "Hide top" bar. Instant behaviour is kept when motion is reduced or unsupported. */
const D=260,EASE='cubic-bezier(.22,.8,.24,1)';
const root=document.documentElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const canAnimate=typeof Element.prototype.animate==='function';
const ok=()=>canAnimate&&!reduced.matches&&document.visibilityState==='visible';
const px=n=>n+'px';

/* ---------- 1. page sweep between tabs ---------- */
const nav=document.getElementById('nav');
if(nav){
 const order=[...nav.querySelectorAll('button[data-page]')];
 let passthrough=false,busy=false;
 const sweepFallback=dir=>requestAnimationFrame(()=>{
  const p=document.querySelector('main>.page.active');if(!p)return;
  p.animate([{opacity:0,transform:'translateX('+(dir==='fwd'?'7%':'-7%')+')'},{opacity:1,transform:'none'}],{duration:D+40,easing:EASE});
 });
 nav.addEventListener('click',e=>{
  const b=e.target.closest('button[data-page]');
  if(!b||passthrough)return;
  const cur=nav.querySelector('button.active[data-page]');
  if(!cur||cur===b||!ok())return;               /* same tab or reduced motion: normal instant switch */
  /* the Android app replaces the JD-Xi "Step sequencer" tab with a native screen (it animates itself) */
  if(typeof window.__jdxiShowPage==='function'&&(b.dataset.page==='sequencer'||cur.dataset.page==='sequencer'))return;
  const dir=order.indexOf(b)>order.indexOf(cur)?'fwd':'back';
  if(typeof document.startViewTransition!=='function'||busy){if(!busy)sweepFallback(dir);return}
  e.stopImmediatePropagation();e.preventDefault();
  const run=()=>{passthrough=true;try{b.click()}finally{passthrough=false}};
  busy=true;root.dataset.vtDir=dir;
  const done=()=>{busy=false;delete root.dataset.vtDir};
  try{
   const t=document.startViewTransition(run);
   t.finished.then(done,done);
   setTimeout(done,1500);                       /* safety net */
  }catch(err){done();run()}
 },true);
}

/* ---------- 2. folding sections (collapse.js calls JDMotion.fold) ---------- */
function marginAnim(head,from,to){
 if(from===to)return;
 head.animate([{marginBottom:px(from)},{marginBottom:px(to)}],{duration:D,easing:EASE});
}
function stop(el){
 const a=el._jdAnim;if(a){a.onfinish=null;a.cancel();el._jdAnim=null;el.style.overflow=''}
}
window.JDMotion={
 /* head, body: the heading and the .fold-body below it; collapse: target state; set(c): collapse.js's instant setter */
 fold(head,body,collapse,set){
  if(!ok())return false;
  stop(body);
  const mb=parseFloat(getComputedStyle(head).marginBottom)||0;
  if(collapse){
   const h=body.getBoundingClientRect().height;
   head.classList.add('folding');head.setAttribute('aria-expanded','false');
   body.style.overflow='hidden';
   const a=body.animate([{height:px(h),opacity:1},{height:'0px',opacity:0}],{duration:D,easing:EASE});
   marginAnim(head,mb,0);
   body._jdAnim=a;
   a.onfinish=()=>{body.style.overflow='';body._jdAnim=null;set(true)};
  }else{
   const startH=(body.hidden||getComputedStyle(body).display==='none')?0:body.getBoundingClientRect().height;
   set(false);
   const mb2=parseFloat(getComputedStyle(head).marginBottom)||0;
   const endH=body.getBoundingClientRect().height;
   body.style.overflow='hidden';
   const a=body.animate([{height:px(startH),opacity:startH?1:0},{height:px(endH),opacity:1}],{duration:D,easing:EASE});
   marginAnim(head,startH?mb2:0,mb2);
   body._jdAnim=a;
   a.onfinish=()=>{body.style.overflow='';body._jdAnim=null};
  }
  return true;
 }
};

/* ---------- 3. <details> drop-down panels ---------- */
function detailsTarget(d){return d._jdTarget||(d.open?'open':'closed')}
function toggleDetails(d){
 const target=detailsTarget(d)==='open'?'closed':'open';
 const start=d.getBoundingClientRect().height;
 if(d._jdAnim){d._jdAnim.onfinish=null;d._jdAnim.cancel();d._jdAnim=null}
 let end;
 if(target==='open'){d.open=true;end=d.getBoundingClientRect().height}
 else{d.open=false;end=d.getBoundingClientRect().height;d.open=true}
 d._jdTarget=target;
 const prevO=d.style.overflow,prevB=d.style.boxSizing;
 d.style.overflow='hidden';d.style.boxSizing='border-box';
 const a=d.animate([{height:px(start)},{height:px(end)}],{duration:D,easing:EASE});
 d._jdAnim=a;
 a.onfinish=()=>{
  d.style.overflow=prevO;d.style.boxSizing=prevB;d._jdAnim=null;d._jdTarget=null;
  if(target==='closed')d.open=false;
 };
}
document.addEventListener('click',e=>{
 const s=e.target.closest&&e.target.closest('summary');
 if(!s||!ok())return;
 const d=s.parentElement;
 if(!d||d.tagName!=='DETAILS')return;
 if(e.target.closest('button,a,input,select,textarea,label')&&e.target.closest('button,a,input,select,textarea,label')!==s)return;
 e.preventDefault();
 toggleDetails(d);
},true);

/* ---------- 4. "Hide top": title bar and mixer glide away / back ---------- */
const tt=document.getElementById('top-toggle');
if(tt){
 let pass=false;
 const targets=()=>[document.querySelector('body>header'),document.getElementById('mixer')].filter(el=>el&&getComputedStyle(el).display!=='none');
 const frames=el=>{
  const c=getComputedStyle(el);
  const full={height:px(el.getBoundingClientRect().height),paddingTop:c.paddingTop,paddingBottom:c.paddingBottom,marginTop:c.marginTop,marginBottom:c.marginBottom,borderTopWidth:c.borderTopWidth,borderBottomWidth:c.borderBottomWidth,opacity:1};
  const zero={height:'0px',paddingTop:'0px',paddingBottom:'0px',marginTop:'0px',marginBottom:'0px',borderTopWidth:'0px',borderBottomWidth:'0px',opacity:0};
  return[full,zero];
 };
 const glide=(el,kf,done)=>{
  const o=el.style.overflow,bs=el.style.boxSizing;
  el.style.overflow='hidden';el.style.boxSizing='border-box';
  const a=el.animate(kf,{duration:D,easing:EASE});
  a.onfinish=()=>{el.style.overflow=o;el.style.boxSizing=bs;if(done)done()};
 };
 tt.addEventListener('click',e=>{
  if(pass||!ok())return;
  const hiding=!document.body.classList.contains('top-hidden');
  if(hiding){
   const els=targets();if(!els.length)return;
   e.stopImmediatePropagation();e.preventDefault();
   let left=els.length;
   els.forEach(el=>glide(el,frames(el),()=>{if(--left===0){pass=true;try{tt.click()}finally{pass=false}}}));
  }else{
   requestAnimationFrame(()=>targets().forEach(el=>{const[full,zero]=frames(el);glide(el,[zero,full])}));
  }
 },true);
}
})();
