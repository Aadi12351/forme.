(()=>{
 const root=document.documentElement,overlay=document.getElementById('siteIntro');
 if(!overlay||!root.classList.contains('intro-active')){overlay?.remove();return}
 const fabric=document.getElementById('introFabric'),cloth=document.getElementById('introCloth'),hem=document.getElementById('introHem'),skip=document.getElementById('skipIntro');
 // A lit, deformable cloth mesh. The right corner leads; the rest follows under gravity.
 let realCloth=null;
 try{realCloth=createClothRenderer()}catch(error){console.info('Using lightweight fabric reveal',error)}
 function createClothRenderer(){
  const canvas=document.createElement('canvas');canvas.className='intro-cloth-canvas';canvas.hidden=true;canvas.setAttribute('aria-hidden','true');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false});if(!gl)return null;
  const vertex=`attribute vec2 aUV;uniform vec2 uSize;uniform float uProgress;varying mediump vec3 vNormal;varying mediump vec2 vUV;varying mediump float vFold;
  vec3 surface(vec2 uv){float p=uProgress;float u=uv.x;float v=uv.y;
   float lead=.23*(1.-u)+.07*v;float t=clamp((p-lead)/max(.01,1.-lead),0.,1.);
   float drop=t*t*(2.4-1.4*t);float lift=sin(t*3.141593);
   float folds=(sin(u*24.+v*3.-t*4.)*.42+sin(u*47.-v*5.+t*2.)*.16+sin(u*10.+v*8.)*.3);
   float z=(folds*(.025+lift*.075)+sin(v*11.+u*8.-t*5.)*lift*.025)*uSize.y;
   float x=(u*1.08-.04)*uSize.x+drop*uSize.x*.24+sin(v*5.+t*3.)*lift*uSize.x*.025;
   float y=(v*1.1-.05)*uSize.y+drop*uSize.y*1.65+lift*uSize.y*(.15*sin(u*4.+v*2.)+.07*sin(u*15.-v*4.));
   return vec3(x+z*.15,y-z*.08,z);
  }
  void main(){vec3 position=surface(aUV);vec3 dx=surface(aUV+vec2(.002,0.))-surface(aUV-vec2(.002,0.));vec3 dy=surface(aUV+vec2(0.,.002))-surface(aUV-vec2(0.,.002));vNormal=normalize(cross(dx,dy));vUV=aUV;vFold=position.z/uSize.y;gl_Position=vec4(position.x/uSize.x*2.-1.,1.-position.y/uSize.y*2.,0.,1.);}`;
  const fragment=`precision mediump float;varying mediump vec3 vNormal;varying mediump vec2 vUV;varying mediump float vFold;
  void main(){vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-.5,-.7,1.));float diffuse=max(dot(n,light),0.);float rim=pow(1.-abs(n.z),2.);vec3 halfLight=normalize(light+vec3(0.,0.,1.));float sheen=pow(max(dot(n,halfLight),0.),24.);float weave=(sin(vUV.x*1600.)*sin(vUV.y*1100.))*.0025;float tone=.025+diffuse*.082+sheen*.055+rim*.035+vFold*.12+weave;gl_FragColor=vec4(vec3(tone*.96,tone,tone*.93),1.);}`;
  function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){gl.deleteShader(sh);throw Error('Cloth shader unavailable')}return sh}
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Cloth renderer unavailable');gl.useProgram(program);
  const compact=innerWidth<=700,cols=compact?40:80,rows=compact?28:50,vertices=[],indices=[];for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)vertices.push(x/cols,y/rows);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const i=y*(cols+1)+x;indices.push(i,i+1,i+cols+1,i+1,i+cols+2,i+cols+1)}
  const vb=gl.createBuffer(),ib=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);const attr=gl.getAttribLocation(program,'aUV');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);const size=gl.getUniformLocation(program,'uSize'),progress=gl.getUniformLocation(program,'uProgress');overlay.insertBefore(canvas,overlay.firstChild);
  let lost=false;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;canvas.hidden=true;fabric.style.visibility='visible'});
  return{canvas,draw(p){if(lost){draw(p);return}const scale=Math.min(devicePixelRatio||1,innerWidth<=700?1:1.5);const w=Math.round(innerWidth*scale),h=Math.round(innerHeight*scale);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(size,innerWidth,innerHeight);gl.uniform1f(progress,p);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0)},dispose(){gl.deleteBuffer(vb);gl.deleteBuffer(ib);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext()}};
 }

 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),start=performance.now();
 const page=[...document.body.children].filter(el=>el!==overlay&&!['SCRIPT','STYLE'].includes(el.tagName));
 const prior=page.map(el=>[el,el.inert]);page.forEach(el=>{if(!el.inert)el.setAttribute('data-intro-inert','');el.inert=true});
 let finished=false,frame=0,releasing=false,releaseStart=0;
 function end(){if(finished)return;finished=true;cancelAnimationFrame(frame);realCloth?.dispose();clearTimeout(window.formeIntroSafety);clearTimeout(deadline);removeEventListener('resize',resize);removeEventListener('keydown',key);reduced.removeEventListener('change',motionChange);root.classList.remove('intro-active');overlay.remove();prior.forEach(([el,inert])=>{el.inert=inert;el.removeAttribute('data-intro-inert')})}
 function key(e){if(e.key==='Escape'){e.preventDefault();end()}if(e.key==='Tab'){e.preventDefault();skip.focus({preventScroll:true})}}
 function motionChange(){if(reduced.matches)end()}
 function draw(progress){const w=innerWidth,h=innerHeight;fabric.setAttribute('viewBox',`0 0 ${w} ${h}`);const eased=progress*progress*(3-2*progress),base=-h*.27+(h*1.65)*eased;const amp=Math.sin(Math.PI*progress)*Math.min(h*.19,180);const phase=progress*5;
  const points=[];for(let i=0;i<=16;i++){const x=w*i/16;const y=base+Math.sin(i/16*Math.PI*2.2-phase)*amp+Math.sin(i/16*Math.PI*4.3+phase*.6)*amp*.23;points.push([x,y])}
  let edge=`M${points[0][0]},${points[0][1]}`;for(let i=1;i<points.length;i++){const prev=points[i-1],point=points[i];edge+=` C${prev[0]+w/48},${prev[1]} ${point[0]-w/48},${point[1]} ${point[0]},${point[1]}`}
  cloth.setAttribute('d',edge+` L${w},${h+500} L0,${h+500} Z`);hem.setAttribute('d',edge);hem.style.opacity=String(.45*Math.sin(Math.PI*progress))
 }
 function resize(){if(!releasing)draw(0)}
 function wave(now){if(finished)return;const t=Math.min(1,(now-releaseStart)/1650);if(realCloth)realCloth.draw(t);else draw(t);if(t>=1)end();else frame=requestAnimationFrame(wave)}
 function release(){if(finished||releasing)return;releasing=true;overlay.classList.add('is-releasing');if(realCloth){realCloth.draw(0);realCloth.canvas.hidden=false;fabric.style.visibility='hidden'}releaseStart=performance.now();frame=requestAnimationFrame(wave)}
 skip.onclick=end;addEventListener('keydown',key);addEventListener('resize',resize,{passive:true});reduced.addEventListener('change',motionChange);draw(0);skip.focus({preventScroll:true});
 const deadline=setTimeout(end,6000);
 const hero=new Image();const heroReady=new Promise(resolve=>{hero.onload=resolve;hero.onerror=resolve;hero.src='/assets/forme-studio-hero.png';if(hero.complete)resolve()});
 const fonts=document.fonts?document.fonts.ready:Promise.resolve();
 // Readiness never blocks the visitor indefinitely; the minimum is the short wordmark sequence.
 const minimum=new Promise(resolve=>setTimeout(resolve,Math.max(0,2350-(performance.now()-start))));
 const ready=Promise.race([Promise.allSettled([heroReady,fonts]),new Promise(resolve=>setTimeout(resolve,3300))]);
 Promise.all([minimum,ready]).then(release).catch(end);
 addEventListener('pagehide',end,{once:true});
})();
