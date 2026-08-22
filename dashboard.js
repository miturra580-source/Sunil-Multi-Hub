/* =========================================================
   SUNIL MULTI HUB
   CUSTOMER PORTAL + DYNAMIC APPLICATION SYSTEM
========================================================= */

const $ = id => document.getElementById(id);

const toast = $('toast');

let toastTimer = null;
let user = null;
let services = [];
let activeService = null;

let applicationFields = [];
let applicationDocuments = [];

let aadhaarVerification = {
  status: 'not_checked',
  provider: null,
  verifiedAt: null,
  last4: null,
  result: {}
};


/* =========================================================
   HELPERS
========================================================= */

function msg(text) {
  if (!toast) {
    console.log(text);
    return;
  }

  toast.textContent = text;
  toast.classList.add('show');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}


function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}


function money(value) {
  return '₹' + Number(value || 0).toLocaleString('en-IN');
}


function normalizeCategory(value) {
  const v = String(value || '').trim().toLowerCase();

  if (v === 'popular') return 'Popular';
  if (v === 'government') return 'Government';
  if (v === 'print') return 'Print';

  return 'Other';
}


function safeFileName(name = 'file') {
  return String(name)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-100);
}


function isPANService(service) {
  return String(service?.name || '').toLowerCase().includes('pan');
}


function makeClient() {
  const cfg = window.SMH_CONFIG || {};

  const url = cfg.supabaseUrl;
  const key = cfg.supabaseAnonKey || cfg.supabaseKey;

  if (!url || !key) {
    throw new Error('Supabase config missing');
  }

  return window.supabase.createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
}


const sb = makeClient();


/* =========================================================
   BOOT
========================================================= */

async function boot() {
  createServiceDetailsModal();
  createApplicationModal();

  try {
    const {
      data: { session },
      error
    } = await sb.auth.getSession();

    if (error) throw error;

    if (!session) {
      location.replace('auth.html');
      return;
    }

    user = session.user;

    if ($('who')) {
      $('who').textContent = user.email || 'Customer';
    }

    setupBasicActions();

    await loadServices();
    await loadCustomerActivity();

  } catch (error) {
    console.error(error);
    msg(error.message || 'Portal loading failed');
  }
}


function setupBasicActions() {
  if ($('logoutBtn')) {
    $('logoutBtn').onclick = async () => {
      await sb.auth.signOut();
      location.href = 'auth.html';
    };
  }

  /*
    पुराने generic form को अब service-specific form replace करेगा.
  */
  if ($('orderForm')) {
    $('orderForm').onsubmit = event => {
      event.preventDefault();

      msg('ऊपर service चुनकर Apply Now दबाएँ।');
    };
  }
}


/* =========================================================
   SERVICES
========================================================= */

async function loadServices() {
  const { data, error } = await sb
    .from('services')
    .select(`
      id,
      name,
      description,
      price,
      active,
      sort_order,
      category,
      icon,
      required_documents,
      instructions,
      processing_mode
    `)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  services = data || [];

  if ($('serviceCount')) {
    $('serviceCount').textContent = services.length;
  }

  renderServiceSections();

  const requested =
    localStorage.getItem('smh-selected-service');

  if (requested) {
    localStorage.removeItem('smh-selected-service');

    const match = services.find(
      service =>
        String(service.name).trim().toLowerCase() ===
        requested.trim().toLowerCase()
    );

    if (match) {
      openServiceDetails(match.id);
    }
  }
}


function getGridByHeading(text) {
  const sections =
    [...document.querySelectorAll('.portal-section')];

  const section = sections.find(sec => {
    const heading = sec.querySelector('h2');
    return heading && heading.textContent.includes(text);
  });

  return section?.querySelector('.portal-service-grid');
}


function serviceCard(service) {
  return `
    <button
      type="button"
      class="portal-service-card"
      onclick="window.openServiceDetails('${esc(service.id)}')"
    >
      <span class="portal-service-icon">
        ${esc(service.icon || '🧩')}
      </span>

      <strong>
        ${esc(service.name)}
      </strong>

      <small>
        ${esc(service.description || 'Online Service')}
      </small>

      ${
        Number(service.price || 0) > 0
          ? `
            <span style="
              margin-top:7px;
              font-size:13px;
              font-weight:800;
              color:#2855cc
            ">
              ${money(service.price)}
            </span>
          `
          : ''
      }
    </button>
  `;
}


