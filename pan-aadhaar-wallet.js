(() => {
  const SERVICE_ID = 'edf53c2d-1712-4108-8f72-1acd10920c77';
  const SERVICE_RE = /aadhaar\s*(?:से|to|→)?\s*pan.*(?:खोज|lookup|find)|pan.*aadhaar/i;

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function makeClient() {
    const cfg = window.SMH_CONFIG || {};
    if (!window.supabase || !cfg.supabaseUrl || !(cfg.supabaseAnonKey || cfg.supabaseKey)) return null;
    return window.supabase.createClient(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey || cfg.supabaseKey,
      { auth: { persistSession: true, autoRefreshToken: true } }
    );
  }

  function isLookupService(form) {
    const name = document.getElementById('applicationServiceName')?.textContent || '';
    const variant = document.getElementById('applicationVariantName')?.textContent || '';
    const serviceId = form?.dataset?.serviceId || form?.getAttribute('data-service-id') || '';
    return String(serviceId) === SERVICE_ID || SERVICE_RE.test(`${name} ${variant}`);
  }

  function notify(text) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = text;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2800);
    } else {
      console.log(text);
    }
  }

  function hideUnavailableMessages(form) {
    [...form.querySelectorAll('div,p,button')].forEach(el => {
      if (el.id === 'fetchPanDataBtn') return;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/form अभी configure नहीं किया गया|service अभी उपलब्ध नहीं है/i.test(text)) {
        el.style.setProperty('display', 'none', 'important');
      }
    });
  }

  function ensureAadhaarField(form) {
    let input = form.querySelector('[name="aadhaar_number"]');
    if (input) return input;

    const host = document.getElementById('beneficiaryFields') || form;
    const wrap = document.createElement('div');
    wrap.id = 'smhAadhaarPanField';
    wrap.setAttribute('data-field-wrap', 'aadhaar_number');
    wrap.style.cssText = 'margin:12px 0;padding:14px;border:1px solid #e2e8f0;border-radius:14px;background:#fff';
    wrap.innerHTML = `
      <label for="smhAadhaarPanInput" style="display:block;font-weight:800;margin-bottom:7px">Aadhaar Number *</label>
      <input
        id="smhAadhaarPanInput"
        name="aadhaar_number"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        maxlength="12"
        placeholder="12 digit Aadhaar Number"
        style="width:100%;box-sizing:border-box;padding:13px;border:1px solid #d8e0eb;border-radius:12px;font:inherit;background:#fff"
      >
      <small style="display:block;margin-top:7px;color:#667085">केवल 12 अंकों का Aadhaar Number भरें।</small>
    `;
    host.prepend(wrap);
    input = wrap.querySelector('[name="aadhaar_number"]');
    input.addEventListener('input', () => {
      input.value = String(input.value || '').replace(/\D/g, '').slice(0, 12);
    });
    return input;
  }

  function setup() {
    const form = document.getElementById('dynamicApplicationForm');
    if (!form || !isLookupService(form)) return;

    hideUnavailableMessages(form);
    const aadhaarInput = ensureAadhaarField(form);
    if (!aadhaarInput) return;

    const normalSubmit = document.getElementById('submitDynamicApplication');
    if (normalSubmit) normalSubmit.style.setProperty('display', 'none', 'important');

    if (document.getElementById('smhAadhaarPanLookup')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'smhAadhaarPanLookup';
    wrapper.style.marginTop = '16px';
    wrapper.innerHTML = `
      <button type="button" id="fetchPanDataBtn" class="btn primary" style="width:100%;min-height:52px">
        🔎 Find PAN by Aadhaar — ₹50
      </button>
      <div id="panLookupResult" style="margin-top:14px;display:none;border:1px solid #dfe5ee;border-radius:14px;padding:14px;background:#f8fafc"></div>
    `;

    const fieldWrap = form.querySelector('[data-field-wrap="aadhaar_number"]') || aadhaarInput.closest('[data-field-wrap]');
    (fieldWrap || aadhaarInput).after(wrapper);

    const btn = wrapper.querySelector('#fetchPanDataBtn');
    const resultBox = wrapper.querySelector('#panLookupResult');

    btn.addEventListener('click', async () => {
      const aadhaar = String(aadhaarInput.value || '').replace(/\D/g, '');
      if (!/^\d{12}$/.test(aadhaar)) {
        notify('12 digit Aadhaar Number भरें');
        aadhaarInput.focus();
        return;
      }

      const sb = makeClient();
      if (!sb) {
        notify('PAN lookup service अभी उपलब्ध नहीं है।');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'PAN खोज रहे हैं...';
      resultBox.style.display = 'block';
      resultBox.innerHTML = '<div style="font-weight:700;color:#475467">कृपया प्रतीक्षा करें...</div>';

      try {
        const { data, error } = await sb.functions.invoke('aadhaar-pan-lookup', { body: { aadhaar } });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.message || 'PAN lookup failed');

        resultBox.innerHTML = `
          <div style="font-weight:800;color:#15803d;margin-bottom:10px">✅ PAN Data Found</div>
          <div style="display:grid;gap:8px">
            <div><strong>PAN Number:</strong> ${esc(data.data?.pan || '')}</div>
            <div><strong>Aadhaar:</strong> ${esc(data.data?.aadhaar || `XXXX-XXXX-${aadhaar.slice(-4)}`)}</div>
            <div><strong>Status:</strong> ${esc(data.data?.status || 'Found')}</div>
            ${data.charged ? `<div style="margin-top:8px;padding:9px;border-radius:10px;background:#ecfdf3;color:#027a48;font-size:13px;font-weight:700">₹${esc(data.amount || 50)} wallet से debit हुआ।</div>` : ''}
          </div>
        `;

        if (typeof window.refreshDashboardWallet === 'function') {
          await window.refreshDashboardWallet();
        }
        notify('PAN data fetched successfully');
      } catch (err) {
        console.error('PAN lookup error:', err);
        const message = err?.context?.body?.message || err?.message || 'PAN lookup failed';
        resultBox.innerHTML = `<div style="color:#b42318;font-weight:700">${esc(message)}</div>`;
        notify(message);
      } finally {
        btn.disabled = false;
        btn.textContent = '🔎 Find PAN by Aadhaar — ₹50';
      }
    });
  }

  const start = () => {
    setup();
    new MutationObserver(() => setTimeout(setup, 30)).observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('click', () => setTimeout(setup, 60), true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();