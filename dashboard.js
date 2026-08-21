const toast=document.getElementById('toast');
let tm;
function msg(t){
  toast.textContent=t;
  toast.classList.add('show');
  clearTimeout(tm);
  tm=setTimeout(()=>toast.classList.remove('show'),2500);
}

function makeClient(){
  const cfg=window.SMH_CONFIG||{};
  const url=cfg.supabaseUrl;
  const key=cfg.supabaseAnonKey||cfg.supabaseKey;
  if(!url||!key) throw new Error('Supabase config missing');
  return window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}});
}
const sb=makeClient();
let user;

async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session) return location.replace('auth.html');
  user=session.user;
  document.getElementById('who').textContent=user.email;
  await loadServices();
  await loadOrders();
}

document.getElementById('logoutBtn').onclick=async()=>{
  await sb.auth.signOut();
  location.href='auth.html';
};

async function loadServices(){
  const {data,error}=await sb.from('services')
    .select('id,name,active')
    .eq('active',true)
    .order('sort_order');
  if(error) return msg(error.message);
  const select=document.getElementById('serviceSelect');
  select.innerHTML='<option value="">Select service</option>'+
    (data||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('serviceCount').textContent=(data||[]).length;
}

async function loadOrders(){
  const {data,error}=await sb.from('orders')
    .select('id,status,note,created_at,services(name)')
    .order('created_at',{ascending:false});
  if(error) return msg(error.message);
  const rows=data||[];
  document.getElementById('orderCount').textContent=rows.length;
  document.getElementById('pendingCount').textContent=rows.filter(x=>x.status==='pending').length;
  document.getElementById('doneCount').textContent=rows.filter(x=>x.status==='completed').length;
  document.getElementById('ordersList').innerHTML=rows.length
    ? rows.map(o=>`<div class="service-row"><div><strong>${o.services?.name||'Service'}</strong><small>${new Date(o.created_at).toLocaleString()}</small></div><span class="status ${o.status}">${o.status}</span></div>`).join('')
    : '<p>No orders yet.</p>';
}

document.getElementById('orderForm').onsubmit=async e=>{
  e.preventDefault();
  const service_id=document.getElementById('serviceSelect').value;
  if(!service_id) return msg('Service चुनें');
  const {error}=await sb.from('orders').insert({
    user_id:user.id,
    service_id,
    note:document.getElementById('orderNote').value.trim()
  });
  if(error) return msg(error.message);
  document.getElementById('orderNote').value='';
  msg('Request submitted');
  await loadOrders();
};

boot();
