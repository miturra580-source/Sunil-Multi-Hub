(() => {
  function esc(value='') {
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function isPanAadhaarOpen(){
    const service=(document.getElementById('applicationServiceName')?.textContent||'').toLowerCase();
    const variant=(document.getElementById('applicationVariantName')?.textContent||'').toLowerCase();
    return service.includes('pan') && variant.includes('aadhaar');
  }

  function notify(text){
    const toast=document.getElementById('toast');
    if(toast){
      toast.textContent=text;
      toast.classList.add('show');
      setTimeout(()=>toast.classList.remove('show'),2800);
    }
  }

  function makeClient(){
    const cfg=window.SMH_CONFIG||{};
    if(!window.supabase||!cfg.supabaseUrl||!(cfg.supabaseAnonKey||cfg.supabaseKey)) return null;
    return window.supabase.createClient(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey||cfg.supabaseKey,
      {auth:{persistSession:true,autoRefreshToken:true}}
    );
  }

  function buildPanel(){
    const panel=document.createElement('div');
    panel.id='smhCanonicalPanAadhaar';
    panel.innerHTML=`
      <div style="margin-top:18px;padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#fff">
        <label for="smhCanonicalAadhaar" style="display:block;font-weight:800;margin-bottom:8px">Aadhaar Number *</label>
        <input id="smhCanonicalAadhaar" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="12 digit Aadhaar Number" style="width:100%;box-sizing:border-box;padding:14px;border:1px solid #d7dee8;border-radius:12px;font:inherit">
        <small style="display:block;margin-top:7px;color:#667085">केवल 12 अंकों का Aadhaar Number भरें।</small>
      </div>
      <button type="button" id="smhCanonicalLookupBtn" class="btn primary" style="width:100%;min-height:52px;margin-top:16px">🔎 Find PAN by Aadhaar — ₹50</button>
      <div id="smhCanonicalLookupResult" style="display:none;margin-top:14px;padding:14px;border:1px solid #dfe5ee;border-radius:14px;background:#f8fafc"></div>
    `;

    const input=panel.querySelector('#smhCanonicalAadhaar');
    const btn=panel.querySelector('#smhCanonicalLookupBtn');
    const result=panel.querySelector('#smhCanonicalLookupResult');

    input.addEventListener('input',()=>{
      input.value=String(input.value||'').replace(/\D/g,'').slice(0,12);
    });

    btn.addEventListener('click',async()=>{
      const aadhaar=String(input.value||'').replace(/\D/g,'');
      if(!/^\d{12}$/.test(aadhaar)){
        notify('12 digit Aadhaar Number भरें');
        input.focus();
        return;
      }

      const sb=makeClient();
      if(!sb){
        notify('PAN lookup service अभी उपलब्ध नहीं है।');
        return;
      }

      btn.disabled=true;
      btn.textContent='PAN खोज रहे हैं...';
      result.style.display='block';
      result.innerHTML='<b>कृपया प्रतीक्षा करें...</b>';

      try{
        const {data,error}=await sb.functions.invoke('aadhaar-pan-lookup',{body:{aadhaar}});
        if(error) throw error;
        if(!data?.success) throw new Error(data?.message||'PAN lookup failed');

        result.innerHTML=`
          <div style="font-weight:800;color:#15803d;margin-bottom:10px">✅ PAN Data Found</div>
          <div><strong>PAN Number:</strong> ${esc(data.data?.pan||'')}</div>
          <div style="margin-top:7px"><strong>Aadhaar:</strong> ${esc(data.data?.aadhaar||('XXXX-XXXX-'+aadhaar.slice(-4)))}</div>
          <div style="margin-top:7px"><strong>Status:</strong> ${esc(data.data?.status||'SUCCESS')}</div>
          ${data.charged?`<div style="margin-top:10px;padding:9px;border-radius:10px;background:#ecfdf3;color:#027a48;font-weight:700">₹${esc(data.amount||50)} wallet से debit हुआ।</div>`:''}
        `;

        if(typeof window.refreshDashboardWallet==='function') await window.refreshDashboardWallet();
        notify('PAN data fetched successfully');
      }catch(err){
        const message=err?.context?.body?.message||err?.message||'PAN lookup failed';
        result.innerHTML=`<div style="color:#b42318;font-weight:700">${esc(message)}</div>`;
        notify(message);
      }finally{
        btn.disabled=false;
        btn.textContent='🔎 Find PAN by Aadhaar — ₹50';
      }
    });

    return panel;
  }

  let rendering=false;
  function render(){
    if(rendering||!isPanAadhaarOpen()) return;
    const form=document.getElementById('dynamicApplicationForm');
    const fields=document.getElementById('beneficiaryFields');
    if(!form||!fields) return;

    const current=fields.querySelector('#smhCanonicalPanAadhaar');
    const onlyCanonical=current && fields.children.length===1;
    if(onlyCanonical) return;

    rendering=true;
    form.style.setProperty('display','block','important');
    form.style.setProperty('visibility','visible','important');
    form.style.setProperty('opacity','1','important');

    fields.innerHTML='';
    fields.appendChild(buildPanel());

    const normalSubmit=document.getElementById('submitDynamicApplication');
    if(normalSubmit) normalSubmit.style.setProperty('display','none','important');
    const docs=document.getElementById('supportingDocumentsSection');
    if(docs) docs.style.setProperty('display','none','important');
    const eligibility=document.getElementById('eligibilitySection');
    if(eligibility) eligibility.style.setProperty('display','none','important');
    rendering=false;
  }

  const start=()=>{
    render();
    const obs=new MutationObserver(()=>requestAnimationFrame(render));
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',()=>setTimeout(render,80),true);
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();