(() => {
  const PAN_SERVICE_ID = 'ba17c25e-9833-452d-8005-692d77b080c5';
  const OPENING_CLASS = 'smh-pan-direct-opening';

  function injectNoBlinkStyles() {
    if (document.getElementById('smhPanDirectNoBlink')) return;
    const style = document.createElement('style');
    style.id = 'smhPanDirectNoBlink';
    style.textContent = `
      body.${OPENING_CLASS} #serviceDetailsBackdrop,
      body.${OPENING_CLASS} #serviceDetailsBox {
        display:none !important;
        visibility:hidden !important;
        opacity:0 !important;
        pointer-events:none !important;
        transition:none !important;
      }
      body.${OPENING_CLASS} #serviceDetailsBox {
        transform:translateX(-50%) translateY(110%) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function isPanCard(target) {
    const card = target.closest('.portal-service-card');
    if (!card) return null;
    const text = (card.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return text.includes('pan') ? card : null;
  }

  function releaseNoBlinkWhenVariantOpens() {
    const started = Date.now();
    const timer = setInterval(() => {
      const backdrop = document.getElementById('variantBackdrop');
      const box = document.getElementById('variantBox');
      const opened = backdrop?.style.display === 'block' ||
        (box && !String(box.style.transform || '').includes('110%'));

      if (opened || Date.now() - started > 1200) {
        clearInterval(timer);
        document.body.classList.remove(OPENING_CLASS);
        document.body.style.overflow = opened ? 'hidden' : '';
      }
    }, 25);
  }

  function openPanDirect() {
    try {
      if (typeof window.openServiceDetails !== 'function') {
        console.error('PAN direct open: openServiceDetails unavailable');
        return;
      }

      document.body.classList.add(OPENING_CLASS);

      // This sets dashboard.js internal activeService, but the CSS above
      // prevents the intermediate details sheet from ever becoming visible.
      window.openServiceDetails(PAN_SERVICE_ID);

      // Wait one animation frame so activeService is guaranteed to be set,
      // while the details sheet remains suppressed.
      requestAnimationFrame(() => {
        const apply = document.getElementById('serviceApplyBtn');
        if (!apply) {
          document.body.classList.remove(OPENING_CLASS);
          console.error('PAN direct open: Apply button unavailable');
          return;
        }

        apply.click();
        releaseNoBlinkWhenVariantOpens();
      });
    } catch (err) {
      document.body.classList.remove(OPENING_CLASS);
      console.error('PAN direct open failed:', err);
    }
  }

  injectNoBlinkStyles();

  document.addEventListener('click', event => {
    const card = isPanCard(event.target);
    if (!card) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openPanDirect();
  }, true);
})();
