(() => {
  const CARD_RE=/सरकारी नौकरी|sarkari naukri|government job/i;
  const SOURCE_ORIGINS=['https://www.sarkariresult.com','https://sarkariresult.com.cm'];
  const NAV=[['home','Home'],['jobs','Latest Job'],['admit','Admit Card'],['result','Results'],['admission','Admission'],['syllabus','Syllabus'],['answer','Answer Key']];
  const JUNK=/^(skip to content|sarkari\s*result(?:\.com(?:\.cm)?)?™?|home|menu)$/i;
  let active='jobs',items=[],panel=null,client=null,detailMode=false,lastDetailUrl='',brandName='Multihub24.com';

  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function cleanBrand(s=''){return String(s).replace(/Sarkari\s*Result(?:\.com(?:\.cm)?)?™?/gi,brandName).replace(/\s{2,}/g,' ').trim();}
  function getClient(){if(client)return client;const cfg=window.SMH_CONFIG||{};if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey)throw new Error('Portal config missing');client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});return client;}
  function isSourceUrl(url=''){try{const o=new URL(url).origin;return SOURCE_ORIGINS.some(x=>new URL(x).origin===o)}catch{return false}}
  async function loadBrand(){try{const sb=getClient();let {data}=await sb.from('public_settings').select('value').eq('key','gov_jobs_brand').maybeSingle();const v=String(data?.value||'').trim();if(v)brandName=v;}catch(_){}document.querySelectorAll('[data-gj-brand]').forEach(el=>el.textContent=brandName);}

  function ensurePanel(){
    if(panel)return panel;
    panel=document.createElement('div');
    panel.id='smhGovJobsPanel';
    panel.innerHTML=`
      <div class="gj-shell">
        <header class="gj-top">
          <div class="gj-logo" data-gj-brand>Multihub24.com</div>
          <div class="gj-tag">Government Jobs • Results • Admit Card</div>
          <button class="gj-close" type="button">×</button>
        </header>
        <nav class="gj-nav"></nav>
        <section class="gj-intro">
          <h1>सरकारी नौकरी 2026</h1>
          <p>नई भर्ती, रिजल्ट, एडमिट कार्ड, एडमिशन और सिलेबस की जानकारी एक जगह।</p>
          <div class="gj-social">
            <a class="gj-telegram" href="https://t.me/Sbannil" target="_blank" rel="noopener noreferrer">Join Telegram</a>
            <button class="gj-app" type="button" disabled>Download Multi Hub App Now</button>
          </div>
        </section>
        <div class="gj-trending"></div>
        <div class="gj-toolbar"><button class="gj-back" type="button" style="display:none">← Back</button><input class="gj-search" placeholder="Search job / exam..."><button class="gj-refresh" type="button">Refresh</button></div>
        <div class="gj-status">Loading...</div>
        <main class="gj-content"><div class="gj-list"></div><div class="gj-detail" style="display:none"></div></main>
        <footer class="gj-foot">Final eligibility, dates और आवेदन जानकारी official notification से verify करें।</footer>
      </div>`;

    const style=document.createElement('style');
    style.textContent=`
      #smhGovJobsPanel{position:fixed;inset:0;z-index:30000;background:#ececec;overflow:auto;display:none;font-family:Arial,Helvetica,sans-serif;color:#111}
      #smhGovJobsPanel.show{display:block}.gj-shell{max-width:980px;min-height:100vh;margin:auto;background:#fff;box-shadow:0 0 22px rgba(0,0,0,.14)}
      .gj-top{position:relative;background:#a50000;color:#fff;text-align:center;padding:22px 62px 18px}.gj-logo{font-size:34px;font-weight:900;letter-spacing:.4px}.gj-tag{font-size:13px;margin-top:5px}.gj-close{position:absolute;right:14px;top:14px;width:42px;height:42px;border:0;border-radius:4px;background:#fff;color:#111;font-size:26px;font-weight:900}
      .gj-nav{display:grid;grid-template-columns:repeat(7,1fr);background:#111}.gj-nav button{border:0;border-right:1px solid #333;background:#111;color:#fff;padding:12px 6px;font-size:13px;font-weight:700;cursor:pointer}.gj-nav button.active{background:#d00000}.gj-nav button:hover{background:#b60000}
      .gj-intro{text-align:center;padding:18px 16px 10px}.gj-intro h1{margin:0;font-size:24px;color:#a50000}.gj-intro p{margin:7px 0 12px;font-size:14px}.gj-social{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}.gj-telegram,.gj-app{border:0;border-radius:3px;padding:9px 14px;font-weight:800;text-decoration:none;font-size:13px}.gj-telegram{background:#168bd2;color:#fff}.gj-app{background:#777;color:#fff;opacity:.55;cursor:not-allowed}
      .gj-trending{margin:0 14px 12px;border:1px solid #d7d7d7;background:#fff7c8;padding:9px 10px;font-size:12px;line-height:1.6;text-align:center}.gj-trending button{border:0;background:none;color:#0645ad;text-decoration:underline;padding:0 3px;font:inherit;cursor:pointer}
      .gj-toolbar{display:flex;gap:8px;padding:10px 14px;border-top:1px solid #ddd;border-bottom:1px solid #ddd;background:#f7f7f7}.gj-search{flex:1;min-width:0;padding:9px 10px;border:1px solid #bbb;border-radius:3px}.gj-refresh,.gj-back{border:0;border-radius:3px;background:#333;color:#fff;padding:0 13px;font-weight:700}.gj-back{background:#666}
      .gj-status{padding:8px 14px;color:#666;font-size:12px}.gj-content{padding:0 14px 18px}.gj-list{border:1px solid #bbb}.gj-list-head{background:#a50000;color:#fff;text-align:center;padding:10px;font-weight:900;font-size:19px}.gj-item{width:100%;display:block;text-align:left;border:0;border-top:1px solid #ddd;background:#fff;padding:10px 12px;font-size:14px;line-height:1.45;cursor:pointer;color:#0645ad}.gj-item:hover{background:#f8f8f8}.gj-item::before{content:'•';color:#111;margin-right:8px}
      .gj-detail-card{border:1px solid #aaa;background:#fff}.gj-detail-brand{background:#a50000;color:#fff;text-align:center;padding:18px 10px;font-weight:900;font-size:27px}.gj-detail-inner{padding:14px}.gj-detail-card h2{margin:0 0 10px;text-align:center;font-size:22px;color:#a50000;line-height:1.35}.gj-section{margin:13px 0;border:1px solid #aaa}.gj-section-title{background:#8b008b;color:#fff;text-align:center;padding:8px;font-weight:900;font-size:16px}.gj-table-wrap{overflow:auto}.gj-table{width:100%;border-collapse:collapse;font-size:13px}.gj-table td,.gj-table th{border:1px solid #aaa;padding:8px;vertical-align:top}.gj-facts{border:1px solid #bbb;margin-top:13px}.gj-fact{padding:8px 10px;border-top:1px solid #ddd;font-size:13px;line-height:1.45}.gj-fact:first-child{border-top:0}.gj-actions{margin-top:14px;border:1px solid #aaa}.gj-actions-title{background:#008000;color:#fff;text-align:center;font-weight:900;padding:8px}.gj-action{display:flex;justify-content:space-between;gap:10px;padding:9px 11px;border-top:1px solid #ddd;text-decoration:none;color:#0645ad;font-weight:700}.gj-action.internal{background:#fafafa}.gj-note{margin-top:12px;background:#fff7c8;border:1px solid #e0cf7a;padding:9px;font-size:12px}.gj-foot{padding:14px;text-align:center;background:#f2f2f2;border-top:1px solid #ddd;font-size:11px;color:#555}.gj-empty{padding:30px;text-align:center;color:#666}
      @media(max-width:700px){.gj-logo{font-size:27px}.gj-nav{display:flex;overflow:auto}.gj-nav button{flex:0 0 auto;min-width:92px}.gj-toolbar{flex-wrap:wrap}.gj-search{order:3;flex-basis:100%}.gj-detail-brand{font-size:22px}.gj-intro h1{font-size:21px}}
    `;
    document.head.appendChild(style);document.body.appendChild(panel);
    panel.querySelector('.gj-close').onclick=close;
    panel.querySelector('.gj-refresh').onclick=()=>detailMode?loadDetail(lastDetailUrl,true):load(true);
    panel.querySelector('.gj-back').onclick=showFeed;
    panel.querySelector('.gj-search').addEventListener('input',render);
    panel.querySelector('.gj-nav').innerHTML=NAV.map(([k,n])=>`<button type="button" data-k="${k}" class="${k===active?'active':''}">${n}</button>`).join('');
    panel.querySelector('.gj-nav').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;const k=b.dataset.k;if(k==='home'){active='jobs';showFeed();load();return;}active=k;panel.querySelectorAll('.gj-nav button').forEach(x=>x.classList.toggle('active',x.dataset.k===k));showFeed();load();});
    panel.querySelector('.gj-list').addEventListener('click',e=>{const b=e.target.closest('.gj-item');if(!b)return;e.preventDefault();const url=b.dataset.url||'';if(url)loadDetail(url);});
    panel.querySelector('.gj-trending').addEventListener('click',e=>{const b=e.target.closest('button[data-url]');if(!b)return;loadDetail(b.dataset.url||'');});
    panel.querySelector('.gj-detail').addEventListener('click',e=>{const b=e.target.closest('[data-internal-url]');if(!b)return;e.preventDefault();loadDetail(b.dataset.internalUrl||'');});
    loadBrand();return panel;
  }

  function showFeed(){const p=ensurePanel();detailMode=false;lastDetailUrl='';p.querySelector('.gj-search').style.display='';p.querySelector('.gj-back').style.display='none';p.querySelector('.gj-list').style.display='block';p.querySelector('.gj-detail').style.display='none';render();}
  function render(){const p=ensurePanel();if(detailMode)return;const q=(p.querySelector('.gj-search').value||'').trim().toLowerCase();const visible=items.filter(x=>!JUNK.test(String(x.title||'').trim()));const filtered=!q?visible:visible.filter(x=>String(x.title||'').toLowerCase().includes(q));const name=Object.fromEntries(NAV)[active]||'Latest Updates';p.querySelector('.gj-list').innerHTML=`<div class="gj-list-head">${esc(name)}</div>`+(filtered.length?filtered.map(x=>`<button type="button" class="gj-item" data-url="${esc(x.url)}">${esc(cleanBrand(x.title))}</button>`).join(''):`<div class="gj-empty">कोई matching update नहीं मिला।</div>`);p.querySelector('.gj-trending').innerHTML=visible.slice(0,6).map((x,i)=>`${i?' || ':''}<button type="button" data-url="${esc(x.url)}">${esc(cleanBrand(x.title))}</button>`).join('');}
  async function api(url){const sb=getClient();const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Please login again');const r=await fetch(url,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:(window.SMH_CONFIG||{}).supabaseAnonKey}});const data=await r.json();if(!r.ok)throw new Error(data?.error||'Live feed failed');return data;}
  async function load(force=false){const p=ensurePanel();detailMode=false;p.querySelector('.gj-status').textContent='Latest updates loading...';p.querySelector('.gj-list').innerHTML='';try{await loadBrand();const base=(window.SMH_CONFIG||{}).supabaseUrl;const data=await api(`${base}/functions/v1/sarkari-result-feed?category=${encodeURIComponent(active)}${force?'&t='+Date.now():''}`);items=Array.isArray(data.items)?data.items:[];const when=data.fetched_at?new Date(data.fetched_at).toLocaleString('en-IN'):'';p.querySelector('.gj-status').textContent=`${items.filter(x=>!JUNK.test(String(x.title||'').trim())).length} updates • ${when}`;render();}catch(err){p.querySelector('.gj-status').textContent='Live update load नहीं हो सका।';p.querySelector('.gj-list').innerHTML=`<div class="gj-empty">${esc(err?.message||'Please try Refresh.')}</div>`;}}

  function sectionHtml(sections=[]){return sections.map(s=>{const rows=Array.isArray(s.rows)?s.rows:[];if(!rows.length)return'';const cols=Math.max(...rows.map(r=>r.length));return `<section class="gj-section"><div class="gj-section-title">${esc(cleanBrand(s.title||'Details'))}</div><div class="gj-table-wrap"><table class="gj-table"><tbody>${rows.map(r=>`<tr>${Array.from({length:cols},(_,i)=>`<td>${esc(cleanBrand(r[i]||''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`}).join('');}

  async function loadDetail(sourceUrl,force=false){if(!sourceUrl)return;const p=ensurePanel();detailMode=true;lastDetailUrl=sourceUrl;p.querySelector('.gj-search').style.display='none';p.querySelector('.gj-back').style.display='';p.querySelector('.gj-list').style.display='none';p.querySelector('.gj-detail').style.display='block';p.querySelector('.gj-detail').innerHTML='<div class="gj-empty">Details loading...</div>';p.querySelector('.gj-status').textContent='Live details loading...';try{await loadBrand();const base=(window.SMH_CONFIG||{}).supabaseUrl;const data=await api(`${base}/functions/v1/sarkari-result-feed?mode=detail&url=${encodeURIComponent(sourceUrl)}${force?'&t='+Date.now():''}`);const facts=(Array.isArray(data.facts)?data.facts:[]).map(cleanBrand).filter(Boolean);const sections=Array.isArray(data.sections)?data.sections:[];const links=Array.isArray(data.links)?data.links:[];const actionHtml=links.slice(0,30).map(l=>isSourceUrl(l.url)?`<a href="#" class="gj-action internal" data-internal-url="${esc(l.url)}"><span>${esc(cleanBrand(l.label||'More details'))}</span><b>›</b></a>`:`<a class="gj-action" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(cleanBrand(l.label||'Official link'))}</span><b>↗</b></a>`).join('');p.querySelector('.gj-detail').innerHTML=`<article class="gj-detail-card"><div class="gj-detail-brand" data-gj-brand>${esc(brandName)}</div><div class="gj-detail-inner"><h2>${esc(cleanBrand(data.title||'Government Update'))}</h2>${sectionHtml(sections)}${facts.length?`<div class="gj-facts">${facts.slice(0,50).map(t=>`<div class="gj-fact">${esc(t)}</div>`).join('')}</div>`:''}${actionHtml?`<div class="gj-actions"><div class="gj-actions-title">Important Links</div>${actionHtml}</div>`:''}<div class="gj-note">यहाँ जानकारी structured form में दिखाई जा रही है। Apply/Download/Official Notification जैसे वास्तविक links official website पर खुल सकते हैं।</div></div></article>`;const when=data.fetched_at?new Date(data.fetched_at).toLocaleString('en-IN'):'';p.querySelector('.gj-status').textContent=`Live detail • ${when}`;}catch(err){p.querySelector('.gj-status').textContent='Detail load नहीं हो सका।';p.querySelector('.gj-detail').innerHTML=`<div class="gj-empty">${esc(err?.message||'Please try Refresh.')}</div>`;}}

  function open(){ensurePanel().classList.add('show');document.body.style.overflow='hidden';showFeed();load();}
  function close(){panel?.classList.remove('show');document.body.style.overflow='';}
  document.addEventListener('click',e=>{const card=e.target.closest?.('.portal-service-card');if(!card||!CARD_RE.test(card.textContent||''))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open();},true);
  window.openGovernmentJobsLive=open;
})();