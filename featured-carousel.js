/* Native horizontal scrolling: keyboard, touch, buttons and reduced motion. */
(() => {
  'use strict';
  const track=document.getElementById('featuredProducts');
  const wrapper=document.getElementById('featuredCarousel');
  if(!track||!wrapper)return;
  const previous=document.getElementById('featuredPrevious'),next=document.getElementById('featuredNext');
  const controls=document.getElementById('featuredControls'),position=document.getElementById('featuredPosition');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const autoplay=document.getElementById('featuredAutoplay');
  let paused=false,visible=false,hovered=false,direction=1,pauseUntil=0;
  function syncAutoplay(){
    if(!autoplay)return;
    autoplay.hidden=reduced.matches;
    autoplay.setAttribute('aria-pressed',String(paused));
    autoplay.setAttribute('aria-label',paused?'Reanudar carrusel autom\u00e1tico':'Pausar carrusel autom\u00e1tico');
    autoplay.innerHTML=paused?'<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="m6 3 11 7-11 7z"/></svg>':'<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6 4h3v12H6zm5 0h3v12h-3z"/></svg>';
    position.setAttribute('aria-live',paused||reduced.matches?'polite':'off');
  }
  let frame=0,last=0,offset=0,wake;
  const canMove=()=>!paused&&visible&&!hovered&&!document.hidden&&!reduced.matches&&!wrapper.contains(document.activeElement)&&Date.now()>=pauseUntil&&track.scrollWidth>track.clientWidth+1;
  function tick(now){
    frame=0;if(!canMove())return;
    const elapsed=last?Math.min(now-last,50):0;last=now;
    const max=track.scrollWidth-track.clientWidth;
    offset+=direction*elapsed*.016; // 16 CSS pixels per second, independent of refresh rate.
    if(offset>=max){offset=max;direction=-1;}
    if(offset<=0){offset=0;direction=1;}
    track.scrollLeft=offset;
    frame=requestAnimationFrame(tick);
  }
  function syncMotion(){
    cancelAnimationFrame(frame);frame=0;last=0;offset=track.scrollLeft;
    if(canMove())frame=requestAnimationFrame(tick);
  }
  function interact(){
    pauseUntil=Date.now()+10000;clearTimeout(wake);syncMotion();
    wake=setTimeout(syncMotion,10020);
  }
  autoplay?.addEventListener('click',()=>{paused=!paused;pauseUntil=0;syncAutoplay();syncMotion();});
  wrapper.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')hovered=true;syncMotion();});
  wrapper.addEventListener('pointerleave',()=>{hovered=false;syncMotion();});
  wrapper.addEventListener('pointerdown',interact,{passive:true});
  wrapper.addEventListener('keydown',interact);
  wrapper.addEventListener('focusin',syncMotion);
  wrapper.addEventListener('focusout',()=>queueMicrotask(syncMotion));
  document.addEventListener('visibilitychange',syncMotion);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;syncMotion();},{threshold:.25}).observe(wrapper);
  reduced.addEventListener('change',()=>{syncAutoplay();syncMotion();});
  syncAutoplay();
  function update(){
    const cards=[...track.children],max=Math.max(0,track.scrollWidth-track.clientWidth);
    wrapper.hidden=!cards.length;controls.hidden=max<=1;
    previous.disabled=track.scrollLeft<=1;next.disabled=track.scrollLeft>=max-1;
    if(!cards.length){position.textContent='';return;}
    const box=track.getBoundingClientRect();
    const visible=cards.map((card,index)=>({index,box:card.getBoundingClientRect()})).filter(item=>item.box.right>box.left+8&&item.box.left<box.right-8);
    const first=(visible[0]?.index??0)+1,last=(visible.at(-1)?.index??0)+1;
    position.textContent=(first===last?'Pieza '+first:'Piezas '+first+'–'+last)+' de '+cards.length;
  }
  function move(direction,keyboard=false){
    const card=track.firstElementChild;if(!card)return;
    const step=card.getBoundingClientRect().width+parseFloat(getComputedStyle(track).columnGap||0);
    track.scrollBy({left:direction*step,behavior:keyboard||reduced.matches?'auto':'smooth'});
  }
  previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
  track.addEventListener('keydown',event=>{
    if(event.target!==track)return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowRight'?1:-1,true);}
    if(event.key==='Home'||event.key==='End'){event.preventDefault();track.scrollTo({left:event.key==='Home'?0:track.scrollWidth,behavior:'auto'});}
  });
  track.addEventListener('scroll',update,{passive:true});
  new ResizeObserver(()=>{update();syncMotion();}).observe(track);
  new MutationObserver(()=>{track.scrollLeft=0;update();syncMotion();}).observe(track,{childList:true});
  update();
})();
