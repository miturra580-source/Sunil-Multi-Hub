(() => {
  const CARD_RE = /सरकारी नौकरी|sarkari naukri|government job/i;
  const TABS = [
    ['jobs','Latest Jobs','💼'],
    ['admit','Admit Card','🎫'],
    ['result','Result','✅'],
    ['admission','Admission','🎓'],
    ['syllabus','Syllabus','📘'],
    ['answer','Answer Key','📝']
  ];
  let active='jobs';
  let items=[];
  let panel=null;
  let client=null;

  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function getClient(){
    if(client) return client;
    const cfg=window.SMH_CONFIG||{};
    if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey) throw new Error('Portal config missing');
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
    return client;
  }

  function ensurePanel(){
    if(panel) return panel;
    panel=document.createElement('div');
    panel.id='smhGovJobsPanel';
    panel.innerHTML=`
      <div class="gj-shell">
        <div class="gj-head">
          <div><small>LIVE GOVERNMENT UPDATES</small><h2>💼 सरकारी नौकरी</h2><p>Latest Jobs, Admit Card, Result, Admission, Syllabus और Answer Key</p></div>
          <button type="button" class="gj-close" aria-label="Close">×</button>
        </div>
        <div class="gj-source">Live source: SarkariResult.com.cm • नई जानकारी refresh पर स्वतः दिखाई देगी</div>
        <div class="gj-tabs"></div>
        <div class="gj-tools"><input class="gj-search" placeholder="Search job / exam..."><button type="button" class="gj-refresh">↻ Refresh</button></div>
        <div class="gj-status">Loading...</div>
        <div class="gj-list"></div>
        <div class="gj-foot">जानकारी third-party public source से live दिखाई जाती है। Final details/eligibility official notification से verify करें।</div>
      </div>`;
    const style=document.createElement('style');
    style.textContent=`
      #smhGovJobsPanel{position:fixed;inset:0;background:#f6f8fc;z-index:30000;overflow:auto;display:none;font-family:inherit;color:#182230}
      #smhGovJobsPanel.show{display:block}.gj-shell{max-width:760px;margin:auto;min-height:100vh;background:#fff}
      .gj-head{padding:22px 20px 18px;background:linear-gradient(135deg,#8f1111,#d5341f,#ff9b33);color:#fff;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .gj-head small{font-weight:900;letter-spacing:.7px;opacity:.9}.gj-head h2{font-size:30px;margin:5px 0}.gj-head p{margin:0;opacity:.92;line-height:1.45}.gj-close{width:48px;height:48px;border:0;border-radius:50%;background:#fff;color:#111;font-size:27px;font-weight:800}
      .gj-source{padding:11px 16px;background:#fff7dc;color:#7a5500;border-bottom:1px solid #f1df9f;font-size:12px;font-weight:700}
      .gj-tabs{display:flex;gap:8px;overflow:auto;padding:12px;background:#fff;position:sticky;top:0;z-index:2;border-bottom:1px solid #e7eaf0}.gj-tab{white-space:nowrap;border:1px solid #dfe4ec;background:#f7f9fc;border-radius:999px;padding:10px 13px;font-weight:800}.gj-tab.active{background:#b71919;color:#fff;border-color:#b71919}
      .gj-tools{display:flex;gap:8px;padding:14px 16px}.gj-search{flex:1;min-width:0;padding:12px 14px;border:1px solid #d8dee9;border-radius:12px;font:inherit}.gj-refresh{border:0;border-radius:12px;background:#183b78;color:#fff;padding:0 14px;font-weight:800}.gj-status{padding:0 16px 10px;color:#667085;font-size:12px}.gj-list{padding:0 16px 24px;display:grid;gap:10px}.gj-item{display:flex;justify-content:space-between;gap:12px;align-items:center;text-decoration:none;color:#172033;border:1px solid #e1e6ee;border-radius:14px;padding:14px;background:#fff;box-shadow:0 5px 15px rgba(20,35,70,.04)}.gj-item strong{line-height:1.45}.gj-item span{flex:0 0 auto;color:#2855cc;font-size:20px}.gj-empty{padding:35px 15px;text-align:center;color:#667085}.gj-foot{margin:0 16px 24px;padding:12px;border-radius:12px;background:#f6f7f9;color:#667085;font-size:11px;line-height:1.5}
      @media(max-width:520px){.gj-head h2{font-size:26px}.gj-shell{width:100%}}
    `;
    document.head.appendChild(style);
    document.body.appendChild(panel);
    panel.querySelector('.gj-close').onclick=close;
    panel.querySelector('.gj-refresh').onclick=()=>load(true);
    panel.querySelector('.gj-search').addEventListener('input',render);
    panel.querySelector('.gj-tabs').innerHTML=TABS.map(([k,n,i])=>`<button type="button" class="gj-tab ${k===active?'active':''}" data-k="${k}">${i} ${n}</button>`).join('');
    panel.querySelector('.gj-tabs').addEventListener('click',e=>{
      const b=e.target.closest('.gj-tab'); if(!b) return;
      active=b.dataset.k;
      panel.querySelectorAll('.gj-tab').forEach(x=>x.classList.toggle('active',x===b));
      load();
    });
    return panel;
  }

  function render(){
    const p=ensurePanel();
    const q=(p.querySelector('.gj-search').value||'').trim().toLowerCase();
    const filtered=!q?items:items.filter(x=>String(x.title||'').toLowerCase().includes(q));
    p.querySelector('.gj-list').innerHTML=filtered.length?filtered.map(x=>`<a class="gj-item" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(x.title)}</strong><span>›</span></a>`).join(''):`<div class="gj-empty">कोई matching update नहीं मिला।</div>`;
  }

  async function load(force=false){
    const p=ensurePanel();
    p.querySelector('.gj-status').textContent='Latest updates loading...';
    p.querySelector('.gj-list').innerHTML='';
    try{
      const sb=getClient();
      const {data:{session}}=await sb.auth.getSession();
      if(!session) throw new Error('Please login again');
      const base=(window.SMH_CONFIG||{}).supabaseUrl;
      const url=`${base}/functions/v1/sarkari-result-feed?category=${encodeURIComponent(active)}${force?'&t='+Date.now():''}`;
      const r=await fetch(url,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:(window.SMH_CONFIG||{}).supabaseAnonKey}});
      const data=await r.json();
      if(!r.ok) throw new Error(data?.error||'Live feed failed');
      items=Array.isArray(data.items)?data.items:[];
      const when=data.fetched_at?new Date(data.fetched_at).toLocaleString('en-IN'):'';
      p.querySelector('.gj-status').textContent=`${items.length} updates • ${when}`;
      render();
    }catch(err){
      p.querySelector('.gj-status').textContent='Live update load नहीं हो सका।';
      p.querySelector('.gj-list').innerHTML=`<div class="gj-empty">${esc(err?.message||'Please try Refresh.')}</div>`;
    }
  }

  function open(){
    ensurePanel().classList.add('show');
    document.body.style.overflow='hidden';
    load();
  }
  function close(){
    panel?.classList.remove('show');
    document.body.style.overflow='';
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest?.('.portal-service-card');
    if(!card||!CARD_RE.test(card.textContent||'')) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    open();
  },true);

  window.openGovernmentJobsLive=open;
})();