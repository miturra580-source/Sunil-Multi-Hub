(() => {
  const SERVICE_ID='48e430f8-284c-4c11-b928-c0ce08c382f4';
  const VARIANTS={
    '520b4034-c653-4adf-abe0-ae2c26802c27':'आय प्रमाण पत्र',
    'ade52e59-df85-4b53-a0f3-556eeb3b479b':'जाति प्रमाण पत्र',
    '01519800-a804-4a73-97ea-84ab415ad376':'निवास प्रमाण पत्र'
  };
  const EDISTRICT_URL='https://edistrict.up.gov.in/';
  const cfg=window.SMH_CONFIG||{};
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey||cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const $=id=>document.getElementById(id);
  let session=null,apps=[],selected=null;

  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function showResult(text,ok=true){const el=$('resultBox');el.textContent=text;el.classList.remove('hidden');el.style.background=ok?'#eaf8ef':'#fff0f0';el.style.color=ok?'#16663b':'#9b2c2c';}
  function serviceName(app){return VARIANTS[app?.service_variant_id]||'प्रमाण पत्र';}
  function payload(app){
    const data=app?.form_data||{};
    return {
      application_id:app.id,
      application_no:app.application_no,
      service:serviceName(app),
      applicant_name:data.applicant_name||app.beneficiary_name||'',
      father_husband_name:data.father_husband_name||'',
      gender:data.gender||'',
      dob:data.dob||'',
      aadhaar_number:data.aadhaar_number||'',
      mobile:data.mobile||'',
      email:data.email||'',
      address:data.address||'',
      district:data.district||'',
      tehsil:data.tehsil||'',
      block:data.block||'',
      gram_panchayat:data.gram_panchayat||'',
      village_ward:data.village_ward||'',
      occupation:data.occupation||'',
      family_annual_income:data.family_annual_income||'',
      ration_card_no:data.ration_card_no||'',
      purpose:data.purpose||''
    };
  }

  async function boot(){
    const {data:{session:s}}=await sb.auth.getSession();
    if(!s){location.href='auth.html';return;}
    session=s;
    await load();
  }

  async function load(){
    $('edList').innerHTML='<p>Loading...</p>';
    const {data,error}=await sb.from('applications')
      .select('id,application_no,user_id,service_id,service_variant_id,status,beneficiary_name,form_data,amount,external_reference_no,admin_note,submitted_at,updated_at')
      .eq('user_id',session.user.id)
      .eq('service_id',SERVICE_ID)
      .in('service_variant_id',Object.keys(VARIANTS))
      .order('submitted_at',{ascending:false});
    if(error){$('edList').innerHTML='<p>Applications load नहीं हुईं।</p>';return;}
    apps=data||[];
    $('edList').innerHTML=apps.length?apps.map(a=>`<button class="ed-item" data-id="${a.id}" type="button"><strong>${esc(a.application_no||'Application')}</strong><small>${esc(serviceName(a))} • ${esc(a.beneficiary_name||a.form_data?.applicant_name||'Applicant')}</small><small>Status: ${esc((a.admin_note||'').includes('OTP pending')?'OTP Pending':(a.status||'submitted'))}</small>${a.external_reference_no?`<small>eDistrict: ${esc(a.external_reference_no)}</small>`:''}</button>`).join(''):'<p>कोई आय / जाति / निवास application नहीं मिला।</p>';
    document.querySelectorAll('.ed-item').forEach(btn=>btn.onclick=()=>selectApp(btn.dataset.id));
    if(selected){const fresh=apps.find(a=>a.id===selected.id);if(fresh)selectApp(fresh.id);}
  }

  function selectApp(id){
    selected=apps.find(a=>a.id===id);if(!selected)return;
    document.querySelectorAll('.ed-item').forEach(b=>b.classList.toggle('active',b.dataset.id===id));
    $('edEmpty').classList.add('hidden');$('edDetail').classList.remove('hidden');
    $('edAppNo').textContent=`${serviceName(selected)} — ${selected.application_no||selected.id.slice(0,8)}`;
    $('edStatus').textContent=(selected.admin_note||'').includes('OTP pending')?'OTP Pending':(selected.status||'submitted');
    $('edJson').textContent=JSON.stringify(payload(selected),null,2);
    $('externalRef').value=selected.external_reference_no||'';
    $('finalNote').value=selected.admin_note||'';
  }

  $('copyBtn').onclick=async()=>{if(!selected)return;await navigator.clipboard.writeText(JSON.stringify(payload(selected),null,2));showResult('Autofill data clipboard में copy हो गया। eDistrict page पर helper चलाएँ।');};
  $('openPortalBtn').onclick=()=>window.open(EDISTRICT_URL,'_blank','noopener');
  $('otpBtn').onclick=async()=>{if(!selected)return;const {error}=await sb.from('applications').update({status:'processing',admin_note:'Aadhaar OTP pending / manual verification required'}).eq('id',selected.id).eq('user_id',session.user.id);if(error)showResult(error.message,false);else{showResult('Application को OTP Pending mark कर दिया गया।');await load();}};
  $('refreshBtn').onclick=load;
  $('finalizeBtn').onclick=async()=>{
    if(!selected)return;
    const ref=$('externalRef').value.trim();
    if(!ref){showResult('eDistrict Application Number भरें।',false);return;}
    $('finalizeBtn').disabled=true;
    try{
      const {data,error}=await sb.functions.invoke('edistrict-finalize',{body:{application_id:selected.id,external_reference_no:ref,note:$('finalNote').value.trim()}});
      if(error)throw error;
      if(!data?.success)throw new Error(data?.message||'Finalize failed');
      showResult(`${serviceName(selected)} application ${ref} save हो गया। Wallet से ₹${Number(data.amount||0).toLocaleString('en-IN')} deduct हुआ।`);
      await load();
    }catch(e){showResult(e.message||'Finalize failed',false);}finally{$('finalizeBtn').disabled=false;}
  };
  boot();
})();