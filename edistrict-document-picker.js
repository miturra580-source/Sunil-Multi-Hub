(() => {
  const MAX_BYTES = 100 * 1024;
  const ALLOWED = ['image/jpeg','image/png'];

  function isEdistrict(){
    const t=(document.getElementById('applicationServiceName')?.textContent||'').toLowerCase();
    return t.includes('edistrict') || t.includes('आय प्रमाण') || t.includes('जाति प्रमाण') || t.includes('निवास प्रमाण');
  }

  function cleanText(s){ return String(s||'').replace(/\*/g,'').replace(/\s+/g,' ').trim(); }

  function ensureStyles(){
    if(document.getElementById('smhEdistrictPickerStyles')) return;
    const st=document.createElement('style'); st.id='smhEdistrictPickerStyles'; st.textContent=`
      #supportingDocumentsSection.smh-doc-picker-ready [data-document-wrap]{display:none!important}
      .smh-doc-picker{border:1px solid #dfe5ed;border-radius:14px;padding:12px;background:#fff;margin-top:10px}
      .smh-doc-picker-row{display:grid;grid-template-columns:minmax(160px,1fr) minmax(190px,1.25fr) auto;gap:8px;align-items:center}
      .smh-doc-picker select,.smh-doc-picker input[type=file]{width:100%;min-height:42px;border:1px solid #d4dce7;border-radius:9px;background:#fff;padding:8px;box-sizing:border-box;font:inherit}
      .smh-doc-picker button{min-height:42px;padding:0 18px;border:0;border-radius:9px;background:#2563eb;color:#fff;font-weight:800;cursor:pointer}
      .smh-doc-note{font-size:11px;color:#667085;margin:8px 0 0}
      .smh-doc-list{margin-top:12px;border-top:1px solid #edf0f4;padding-top:10px}
      .smh-doc-list h4{margin:0 0 7px;font-size:13px}.smh-doc-item{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:7px 9px;border:1px solid #e7ebf0;border-radius:9px;margin:6px 0;background:#fafcff;font-size:12px}
      .smh-doc-remove{border:0!important;background:#fff1f1!important;color:#b42318!important;min-height:30px!important;padding:0 9px!important}
      @media(max-width:600px){.smh-doc-picker-row{grid-template-columns:1fr}.smh-doc-picker button{width:100%}}
    `; document.head.appendChild(st);
  }

  function dataTransferWith(file){ const dt=new DataTransfer(); if(file) dt.items.add(file); return dt.files; }

  function enhance(){
    if(!isEdistrict()) return;
    const section=document.getElementById('supportingDocumentsSection');
    if(!section || section.dataset.smhPicker==='1') return;
    const wraps=[...section.querySelectorAll('[data-document-wrap]')];
    if(!wraps.length) return;
    ensureStyles();
    section.dataset.smhPicker='1'; section.classList.add('smh-doc-picker-ready');

    const docs=wraps.map((wrap,idx)=>{
      const input=wrap.querySelector('input[type=file]');
      if(!input) return null;
      const label=cleanText(wrap.querySelector('strong,label')?.textContent || wrap.textContent || `दस्तावेज़ ${idx+1}`);
      return {wrap,input,label,required: input.required || input.dataset.required==='true'};
    }).filter(Boolean);

    const picker=document.createElement('div'); picker.className='smh-doc-picker';
    picker.innerHTML=`<div class="smh-doc-picker-row"><select id="smhDocType"><option value="">संलग्नक शीर्षक चुनें</option></select><input id="smhDocFile" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png"><button type="button" id="smhDocAdd">अपलोड</button></div><div class="smh-doc-note">केवल JPG/JPEG/PNG • अधिकतम 100 KB प्रति दस्तावेज़</div><div class="smh-doc-list"><h4>संलग्नकों की सूची</h4><div id="smhDocItems"><span style="color:#98a2b3">अभी कोई दस्तावेज़ नहीं जोड़ा गया।</span></div></div>`;
    section.appendChild(picker);
    const sel=picker.querySelector('#smhDocType'), fileInput=picker.querySelector('#smhDocFile'), items=picker.querySelector('#smhDocItems');
    docs.forEach((d,i)=>{ const o=document.createElement('option'); o.value=String(i); o.textContent=d.label+(d.required?' *':''); sel.appendChild(o); });

    function renderList(){
      const active=docs.map((d,i)=>({d,i,file:d.input.files?.[0]})).filter(x=>x.file);
      if(!active.length){ items.innerHTML='<span style="color:#98a2b3">अभी कोई दस्तावेज़ नहीं जोड़ा गया।</span>'; return; }
      items.innerHTML='';
      active.forEach(({d,i,file})=>{
        const row=document.createElement('div'); row.className='smh-doc-item';
        row.innerHTML=`<span><strong>${d.label}</strong><br><small>${file.name} • ${(file.size/1024).toFixed(1)} KB</small></span><button type="button" class="smh-doc-remove">हटाएँ</button>`;
        row.querySelector('button').onclick=()=>{ d.input.value=''; renderList(); };
        items.appendChild(row);
      });
    }

    picker.querySelector('#smhDocAdd').onclick=()=>{
      const idx=Number(sel.value); if(!Number.isInteger(idx) || !docs[idx]){ alert('पहले संलग्नक शीर्षक चुनें।'); return; }
      const file=fileInput.files?.[0]; if(!file){ alert('पहले फाइल चुनें।'); return; }
      const typeOk=ALLOWED.includes(file.type) || /\.(jpe?g|png)$/i.test(file.name||'');
      if(!typeOk){ alert('केवल JPG/JPEG/PNG फाइल अपलोड करें।'); fileInput.value=''; return; }
      if(file.size>MAX_BYTES){ alert('फाइल 100 KB से अधिक नहीं हो सकती।'); fileInput.value=''; return; }
      docs[idx].input.files=dataTransferWith(file);
      docs[idx].input.dispatchEvent(new Event('change',{bubbles:true}));
      fileInput.value=''; sel.value=''; renderList();
    };

    renderList();
  }

  const start=()=>{enhance();new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();