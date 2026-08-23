(() => {
  const cfg = window.SMH_CONFIG || {};
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey || cfg.supabaseKey, {auth:{persistSession:false,autoRefreshToken:false}});
  const $ = id => document.getElementById(id);
  const form = $('selfForm');
  const centerId = new URLSearchParams(location.search).get('center');
  const clean = v => String(v || '').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fail = t => { $('formError').textContent=t; $('formError').style.display='block'; $('formError').scrollIntoView({behavior:'smooth',block:'center'}); };
  const appNo = () => { const d=new Date(); const ds=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; return `SMH-${ds}-${Math.random().toString(36).slice(2,7).toUpperCase()}`; };
  let services=[];
  let activeService=null;

  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN');}
  function serviceFee(s){return Number(s?.service_charge||s?.price||0);}

  function renderCatalog(){
    $('serviceSelect').innerHTML='<option value="">Select Service</option>'+services.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
    $('serviceGrid').innerHTML=services.length?services.map(s=>`<button type="button" class="service-card" data-service-id="${esc(s.id)}"><span class="icon">${esc(s.icon||'🧩')}</span><strong>${esc(s.name)}</strong><small>${esc(s.description||'Online Service')}</small>${serviceFee(s)>0?`<small style="color:#1557d6;font-weight:800">Service Charge: ${money(serviceFee(s))}</small>`:''}</button>`).join(''):'<p>कोई active service उपलब्ध नहीं है।</p>';
    document.querySelectorAll('.service-card').forEach(b=>b.onclick=()=>selectService(b.dataset.serviceId,true));
    $('serviceSelect').onchange=()=>selectService($('serviceSelect').value,false);
  }

  function docItems(s){
    const docs=Array.isArray(s.documents)?s.documents:[];
    if(docs.length) return docs.map(d=>`<li>${d.required?'* ':''}${esc(d.name)}${d.instructions?` — ${esc(d.instructions)}`:''}</li>`).join('');
    const raw=clean(s.required_documents);
    if(raw) return raw.split(/\n+/).filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join('');
    return '<li>Application के अनुसार documents CSC operator बताएगा।</li>';
  }

  function renderField(field){
    const req=field.required?'required':'';
    const mark=field.required?' *':'';
    const min=field.min_length?`minlength="${Number(field.min_length)}"`:'';
    const max=field.max_length?`maxlength="${Number(field.max_length)}"`:'';
    let input='';
    if(field.field_type==='textarea') input=`<textarea name="dyn_${esc(field.field_key)}" placeholder="${esc(field.placeholder||'')}" ${req} ${min} ${max}></textarea>`;
    else if(field.field_type==='select'||field.field_type==='radio'){
      const opts=Array.isArray(field.options)?field.options:[];
      input=`<select name="dyn_${esc(field.field_key)}" ${req}><option value="">Select</option>${opts.map(o=>`<option value="${esc(typeof o==='string'?o:(o.value||o.label||''))}">${esc(typeof o==='string'?o:(o.label||o.value||''))}</option>`).join('')}</select>`;
    } else if(field.field_type==='checkbox') input=`<input type="checkbox" name="dyn_${esc(field.field_key)}" value="Yes" ${req}>`;
    else {
      const type=field.field_type==='date'?'date':field.field_type==='number'?'number':field.field_type==='email'?'email':field.field_type==='tel'?'tel':'text';
      input=`<input type="${type}" name="dyn_${esc(field.field_key)}" placeholder="${esc(field.placeholder||'')}" ${req} ${min} ${max}>`;
    }
    return `<label class="f">${esc(field.label||field.field_key)}${mark}${input}${field.help_text?`<small style="display:block;color:#667085;margin-top:5px;font-weight:500">${esc(field.help_text)}</small>`:''}</label>`;
  }

  function selectService(id,scroll){
    activeService=services.find(s=>String(s.id)===String(id))||null;
    $('serviceId').value=activeService?.id||'';
    $('serviceSelect').value=activeService?.id||'';
    document.querySelectorAll('.service-card').forEach(b=>b.classList.toggle('active',activeService&&String(b.dataset.serviceId)===String(activeService.id)));
    if(!activeService){$('serviceDetails').classList.remove('show');$('dynamicServiceFieldsWrap').style.display='none';return;}
    const fee=serviceFee(activeService);
    $('serviceDetails').innerHTML=`<h3>${esc(activeService.icon||'🧩')} ${esc(activeService.name)}</h3><p style="color:#667085;line-height:1.6">${esc(activeService.description||'')}</p><div class="detail-grid"><div class="detail-box"><small>Service Charge</small><strong>${fee>0?money(fee):'₹0 / As applicable'}</strong></div><div class="detail-box"><small>Category</small><strong>${esc(activeService.category||'Service')}</strong></div></div><div class="detail-box" style="margin-top:10px"><small>Required Documents</small><ul class="doc-list">${docItems(activeService)}</ul></div><div class="detail-box" style="margin-top:10px"><small>Important Instructions</small><div style="margin-top:6px;line-height:1.6">${esc(activeService.instructions||'सभी जानकारी और documents submit करने से पहले जाँच लें।')}</div></div>`;
    $('serviceDetails').classList.add('show');
    const fields=Array.isArray(activeService.fields)?activeService.fields:[];
    $('dynamicServiceFields').innerHTML=fields.map(renderField).join('');
    $('dynamicServiceFieldsWrap').style.display=fields.length?'block':'none';
    if(scroll) $('serviceDetails').scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function init(){
    if(!centerId){ $('centerBox').textContent='Invalid CSC link'; $('submitBtn').disabled=true; return; }
    const [centerRes,servicesRes]=await Promise.all([sb.rpc('get_public_csc_center',{p_center_id:centerId}),sb.rpc('get_public_csc_services')]);
    if(centerRes.error || !centerRes.data || !centerRes.data.length){ $('centerBox').textContent='CSC centre उपलब्ध नहीं है'; $('submitBtn').disabled=true; return; }
    $('centerBox').textContent=`🏪 ${centerRes.data[0].center_name || centerRes.data[0].full_name || 'CSC Centre'}`;
    if(servicesRes.error){fail('Services load नहीं हुई: '+servicesRes.error.message);return;}
    services=Array.isArray(servicesRes.data)?servicesRes.data:[];
    renderCatalog();
  }

  form.addEventListener('submit', async e => {
    e.preventDefault(); $('formError').style.display='none'; $('formSuccess').style.display='none';
    if(!centerId) return fail('Invalid CSC link.');
    if(!activeService) return fail('पहले service select करें।');
    const fd=new FormData(form), mobile=clean(fd.get('mobile')).replace(/\D/g,''), aadhaar=clean(fd.get('aadhaar')).replace(/\D/g,''), pan=clean(fd.get('pan')).toUpperCase();
    if(!/^[6-9]\d{9}$/.test(mobile)) return fail('सही 10 digit mobile number भरें।');
    if(aadhaar && !/^\d{12}$/.test(aadhaar)) return fail('Aadhaar 12 digits होना चाहिए।');
    if(pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return fail('PAN format सही नहीं है।');
    const extra={};
    (activeService.fields||[]).forEach(f=>{const key=`dyn_${f.field_key}`; const el=form.elements[key]; if(!el)return; extra[f.field_key]=el.type==='checkbox'?(el.checked?'Yes':'No'):clean(fd.get(key));});
    const no=appNo();
    const payload={owner_id:centerId,service_id:activeService.id,application_no:no,service_name:activeService.name,full_name:clean(fd.get('full_name')),father_or_husband_name:clean(fd.get('father_or_husband_name')),mother_name:clean(fd.get('mother_name')),dob:clean(fd.get('dob'))||null,gender:clean(fd.get('gender')),mobile,email:clean(fd.get('email')),aadhaar:aadhaar||null,pan:pan||null,address:clean(fd.get('address')),village_city:clean(fd.get('village_city')),post_police:clean(fd.get('post_police')),district:clean(fd.get('district')),state:clean(fd.get('state')),pincode:clean(fd.get('pincode')),notes:clean(fd.get('notes')),extra_form_data:extra,consent:true,status:'new',source:'public_self_form'};
    $('submitBtn').disabled=true; $('submitBtn').textContent='Submitting...';
    const {error}=await sb.from('customer_intakes').insert(payload);
    if(error) fail(error.message); else { form.reset(); form.querySelector('[name="state"]').value='Uttar Pradesh'; activeService=null; $('serviceDetails').classList.remove('show'); $('dynamicServiceFieldsWrap').style.display='none'; document.querySelectorAll('.service-card').forEach(b=>b.classList.remove('active')); $('formSuccess').innerHTML=`<strong>Submitted successfully</strong><br>Application ID: <b>${no}</b><br>इस ID का screenshot रख लें।`; $('formSuccess').style.display='block'; $('formSuccess').scrollIntoView({behavior:'smooth',block:'center'}); }
    $('submitBtn').disabled=false; $('submitBtn').textContent='Submit Details';
  });
  init().catch(e=>fail(e.message||'Form load failed'));
})();