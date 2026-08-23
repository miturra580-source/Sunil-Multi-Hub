(() => {
  const STYLE_ID = 'smh-clean-service-cards-style';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .portal-service-card{
        min-height:118px!important;
        padding:16px 12px!important;
        gap:0!important;
      }
      .portal-service-card .portal-service-icon{
        margin-bottom:10px!important;
      }
      .portal-service-card strong{
        margin:0!important;
        font-size:15px!important;
        line-height:1.35!important;
        color:#172033!important;
        font-weight:800!important;
      }
      @media(max-width:560px){
        .portal-service-card{
          min-height:112px!important;
          padding:13px 8px!important;
        }
        .portal-service-card .portal-service-icon{
          margin-bottom:8px!important;
        }
        .portal-service-card strong{
          font-size:13px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function cleanCard(card) {
    if (!card) return;

    card.querySelectorAll('small').forEach(el => el.remove());

    card.querySelectorAll(':scope > span').forEach(el => {
      if (!el.classList.contains('portal-service-icon')) el.remove();
    });

    [...card.childNodes].forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        node.textContent = '';
      }
    });
  }

  function cleanAll() {
    document.querySelectorAll('.portal-service-card').forEach(cleanCard);
  }

  function start() {
    injectStyles();
    cleanAll();

    const observer = new MutationObserver(mutations => {
      if (mutations.some(m => m.addedNodes && m.addedNodes.length)) {
        cleanAll();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
