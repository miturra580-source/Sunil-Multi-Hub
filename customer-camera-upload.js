(function(){
  const input=document.getElementById('files');
  const drop=input&&input.closest('label.drop');
  if(!input||!drop||drop.dataset.cameraReady)return;
  drop.dataset.cameraReady='1';
  const row=document.createElement('div');
  row.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;justify-content:center';
  const btn=document.createElement('button');btn.type='button';btn.textContent='📷 Camera से फोटो लें';btn.style.cssText='border:1px solid #0b4fd8;background:#0b4fd8;color:#fff;border-radius:10px;padding:10px 14px;font-weight:800';
  const cam=document.createElement('input');cam.type='file';cam.accept='image/*';cam.capture='environment';cam.style.display='none';
  btn.onclick=e=>{e.preventDefault();e.stopPropagation();cam.click()};
  cam.onchange=()=>{const f=cam.files&&cam.files[0];if(!f)return;const dt=new DataTransfer();dt.items.add(f);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));cam.value=''};
  row.append(btn,cam);drop.appendChild(row);
})();
