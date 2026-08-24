(() => {
  const PANEL='#smhGovJobsPanel';
  const qs=()=>new URLSearchParams(location.search);
  const setState=(patch={})=>{
    const u=new URL(location.href);
    Object.entries(patch).forEach(([k,v])=>{if(v===null||v===undefined||v==='')u.searchParams.delete(k);else u.searchParams.set(k,String(v));});
    history.replaceState(null,'',u);
  };
  const visible=el=>!!el&&getComputedStyle(el).display!=='none';

  function installStyle(){
    if(document.getElementById('gjEnhanceStyle')) return;
    const s=document.createElement('style');s.id='gjEnhanceStyle';s.textContent=`
      #smhGovJobsPanel{width:100vw!important;height:100dvh!important;max-width:none!important;overflow:auto!important;background:#fff!important}
      #smhGovJobsPanel .gj-shell{width:100%!important;max-width:none!important;min-height:100dvh!important;margin:0!important;box-shadow:none!important}
      #smhGovJobsPanel .gj-top{position:sticky;top:0;z-index:20}
      #smhGovJobsPanel .gj-nav{position:sticky;top:82px;z-index:19}
      #smhGovJobsPanel .gj-content{max-width:1180px;margin:0 auto;padding-left:16px!important;padding-right:16px!important}
      #smhGovJobsPanel .gj-toolbar,#smhGovJobsPanel .gj-status,#smhGovJobsPanel .gj-intro{max-width:1180px;margin-left:auto!important;margin-right:auto!important}
      #smhGovJobsPanel .gj-trending{max-width:1180px;margin:12px auto 16px!important;border:0!important;background:transparent!important;padding:0 16px!important;text-align:left!important}
      #smhGovJobsPanel .gj-trending::before{content:'Latest / Trending Updates';display:block;background:#8b0000;color:#fff;font-weight:900;text-align:center;padding:10px;border-radius:7px 7px 0 0;margin-bottom:8px;font-size:18px}
      #smhGovJobsPanel .gj-trending{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      #smhGovJobsPanel .gj-trending button{display:flex!important;align-items:center;justify-content:center;min-height:62px;padding:10px!important;border-radius:6px!important;color:#fff!important;text-decoration:none!important;font-weight:800!important;line-height:1.25!important;text-align:center!important;background:#9f1239!important;border:1px solid rgba(0,0,0,.12)!important}
      #smhGovJobsPanel .gj-trending button:nth-child(4n+2){background:#b45309!important}
      #smhGovJobsPanel .gj-trending button:nth-child(4n+3){background:#7e22ce!important}
      #smhGovJobsPanel .gj-trending button:nth-child(4n+4){background:#1d4ed8!important}
      #smhGovJobsPanel .gj-trending button:nth-child(4n+5){background:#0f766e!important}
      #smhGovJobsPanel .gj-trending button:nth-child(4n+6){background:#0369a1!important}
      #smhGovJobsPanel .gj-detail-card{width:100%!important;max-width:1180px!important;margin:0 auto!important}
      #smhGovJobsPanel .gj-table-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch}
      @media(max-width:760px){
        #smhGovJobsPanel .gj-top{position:relative!important}.gj-nav{top:0!important}
        #smhGovJobsPanel .gj-trending{grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:0 10px!important}
        #smhGovJobsPanel .gj-trending button{min-height:68px;font-size:12px!important}
        #smhGovJobsPanel .gj-content{padding-left:8px!important;padding-right:8px!important}
      }
    `;document.head.appendChild(s);
  }

  function rebuildTrending(panel){
    const trend=panel.querySelector('.gj-trending');
    const list=[...panel.querySelectorAll('.gj-list .gj-item')].slice(0,8);
    if(!trend||list.length<1) return;
    const existing=[...trend.querySelectorAll('button')];
    if(existing.length===8 && trend.dataset.enhanced==='1') return;
    const chosen=list.slice(0,8);
    trend.innerHTML=chosen.map(b=>`<button type="button" data-url="${(b.dataset.url||'').replace(/"/g,'&quot;')}">${b.textContent.trim()}</button>`).join('');
    trend.dataset.enhanced='1';
    trend.title='Latest updates refresh automatically from live source';
  }

  function tabFromPanel(panel){
    return panel.querySelector('.gj-nav button.active')?.dataset.k||'jobs';
  }

  function watchPanel(panel){
    if(panel.dataset.enhanceWatch==='1') return;panel.dataset.enhanceWatch='1';
    panel.addEventListener('click',e=>{
      const nav=e.target.closest('.gj-nav button[data-k]');
      if(nav) setState({gov:'1',gjTab:nav.dataset.k,gjDetail:null});
      const item=e.target.closest('.gj-item[data-url],.gj-trending button[data-url]');
      if(item?.dataset.url) setState({gov:'1',gjTab:tabFromPanel(panel),gjDetail:item.dataset.url});
      const internal=e.target.closest('[data-internal-url]');
      if(internal?.dataset.internalUrl) setState({gov:'1',gjTab:tabFromPanel(panel),gjDetail:internal.dataset.internalUrl});
      if(e.target.closest('.gj-back')) setState({gov:'1',gjTab:tabFromPanel(panel),gjDetail:null});
      if(e.target.closest('.gj-close')) setState({gov:null,gjTab:null,gjDetail:null});
    },true);
    new MutationObserver(()=>{
      if(panel.classList.contains('show')){
        setState({gov:'1',gjTab:tabFromPanel(panel)});
        rebuildTrending(panel);
      }
    }).observe(panel,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  }

  function restore(){
    const p=qs();if(p.get('gov')!=='1')return;
    const tryOpen=()=>{
      if(typeof window.openGovernmentJobsLive!=='function')return setTimeout(tryOpen,120);
      window.openGovernmentJobsLive();
      const panel=document.querySelector(PANEL);if(!panel)return;
      const tab=p.get('gjTab')||'jobs';
      setTimeout(()=>panel.querySelector(`.gj-nav button[data-k="${CSS.escape(tab)}"]`)?.click(),180);
      const detail=p.get('gjDetail');
      if(detail){
        let tries=0;const go=()=>{
          tries++;
          const btn=[...panel.querySelectorAll('.gj-item[data-url],.gj-trending button[data-url]')].find(b=>b.dataset.url===detail);
          if(btn){btn.click();return;}
          if(tries<30)setTimeout(go,250);
        };setTimeout(go,500);
      }
    };tryOpen();
  }

  installStyle();
  new MutationObserver(()=>{const p=document.querySelector(PANEL);if(p){watchPanel(p);rebuildTrending(p);}}).observe(document.documentElement,{subtree:true,childList:true});
  const existing=document.querySelector(PANEL);if(existing)watchPanel(existing);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});else restore();
})();