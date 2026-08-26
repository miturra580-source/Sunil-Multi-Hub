(function(){
  const mainFile=document.getElementById('files');
  const oldBox=document.getElementById('imageEditor');
  const serviceOptions=document.querySelector('.service-options');
  const idRadio=document.querySelector('input[name="service"][value="id_card"]');
  const idLabel=idRadio&&idRadio.closest('label');
  const genericDrop=document.querySelector('label.drop');
  const genericStep=genericDrop&&genericDrop.previousElementSibling;
  if(!mainFile||!serviceOptions||!idRadio)return;

  if(idLabel)idLabel.style.display='none';
  if(oldBox)oldBox.classList.add('hidden');

  const style=document.createElement('style');
  style.textContent=`
  .smart-id-select{border:2px solid #0b4fd8!important;background:#f3f6ff!important;color:#172033;width:100%;min-height:78px;border-radius:14px;padding:13px;text-align:left;cursor:pointer;font:inherit;display:flex;flex-direction:column;gap:3px}.smart-id-select b{font-size:16px}.smart-id-select small{color:#667085}.smart-id-select.inactive{border:1px solid #dfe5ee!important;background:#fff!important}
  .smart-id-panel{margin-top:18px;padding:18px;border:1px solid #cbd8f4;border-radius:18px;background:linear-gradient(180deg,#f8faff,#fff)}.smart-id-panel.hidden{display:none!important}.sid-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.sid-head h3{margin:3px 0 4px;font-size:22px}.sid-head p{margin:0;color:#667085;font-size:12px;line-height:1.5}.sid-private{font-size:10px;font-weight:800;color:#08785a;background:#e8faf4;padding:7px 9px;border-radius:99px;white-space:nowrap}.sid-upload{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px}.sid-drop{border:1.5px dashed #b8c7dc;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:4px;cursor:pointer;background:#fff}.sid-drop input{position:absolute;opacity:0;pointer-events:none}.sid-drop small{color:#667085;font-size:10px}.sid-tabs{display:flex;gap:8px;margin:16px 0 10px}.sid-tabs button{flex:1;border:1px solid #d7dfec;background:#fff;border-radius:10px;padding:10px;font-weight:800}.sid-tabs button.active{background:#0b4fd8;color:#fff;border-color:#0b4fd8}.sid-stage{position:relative;background:#172033;border-radius:14px;overflow:hidden;touch-action:none}.sid-stage canvas{display:block;width:100%;aspect-ratio:856/540}.sid-empty{position:absolute;inset:0;display:grid;place-items:center;color:#d0d7e3;font-weight:800}.sid-range{display:grid;grid-template-columns:90px 1fr 48px;align-items:center;gap:8px;margin-top:12px;font-size:11px;font-weight:800}.sid-group{margin-top:15px}.sid-group>strong{display:block;margin-bottom:8px}.sid-buttons{display:flex;flex-wrap:wrap;gap:7px}.sid-buttons button{border:1px solid #d7dfec;background:#fff;border-radius:10px;padding:9px 11px;font-weight:800;cursor:pointer}.sid-buttons button.active{background:#0b4fd8;color:#fff;border-color:#0b4fd8}.sid-preview{margin-top:18px;padding:12px;border:1px solid #e2e8f0;border-radius:14px;background:#fff}.sid-preview h4{margin:0 0 9px}.sid-preview canvas{width:100%;height:auto;display:block;border:1px solid #e2e8f0;border-radius:9px;background:#fff}.sid-note{font-size:10px;color:#667085;margin:8px 0 0}.sid-other{font-size:11px;color:#667085;margin:14px 0 6px;font-weight:800}
  @media(max-width:600px){.sid-upload{grid-template-columns:1fr}.sid-head{display:block}.sid-private{display:inline-block;margin-top:8px}.sid-range{grid-template-columns:78px 1fr 42px}.sid-buttons button{flex:1 1 auto}.smart-id-select{min-height:0}}
  `;
  document.head.appendChild(style);

  const selector=document.createElement('button');
  selector.type='button';
  selector.className='smart-id-select';
  selector.innerHTML='<span>🪪</span><b>Smart ID Card Print</b><small>Front + Back • Crop • Enhance • Same-page layout</small>';
  serviceOptions.prepend(selector);

  const panel=document.createElement('section');
  panel.className='smart-id-panel';
  panel.innerHTML=`
    <div class="sid-head"><div><span class="editor-kicker">SMART ID CARD PRINT</span><h3>🪪 Smart ID Card Print</h3><p>Front चुनते ही Back auto-copy होगा। दोनों sides को अलग-अलग crop/adjust करें।</p></div><span class="sid-private">🔒 Browser Processing</span></div>
    <div class="sid-upload">
      <label class="sid-drop"><b>Front Side</b><span id="sidFrontName">फोटो चुनें</span><small>Front चुनते ही Back भी auto-fill होगा</small><input id="sidFront" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <label class="sid-drop"><b>Back Side</b><span id="sidBackName">Front upload पर auto-copy</span><small>Back अलग हो तो यहाँ replace करें</small><input id="sidBack" type="file" accept="image/jpeg,image/png,image/webp"></label>
    </div>
    <div class="sid-tabs"><button type="button" data-side="front" class="active">Front</button><button type="button" data-side="back">Back</button></div>
    <div class="sid-stage" id="sidStage"><canvas id="sidCanvas" width="856" height="540"></canvas><div class="sid-empty" id="sidEmpty">ऊपर से Front image चुनें</div></div>
    <label class="sid-range"><span>Crop Scale</span><input id="sidZoom" type="range" min="1" max="4" value="1" step="0.01"><output id="sidZoomOut">100%</output></label>
    <div class="sid-group"><strong>Auto-Crop Preset</strong><div class="sid-buttons" id="sidPresets"><button type="button" class="active" data-w="85.6" data-h="53.98">CR80 / PVC</button><button type="button" data-w="85.6" data-h="54">Aadhaar</button><button type="button" data-w="85.6" data-h="53.98">PAN / Voter</button><button type="button" id="sidCenter">Center Crop</button></div></div>
    <div class="sid-group"><strong>Document Scan Filters</strong><div class="sid-buttons" id="sidFilters"><button type="button" class="active" data-filter="none">Original</button><button type="button" data-filter="scan">Scan Document</button><button type="button" data-filter="mono" data-both="1">B&amp;W Both</button><button type="button" data-filter="color" data-both="1">Colour Both</button><button type="button" id="sidAuto">✨ Auto Enhance</button><button type="button" id="sidInvert">◐ Invert</button></div></div>
    <div class="sid-group"><strong>Image Settings</strong><label class="sid-range"><span>Brightness</span><input id="sidBrightness" type="range" min="50" max="160" value="100"><output id="sidBrightnessOut">100%</output></label><label class="sid-range"><span>Contrast</span><input id="sidContrast" type="range" min="50" max="180" value="100"><output id="sidContrastOut">100%</output></label><label class="sid-range"><span>Saturation</span><input id="sidSaturation" type="range" min="0" max="180" value="100"><output id="sidSaturationOut">100%</output></label></div>
    <div class="sid-group"><strong>Transform</strong><div class="sid-buttons"><button type="button" id="sidLeft">↺ Rotate L</button><button type="button" id="sidRight">↻ Rotate R</button><button type="button" id="sidFlipH">↔ Flip Horiz</button><button type="button" id="sidFlipV">↕ Flip Vert</button><button type="button" id="sidReset">Reset</button><button type="button" id="sidFull">⛶ Big Screen</button></div></div>
    <div class="sid-preview"><h4>A4 Preview — Front left / Back right</h4><canvas id="sidSheet" width="794" height="1123"></canvas><p class="sid-note">यह preview Auto Print के लिए processed Front + Back बनाता है। नीचे Print Colour और Copies चुनकर payment continue करें।</p></div>
  `;
  serviceOptions.after(panel);

  const frontInput=panel.querySelector('#sidFront'),backInput=panel.querySelector('#sidBack'),canvas=panel.querySelector('#sidCanvas'),ctx=canvas.getContext('2d'),sheet=panel.querySelector('#sidSheet'),sctx=sheet.getContext('2d');
  let state={front:null,back:null,active:'front',drag:false,lastX:0,lastY:0,w:85.6,h:53.98};
  const filters={none:'',scan:'grayscale(.22) contrast(1.28) brightness(1.06)',mono:'grayscale(1) contrast(1.65) brightness(1.1)',color:'contrast(1.15) saturate(1.18) brightness(1.03)'};
  const $s=id=>panel.querySelector('#'+id);
  function readImage(file){return new Promise((resolve,reject)=>{if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type))return reject(new Error('JPG, PNG या WEBP image चुनें'));const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=r.result};r.onerror=reject;r.readAsDataURL(file)})}
  function fresh(file,img){const base=Math.max(856/img.width,540/img.height);return{file,img,base,scale:base,x:(856-img.width*base)/2,y:(540-img.height*base)/2,rotation:0,filter:'none',brightness:100,contrast:100,saturation:100,invert:false,flipH:false,flipV:false}}
  function cloneSide(s){const n=fresh(s.file,s.img);return n}
  function cssFilter(s){return `${filters[s.filter]||''} brightness(${s.brightness/100}) contrast(${s.contrast/100}) saturate(${s.saturation/100})${s.invert?' invert(1)':''}`.trim()||'none'}
  function drawState(c,s,w=c.canvas.width,h=c.canvas.height){c.save();c.clearRect(0,0,w,h);c.fillStyle='#fff';c.fillRect(0,0,w,h);if(s){const sx=w/856,sy=h/540,rw=s.img.width*s.scale,rh=s.img.height*s.scale;c.filter=cssFilter(s);c.translate((s.x+rw/2)*sx,(s.y+rh/2)*sy);c.rotate(s.rotation*Math.PI/180);c.scale(s.flipH?-1:1,s.flipV?-1:1);c.drawImage(s.img,-rw*sx/2,-rh*sy/2,rw*sx,rh*sy);c.filter='none'}c.restore()}
  function active(){return state[state.active]}
  function sync(){const s=active();const z=s?s.scale/s.base:1;$s('sidZoom').value=z;$s('sidZoomOut').value=Math.round(z*100)+'%';['Brightness','Contrast','Saturation'].forEach(k=>{const key=k.toLowerCase(),v=s?s[key]:100;$s('sid'+k).value=v;$s('sid'+k+'Out').value=v+'%'});panel.querySelectorAll('.sid-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.side===state.active));panel.querySelectorAll('#sidFilters [data-filter]').forEach(b=>b.classList.toggle('active',!!s&&b.dataset.filter===s.filter))}
  function draw(){drawState(ctx,active());$s('sidEmpty').style.display=active()?'none':'grid';drawSheet()}
  function drawSheet(){sctx.fillStyle='#fff';sctx.fillRect(0,0,sheet.width,sheet.height);const px=sheet.width/210,margin=10,gap=8,y=10,total=state.w*2+gap,x=(210-total)/2;[['front',x],['back',x+state.w+gap]].forEach(([side,mmx])=>{const s=state[side];if(!s)return;const c=document.createElement('canvas');c.width=856;c.height=540;drawState(c.getContext('2d'),s);sctx.drawImage(c,mmx*px,y*px,state.w*px,state.h*px);sctx.strokeStyle='#cbd5e1';sctx.strokeRect(mmx*px,y*px,state.w*px,state.h*px)})}
  function setMainFiles(){const dt=new DataTransfer();if(state.front)dt.items.add(state.front.file);if(state.back)dt.items.add(state.back.file);mainFile.files=dt.files;const ft=document.getElementById('fileText');if(ft)ft.textContent=state.front?(state.front.file.name+(state.back?' • '+state.back.file.name:'')):'Files चुनें'}
  async function choose(side,file){try{const img=await readImage(file);if(side==='front'){state.front=fresh(file,img);state.back=cloneSide(state.front);$s('sidFrontName').textContent=file.name;$s('sidBackName').textContent=file.name+' • Auto copy';state.active='front'}else{state.back=fresh(file,img);$s('sidBackName').textContent=file.name;state.active='back'}setMainFiles();sync();draw()}catch(e){console.warn(e)}}
  frontInput.onchange=e=>choose('front',e.target.files[0]);backInput.onchange=e=>choose('back',e.target.files[0]);
  panel.querySelectorAll('.sid-tabs button').forEach(b=>b.onclick=()=>{state.active=b.dataset.side;sync();draw()});
  $s('sidZoom').oninput=e=>{const s=active();if(!s)return;const old=s.scale;s.scale=s.base*+e.target.value;const ratio=s.scale/old;s.x=428-(428-s.x)*ratio;s.y=270-(270-s.y)*ratio;sync();draw()};
  ['Brightness','Contrast','Saturation'].forEach(k=>$s('sid'+k).oninput=e=>{const s=active();if(!s)return;s[k.toLowerCase()]=+e.target.value;sync();draw()});
  panel.querySelectorAll('#sidPresets [data-w]').forEach(b=>b.onclick=()=>{state.w=+b.dataset.w;state.h=+b.dataset.h;panel.querySelectorAll('#sidPresets [data-w]').forEach(x=>x.classList.toggle('active',x===b));drawSheet()});
  panel.querySelectorAll('#sidFilters [data-filter]').forEach(b=>b.onclick=()=>{const targets=b.dataset.both?[state.front,state.back]:[active()];targets.filter(Boolean).forEach(s=>s.filter=b.dataset.filter);if(b.dataset.filter==='mono'){const c=document.getElementById('color');if(c){c.value='bw';c.dispatchEvent(new Event('input',{bubbles:true}))}}if(b.dataset.filter==='color'){const c=document.getElementById('color');if(c){c.value='color';c.dispatchEvent(new Event('input',{bubbles:true}))}}sync();draw()});
  $s('sidAuto').onclick=()=>{[state.front,state.back].filter(Boolean).forEach(s=>{s.filter='scan';s.brightness=104;s.contrast=112;s.saturation=104;s.invert=false});sync();draw()};
  $s('sidInvert').onclick=()=>{const s=active();if(s){s.invert=!s.invert;draw()}};
  function rotate(d){const s=active();if(s){s.rotation=(s.rotation+d+360)%360;draw()}}$s('sidLeft').onclick=()=>rotate(-90);$s('sidRight').onclick=()=>rotate(90);
  $s('sidFlipH').onclick=()=>{const s=active();if(s){s.flipH=!s.flipH;draw()}};$s('sidFlipV').onclick=()=>{const s=active();if(s){s.flipV=!s.flipV;draw()}};
  $s('sidCenter').onclick=()=>{const s=active();if(!s)return;const n=fresh(s.file,s.img);Object.assign(s,{base:n.base,scale:n.scale,x:n.x,y:n.y});sync();draw()};
  $s('sidReset').onclick=()=>{const s=active();if(!s)return;state[state.active]=fresh(s.file,s.img);sync();draw()};
  $s('sidFull').onclick=async()=>{try{if(!document.fullscreenElement)await $s('sidStage').requestFullscreen();else await document.exitFullscreen()}catch(e){}};
  function point(e){const r=canvas.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)*856/r.width,y:(t.clientY-r.top)*540/r.height}}
  function start(e){if(!active())return;const p=point(e);state.drag=true;state.lastX=p.x;state.lastY=p.y;e.preventDefault()}function move(e){if(!state.drag)return;const p=point(e),s=active();s.x+=p.x-state.lastX;s.y+=p.y-state.lastY;state.lastX=p.x;state.lastY=p.y;draw();e.preventDefault()}function end(){state.drag=false}
  canvas.addEventListener('mousedown',start);canvas.addEventListener('mousemove',move);window.addEventListener('mouseup',end);canvas.addEventListener('touchstart',start,{passive:false});canvas.addEventListener('touchmove',move,{passive:false});window.addEventListener('touchend',end);

  function toggle(service){const idMode=service==='id_card';panel.classList.toggle('hidden',!idMode);selector.classList.toggle('inactive',!idMode);if(genericDrop)genericDrop.style.display=idMode?'none':'';if(genericStep)genericStep.style.display=idMode?'none':'';if(oldBox)oldBox.classList.add('hidden');if(idMode&&state.front)setMainFiles()}
  selector.onclick=()=>{idRadio.checked=true;idRadio.dispatchEvent(new Event('change',{bubbles:true}));toggle('id_card')};
  document.querySelectorAll('input[name="service"]').forEach(r=>r.addEventListener('change',()=>toggle(r.checked?r.value:(document.querySelector('input[name="service"]:checked')||{}).value)));

  async function load(files,service){if(service==='id_card')return;toggle(service);if(oldBox)oldBox.classList.add('hidden')}
  async function filesForUpload(originals,service){if(service!=='id_card')return originals;if(!state.front)return originals;const output=[];for(const [name,s] of [['front',state.front],['back',state.back]]){if(!s)continue;const out=document.createElement('canvas');out.width=1012;out.height=638;drawState(out.getContext('2d'),s,1012,638);const blob=await new Promise(resolve=>out.toBlob(resolve,'image/jpeg',.96));output.push(new File([blob],name+'-smart-id-print.jpg',{type:'image/jpeg'}))}return output}
  function setService(service){toggle(service)}
  window.customerPrintEditor={load,filesForUpload,setService};
  toggle('id_card');sync();draw();
})();
