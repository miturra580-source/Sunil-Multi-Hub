(() => {
  function removeDuplicateTabs(){
    document.querySelectorAll('#smhTopTabs,.smh-top-tabs').forEach(el=>el.remove());
    const all=[...document.querySelectorAll('#smhStableTabs')];
    all.slice(1).forEach(el=>el.remove());
  }

  function installTabs(){
    if(!document.body) return;
    removeDuplicateTabs();
    if(document.getElementById('smhStableTabs')) return;

    if(!document.getElementById('smhStableTabsCss')){
      const style=document.createElement('style');
      style.id='smhStableTabsCss';
      style.textContent=`
        #smhStableTabs.smh-stable-tabs{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:1400!important;background:#fff!important;border:1px solid #e7ebf2!important;border-radius:18px!important;box-shadow:0 8px 24px rgba(30,50,90,.07)!important;margin:10px auto 0!important;width:calc(100% - 24px)!important;max-width:1180px!important;overflow:hidden!important}
        #smhStableTabs .smh-stable-tabs-inner{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;width:100%!important;align-items:stretch!important}
        #smhStableTabs .smh-stable-tab{min-width:0!important;text-decoration:none!important;color:#5f6b7a!important;background:#fff!important;border:0!important;padding:10px 3px 9px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;font:inherit!important;font-size:10.5px!important;font-weight:800!important;cursor:pointer!important;border-bottom:3px solid transparent!important;white-space:nowrap!important}
        #smhStableTabs .smh-stable-tab .ico{font-size:19px!important;line-height:1!important}
        #smhStableTabs .smh-stable-tab.active{color:#1557d6!important;border-bottom-color:#1557d6!important;background:#f8faff!important}
        #smhStableTabs .smh-stable-tab:active{background:#f4f7ff!important}
        @media(max-width:420px){
          #smhStableTabs.smh-stable-tabs{width:calc(100% - 16px)!important;margin-top:7px!important;border-radius:14px!important}
          #smhStableTabs .smh-stable-tab{font-size:9px!important;padding:8px 1px 7px!important;gap:2px!important}
          #smhStableTabs .smh-stable-tab .ico{font-size:17px!important}
        }
        @media(min-width:700px){
          #smhStableTabs.smh-stable-tabs{margin-top:14px!important}
          #smhStableTabs .smh-stable-tab{font-size:13px!important;padding:12px 8px!important}
          #smhStableTabs .smh-stable-tab .ico{font-size:21px!important}
        }
      `;
      document.head.appendChild(style);
    }

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