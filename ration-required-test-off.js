(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|आधार सीडिंग|समर्पण|नवीनीकरण|संशोधन|ration/i;
  function isRation(){
    return RATION_RE.test((document.getElementById('applicationServiceName')?.textContent||'')+' '+(document.getElementById('applicationVariantName')?.textContent||''));
  }
  function relax(){
    if(!isRation()) return;
    const form=document.getElementById('dynamicApplicationForm');
    if(!form) return;
    form.noValidate=true;
    form.setAttribute('novalidate','novalidate');
    form.querySelectorAll('input,select,textarea').forEach(el=>{
      el.required=false;
      el.removeAttribute('required');
      el.removeAttribute('pattern');
      el.removeAttribute('minlength');
      el.removeAttribute('maxlength');
      el.removeAttribute('min');
      el.removeAttribute('max');
      if(el.dataset) el.dataset.required='false';
      if(typeof el.setCustomValidity==='function') el.setCustomValidity('');
    });
  }
  function start(){
    relax();
    new MutationObserver(relax).observe(document.body,{childList:true,subtree:true});
    ['click','input','change'].forEach(ev=>document.addEventListener(ev,relax,true));
    setInterval(relax,300);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();