function renderServiceSections() {
  const popularGrid = getGridByHeading('लोकप्रिय सेवाएँ');
  const governmentGrid = getGridByHeading('सरकारी एवं नागरिक सेवाएँ');
  const printGrid = getGridByHeading('प्रिंट और दस्तावेज़ सेवाएँ');
  const otherGrid = getGridByHeading('अन्य सेवाएँ');

  const byCategory = category =>
    services.filter(
      s => normalizeCategory(s.category) === category
    );

  if (popularGrid) {
    popularGrid.innerHTML =
      byCategory('Popular').map(serviceCard).join('') ||
      '<p>No services available.</p>';
  }

  if (governmentGrid) {
    governmentGrid.innerHTML =
      byCategory('Government').map(serviceCard).join('') ||
      '<p>No services available.</p>';
  }

  if (printGrid) {
    printGrid.innerHTML =
      byCategory('Print').map(serviceCard).join('') +

      `
      <a class="portal-service-card" href="tools.html#passport">
        <span class="portal-service-icon">📸</span>
        <strong>Passport Photo</strong>
        <small>Photo Maker</small>
      </a>

      <a class="portal-service-card" href="tools.html#jpg-pdf">
        <span class="portal-service-icon">📄</span>
        <strong>JPG → PDF</strong>
        <small>Online Tool</small>
      </a>

      <a class="portal-service-card" href="tools.html#merge-pdf">
        <span class="portal-service-icon">🧩</span>
        <strong>Merge PDF</strong>
        <small>PDF Tool</small>
      </a>
      `;
  }

  if (otherGrid) {
    otherGrid.innerHTML =
      byCategory('Other').map(serviceCard).join('') +

      `
      <a class="portal-service-card" href="tools.html">
        <span class="portal-service-icon">🧰</span>
        <strong>All Online Tools</strong>
        <small>Open Toolkit</small>
      </a>
      `;
  }
}


/* =========================================================
   SERVICE DETAILS MODAL
========================================================= */

function createServiceDetailsModal() {
  if ($('serviceDetailsModal')) return;

  const wrapper = document.createElement('div');

  wrapper.id = 'serviceDetailsModal';

  wrapper.innerHTML = `
    <div
      id="serviceDetailsBackdrop"
      style="
        display:none;
        position:fixed;
        inset:0;
        background:rgba(8,18,38,.60);
        z-index:9998
      ">
    </div>

    <div
      id="serviceDetailsBox"
      style="
        position:fixed;
        left:50%;
        bottom:0;
        transform:translateX(-50%) translateY(110%);
        width:min(620px,100%);
        max-height:90vh;
        overflow:auto;
        padding:22px;
        background:#fff;
        z-index:9999;
        border-radius:26px 26px 0 0;
        box-shadow:0 -20px 60px rgba(0,0,0,.25);
        transition:.25s ease
      ">

      <div style="
        display:flex;
        justify-content:space-between;
        gap:14px;
        align-items:flex-start
      ">

        <div style="display:flex;gap:12px;align-items:center">

          <div
            id="serviceModalIcon"
            style="
              width:58px;
              height:58px;
              border-radius:18px;
              display:grid;
              place-items:center;
              background:#eef3ff;
              font-size:29px
            ">
            🧩
          </div>

          <div>
            <small
              id="serviceModalCategory"
              style="font-weight:800;color:#2855cc">
              SERVICE
            </small>

            <h2
              id="serviceModalName"
              style="margin:4px 0 0">
              Service
            </h2>
          </div>

        </div>

        <button
          type="button"
          id="serviceModalClose"
          style="
            width:40px;
            height:40px;
            border:0;
            border-radius:50%;
            background:#f1f4f8;
            font-size:22px
          ">
          ×
        </button>

      </div>

      <p
        id="serviceModalDescription"
        style="
          color:#667085;
          line-height:1.6;
          margin:18px 0
        ">
      </p>

      <div
        id="serviceModalPriceBox"
        style="
          background:#edf3ff;
          padding:15px;
          border-radius:16px;
          margin-bottom:15px
        ">

        <small>Service Price</small>

        <strong
          id="serviceModalPrice"
          style="
            display:block;
            font-size:26px;
            color:#2855cc
          ">
          ₹0
        </strong>

      </div>

      <div style="
        border:1px solid #e4e9f1;
        border-radius:16px;
        padding:16px;
        margin-bottom:14px
      ">

        <h3 style="margin:0 0 10px">
          📄 आवश्यक दस्तावेज़
        </h3>

        <div
          id="serviceModalDocuments"
          style="color:#566174;line-height:1.8">
        </div>

      </div>

      <div style="
        border:1px solid #e4e9f1;
        border-radius:16px;
        padding:16px;
        margin-bottom:18px
      ">

        <h3 style="margin:0 0 10px">
          ℹ️ जरूरी जानकारी
        </h3>

        <div
          id="serviceModalInstructions"
          style="color:#566174;line-height:1.7">
        </div>

      </div>

      <button
        type="button"
        id="serviceApplyBtn"
        class="btn primary"
        style="width:100%;min-height:52px">
        Apply Now
      </button>

    </div>
  `;

  document.body.appendChild(wrapper);

  $('serviceModalClose').onclick =
    closeServiceDetails;

  $('serviceDetailsBackdrop').onclick =
    closeServiceDetails;

  $('serviceApplyBtn').onclick =
    () => {
      if (activeService) {
        closeServiceDetails();
        setTimeout(() => openApplicationForm(activeService.id), 220);
      }
    };
}


