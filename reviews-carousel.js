(function(scope){
  'use strict';
  function mount({document=scope.document,environment=scope}={}){
    const track=document.getElementById('googleReviewCards'),wrapper=document.getElementById('reviewsCarousel');
    const previous=document.getElementById('reviewsPrevious'),next=document.getElementById('reviewsNext'),position=document.getElementById('reviewsPosition');
    const cards=[...track.children];wrapper.hidden=cards.length===0;if(!cards.length)return;
    cards.forEach((card,index)=>{card.setAttribute('role','group');card.setAttribute('aria-roledescription','reseña');card.setAttribute('aria-label',(index+1)+' de '+cards.length);});
    const step=()=>Math.max(1,(cards[0].offsetWidth||track.clientWidth)+20);
    function update(){
      const maximum=Math.max(0,track.scrollWidth-track.clientWidth),offset=Math.max(0,Math.min(track.scrollLeft,maximum));
      previous.disabled=offset<=1;next.disabled=offset>=maximum-1;
      const first=Math.min(cards.length,Math.floor((offset+1)/step())+1),last=Math.min(cards.length,Math.max(first,Math.ceil((offset+track.clientWidth)/step())));
      position.textContent=(first===last?'Reseña '+first:'Reseñas '+first+'–'+last)+' de '+cards.length;
    }
    function move(direction){track.scrollBy({left:direction*step(),behavior:environment.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
    previous.onclick=()=>move(-1);next.onclick=()=>move(1);
    track.onkeydown=event=>{if(event.target!==track)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}};
    track.addEventListener('scroll',update,{passive:true});
    if(environment.ResizeObserver)new environment.ResizeObserver(update).observe(track);else environment.addEventListener?.('resize',update);
    update();return {update};
  }
  scope.DEV3D_REVIEWS={mount};if(typeof module!=='undefined')module.exports={mount};
})(typeof window==='undefined'?globalThis:window);
