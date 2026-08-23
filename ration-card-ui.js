(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|आधार सीडिंग|समर्पण|नवीनीकरण|संशोधन|ration/i;
  const STEP_NAMES=['Basic Details','Address Details','Family Details','Bank Details','Attachment','NFSA Criteria'];
  let currentStep=0;
  let familyMembers=[];

  const NFSA_QUESTIONS=[
    'क्या परिवार आयकर दाता है?',
    'क्या परिवार में चार पहिया वाहन है?',
    'क्या परिवार में ट्रैक्टर है?',
    'क्या परिवार में एयर कंडीशनर है?',
    'क्या परिवार के पास 5 KVA या उससे अधिक क्षमता का जनरेटर है?',
    'क्या परिवार के पास निर्धारित सीमा से अधिक सिंचित भूमि है?',
    'क्या परिवार में कोई सरकारी कर्मचारी है?',
    'क्या परिवार में कोई लाइसेंसी शस्त्र है?',
    'क्या परिवार के पास अन्य राशन कार्ड है?',
    'क्या परिवार निर्धारित वार्षिक आय सीमा में आता है?',
    'क्या परिवार का कोई सदस्य पेंशन या नियमित आय प्राप्त करता है?',
    'क्या परिवार के पास शहरी क्षेत्र में निर्धारित सीमा से अधिक संपत्ति है?',
    'क्या परिवार के पास ग्रामीण क्षेत्र में निर्धारित सीमा से अधिक भूमि/संपत्ति है?',
    'क्या परिवार NFSA पात्रता मानकों के अनुसार पात्र है?',
    'क्या दी गई सभी जानकारी सही है?'
  ];

  const style=document.createElement('style');
  style.textContent=`
  #applicationBox.smh-ration-form{width:min(1120px,100%)!important;padding:0!important;background:#f6faf3!important;border-radius:24px 24px 0 0!important}
  #applicationBox.smh-ration-form>div:first-child{padding:20px 24px;background:linear-gradient(110deg,#8d2019,#c84e28 52%,#eea24d);color:#fff}
  #applicationBox.smh-ration-form #applicationServiceName{color:#fff;font-size:25px}
  #applicationBox.smh-ration-form #applicationVariantName,#applicationBox.smh-ration-form #applicationServicePrice{color:#fff!important;opacity:.95}
  #applicationBox.smh-ration-form #dynamicApplicationForm{padding:0 22px 24px}
  .smh-ration-banner{padding:16px 22px;background:linear-gradient(90deg,#fff7e6,#f2f8e8);border-bottom:1px solid #dce6d4}
  .smh-ration-banner strong{display:block;color:#8d2019;font-size:19px}.smh-ration-banner small{display:block;margin-top:4px;color:#52604b}
  .smh-ration-steps{display:flex;gap:5px;overflow:auto;padding:12px 22px;background:#fff;border-bottom:1px solid #dfe7da;position:sticky;top:0;z-index:5}
  .smh-ration-step{flex:0 0 auto;padding:9px 12px;border:0;border-radius:6px;background:#dce8cf;color:#34521c;font-size:12px;font-weight:800;cursor:pointer}
  .smh-ration-step.active{background:#79a943;color:#fff;box-shadow:0 3px 9px #79a94345}.smh-ration-step.done{background:#edf6e5;color:#548226}
  .smh-ration-pane{display:none;margin-top:16px;background:#fff;border:1px solid #dce5d7;border-radius:9px;overflow:hidden}.smh-ration-pane.active{display:block}
  .smh-pane-title{margin:0;padding:11px 14px;background:#8dbd50;color:#fff;font-size:15px;font-weight:900}.smh-pane-body{padding:12px 14px}
  #applicationBox.smh-ration-form [data-field-wrap]{display:inline-block;vertical-align:top;width:calc(33.333% - 14px);margin:7px 6px!important}
  #applicationBox.smh-ration-form [data-field-wrap] input,#applicationBox.smh-ration-form [data-field-wrap] select,#applicationBox.smh-ration-form [data-field-wrap] textarea{border-radius:5px!important;padding:10px!important;border:1px solid #cfd9ca!important;background:#fff!important}
  .smh-ration-nav{display:flex;justify-content:space-between;gap:10px;margin:16px 0 2px}.smh-ration-nav button{border:0;border-radius:7px;padding:11px 18px;font-weight:900;cursor:pointer}.smh-prev{background:#eef1ec;color:#344054}.smh-next{background:#79a943;color:#fff;margin-left:auto}
  .smh-family-entry{padding:13px;background:#f8fbf5;border:1px solid #dfe9d7;border-radius:9px}.smh-family-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.smh-family-grid label{font-size:12px;font-weight:800}.smh-family-grid input,.smh-family-grid select{width:100%;box-sizing:border-box;margin-top:5px;padding:9px;border:1px solid #cfd9ca;border-radius:5px;background:#fff}.smh-add-member{margin-top:11px;background:#79a943;color:#fff;border:0;border-radius:6px;padding:10px 16px;font-weight:900;cursor:pointer}.smh-member-table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}.smh-member-table th,.smh-member-table td{padding:9px;border:1px solid #dde5d8;text-align:left}.smh-member-table th{background:#edf5e6}.smh-member-remove{border:0;background:#fff0f0;color:#b42318;border-radius:5px;padding:5px 8px;cursor:pointer}.smh-empty-family{padding:13px;color:#667085;text-align:center;border:1px dashed #d9e2d3;border-radius:8px;margin-top:12px}
  .smh-nfsa-list{display:grid;grid-template-columns:1fr 1fr;gap:8px}.smh-nfsa-row{display:grid;grid-template-columns:1fr 100px;gap:10px;align-items:center;padding:9px 10px;border:1px solid #e3eadf;border-radius:7px;background:#fbfdf9;font-size:12px}.smh-nfsa-row select{padding:8px;border:1px solid #cfd9ca;border-radius:5px;background:#fff}
  #applicationBox.smh-ration-form #supportingDocumentsSection{margin:0!important;background:#fff!important;border:0!important;border-radius:0!important;padding:0!important}
  #applicationBox.smh-ration-form #supportingDocumentsSection>h3,#applicationBox.smh-ration-form #supportingDocumentsSection>p{display:none!important}
  #applicationBox.smh-ration-form #supportingDocumentsSection [data-document-wrap]{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(220px,.8fr);gap:8px 14px;align-items:center;width:auto!important;margin:7px 0!important;padding:10px 12px!important;border:1px solid #dfe7da!important;border-radius:7px!important;background:#fbfdf9!important}
  #applicationBox.smh-ration-form #supportingDocumentsSection [data-document-wrap] input[type=file]{margin:0!important;width:100%}
  #applicationBox.smh-ration-form #supportingDocumentsSection [data-document-wrap] small{grid-column:1/-1;margin:0!important;font-size:11px!important}
  .smh-attach-note{padding:9px 11px;margin-bottom:8px;background:#fff8df;border:1px solid #f0df9b;border-radius:7px;color:#72520a;font-size:12px}
  #applicationBox.smh-ration-form #submitDynamicApplication{display:none;background:#79a943!important;border-color:#79a943!important}
  .smh-ration-pane[data-step="5"] #submitDynamicApplication{display:block!important}
  .smh-empty-step{padding:18px;text-align:center;color:#667085;background:#fafcf8;border:1px dashed #dce5d7;border-radius:8px}
  @media(max-width:760px){#applicationBox.smh-ration-form [data-field-wrap]{width:calc(50% - 14px)}.smh-family-grid{grid-template-columns:repeat(2,1fr)}.smh-nfsa-list{grid-template-columns:1fr}}
  @media(max-width:520px){#applicationBox.smh-ration-form #dynamicApplicationForm{padding:0 10px 18px}#applicationBox.smh-ration-form [data-field-wrap]{width:100%;margin:7px 0!important}.smh-ration-steps{padding:9px 10px}.smh-family-grid{grid-template-columns:1fr}.smh-ration-nav button{padding:10px 13px}.smh-member-table{display:block;overflow:auto;white-space:nowrap}#applicationBox.smh-ration-form #supportingDocumentsSection [data-document-wrap]{grid-template-columns:1fr}.smh-nfsa-row{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function isRationForm(){const s=document.getElementById('applicationServiceName')?.textContent||'';const v=document.getElementById('applicationVariantName')?.textContent||'';return RATION_RE.test(s+' '+v)}
  function isNewRation(){const v=document.getElementById('applicationVariantName')?.textContent||'';return /नया राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय/i.test(v)}

  function addVariantGroup(){const box=document.getElementById('variantCards');if(!box)return;const ration=[...box.querySelectorAll('.variant-select-btn')].filter(b=>RATION_RE.test(b.textContent||''));if(!ration.length||box.querySelector('.smh-ration-heading'))return;const h=document.createElement('div');h.className='smh-ration-heading';h.style.cssText='grid-column:1/-1;margin:12px 0 2px;padding-top:12px;border-top:1px solid #e5e7eb;font-weight:900;color:#1f4dbd;font-size:18px';h.textContent='🌾 राशन कार्ड सेवाएँ';box.insertBefore(h,ration[0])}
  function fieldWrap(root,key){return root.querySelector(`[data-field-wrap="${key}"]`)}
  function makePane(step,title){const p=document.createElement('section');p.className='smh-ration-pane';p.dataset.step=step;p.innerHTML=`<h3 class="smh-pane-title">Step ${step+1}: ${title}</h3><div class="smh-pane-body"></div>`;return p}

  function familyEditor(pane,originalWrap){
    if(pane.querySelector('.smh-family-entry'))return;
    if(originalWrap){originalWrap.style.display='none';const old=originalWrap.querySelector('input,textarea,select');if(old){old.disabled=true;old.removeAttribute('name')}}
    const hidden=document.createElement('input');hidden.type='hidden';hidden.name='family_members';hidden.id='smhFamilyMembersJson';pane.querySelector('.smh-pane-body').appendChild(hidden);
    const entry=document.createElement('div');entry.className='smh-family-entry';entry.innerHTML=`<strong>नया परिवार सदस्य जोड़ें</strong><div class="smh-family-grid" style="margin-top:10px"><label>सदस्य का नाम (हिंदी) *<input id="fmNameHi"></label><label>नाम Aadhaar अनुसार *<input id="fmNameEn"></label><label>जन्मतिथि *<input id="fmDob" type="date"></label><label>लिंग *<select id="fmGender"><option value="">चुनें</option><option>महिला</option><option>पुरुष</option><option>अन्य</option></select></label><label>मुखिया से संबंध *<input id="fmRelation"></label><label>पिता/पति का नाम<input id="fmGuardian"></label><label>वार्षिक आय<input id="fmIncome" type="number" min="0"></label><label>आधार संख्या<input id="fmAadhaar" inputmode="numeric" maxlength="12"></label></div><button class="smh-add-member" type="button">+ सदस्य सुरक्षित करें</button><div id="smhFamilyList"></div>`;
    pane.querySelector('.smh-pane-body').appendChild(entry);
    entry.querySelector('.smh-add-member').onclick=()=>{const nameHi=entry.querySelector('#fmNameHi').value.trim(),nameEn=entry.querySelector('#fmNameEn').value.trim(),dob=entry.querySelector('#fmDob').value,gender=entry.querySelector('#fmGender').value,relation=entry.querySelector('#fmRelation').value.trim();if(!nameHi||!nameEn||!dob||!gender||!relation){alert('सदस्य का नाम, Aadhaar अनुसार नाम, जन्मतिथि, लिंग और संबंध भरें।');return}const aadhaar=entry.querySelector('#fmAadhaar').value.trim();if(aadhaar&&!/^\d{12}$/.test(aadhaar)){alert('Aadhaar संख्या 12 अंकों की होनी चाहिए।');return}familyMembers.push({name_hi:nameHi,name_aadhaar:nameEn,dob,gender,relation,guardian:entry.querySelector('#fmGuardian').value.trim(),income:entry.querySelector('#fmIncome').value.trim(),aadhaar});entry.querySelectorAll('input,select').forEach(x=>x.value='');renderFamily()};
    renderFamily();
  }

  function renderFamily(){const hidden=document.getElementById('smhFamilyMembersJson');if(hidden)hidden.value=JSON.stringify(familyMembers);const list=document.getElementById('smhFamilyList');if(!list)return;if(!familyMembers.length){list.innerHTML='<div class="smh-empty-family">अभी कोई परिवार सदस्य सुरक्षित नहीं किया गया है।</div>';return}list.innerHTML=`<table class="smh-member-table"><thead><tr><th>क्र.</th><th>नाम</th><th>संबंध</th><th>जन्मतिथि</th><th>लिंग</th><th>आय</th><th></th></tr></thead><tbody>${familyMembers.map((m,i)=>`<tr><td>${i+1}</td><td>${m.name_hi}</td><td>${m.relation}</td><td>${m.dob}</td><td>${m.gender}</td><td>${m.income||'-'}</td><td><button type="button" class="smh-member-remove" data-i="${i}">हटाएँ</button></td></tr>`).join('')}</tbody></table>`;list.querySelectorAll('.smh-member-remove').forEach(b=>b.onclick=()=>{familyMembers.splice(+b.dataset.i,1);renderFamily()})}

  function nfsaEditor(pane,originalWrap){
    if(!originalWrap||pane.querySelector('.smh-nfsa-list'))return;
    originalWrap.style.display='none';const old=originalWrap.querySelector('input,textarea,select');if(old){old.disabled=true;old.removeAttribute('name')}
    const hidden=document.createElement('input');hidden.type='hidden';hidden.name='nfsa_criteria';hidden.id='smhNfsaCriteriaJson';pane.querySelector('.smh-pane-body').appendChild(hidden);
    const list=document.createElement('div');list.className='smh-nfsa-list';list.innerHTML=NFSA_QUESTIONS.map((q,i)=>`<label class="smh-nfsa-row"><span>${i+1}. ${q}</span><select data-nfsa="${i}"><option value="">चुनें</option><option value="नहीं">नहीं</option><option value="हाँ">हाँ</option></select></label>`).join('');pane.querySelector('.smh-pane-body').appendChild(list);
    const sync=()=>{const obj={};list.querySelectorAll('[data-nfsa]').forEach((s,i)=>obj[NFSA_QUESTIONS[i]]=s.value);hidden.value=JSON.stringify(obj)};list.addEventListener('change',sync);sync();
  }

  function validatePane(pane){
    for(const el of pane.querySelectorAll('input[required],select[required],textarea[required]')){if(el.disabled||el.type==='hidden')continue;if(!el.checkValidity()){el.reportValidity();el.focus();return false}}
    if(pane.dataset.step==='2'&&pane.querySelector('#smhFamilyMembersJson')&&familyMembers.length===0){alert('कम से कम एक परिवार सदस्य सुरक्षित करें।');return false}
    if(pane.dataset.step==='4'){for(const f of pane.querySelectorAll('input[type=file][data-required="true"]')){if(!f.files?.length){alert('सभी अनिवार्य दस्तावेज़ चुनें।');f.focus();return false}}}
    if(pane.dataset.step==='5'){const sels=[...pane.querySelectorAll('[data-nfsa]')];if(sels.length&&sels.some(s=>!s.value)){alert('सभी NFSA पात्रता प्रश्नों का उत्तर चुनें।');return false}}
    return true;
  }

  function showStep(index){currentStep=Math.max(0,Math.min(5,index));const panes=[...document.querySelectorAll('.smh-ration-pane')];panes.forEach((p,i)=>p.classList.toggle('active',i===currentStep));document.querySelectorAll('.smh-ration-step').forEach((b,i)=>{b.classList.toggle('active',i===currentStep);b.classList.toggle('done',i<currentStep)});const nav=document.querySelector('.smh-ration-nav');if(nav){nav.querySelector('.smh-prev').style.visibility=currentStep===0?'hidden':'visible';nav.querySelector('.smh-next').style.display=currentStep===5?'none':'inline-block'}document.getElementById('applicationBox')?.scrollTo({top:0,behavior:'smooth'})}

  function addAttachmentNote(pane){if(pane.querySelector('.smh-attach-note'))return;const note=document.createElement('div');note.className='smh-attach-note';note.textContent=isNewRation()?'मुखिया की फोटो, परिवार मुखिया का Aadhaar Card और Bank Passbook — JPG/PNG, प्रत्येक अधिकतम 100 KB।':'इस सेवा के लिए नीचे दिए गए आवश्यक दस्तावेज़ अपलोड करें।';pane.querySelector('.smh-pane-body').prepend(note);pane.querySelectorAll('input[type=file]').forEach(inp=>inp.addEventListener('change',()=>{const f=inp.files?.[0];if(!f)return;if(!['image/jpeg','image/png'].includes(f.type)){alert('केवल JPG/PNG file स्वीकार है।');inp.value='';return}if(f.size>102400){alert('File 100 KB से अधिक है।');inp.value=''}}))}

  function buildStepper(){
    if(!isRationForm())return;
    const box=document.getElementById('applicationBox'),form=document.getElementById('dynamicApplicationForm'),root=document.getElementById('beneficiaryFields');
    if(!box||!form||!root||form.dataset.rationStepper==='1'||!root.querySelector('[data-field-wrap]'))return;
    form.dataset.rationStepper='1';box.classList.add('smh-ration-form');currentStep=0;familyMembers=[];
    const banner=document.createElement('div');banner.className='smh-ration-banner';banner.innerHTML='<strong>🌾 राशन कार्ड आवेदन</strong><small>खाद्य एवं रसद सेवा • सभी चरण क्रम से पूरा करें</small>';form.before(banner);
    const steps=document.createElement('div');steps.className='smh-ration-steps';steps.innerHTML=STEP_NAMES.map((x,i)=>`<button type="button" class="smh-ration-step" data-step="${i}">Step ${i+1}: ${x}</button>`).join('');form.before(steps);
    const groups=[
      ['area_type','applicant_name','head_name','relation_type','relation_name','gender','dob','mobile','aadhaar_number','ration_card_number','annual_income','marital_status','ration_category','category'],
      ['full_address','current_address','district','tehsil','block','village','pincode','pin','permanent_address','permanent_house','permanent_district','permanent_tehsil','permanent_village','permanent_pin'],
      ['family_members','occupation'],
      ['bank_account','account_number','account_holder','account_holder_type','ifsc','bank_name','branch_name','branch'],
      [],
      ['nfsa_criteria','declaration','correction_type','corrected_details','surrender_reason']
    ];
    const panes=STEP_NAMES.map((n,i)=>makePane(i,n));
    const originalFamily=fieldWrap(root,'family_members'),originalNfsa=fieldWrap(root,'nfsa_criteria');
    groups.forEach((keys,i)=>keys.forEach(k=>{const w=fieldWrap(root,k);if(w)panes[i].querySelector('.smh-pane-body').appendChild(w)}));
    [...root.querySelectorAll('[data-field-wrap]')].forEach(w=>panes[0].querySelector('.smh-pane-body').appendChild(w));
    root.style.display='none';
    const anchor=document.getElementById('eligibilitySection');panes.forEach(p=>form.insertBefore(p,anchor));
    familyEditor(panes[2],originalFamily);
    nfsaEditor(panes[5],originalNfsa);
    const docs=document.getElementById('supportingDocumentsSection');if(docs)panes[4].querySelector('.smh-pane-body').appendChild(docs);
    const elig=document.getElementById('eligibilitySection');if(elig&&elig.style.display!=='none')panes[5].querySelector('.smh-pane-body').appendChild(elig);
    const submit=document.getElementById('submitDynamicApplication');if(submit){submit.textContent='सुरक्षित करें एवं आवेदन जमा करें';panes[5].querySelector('.smh-pane-body').appendChild(submit)}
    const err=document.getElementById('applicationError');if(err)panes[5].querySelector('.smh-pane-body').appendChild(err);
    panes.forEach(p=>{const body=p.querySelector('.smh-pane-body');const meaningful=[...body.children].filter(x=>!x.matches('input[type=hidden]')&&!x.matches('#supportingDocumentsSection:empty'));if(!meaningful.length){body.insertAdjacentHTML('beforeend','<div class="smh-empty-step">इस सेवा में इस चरण की अतिरिक्त जानकारी आवश्यक नहीं है।</div>')}});
    addAttachmentNote(panes[4]);
    const nav=document.createElement('div');nav.className='smh-ration-nav';nav.innerHTML='<button type="button" class="smh-prev">← वापस</button><button type="button" class="smh-next">सुरक्षित करें एवं आगे बढ़ें →</button>';form.appendChild(nav);
    nav.querySelector('.smh-prev').onclick=()=>showStep(currentStep-1);nav.querySelector('.smh-next').onclick=()=>{const p=panes[currentStep];if(validatePane(p))showStep(currentStep+1)};
    steps.querySelectorAll('.smh-ration-step').forEach(b=>b.onclick=()=>{const target=+b.dataset.step;if(target<=currentStep){showStep(target);return}if(validatePane(panes[currentStep]))showStep(target)});
    showStep(0);
  }

  function cleanupNonRation(){if(isRationForm())return;const form=document.getElementById('dynamicApplicationForm');if(form)delete form.dataset.rationStepper;document.getElementById('applicationBox')?.classList.remove('smh-ration-form');document.querySelectorAll('.smh-ration-banner,.smh-ration-steps,.smh-ration-nav,.smh-ration-pane').forEach(x=>x.remove())}
  function enhance(){addVariantGroup();if(isRationForm())buildStepper();else cleanupNonRation();document.querySelectorAll('.smh-ration-workflow-note').forEach(el=>el.remove())}
  const start=()=>{enhance();new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true,characterData:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();