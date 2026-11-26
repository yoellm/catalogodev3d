/* Explanatory printer scene; cached geometry, a moving print head and a growing part. */
(() => {
  'use strict';
  const canvas=document.getElementById('printCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const hero=canvas.closest('.home-hero'),toggle=document.getElementById('heroMotionToggle');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clock=document.createElement('span');clock.id='printSceneClock';canvas.after(clock);
  const bed=document.createElement('canvas'),model=document.createElement('canvas');
  let width=0,height=0,dpr=1,scale=1,base=0,cx=0,frame=0,last=0;
  const poly=(c,points,fill,stroke)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
  const project=(x,y,z)=>[cx+(x-y)*.86*scale,base+(x+y)*.27*scale-z*scale];
  const ring=(layer)=>{
    const t=layer/80,r=65+22*Math.sin(t*Math.PI*1.8)-12*Math.sin(t*Math.PI);
    return Array.from({length:72},(_,i)=>{const a=i/72*Math.PI*2,f=1+.05*Math.sin(a*10+t*4);return project(Math.cos(a)*r*f,Math.sin(a)*r*f,layer*2.7);});
  };
  function resize(){
    width=canvas.clientWidth;height=canvas.clientHeight;if(!width||!height)return;
    dpr=Math.min(devicePixelRatio||1,1.5);cx=width/2;base=height*.86;
    scale=Math.min(width/500,height/500);
    for(const c of [canvas,bed,model]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);c.getContext('2d').setTransform(dpr,0,0,dpr,0,0);}
    const b=bed.getContext('2d');
    const plate=width<760?145:Math.min(width/(2.2*scale),330);
    const corners=[project(-plate,-100,0),project(plate,-100,0),project(plate,100,0),project(-plate,100,0)];
    b.save();b.shadowColor='rgba(32,65,110,.12)';b.shadowBlur=28;b.shadowOffsetY=12;
    poly(b,corners,'#edf3fc','#c9d8eb');b.restore();
    const edge=corners.slice(2).map(p=>[p[0],p[1]+7*scale]);
    poly(b,[corners[2],corners[3],edge[1],edge[0]],'#c6d5e9');
    b.lineWidth=1;b.strokeStyle='#d1def0';
    for(let i=-plate;i<=plate;i+=25){b.beginPath();b.moveTo(...project(i,-100,0));b.lineTo(...project(i,100,0));b.stroke();}
    for(let i=-100;i<=100;i+=25){b.beginPath();b.moveTo(...project(-plate,i,0));b.lineTo(...project(plate,i,0));b.stroke();}
    const m=model.getContext('2d');
    for(let l=0;l<80;l++){
      const lo=ring(l),hi=ring(l+1);
      const order=Array.from({length:72},(_,i)=>i).sort((a,b)=>lo[a][1]-lo[b][1]);
      for(const i of order){const j=(i+1)%72,a=i/72*Math.PI*2;poly(m,[lo[i],lo[j],hi[j],hi[i]],`hsl(220 86% ${43+15*Math.cos(a-3.8)+3*Math.sin(a*10+l/20)}%)`);}
      m.lineWidth=.65;poly(m,hi,null,'rgba(8,40,104,.20)');
    }
    render();
  }
  function render(){
    if(!width)return;
    const animation=clock.getAnimations()[0];
    const time=reduced.matches?13500:(animation?.currentTime??1800)%18000;
    const progress=reduced.matches?1:Math.min(1,.12+time/14000*.88);
    const layer=progress*80,top=ring(layer),center=project(0,0,layer*2.7);
    const fade=time>16500?Math.max(0,(18000-time)/1500):1;
    ctx.clearRect(0,0,width,height);ctx.drawImage(bed,0,0,width,height);
    ctx.save();ctx.globalAlpha=fade;
    // Crop against the currently deposited layer, retaining the curved top surface.
    ctx.save();ctx.beginPath();top.filter(p=>p[1]<=center[1]).sort((a,b)=>a[0]-b[0]).forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.closePath();ctx.clip();ctx.drawImage(model,0,0,width,height);ctx.restore();
    poly(ctx,top,'#548fff');
    poly(ctx,top.map(p=>[center[0]+(p[0]-center[0])*.83,center[1]+(p[1]-center[1])*.83]),'#1748a0');
    const angle=time/2800*Math.PI*2,t=layer/80;
    const radius=(65+22*Math.sin(t*Math.PI*1.8)-12*Math.sin(t*Math.PI))*(1+.05*Math.sin(angle*10+t*4));
    const tip=project(Math.cos(angle)*radius,Math.sin(angle)*radius,layer*2.7);
    const headY=tip[1]-46*scale;
    // The floating print head keeps attention on deposition, without surrounding rails.
    ctx.fillStyle='#244365';ctx.fillRect(tip[0]-18*scale,headY-34*scale,36*scale,43*scale);
    ctx.fillStyle='#3d78dd';ctx.fillRect(tip[0]-13*scale,headY-29*scale,26*scale,5*scale);
    ctx.strokeStyle='#8ca8cb';ctx.lineWidth=2*scale;
    for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(tip[0]-12*scale,headY+(-15+i*5)*scale);ctx.lineTo(tip[0]+12*scale,headY+(-15+i*5)*scale);ctx.stroke();}
    poly(ctx,[[tip[0]-10*scale,headY+9*scale],[tip[0]+10*scale,headY+9*scale],[tip[0]+3*scale,tip[1]-3*scale],[tip[0]-3*scale,tip[1]-3*scale]],'#b58945');
    ctx.strokeStyle='rgba(22,93,255,.50)';ctx.lineWidth=1.5*scale;ctx.beginPath();ctx.moveTo(tip[0],headY-34*scale);ctx.bezierCurveTo(tip[0]-35*scale,headY-80*scale,width*.65,65,width*.66,0);ctx.stroke();
    ctx.restore();
  }
  const stopped=()=>reduced.matches||document.hidden||hero.classList.contains('motion-paused')||hero.classList.contains('motion-offscreen');
  function tick(now){frame=0;if(stopped())return;if(now-last>=1000/24){render();last=now;}frame=requestAnimationFrame(tick);}
  function sync(){cancelAnimationFrame(frame);frame=0;render();if(!stopped())frame=requestAnimationFrame(tick);}
  toggle?.addEventListener('click',()=>{const paused=hero.classList.toggle('motion-paused');toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Reanudar animaci\u00f3n de fondo':'Pausar animaci\u00f3n de fondo');sync();});
  const preference=()=>{if(toggle)toggle.hidden=reduced.matches;sync();};
  reduced.addEventListener('change',preference);
  new IntersectionObserver(([entry])=>{hero.classList.toggle('motion-offscreen',!entry.isIntersecting);sync();}).observe(hero);
  document.addEventListener('visibilitychange',()=>{hero.classList.toggle('motion-backgrounded',document.hidden);sync();});
  new ResizeObserver(resize).observe(canvas);resize();preference();
})();
