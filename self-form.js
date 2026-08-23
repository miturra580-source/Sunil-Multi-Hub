(() => {
  const cfg = window.SMH_CONFIG || {};
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey || cfg.supabaseKey, {auth:{persistSession:false,autoRefreshToken:false}});
  const $ = id => document.getElementById(id);
  const form = $('selfForm');
  const centerId = new URLSearchParams(location.search).get('center');
  const clean = v => String(v || '').trim();
  const fail = t => { $('formError').textContent=t; $('formError').style.display='block'; };
  const appNo = () => { const d=new Date(); const ds=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; return `SMH-${ds}-${Math.random().toString(36).slice(2,7).toUpperCase()}`; };

  async function init(){
    if(!centerId){ $('centerBox').textContent='Invalid CSC link'; $('submitBtn').disabled=true; return; }
    const {data,error}=await sb.rpc('get_public_csc_center',{p_center_id:centerId});
    if(error || !data || !data.length){ $('centerBox').textContent='CSC centre उपलब्ध नहीं है'; $('submitBtn').disabled=true; return; }
    $('centerBox').textContent=`🏪 ${data[0].center_name || data[0].full_name || 'CSC Centre'}`;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault(); $('formError').style.display='none'; $('formSuccess').style.display='none';
    if(!centerId) return fail('Invalid CSC link.');
    const fd=new FormData(form), mobile=clean(fd.get('mobile')).replace(/\D/g,''), aadhaar=clean(fd.get('aadhaar')).replace(/\D/g,''), pan=clean(fd.get('pan')).toUpperCase();
    if(!/^[6-9]\d{9}$/.test(mobile)) return fail('सही 10 digit mobile number भरें।');
    if(aadhaar && !/^\d{12}$/.test(aadhaar)) return fail('Aadhaar 12 digits होना चाहिए।');
    if(pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return fail('PAN format सही नहीं है।');
    const no=appNo();
    const payload={owner_id:centerId,application_no:no,service_name:clean(fd.get('service_name')),full_name:clean(fd.get('full_name')),father_or_husband_name:clean(fd.get('father_or_husband_name')),mother_name:clean(fd.get('mother_name')),dob:clean(fd.get('dob'))||null,gender:clean(fd.get('gender')),mobile,email:clean(fd.get('email')),aadhaar:aadhaar||null,pan:pan||null,address:clean(fd.get('address')),village_city:clean(fd.get('village_city')),post_police:clean(fd.get('post_police')),district:clean(fd.get('district')),state:clean(fd.get('state')),pincode:clean(fd.get('pincode')),notes:clean(fd.get('notes')),consent:true,status:'new',source:'public_self_form'};
    $('submitBtn').disabled=true; $('submitBtn').textContent='Submitting...';
    const {error}=await sb.from('customer_intakes').insert(payload);
    if(error) fail(error.message); else { form.reset(); form.querySelector('[name="state"]').value='Uttar Pradesh'; $('formSuccess').innerHTML=`<strong>Submitted successfully</strong><br>Application ID: <b>${no}</b><br>इस ID का screenshot रख लें।`; $('formSuccess').style.display='block'; }
    $('submitBtn').disabled=false; $('submitBtn').textContent='Submit Details';
  });
  init();
})();