(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|आधार सीडिंग|समर्पण|नवीनीकरण/;

  function addVariantGroup(){
    const box=document.getElementById('variantCards');
    if(!box) return;
    const buttons=[...box.querySelectorAll('.variant-select-btn')];
    const ration=buttons.filter(b=>RATION_RE.test(b.textContent||''));
    if(!ration.length) return;
    if(!box.querySelector('.smh-ration-heading')){
      const h=document.createElement('div');
      h.className='smh-ration-heading';
      h.style.cssText='grid-column:1/-1;margin:12px 0 2px;padding-top:12px;border-top:1px solid #e5e7eb;font-weight:900;color:#1f4dbd;font-size:18px';
      h.textContent='🪪 राशन कार्ड सेवाएँ';
      box.insertBefore(h,ration[0]);
    }
  }

  function isRationForm(){
    const variant=document.getElementById('applicationVariantName')?.textContent||'';
    return RATION_RE.test(variant);
  }

  function sectionTitle(text){
    const el=document.createElement('div');
    el.className='smh-ration-section-title';
    el.style.cssText='margin:18px 0 10px;padding:9px 12px;border-radius:10px;background:#eef4ff;color:#1f4dbd;font-weight:900;font-size:13px';
    el.textContent=text;
    return el;
  }

  function addFormSections(){
    if(!isRationForm()) return;
    const root=document.getElementById('beneficiaryFields');
    if(!root||root.dataset.rationSections==='1') return;
    root.dataset.rationSections='1';
    const groups=[
      ['Basic Details',['area_type','applicant_name','head_name','relation_type','relation_name','gender','dob','mobile','aadhaar_number','ration_card_number','member_name','current_name','new_name']],
      ['Address Details',['full_address','current_address','district','tehsil','block','village','pincode']],
      ['Family Details',['family_members','annual_income','occupation']],
      ['Bank Details',['bank_account','ifsc','bank_name']],
      ['Application Details',['correction_type','corrected_details','surrender_reason','nfsa_criteria','declaration']]
    ];
    groups.forEach(([name,keys])=>{
      const first=keys.map(k=>root.querySelector(`[data-field-wrap="${k}"]`)).find(Boolean);
      if(first&&!first.previousElementSibling?.classList?.contains('smh-ration-section-title')) first.before(sectionTitle(name));
    });
  }

  function removeWorkflowNote(){
    document.querySelectorAll('.smh-ration-workflow-note').forEach(el=>el.remove());
  }

  function enhance(){addVariantGroup();addFormSections();removeWorkflowNote();}
  const start=()=>{enhance();new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();