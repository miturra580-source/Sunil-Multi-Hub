(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|आधार सीडिंग|समर्पण|नवीनीकरण|संशोधन|ration/i;
  const STEP_NAMES=['Basic Details','Address Details','Family Details','Bank Details','Attachment','NFSA Criteria'];
  let currentStep=0;
  let familyMembers=[];

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
  .smh-ration-step.active{background:#79a943;color:#fff;box-shadow:0 3px 9px #79a94345}
  .smh-ration-step.done{background:#edf6e5;color:#548226}
  .smh-ration-pane{display:none;margin-top:16px;background:#fff;border:1px solid #dce5d7;border-radius:9px;overflow:hidden}
  .smh-ration-pane.active{display:block}
  .smh-pane-title{margin:0;padding:11px 14px;background:#8dbd50;color:#fff;font-size:15px;font-weight:900}
  .smh-pane-body{padding:12px 14px}
  #applicationBox.smh-ration-form [data-field-wrap]{display:inline-block;vertical-align:top;width:calc(33.333% - 14px);margin:7px 6px!important}
  #applicationBox.smh-ration-form [data-field-wrap] input,#applicationBox.smh-ration-form [data-field-wrap] select,#applicationBox.smh-ration-form [data-field-wrap] textarea{border-radius:5px!important;padding:10px!important;border:1px solid #cfd9ca!important;background:#fff!important}
  .smh-ration-nav{display:flex;justify-content:space-between;gap:10px;margin:16px 0 2px}.smh-ration-nav button{border:0;border-radius:7px;padding:11px 18px;font-weight:900;cursor:pointer}.smh-prev{background:#eef1ec;color:#344054}.smh-next{background:#79a943;color:#fff;margin-left:auto}
  .smh-family-entry{padding:13px;background:#f8fbf5;border:1px solid #dfe9d7;border-radius:9px}.smh-family-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.smh-family-grid label{font-size:12px;font-weight:800}.smh-family-grid input,.smh-family-grid select{width:100%;box-sizing:border-box;margin-top:5px;padding:9px;border:1px solid #cfd9ca;border-radius:5px;background:#fff}.smh-add-member{margin-top:11px;background:#79a943;color:#fff;border:0;border-radius:6px;padding:10px 16px;font-weight:900;cursor:pointer}.smh-member-table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}.smh-member-table th,.smh-member-table td{padding:9px;border:1px solid #dde5d8;text-align:left}.smh-member-table th{background:#edf5e6}.smh-member-remove{border:0;background:#fff0f0;color:#b42318;border-radius:5px;padding:5px 8px;cursor:pointer}.smh-empty-family{padding:13px;color:#667085;text-align:center;border:1px dashed #d9e2d3;border-radius:8px;margin-top:12px}
  #applicationBox.smh-ration-form #supportingDocumentsSection,#applicationBox.smh-ration-form #eligibilitySection{margin:0!important;background:#fff!important;border:0!important;border-radius:0!important;padding:0!important}
  #applicationBox.smh-ration-form #submitDynamicApplication{display:none;background:#79a943!important;border-color:#79a943!important}
  .smh-ration-pane[data-step="5"] #submitDynamicApplication{display:block!important}
  @media(max-width:760px){#applicationBox.smh-ration-form [data-field-wrap]{width:calc(50% - 14px)}.smh-family-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:520px){#applicationBox.smh-ration-form #dynamicApplicationForm{padding:0 10px 18px}#applicationBox.smh-ration-form [data-field-wrap]{width:100%;margin:7px 0!important}.smh-ration-steps{padding:9px 10px}.smh-family-grid{grid-template-columns:1fr}.smh-ration-nav button{padding:10px 13px}.smh-member-table{display:block;overflow:auto;white-space:nowrap}}
  `;
  document.head.appendChild(style);

  function isRationForm(){
    const service=document.getElementById('applicationServiceName')?.textContent||'';
    const variant=document.getElementById('applicationVariantName')?.textContent||'';
    return RATION_RE.test(service+' '+variant);
  }

  function addVariantGroup(){
    const box=document.getElementById('variantCards');if(!box)return;
    const ration=[...box.querySelectorAll('.variant-select-btn')].filter(b=>RATION_RE.test(b.textContent||''));
    if(!ration.length||box.querySelector('.smh-ration-heading'))return;
    const h=document.createElement('div');h.className='smh-ration-heading';h.style.cssText='grid-column:1/-1;margin:12px 0 2px;padding-top:12px;border-top:1px solid #e5e7eb;font-weight:900;color:#1f4dbd;font-size:18px';h.textContent='🌾 राशन कार्ड सेवाएँ';box.insertBefore(h,ration[0]);
  }

  function fieldWrap(root,key){return root.querySelector(`[data-field-wrap="${key}"]`)}
  function firstMatches(root,keys){return keys.map(k=>fieldWrap(root,k)).filter(Boolean)}

  function makePane(step,title){
    const pane=document.createElement('section');pane.className='smh-ration-pane';pane.dataset.step=step;
    pane.innerHTML=`<h3 class="smh-pane-title">Step ${step+1}: ${title}</h3><div class="smh-pane-body"></div>`;
    return pane;
  }

  function familyEditor(pane,originalWrap){
    if(pane.querySelector('.smh-family-entry'))return;
    if(originalWrap){
      originalWrap.style.display='none';
      const old=originalWrap.querySelector('input,textarea,select');if(old){old.disabled=true;}
    }
    const hidden=document.createElement('input');hidden.type='hidden';hidden.name='family_members';hidden.id='smhFamilyMembersJson';pane.querySelector('.smh-pane-body').appendChild(hidden);
    const entry=document.createElement('div');entry.className='smh-family-entry';entry.innerHTML=`
      <strong>नया परिवार सदस्य जोड़ें</strong>
      <div class="smh-family-grid" style="margin-top:10px">
        <label>सदस्य का नाम (हिंदी) *<input id="fmNameHi"></label>
        <label>नाम Aadhaar अनुसार *<input id="fmNameEn"></label>
        <label>जन्मतिथि *<input id="fmDob" type="date"></label>
        <label>लिंग *<select id="fmGender"><option value="">चुनें</option><option>महिला</option><option>पुरुष</option><option>अन्य</option></select></label>
        <label>मुखिया से संबंध *<input id="fmRelation"></label>
        <label>पिता/पति का नाम<input id="fmGuardian"></label>
        <label>वार्षिक आय<input id="fmIncome" type="number" min="0"></label>
        <label>आधार संख्या<input id="fmAadhaar" inputmode="numeric" maxlength="12"></label>
      </div>
      <button class="smh-add-member" type="button">+ सदस्य सुरक्षित करें</button>
      <div id="smhFamilyList"></div>`;
    pane.querySelector('.smh-pane-body').appendChild(entry);
    entry.querySelector('.smh-add-member').onclick=()=>{
      const nameHi=entry.querySelector('#fmNameHi').value.trim(),nameEn=entry.querySelector('#fmNameEn').value.trim(),dob=entry.querySelector('#fmDob').value,gender=entry.querySelector('#fmGender').value,relation=entry.querySelector('#fmRelation').value.trim();
      if(!nameHi||!nameEn||!dob||!gender||!relation){alert('सदस्य का नाम, Aadhaar अनुसार नाम, जन्मतिथि, लिंग और संबंध भरें।');return;}
      const aadhaar=entry.querySelector('#fmAadhaar').value.trim();if(aadhaar&&!/^\d{12}$/.test(aadhaar)){alert('Aadhaar संख्या 12 अंकों की होनी चाहिए।');return;}
      familyMembers.push({name_hi:nameHi,name_aadhaar:nameEn,dob,gender,relation,guardian:entry.querySelector('#fmGuardian').value.trim(),income:entry.querySelector('#fmIncome').value.trim(),aadhaar});
      ['#fmNameHi','#fmNameEn','#fmDob','#fmGender','#fmRelation','#fmGuardian','#fmIncome','#fmAadhaar'].forEach(s=>{entry.querySelector(s).value=''});renderFamily();
    };
    renderFamily();
  }

  function renderFamily(){
    const hidden=document.getElementById('smhFamilyMembersJson');if(hidden)hidden.value=JSON.stringify(familyMembers);
    const list=document.getElementById('smhFamilyList');if(!list)return;
    if(!familyMembers.length){list.innerHTML='<div class="smh-empty-family">अभी कोई परिवार सदस्य सुरक्षित नहीं किया गया है।</div>';return;}
    list.innerHTML=`<table class="smh-member-table"><thead><tr><th>क्र.</th><th>नाम</th><th>संबंध</th><th>जन्मतिथि</th><th>लिंग</th><th>आय</th><th></th></tr></thead><tbody>${familyMembers.map((m,i)=>`<tr><td>${i+1}</td><td>${m.name_hi}</td><td>${m.relation}</td><td>${m.dob}</td><td>${m.gender}</td><td>${m.income||'-'}</td><td><button type="button" class="smh-member-remove" data-i="${i}">हटाएँ</button></td></tr>`).join('')}</tbody></table>`;
    list.querySelectorAll('.smh-member-remove').forEach(b=>b.onclick=()=>{familyMembers.splice(+b.dataset.i,1);renderFamily();});
  }

  function validatePane(pane){
    for(const el of pane.querySelectorAll('input[required],select[required],textarea[required]')){
      if(el.disabled||el.type==='hidden')continue;
      if(!el.checkValidity()){el.reportValidity();el.focus();return false;}
    }
    return true;
  }

  function showStep(index){
    currentStep=Math.max(0,Math.min(5,index));
    document.querySelectorAll('.smh-ration-pane').forEach((p,i)=>p.classList.toggle('active',i===currentStep));
    document.querySelectorAll('.smh-ration-step').forEach((b,i)=>{b.classList.toggle('active',i===currentStep);b.classList.toggle('done',i<currentStep)});
    const nav=document.querySelector('.smh-ration-nav');if(nav){nav.querySelector('.smh-prev').style.visibility=currentStep===0?'hidden':'visible';nav.querySelector('.smh-next').style.display=currentStep===5?'none':'inline-block';}
    document.getElementById('applicationBox')?.scrollTo({top:0,behavior:'smooth'});
  }

  function buildStepper(){
    if(!isRationForm())return;
    const box=document.getElementById('applicationBox'),form=document.getElementById('dynamicApplicationForm'),root=document.getElementById('beneficiaryFields');if(!box||!form||!root||form.dataset.rationStepper==='1')return;
    form.dataset.rationStepper='1';box.classList.add('smh-ration-form');currentStep=0;familyMembers=[];

    const banner=document.createElement('div');banner.className='smh-ration-banner';banner.innerHTML='<strong>🌾 राशन कार्ड आवेदन</strong><small>खाद्य एवं रसद सेवा • सभी चरण क्रम से पूरा करें</small>';form.before(banner);
    const steps=document.createElement('div');steps.className='smh-ration-steps';steps.innerHTML=STEP_NAMES.map((x,i)=>`<button type="button" class="smh-ration-step" data-step="${i}">Step ${i+1}: ${x}</button>`).join('');form.before(steps);

    const fieldGroups=[
      ['area_type','applicant_name','head_name','head_name_hi','head_name_en','relation_type','relation_name','father_husband_name','mother_name','gender','dob','mobile','aadhaar_number','ration_card_number','annual_income','marital_status','ration_category','category'],
      ['full_address','current_address','house_no','current_house','district','tehsil','block','village','pincode','pin','permanent_address','permanent_house','permanent_district','permanent_tehsil','permanent_village','permanent_pin'],
      ['family_members','occupation'],
      ['bank_account','account_number','account_holder','account_holder_type','ifsc','bank_name','branch_name','branch'],
      [],
      ['nfsa_criteria','declaration','correction_type','corrected_details','surrender_reason']
    ];

    const panes=STEP_NAMES.map((n,i)=>makePane(i,n));
    root.querySelectorAll('.smh-ration-section-title').forEach(x=>x.remove());
    const originalFamily=fieldWrap(root,'family_members');
    fieldGroups.forEach((keys,i)=>firstMatches(root,keys).forEach(w=>panes[i].querySelector('.smh-pane-body').appendChild(w)));
    [...root.querySelectorAll('[data-field-wrap]')].forEach(w=>{if(!panes.some(p=>p.contains(w)))panes[0].querySelector('.smh-pane-body').appendChild(w)});
    root.innerHTML='';root.style.display='none';

    panes.forEach(p=>form.insertBefore(p,document.getElementById('eligibilitySection')));
    familyEditor(panes[2],originalFamily);

    const docs=document.getElementById('supportingDocumentsSection');if(docs)panes[4].querySelector('.smh-pane-body').appendChild(docs);
    const eligibility=document.getElementById('eligibilitySection');if(eligibility){eligibility.style.display='block';panes[5].querySelector('.smh-pane-body').appendChild(eligibility);}
    const submit=document.getElementById('submitDynamicApplication');if(submit){submit.textContent='सुरक्षित करें एवं आवेदन जमा करें';panes[5].querySelector('.smh-pane-body').appendChild(submit);}

    const nav=document.createElement('div');nav.className='smh-ration-nav';nav.innerHTML='<button type="button" class="smh-prev">← वापस</button><button type="button" class="smh-next">सुरक्षित करें एवं आगे बढ़ें →</button>';form.appendChild(nav);
    nav.querySelector('.smh-prev').onclick=()=>showStep(currentStep-1);
    nav.querySelector('.smh-next').onclick=()=>{const pane=panes[currentStep];if(!validatePane(pane))return;showStep(currentStep+1)};
    steps.querySelectorAll('button').forEach(b=>b.onclick=()=>{const target=+b.dataset.step;if(target<=currentStep||validatePane(panes[currentStep]))showStep(target)});
    showStep(0);
  }

  function cleanNonRation(){
    if(isRationForm())return;
    const box=document.getElementById('applicationBox');box?.classList.remove('smh-ration-form');
  }

  function enhance(){addVariantGroup();buildStepper();cleanNonRation();document.querySelectorAll('.smh-ration-workflow-note').forEach(el=>el.remove())}
  const start=()=>{enhance();new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true,characterData:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();