function documentList(text) {
  const value = String(text || '').trim();

  if (!value) {
    return 'Document list application form में दिखाई जाएगी।';
  }

  return value
    .split(/\n+/)
    .filter(Boolean)
    .map(item => `
      <div style="display:flex;gap:8px;margin:6px 0">
        <span>✓</span>
        <span>${esc(item.trim())}</span>
      </div>
    `)
    .join('');
}


function openServiceDetails(id) {
  const service = services.find(
    s => String(s.id) === String(id)
  );

  if (!service) {
    msg('Service उपलब्ध नहीं है');
    return;
  }

  activeService = service;

  $('serviceModalIcon').textContent =
    service.icon || '🧩';

  $('serviceModalCategory').textContent =
    normalizeCategory(service.category);

  $('serviceModalName').textContent =
    service.name;

  $('serviceModalDescription').textContent =
    service.description || '';

  if (Number(service.price || 0) > 0) {
    $('serviceModalPriceBox').style.display = 'block';
    $('serviceModalPrice').textContent = money(service.price);
  } else {
    $('serviceModalPriceBox').style.display = 'none';
  }

  $('serviceModalDocuments').innerHTML =
    documentList(service.required_documents);

  $('serviceModalInstructions').textContent =
    service.instructions ||
    'आवेदन से पहले सभी जानकारी और दस्तावेज़ जाँच लें।';

  $('serviceDetailsBackdrop').style.display = 'block';

  requestAnimationFrame(() => {
    $('serviceDetailsBox').style.transform =
      'translateX(-50%) translateY(0)';
  });

  document.body.style.overflow = 'hidden';
}


function closeServiceDetails() {
  if (!$('serviceDetailsBox')) return;

  $('serviceDetailsBox').style.transform =
    'translateX(-50%) translateY(110%)';

  setTimeout(() => {
    if ($('serviceDetailsBackdrop')) {
      $('serviceDetailsBackdrop').style.display = 'none';
    }
  }, 220);

  document.body.style.overflow = '';
}


window.openServiceDetails = openServiceDetails;

window.selectServiceById = openServiceDetails;

window.selectServiceByName = name => {
  const service = services.find(
    s =>
      String(s.name).trim().toLowerCase() ===
      String(name).trim().toLowerCase()
  );

  if (service) {
    openServiceDetails(service.id);
  }
};


/* =========================================================
   APPLICATION MODAL
========================================================= */

function createApplicationModal() {
  if ($('dynamicApplicationModal')) return;

  const wrapper = document.createElement('div');

  wrapper.id = 'dynamicApplicationModal';

  wrapper.innerHTML = `
    <div
      id="applicationBackdrop"
      style="
        display:none;
        position:fixed;
        inset:0;
        background:rgba(8,18,38,.65);
        z-index:10000
      ">
    </div>

    <div
      id="applicationBox"
      style="
        position:fixed;
        left:50%;
        bottom:0;
        width:min(720px,100%);
        max-height:94vh;
        overflow:auto;
        transform:translateX(-50%) translateY(110%);
        background:#fff;
        z-index:10001;
        border-radius:26px 26px 0 0;
        padding:22px;
        box-shadow:0 -20px 60px rgba(0,0,0,.28);
        transition:.25s ease
      ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:14px
      ">

        <div>
          <small style="font-weight:800;color:#2855cc">
            APPLICATION
          </small>

          <h2
            id="applicationServiceName"
            style="margin:4px 0">
            Service Application
          </h2>

          <p
            id="applicationServicePrice"
            style="margin:0;color:#667085">
          </p>
        </div>

        <button
          type="button"
          id="applicationClose"
          style="
            width:42px;
            height:42px;
            border:0;
            border-radius:50%;
            background:#f2f4f7;
            font-size:22px
          ">
          ×
        </button>

      </div>

      <form id="dynamicApplicationForm">

        <div
          id="beneficiaryFields"
          style="margin-top:20px">
        </div>

        <div
          id="aadhaarVerificationSection"
          style="display:none;margin-top:20px">
        </div>

        <div
          id="supportingDocumentsSection"
          style="margin-top:22px">
        </div>

        <div
          id="applicationError"
          style="
            display:none;
            margin-top:15px;
            padding:12px;
            border-radius:12px;
            background:#fff1f1;
            color:#a12626
          ">
        </div>

        <button
          type="submit"
          id="submitDynamicApplication"
          class="btn primary"
          style="
            width:100%;
            min-height:54px;
            margin-top:20px
          ">
          Submit Application
        </button>

      </form>

    </div>
  `;

  document.body.appendChild(wrapper);

  $('applicationClose').onclick =
    closeApplicationForm;

  $('applicationBackdrop').onclick =
    closeApplicationForm;

  $('dynamicApplicationForm').onsubmit =
    submitDynamicApplication;
}


