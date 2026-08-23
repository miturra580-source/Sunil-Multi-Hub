(() => {
  const RATION_RE=/राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|आधार सीडिंग|समर्पण|नवीनीकरण|संशोधन|ration/i;
  let restoreTimer=null;

  function isRation(){
    return RATION_RE.test((document.getElementById('applicationServiceName')?.textContent||'')+' '+(document.getElementById('applicationVariantName')?.textContent||''));
  }
  function variantKey(){
    return (document.getElementById('applicationVariantName')?.textContent||'ration').trim().replace(/\s+/g,'_');
  }
  function draftKey(){ return 'smh_ration_draft_'+variantKey(); }

  function tightenValidation(){
    if(!isRation()) return;
    document.querySelectorAll('[name="mobile"]').forEach(el=>{
      el.setAttribute('inputmode','numeric'); el.setAttribute('maxlength','10'); el.setAttribute('pattern','\\d{10}');
      el.title='मोबाइल नंबर 10 अंकों का होना चाहिए।';
    });
    document.querySelectorAll('[name="aadhaar_number"], [data-fm="aadhaar"]').forEach(el=>{
      el.setAttribute('inputmode','numeric'); el.setAttribute('maxlength','12'); el.setAttribute('pattern','\\d{12}');
      el.title='आधार संख्या 12 अंकों की होनी चाहिए।';
    });
  }

  function removeFamilyHelper(){
    if(!isRation()) return;
    document.querySelectorAll('.smh-family-head span').forEach(el=>el.remove());
    const head=document.querySelector('.smh-family-head');
    if(head && !head.textContent.trim().replace(/परिवार मुखिया/g,'')) head.remove();
  }

  function collectDraft(){
    if(!isRation()) return null;
    const data={values:{},checks:{},radios:{},nfsa:{},step:0,familyStore:'',nfsaStore:'',savedAt:new Date().toISOString()};
    document.querySelectorAll('#dynamicApplicationForm input,#dynamicApplicationForm select,#dynamicApplicationForm textarea').forEach(el=>{
      if(el.type==='file') return;
      if(el.name){
        if(el.type==='checkbox') data.checks[el.name]=!!el.checked;
        else if(el.type==='radio'){ if(el.checked) data.radios[el.name]=el.value; }
        else data.values[el.name]=el.value;
      }
    });
    document.querySelectorAll('#dynamicApplicationForm [data-nfsa]').forEach((el,i)=>{
      const key=el.dataset.nfsa || el.dataset.no || el.name || String(i);
      data.nfsa[key]=el.value;
    });
    const active=[...document.querySelectorAll('.smh-ration-step')].findIndex(x=>x.classList.contains('active'));
    data.step=Math.max(0,active);
    const fam=document.querySelector('[data-field-wrap="family_members"] textarea,[data-field-wrap="family_members"] input[name="family_members"],textarea[name="family_members"],input[name="family_members"]');
    if(fam) data.familyStore=fam.value||'';
    const nfsa=document.querySelector('[data-field-wrap="nfsa_criteria"] textarea,[data-field-wrap="nfsa_criteria"] input[name="nfsa_criteria"],textarea[name="nfsa_criteria"],input[name="nfsa_criteria"]');
    if(nfsa) data.nfsaStore=nfsa.value||'';
    return data;
  }

  function saveDraft(){
    const d=collectDraft(); if(!d) return;
    try{ localStorage.setItem(draftKey(),JSON.stringify(d)); }catch(e){ console.warn('Ration draft save failed',e); }
  }

  function renderRestoredFamily(json){
    let rows=[]; try{ rows=JSON.parse(json||'[]'); }catch{}
    if(!Array.isArray(rows)||!rows.length) return;
    const list=document.getElementById('smhFamilyList'); if(!list) return;
    list.innerHTML=`<table class="smh-member-table"><thead><tr><th>क्र.</th><th>नाम</th><th>संबंध</th><th>जन्मतिथि</th><th>लिंग</th><th>आधार</th></tr></thead><tbody>${rows.map((m,i)=>`<tr><td>${i+1}</td><td>${String(m.name_hi||m.name_aadhaar||'')}</td><td>${String(m.relation||'')}</td><td>${String(m.dob||'-')}</td><td>${String(m.gender||'-')}</td><td>${m.aadhaar?'XXXX XXXX '+String(m.aadhaar).slice(-4):'-'}</td></tr>`).join('')}</tbody></table>`;
  }

  function restoreDraft(){
    if(!isRation()||!document.querySelector('.smh-ration-pane')) return;
    let d=null; try{ d=JSON.parse(localStorage.getItem(draftKey())||'null'); }catch{}
    if(!d) return;
    Object.entries(d.values||{}).forEach(([name,val])=>{
      const el=document.querySelector(`#dynamicApplicationForm [name="${CSS.escape(name)}"]`); if(!el||el.type==='file') return;
      if(!el.value){ el.value=val; el.dispatchEvent(new Event('change',{bubbles:true})); }
    });
    Object.entries(d.checks||{}).forEach(([name,val])=>{ const el=document.querySelector(`#dynamicApplicationForm [name="${CSS.escape(name)}"]`); if(el) el.checked=!!val; });
    Object.entries(d.radios||{}).forEach(([name,val])=>{ const el=[...document.querySelectorAll(`#dynamicApplicationForm [name="${CSS.escape(name)}"]`)].find(x=>x.value===val); if(el) el.checked=true; });
    const nfsaEls=[...document.querySelectorAll('#dynamicApplicationForm [data-nfsa]')];
    Object.entries(d.nfsa||{}).forEach(([key,val])=>{
      const el=nfsaEls.find((x,i)=>(x.dataset.nfsa||x.dataset.no||x.name||String(i))===key);
      if(el){ el.value=val; el.dispatchEvent(new Event('change',{bubbles:true})); }
    });
    const fam=document.querySelector('[data-field-wrap="family_members"] textarea,[data-field-wrap="family_members"] input[name="family_members"],textarea[name="family_members"],input[name="family_members"]');
    if(fam && d.familyStore){ fam.value=d.familyStore; renderRestoredFamily(d.familyStore); }
    const nfsa=document.querySelector('[data-field-wrap="nfsa_criteria"] textarea,[data-field-wrap="nfsa_criteria"] input[name="nfsa_criteria"],textarea[name="nfsa_criteria"],input[name="nfsa_criteria"]');
    if(nfsa && d.nfsaStore) nfsa.value=d.nfsaStore;
    if(Number.isInteger(d.step) && d.step>0){
      const target=document.querySelector(`.smh-ration-pane[data-step="${Math.min(5,d.step)}"]`);
      document.querySelectorAll('.smh-ration-pane').forEach(p=>p.classList.toggle('active',p===target));
      document.querySelectorAll('.smh-ration-step').forEach(s=>s.classList.toggle('active',Number(s.dataset.step)===Math.min(5,d.step)));
    }
    document.querySelectorAll('input[type="file"]').forEach(el=>{ if(el.closest('#supportingDocumentsSection')) el.title='सुरक्षा कारणों से page दोबारा खुलने पर file फिर चुननी होगी।'; });
  }

  function bind(){
    if(!isRation()) return;
    tightenValidation(); removeFamilyHelper();
    const form=document.getElementById('dynamicApplicationForm'); if(!form||form.dataset.rationDraftBound==='1') return;
    form.dataset.rationDraftBound='1';
    form.addEventListener('input',e=>{ if(e.target?.type!=='file') saveDraft(); },true);
    form.addEventListener('change',e=>{ if(e.target?.type!=='file') saveDraft(); },true);
    form.addEventListener('click',e=>{
      if(e.target.closest('.smh-next,.smh-prev,.smh-ration-step,.smh-save-member,.smh-add-member')) setTimeout(saveDraft,80);
    },true);
    clearTimeout(restoreTimer); restoreTimer=setTimeout(()=>{restoreDraft(); tightenValidation(); removeFamilyHelper();},250);
  }

  const obs=new MutationObserver(()=>requestAnimationFrame(bind));
  function start(){ bind(); obs.observe(document.body,{childList:true,subtree:true,characterData:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();