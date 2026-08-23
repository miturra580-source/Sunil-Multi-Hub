(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|आधार सीडिंग|समर्पण|नवीनीकरण|संशोधन|ration/i;
  const style=document.createElement('style');
  style.textContent=`
  #applicationBox.smh-ration-form{width:min(1120px,100%)!important;padding:0!important;background:#f6faf3!important;border-radius:24px 24px 0 0!important}
  #applicationBox.smh-ration-form>div:first-child{padding:20px 24px;background:linear-gradient(110deg,#8d2019,#c84e28 52%,#eea24d);color:#fff}
  #applicationBox.smh-ration-form #applicationServiceName{color:#fff;font-size:25px}
  #applicationBox.smh-ration-form #applicationVariantName,#applicationBox.smh-ration-form #applicationServicePrice{color:#fff!important;opacity:.95}
  #applicationBox.smh-ration-form #dynamicApplicationForm{padding:0 22px 24px}
  .smh-ration-banner{padding:16px 22px;background:linear-gradient(90deg,#fff7e6,#f2f8e8);border-bottom:1px solid #dce6d4}
  .smh-ration-banner strong{display:block;color:#8d2019;font-size:19px}.smh-ration-banner small{display:block;margin-top:4px;color:#52604b}
  .smh-ration-steps{display:flex;gap:5px;overflow:auto;padding:12px 22px;background:#fff;border-bottom:1px solid #dfe7da}
  .smh-ration-step{flex:0 0 auto;padding:8px 11px;border-radius:6px;background:#86b54c;color:#fff;font-size:12px;font-weight:800}
  #applicationBox.smh-ration-form #beneficiaryFields{margin-top:18px!important;padding:0 14px 14px;background:#fff;border:1px solid #dce5d7;border-radius:9px}
  #applicationBox.smh-ration-form #beneficiaryFields>h3{margin:0 -14px 12px;padding:10px 13px;background:#8dbd50;color:#fff;border-radius:8px 8px 0 0;font-size:15px}
  #applicationBox.smh-ration-form .smh-ration-section-title{margin:14px -14px 8px!important;padding:9px 13px!important;border-radius:0!important;background:#8dbd50!important;color:#fff!important;font-size:14px!important}
  #applicationBox.smh-ration-form [data-field-wrap]{display:inline-block;vertical-align:top;width:calc(33.333% - 14px);margin:7px 6px!important}
  #applicationBox.smh-ration-form [data-field-wrap] input,#applicationBox.smh-ration-form [data-field-wrap] select,#applicationBox.smh-ration-form [data-field-wrap] textarea{border-radius:5px!important;padding:10px!important;border:1px solid #cfd9ca!important;background:#fff!important}
  #applicationBox.smh-ration-form #supportingDocumentsSection,#applicationBox.smh-ration-form #eligibilitySection{background:#fff;border:1px solid #dce5d7;border-radius:9px;padding:14px}
  #applicationBox.smh-ration-form #submitDynamicApplication{background:#79a943!important;border-color:#79a943!important}
  @media(max-width:760px){#applicationBox.smh-ration-form [data-field-wrap]{width:calc(50% - 14px)}}
  @media(max-width:520px){#applicationBox.smh-ration-form #dynamicApplicationForm{padding:0 12px 18px}#applicationBox.smh-ration-form [data-field-wrap]{width:100%;margin:7px 0!important}.smh-ration-steps{padding:10px 12px}}
  `;
  document.head.appendChild(style);

  function addVariantGroup(){
    const box=document.getElementById('variantCards');if(!box)return;
    const ration=[...box.querySelectorAll('.variant-select-btn')].filter(b=>RATION_RE.test(b.textContent||''));
    if(!ration.length||box.querySelector('.smh-ration-heading'))return;
    const h=document.createElement('div');h.className='smh-ration-heading';h.style.cssText='grid-column:1/-1;margin:12px 0 2px;padding-top:12px;border-top:1px solid #e5e7eb;font-weight:900;color:#1f4dbd;font-size:18px';h.textContent='🌾 राशन कार्ड सेवाएँ';box.insertBefore(h,ration[0]);
  }
  function isRationForm(){
    const service=document.getElementById('applicationServiceName')?.textContent||'';
    const variant=document.getElementById('applicationVariantName')?.textContent||'';
    return RATION_RE.test(service+' '+variant);
  }
  function sectionTitle(text){const el=document.createElement('div');el.className='smh-ration-section-title';el.textContent=text;return el;}
  function addFormSections(){
    if(!isRationForm())return;
    const box=document.getElementById('applicationBox'),root=document.getElementById('beneficiaryFields');if(!box||!root)return;
    box.classList.add('smh-ration-form');
    if(!box.querySelector('.smh-ration-banner')){
      const form=document.getElementById('dynamicApplicationForm');
      const banner=document.createElement('div');banner.className='smh-ration-banner';banner.innerHTML='<strong>🌾 राशन कार्ड आवेदन</strong><small>खाद्य एवं रसद सेवा • कृपया सभी विवरण सही-सही भरें</small>';
      form.before(banner);
      const steps=document.createElement('div');steps.className='smh-ration-steps';steps.innerHTML=['Basic Details','Address Details','Family Details','Bank Details','Attachment','NFSA Criteria'].map((x,i)=>`<span class="smh-ration-step">Step ${i+1}: ${x}</span>`).join('');form.before(steps);
    }
    if(root.dataset.rationSections!=='1'){
      root.dataset.rationSections='1';
      const groups=[
        ['Step 1: Basic Details',['area_type','applicant_name','head_name','relation_type','relation_name','gender','dob','mobile','aadhaar_number','ration_card_number','member_name','current_name','new_name']],
        ['Step 2: Address Details',['full_address','current_address','district','tehsil','block','village','pincode']],
        ['Step 3: Family Details',['family_members','annual_income','occupation']],
        ['Step 4: Bank Details',['bank_account','account_number','ifsc','bank_name','branch_name']],
        ['Application Details',['correction_type','corrected_details','surrender_reason','declaration']]
      ];
      groups.forEach(([name,keys])=>{const first=keys.map(k=>root.querySelector(`[data-field-wrap="${k}"]`)).find(Boolean);if(first)first.before(sectionTitle(name));});
    }
    const docs=document.getElementById('supportingDocumentsSection');if(docs&&!docs.previousElementSibling?.classList.contains('smh-doc-title')){const t=sectionTitle('Step 5: Attachment');t.classList.add('smh-doc-title');docs.before(t)}
    const elig=document.getElementById('eligibilitySection');if(elig&&elig.style.display!=='none'&&!elig.previousElementSibling?.classList.contains('smh-nfsa-title')){const t=sectionTitle('Step 6: NFSA Criteria');t.classList.add('smh-nfsa-title');elig.before(t)}
    const submit=document.getElementById('submitDynamicApplication');if(submit)submit.textContent='सुरक्षित करें एवं आवेदन जमा करें';
  }
  function cleanNonRation(){if(isRationForm())return;document.getElementById('applicationBox')?.classList.remove('smh-ration-form')}
  function enhance(){addVariantGroup();addFormSections();cleanNonRation();document.querySelectorAll('.smh-ration-workflow-note').forEach(el=>el.remove())}
  const start=()=>{enhance();new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true,characterData:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();