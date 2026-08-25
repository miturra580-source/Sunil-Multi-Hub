const {jsPDF}=window.jspdf;
const state={front:null,back:null,active:'front',drag:false,lastX:0,lastY:0};
const $=id=>document.getElementById(id);
const crop=$('cropCanvas'),ctx=crop.getContext('2d'),sheet=$('sheetCanvas'),sctx=sheet.getContext('2d');
let timer;
function toast(m){$('toast').textContent=m;$('toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('show'),2500)}
function readImage(file){return new Promise((resolve,reject)=>{if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type))return reject(new Error('JPG, PNG या WEBP image चुनें'));if(file.size>15*1024*1024)return reject(new Error('Image 15 MB से छोटी रखें'));const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=r.result};r.onerror=reject;r.readAsDataURL(file)})}
function fresh(img){const cover=Math.max(crop.width/img.width,crop.height/img.height);return{img,scale:cover,base:cover,x:(crop.width-img.width*cover)/2,y:(crop.height-img.height*cover)/2,rotation:0}}
async function load(side,file){try{const img=await readImage(file);state[side]=fresh(img);$(side+'Name').textContent=file.name;state.active=side;setTab();$('zoom').value=1;drawCrop();drawSheet()}catch(e){toast(e.message||'Image नहीं खुली')}}
$('frontInput').onchange=e=>load('front',e.target.files[0]);$('backInput').onchange=e=>load('back',e.target.files[0]);
document.querySelectorAll('.side-tabs button').forEach(b=>b.onclick=()=>{state.active=b.dataset.side;setTab();syncZoom();drawCrop()});
function setTab(){document.querySelectorAll('.side-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.side===state.active))}
function syncZoom(){const s=state[state.active];$('zoom').value=s?s.scale/s.base:1}
function drawOne(c,target){c.save();c.fillStyle='#fff';c.fillRect(0,0,c.canvas.width,c.canvas.height);if(target){const w=target.img.width*target.scale,h=target.img.height*target.scale;c.translate(target.x+w/2,target.y+h/2);c.rotate(target.rotation*Math.PI/180);c.drawImage(target.img,-w/2,-h/2,w,h)}c.restore()}
function drawCrop(){const s=state[state.active];drawOne(ctx,s);$('emptyCrop').style.display=s?'none':'grid'}
$('zoom').oninput=e=>{const s=state[state.active];if(!s)return;const old=s.scale;s.scale=s.base*+e.target.value;const ratio=s.scale/old;s.x=crop.width/2-(crop.width/2-s.x)*ratio;s.y=crop.height/2-(crop.height/2-s.y)*ratio;drawCrop();drawSheet()};
function rotate(delta){const s=state[state.active];if(!s)return;s.rotation=(s.rotation+delta)%360;drawCrop();drawSheet()}
$('leftBtn').onclick=()=>rotate(-90);$('rightBtn').onclick=()=>rotate(90);
$('resetBtn').onclick=()=>{const s=state[state.active];if(!s)return;state[state.active]=fresh(s.img);syncZoom();drawCrop();drawSheet()};
function point(e){const r=crop.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)*crop.width/r.width,y:(t.clientY-r.top)*crop.height/r.height}}
function start(e){if(!state[state.active])return;const p=point(e);state.drag=true;state.lastX=p.x;state.lastY=p.y;e.preventDefault()}
function move(e){if(!state.drag)return;const p=point(e),s=state[state.active];s.x+=p.x-state.lastX;s.y+=p.y-state.lastY;state.lastX=p.x;state.lastY=p.y;drawCrop();e.preventDefault()}
function end(){if(state.drag){state.drag=false;drawSheet()}}
crop.addEventListener('mousedown',start);crop.addEventListener('mousemove',move);window.addEventListener('mouseup',end);crop.addEventListener('touchstart',start,{passive:false});crop.addEventListener('touchmove',move,{passive:false});window.addEventListener('touchend',end);
function cardCanvas(s){if(!s)return null;const c=document.createElement('canvas');c.width=856;c.height=540;drawOne(c.getContext('2d'),s);return c}
function settings(){return{w:Math.min(190,Math.max(20,+$('cardW').value||85.6)),h:Math.min(277,Math.max(20,+$('cardH').value||54)),copies:+$('copies').value||1,gap:Math.min(30,Math.max(0,+$('gap').value||6)),single:$('singleSide').checked}}
function layout(draw,pageW,pageH){const o=settings(),front=cardCanvas(state.front),back=o.single?null:cardCanvas(state.back),items=[];for(let i=0;i<o.copies;i++){if(front)items.push(front);if(back)items.push(back)}const margin=12,cols=Math.max(1,Math.floor((pageW-margin*2+o.gap)/(o.w+o.gap))),rows=Math.max(1,Math.floor((pageH-margin*2+o.gap)/(o.h+o.gap)));items.slice(0,cols*rows).forEach((c,i)=>{const col=i%cols,row=Math.floor(i/cols),x=margin+col*(o.w+o.gap),y=margin+row*(o.h+o.gap);draw(c,x,y,o.w,o.h)});return items.length}
function drawSheet(){sctx.fillStyle='#e8ebf0';sctx.fillRect(0,0,sheet.width,sheet.height);const scale=sheet.width/210;sctx.fillStyle='#fff';sctx.fillRect(0,0,sheet.width,sheet.height);layout((c,x,y,w,h)=>{sctx.drawImage(c,x*scale,y*scale,w*scale,h*scale);sctx.strokeStyle='#c7ccd4';sctx.strokeRect(x*scale,y*scale,w*scale,h*scale)},210,297)}
['cardW','cardH','copies','gap','singleSide'].forEach(id=>$(id).addEventListener('input',drawSheet));
function validate(){if(!state.front&&!state.back){toast('पहले Front या Back image चुनें');return false}return true}
$('pdfBtn').onclick=()=>{if(!validate())return;const pdf=new jsPDF({unit:'mm',format:'a4'});layout((c,x,y,w,h)=>pdf.addImage(c.toDataURL('image/jpeg',.96),'JPEG',x,y,w,h,undefined,'FAST'),210,297);pdf.save('multi-hub-24-id-card.pdf');toast('PDF तैयार है')};
$('jpgBtn').onclick=()=>{if(!validate())return;const a=document.createElement('a');a.href=sheet.toDataURL('image/jpeg',.96);a.download='multi-hub-24-id-card-a4.jpg';a.click();toast('JPG तैयार है')};
$('printBtn').onclick=()=>{if(!validate())return;const w=window.open('','_blank');if(!w)return toast('Popup allow करें');w.document.write('<!doctype html><title>ID Card Print</title><style>@page{size:A4;margin:0}body{margin:0}img{display:block;width:210mm;height:297mm}</style><img src="'+sheet.toDataURL('image/png')+'">');w.document.close();w.onload=()=>w.print()};
$('clearBtn').onclick=()=>{state.front=state.back=null;$('frontInput').value=$('backInput').value='';$('frontName').textContent=$('backName').textContent='फोटो चुनें';drawCrop();drawSheet();toast('Images clear हो गईं')};
drawCrop();drawSheet();