(function(){
  const box=document.getElementById('imageEditor'),canvas=document.getElementById('editorCanvas'),ctx=canvas.getContext('2d'),sides=document.getElementById('editorSides');
  let items=[],active=0,drag=false,last={x:0,y:0},currentService='id_card';
  const filters={none:'none',scan:'grayscale(.2) contrast(1.35) brightness(1.08)',mono:'grayscale(1) contrast(1.7) brightness(1.12)',color:'contrast(1.18) saturate(1.25) brightness(1.04)'};
  function isImage(f){return /^image\//.test(f.type)}
  function point(e){const r=canvas.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)*canvas.width/r.width,y:(t.clientY-r.top)*canvas.height/r.height}}
  function loadImage(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=reject;img.src=url})}
  async function load(files,service){currentService=service;items=[];for(const file of files.filter(isImage).slice(0,2)){const img=await loadImage(file),base=Math.max(canvas.width/img.width,canvas.height/img.height);items.push({file,img,base,zoom:1,x:0,y:0,rotation:0,filter:'none'})}active=0;box.classList.toggle('hidden',!items.length||service==='pdf');renderSides();center();draw()}
  function renderSides(){sides.innerHTML=items.map((x,i)=>'<button type="button" data-i="'+i+'" class="'+(i===active?'active':'')+'">'+(i===0?'Front / File 1':'Back / File 2')+'</button>').join('');sides.querySelectorAll('button').forEach(b=>b.onclick=()=>{active=+b.dataset.i;renderSides();sync();draw()})}
  function center(){const s=items[active];if(!s)return;s.x=0;s.y=0;s.zoom=1;document.getElementById('editorZoom').value=1}
  function sync(){const s=items[active];if(!s)return;document.getElementById('scanFilter').value=s.filter;document.getElementById('editorZoom').value=s.zoom}
  function drawTo(c,s){c.save();c.fillStyle='#fff';c.fillRect(0,0,c.canvas.width,c.canvas.height);if(s){c.filter=filters[s.filter]||'none';c.translate(c.canvas.width/2+s.x,c.canvas.height/2+s.y);c.rotate(s.rotation*Math.PI/180);const scale=s.base*s.zoom;c.drawImage(s.img,-s.img.width*scale/2,-s.img.height*scale/2,s.img.width*scale,s.img.height*scale)}c.restore()}
  function draw(){drawTo(ctx,items[active]);document.getElementById('editorEmpty').classList.toggle('hidden',!!items[active])}
  function moveStart(e){if(!items[active])return;drag=true;last=point(e);e.preventDefault()}
  function move(e){if(!drag)return;const p=point(e),s=items[active];s.x+=p.x-last.x;s.y+=p.y-last.y;last=p;draw();e.preventDefault()}
  canvas.addEventListener('mousedown',moveStart);canvas.addEventListener('mousemove',move);window.addEventListener('mouseup',()=>drag=false);canvas.addEventListener('touchstart',moveStart,{passive:false});canvas.addEventListener('touchmove',move,{passive:false});window.addEventListener('touchend',()=>drag=false);
  document.getElementById('editorZoom').oninput=e=>{if(items[active]){items[active].zoom=+e.target.value;draw()}};
  document.getElementById('scanFilter').onchange=e=>{if(items[active]){items[active].filter=e.target.value;draw()}};
  document.getElementById('rotateLeft').onclick=()=>{if(items[active]){items[active].rotation-=90;draw()}};
  document.getElementById('rotateRight').onclick=()=>{if(items[active]){items[active].rotation+=90;draw()}};
  document.getElementById('centerImage').onclick=()=>{center();draw()};
  document.getElementById('cardPreset').onchange=()=>{center();draw()};
  async function filesForUpload(originals,service){if(service==='pdf'||!items.length)return originals;const output=[];for(let i=0;i<originals.length;i++){if(!isImage(originals[i])||!items[i]){output.push(originals[i]);continue}const out=document.createElement('canvas');out.width=856;out.height=540;drawTo(out.getContext('2d'),items[i]);const blob=await new Promise(resolve=>out.toBlob(resolve,'image/jpeg',.94));output.push(new File([blob],(i===0?'front':'back')+'-print-ready.jpg',{type:'image/jpeg'}))}return output}
  function setService(service){currentService=service;box.classList.toggle('hidden',!items.length||service==='pdf')}
  window.customerPrintEditor={load,filesForUpload,setService};
})();