async function openApplicationForm(serviceId) {
  const service = services.find(
    s => String(s.id) === String(serviceId)
  );

  if (!service) return;

  activeService = service;

  aadhaarVerification = {
    status: 'not_checked',
    provider: null,
    verifiedAt: null,
    last4: null,
    result: {}
  };

  $('applicationServiceName').textContent =
    service.name;

  $('applicationServicePrice').textContent =
    Number(service.price || 0) > 0
      ? `Service Price: ${money(service.price)}`
      : '';

  $('beneficiaryFields').innerHTML =
    '<p>Form loading...</p>';

  $('supportingDocumentsSection').innerHTML = '';

  try {
    const [fieldsResult, docsResult] = await Promise.all([
      sb
        .from('service_fields')
        .select('*')
        .eq('service_id', service.id)
        .eq('active', true)
        .order('sort_order'),

      sb
        .from('service_documents')
        .select('*')
        .eq('service_id', service.id)
        .eq('active', true)
        .order('sort_order')
    ]);

    if (fieldsResult.error) throw fieldsResult.error;
    if (docsResult.error) throw docsResult.error;

    applicationFields =
      fieldsResult.data || [];

    applicationDocuments =
      docsResult.data || [];

    renderBeneficiaryFields();
    renderSupportingDocuments();
    renderAadhaarVerification();

    $('applicationBackdrop').style.display = 'block';

    requestAnimationFrame(() => {
      $('applicationBox').style.transform =
        'translateX(-50%) translateY(0)';
    });

    document.body.style.overflow = 'hidden';

  } catch (error) {
    msg(error.message);
  }
}


function closeApplicationForm() {
  if (!$('applicationBox')) return;

  $('applicationBox').style.transform =
    'translateX(-50%) translateY(110%)';

  setTimeout(() => {
    $('applicationBackdrop').style.display = 'none';
  }, 220);

  document.body.style.overflow = '';
}


/* =========================================================
   FIELD RENDERER
========================================================= */

function renderBeneficiaryFields() {
  if (!applicationFields.length) {
    $('beneficiaryFields').innerHTML = `
      <div style="
        padding:15px;
        background:#fff7e8;
        border-radius:14px
      ">
        इस service का beneficiary form अभी Admin द्वारा configure नहीं किया गया है।
      </div>
    `;
    return;
  }

  $('beneficiaryFields').innerHTML = `
    <h3>👤 Beneficiary Details</h3>

    ${applicationFields.map(field => renderField(field)).join('')}
  `;

  const applicationType =
    document.querySelector('[name="application_type"]');

  if (applicationType) {
    applicationType.addEventListener(
      'change',
      applyConditionalPANRules
    );

    applyConditionalPANRules();
  }

  /*
    Aadhaar data बदलते ही previous verification invalid होगा.
  */
  [
    'full_name',
    'aadhaar_number',
    'date_of_birth',
    'gender'
  ].forEach(key => {
    const element =
      document.querySelector(`[name="${key}"]`);

    if (element) {
      element.addEventListener('input', resetAadhaarVerification);
      element.addEventListener('change', resetAadhaarVerification);
    }
  });
}


function renderField(field) {
  const requiredMark =
    field.required
      ? '<span style="color:#d92d20">*</span>'
      : '';

  const requiredAttribute =
    field.required
      ? 'required'
      : '';

  const common = `
    id="field_${esc(field.field_key)}"
    name="${esc(field.field_key)}"
    ${requiredAttribute}
  `;

  let input = '';

  if (field.field_type === 'textarea') {
    input = `
      <textarea
        ${common}
        rows="3"
        placeholder="${esc(field.placeholder || '')}"
        style="${fieldInputStyle()}"></textarea>
    `;

  } else if (
    field.field_type === 'select' ||
    field.field_type === 'radio'
  ) {
    const options =
      Array.isArray(field.options)
        ? field.options
        : [];

    input = `
      <select
        ${common}
        style="${fieldInputStyle()}">

        <option value="">
          Select
        </option>

        ${options.map(option => `
          <option value="${esc(option)}">
            ${esc(option)}
          </option>
        `).join('')}

      </select>
    `;

  } else if (field.field_type === 'checkbox') {
    input = `
      <label style="display:flex;gap:9px;align-items:flex-start">
        <input
          type="checkbox"
          name="${esc(field.field_key)}"
          ${requiredAttribute}
          style="margin-top:4px"
        >
        <span>${esc(field.label)}</span>
      </label>
    `;

  } else {
    input = `
      <input
        ${common}
        type="${esc(field.field_type || 'text')}"
        placeholder="${esc(field.placeholder || '')}"
        ${field.min_length ? `minlength="${field.min_length}"` : ''}
        ${field.max_length ? `maxlength="${field.max_length}"` : ''}
        style="${fieldInputStyle()}"
      >
    `;
  }

  return `
    <label
      data-field-wrap="${esc(field.field_key)}"
      style="
        display:block;
        margin:14px 0;
        font-size:13px;
        font-weight:700
      ">

      ${
        field.field_type !== 'checkbox'
          ? `${esc(field.label)} ${requiredMark}`
          : ''
      }

      ${input}

      ${
        field.help_text
          ? `
            <small style="
              display:block;
              color:#667085;
              margin-top:5px;
              line-height:1.4
            ">
              ${esc(field.help_text)}
            </small>
          `
          : ''
      }

    </label>
  `;
}


