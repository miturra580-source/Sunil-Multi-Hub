(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|आधार सीडिंग|समर्पण|नवीनीकरण|संशोधन|ration/i;
  const STEP_NAMES=['Basic Details','Address Details','Family Details','Bank Details','Attachment','NFSA Criteria'];
  const DISTRICTS={
    Banda:{label:'बाँदा',blocks:['Badokhar Khurd','Mahuva','Baberu','Bisanda','Kamasin','Jaspura','Naraini','Tindwari']},
    Chitrakoot:{label:'चित्रकूट',blocks:['Karwi','Mau','Pahari','Ramnagar','Manikpur']},
    Hamirpur:{label:'हमीरपुर',blocks:['Gohand','Kurara','Maudaha','Muskara','Rath','Sarila','Sumerpur']},
    Mahoba:{label:'महोबा',blocks:['Kabrai','Charkhari','Jaitpur','Panwari']}
  };
  const NFSA_ITEMS=[
    {no:'1',q:'क्या परिवार आयकर दाता है?',type:'yn'},
    {no:'2',q:'क्या परिवार में चार पहिया वाहन है?',type:'yn'},
    {no:'3',q:'क्या परिवार में ट्रैक्टर है?',type:'yn'},
    {no:'4',q:'क्या परिवार में हार्वेस्टर है?',type:'yn'},
    {no:'5',q:'क्या परिवार में 5 किलोवाट से अधिक क्षमता का जनरेटर है?',type:'yn'},
    {no:'6',q:'परिवार के समस्त सदस्यों के पास कुल उपलब्ध सिंचित भूमि (एकड़)',type:'number'},
    {no:'7',q:'परिवार के पास कुल उपलब्ध शस्त्र लाइसेंसों की संख्या',type:'number'},
    {no:'9.1',q:'भिक्षावृत्ति करने वाले',type:'yn'},
    {no:'9.2',q:'घरेलू कामकाज करने वाले',type:'yn'},
    {no:'9.3',q:'जूता-चप्पल मरम्मत करने वाले',type:'yn'},
    {no:'9.4',q:'फेरी लगाने वाले',type:'yn'},
    {no:'9.5',q:'कुष्ठ रोग / कैंसर / एड्स से पीड़ित',type:'yn'},
    {no:'9.6',q:'अनाथ / माता-पिता विहीन बच्चे',type:'yn'},
    {no:'9.7',q:'स्वच्छकार',type:'yn'},
    {no:'9.8',q:'दैनिक वेतनभोगी / कुली / पल्लेदार इत्यादि',type:'yn'},
    {no:'10',q:'भूमिहीन मजदूर का परिवार',type:'yn'},
    {no:'11',q:'गरीबी रेखा से नीचे जीवन-यापन करने वाला परिवार',type:'yn'},
    {no:'12',q:'परित्यक्त महिलाएं',type:'yn'},
    {no:'13',q:'परिवार की मुखिया निराश्रित महिला / विकलांग / शारीरिक रूप से अक्षम है और परिवार में कोई वयस्क पुरुष नहीं है',type:'yn'},
    {no:'14',q:'आवासहीन परिवार',type:'yn'},
    {no:'15',q:'ट्रांसजेंडर / किन्नर कम्युनिटी के सदस्य',type:'yn'}
  ];
  let currentStep=0;
  let familyMembers=[];

  const style=document.createElement('style');
  style.textContent=`
    #applicationBox.smh-ration-form{width:min(1120px,100%)!important;padding:0!important;background:#f6faf3!important;border-radius:22px 22px 0 0!important}
    #applicationBox.smh-ration-form>div:first-child{padding:16px 20px;background:linear-gradient(110deg,#8d2019,#c84e28 52%,#eea24d);color:#fff}
    #applicationBox.smh-ration-form #applicationServiceName{color:#fff;font-size:23px}
    #applicationBox.smh-ration-form #applicationVariantName,#applicationBox.smh-ration-form #applicationServicePrice{color:#fff!important;opacity:.95}
    #applicationBox.smh-ration-form #dynamicApplicationForm{padding:0 18px 22px}
    .smh-ration-banner{padding:12px 18px;background:linear-gradient(90deg,#fff6df,#f2f8e8);border-bottom:1px solid #dce6d4}
    .smh-ration-banner strong{display:block;color:#8d2019;font-size:17px}.smh-ration-banner small{display:block;margin-top:2px;color:#52604b;font-size:11px}
    .smh-ration-steps{display:flex;gap:4px;overflow:auto;padding:9px 18px;background:#fff;border-bottom:1px solid #dfe7da;position:sticky;top:0;z-index:8}
    .smh-ration-step{flex:0 0 auto;padding:7px 9px;border:0;border-radius:5px;background:#dce8cf;color:#34521c;font-size:11px;font-weight:800;cursor:pointer}
    .smh-ration-step.active{background:#79a943;color:#fff}.smh-ration-step.done{background:#edf6e5;color:#548226}
    .smh-ration-pane{display:none;margin-top:13px;background:#fff;border:1px solid #dce5d7;border-radius:8px;overflow:hidden}.smh-ration-pane.active{display:block}
    .smh-pane-title{margin:0;padding:9px 12px;background:#8dbd50;color:#fff;font-size:13px;font-weight:900}.smh-pane-body{padding:10px 11px}
    #applicationBox.smh-ration-form [data-field-wrap]{display:inline-block;vertical-align:top;width:calc(25% - 12px);margin:5px 5px!important;font-size:11px!important}
    #applicationBox.smh-ration-form [data-field-wrap] label{font-size:11px!important}
    #applicationBox.smh-ration-form [data-field-wrap] input,#applicationBox.smh-ration-form [data-field-wrap] select,#applicationBox.smh-ration-form [data-field-wrap] textarea{margin-top:4px!important;border-radius:4px!important;padding:8px!important;border:1px solid #cfd9ca!important;background:#fff!important;font-size:12px!important;min-height:34px!important}
    #applicationBox.smh-ration-form [data-field-wrap] textarea{min-height:52px!important}
    .smh-wide{width:calc(50% - 12px)!important}.smh-hidden-store{position:absolute!important;left:-99999px!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;margin:0!important;padding:0!important}
    .smh-category-wrap{display:inline-block;vertical-align:top;width:calc(50% - 12px);margin:5px}.smh-category-wrap>strong{font-size:11px}.smh-category-options{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.smh-category-options label{display:flex;gap:4px;align-items:center;padding:6px 7px;border:1px solid #d8e2d2;border-radius:5px;background:#fbfdf9;font-size:10px;font-weight:700}
    .smh-ration-nav{display:flex;justify-content:space-between;gap:8px;margin:13px 0 0}.smh-ration-nav button{border:0;border-radius:6px;padding:9px 14px;font-weight:900;cursor:pointer;font-size:12px}.smh-prev{background:#eef1ec;color:#344054}.smh-next{background:#79a943;color:#fff;margin-left:auto}
    .smh-family-head{padding:9px 10px;background:#eff7e8;border:1px solid #d8e7ca;border-radius:7px;margin-bottom:10px;font-size:11px}.smh-family-head strong{display:block;font-size:12px;color:#456d26;margin-bottom:4px}
    .smh-family-entry{padding:10px;background:#f8fbf5;border:1px solid #dfe9d7;border-radius:7px}.smh-family-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.smh-family-grid label{font-size:10px;font-weight:800}.smh-family-grid input,.smh-family-grid select{width:100%;box-sizing:border-box;margin-top:3px;padding:7px;border:1px solid #cfd9ca;border-radius:4px;background:#fff;font-size:11px}.smh-inline-radio{display:flex;gap:5px}.smh-inline-radio label{display:flex;align-items:center;gap:3px;padding:6px;border:1px solid #d8e2d2;border-radius:4px;background:#fff}
    .smh-add-member{margin-top:8px;background:#79a943;color:#fff;border:0;border-radius:5px;padding:8px 12px;font-size:11px;font-weight:900;cursor:pointer}.smh-member-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:10px}.smh-member-table th,.smh-member-table td{padding:7px;border:1px solid #dde5d8;text-align:left}.smh-member-table th{background:#edf5e6}.smh-member-remove{border:0;background:#fff0f0;color:#b42318;border-radius:4px;padding:4px 6px;font-size:10px;cursor:pointer}.smh-empty-family{padding:10px;color:#667085;text-align:center;border:1px dashed #d9e2d3;border-radius:6px;margin-top:8px;font-size:11px}
    #applicationBox.smh-ration-form #supportingDocumentsSection{margin:0!important;background:#fff!important;border:0!important;padding:0!important}#applicationBox.smh-ration-form #supportingDocumentsSection>h3,#applicationBox.smh-ration-form #supportingDocumentsSection>p{display:none!important}
    #applicationBox.smh-ration-form #supportingDocumentsSection [data-document-wrap]{display:grid!important;grid-template-columns:180px minmax(180px,1fr) 105px;gap:6px;align-items:center;width:auto!important;margin:6px 0!important;padding:8px!important;border:1px solid #dfe7da!important;border-radius:6px!important;background:#fbfdf9!important;font-size:11px!important}
    #applicationBox.smh-ration-form #supportingDocumentsSection [data-document-wrap] input[type=file]{margin:0!important;width:100%;font-size:10px!important}#applicationBox.smh-ration-form #supportingDocumentsSection [data-document-wrap] small{margin:0!important;font-size:9px!important;color:#667085!important}
    .smh-attach-note{padding:8px 9px;margin-bottom:7px;background:#fff8df;border:1px solid #f0df9b;border-radius:6px;color:#72520a;font-size:10px}
    .smh-nfsa-list{display:grid;grid-template-columns:1fr 1fr;gap:5px}.smh-nfsa-row{display:grid;grid-template-columns:30px 1fr 70px;gap:5px;align-items:center;padding:6px;border:1px solid #e3eadf;border-radius:5px;background:#fbfdf9;font-size:10px}.smh-nfsa-row b{text-align:center;color:#4f732e}.smh-nfsa-row select,.smh-nfsa-row input{width:100%;box-sizing:border-box;padding:5px;border:1px solid #cfd9ca;border-radius:4px;background:#fff;font-size:10px}.smh-nfsa-group-title{grid-column:1/-1;padding:7px 8px;background:#eef6e8;border-radius:5px;font-size:10px;font-weight:900;color:#456d26}
    #applicationBox.smh-ration-form #submitDynamicApplication{display:none;background:#79a943!important;border-color:#79a943!important;font-size:12px!important;min-height:42px!important}.smh-ration-pane[data-step="5"] #submitDynamicApplication{display:block!important}
    @media(max-width:760px){#applicationBox.smh-ration-form [data-field-wrap]{width:calc(50% - 12px)}.smh-wide,.smh-category-wrap{width:calc(100% - 10px)!important}.smh-family-grid{grid-template-columns:repeat(2,1fr)}.smh-nfsa-list{grid-template-columns:1fr}}
    @media(max-width:520px){#applicationBox.smh-ration-form #dynamicApplicationForm{padding:0 8px 16px}#applicationBox.smh-ration-form [data-field-wrap]{width:calc(50% - 10px);margin:4px!important}.smh-ration-steps{padding:7px 8px}.smh-family-grid{grid-template-columns:repeat(2,1fr)}.smh-member-table{display:block;overflow:auto;white-space:nowrap}#applicationBox.smh-ration-form #supportingDocumentsSection [data-document-wrap]{grid-template-columns:1fr}.smh-nfsa-row{grid-template-columns:26px 1fr 62px}.smh-pane-body{padding:8px}}
  `;
  document.head.appendChild(style);

  const $=(s,r=document)=>r.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function isRationForm(){return RATION_RE.test(($('#applicationServiceName')?.textContent||'')+' '+($('#applicationVariantName')?.textContent||''))}
  function fieldWrap(root,key){return root.querySelector(`[data-field-wrap="${key}"]`)}
  function makePane(i,name){const p=document.createElement('section');p.className='smh-ration-pane';p.dataset.step=i;p.innerHTML=`<h3 class="smh-pane-title">Step ${i+1}: ${name}</h3><div class="smh-pane-body"></div>`;return p}
  function fillSelect(el,items,placeholder='चुनें'){if(!el)return;const prev=el.value;el.innerHTML=`<option value="">${placeholder}</option>`+items.map(x=>typeof x==='string'?`<option value="${esc(x)}">${esc(x)}</option>`:`<option value="${esc(x.value)}">${esc(x.label)}</option>`).join('');if([...el.options].some(o=>o.value===prev))el.value=prev}
  function replaceSelectWithText(key,placeholder=''){const old=document.querySelector(`[name="${key}"]`);if(!old||old.tagName!=='SELECT')return old;const input=document.createElement('input');input.name=old.name;input.required=old.required;input.placeholder=placeholder;input.style.cssText=old.style.cssText;old.replaceWith(input);return input}

  function setupLocations(){
    const district=$('[name="district"]'),addressDistrict=$('[name="address_district"]');
    const serviceBlock=$('[name="service_block"]'),addressBlock=$('[name="address_block"]');
    const districtItems=Object.entries(DISTRICTS).map(([value,d])=>({value,label:d.label}));
    [district,addressDistrict].forEach(x=>fillSelect(x,districtItems,'जिला चुनें'));
    function blocksFor(d){return DISTRICTS[d]?.blocks||[]}
    district?.addEventListener('change',()=>{fillSelect(serviceBlock,blocksFor(district.value),'विकासखंड चुनें');if(addressDistrict&&!addressDistrict.value){addressDistrict.value=district.value;addressDistrict.dispatchEvent(new Event('change'))}});
    addressDistrict?.addEventListener('change',()=>fillSelect(addressBlock,blocksFor(addressDistrict.value),'विकासखंड चुनें'));
    fillSelect(serviceBlock,blocksFor(district?.value),'विकासखंड चुनें');fillSelect(addressBlock,blocksFor(addressDistrict?.value),'विकासखंड चुनें');
    replaceSelectWithText('service_gram_panchayat','ग्राम पंचायत का नाम');replaceSelectWithText('address_gram_panchayat','ग्राम पंचायत का नाम');
  }

  function setupAreaBehavior(){
    const area=$('[name="area_type"]');if(!area)return;
    const update=()=>{
      const rural=area.value==='ग्रामीण';
      const localityWrap=document.querySelector('[data-field-wrap="locality_name"]');const locality=localityWrap?.querySelector('input,select');
      if(localityWrap){const label=localityWrap.querySelector('label');if(label)label.childNodes[0].textContent=rural?'ग्राम का नाम ':'शहर का नाम ';if(locality)locality.placeholder=rural?'ग्राम का नाम':'शहर का नाम'}
      ['service_gram_panchayat','address_gram_panchayat'].forEach(k=>{const w=document.querySelector(`[data-field-wrap="${k}"]`);if(w){w.style.display=rural?'inline-block':'none';const i=w.querySelector('input,select');if(i)i.required=rural}});
    };
    area.addEventListener('change',update);update();
  }

  function setupCategory(){
    const wrap=document.querySelector('[data-field-wrap="category"]');const select=wrap?.querySelector('select');if(!wrap||!select||wrap.dataset.multi==='1')return;wrap.dataset.multi='1';wrap.classList.add('smh-hidden-store');
    const box=document.createElement('div');box.className='smh-category-wrap';box.innerHTML='<strong>वर्ग चुनें *</strong><div class="smh-category-options"></div>';
    const opts=[...select.options].filter(o=>o.value);box.querySelector('.smh-category-options').innerHTML=opts.map(o=>`<label><input type="checkbox" value="${esc(o.value)}"> ${esc(o.textContent)}</label>`).join('');
    wrap.after(box);box.querySelectorAll('input').forEach(c=>c.addEventListener('change',()=>{select.innerHTML='<option value=""></option><option selected value="'+esc([...box.querySelectorAll('input:checked')].map(x=>x.value).join(', '))+'"></option>'}));
  }

  function originalStore(key){const wrap=document.querySelector(`[data-field-wrap="${key}"]`);if(!wrap)return null;wrap.classList.add('smh-hidden-store');const el=wrap.querySelector('textarea,input');return el}

  function autoHeadMember(){
    const hi=$('[name="applicant_name_hi"]')?.value.trim()||'';const en=$('[name="applicant_name_en"]')?.value.trim()||'';const dob=$('[name="dob"]')?.value||'';const aadhaar=$('[name="aadhaar_number"]')?.value.trim()||'';
    if(!hi&&!en)return;
    const existing=familyMembers.find(x=>x.isHead);
    const obj={isHead:true,name_hi:hi,name_aadhaar:en,dob,gender:'',relation:'मुखिया',guardian_type:'',guardian:'',income:'',aadhaar};
    if(existing)Object.assign(existing,obj);else familyMembers.unshift(obj);renderFamily();
  }

  function familyEditor(pane){
    const body=$('.smh-pane-body',pane);if($('.smh-family-entry',body))return;
    const store=originalStore('family_members');
    const head=document.createElement('div');head.className='smh-family-head';head.innerHTML='<strong>परिवार मुखिया</strong><span>Step 1 में भरी गई मुखिया की जानकारी यहाँ स्वतः सुरक्षित होगी।</span>';body.appendChild(head);
    const entry=document.createElement('div');entry.className='smh-family-entry';entry.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><strong style="font-size:12px">नया परिवार सदस्य जोड़ें</strong><button type="button" class="smh-add-member" style="margin:0">+ नया सदस्य</button></div><div class="smh-family-grid smh-member-form" style="margin-top:8px;display:none"><label>सदस्य का नाम (हिंदी) *<input data-fm="name_hi"></label><label>नाम Aadhaar के अनुसार *<input data-fm="name_aadhaar"></label><label>जन्मतिथि *<input data-fm="dob" type="date"></label><label>लिंग *<select data-fm="gender"><option value="">चुनें</option><option>महिला</option><option>पुरुष</option><option>अन्य</option></select></label><label>मुखिया से संबंध *<input data-fm="relation"></label><label>पिता / पति चुनें<div class="smh-inline-radio"><label><input type="radio" name="fmGuardianType" value="पिता">पिता</label><label><input type="radio" name="fmGuardianType" value="पति">पति</label></div></label><label>पिता / पति का नाम<input data-fm="guardian"></label><label>वार्षिक आय<input data-fm="income" type="number" min="0"></label><label>आधार संख्या<input data-fm="aadhaar" inputmode="numeric" maxlength="12"></label><div style="align-self:end"><button type="button" class="smh-save-member smh-add-member">सदस्य सुरक्षित करें</button></div></div><div id="smhFamilyList"></div>`;body.appendChild(entry);
    const form=$('.smh-member-form',entry);$('.smh-add-member',entry).onclick=()=>{form.style.display=form.style.display==='none'?'grid':'none'};
    $('.smh-save-member',entry).onclick=()=>{const v=k=>$(`[data-fm="${k}"]`,entry)?.value.trim()||'';if(!v('name_hi')||!v('name_aadhaar')||!v('dob')||!v('gender')||!v('relation')){alert('सदस्य का नाम, Aadhaar अनुसार नाम, जन्मतिथि, लिंग और संबंध भरें।');return}const aad=v('aadhaar');if(aad&&!/^\d{12}$/.test(aad)){alert('Aadhaar संख्या 12 अंकों की होनी चाहिए।');return}familyMembers.push({isHead:false,name_hi:v('name_hi'),name_aadhaar:v('name_aadhaar'),dob:v('dob'),gender:v('gender'),relation:v('relation'),guardian_type:entry.querySelector('input[name="fmGuardianType"]:checked')?.value||'',guardian:v('guardian'),income:v('income'),aadhaar:aad});entry.querySelectorAll('[data-fm]').forEach(x=>x.value='');entry.querySelectorAll('input[name="fmGuardianType"]').forEach(x=>x.checked=false);form.style.display='none';renderFamily()};
    autoHeadMember();
    function sync(){if(store)store.value=JSON.stringify(familyMembers)}
    window.__smhSyncFamily=sync;
  }

  function renderFamily(){
    window.__smhSyncFamily?.();const list=$('#smhFamilyList');if(!list)return;
    if(!familyMembers.length){list.innerHTML='<div class="smh-empty-family">अभी कोई परिवार सदस्य सुरक्षित नहीं है।</div>';return}
    list.innerHTML=`<table class="smh-member-table"><thead><tr><th>क्र.</th><th>नाम</th><th>संबंध</th><th>जन्मतिथि</th><th>लिंग</th><th>आधार</th><th></th></tr></thead><tbody>${familyMembers.map((m,i)=>`<tr><td>${i+1}</td><td>${esc(m.name_hi)}${m.isHead?' <b>(मुखिया)</b>':''}</td><td>${esc(m.relation)}</td><td>${esc(m.dob||'-')}</td><td>${esc(m.gender||'-')}</td><td>${m.aadhaar?esc('XXXX XXXX '+m.aadhaar.slice(-4)):'-'}</td><td>${m.isHead?'':`<button type="button" class="smh-member-remove" data-i="${i}">हटाएँ</button>`}</td></tr>`).join('')}</tbody></table>`;
    list.querySelectorAll('.smh-member-remove').forEach(b=>b.onclick=()=>{familyMembers.splice(+b.dataset.i,1);renderFamily()});
  }

  function nfsaEditor(pane){
    const body=$('.smh-pane-body',pane);const store=originalStore('nfsa_criteria');if($('.smh-nfsa-list',body))return;
    const title=document.createElement('div');title.className='smh-nfsa-group-title';title.textContent='NFSA पात्रता मानक — प्रत्येक प्रश्न का उत्तर चुनें';body.appendChild(title);
    const list=document.createElement('div');list.className='smh-nfsa-list';body.appendChild(list);
    NFSA_ITEMS.forEach((it,idx)=>{if(it.no==='9.1'){const g=document.createElement('div');g.className='smh-nfsa-group-title';g.textContent='9. क्या व्यक्ति या उसका परिवार निम्न श्रेणी में है?';list.appendChild(g)}const row=document.createElement('div');row.className='smh-nfsa-row';row.innerHTML=`<b>${it.no}</b><span>${esc(it.q)}</span>${it.type==='yn'?`<select data-nfsa="${idx}" required><option value="">--</option><option>हाँ</option><option>नहीं</option></select>`:`<input data-nfsa="${idx}" type="number" min="0" step="0.01" required>`}`;list.appendChild(row)});
    const sync=()=>{if(store)store.value=JSON.stringify(NFSA_ITEMS.map((it,i)=>({no:it.no,question:it.q,answer:$(`[data-nfsa="${i}"]`,list)?.value||''})))};list.addEventListener('change',sync);list.addEventListener('input',sync);sync();
  }

  function compactAttachments(pane){
    const docs=$('#supportingDocumentsSection');if(!docs)return;const body=$('.smh-pane-body',pane);if(!body.contains(docs))body.appendChild(docs);if(!body.querySelector('.smh-attach-note')){const n=document.createElement('div');n.className='smh-attach-note';n.textContent='केवल 3 दस्तावेज़: मुखिया की फोटो, मुखिया का Aadhaar Card और Bank Passbook • JPG/PNG • अधिकतम 100 KB';body.prepend(n)}
  }

  function validatePane(pane){
    if(+pane.dataset.step===2){autoHeadMember();if(!familyMembers.length){alert('कम से कम परिवार मुखिया की जानकारी आवश्यक है।');return false}}
    for(const el of pane.querySelectorAll('input[required],select[required],textarea[required]')){if(el.type==='hidden'||el.closest('.smh-hidden-store'))continue;if(!el.checkValidity()){el.reportValidity();el.focus();return false}}
    if(+pane.dataset.step===0){const category=$('[name="category"]')?.value||'';if(!category){alert('कम से कम एक वर्ग चुनें।');return false}}
    return true;
  }

  function showStep(i){
    currentStep=Math.max(0,Math.min(5,i));document.querySelectorAll('.smh-ration-pane').forEach((p,x)=>p.classList.toggle('active',x===currentStep));document.querySelectorAll('.smh-ration-step').forEach((b,x)=>{b.classList.toggle('active',x===currentStep);b.classList.toggle('done',x<currentStep)});const nav=$('.smh-ration-nav');if(nav){$('.smh-prev',nav).style.visibility=currentStep===0?'hidden':'visible';$('.smh-next',nav).style.display=currentStep===5?'none':'inline-block'}if(currentStep===2)autoHeadMember();if(currentStep===1){const d=$('[name="district"]')?.value,ad=$('[name="address_district"]');if(ad&&!ad.value&&d){ad.value=d;ad.dispatchEvent(new Event('change'))}const sb=$('[name="service_block"]')?.value,ab=$('[name="address_block"]');if(ab&&!ab.value&&sb)ab.value=sb}document.getElementById('applicationBox')?.scrollTo({top:0,behavior:'smooth'})
  }

  function buildStepper(){
    if(!isRationForm())return;const box=$('#applicationBox'),form=$('#dynamicApplicationForm'),root=$('#beneficiaryFields');if(!box||!form||!root||form.dataset.rationV3==='1')return;form.dataset.rationV3='1';box.classList.add('smh-ration-form');familyMembers=[];currentStep=0;
    const banner=document.createElement('div');banner.className='smh-ration-banner';banner.innerHTML='<strong>🌾 राशन कार्ड आवेदन</strong><small>NFSA / खाद्य एवं रसद सेवा • सभी विवरण सही-सही भरें</small>';form.before(banner);
    const steps=document.createElement('div');steps.className='smh-ration-steps';steps.innerHTML=STEP_NAMES.map((x,i)=>`<button type="button" class="smh-ration-step" data-step="${i}">Step ${i+1}: ${x}</button>`).join('');form.before(steps);
    const panes=STEP_NAMES.map((n,i)=>makePane(i,n));
    const groups=[
      ['district','area_type','ration_card_number','income_certificate_number','income_application_number','service_block','service_gram_panchayat','dealer_name','applicant_name_hi','applicant_name_en','father_name_hi','father_name_en','husband_name_hi','husband_name_en','mother_name_hi','mother_name_en','category','mobile','dob','aadhaar_number'],
      ['house_number','locality_name','address_district','address_block','address_gram_panchayat','pincode'],
      ['family_members'],
      ['account_holder_name','bank_name','ifsc','branch_name'],
      [],
      ['nfsa_criteria','correction_type','corrected_details','surrender_reason','declaration']
    ];
    groups.forEach((keys,i)=>keys.forEach(k=>{const w=fieldWrap(root,k);if(w)panes[i].querySelector('.smh-pane-body').appendChild(w)}));
    [...root.querySelectorAll('[data-field-wrap]')].forEach(w=>{if(!panes.some(p=>p.contains(w)))panes[0].querySelector('.smh-pane-body').appendChild(w)});root.innerHTML='';root.style.display='none';
    const elig=$('#eligibilitySection');panes.forEach(p=>form.insertBefore(p,elig));
    const docs=$('#supportingDocumentsSection');if(docs)panes[4].querySelector('.smh-pane-body').appendChild(docs);
    const submit=$('#submitDynamicApplication');if(submit){submit.textContent='सुरक्षित करें एवं आवेदन जमा करें';panes[5].querySelector('.smh-pane-body').appendChild(submit)}
    panes[2].querySelector('.smh-pane-body').appendChild(document.querySelector('[data-field-wrap="family_members"]')||document.createTextNode(''));
    setupLocations();setupAreaBehavior();setupCategory();familyEditor(panes[2]);compactAttachments(panes[4]);nfsaEditor(panes[5]);
    const nav=document.createElement('div');nav.className='smh-ration-nav';nav.innerHTML='<button type="button" class="smh-prev">← वापस</button><button type="button" class="smh-next">सुरक्षित करें एवं आगे बढ़ें →</button>';form.appendChild(nav);$('.smh-prev',nav).onclick=()=>showStep(currentStep-1);$('.smh-next',nav).onclick=()=>{const p=panes[currentStep];if(validatePane(p))showStep(currentStep+1)};steps.querySelectorAll('button').forEach(b=>b.onclick=()=>{const target=+b.dataset.step;if(target<=currentStep)showStep(target);else if(validatePane(panes[currentStep]))showStep(target)});
    showStep(0);
  }

  function resetNonRation(){if(isRationForm())return;document.getElementById('applicationBox')?.classList.remove('smh-ration-form')}
  function enhance(){buildStepper();resetNonRation()}
  function start(){enhance();new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true,characterData:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();