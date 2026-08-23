(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|ration/i;
  const selectedFiles=new Map();

  function isRation(){
    return RATION_RE.test((document.getElementById('applicationServiceName')?.textContent||'')+' '+(document.getElementById('applicationVariantName')?.textContent||''));
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
    document.querySelectorAll('input[type="file"][data-document-id]').forEach(input=>{
      const id=input.dataset.documentId;
      const own=input.files?.[0];
      if(own) selectedFiles.set(id,own);
      else if(selectedFiles.has(id)) copyFileToInput(input,selectedFiles.get(id));
    });
  }

  document.addEventListener('change',e=>{
    const input=e.target?.matches?.('input[type="file"][data-document-id]')?e.target:null;
    if(!input || !isRation()) return;
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