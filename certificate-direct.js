(() => {
  const SERVICE_ID = '48e430f8-284c-4c11-b928-c0ce08c382f4';
  const OPENING_CLASS = 'smh-certificate-direct-opening';

  function injectStyles() {
    if (document.getElementById('smhCertificateDirectNoBlink')) return;
    const style = document.createElement('style');
    style.id = 'smhCertificateDirectNoBlink';
    style.textContent = `
      body.${OPENING_CLASS} #serviceDetailsBackdrop,
      body.${OPENING_CLASS} #serviceDetailsBox {
        display:none!important;
        visibility:hidden!important;
        opacity:0!important;
        pointer-events:none!important;
        transition:none!important;
      }
      body.${OPENING_CLASS} #serviceDetailsBox {
        transform:translateX(-50%) translateY(110%)!important;
      }
    `;
    document.head.appendChild(style);
  }

  function isCertificateCard(target) {
    const card = target.closest('.portal-service-card');
    if (!card) return null;
    const text = (card.textContent || '').replace(/\s+/g, ' ').trim();
    return text.includes('आय') && text.includes('जाति') && text.includes('निवास') ? card : null;
  }

  function releaseWhenVariantOpens() {
    const started = Date.now();
    const timer = setInterval(() => {
      const backdrop = document.getElementById('variantBackdrop');
      const box = document.getElementById('variantBox');
      const opened = backdrop?.style.display === 'block' ||
        (box && !String(box.style.transform || '').includes('110%'));
      if (opened || Date.now() - started > 1400) {
        clearInterval(timer);
        document.body.classList.remove(OPENING_CLASS);
        document.body.style.overflow = opened ? 'hidden' : '';
      }
    }, 25);
  }

  function openDirect() {
    try {
      if (typeof window.openServiceDetails !== 'function') return;
      document.body.classList.add(OPENING_CLASS);
      window.openServiceDetails(SERVICE_ID);
      requestAnimationFrame(() => {
        const apply = document.getElementById('serviceApplyBtn');
        if (!apply) {
          document.body.classList.remove(OPENING_CLASS);
          return;
        }
        apply.click();
        releaseWhenVariantOpens();
      });
    } catch (err) {
      document.body.classList.remove(OPENING_CLASS);
      console.error('Certificate direct open failed:', err);
    }
  }

  injectStyles();
  document.addEventListener('click', event => {
    const card = isCertificateCard(event.target);
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openDirect();
  }, true);
})();