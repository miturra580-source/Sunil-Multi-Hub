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

  function addWorkflowNote(){
    if(!isRationForm()) return;
    const form=document.getElementById('dynamicApplicationForm');
    if(!form||form.querySelector('.smh-ration-workflow-note')) return;
    const note=document.createElement('div');
    note.className='smh-ration-workflow-note';
    note.style.cssText='margin:12px 0 4px;padding:11px 13px;border:1px solid #cfe0ff;border-radius:12px;background:#f7faff;color:#475467;font-size:12px;line-height:1.5';
    note.innerHTML='<strong style="color:#1f4dbd">Admin-assisted NFSA workflow</strong><br>Form submit होने के बाद Admin official UP NFSA portal पर आवेदन करेगा और प्राप्त Application/Reference Number यहाँ update करेगा।';
    const fields=document.getElementById('beneficiaryFields');
    fields?.before(note);
  }

  function enhance(){addVariantGroup();addFormSections();addWorkflowNote();}
  const start=()=>{enhance();new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();