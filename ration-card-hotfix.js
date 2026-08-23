(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|आधार सीडिंग|समर्पण|नवीनीकरण|संशोधन|ration/i;
  let repairing=false;

  function isRation(){
    const s=document.getElementById('applicationServiceName')?.textContent||'';
    const v=document.getElementById('applicationVariantName')?.textContent||'';
    return RATION_RE.test(s+' '+v);
  }

  function repairEmptyStepper(){
    if(repairing||!isRation()) return;
    const form=document.getElementById('dynamicApplicationForm');
    const root=document.getElementById('beneficiaryFields');
    if(!form||!root||form.dataset.rationV3!=='1') return;

    const basic=form.querySelector('.smh-ration-pane[data-step="0"] .smh-pane-body');
    const basicFields=basic?.querySelectorAll('[data-field-wrap]').length||0;
    const loadedFields=root.querySelectorAll('[data-field-wrap]').length;

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

  function restoreAttachmentStep(){
    if(!isRation()) return;
    const pane=document.querySelector('.smh-ration-pane[data-step="4"] .smh-pane-body');
    const docs=document.getElementById('supportingDocumentsSection');
    if(!pane||!docs) return;

    if(docs.parentElement!==pane) pane.appendChild(docs);
    docs.style.setProperty('display','block','important');
    docs.style.setProperty('visibility','visible','important');
    docs.style.setProperty('opacity','1','important');

    const wraps=[...docs.querySelectorAll('[data-document-wrap]')];
    wraps.forEach(w=>{
      w.style.setProperty('display','grid','important');
      w.style.setProperty('visibility','visible','important');
      w.querySelectorAll('input[type="file"]').forEach(input=>{
        input.style.setProperty('display','block','important');
        input.required=true;
        input.accept='image/jpeg,image/png,.jpg,.jpeg,.png';
      });
    });

    if(!pane.querySelector('.smh-attach-note')){
      const note=document.createElement('div');
      note.className='smh-attach-note';
      note.textContent='मुखिया की फोटो, मुखिया का Aadhaar Card और Bank Passbook अनिवार्य हैं • JPG/PNG • अधिकतम 100 KB प्रति फाइल';
      pane.prepend(note);
    }
  }

  function restoreFinalButtons(){
    if(!isRation()) return;
    const pane=document.querySelector('.smh-ration-pane[data-step="5"] .smh-pane-body');
    const form=document.getElementById('dynamicApplicationForm');
    const submit=document.getElementById('submitDynamicApplication');
    if(!pane||!form||!submit) return;

    let actions=pane.querySelector('.smh-final-actions');
    if(!actions){
      actions=document.createElement('div');
      actions.className='smh-final-actions';
      actions.style.cssText='display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:14px 0 4px;padding-top:10px;border-top:1px solid #e4eadf';
      pane.appendChild(actions);
    }

    if(submit.parentElement!==actions) actions.appendChild(submit);
    submit.textContent='सुरक्षित करें एवं आवेदन जमा करें';
    submit.style.setProperty('display','inline-flex','important');
    submit.style.setProperty('width','auto','important');
    submit.style.setProperty('min-width','190px','important');
    submit.style.setProperty('align-items','center','important');
    submit.style.setProperty('justify-content','center','important');

    let reset=actions.querySelector('#smhRationResetBtn');
    if(!reset){
      reset=document.createElement('button');
      reset.type='button';
      reset.id='smhRationResetBtn';
      reset.textContent='Reset करें';
      reset.style.cssText='min-width:110px;padding:10px 16px;border:1px solid #cfd8c8;border-radius:6px;background:#f5f7f3;color:#344054;font-weight:800;cursor:pointer';
      reset.addEventListener('click',()=>{
        if(!confirm('क्या आप इस राशन कार्ड फॉर्म की भरी हुई जानकारी Reset करना चाहते हैं?')) return;
        form.reset();
        form.querySelectorAll('input[type="file"]').forEach(x=>x.value='');
        form.querySelectorAll('[data-nfsa]').forEach(x=>x.value='');
        try{
          Object.keys(localStorage).filter(k=>/ration|nfsa/i.test(k)).forEach(k=>localStorage.removeItem(k));
        }catch(e){}
        document.querySelector('.smh-ration-step[data-step="0"]')?.click();
      });
      actions.appendChild(reset);
    }
  }

  function repair(){
    repairEmptyStepper();
    restoreAttachmentStep();
    restoreFinalButtons();
  }

  function start(){
    repair();
    new MutationObserver(()=>setTimeout(repair,30)).observe(document.body,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',()=>setTimeout(repair,80),true);
    document.addEventListener('change',()=>setTimeout(repair,40),true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();