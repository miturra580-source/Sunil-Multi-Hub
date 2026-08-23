(() => {
  function installTabs(){
    if(!document.body || document.getElementById('smhStableTabs')) return;
    const style=document.createElement('style');
    style.id='smhStableTabsCss';
    style.textContent=`
      .smh-stable-tabs{background:#fff;border:1px solid #e7ebf2;border-radius:18px;box-shadow:0 8px 24px rgba(30,50,90,.07);margin:10px auto 0;max-width:1180px;overflow:hidden}
      .smh-stable-tabs-inner{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:stretch}
      .smh-stable-tab{min-width:0;text-decoration:none;color:#5f6b7a;background:#fff;border:0;padding:10px 4px 9px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:inherit;font-size:11px;font-weight:800;cursor:pointer;border-bottom:3px solid transparent}
      .smh-stable-tab .ico{font-size:19px;line-height:1}.smh-stable-tab.active{color:#1557d6;border-bottom-color:#1557d6;background:#f8faff}.smh-stable-tab:active{background:#f4f7ff}
      @media(min-width:700px){.smh-stable-tabs{margin-top:14px}.smh-stable-tab{font-size:13px;padding:12px 8px}.smh-stable-tab .ico{font-size:21px}}
    `;
    document.head.appendChild(style);
    const nav=document.createElement('nav');
    nav.id='smhStableTabs';
    nav.className='smh-stable-tabs';
    nav.innerHTML=`<div class="smh-stable-tabs-inner">
      <a class="smh-stable-tab active" href="dashboard.html"><span class="ico">🏠</span><span>Dashboard</span></a>
      <a class="smh-stable-tab" href="dashboard.html#myOrders"><span class="ico">📋</span><span>My Orders</span></a>
      <a class="smh-stable-tab" href="client-form.html"><span class="ico">📝</span><span>Client Form</span></a>
      <a class="smh-stable-tab" href="wallet.html"><span class="ico">₹</span><span>Wallet</span></a>
      <a class="smh-stable-tab" href="tools.html"><span class="ico">▦</span><span>Tools</span></a>
    </div>`;
    const header=document.querySelector('.portal-header')||document.querySelector('header');
    if(header) header.insertAdjacentElement('afterend',nav); else document.body.insertAdjacentElement('afterbegin',nav);
    const old=document.getElementById('smhTopTabs'); if(old) old.remove();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',installTabs,{once:true}); else installTabs();
  setTimeout(installTabs,300);
})();