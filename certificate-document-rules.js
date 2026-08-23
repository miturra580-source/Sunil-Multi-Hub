(() => {
  /* eDistrict document picker is handled only by edistrict-document-picker.js.
     Keep this module intentionally minimal so duplicate attachment headings,
     legacy document cards and duplicate upload controls cannot appear. */
  function cleanLegacy(){
    const title=(document.getElementById('applicationServiceName')?.textContent||'').toLowerCase();
    if(!(title.includes('edistrict')||title.includes('आय प्रमाण')||title.includes('जाति प्रमाण')||title.includes('निवास प्रमाण'))) return;
    const section=document.getElementById('supportingDocumentsSection');
    if(!section) return;
    section.querySelectorAll('[data-document-wrap]').forEach(el=>{el.style.display='none';});
    [...section.children].forEach(el=>{
      if(el.classList?.contains('smh-doc-picker')) return;
      if(el.matches?.('[data-document-wrap]')) return;
      if(el.classList?.contains('smh-upload-quality-warning')) return;
      if(/^H[1-6]$/.test(el.tagName) || (el.tagName==='P' && /documents|दस्तावेज|संलग्न/i.test(el.textContent||''))) el.style.display='none';
    });
  }
  const start=()=>{cleanLegacy();new MutationObserver(()=>requestAnimationFrame(cleanLegacy)).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();