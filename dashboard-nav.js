(() => {
  function removeDuplicateTabs(){
    document.querySelectorAll('#smhTopTabs,.smh-top-tabs').forEach(el=>el.remove());
    const all=[...document.querySelectorAll('#smhStableTabs')];
    all.slice(1).forEach(el=>el.remove());
  }

  function installStyles(){
    if(document.getElementById('smhStableTabsCss')) return;
    const style=document.createElement('style');
    style.id='smhStableTabsCss';
    style.textContent=`
      #smhStableTabs.smh-stable-tabs{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:1400!important;background:#fff!important;border:1px solid #e7ebf2!important;border-radius:18px!important;box-shadow:0 8px 24px rgba(30,50,90,.07)!important;margin:10px auto 0!important;width:calc(100% - 24px)!important;max-width:1180px!important;overflow:hidden!important}
      #smhStableTabs .smh-stable-tabs-inner{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;width:100%!important;align-items:stretch!important}
      #smhStableTabs .smh-stable-tab{min-width:0!important;text-decoration:none!important;color:#5f6b7a!important;background:#fff!important;border:0!important;padding:9px 3px 8px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;font:inherit!important;font-size:10.5px!important;font-weight:800!important;cursor:pointer!important;border-bottom:3px solid transparent!important;white-space:nowrap!important}
      #smhStableTabs .smh-stable-tab .ico{font-size:18px!important;line-height:1!important}
      #smhStableTabs .smh-stable-tab.active{color:#1557d6!important;border-bottom-color:#1557d6!important;background:#f8faff!important}

      /* approved compact welcome-card layout */
      .customer-portal .portal-hero{padding:10px 0 6px!important}
      .customer-portal .portal-banner{padding:14px 16px!important;border-radius:20px!important;box-shadow:0 10px 24px rgba(40,71,210,.18)!important}
      .customer-portal .portal-banner h1{font-size:21px!important;line-height:1.12!important;margin:0 0 3px!important}
      .customer-portal .portal-banner-copy>p{font-size:11.5px!important;line-height:1.35!important;margin:3px 0 0!important}
      .customer-portal .portal-user{margin-top:4px!important}
      .customer-portal .portal-user strong{font-size:11.5px!important}
      .customer-portal .smh-hero-stats{margin-top:10px!important}
      .customer-portal .smh-hero-stats .portal-stat-grid{gap:8px!important}
      .customer-portal .smh-hero-stats .portal-stat-grid article{padding:9px 10px!important;min-height:52px!important;border-radius:12px!important}
      .customer-portal .smh-hero-stats .portal-stat-grid article span{font-size:17px!important}
      .customer-portal .smh-hero-stats .portal-stat-grid small{font-size:9.5px!important;line-height:1.2!important}
      .customer-portal .smh-hero-stats .portal-stat-grid strong{font-size:14px!important;line-height:1.1!important}
      .customer-portal .smh-hero-wallet{margin-top:8px!important}
      .customer-portal .smh-hero-wallet>a{min-height:0!important;padding:9px 11px!important;border-radius:13px!important}
      .customer-portal .smh-hero-wallet a span:first-child{font-size:22px!important}
      .customer-portal .smh-hero-wallet a strong{font-size:18px!important;line-height:1.1!important}
      .customer-portal .smh-hero-wallet a small{font-size:10px!important;line-height:1.25!important}
      .customer-portal .smh-hero-wallet a span:last-child{font-size:11px!important;padding:8px 11px!important}

      @media(max-width:420px){
        #smhStableTabs.smh-stable-tabs{width:calc(100% - 16px)!important;margin-top:7px!important;border-radius:14px!important}
        #smhStableTabs .smh-stable-tab{font-size:8.8px!important;padding:7px 1px 6px!important;gap:2px!important}
        #smhStableTabs .smh-stable-tab .ico{font-size:16px!important}
        .customer-portal .portal-hero{padding-top:8px!important}
        .customer-portal .portal-banner{padding:12px!important;border-radius:18px!important}
        .customer-portal .portal-banner h1{font-size:18px!important}
        .customer-portal .portal-banner-copy>p{font-size:10.5px!important}
        .customer-portal .smh-hero-stats{margin-top:8px!important}
        .customer-portal .smh-hero-stats .portal-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
        .customer-portal .smh-hero-stats .portal-stat-grid article{min-height:48px!important;padding:8px!important;border-radius:11px!important}
        .customer-portal .smh-hero-stats .portal-stat-grid article span{font-size:16px!important}
        .customer-portal .smh-hero-stats .portal-stat-grid small{font-size:9px!important}
        .customer-portal .smh-hero-stats .portal-stat-grid strong{font-size:13px!important}
        .customer-portal .smh-hero-wallet>a{padding:8px 9px!important}
        .customer-portal .smh-hero-wallet a strong{font-size:17px!important}
      }

      @media(min-width:700px){
        #smhStableTabs.smh-stable-tabs{margin-top:12px!important}
        #smhStableTabs .smh-stable-tab{font-size:12px!important;padding:10px 8px!important}
        #smhStableTabs .smh-stable-tab .ico{font-size:19px!important}
        .customer-portal .portal-hero .container{max-width:1180px!important}
        .customer-portal .portal-banner{padding:16px 18px!important}
        .customer-portal .portal-banner h1{font-size:23px!important}
        .customer-portal .smh-hero-stats .portal-stat-grid article{min-height:56px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function installTabs(){
    if(!document.body) return;
    removeDuplicateTabs();
    installStyles();
    if(document.getElementById('smhStableTabs')) return;

    const nav=document.createElement('nav');
    nav.id='smhStableTabs';
    nav.className='smh-stable-tabs';
    nav.setAttribute('aria-label','Dashboard navigation');
    nav.innerHTML=`<div class="smh-stable-tabs-inner">
      <a class="smh-stable-tab active" href="dashboard.html"><span class="ico">🏠</span><span>Dashboard</span></a>
      <a class="smh-stable-tab" href="dashboard.html#myOrders"><span class="ico">📋</span><span>My Orders</span></a>
      <a class="smh-stable-tab" href="client-form.html"><span class="ico">📝</span><span>Client Form</span></a>
      <a class="smh-stable-tab" href="wallet.html"><span class="ico">₹</span><span>Wallet</span></a>
      <a class="smh-stable-tab" href="tools.html"><span class="ico">▦</span><span>Tools</span></a>
    </div>`;

    const header=document.querySelector('.portal-header')||document.querySelector('header');
    if(header) header.insertAdjacentElement('afterend',nav);
    else document.body.insertAdjacentElement('afterbegin',nav);
  }

  function enforceSingleNav(){
    removeDuplicateTabs();
    if(!document.getElementById('smhStableTabs')) installTabs();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',installTabs,{once:true});
  else installTabs();

  setTimeout(enforceSingleNav,250);
  setTimeout(enforceSingleNav,800);
  setTimeout(enforceSingleNav,1800);

  const observer=new MutationObserver(()=>enforceSingleNav());
  const startObserver=()=>{if(document.body) observer.observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',startObserver,{once:true}); else startObserver();
})();