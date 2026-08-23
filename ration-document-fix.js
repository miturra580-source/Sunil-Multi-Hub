(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|ration/i;
  const selectedFiles=new Map();

  function isRation(){
    return RATION_RE.test((document.getElementById('applicationServiceName')?.textContent||'')+' '+(document.getElementById('applicationVariantName')?.textContent||''));
  }

  function getDocs(){
    try{
      if(typeof applicationDocuments!=='undefined' && Array.isArray(applicationDocuments)) return applicationDocuments;
    }catch(_){ }
    return [];
  }

  function findDocId(key, matcher){
    const docs=getDocs();
    const byKey=docs.find(d=>String(d.document_key||'').toLowerCase()===key);
    if(byKey?.id) return String(byKey.id);
    const byName=docs.find(d=>matcher.test(String(d.name||'')));
    return byName?.id ? String(byName.id) : '';
  }

  function bindFallbackIds(){
    if(!isRation()) return;
    const box=document.getElementById('smhRationFallbackAttachments');
    if(!box) return;

    const mapping=[
      ['input[name="ration_head_photo"]','head_photo',/मुखिया.*फोटो|head.*photo|photo/i],
      ['input[name="ration_head_aadhaar"]','head_aadhaar',/मुखिया.*आधार|aadhaar|aadhar/i],
      ['input[name="ration_bank_passbook"]','bank_passbook',/बैंक.*पासबुक|bank.*passbook|passbook/i]
    ];

    mapping.forEach(([selector,key,matcher])=>{
      const input=box.querySelector(selector);
      if(!input) return;
      const id=findDocId(key,matcher);
      if(!id) return;
      input.dataset.documentId=id;
      input.dataset.required='true';
    });
  }

  function copyFileToInput(input,file){
    if(!input || !file) return;
    try{
      if(input.files?.[0]===file) return;
      const dt=new DataTransfer();
      dt.items.add(file);
      input.files=dt.files;
    }catch(e){
      console.warn('Ration document restore failed',e);
    }
  }

  function rememberInput(input){
    const id=input?.dataset?.documentId;
    const file=input?.files?.[0];
    if(!id || !file) return;
    selectedFiles.set(id,file);
    document.querySelectorAll('input[type="file"][data-document-id]').forEach(other=>{
      if(other.dataset.documentId===id) copyFileToInput(other,file);
    });
  }

  function restoreAll(){
    if(!isRation()) return;
    bindFallbackIds();
    document.querySelectorAll('input[type="file"][data-document-id]').forEach(input=>{
      const id=input.dataset.documentId;
      const own=input.files?.[0];
      if(own) selectedFiles.set(id,own);
      else if(selectedFiles.has(id)) copyFileToInput(input,selectedFiles.get(id));
    });
  }

  document.addEventListener('change',e=>{
    if(!isRation()) return;
    bindFallbackIds();
    const input=e.target?.matches?.('input[type="file"]')?e.target:null;
    if(!input) return;
    if(!input.dataset.documentId) bindFallbackIds();
    rememberInput(input);
  },true);

  document.addEventListener('click',e=>{
    if(!isRation()) return;
    if(e.target?.id==='submitDynamicApplication' || e.target?.closest?.('#submitDynamicApplication')) restoreAll();
  },true);

  document.addEventListener('submit',e=>{
    if(!isRation()) return;
    if(e.target?.id==='dynamicApplicationForm') restoreAll();
  },true);

  new MutationObserver(()=>restoreAll()).observe(document.body,{childList:true,subtree:true});
})();