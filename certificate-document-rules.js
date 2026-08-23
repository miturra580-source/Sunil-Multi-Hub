(() => {
  const SERVICE_RE=/आय.*जाति.*निवास|जाति.*निवास.*आय|निवास.*आय.*जाति/;

  function isCertificateForm(){
    const service=document.getElementById('applicationServiceName');
    return !!service && SERVICE_RE.test(service.textContent||'');
  }

  function ageFromDob(value){
    if(!value) return null;
    const dob=new Date(value+'T00:00:00');
    if(Number.isNaN(dob.getTime())) return null;
    const today=new Date();
    let age=today.getFullYear()-dob.getFullYear();
    const m=today.getMonth()-dob.getMonth();
    if(m<0 || (m===0 && today.getDate()<dob.getDate())) age--;
    return age;
  }

  function findDocWrapByText(text){
    return [...document.querySelectorAll('#supportingDocumentsSection [data-document-wrap]')]
      .find(w=>(w.textContent||'').includes(text)) || null;
  }

  function ensureWarning(){
    const section=document.getElementById('supportingDocumentsSection');
    if(!section || section.querySelector('.smh-upload-quality-warning')) return;
    const warning=document.createElement('div');
    warning.className='smh-upload-quality-warning';
    warning.style.cssText='margin:12px 0 14px;padding:12px 14px;border:1px solid #f0b429;border-radius:12px;background:#fff8e6;color:#7a5612;font-size:12px;font-weight:800;line-height:1.5';
    warning.textContent='⚠️ केवल Original Document की clear scan/photo या साफ photocopy ही upload करें। धुंधली, कटी हुई या unreadable copy स्वीकार न करें।';
    const heading=section.querySelector('h3');
    if(heading) heading.insertAdjacentElement('afterend',warning); else section.prepend(warning);
  }

  function applyMinorRule(){
    if(!isCertificateForm()) return;
    const dob=document.querySelector('#beneficiaryFields [name="dob"]');
    const wrap=findDocWrapByText('पिता का आधार कार्ड');
    if(!wrap) return;
    const input=wrap.querySelector('input[type="file"]');
    const strong=wrap.querySelector('strong');
    const age=ageFromDob(dob?.value||'');
    const minor=age!==null && age<18;

    wrap.style.display=minor ? 'block' : 'none';
    if(input){
      input.dataset.required=minor?'true':'false';
      input.required=minor;
      if(!minor) input.value='';
    }
    if(strong){
      strong.innerHTML='पिता का आधार कार्ड '+(minor?'<span style="color:#d92d20">*</span>':'');
    }
  }

  function enhance(){
    if(!isCertificateForm()) return;
    ensureWarning();
    applyMinorRule();

    const dob=document.querySelector('#beneficiaryFields [name="dob"]');
    if(dob && dob.dataset.smhMinorBound!=='1'){
      dob.dataset.smhMinorBound='1';
      dob.addEventListener('change',()=>setTimeout(applyMinorRule,0));
      dob.addEventListener('input',()=>setTimeout(applyMinorRule,0));
    }
  }

  const start=()=>{
    enhance();
    new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('change',()=>setTimeout(enhance,0),true);
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();