function fieldInputStyle() {
  return `
    width:100%;
    box-sizing:border-box;
    margin-top:7px;
    padding:13px;
    border:1px solid #d8e0eb;
    border-radius:12px;
    font:inherit;
    background:#fff
  `;
}


/* =========================================================
   PAN CONDITIONAL RULES
========================================================= */

function getApplicationType() {
  return String(
    document.querySelector('[name="application_type"]')?.value || ''
  ).toLowerCase();
}


function isPANCorrection() {
  return getApplicationType().includes('correction');
}


function applyConditionalPANRules() {
  const existingPAN =
    document.querySelector('[name="existing_pan"]');

  const wrapper =
    document.querySelector('[data-field-wrap="existing_pan"]');

  if (!existingPAN || !wrapper) return;

  if (isPANCorrection()) {
    wrapper.style.display = 'block';
    existingPAN.required = true;

  } else {
    wrapper.style.display = 'none';
    existingPAN.required = false;
    existingPAN.value = '';
  }

  renderSupportingDocuments();
}


/* =========================================================
   DOCUMENT RENDERER
========================================================= */

function isDocumentRequired(doc) {
  if (
    doc.document_key === 'existing_pan_card' &&
    isPANCorrection()
  ) {
    return true;
  }

  return !!doc.required;
}


function renderSupportingDocuments() {
  if (!applicationDocuments.length) {
    $('supportingDocumentsSection').innerHTML = '';
    return;
  }

  $('supportingDocumentsSection').innerHTML = `
    <h3>📎 Supporting Documents</h3>

    <p style="color:#667085;font-size:13px">
      * वाले documents upload करना अनिवार्य है।
    </p>

    ${applicationDocuments.map(doc => {
      const required = isDocumentRequired(doc);

      const accept =
        Array.isArray(doc.allowed_types)
          ? doc.allowed_types.join(',')
          : 'application/pdf,image/jpeg,image/png';

      return `
        <label style="
          display:block;
          border:1px solid #e4e9f1;
          border-radius:14px;
          padding:14px;
          margin:12px 0
        ">

          <strong>
            ${esc(doc.name)}
            ${
              required
                ? '<span style="color:#d92d20">*</span>'
                : '<small style="color:#667085"> (Optional)</small>'
            }
          </strong>

          ${
            doc.instructions
              ? `
                <small style="
                  display:block;
                  color:#667085;
                  margin:5px 0 10px
                ">
                  ${esc(doc.instructions)}
                </small>
              `
              : ''
          }

          <input
            type="file"
            name="document_${esc(doc.id)}"
            data-document-id="${esc(doc.id)}"
            data-required="${required}"
            accept="${esc(accept)}"
            style="display:block;width:100%;margin-top:9px"
          >

          <small style="display:block;color:#667085;margin-top:6px">
            Maximum ${Number(doc.max_size_mb || 5)} MB
          </small>

        </label>
      `;
    }).join('')}
  `;
}


/* =========================================================
   AADHAAR DEMOGRAPHIC VERIFICATION
========================================================= */

function renderAadhaarVerification() {
  const required =
    isPANService(activeService) &&
    applicationFields.some(f => f.field_key === 'aadhaar_number');

  if (!required) {
    $('aadhaarVerificationSection').style.display = 'none';
    return;
  }

  $('aadhaarVerificationSection').style.display = 'block';

  $('aadhaarVerificationSection').innerHTML = `
    <div style="
      padding:16px;
      border:1px solid #dce5ff;
      border-radius:16px;
      background:#f6f8ff
    ">

      <h3 style="margin-top:0">
        🔐 Aadhaar Demographic Verification
      </h3>

      <p style="
        color:#667085;
        font-size:13px;
        line-height:1.5
      ">
        PAN application submit करने से पहले Name, DOB और Gender
        Aadhaar authentication provider से match होना जरूरी है।
      </p>

      <div
        id="aadhaarVerificationStatus"
        style="
          padding:10px 12px;
          background:#fff;
          border-radius:10px;
          margin-bottom:12px
        ">
        Status: Not Verified
      </div>

      <button
        type="button"
        class="btn secondary"
        id="verifyAadhaarBtn"
        style="width:100%">
        Verify Aadhaar Details
      </button>

    </div>
  `;

  $('verifyAadhaarBtn').onclick =
    verifyAadhaarDetails;
}


