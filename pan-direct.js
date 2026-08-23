(() => {
  const PAN_LABEL = 'PAN कार्ड सेवाएँ';

  function isPanCardButton(target) {
    const card = target.closest('.portal-service-card');
    if (!card) return null;
    const text = (card.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return text.includes('pan कार्ड') || text.includes('pan services') ? card : null;
  }

  async function openPanDirect() {
    try {
      if (typeof window.selectServiceByName === 'function') {
        window.selectServiceByName(PAN_LABEL);
      } else {
        const cards = [...document.querySelectorAll('.portal-service-card')];
        const pan = cards.find(card => /pan/i.test(card.textContent || ''));
        pan?.click();
        return;
      }

      // Let the existing service selector set activeService, then bypass the details sheet.
      await new Promise(resolve => setTimeout(resolve, 40));

      const detailsBackdrop = document.getElementById('serviceDetailsBackdrop');
      const detailsBox = document.getElementById('serviceDetailsBox');
      if (detailsBackdrop) detailsBackdrop.style.display = 'none';
      if (detailsBox) detailsBox.style.transform = 'translateX(-50%) translateY(110%)';
      document.body.style.overflow = '';

      if (typeof window.handleServiceApply === 'function') {
        window.handleServiceApply();
      } else {
        const apply = document.getElementById('serviceApplyBtn');
        apply?.click();
      }
    } catch (err) {
      console.error('PAN direct open failed:', err);
    }
  }

  document.addEventListener('click', (event) => {
    const card = isPanCardButton(event.target);
    if (!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openPanDirect();
  }, true);
})();
