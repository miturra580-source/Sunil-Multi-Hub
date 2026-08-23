(() => {
  const SERVICE_ID = 'edf53c2d-1712-4108-8f72-1acd10920c77';
  const SERVICE_RE = /aadhaar\s*(?:से|to|→)?\s*pan.*(?:खोज|lookup|find)|pan.*aadhaar/i;
  let busy = false;

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
    const serviceId = form?.dataset?.serviceId || form?.getAttribute('data-service-id') || '';
    return String(serviceId) === SERVICE_ID || SERVICE_RE.test(name);
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

  function setup() {
    if (busy) return;
    const form = document.getElementById('dynamicApplicationForm');
    if (!form || !isLookupService(form)) return;

    const aadhaarInput = form.querySelector('[name="aadhaar_number"]');
    if (!aadhaarInput) return;

    const normalSubmit = document.getElementById('submitDynamicApplication');
    if (normalSubmit) normalSubmit.style.display = 'none';

    if (document.getElementById('fetchPanDataBtn')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'smhAadhaarPanLookup';
    wrapper.style.marginTop = '16px';
    wrapper.innerHTML = `
      <button type="button" id="fetchPanDataBtn" class="btn primary" style="width:100%;min-height:52px">
        🔎 Fetch PAN Data — ₹50
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
      btn.textContent = 'Fetching PAN...';

      try {
        const { data, error } = await sb.functions.invoke('aadhaar-pan-lookup', { body: { aadhaar } });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.message || 'PAN lookup failed');

        resultBox.style.display = 'block';
        resultBox.innerHTML = `
          <div style="font-weight:800;color:#15803d;margin-bottom:10px">✅ PAN Data Found</div>
          <div style="display:grid;gap:8px">
            <div><strong>PAN Number:</strong> ${esc(data.data?.pan || '')}</div>
            <div><strong>Aadhaar:</strong> ${esc(data.data?.aadhaar || '')}</div>
            <div><strong>Status:</strong> ${esc(data.data?.status || data.data?.details || '')}</div>
            ${data.test_mode ? `<div style="margin-top:8px;padding:9px;border-radius:10px;background:#fff7e6;color:#8a5a00;font-size:13px">${data.charged ? `TEST MODE — ₹${esc(data.amount || 50)} wallet से debit हुआ। Real PAN lookup अभी नहीं हुआ।` : 'TEST MODE — कोई real PAN lookup या wallet debit नहीं हुआ।'}</div>` : ''}
          </div>
        `;

        if (typeof window.refreshDashboardWallet === 'function') {
          await window.refreshDashboardWallet();
        }
        notify('PAN data fetched successfully');
      } catch (err) {
        console.error('PAN lookup error:', err);
        resultBox.style.display = 'block';
        resultBox.innerHTML = `<div style="color:#b42318;font-weight:700">PAN lookup failed: ${esc(err?.message || 'Unknown error')}</div>`;
        notify(err?.message || 'PAN lookup failed');
      } finally {
        btn.disabled = false;
        btn.textContent = '🔎 Fetch PAN Data — ₹50';
      }
    });
  }

  const start = () => {
    setup();
    new MutationObserver(() => setTimeout(setup, 20)).observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('click', () => setTimeout(setup, 50), true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();