function resetAadhaarVerification() {
  if (aadhaarVerification.status === 'not_checked') return;

  aadhaarVerification = {
    status: 'not_checked',
    provider: null,
    verifiedAt: null,
    last4: null,
    result: {}
  };

  if ($('aadhaarVerificationStatus')) {
    $('aadhaarVerificationStatus').textContent =
      'Status: Details changed — Verify again';
  }
}


async function verifyAadhaarDetails() {
  const name =
    document.querySelector('[name="full_name"]')?.value.trim();

  const aadhaar =
    document.querySelector('[name="aadhaar_number"]')?.value
      .replace(/\D/g, '');

  const dob =
    document.querySelector('[name="date_of_birth"]')?.value;

  const gender =
    document.querySelector('[name="gender"]')?.value;

  if (!name || !aadhaar || !dob || !gender) {
    msg('Name, Aadhaar, DOB और Gender पहले भरें।');
    return;
  }

  if (!/^\d{12}$/.test(aadhaar)) {
    msg('Aadhaar number 12 digit होना चाहिए।');
    return;
  }

  const button = $('verifyAadhaarBtn');

  button.disabled = true;
  button.textContent = 'Verifying...';

  $('aadhaarVerificationStatus').textContent =
    'Status: Verification in progress...';

  aadhaarVerification.status = 'pending';

  try {
    /*
      IMPORTANT:
      यह real backend hook है.
      Supabase Edge Function का नाम:
      verify-aadhaar-demographic

      इसमें authorized Aadhaar/API provider integrate होगा.
      Browser से UIDAI को direct call नहीं किया जाएगा.
    */

    const { data, error } = await sb.functions.invoke(
      'verify-aadhaar-demographic',
      {
        body: {
          aadhaar_number: aadhaar,
          name,
          date_of_birth: dob,
          gender
        }
      }
    );

    if (error) throw error;

    if (!data?.matched) {
      aadhaarVerification = {
        status: 'mismatch',
        provider: data?.provider || null,
        verifiedAt: null,
        last4: aadhaar.slice(-4),
        result: data || {}
      };

      $('aadhaarVerificationStatus').innerHTML =
        '<strong style="color:#b42318">❌ Demographic details mismatch</strong>';

      msg('Aadhaar details match नहीं हुईं।');

      return;
    }

    aadhaarVerification = {
      status: 'matched',
      provider: data.provider || 'authorized_api',
      verifiedAt: new Date().toISOString(),
      last4: aadhaar.slice(-4),
      result: data.match_result || {}
    };

    $('aadhaarVerificationStatus').innerHTML =
      '<strong style="color:#067647">✅ Aadhaar demographic details matched</strong>';

    msg('Aadhaar details verified');

  } catch (error) {
    console.error(error);

    aadhaarVerification.status = 'unavailable';

    $('aadhaarVerificationStatus').innerHTML =
      `
      <strong style="color:#b54708">
        ⚠️ Verification API अभी connected नहीं है
      </strong>
      `;

    msg('Aadhaar verification API connection required');

  } finally {
    button.disabled = false;
    button.textContent = 'Verify Aadhaar Details';
  }
}


/* =========================================================
   APPLICATION VALIDATION
========================================================= */

function getFormValues() {
  const result = {};

  applicationFields.forEach(field => {
    const element =
      document.querySelector(`[name="${field.field_key}"]`);

    if (!element) return;

    if (field.field_type === 'checkbox') {
      result[field.field_key] = element.checked;
    } else {
      result[field.field_key] = element.value.trim();
    }
  });

  return result;
}


