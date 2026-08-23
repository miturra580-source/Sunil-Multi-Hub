(() => {
  function installCompactWallet(){
    const card=document.querySelector('.main-wallet-card');
    const top=card?.querySelector('.wallet-card-top');
    const balance=card?.querySelector('.wallet-balance-wrap');
    const meta=card?.querySelector('.wallet-meta');
    const icon=card?.querySelector('.wallet-icon');
    const actions=card?.querySelector('.wallet-main-actions');
    if(!card||!top||!balance||!meta||!actions)return;

    if(!document.getElementById('smhWalletCompactCss')){
      const style=document.createElement('style');
      style.id='smhWalletCompactCss';
      style.textContent=`
        .main-wallet-card{padding:18px 20px!important;border-radius:22px!important;box-shadow:0 12px 34px rgba(42,72,194,.18)!important}
        .main-wallet-card::after{width:180px!important;height:180px!important;right:-75px!important;top:-90px!important}
        .wallet-card-top{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:start!important;gap:20px!important}
        .wallet-card-top>div:first-child small{font-size:11px!important;letter-spacing:.4px!important}
        .wallet-card-top h2{font-size:24px!important;margin-top:3px!important}
        .wallet-icon{display:none!important}
        .smh-wallet-right{min-width:210px;text-align:right;position:relative;z-index:2}
        .smh-wallet-right .wallet-balance-wrap{margin:0!important}
        .smh-wallet-right .wallet-balance-wrap small{font-size:11px!important;opacity:.82!important}
        .smh-wallet-right #walletBalance{font-size:34px!important;margin-top:4px!important;line-height:1!important}
        .smh-wallet-right .wallet-meta{margin-top:9px!important;display:flex!important;justify-content:flex-end!important;gap:6px!important;flex-wrap:wrap!important}
        .smh-wallet-right .wallet-meta span{padding:5px 8px!important;font-size:10px!important}
        .wallet-main-actions{margin-top:16px!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
        .wallet-main-actions button{min-height:44px!important;border-radius:12px!important;font-size:14px!important}
        .wallet-page-heading{margin-bottom:14px!important}
        .wallet-page-heading h1{font-size:27px!important}
        .wallet-container{padding-top:18px!important}
        @media(max-width:700px){
          .main-wallet-card{padding:15px!important;border-radius:18px!important}
          .wallet-card-top{grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important}
          .wallet-card-top h2{font-size:18px!important}
          .wallet-card-top>div:first-child small{font-size:9px!important}
          .smh-wallet-right{min-width:145px!important}
          .smh-wallet-right #walletBalance{font-size:27px!important}
          .smh-wallet-right .wallet-balance-wrap small{font-size:9px!important}
          .smh-wallet-right .wallet-meta{gap:4px!important;margin-top:7px!important}
          .smh-wallet-right .wallet-meta span{padding:4px 6px!important;font-size:8.5px!important}
          .wallet-main-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important;margin-top:12px!important;gap:7px!important}
          .wallet-main-actions button{min-height:40px!important;font-size:12px!important;padding:7px!important}
          .wallet-page-heading{margin-bottom:12px!important}
          .wallet-page-heading h1{font-size:23px!important}
          .wallet-page-heading p{font-size:12px!important;line-height:1.35!important}
        }
        @media(max-width:390px){
          .wallet-card-top{grid-template-columns:1fr!important}
          .smh-wallet-right{min-width:0!important;text-align:left!important}
          .smh-wallet-right .wallet-meta{justify-content:flex-start!important}
          .smh-wallet-right #walletBalance{font-size:28px!important}
        }
      `;
      document.head.appendChild(style);
    }

    let right=card.querySelector('.smh-wallet-right');
    if(!right){
      right=document.createElement('div');
      right.className='smh-wallet-right';
      top.appendChild(right);
    }
    right.appendChild(balance);
    right.appendChild(meta);
    if(icon)icon.remove();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installCompactWallet,{once:true});
  else installCompactWallet();
  setTimeout(installCompactWallet,300);
})();