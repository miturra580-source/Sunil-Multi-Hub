(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|आधार सीडिंग|समर्पण|नवीनीकरण|संशोधन|ration/i;
  let repairing=false;

  function isRation(){
    const s=document.getElementById('applicationServiceName')?.textContent||'';
    const v=document.getElementById('applicationVariantName')?.textContent||'';
    return RATION_RE.test(s+' '+v);
  }

  function repair(){
    if(repairing||!isRation()) return;
    const form=document.getElementById('dynamicApplicationForm');
    const root=document.getElementById('beneficiaryFields');
    if(!form||!root||form.dataset.rationV3!=='1') return;

    const basic=form.querySelector('.smh-ration-pane[data-step="0"] .smh-pane-body');
    const basicFields=basic?.querySelectorAll('[data-field-wrap]').length||0;
    const loadedFields=root.querySelectorAll('[data-field-wrap]').length;

    // The database fields can arrive after ration-card-ui has already built
    // its stepper. If that happens, the generated panes are empty while the
    // newly rendered fields sit inside the hidden beneficiaryFields container.
    // Tear down only that empty generated shell and let ration-card-ui's own
    // MutationObserver rebuild it with the real fields.
    if(basicFields===0 && loadedFields>0){
      repairing=true;
      form.querySelectorAll('.smh-ration-pane,.smh-ration-nav').forEach(el=>el.remove());
      document.querySelectorAll('.smh-ration-banner,.smh-ration-steps').forEach(el=>el.remove());
      root.style.display='';
      delete form.dataset.rationV3;
      document.getElementById('applicationBox')?.classList.remove('smh-ration-form');
      setTimeout(()=>{repairing=false;document.body.appendChild(document.createComment('smh-ration-rebuild'));},30);
    }
  }

  function start(){
    repair();
    new MutationObserver(()=>setTimeout(repair,20)).observe(document.body,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',()=>setTimeout(repair,80),true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();