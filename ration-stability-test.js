(() => {
  const RATION_RE = /राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|समर्पण|नवीनीकरण|संशोधन|नामिलीकरण|ration/i;
  const TEST_DISABLE_REQUIRED = true; // temporary: re-enable after stability test
  let initialized = false;
  let saveTimer = null;
  let lastKey = '';

  function isRation() {
    const service = document.getElementById('applicationServiceName')?.textContent || '';
    const variant = document.getElementById('applicationVariantName')?.textContent || '';
    return RATION_RE.test(`${service} ${variant}`);
  }

  function form() { return document.getElementById('dynamicApplicationForm'); }

  function key() {
    const service = (document.getElementById('applicationServiceName')?.textContent || 'ration').trim();
    const variant = (document.getElementById('applicationVariantName')?.textContent || 'default').trim();
    return 'smh_ration_stable_' + `${service}__${variant}`.replace(/\s+/g, '_');
  }

  function disableRequiredTemporarily() {
    if (!TEST_DISABLE_REQUIRED || !isRation()) return;
    const f = form();
    if (!f) return;
    f.querySelectorAll('[required]').forEach(el => {
      el.dataset.smhWasRequired = '1';
      el.required = false;
      el.removeAttribute('required');
    });
    f.querySelectorAll('[data-required="true"]').forEach(el => {
      el.dataset.smhWasDataRequired = '1';
      el.dataset.required = 'false';
    });
  }

  function stabilizeStep6() {
    if (!isRation()) return;
    const f = form();
    const step6 = document.querySelector('.smh-ration-pane[data-step="5"] .smh-pane-body');
    if (!f || !step6) return;

    const original = document.getElementById('submitDynamicApplication');
    if (original) {
      original.disabled = false;
      original.textContent = 'सुरक्षित करें एवं आवेदन जमा करें';
      original.style.setProperty('display', 'inline-flex', 'important');
      original.style.setProperty('visibility', 'visible', 'important');
      original.style.setProperty('opacity', '1', 'important');
    }

    const submitText = /सुरक्षित करें एवं आवेदन जमा करें|Submit Application|Service अभी उपलब्ध नहीं है/i;
    [...step6.querySelectorAll('button')].forEach(btn => {
      if (btn === original || btn.id === 'smhRationResetBtn') return;
      const text = (btn.textContent || '').trim();
      if (submitText.test(text)) btn.remove();
    });

    step6.querySelectorAll('.smh-final-submit-wrap').forEach(wrap => wrap.remove());
  }

  function collect() {
    if (!isRation()) return null;
    const f = form();
    if (!f) return null;
    const data = { values:{}, checks:{}, radios:{}, nfsa:{}, step:0, savedAt:Date.now() };

    f.querySelectorAll('input,select,textarea').forEach((el, i) => {
      if (el.type === 'file') return;
      const name = el.name || el.id || `anon_${i}`;
      if (el.type === 'checkbox') data.checks[name] = !!el.checked;
      else if (el.type === 'radio') { if (el.checked) data.radios[name] = el.value; }
      else data.values[name] = el.value;
    });

    f.querySelectorAll('[data-nfsa]').forEach((el, i) => {
      const k = el.dataset.nfsa || el.dataset.no || el.name || `nfsa_${i}`;
      data.nfsa[k] = el.value;
    });

    const activePane = f.querySelector('.smh-ration-pane.active');
    if (activePane) data.step = Number(activePane.dataset.step || 0);
    else {
      const activeStep = f.querySelector('.smh-ration-step.active');
      if (activeStep) data.step = Number(activeStep.dataset.step || 0);
    }
    return data;
  }

  function save() {
    if (!initialized || !isRation()) return;
    const d = collect();
    if (!d) return;
    try { localStorage.setItem(key(), JSON.stringify(d)); } catch (e) { console.warn('ration stable draft save failed', e); }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 120);
  }

  function findControl(name) {
    const f = form();
    if (!f) return null;
    return [...f.querySelectorAll('input,select,textarea')].find((el, i) => (el.name || el.id || `anon_${i}`) === name) || null;
  }

  function restore() {
    if (!isRation()) return false;
    const f = form();
    if (!f || !f.querySelector('.smh-ration-pane')) return false;
    let d = null;
    try { d = JSON.parse(localStorage.getItem(key()) || 'null'); } catch (_) {}
    if (!d) return false;

    Object.entries(d.values || {}).forEach(([name, val]) => {
      const el = findControl(name);
      if (!el || el.type === 'file') return;
      el.value = val ?? '';
    });
    Object.entries(d.checks || {}).forEach(([name, val]) => {
      const el = findControl(name); if (el) el.checked = !!val;
    });
    Object.entries(d.radios || {}).forEach(([name, val]) => {
      const f2 = form(); if (!f2) return;
      [...f2.querySelectorAll('input[type="radio"]')].filter(el => (el.name || el.id) === name).forEach(el => { el.checked = String(el.value) === String(val); });
    });
    const nfsaEls = [...f.querySelectorAll('[data-nfsa]')];
    Object.entries(d.nfsa || {}).forEach(([k, val]) => {
      const el = nfsaEls.find((x,i) => (x.dataset.nfsa || x.dataset.no || x.name || `nfsa_${i}`) === k);
      if (el) el.value = val ?? '';
    });

    const step = Math.max(0, Math.min(5, Number(d.step || 0)));
    const target = f.querySelector(`.smh-ration-pane[data-step="${step}"]`);
    if (target) {
      f.querySelectorAll('.smh-ration-pane').forEach(p => p.classList.toggle('active', p === target));
      f.querySelectorAll('.smh-ration-step').forEach(s => s.classList.toggle('active', Number(s.dataset.step) === step));
    }

    f.querySelectorAll('input,select,textarea').forEach(el => {
      if (el.type !== 'file') el.dispatchEvent(new Event('change', { bubbles:true }));
    });
    return true;
  }

  function bind() {
    if (!isRation()) return;
    const f = form();
    if (!f) return;

    disableRequiredTemporarily();
    stabilizeStep6();

    const k = key();
    if (lastKey !== k) {
      lastKey = k;
      initialized = false;
      setTimeout(() => restore(), 150);
      setTimeout(() => restore(), 450);
      setTimeout(() => { restore(); initialized = true; }, 900);
    }

    if (f.dataset.smhStableDraftBound !== '1') {
      f.dataset.smhStableDraftBound = '1';
      f.addEventListener('input', e => { if (e.target?.type !== 'file') scheduleSave(); }, true);
      f.addEventListener('change', e => { if (e.target?.type !== 'file') scheduleSave(); }, true);
      f.addEventListener('click', e => {
        if (e.target.closest('.smh-next,.smh-prev,.smh-ration-step,.smh-save-member,.smh-add-member')) setTimeout(scheduleSave, 80);
      }, true);
    }
  }

  const obs = new MutationObserver(() => requestAnimationFrame(bind));
  function start() {
    bind();
    obs.observe(document.body, { childList:true, subtree:true });
    setInterval(() => { if (isRation()) { disableRequiredTemporarily(); stabilizeStep6(); save(); } }, 1500);
    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();