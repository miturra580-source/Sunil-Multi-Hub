
const { jsPDF } = window.jspdf;
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg){
  toast.textContent=msg;toast.classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);
}
function downloadBlob(blob,name){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function fileToDataURL(file){ return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)}); }
function loadImage(data){ return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=data}); }

// nav
document.querySelectorAll('.tool-nav button').forEach(btn=>{
  btn.onclick=()=>{document.getElementById(btn.dataset.target).scrollIntoView({behavior:'smooth'});}
});
const sections=[...document.querySelectorAll('.tool-panel')];
const obs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){
    document.querySelectorAll('.tool-nav button').forEach(b=>b.classList.toggle('active',b.dataset.target===e.target.id));
  }});
},{rootMargin:'-25% 0px -60% 0px'});
sections.forEach(s=>obs.observe(s));
if(location.hash) setTimeout(()=>document.querySelector(location.hash)?.scrollIntoView(),200);

// JPG to PDF
const jpgPdfInput=document.getElementById('jpgPdfInput');
jpgPdfInput.onchange=()=>document.getElementById('jpgPdfList').textContent=[...jpgPdfInput.files].map(f=>f.name).join(' • ');
document.getElementById('jpgPdfBtn').onclick=async()=>{
  const files=[...jpgPdfInput.files]; if(!files.length) return showToast('पहले image चुनें');
  const pdf=new jsPDF({unit:'mm',format:'a4'});
  for(let idx=0;idx<files.length;idx++){
    const data=await fileToDataURL(files[idx]); const img=await loadImage(data);
    if(idx>0) pdf.addPage();
    const pageW=210,pageH=297,margin=10,maxW=pageW-20,maxH=pageH-20;
    const ratio=Math.min(maxW/img.width,maxH/img.height);
    const w=img.width*ratio,h=img.height*ratio;
    pdf.addImage(data,'JPEG',(pageW-w)/2,(pageH-h)/2,w,h,undefined,'FAST');
  }
  pdf.save('multi-hub-24-images.pdf'); showToast('PDF तैयार है');
};

// Merge PDF
const mergePdfInput=document.getElementById('mergePdfInput');
mergePdfInput.onchange=()=>document.getElementById('mergePdfList').textContent=[...mergePdfInput.files].map(f=>f.name).join(' • ');
document.getElementById('mergePdfBtn').onclick=async()=>{
  const files=[...mergePdfInput.files]; if(files.length<2) return showToast('कम से कम 2 PDF चुनें');
  const out=await PDFLib.PDFDocument.create();
  for(const file of files){
    const src=await PDFLib.PDFDocument.load(await file.arrayBuffer());
    const pages=await out.copyPages(src,src.getPageIndices()); pages.forEach(p=>out.addPage(p));
  }
  downloadBlob(new Blob([await out.save()],{type:'application/pdf'}),'multi-hub-24-merged.pdf');
  showToast('PDF merge हो गया');
};

// Resize
let resizeImg=null;
document.getElementById('resizeInput').onchange=async(e)=>{
  if(!e.target.files[0]) return;
  resizeImg=await loadImage(await fileToDataURL(e.target.files[0]));
  drawResize();
};
function drawResize(){
  if(!resizeImg) return;
  const w=+document.getElementById('resizeW').value||600,h=+document.getElementById('resizeH').value||800;
  const c=document.getElementById('resizeCanvas'); c.width=w;c.height=h;
  c.getContext('2d').drawImage(resizeImg,0,0,w,h);
}
['resizeW','resizeH'].forEach(id=>document.getElementById(id).oninput=drawResize);
document.getElementById('resizeBtn').onclick=()=>{
  if(!resizeImg) return showToast('पहले image चुनें'); drawResize();
  const c=document.getElementById('resizeCanvas'),fmt=document.getElementById('resizeFormat').value,q=+document.getElementById('resizeQuality').value||.9;
  c.toBlob(b=>downloadBlob(b,fmt==='image/png'?'resized.png':'resized.jpg'),fmt,q); showToast('Image resize हो गई');
};

// Passport photo
let passImg=null;
const passCanvas=document.getElementById('passportPreview');
document.getElementById('passportInput').onchange=async(e)=>{ if(e.target.files[0]){passImg=await loadImage(await fileToDataURL(e.target.files[0])); drawPassport();}};
document.getElementById('passportBg').onchange=drawPassport;
function drawPassport(){
  const c=passCanvas,ctx=c.getContext('2d'); ctx.fillStyle=document.getElementById('passportBg').value;ctx.fillRect(0,0,c.width,c.height);
  if(!passImg) return;
  const target=c.width/c.height,src=passImg.width/passImg.height;
  let sx=0,sy=0,sw=passImg.width,sh=passImg.height;
  if(src>target){sw=passImg.height*target;sx=(passImg.width-sw)/2}else{sh=passImg.width/target;sy=(passImg.height-sh)/2}
  ctx.drawImage(passImg,sx,sy,sw,sh,0,0,c.width,c.height);
}
document.getElementById('passportBtn').onclick=()=>{
  if(!passImg) return showToast('पहले photo चुनें'); drawPassport();
  const pdf=new jsPDF({unit:'mm',format:'a4'}),copies=Math.min(24,Math.max(1,+document.getElementById('passportCopies').value||12));
  const photo=passCanvas.toDataURL('image/jpeg',.95),w=35,h=45,gap=5,cols=4;
  for(let i=0;i<copies;i++){
    const col=i%cols,row=Math.floor(i/cols),x=20+col*(w+gap),y=18+row*(h+gap);
    if(y+h>285){pdf.addPage(); y=18;}
    pdf.addImage(photo,'JPEG',x,y,w,h);
  }
  pdf.save('passport-photo-sheet.pdf'); showToast('Passport sheet तैयार है');
};

// ID Card
let idFrontData=null,idBackData=null;
async function setId(which,file){
  if(!file) return; const data=await fileToDataURL(file);
  if(which==='front') idFrontData=data; else idBackData=data; renderIdPreview();
}
document.getElementById('idFront').onchange=e=>setId('front',e.target.files[0]);
document.getElementById('idBack').onchange=e=>setId('back',e.target.files[0]);
function renderIdPreview(){
  const p=document.getElementById('idPreview');p.innerHTML='';
  [idFrontData,idBackData].forEach(d=>{if(d){const i=new Image();i.src=d;p.appendChild(i)}});
}
document.getElementById('idBtn').onclick=()=>{
  if(!idFrontData && !idBackData) return showToast('Front या back image चुनें');
  const pdf=new jsPDF({unit:'mm',format:'a4'}),w=+document.getElementById('idW').value||85.6,h=+document.getElementById('idH').value||54;
  const x=15,y=20;
  if(idFrontData) pdf.addImage(idFrontData,'JPEG',x,y,w,h);
  if(idBackData) pdf.addImage(idBackData,'JPEG',x,y+h+12,w,h);
  pdf.save('id-card-print.pdf'); showToast('ID print PDF तैयार है');
};