function validateApplication(formValues) {
  /*
    Browser HTML required validation
  */
  if (!$('dynamicApplicationForm').checkValidity()) {
    $('dynamicApplicationForm').reportValidity();
    return false;
  }

  if (
    formValues.mobile &&
    !/^\d{10}$/.test(
      formValues.mobile.replace(/\D/g, '')
    )
  ) {
    showApplicationError('Mobile number 10 digit होना चाहिए।');
    return false;
  }

  if (
    formValues.pincode &&
    !/^\d{6}$/.test(
      formValues.pincode.replace(/\D/g, '')
    )
  ) {
    showApplicationError('PIN Code 6 digit होना चाहिए।');
    return false;
  }

  if (
    isPANCorrection() &&
    formValues.existing_pan &&
    !/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(
      formValues.existing_pan
    )
  ) {
    showApplicationError(
      'Existing PAN format सही नहीं है। Example: ABCDE1234F'
    );
    return false;
  }

  /*
    PAN Aadhaar verification mandatory
  */
  if (
    isPANService(activeService) &&
    aadhaarVerification.status !== 'matched'
  ) {
    showApplicationError(
      'PAN application submit करने से पहले Aadhaar demographic verification आवश्यक है।'
    );
    return false;
  }

  /*
    Mandatory documents
  */
  for (const doc of applicationDocuments) {
    if (!isDocumentRequired(doc)) continue;

    const input =
      document.querySelector(
        `[data-document-id="${doc.id}"]`
      );

    if (!input?.files?.length) {
      showApplicationError(
        `${doc.name} upload करना mandatory है।`
      );

      input?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      return false;
    }
  }

  return true;
}


function showApplicationError(text) {
  const box = $('applicationError');

  box.textContent = text;
  box.style.display = 'block';

  box.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
}


/* =========================================================
   SUBMIT APPLICATION
========================================================= */

async function submitDynamicApplication(event) {
  event.preventDefault();

  $('applicationError').style.display = 'none';

  if (!user || !activeService) {
    msg('Please login again');
    return;
  }

  const values =
    getFormValues();

  if (!validateApplication(values)) {
    return;
  }

  const submitBtn =
    $('submitDynamicApplication');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  /*
    Aadhaar raw number DB form_data में save नहीं करेंगे.
    API verification के बाद केवल masked reference रखा जाएगा.
  */
  const safeFormData = {
    ...values
  };

  if (safeFormData.aadhaar_number) {
    delete safeFormData.aadhaar_number;

    safeFormData.aadhaar_masked =
      `XXXX-XXXX-${aadhaarVerification.last4 || 'XXXX'}`;
  }

  const applicationId =
    crypto.randomUUID();

  try {
    /*
      पहले draft application बनती है.
      Documents successfully upload होने के बाद Pending होगी.
    */

    const { error: appError } =
      await sb
        .from('applications')
        .insert({
          id: applicationId,
          user_id: user.id,
          service_id: activeService.id,
          status: 'draft',
          processing_mode:
            activeService.processing_mode || 'admin',

          beneficiary_name:
            values.full_name || null,

          form_data: safeFormData,

          amount:
            Number(activeService.price || 0),

          aadhaar_verification_status:
            aadhaarVerification.status,

          aadhaar_verification_provider:
            aadhaarVerification.provider,

          aadhaar_verified_at:
            aadhaarVerification.verifiedAt,

          aadhaar_last4:
            aadhaarVerification.last4,

          demographic_match_result:
            aadhaarVerification.result || {}
        });

    if (appError) throw appError;


    /*
      SUPPORTING DOCUMENT UPLOAD
    */

    for (const doc of applicationDocuments) {
      const input =
        document.querySelector(
          `[data-document-id="${doc.id}"]`
        );

      const file =
        input?.files?.[0];

      if (!file) continue;

      const maxBytes =
        Number(doc.max_size_mb || 5) *
        1024 *
        1024;

      if (file.size > maxBytes) {
        throw new Error(
          `${doc.name} ${doc.max_size_mb || 5} MB से बड़ा है।`
        );
      }

      const allowed =
        Array.isArray(doc.allowed_types)
          ? doc.allowed_types
          : [
              'application/pdf',
              'image/jpeg',
              'image/png'
            ];

      if (
        allowed.length &&
        !allowed.includes(file.type)
      ) {
        throw new Error(
          `${doc.name} का file type allowed नहीं है।`
        );
      }

      const path =
        `${user.id}/${applicationId}/${doc.id}/${Date.now()}-${safeFileName(file.name)}`;

      const { error: uploadError } =
        await sb.storage
          .from('application-documents')
          .upload(path, file, {
            upsert: false,
            contentType: file.type
          });

      if (uploadError) throw uploadError;

      const { error: metadataError } =
        await sb
          .from('application_documents')
          .insert({
            application_id: applicationId,
            service_document_id: doc.id,
            document_name: doc.name,
            storage_path: path,
            original_file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            uploaded_by: user.id
          });

      if (metadataError) throw metadataError;
    }


    /*
      FINAL SUBMIT
    */

    const { error: finalError } =
      await sb
        .from('applications')
        .update({
          status: 'pending'
        })
        .eq('id', applicationId);

    if (finalError) throw finalError;


    msg('Application submitted successfully');

    closeApplicationForm();

    await loadCustomerActivity();

  } catch (error) {
    console.error(error);

    showApplicationError(
      error.message ||
      'Application submit नहीं हो सकी।'
    );

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Application';
  }
}


