(() => {
  const SERVICE_ID = '48e430f8-284c-4c11-b928-c0ce08c382f4';
  const OPENING_CLASS = 'smh-certificate-direct-opening';

  function injectStyles() {
    if (document.getElementById('smhCertificateDirectNoBlink')) return;
    const style = document.createElement('style');
    style.id = 'smhCertificateDirectNoBlink';
    style.textContent = `body.${OPENING_CLASS} #serviceDetailsBackdrop,body.${OPENING_CLASS} #serviceDetailsBox{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;transition:none!important}`;
    document.head.appendChild(style);
  }

  function isEdistrictCard(target) {
    const card = target.closest('.portal-service-card');
    if (!card) return null;
    const text = (card.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return text.includes('edistrict') || (text.includes('आय') && text.includes('जाति') && text.includes('निवास')) ? card : null;
  }

  function serviceCardReady() {
    return [...document.querySelectorAll('.portal-service-card')].some(card => {
      const text = (card.textContent || '').toLowerCase();
      return text.includes('edistrict') || String(card.getAttribute('onclick') || '').includes(SERVICE_ID);
    });
  }

  function openDirectHere() {
    if (typeof window.openServiceDetails !== 'function' || !serviceCardReady()) return false;
    document.body.classList.add(OPENING_CLASS);
    window.openServiceDetails(SERVICE_ID);
    requestAnimationFrame(() => {
      const apply = document.getElementById('serviceApplyBtn');
      if (!apply) { document.body.classList.remove(OPENING_CLASS); return; }
      apply.click();
      setTimeout(() => document.body.classList.remove(OPENING_CLASS), 250);
    });
    return true;
  }

  function autoOpenFromQuery() {
    if (new URLSearchParams(location.search).get('edistrict') !== '1') return;
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (openDirectHere() || tries > 120) clearInterval(timer);
    }, 100);
  }

  injectStyles();
  document.addEventListener('click', event => {
    const card = isEdistrictCard(event.target);
    if (!card) return;
    if (new URLSearchParams(location.search).get('edistrict') === '1') return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    window.open('dashboard.html?edistrict=1', '_blank', 'noopener');
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoOpenFromQuery, {once:true});
  else autoOpenFromQuery();
})();