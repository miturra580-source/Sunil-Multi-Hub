(() => {
  function makeClickable() {
    const routes = [
      ['orderCount','orders.html?filter=all','All orders'],
      ['pendingCount','orders.html?filter=pending','Pending orders'],
      ['doneCount','orders.html?filter=completed','Completed orders'],
      ['walletStatBalance','wallet.html','Wallet']
    ];

    routes.forEach(([id,href,label]) => {
      const value = document.getElementById(id);
      const card = value?.closest('article');
      if (!card || card.dataset.smhStatLink === '1') return;
      card.dataset.smhStatLink = '1';
      card.setAttribute('role','link');
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-label',label);
      card.style.cursor='pointer';
      card.style.transition='transform .15s ease, box-shadow .15s ease';
      card.addEventListener('mouseenter',()=>{card.style.transform='translateY(-1px)';});
      card.addEventListener('mouseleave',()=>{card.style.transform='';});
      const go=()=>{ location.href=href; };
      card.addEventListener('click',go);
      card.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();go();} });
    });
  }

  function fixTopOrdersTab(){
    document.querySelectorAll('#smhStableTabs .smh-stable-tab').forEach(a=>{
      if((a.textContent||'').includes('My Orders')) a.href='orders.html?filter=all';
    });
  }

  function start(){ makeClickable(); fixTopOrdersTab(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
  setTimeout(start,500); setTimeout(start,1400);
  new MutationObserver(start).observe(document.documentElement,{childList:true,subtree:true});
})();
