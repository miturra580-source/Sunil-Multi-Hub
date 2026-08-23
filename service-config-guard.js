(() => {
  const NOT_CONFIGURED_TEXT = 'form अभी configure नहीं किया गया है';

  function getForm() { return document.getElementById('dynamicApplicationForm'); }
  function getSubmitButton() { return document.getElementById('submitDynamicApplication'); }
  function isRationStepper() {
    const form = getForm();
    return !!form?.dataset?.rationV3 || !!document.querySelector('.smh-ration-pane[data-step="5"]');
  }
  function hasCustomWorkflow() {
    return !!document.getElementById('smhAadhaarPanLookup') ||
      !!document.getElementById('fetchPanDataBtn') ||
      isRationStepper();
  }
  function isConfigured() {
    const form = getForm();
    const fieldsBox = document.getElementById('beneficiaryFields');
    if (!form || !fieldsBox) return true;
    if (hasCustomWorkflow()) return true;
    const text = (fieldsBox.textContent || '').trim();
    if (text.includes(NOT_CONFIGURED_TEXT)) return false;
    const hasConfiguredFields = !!fieldsBox.querySelector('input, select, textarea');
    const docsBox = document.getElementById('supportingDocumentsSection');
    const hasConfiguredDocuments = !!docsBox?.querySelector('input[type="file"]');
    const hasSpecialWorkflow =
      !!document.getElementById('aadhaarVerificationSection')?.querySelector('button') ||
      !!document.getElementById('epanOtpSection')?.querySelector('button') ||
      !!document.getElementById('trackingInfoSection')?.querySelector('button');
    return hasConfiguredFields || hasConfiguredDocuments || hasSpecialWorkflow;
  }

  function applyGuard() {
    const button = getSubmitButton();
    const fieldsBox = document.getElementById('beneficiaryFields');
    if (!button || !fieldsBox) return;

    if (isRationStepper()) {
      button.disabled = false;
      button.style.opacity = '';
      button.style.cursor = '';
      button.dataset.smhUnconfigured = '';
      button.textContent = 'सुरक्षित करें एवं आवेदन जमा करें';
      return;
    }

    const configured = isConfigured();
    if (!configured) {
      button.disabled = true;
      button.style.opacity = '0.55';
      button.style.cursor = 'not-allowed';
      button.textContent = 'Service अभी उपलब्ध नहीं है';
      button.dataset.smhUnconfigured = '1';
    } else if (button.dataset.smhUnconfigured === '1') {
      button.disabled = false;
      button.style.opacity = '';
      button.style.cursor = '';
      button.dataset.smhUnconfigured = '';
      button.textContent = 'Submit Application';
    }
  }

  document.addEventListener('submit', event => {
    if (event.target?.id !== 'dynamicApplicationForm') return;
    if (isConfigured()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const errorBox = document.getElementById('applicationError');
    if (errorBox) {
      errorBox.style.display = 'block';
      errorBox.textContent = 'यह service अभी configure नहीं की गई है। इसलिए कोई application/order create नहीं किया गया।';
    }
  }, true);

  const observer = new MutationObserver(() => requestAnimationFrame(applyGuard));
  function start() {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes:true, attributeFilter:['disabled'] });
    applyGuard();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();