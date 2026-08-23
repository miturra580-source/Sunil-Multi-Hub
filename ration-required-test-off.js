(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|आधार सीडिंग|समर्पण|नवीनीकरण|संशोधन|ration/i;
  function isRation(){
    return RATION_RE.test((document.getElementById('applicationServiceName')?.textContent||'')+' '+(document.getElementById('applicationVariantName')?.textContent||''));
  }
  function relax(){
    if(!isRation()) return;
    const form=document.getElementById('dynamicApplicationForm');
    if(!form) return;
    form.querySelectorAll('[required]').forEach(el=>{
      if(!el.dataset.smhRequiredWas) el.dataset.smhRequiredWas='1';
      el.required=false;
      el.removeAttribute('required');
    });
    form.querySelectorAll('[data-required="true"]').forEach(el=>{
      if(!el.dataset.smhDataRequiredWas) el.dataset.smhDataRequiredWas='1';
      el.dataset.required='false';
    });
  }
  let timer=null;
  function schedule(){ clearTimeout(timer); timer=setTimeout(relax,60); }
  function start(){
    schedule();
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',schedule,true);
    setTimeout(relax,300);
    setTimeout(relax,900);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();