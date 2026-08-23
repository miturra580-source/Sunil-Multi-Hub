(() => {
  const REQUIRED_IDS = [
    'dynamicApplicationModal',
    'applicationBackdrop',
    'applicationBox',
    'applicationServiceName',
    'applicationVariantName',
    'applicationServicePrice',
    'dynamicApplicationForm',
    'beneficiaryFields',
    'supportingDocumentsSection',
    'applicationError',
    'submitDynamicApplication'
  ];

  function isHealthy() {
    return REQUIRED_IDS.every(id => document.getElementById(id));
  }

  function repair() {
    if (isHealthy()) return true;

    const old = document.getElementById('dynamicApplicationModal');
    if (old) old.remove();

    if (typeof window.createApplicationModal === 'function') {
      window.createApplicationModal();
    } else if (typeof createApplicationModal === 'function') {
      createApplicationModal();
    }

    return isHealthy();
  }

  document.addEventListener('click', event => {
    const btn = event.target.closest?.('.variant-select-btn');
    if (!btn) return;
    repair();
  }, true);

  document.addEventListener('DOMContentLoaded', repair, { once: true });
  if (document.readyState !== 'loading') repair();
})();
