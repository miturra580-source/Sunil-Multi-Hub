(() => {
  const RATION_RE = /राशन कार्ड|पात्र गृहस्थी|अन्त्योदय|अंत्योदय|समर्पण|नवीनीकरण|संशोधन|नामिलीकरण|ration/i;
  const MAX_BYTES = 100 * 1024;
  let timer = null;
  let rebuilding = false;

  function isRation() {
    const service = document.getElementById('applicationServiceName')?.textContent || '';
    const variant = document.getElementById('applicationVariantName')?.textContent || '';
    return RATION_RE.test(`${service} ${variant}`);
  }

  function repairEmptyStepper() {
    if (rebuilding || !isRation()) return false;

    const form = document.getElementById('dynamicApplicationForm');
    const root = document.getElementById('beneficiaryFields');
    if (!form || !root || form.dataset.rationV3 !== '1') return false;

    const basic = form.querySelector('.smh-ration-pane[data-step="0"] .smh-pane-body');
    const basicFields = basic?.querySelectorAll('[data-field-wrap]').length || 0;
    const loadedFields = root.querySelectorAll('[data-field-wrap]').length;

    if (basicFields === 0 && loadedFields > 0) {
      rebuilding = true;

      form.querySelectorAll('.smh-ration-pane,.smh-ration-nav').forEach(el => el.remove());
      document.querySelectorAll('.smh-ration-banner,.smh-ration-steps').forEach(el => el.remove());

      root.style.display = '';
      delete form.dataset.rationV3;
      document.getElementById('applicationBox')?.classList.remove('smh-ration-form');

      setTimeout(() => {
        rebuilding = false;
        document.body.appendChild(document.createComment('smh-ration-rebuild'));
      }, 40);

      return true;
    }

    return false;
  }

  function fileOk(input) {
    const file = input?.files?.[0];
    if (!file) return true;
    const typeOk = ['image/jpeg', 'image/png'].includes(file.type) || /\.(jpe?g|png)$/i.test(file.name || '');
    if (!typeOk) {
      alert('केवल JPG/JPEG/PNG फाइल चुनें।');
      input.value = '';
      return false;
    }
    if (file.size > MAX_BYTES) {
      alert('फाइल 100 KB से अधिक नहीं हो सकती।');
      input.value = '';
      return false;
    }
    return true;
  }

  function docNameForWrap(wrap) {
    const id = wrap?.querySelector('input[type="file"]')?.dataset?.documentId;
    try {
      if (id && typeof applicationDocuments !== 'undefined' && Array.isArray(applicationDocuments)) {
        const doc = applicationDocuments.find(d => String(d.id) === String(id));
        if (doc?.name) return String(doc.name);
      }
    } catch (_) {}
    return (wrap?.querySelector('strong')?.textContent || wrap?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function kind(text) {
    const t = String(text || '').toLowerCase();
    if ((/फोटो|photo/.test(t)) && !(/पासबुक|bank/.test(t))) return 'photo';
    if ((/आधार|aadhaar/.test(t)) && !(/पिता|father/.test(t))) return 'aadhaar';
    if (/पासबुक|bank passbook|bank/.test(t)) return 'bank';
    return '';
  }

  function prepareOfficialDocuments(section) {
    if (!section) return [];

    let wraps = [...section.querySelectorAll('[data-document-wrap]')];

    if (!wraps.length) {
      try {
        if (typeof renderSupportingDocuments === 'function') renderSupportingDocuments();
      } catch (e) {
        console.warn('ration documents rerender failed', e);
      }
      wraps = [...section.querySelectorAll('[data-document-wrap]')];
    }

    const seen = new Set();
    const kept = [];

    wraps.forEach(wrap => {
      const input = wrap.querySelector('input[type="file"]');
      const k = kind(docNameForWrap(wrap));
      const keep = !!(input && k && !seen.has(k));

      if (!keep) {
        wrap.style.setProperty('display', 'none', 'important');
        if (input) input.required = false;
        return;
      }

      seen.add(k);
      kept.push({ wrap, input, kind: k });

      wrap.style.setProperty('display', 'grid', 'important');
      input.style.setProperty('display', 'block', 'important');
      input.required = true;
      input.dataset.required = 'true';
      input.accept = 'image/jpeg,image/png,.jpg,.jpeg,.png';

      if (input.dataset.smh100kb !== '1') {
        input.dataset.smh100kb = '1';
        input.addEventListener('change', () => fileOk(input));
      }

      const smalls = [...wrap.querySelectorAll('small')];
      const sizeSmall = smalls[smalls.length - 1];
      if (sizeSmall) sizeSmall.textContent = 'Maximum 100 KB • JPG/PNG';
    });

    return kept;
  }

  function fallbackAttachments(body) {
    let box = body.querySelector('#smhRationFallbackAttachments');
    if (box) return box;

    box = document.createElement('div');
    box.id = 'smhRationFallbackAttachments';
    box.innerHTML = `
      <div class="smh-attach-note">तीनों दस्तावेज़ अनिवार्य हैं • JPG/JPEG/PNG • अधिकतम 100 KB प्रति फाइल</div>
      <label class="smh-final-doc"><strong>मुखिया की फोटो *</strong><input type="file" name="ration_head_photo" accept="image/jpeg,image/png,.jpg,.jpeg,.png" required><small>Maximum 100 KB</small></label>
      <label class="smh-final-doc"><strong>मुखिया का Aadhaar Card *</strong><input type="file" name="ration_head_aadhaar" accept="image/jpeg,image/png,.jpg,.jpeg,.png" required><small>Maximum 100 KB</small></label>
      <label class="smh-final-doc"><strong>Bank Passbook *</strong><input type="file" name="ration_bank_passbook" accept="image/jpeg,image/png,.jpg,.jpeg,.png" required><small>Maximum 100 KB</small></label>`;
    body.prepend(box);
    box.querySelectorAll('input[type="file"]').forEach(input => input.addEventListener('change', () => fileOk(input)));
    return box;
  }

  function fixStep5() {
    const body = document.querySelector('.smh-ration-pane[data-step="4"] .smh-pane-body');
    if (!body) return;

    const section = document.getElementById('supportingDocumentsSection');
    if (section) {
      if (section.parentElement !== body) body.appendChild(section);
      section.style.setProperty('display', 'block', 'important');
    }

    const kept = prepareOfficialDocuments(section);
    const oldFallback = body.querySelector('#smhRationFixedAttachments');
    const finalFallback = body.querySelector('#smhRationFallbackAttachments');

    if (kept.length === 3) {
      oldFallback?.remove();
      finalFallback?.remove();
      if (!body.querySelector('.smh-attach-note')) {
        const note = document.createElement('div');
        note.className = 'smh-attach-note';
        note.textContent = 'तीनों दस्तावेज़ अनिवार्य हैं • JPG/JPEG/PNG • अधिकतम 100 KB प्रति फाइल';
        body.prepend(note);
      }
    } else {
      if (section) section.style.setProperty('display', 'none', 'important');
      oldFallback?.remove();
      fallbackAttachments(body);
    }
  }

  function fixStep6() {
    const body = document.querySelector('.smh-ration-pane[data-step="5"] .smh-pane-body');
    const form = document.getElementById('dynamicApplicationForm');
    if (!body || !form) return;

    let actions = body.querySelector('.smh-final-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'smh-final-actions';
      body.appendChild(actions);
    }

    let submit = document.getElementById('submitDynamicApplication');
    if (!submit) {
      submit = document.createElement('button');
      submit.type = 'submit';
      submit.id = 'submitDynamicApplication';
      submit.className = 'btn primary';
    }

    if (submit.parentElement !== actions) actions.appendChild(submit);
    submit.textContent = 'सुरक्षित करें एवं आवेदन जमा करें';
    submit.style.setProperty('display', 'inline-flex', 'important');
    submit.style.setProperty('align-items', 'center', 'important');
    submit.style.setProperty('justify-content', 'center', 'important');
    submit.style.setProperty('width', 'auto', 'important');
    submit.style.setProperty('min-width', '220px', 'important');
    submit.style.setProperty('margin', '0', 'important');

    let reset = actions.querySelector('#smhRationResetBtn');
    if (!reset) {
      reset = document.createElement('button');
      reset.type = 'button';
      reset.id = 'smhRationResetBtn';
      reset.textContent = 'Reset करें';
      reset.addEventListener('click', () => {
        if (!confirm('क्या आप राशन कार्ड फॉर्म की भरी हुई जानकारी Reset करना चाहते हैं?')) return;
        form.reset();
        form.querySelectorAll('input[type="file"]').forEach(x => { x.value = ''; });
        form.querySelectorAll('[data-nfsa]').forEach(x => { x.value = ''; });
        try {
          Object.keys(localStorage).filter(k => /ration|nfsa/i.test(k)).forEach(k => localStorage.removeItem(k));
        } catch (_) {}
        document.querySelector('.smh-ration-step[data-step="0"]')?.click();
      });
      actions.appendChild(reset);
    }
  }

  function addStyle() {
    if (document.getElementById('smhRationFinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'smhRationFinalStyle';
    style.textContent = `
      .smh-final-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:16px 0 4px;padding-top:12px;border-top:1px solid #e4eadf}
      #smhRationResetBtn{min-width:110px;padding:10px 16px;border:1px solid #cfd8c8;border-radius:6px;background:#f5f7f3;color:#344054;font-weight:800;cursor:pointer}
      #smhRationFallbackAttachments{display:grid;gap:7px}
      .smh-final-doc{display:grid;grid-template-columns:180px minmax(180px,1fr) 110px;gap:8px;align-items:center;padding:9px;border:1px solid #dfe7da;border-radius:6px;background:#fbfdf9;font-size:11px}
      .smh-final-doc input{width:100%;font-size:10px}.smh-final-doc small{font-size:9px;color:#667085}
      @media(max-width:520px){.smh-final-doc{grid-template-columns:1fr}.smh-final-actions{align-items:stretch}.smh-final-actions>*{width:100%!important}}
    `;
    document.head.appendChild(style);
  }

  function repair() {
    if (!isRation()) return;
    if (repairEmptyStepper()) return;
    addStyle();
    fixStep5();
    fixStep6();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(repair, 50);
  }

  function start() {
    schedule();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('click', schedule, true);
    document.addEventListener('change', schedule, true);
    setTimeout(repair, 400);
    setTimeout(repair, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();