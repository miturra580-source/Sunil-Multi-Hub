(() => {
  const RATION_RE = /राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|समर्पण|नवीनीकरण|संशोधन|नामिलीकरण|ration/i;
  let timer = null;

  function isRation() {
    const service = document.getElementById('applicationServiceName')?.textContent || '';
    const variant = document.getElementById('applicationVariantName')?.textContent || '';
    return RATION_RE.test(`${service} ${variant}`);
  }

  function ensureSubmit() {
    if (!isRation()) return;

    const form = document.getElementById('dynamicApplicationForm');
    const step6 = document.querySelector('.smh-ration-pane[data-step="5"] .smh-pane-body');
    if (!form || !step6) return;

    // Remove/ignore any stale availability button rendered by generic guards.
    [...step6.querySelectorAll('button')].forEach(btn => {
      if (btn.id === 'smhRationFinalSubmit') return;
      const text = (btn.textContent || '').trim();
      if (/Service अभी उपलब्ध नहीं है|अभी उपलब्ध नहीं/i.test(text)) {
        btn.style.setProperty('display', 'none', 'important');
      }
    });

    // Keep the original application submit button out of Step 6 UI.
    const original = document.getElementById('submitDynamicApplication');
    if (original) original.style.setProperty('display', 'none', 'important');

    let actions = step6.querySelector('.smh-final-submit-wrap');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'smh-final-submit-wrap';
      actions.style.cssText = 'display:flex;justify-content:center;margin:18px 0 10px;';
      step6.appendChild(actions);
    }

    let submit = actions.querySelector('#smhRationFinalSubmit');
    if (!submit) {
      submit = document.createElement('button');
      submit.id = 'smhRationFinalSubmit';
      submit.type = 'button';
      submit.className = 'btn primary';
      submit.textContent = 'सुरक्षित करें एवं आवेदन जमा करें';
      submit.style.cssText = 'width:min(100%,420px);min-height:54px;border-radius:14px;font-weight:800;display:flex;align-items:center;justify-content:center;';
      submit.addEventListener('click', () => {
        // requestSubmit runs the existing HTML validation and the original form submit handler.
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          const event = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(event);
        }
      });
      actions.appendChild(submit);
    }

    submit.disabled = false;
    submit.style.setProperty('display', 'flex', 'important');
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(ensureSubmit, 40);
  }

  function start() {
    schedule();
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    document.addEventListener('click', schedule, true);
    setTimeout(ensureSubmit, 300);
    setTimeout(ensureSubmit, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();