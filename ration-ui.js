/* SUNIL MULTI HUB - NFSA style ration card application UI */
(function(){
  const isRation=()=>{
    const s=(window.activeService?.name||'')+' '+(window.activeVariant?.name||'');
    return /राशन|ration/i.test(s);
  };
  const css=`
  #applicationBox.ration-mode{width:min(1120px,100%);padding:0;border-radius:24px 24px 0 0;background:#f7faf5}
  #applicationBox.ration-mode>div:first-child{padding:22px 24px;background:linear-gradient(135deg,#8b1d16,#d66b32 55%,#f0a14b);color:#fff}
  #applicationBox.ration-mode #applicationServiceName{color:#fff}
  #applicationBox.ration-mode #applicationVariantName,#applicationBox.ration-mode #applicationServicePrice{color:#fff!important;opacity:.95}
  .ration-hero{padding:18px 24px;background:linear-gradient(90deg,#fff8e9,#f3f9ea);border-bottom:1px solid #dfe8d8}
  .ration-hero strong{font-size:18px;color:#7b261b}.ration-hero p{margin:5px 0 0;color:#52604d}
  .ration-steps{display:flex;gap:6px;overflow:auto;padding:14px 24px;background:#fff;border-bottom:1px solid #e2e8dc}
  .ration-step{white-space:nowrap;border:0;border-radius:7px;padding:9px 12px;background:#e8efe3;color:#40513b;font-weight:800;cursor:pointer}
  .ration-step.active{background:#79a943;color:#fff}
  #applicationBox.ration-mode #dynamicApplicationForm{padding:0 24px 24px}
  #applicationBox.ration-mode #beneficiaryFields{background:#fff;border:1px solid #dfe7d9;border-radius:12px;padding:18px;margin-top:18px!important}
  #applicationBox.ration-mode #beneficiaryFields h3{margin:-18px -18px 18px;padding:11px 15px;background:#8fbd4f;color:#fff;border-radius:11px 11px 0 0}
  #applicationBox.ration-mode [data-field-wrap]{display:inline-block!important;vertical-align:top;width:calc(33.333% - 14px);margin:8px 6px!important;font-weight:700!important}
  #applicationBox.ration-mode input,#applicationBox.ration-mode select,#applicationBox.ration-mode textarea{border-radius:5px!important;padding:10px!important;border:1px solid #ccd7c5!important}
  .ration-section-title{margin:18px 0 0;padding:10px 14px;background:#8fbd4f;color:#fff;border-radius:9px 9px 0 0;font-weight:900}
  #applicationBox.ration-mode #supportingDocumentsSection,#applicationBox.ration-mode #eligibilitySection{background:#fff;border:1px solid #dfe7d9;border-radius:0 0 9px 9px;padding:16px}
  @media(max-width:760px){#applicationBox.ration-mode [data-field-wrap]{width:calc(50% - 14px)}}
  @media(max-width:520px){#applicationBox.ration-mode [data-field-wrap]{width:100%;margin:8px 0!important}.ration-steps{padding:10px 14px}#applicationBox.ration-mode #dynamicApplicationForm{padding:0 14px 18px}}
  `;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  function enhance(){
    const box=document.getElementById('applicationBox');
    if(!box||!isRation())return;
    box.classList.add('ration-mode');
    const form=document.getElementById('dynamicApplicationForm');
    if(!form||form.dataset.rationEnhanced)return;
    form.dataset.rationEnhanced='1';
    const hero=document.createElement('div');hero.className='ration-hero';hero.innerHTML='<strong>🌾 राशन कार्ड आवेदन</strong><p>खाद्य एवं रसद सेवा • आवेदन की जानकारी चरणबद्ध तरीके से भरें</p>';
    form.parentNode.insertBefore(hero,form);
    const steps=document.createElement('div');steps.className='ration-steps';steps.innerHTML=['Basic Details','Address Details','Family Details','Bank Details','Attachment','NFSA Criteria'].map((x,i)=>`<button type="button" class="ration-step ${i===0?'active':''}">Step ${i+1}: ${x}</button>`).join('');
    form.parentNode.insertBefore(steps,form);
    const docs=document.getElementById('supportingDocumentsSection');if(docs){const t=document.createElement('div');t.className='ration-section-title';t.textContent='📎 Step 5: Attachment';docs.parentNode.insertBefore(t,docs)}
    const elig=document.getElementById('eligibilitySection');if(elig){const t=document.createElement('div');t.className='ration-section-title';t.textContent='✅ Step 6: NFSA Criteria';elig.parentNode.insertBefore(t,elig)}
    const submit=document.getElementById('submitDynamicApplication');if(submit){submit.textContent='सुरक्षित करें एवं आवेदन जमा करें';submit.style.background='#79a943'}
  }
  const mo=new MutationObserver(()=>setTimeout(enhance,20));mo.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(enhance,80),true);
})();
