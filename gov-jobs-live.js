(() => {
  const CARD_RE = /सरकारी नौकरी|sarkari naukri|government job/i;
  const SOURCE_ORIGIN = 'https://sarkariresult.com.cm';
  const TABS = [
    ['jobs','Latest Jobs','💼'],['admit','Admit Card','🎫'],['result','Result','✅'],['admission','Admission','🎓'],['syllabus','Syllabus','📘'],['answer','Answer Key','📝']
  ];
  const JUNK=/^(skip to content|sarkari\s*result(?:\.com\.cm)?™?|home|menu)$/i;
  let active='jobs', items=[], panel=null, client=null, detailMode=false, lastDetailUrl='', brandName='MULTI HUB';

  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function cleanBrand(s=''){return String(s).replace(/Sarkari\s*Result(?:\.com\.cm)?™?/gi,brandName).replace(/\s{2,}/g,' ').trim();}
  function getClient(){
    if(client) return client;
    const cfg=window.SMH_CONFIG||{};
    if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey) throw new Error('Portal config missing');
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
    return client;
  }
  function isSourceUrl(url=''){try{return new URL(url).origin===SOURCE_ORIGIN;}catch{return false;}}

  async function loadBrand(){
    try{
      const sb=getClient();
      const {data}=await sb.from('public_settings').select('value').eq('key','shop_name').maybeSingle();
      const v=String(data?.value||'').trim();
      if(v) brandName=v;
    }catch(_){ }
    document.querySelectorAll('[data-gj-brand]').forEach(el=>el.textContent=brandName);
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
        <div class="gj-source"><b data-gj-brand>MULTI HUB</b> • Live government update service</div>
        <div class="gj-tabs"></div>
        <div class="gj-tools"><button type="button" class="gj-back" style="display:none">← Back</button><input class="gj-search" placeholder="Search job / exam..."><button type="button" class="gj-refresh">↻ Refresh</button></div>
        <div class="gj-status">Loading...</div>
        <div class="gj-list"></div>
        <div class="gj-detail" style="display:none"></div>
        <div class="gj-foot">जानकारी live public source से factual/structured रूप में दिखाई जाती है। अंतिम पात्रता, तारीख और आवेदन विवरण official notification से verify करें।</div>
      </div>`;
    const style=document.createElement('style');
    style.textContent=`
      #smhGovJobsPanel{position:fixed;inset:0;background:#f6f8fc;z-index:30000;overflow:auto;display:none;font-family:inherit;color:#182230}
      #smhGovJobsPanel.show{display:block}.gj-shell{max-width:760px;margin:auto;min-height:100vh;background:#fff}
      .gj-head{padding:22px 20px 18px;background:linear-gradient(135deg,#8f1111,#d5341f,#ff9b33);color:#fff;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .gj-head small{font-weight:900;letter-spacing:.7px;opacity:.9}.gj-head h2{font-size:30px;margin:5px 0}.gj-head p{margin:0;opacity:.92;line-height:1.45}.gj-close{width:48px;height:48px;border:0;border-radius:50%;background:#fff;color:#111;font-size:27px;font-weight:800}
      .gj-source{padding:11px 16px;background:#fff7dc;color:#7a5500;border-bottom:1px solid #f1df9f;font-size:12px;font-weight:700}
      .gj-tabs{display:flex;gap:8px;overflow:auto;padding:12px;background:#fff;position:sticky;top:0;z-index:2;border-bottom:1px solid #e7eaf0}.gj-tab{white-space:nowrap;border:1px solid #dfe4ec;background:#f7f9fc;border-radius:999px;padding:10px 13px;font-weight:800}.gj-tab.active{background:#b71919;color:#fff;border-color:#b71919}
      .gj-tools{display:flex;gap:8px;padding:14px 16px}.gj-search{flex:1;min-width:0;padding:12px 14px;border:1px solid #d8dee9;border-radius:12px;font:inherit}.gj-refresh,.gj-back{border:0;border-radius:12px;background:#183b78;color:#fff;padding:0 14px;font-weight:800;min-height:42px}.gj-back{background:#5d6878}
      .gj-status{padding:0 16px 10px;color:#667085;font-size:12px}.gj-list{padding:0 16px 24px;display:grid;gap:10px}.gj-item{width:100%;display:flex;justify-content:space-between;gap:12px;align-items:center;text-align:left;color:#172033;border:1px solid #e1e6ee;border-radius:14px;padding:14px;background:#fff;box-shadow:0 5px 15px rgba(20,35,70,.04);font:inherit}.gj-item strong{line-height:1.45}.gj-item span{flex:0 0 auto;color:#2855cc;font-size:20px}.gj-empty{padding:35px 15px;text-align:center;color:#667085}
      .gj-detail{padding:0 16px 24px}.gj-detail-brand{background:#c90000;color:#fff;border-radius:16px 16px 0 0;padding:20px;text-align:center;font-weight:1000;font-size:28px;letter-spacing:.4px}.gj-detail-card{border:1px solid #e1e6ee;border-radius:16px;background:#fff;overflow:hidden}.gj-detail-inner{padding:16px}.gj-detail-card h3{margin:0 0 12px;font-size:22px;line-height:1.35}.gj-facts{display:grid;gap:8px}.gj-fact{padding:10px 12px;background:#f8fafc;border:1px solid #e7ebf1;border-radius:10px;line-height:1.45;font-size:14px}.gj-actions{display:grid;gap:9px;margin-top:16px}.gj-action{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px;border-radius:11px;border:1px solid #d9e1ec;background:#fff;text-decoration:none;color:#17365f;font-weight:800}.gj-action.internal{background:#f7f9ff}.gj-note{margin-top:14px;padding:10px 12px;background:#fff7dc;border-radius:10px;color:#7a5500;font-size:12px;line-height:1.45}
      .gj-foot{margin:0 16px 24px;padding:12px;border-radius:12px;background:#f6f7f9;color:#667085;font-size:11px;line-height:1.5}
      @media(max-width:520px){.gj-head h2{font-size:26px}.gj-shell{width:100%}.gj-tools{flex-wrap:wrap}.gj-search{order:3;flex-basis:100%}.gj-detail-brand{font-size:24px}}
    `;
    document.head.appendChild(style); document.body.appendChild(panel);
    panel.querySelector('.gj-close').onclick=close;
    panel.querySelector('.gj-refresh').onclick=()=>detailMode?loadDetail(lastDetailUrl,true):load(true);
    panel.querySelector('.gj-back').onclick=showFeed;
    panel.querySelector('.gj-search').addEventListener('input',render);
    panel.querySelector('.gj-tabs').innerHTML=TABS.map(([k,n,i])=>`<button type="button" class="gj-tab ${k===active?'active':''}" data-k="${k}">${i} ${n}</button>`).join('');
    panel.querySelector('.gj-tabs').addEventListener('click',e=>{const b=e.target.closest('.gj-tab');if(!b)return;active=b.dataset.k;panel.querySelectorAll('.gj-tab').forEach(x=>x.classList.toggle('active',x===b));showFeed();load();});
    panel.querySelector('.gj-list').addEventListener('click',e=>{const b=e.target.closest('.gj-item');if(!b)return;e.preventDefault();e.stopPropagation();const url=b.dataset.url||'';if(url)loadDetail(url);});
    panel.querySelector('.gj-detail').addEventListener('click',e=>{const b=e.target.closest('[data-internal-url]');if(!b)return;e.preventDefault();e.stopPropagation();loadDetail(b.dataset.internalUrl||'');});
    loadBrand(); return panel;
  }

  function showFeed(){const p=ensurePanel();detailMode=false;lastDetailUrl='';p.querySelector('.gj-tabs').style.display='flex';p.querySelector('.gj-search').style.display='';p.querySelector('.gj-back').style.display='none';p.querySelector('.gj-list').style.display='grid';p.querySelector('.gj-detail').style.display='none';render();}
  function render(){
    const p=ensurePanel();if(detailMode)return;const q=(p.querySelector('.gj-search').value||'').trim().toLowerCase();
    const visible=items.filter(x=>!JUNK.test(String(x.title||'').trim())); const filtered=!q?visible:visible.filter(x=>String(x.title||'').toLowerCase().includes(q));
    p.querySelector('.gj-list').innerHTML=filtered.length?filtered.map(x=>`<button type="button" class="gj-item" data-url="${esc(x.url)}"><strong>${esc(cleanBrand(x.title))}</strong><span>›</span></button>`).join(''):`<div class="gj-empty">कोई matching update नहीं मिला।</div>`;
  }
  async function api(url){const sb=getClient();const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Please login again');const r=await fetch(url,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:(window.SMH_CONFIG||{}).supabaseAnonKey}});const data=await r.json();if(!r.ok)throw new Error(data?.error||'Live feed failed');return data;}
  async function load(force=false){
    const p=ensurePanel();detailMode=false;p.querySelector('.gj-status').textContent='Latest updates loading...';p.querySelector('.gj-list').innerHTML='';
    try{await loadBrand();const base=(window.SMH_CONFIG||{}).supabaseUrl;const data=await api(`${base}/functions/v1/sarkari-result-feed?category=${encodeURIComponent(active)}${force?'&t='+Date.now():''}`);items=Array.isArray(data.items)?data.items:[];const when=data.fetched_at?new Date(data.fetched_at).toLocaleString('en-IN'):'';const count=items.filter(x=>!JUNK.test(String(x.title||'').trim())).length;p.querySelector('.gj-status').textContent=`${count} updates • ${when}`;render();}catch(err){p.querySelector('.gj-status').textContent='Live update load नहीं हो सका।';p.querySelector('.gj-list').innerHTML=`<div class="gj-empty">${esc(err?.message||'Please try Refresh.')}</div>`;}
  }
  async function loadDetail(sourceUrl,force=false){
    if(!sourceUrl)return;const p=ensurePanel();detailMode=true;lastDetailUrl=sourceUrl;p.querySelector('.gj-tabs').style.display='none';p.querySelector('.gj-search').style.display='none';p.querySelector('.gj-back').style.display='';p.querySelector('.gj-list').style.display='none';p.querySelector('.gj-detail').style.display='block';p.querySelector('.gj-detail').innerHTML='<div class="gj-empty">Details loading...</div>';p.querySelector('.gj-status').textContent='Live details loading...';
    try{await loadBrand();const base=(window.SMH_CONFIG||{}).supabaseUrl;const data=await api(`${base}/functions/v1/sarkari-result-feed?mode=detail&url=${encodeURIComponent(sourceUrl)}${force?'&t='+Date.now():''}`);const facts=(Array.isArray(data.facts)?data.facts:[]).map(cleanBrand).filter(Boolean);const links=Array.isArray(data.links)?data.links:[];
      const actionHtml=links.slice(0,30).map(l=>isSourceUrl(l.url)?`<a href="#" class="gj-action internal" data-internal-url="${esc(l.url)}"><span>${esc(cleanBrand(l.label||'More details'))}</span><b>›</b></a>`:`<a class="gj-action" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(cleanBrand(l.label||'Official link'))}</span><b>↗</b></a>`).join('');
      p.querySelector('.gj-detail').innerHTML=`<div class="gj-detail-card"><div class="gj-detail-brand" data-gj-brand>${esc(brandName)}</div><div class="gj-detail-inner"><h3>${esc(cleanBrand(data.title||'Government Update'))}</h3><div class="gj-facts">${facts.slice(0,100).map(t=>`<div class="gj-fact">${esc(t)}</div>`).join('')||'<div class="gj-empty">Structured details उपलब्ध नहीं हैं।</div>'}</div>${actionHtml?`<div class="gj-actions">${actionHtml}</div>`:''}<div class="gj-note">यह detail इसी portal के अंदर दिखाई जा रही है। केवल वास्तविक official application/download links संबंधित official website पर खुल सकते हैं।</div></div></div>`;
      const when=data.fetched_at?new Date(data.fetched_at).toLocaleString('en-IN'):'';p.querySelector('.gj-status').textContent=`Live detail • ${when}`;
    }catch(err){p.querySelector('.gj-status').textContent='Detail load नहीं हो सका।';p.querySelector('.gj-detail').innerHTML=`<div class="gj-empty">${esc(err?.message||'Please try Refresh.')}</div>`;}
  }
  function open(){ensurePanel().classList.add('show');document.body.style.overflow='hidden';showFeed();load();}
  function close(){panel?.classList.remove('show');document.body.style.overflow='';}
  document.addEventListener('click',e=>{const card=e.target.closest?.('.portal-service-card');if(!card||!CARD_RE.test(card.textContent||''))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open();},true);
  window.openGovernmentJobsLive=open;
})();