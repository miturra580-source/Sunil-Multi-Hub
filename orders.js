(() => {
  const cfg = window.SMH_CONFIG || {};
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey || cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
  const $ = id => document.getElementById(id);
  let rows = [];
  let currentFilter = new URLSearchParams(location.search).get('filter') || 'all';

  function esc(v=''){ return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function money(v){ return '₹'+Number(v||0).toLocaleString('en-IN'); }
  function dateTime(v){ if(!v) return '—'; try { return new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}); } catch { return String(v); } }
  function normalizedStatus(v){ return String(v||'pending').trim().toLowerCase(); }
  function isCompleted(s){ return ['completed','complete','done','success','delivered'].includes(normalizedStatus(s)); }
  function isCancelled(s){ return ['cancelled','canceled','rejected','failed'].includes(normalizedStatus(s)); }
  function isPending(s){ return !isCompleted(s) && !isCancelled(s); }

  function renderSummary(){
    $('summaryAll').textContent = rows.length;
    $('summaryPending').textContent = rows.filter(r=>isPending(r.status)).length;
    $('summaryCompleted').textContent = rows.filter(r=>isCompleted(r.status)).length;
  }

  function filtered(){
    if(currentFilter==='pending') return rows.filter(r=>isPending(r.status));
    if(currentFilter==='completed') return rows.filter(r=>isCompleted(r.status));
    return rows;
  }

  function updateHeading(){
    const map={all:['My Orders','आपके सभी service orders और उनकी स्थिति'],pending:['Pending Orders','वे orders जिनका काम अभी पूरा नहीं हुआ है'],completed:['Completed Orders','वे orders जिनका काम पूरा हो चुका है']};
    const [title,sub]=map[currentFilter]||map.all;
    $('ordersPageTitle').textContent=title;
    $('ordersPageSub').textContent=sub;
    document.querySelectorAll('.orders-tab').forEach(b=>b.classList.toggle('active',b.dataset.filter===currentFilter));
  }

  function render(){
    updateHeading();
    renderSummary();
    const list=$('ordersPageList');
    const data=filtered();
    if(!data.length){ list.innerHTML='<div class="orders-empty">इस category में अभी कोई order नहीं है।</div>'; return; }
    list.innerHTML=data.map(r=>{
      const s=normalizedStatus(r.status);
      const pill=isCompleted(s)?'completed':(isCancelled(s)?'cancelled':'');
      return `<article class="order-card">
        <div class="order-top"><div><div class="order-service">${esc(r.services?.name || 'Service Order')}</div><div class="order-id">Order ID: ${esc(r.id)}</div></div><span class="status-pill ${pill}">${esc(r.status || 'Pending')}</span></div>
        <div class="order-grid">
          <div class="order-info"><small>Amount</small><strong>${money(r.amount)}</strong></div>
          <div class="order-info"><small>Created</small><strong>${esc(dateTime(r.created_at))}</strong></div>
          <div class="order-info"><small>Last Updated</small><strong>${esc(dateTime(r.updated_at))}</strong></div>
          <div class="order-info"><small>Service</small><strong>${esc(r.services?.name || '—')}</strong></div>
        </div>
        ${r.note ? `<div class="order-note"><strong>Note:</strong> ${esc(r.note)}</div>` : ''}
      </article>`;
    }).join('');
  }

  async function boot(){
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.user){ location.replace('auth.html'); return; }
    const {data,error}=await sb.from('orders').select('id,user_id,service_id,note,status,amount,created_at,updated_at,services(name)').eq('user_id',session.user.id).order('created_at',{ascending:false});
    if(error){ console.error(error); $('ordersPageList').innerHTML='<div class="orders-empty">Orders load नहीं हो पाए। कृपया दोबारा खोलें।</div>'; return; }
    rows=data||[];
    render();
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('.orders-tab');
    if(!b) return;
    currentFilter=b.dataset.filter||'all';
    history.replaceState(null,'',`orders.html?filter=${encodeURIComponent(currentFilter)}`);
    render();
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
