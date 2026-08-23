(() => {
  const RATION_RE = /राशन\s*कार्ड|ration/i;

  function getServiceId(card) {
    const onclick = card?.getAttribute('onclick') || '';
    const match = onclick.match(/openServiceDetails\(['\"]([^'\"]+)['\"]\)/);
    return match?.[1] || '';
  }

  function isRationCard(card) {
    const title = card?.querySelector('strong')?.textContent || card?.textContent || '';
    return RATION_RE.test(title);
  }

  document.addEventListener('click', event => {
    const card = event.target?.closest?.('.portal-service-card');
    if (!card || !isRationCard(card)) return;

    const id = getServiceId(card);
    if (!id || typeof window.openServiceDetails !== 'function') return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    try {
      window.openServiceDetails(id);

      // Ration Card should go straight to its service-type selector.
      // This avoids the intermediate full-page service-details panel that can
      // appear blank on some mobile browsers, without changing other services.
      requestAnimationFrame(() => {
        const backdrop = document.getElementById('serviceDetailsBackdrop');
        const box = document.getElementById('serviceDetailsBox');
        if (backdrop) backdrop.style.display = 'none';
        if (box) box.style.transform = 'translateX(-50%) translateY(110%)';

        const apply = document.getElementById('serviceApplyBtn');
        if (apply) apply.click();
      });
    } catch (error) {
      console.error('Ration entry fix failed', error);
    }
  }, true);
})();
