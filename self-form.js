(() => {
  const cfg = window.SMH_CONFIG || {};
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey || cfg.supabaseKey, {auth:{persistSession:false,autoRefreshToken:false}});
  const $ = id => document.getElementById(id);
  const form = $('selfForm');
  const centerId = new URLSearchParams(location.search).get('center');
  let services = [];
  let activeService = null;
  const clean = v => String(v || '').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fail = t => { $('formError').textContent=t; $('formError').style.display='block'; $('formError').scrollIntoView({behavior:'smooth',block:'center'}); };
  const appNo = () => { const d=new Date(); const ds=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; return `SMH-${ds}-${Math.random().toString(36).slice(2,8).toUpperCase()}`; };
  const baseKeys = new Set(['full_name','father_name','father_or_husband_name','mother_name','date_of_birth','dob','gender','mobile','email','aadhaar','aadhaar_number','pan','address','address_line','district','state','pincode']);

  function fieldHtml(f){
    const req=f.required?' required':''; const label=`${esc(f.label||f.field_key)}${f.required?' *':''}`; const help=f.help_text?`<small class="meta">${esc(f.help_text)}</small>`:'';
    if(f.field_type==='textarea') return `<label class="f full">${label}<textarea name="dyn_${esc(f.field_key)}" placeholder="${esc(f.placeholder||'')}"${req}></textarea>${help}</label>`;
    if(f.field_type==='select' || f.field_type==='radio'){
      const opts=(Array.isArray(f.options)?f.options:[]).map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('');
      return `<label class="f">${label}<select name="dyn_${esc(f.field_key)}"${req}><option value="">Select</option>${opts}</select>${help}</label>`;
    }
    const type=['date','email','tel','number'].includes(f.field_type)?f.field_type:'text';
    return `<label class="f">${label}<input type="${type}" name="dyn_${esc(f.field_key)}" placeholder="${esc(f.placeholder||'')}" ${f.max_length?`maxlength="${Number(f.max_length)}"`:''}${req}>${help}</label>`;
  }

  function renderService(){
    const id=$('serviceSelect').value; activeService=services.find(s=>String(s.id)===String(id))||null;
    if(!activeService){$('serviceInfo').style.display='none';$('dynamicSection').style.display='none';$('documentsSection').style.display='none';return;}
    const charge=Number(activeService.service_charge||activeService.price||0);
    const reqDocs=clean(activeService.required_documents).split(/\n+/).filter(Boolean);
    const docs=Array.isArray(activeService.documents)?activeService.documents:[];
    const docNames=docs.length?docs.map(d=>d.name):reqDocs;
    $('serviceInfo').innerHTML=`<h3>${esc(activeService.icon||'🧩')} ${esc(activeService.name)}</h3><div class="meta">${esc(activeService.description||'')}</div>${charge>0?`<div style="margin-top:7px;font-weight:800;color:#1557d6">Service Charge: ₹${charge.toLocaleString('en-IN')}</div>`:''}${docNames.length?`<div style="margin-top:10px"><strong>लगने वाले documents:</strong><br>${docNames.map(x=>`• ${esc(x)}`).join('<br>')}</div>`:''}${activeService.instructions?`<div class="meta" style="margin-top:10px"><strong>Instructions:</strong> ${esc(activeService.instructions)}</div>`:''}`;
    $('serviceInfo').style.display='block';
    const fields=(Array.isArray(activeService.fields)?activeService.fields:[]).filter(f=>!baseKeys.has(String(f.field_key||'').toLowerCase()));
    $('dynamicFields').innerHTML=fields.map(fieldHtml).join(''); $('dynamicSection').style.display=fields.length?'block':'none';
    const uploadDocs = docs.length ? docs : reqDocs.map((name,i)=>({name,document_key:`doc_${i+1}`,instructions:''}));
    $('documentInputs').innerHTML=uploadDocs.map(d=>`<div class="doc-line"><label class="f">${esc(d.name)} <span class="optional">(Optional)</span><input type="file" data-doc-name="${esc(d.name)}" accept=".pdf,.jpg,.jpeg,.png,.webp"></label>${d.instructions?`<div class="meta">${esc(d.instructions)}</div>`:''}</div>`).join('');
    $('documentsSection').style.display='block';
  }

  async function init(){
    if(!centerId){ $('centerBox').textContent='Invalid CSC link'; $('submitBtn').disabled=true; return; }
    const [centerRes,servicesRes]=await Promise.all([sb.rpc('get_public_csc_center',{p_center_id:centerId}),sb.rpc('get_public_csc_services')]);
    if(centerRes.error || !centerRes.data || !centerRes.data.length){ $('centerBox').textContent='CSC centre उपलब्ध नहीं है'; $('submitBtn').disabled=true; return; }
    $('centerBox').textContent=`🏪 ${centerRes.data[0].center_name || centerRes.data[0].full_name || 'CSC Centre'}`;
    if(servicesRes.error) return fail(servicesRes.error.message);
    services=Array.isArray(servicesRes.data)?servicesRes.data:(servicesRes.data?.get_public_csc_services||[]);
    $('serviceSelect').innerHTML='<option value="">Select Service</option>'+services.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
    $('serviceSelect').addEventListener('change',renderService);
  }

  async function uploadDocuments(intakeId,applicationNo){
    const inputs=[...form.querySelectorAll('input[type="file"][data-doc-name]')];
    const uploaded=[];
    for(const input of inputs){
      const file=input.files?.[0]; if(!file) continue;
      if(file.size>10*1024*1024) throw new Error(`${input.dataset.docName}: file 10MB से कम रखें।`);
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100);
      const path=`${centerId}/${applicationNo}/${Date.now()}-${Math.random().toString(36).slice(2,7)}-${safe}`;
      const up=await sb.storage.from('customer-intake-docs').upload(path,file,{upsert:false,contentType:file.type||undefined});
      if(up.error) throw up.error;
      const row=await sb.from('customer_intake_documents').insert({intake_id:intakeId,owner_id:centerId,document_name:input.dataset.docName||'Document',storage_path:path,original_file_name:file.name,mime_type:file.type||null,file_size:file.size});
      if(row.error) throw row.error;
      uploaded.push(path);
    }
    return uploaded;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault(); $('formError').style.display='none'; $('formSuccess').style.display='none';
    if(!centerId || !activeService) return fail('पहले service select करें।');
    const fd=new FormData(form), mobile=clean(fd.get('mobile')).replace(/\D/g,''), aadhaar=clean(fd.get('aadhaar')).replace(/\D/g,''), pan=clean(fd.get('pan')).toUpperCase();
    if(!/^[6-9]\d{9}$/.test(mobile)) return fail('सही 10 digit mobile number भरें।');
    if(aadhaar && !/^\d{12}$/.test(aadhaar)) return fail('Aadhaar 12 digits होना चाहिए।');
    if(pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return fail('PAN format सही नहीं है।');
    const formData={}; for(const [k,v] of fd.entries()){ if(k.startsWith('dyn_')) formData[k.slice(4)]=clean(v); }
    const no=appNo();
    const payload={owner_id:centerId,service_id:activeService.id,application_no:no,service_name:activeService.name,full_name:clean(fd.get('full_name')),father_or_husband_name:clean(fd.get('father_or_husband_name')),mother_name:clean(fd.get('mother_name')),dob:clean(fd.get('dob'))||null,gender:clean(fd.get('gender')),mobile,email:clean(fd.get('email')),aadhaar:aadhaar||null,pan:pan||null,address:clean(fd.get('address')),village_city:clean(fd.get('village_city')),post_police:clean(fd.get('post_police')),district:clean(fd.get('district')),state:clean(fd.get('state')),pincode:clean(fd.get('pincode')),notes:clean(fd.get('notes')),form_data:formData,consent:true,status:'new',source:'public_self_form'};
    $('submitBtn').disabled=true; $('submitBtn').textContent='Submitting...';
    try{
      const res=await sb.from('customer_intakes').insert(payload).select('id').single(); if(res.error) throw res.error;
      await uploadDocuments(res.data.id,no);
      form.reset(); $('serviceInfo').style.display='none'; $('dynamicSection').style.display='none'; $('documentsSection').style.display='none'; activeService=null;
      $('formSuccess').innerHTML=`<strong>Application Submitted ✅</strong><br><br>Your Application ID:<br><b style="font-size:22px">${no}</b><br><br>इस नंबर का screenshot रख लें। CSC centre इसी ID से status update करेगा।`;
      $('formSuccess').style.display='block'; $('formSuccess').scrollIntoView({behavior:'smooth',block:'center'});
    }catch(err){ fail(err.message||'Submit नहीं हो पाया।'); }
    finally{$('submitBtn').disabled=false;$('submitBtn').textContent='Submit Application';}
  });
  init().catch(e=>fail(e.message));
})();