(() => {
  const PAN_SERVICE_ID = 'ba17c25e-9833-452d-8005-692d77b080c5';

  function isPanCard(target) {
    const card = target.closest('.portal-service-card');
    if (!card) return null;
    const text = (card.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return text.includes('pan') ? card : null;
  }

  async function openPanDirect() {
    try {
      if (typeof window.openServiceDetails !== 'function') {
        console.error('PAN direct open: openServiceDetails unavailable');
        return;
      }

      // Open the existing PAN service internally so activeService is set correctly.
      window.openServiceDetails(PAN_SERVICE_ID);

      // Bypass the service-details sheet and trigger its existing Apply flow.
      await new Promise(resolve => setTimeout(resolve, 80));

      const detailsBackdrop = document.getElementById('serviceDetailsBackdrop');
      const detailsBox = document.getElementById('serviceDetailsBox');
      if (detailsBackdrop) detailsBackdrop.style.display = 'none';
      if (detailsBox) {
        detailsBox.style.transform = 'translateX(-50%) translateY(110%)';
      }
      document.body.style.overflow = '';

      const apply = document.getElementById('serviceApplyBtn');
      if (!apply) {
        console.error('PAN direct open: Apply button unavailable');
        return;
      }

      apply.click();
    } catch (err) {
      console.error('PAN direct open failed:', err);
    }
  }

  document.addEventListener('click', event => {
    const card = isPanCard(event.target);
    if (!card) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openPanDirect();
  }, true);
})();
