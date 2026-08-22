const toast=document.getElementById('toast');
let tm,me=null,currentOrders=[],services=[];

function msg(t){
 if(!toast)return;
 toast.textContent=t;
 toast.classList.add('show');
 clearTimeout(tm);
 tm=setTimeout(()=>toast.classList.remove('show'),2500);
}

function money(v){return '₹'+Number(v||0).toLocaleString('en-IN')}

function esc(s=''){
 return String(s).replace(/[&<>"']/g,m=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 })[m]);
}

function makeClient(){
 const cfg=window.SMH_CONFIG||{};
 if(!cfg.supabaseUrl||!(cfg.supabaseAnonKey||cfg.supabaseKey))
  throw new Error('Supabase config missing');

 return window.supabase.createClient(
  cfg.supabaseUrl,
  cfg.supabaseAnonKey||cfg.supabaseKey,
  {auth:{persistSession:true,autoRefreshToken:true}}
 );
}

const sb=makeClient();

async function boot(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session)return location.replace('auth.html');

 me=session.user;

 const {data:profile,error}=await sb.from('profiles')
 .select('id,email,full_name,role')
 .eq('id',me.id).maybeSingle();

 if(error)return setApi(false,error.message);

 if(profile?.role!=='admin'){
  msg('Admin access required');
  setTimeout(()=>location.replace('dashboard.html'),700);
  return;
 }

 loggedIn.textContent=
 `Logged in: ${profile.full_name||profile.email||me.email}`;

 setupModals();
 await loadAll();
}

function setApi(ok,text){
 apiBadge.textContent=ok?'Connected':'Not Connected';
 apiBadge.className='status '+(ok?'completed':'pending');
 apiText.textContent=text||'';
}

async function loadAll(){
 try{
  await Promise.all([loadOrders(),loadServices(),loadUsers()]);
  setApi(true,'Connected to Supabase • Live data');
 }catch(e){
  setApi(false,e.message);
  msg(e.message);
 }
}


/* ORDERS */

async function loadOrders(){
 const {data,error}=await sb.from('orders')
 .select(`
 id,user_id,service_id,note,status,amount,created_at,updated_at,
 profiles(full_name,email,phone),
 services(name)
 `)
 .order('created_at',{ascending:false});

 if(error)throw error;

 currentOrders=data||[];
 ordersCount.textContent=currentOrders.length;

 revenueCount.textContent=money(
  currentOrders
  .filter(x=>x.status==='completed')
  .reduce((a,b)=>a+Number(b.amount||0),0)
 );

 ordersWrap.innerHTML=currentOrders.length
 ?currentOrders.map(o=>`
 <article class="admin-order-card">
  <div class="admin-order-top">
   <div>
    <strong>${esc(o.services?.name||'Service')}</strong>
    <small>${esc(o.profiles?.full_name||o.profiles?.email||'Customer')}</small>
    <small>${new Date(o.created_at).toLocaleString('en-IN')}</small>
   </div>
   <span class="status ${esc(o.status)}">${esc(o.status)}</span>
  </div>

  ${o.note?`<div class="admin-order-note">${esc(o.note)}</div>`:''}

  <div class="admin-order-bottom">
   <div>
    <small>Amount</small>
    <div class="admin-order-amount">${money(o.amount)}</div>
   </div>

   <button class="btn primary edit-order" data-id="${o.id}">
    Edit Order
   </button>
  </div>
 </article>`).join('')
 :'<p>No orders yet.</p>';

 document.querySelectorAll('.edit-order').forEach(b=>{
  b.onclick=()=>openOrder(b.dataset.id);
 });
}

function openOrder(id){
 const o=currentOrders.find(x=>String(x.id)===String(id));
 if(!o)return;

 editOrderId.value=o.id;
 editOrderService.textContent=o.services?.name||'Service';
 editOrderCustomer.textContent=
 o.profiles?.full_name||o.profiles?.email||'Customer';
 editOrderStatus.value=o.status||'pending';
 editOrderAmount.value=Number(o.amount||0);
 editOrderNote.value=o.note||'';

 orderEditModal.classList.add('show');
 document.body.style.overflow='hidden';
}

async function saveOrder(){
 const id=editOrderId.value;

 saveOrderEdit.disabled=true;

 const {error}=await sb.from('orders').update({
  status:editOrderStatus.value,
  amount:Number(editOrderAmount.value||0),
  updated_at:new Date().toISOString()
 }).eq('id',id);

 saveOrderEdit.disabled=false;

 if(error)return msg(error.message);

 closeOrder();
 msg('Order updated');
 await loadOrders();
}

function closeOrder(){
 orderEditModal.classList.remove('show');
 document.body.style.overflow='';
}


/* SERVICES */

async function loadServices(){
 const {data,error}=await sb.from('services')
 .select(`
 id,name,description,price,active,sort_order,
 category,icon,required_documents,instructions
 `)
 .order('sort_order',{ascending:true});

 if(error)throw error;

 services=data||[];
 servicesCount.textContent=services.length;

 servicesWrap.innerHTML=services.length
 ?services.map(s=>`
 <div class="service-row">

  <div>
   <strong>${esc(s.icon||'🧩')} ${esc(s.name)}</strong>

   <span class="service-admin-meta">
    ${esc(s.category||'Other')}
    • ${s.active?'Active':'Inactive'}
    • ${money(s.price)}
    • Sort ${Number(s.sort_order||0)}
   </span>

   ${s.description
    ?`<span class="service-admin-meta">${esc(s.description)}</span>`
    :''
   }
  </div>

  <div class="row-actions">

   <button class="btn secondary edit-service"
    data-id="${s.id}">
    Edit
   </button>

   <button class="btn secondary toggle-service"
    data-id="${s.id}">
    ${s.active?'Disable':'Enable'}
   </button>

   <button class="btn secondary delete-service"
    data-id="${s.id}">
    Delete
   </button>

  </div>

 </div>`).join('')
 :'<p>No services.</p>';

 document.querySelectorAll('.edit-service').forEach(b=>{
  b.onclick=()=>openServiceEditor(b.dataset.id);
 });

 document.querySelectorAll('.toggle-service').forEach(b=>{
  b.onclick=()=>toggleService(b.dataset.id);
 });

 document.querySelectorAll('.delete-service').forEach(b=>{
  b.onclick=()=>deleteService(b.dataset.id);
 });
}

function openServiceEditor(id=null){
 let s=null;

 if(id)s=services.find(x=>String(x.id)===String(id));

 editServiceId.value=s?.id||'';
 serviceModalHeading.textContent=s?'Edit Service':'Add Service';

 editServiceName.value=s?.name||'';
 editServicePrice.value=Number(s?.price||0);
 editServiceIcon.value=s?.icon||'🧩';
 editServiceCategory.value=s?.category||'Other';
 editServiceSort.value=Number(s?.sort_order||nextSort());
 editServiceDescription.value=s?.description||'';
 editServiceDocuments.value=s?.required_documents||'';
 editServiceInstructions.value=s?.instructions||
 'आवेदन से पहले सभी जानकारी और दस्तावेज़ जाँच लें।';
 editServiceActive.value=String(s?.active??true);

 serviceEditModal.classList.add('show');
 document.body.style.overflow='hidden';
}

function nextSort(){
 return services.length
 ?Math.max(...services.map(x=>Number(x.sort_order||0)))+10
 :10;
}

async function saveService(){
 const id=editServiceId.value;

 const payload={
  name:editServiceName.value.trim(),
  price:Number(editServicePrice.value||0),
  icon:editServiceIcon.value.trim()||'🧩',
  category:editServiceCategory.value,
  sort_order:Number(editServiceSort.value||0),
  description:editServiceDescription.value.trim(),
  required_documents:editServiceDocuments.value.trim(),
  instructions:editServiceInstructions.value.trim(),
  active:editServiceActive.value==='true'
 };

 if(!payload.name)return msg('Service name required');

 saveServiceEdit.disabled=true;

 let result;

 if(id){
  result=await sb.from('services').update(payload).eq('id',id);
 }else{
  result=await sb.from('services').insert(payload);
 }

 saveServiceEdit.disabled=false;

 if(result.error)return msg(result.error.message);

 closeServiceEditor();
 msg(id?'Service updated':'Service added');
 await loadServices();
}

async function toggleService(id){
 const s=services.find(x=>String(x.id)===String(id));
 if(!s)return;

 const {error}=await sb.from('services')
 .update({active:!s.active})
 .eq('id',id);

 if(error)return msg(error.message);

 msg('Service updated');
 await loadServices();
}

async function deleteService(id){
 if(!confirm('Delete this service?'))return;

 const {error}=await sb.from('services').delete().eq('id',id);

 if(error)return msg(error.message);

 msg('Service deleted');
 await loadServices();
}

function closeServiceEditor(){
 serviceEditModal.classList.remove('show');
 document.body.style.overflow='';
}


/* USERS */

async function loadUsers(){
 const {data,error}=await sb.from('profiles')
 .select('id,full_name,email,phone,role,created_at')
 .order('created_at',{ascending:false});

 if(error)throw error;

 const rows=data||[];
 usersCount.textContent=rows.length;

 usersWrap.innerHTML=rows.map(u=>`
 <div class="service-row">
  <div>
   <strong>${esc(u.full_name||u.email||'User')}</strong>
   <small>${esc(u.email||'')} ${u.phone?'• '+esc(u.phone):''}</small>
  </div>
  <span class="status ${u.role==='admin'?'completed':'pending'}">
   ${esc(u.role||'customer')}
  </span>
 </div>
 `).join('');
}


/* MODALS + BUTTONS */

function setupModals(){

 closeOrderModal.onclick=closeOrder;
 cancelOrderEdit.onclick=closeOrder;
 saveOrderEdit.onclick=saveOrder;

 closeServiceModal.onclick=closeServiceEditor;
 cancelServiceEdit.onclick=closeServiceEditor;
 saveServiceEdit.onclick=saveService;

 orderEditModal.onclick=e=>{
  if(e.target===orderEditModal)closeOrder();
 };

 serviceEditModal.onclick=e=>{
  if(e.target===serviceEditModal)closeServiceEditor();
 };

 addServiceBtn.onclick=()=>openServiceEditor();

 refreshBtn.onclick=loadAll;

 logoutBtn.onclick=async()=>{
  await sb.auth.signOut();
  location.href='auth.html';
 };
}

boot();
