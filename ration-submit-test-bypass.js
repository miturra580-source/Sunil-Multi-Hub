(() => {
  const RATION_RE = /राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|आधार सीडिंग|समर्पण|नवीनीकरण|संशोधन|ration/i;

  function isRation() {
    const service = document.getElementById('applicationServiceName')?.textContent || '';
    const variant = document.getElementById('applicationVariantName')?.textContent || '';
    return RATION_RE.test(`${service} ${variant}`);
  }

  function relaxForm() {
    if (!isRation()) return;
    const form = document.getElementById('dynamicApplicationForm');
    if (!form) return;

    form.noValidate = true;
    form.setAttribute('novalidate', 'novalidate');

    form.querySelectorAll('input,select,textarea').forEach(el => {
      el.required = false;
      el.removeAttribute('required');
      el.removeAttribute('pattern');
      el.removeAttribute('minlength');
      el.removeAttribute('maxlength');
      el.removeAttribute('min');
      el.removeAttribute('max');
      if (el.dataset) el.dataset.required = 'false';
      if (typeof el.setCustomValidity === 'function') el.setCustomValidity('');
    });

    // Temporary test mode: remove visual required stars as well.
    form.querySelectorAll('label, strong, .smh-pane-body').forEach(node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.includes('*')) {
          child.textContent = child.textContent.replace(/\s*\*\s*/g, ' ');
        }
      });
    });
  }

  function installBypass() {
    if (window.__smhRationSubmitBypassInstalled) return true;
    if (typeof window.validateApplication !== 'function') return false;

    const originalValidateApplication = window.validateApplication;
    window.validateApplication = function(values) {
      if (isRation()) return true;
      return originalValidateApplication.apply(this, arguments);
    };

    if (typeof window.validateFieldRules === 'function') {
      const originalValidateFieldRules = window.validateFieldRules;
      window.validateFieldRules = function(values) {
        if (isRation()) return true;
        return originalValidateFieldRules.apply(this, arguments);
      };
    }

    window.__smhRationSubmitBypassInstalled = true;
    return true;
  }

  function tick() {
    installBypass();
    relaxForm();
  }

  function start() {
    tick();
    const obs = new MutationObserver(() => requestAnimationFrame(tick));
    obs.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', tick, true);
    document.addEventListener('input', tick, true);
    document.addEventListener('change', tick, true);
    const id = setInterval(() => {
      tick();
      if (window.__smhRationSubmitBypassInstalled) clearInterval(id);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();