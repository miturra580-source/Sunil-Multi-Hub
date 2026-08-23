(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|आधार सीडिंग|समर्पण|नवीनीकरण|संशोधन|ration/i;
  function isRation(){
    return RATION_RE.test((document.getElementById('applicationServiceName')?.textContent||'')+' '+(document.getElementById('applicationVariantName')?.textContent||''));
  }
  function relax(){
    if(!isRation()) return;
    const form=document.getElementById('dynamicApplicationForm');
    if(!form) return;

    // TEST MODE ONLY: disable browser validation for ration-card flow.
    form.noValidate=true;
    form.setAttribute('novalidate','novalidate');

    form.querySelectorAll('input,select,textarea').forEach(el=>{
      if(el.required || el.hasAttribute('required')) el.dataset.smhRequiredWas='1';
      el.required=false;
      el.removeAttribute('required');

      if(el.hasAttribute('pattern')){
        if(!el.dataset.smhPatternWas) el.dataset.smhPatternWas=el.getAttribute('pattern')||'';
        el.removeAttribute('pattern');
      }
      if(el.hasAttribute('minlength')){
        if(!el.dataset.smhMinlengthWas) el.dataset.smhMinlengthWas=el.getAttribute('minlength')||'';
        el.removeAttribute('minlength');
      }
      if(el.hasAttribute('maxlength')){
        if(!el.dataset.smhMaxlengthWas) el.dataset.smhMaxlengthWas=el.getAttribute('maxlength')||'';
        el.removeAttribute('maxlength');
      }
      if(el.dataset.required==='true'){
        el.dataset.smhDataRequiredWas='1';
        el.dataset.required='false';
      }
      // Clear any custom validity message left by other ration scripts.
      if(typeof el.setCustomValidity==='function') el.setCustomValidity('');
    });

    // Make it visually clear this is temporary test mode by removing required stars only inside ration form.
    form.querySelectorAll('label, strong, .smh-pane-body').forEach(el=>{
      if(el.childNodes.length===1 && el.firstChild?.nodeType===3) {
        el.textContent=el.textContent.replace(/\s*\*\s*$/,'');
      }
    });
  }
  let timer=null;
  function schedule(){ clearTimeout(timer); timer=setTimeout(relax,40); }
  function start(){
    schedule();
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['required','pattern','minlength','maxlength']});
    document.addEventListener('click',schedule,true);
    document.addEventListener('input',schedule,true);
    setInterval(relax,1000);
    setTimeout(relax,250);
    setTimeout(relax,800);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();