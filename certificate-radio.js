(() => {
  const SERVICE_RE = /आय.*जाति.*निवास|जाति.*निवास.*आय|निवास.*आय.*जाति/;

  const LABELS = {
    area_type: ['ग्रामीण','नगरीय'],
    relation_type: ['पिता','पति','संरक्षक']
  };

  function makeRadioGroup(select, name, values) {
    if (!select || select.dataset.smhRadioDone === '1') return;
    const wrap = select.closest('[data-field-wrap]') || select.parentElement;
    if (!wrap) return;

    const current = select.value;
    const group = document.createElement('div');
    group.className = 'smh-radio-group';
    group.dataset.for = name;

    values.forEach((value, idx) => {
      const id = `smh-${name}-${idx}`;
      const label = document.createElement('label');
      label.className = 'smh-radio-pill';
      label.setAttribute('for', id);
      label.innerHTML = `<input type="radio" id="${id}" name="${name}__radio" value="${value}"><span>${value}</span>`;
      const radio = label.querySelector('input');
      if (current === value) radio.checked = true;
      radio.addEventListener('change', () => {
        select.value = radio.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        updateRelationLabel();
      });
      group.appendChild(label);
    });

    select.dataset.smhRadioDone = '1';
    select.style.display = 'none';
    select.insertAdjacentElement('afterend', group);
  }

  function updateRelationLabel() {
    const relation = document.querySelector('#beneficiaryFields [name="relation_type"]')?.value;
    const input = document.querySelector('#beneficiaryFields [name="relation_name"]');
    if (!input) return;
    const fieldWrap = input.closest('[data-field-wrap]') || input.parentElement;
    const label = fieldWrap?.querySelector('label, .field-label, span');
    const text = relation ? `${relation} का नाम` : 'पिता / पति / संरक्षक का नाम';
    if (label && label !== input) {
      if (label.childNodes.length === 1 && label.firstChild?.nodeType === Node.TEXT_NODE) label.textContent = text;
    }
    input.placeholder = text;
  }

  function ensureStyles() {
    if (document.getElementById('smhCertificateRadioStyles')) return;
    const style = document.createElement('style');
    style.id = 'smhCertificateRadioStyles';
    style.textContent = `
      .smh-radio-group{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
      .smh-radio-pill{display:inline-flex;align-items:center;gap:7px;padding:9px 13px;border:1px solid #d9e1ec;border-radius:999px;background:#fff;cursor:pointer;font-weight:700;color:#27364a;user-select:none}
      .smh-radio-pill input{margin:0;width:16px;height:16px;accent-color:#2563eb}
      .smh-radio-pill:has(input:checked){border-color:#2563eb;background:#eef4ff;color:#1747a8;box-shadow:0 0 0 2px rgba(37,99,235,.08)}
      @media(max-width:520px){.smh-radio-pill{padding:8px 11px;font-size:13px}}
    `;
    document.head.appendChild(style);
  }

  function enhance() {
    const title = document.getElementById('applicationServiceName');
    if (!title || !SERVICE_RE.test(title.textContent || '')) return;
    ensureStyles();

    Object.entries(LABELS).forEach(([name, values]) => {
      const select = document.querySelector(`#beneficiaryFields [name="${name}"]`);
      if (select?.tagName === 'SELECT') makeRadioGroup(select, name, values);
    });
    updateRelationLabel();
  }

  function start() {
    enhance();
    new MutationObserver(() => requestAnimationFrame(enhance)).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