/* =========================================================
   CUSTOMER APPLICATIONS + LEGACY ORDERS
========================================================= */

async function loadCustomerActivity() {
  if (!user) return;

  const [applicationsResult, legacyResult] =
    await Promise.all([

      sb
        .from('applications')
        .select(`
          id,
          application_no,
          status,
          beneficiary_name,
          amount,
          submitted_at,
          external_reference_no,
          services(name),
          application_outputs(
            id,
            output_type,
            title,
            storage_path,
            external_url,
            reference_no
          )
        `)
        .eq('user_id', user.id)
        .neq('status', 'draft')
        .order('submitted_at', { ascending: false }),

      sb
        .from('orders')
        .select(`
          id,
          status,
          note,
          amount,
          created_at,
          services(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    ]);


  if (applicationsResult.error) {
    console.error(applicationsResult.error);
  }

  if (legacyResult.error) {
    console.error(legacyResult.error);
  }


  const applications =
    applicationsResult.data || [];

  const legacy =
    legacyResult.data || [];

  const total =
    applications.length +
    legacy.length;

  const pending =
    applications.filter(a =>
      ['pending', 'processing', 'submitted']
        .includes(a.status)
    ).length +

    legacy.filter(o =>
      ['pending', 'processing']
        .includes(o.status)
    ).length;

  const completed =
    applications.filter(a =>
      a.status === 'completed'
    ).length +

    legacy.filter(o =>
      o.status === 'completed'
    ).length;


  if ($('orderCount')) {
    $('orderCount').textContent = total;
  }

  if ($('pendingCount')) {
    $('pendingCount').textContent = pending;
  }

  if ($('doneCount')) {
    $('doneCount').textContent = completed;
  }

  renderCustomerApplications(
    applications,
    legacy
  );
}


function renderCustomerApplications(applications, legacy) {
  const list = $('ordersList');

  if (!list) return;

  if (!applications.length && !legacy.length) {
    list.innerHTML =
      '<p>अभी कोई आवेदन नहीं है।</p>';

    return;
  }

  const newApplicationHtml =
    applications.map(app => {

      const outputs =
        app.application_outputs || [];

      return `
        <div class="service-row">

          <div>

            <strong>
              ${esc(app.services?.name || 'Application')}
            </strong>

            <small>
              Application ID:
              ${esc(app.application_no || app.id)}
            </small>

            ${
              app.beneficiary_name
                ? `
                  <small>
                    Beneficiary:
                    ${esc(app.beneficiary_name)}
                  </small>
                `
                : ''
            }

            ${
              Number(app.amount || 0) > 0
                ? `
                  <small>
                    Amount:
                    ${money(app.amount)}
                  </small>
                `
                : ''
            }

            ${
              app.external_reference_no
                ? `
                  <small>
                    Reference:
                    ${esc(app.external_reference_no)}
                  </small>
                `
                : ''
            }

            ${
              outputs.map(output => `
                <button
                  type="button"
                  class="btn secondary"
                  style="margin-top:7px"
                  onclick='window.downloadApplicationOutput(${JSON.stringify(output)})'
                >
                  ⬇ ${esc(output.title || 'Download Receipt')}
                </button>
              `).join('')
            }

          </div>

          <span class="status ${esc(app.status)}">
            ${esc(app.status)}
          </span>

        </div>
      `;
    }).join('');


  const legacyHtml =
    legacy.map(order => `
      <div class="service-row">

        <div>

          <strong>
            ${esc(order.services?.name || 'Service')}
          </strong>

          <small>
            ${esc(new Date(order.created_at).toLocaleString('en-IN'))}
          </small>

          ${
            order.note
              ? `<small>${esc(order.note)}</small>`
              : ''
          }

          ${
            Number(order.amount || 0) > 0
              ? `<small>Amount: ${money(order.amount)}</small>`
              : ''
          }

        </div>

        <span class="status ${esc(order.status || 'pending')}">
          ${esc(order.status || 'pending')}
        </span>

      </div>
    `).join('');


  list.innerHTML =
    newApplicationHtml +
    legacyHtml;
}


/* =========================================================
   RECEIPT / OUTPUT DOWNLOAD
========================================================= */

window.downloadApplicationOutput =
  async output => {

    try {
      if (output.external_url) {
        window.open(
          output.external_url,
          '_blank',
          'noopener'
        );

        return;
      }

      if (!output.storage_path) {
        msg('Document file available नहीं है।');
        return;
      }

      const { data, error } =
        await sb.storage
          .from('application-outputs')
          .createSignedUrl(
            output.storage_path,
            60
          );

      if (error) throw error;

      window.open(
        data.signedUrl,
        '_blank',
        'noopener'
      );

    } catch (error) {
      msg(error.message);
    }
  };


/* =========================================================
   START
========================================================= */

boot();
