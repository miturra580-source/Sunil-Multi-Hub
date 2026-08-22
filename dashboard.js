/* =========================================================
   SUNIL MULTI HUB
   CUSTOMER PORTAL
   Dynamic Services + PAN Variants + Conditional Forms
========================================================= */

const $ = id => document.getElementById(id);

const toast = $('toast');

let toastTimer = null;
let user = null;

let services = [];
let activeService = null;
let activeVariant = null;

let serviceVariants = [];
let applicationFields = [];
let applicationDocuments = [];

let aadhaarVerification = {
  status: 'not_checked',
  provider: null,
  verifiedAt: null,
  last4: null,
  result: {}
};

let epanOtp = {
  requestId: null,
  sent: false,
  verified: false,
  aadhaarLast4: null
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
  return '₹' + Number(value || 0)
    .toLocaleString('en-IN');
}


function normalizeCategory(value) {
  const v = String(value || '')
    .trim()
    .toLowerCase();

  if (v === 'popular') return 'Popular';
  if (v === 'government') return 'Government';
  if (v === 'print') return 'Print';

  return 'Other';
}


function safeFileName(name = 'file') {
  return String(name)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-120);
}


function isPANService(service) {
  return String(service?.name || '')
    .toLowerCase()
    .includes('pan');
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
    background:#fff;
  `;
}


function makeClient() {
  const cfg = window.SMH_CONFIG || {};

  const url = cfg.supabaseUrl;
  const key =
    cfg.supabaseAnonKey ||
    cfg.supabaseKey;

  if (!url || !key) {
    throw new Error(
      'Supabase config missing'
    );
  }

  return window.supabase.createClient(
    url,
    key,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    }
  );
}


const sb = makeClient();


/* =========================================================
   BOOT
========================================================= */

async function boot() {
  createServiceDetailsModal();
  createVariantModal();
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
      $('who').textContent =
        user.email || 'Customer';
    }

    setupBasicActions();

    await loadServices();
    await loadCustomerActivity();

  } catch (error) {
    console.error(error);

    msg(
      error.message ||
      'Portal loading failed'
    );
  }
}


function setupBasicActions() {
  if ($('logoutBtn')) {
    $('logoutBtn').onclick =
      async () => {

        await sb.auth.signOut();

        location.href =
          'auth.html';
      };
  }

  if ($('orderForm')) {
    $('orderForm').onsubmit =
      event => {

        event.preventDefault();

        msg(
          'Service card खोलकर Apply Now दबाएँ।'
        );
      };
  }
}


/* =========================================================
   SERVICES
========================================================= */

async function loadServices() {
  const {
    data,
    error
  } = await sb
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
    .order('sort_order', {
      ascending: true
    });

  if (error) throw error;

  services = data || [];

  if ($('serviceCount')) {
    $('serviceCount').textContent =
      services.length;
  }

  renderServiceSections();

  const requested =
    localStorage.getItem(
      'smh-selected-service'
    );

  if (requested) {
    localStorage.removeItem(
      'smh-selected-service'
    );

    const match = services.find(
      service =>
        String(service.name)
          .trim()
          .toLowerCase() ===
        requested
          .trim()
          .toLowerCase()
    );

    if (match) {
      openServiceDetails(
        match.id
      );
    }
  }
}


/* =========================================================
   SERVICE CARDS
========================================================= */

function getGridByHeading(text) {
  const sections =
    [
      ...document.querySelectorAll(
        '.portal-section'
      )
    ];

  const section =
    sections.find(sec => {

      const heading =
        sec.querySelector('h2');

      return (
        heading &&
        heading.textContent
          .includes(text)
      );
    });

  return section
    ?.querySelector(
      '.portal-service-grid'
    );
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
        ${esc(
          service.description ||
          'Online Service'
        )}
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
  const popularGrid =
    getGridByHeading(
      'लोकप्रिय सेवाएँ'
    );

  const governmentGrid =
    getGridByHeading(
      'सरकारी एवं नागरिक सेवाएँ'
    );

  const printGrid =
    getGridByHeading(
      'प्रिंट और दस्तावेज़ सेवाएँ'
    );

  const otherGrid =
    getGridByHeading(
      'अन्य सेवाएँ'
    );


  const byCategory =
    category =>
      services.filter(
        service =>
          normalizeCategory(
            service.category
          ) === category
      );


  if (popularGrid) {
    popularGrid.innerHTML =
      byCategory('Popular')
        .map(serviceCard)
        .join('') ||
      '<p>No services available.</p>';
  }


  if (governmentGrid) {
    governmentGrid.innerHTML =
      byCategory('Government')
        .map(serviceCard)
        .join('') ||
      '<p>No services available.</p>';
  }


  if (printGrid) {
    printGrid.innerHTML =
      byCategory('Print')
        .map(serviceCard)
        .join('') +

      `
      <a
        class="portal-service-card"
        href="tools.html#passport">

        <span class="portal-service-icon">
          📸
        </span>

        <strong>
          Passport Photo
        </strong>

        <small>
          Photo Maker
        </small>

      </a>

      <a
        class="portal-service-card"
        href="tools.html#jpg-pdf">

        <span class="portal-service-icon">
          📄
        </span>

        <strong>
          JPG → PDF
        </strong>

        <small>
          Online Tool
        </small>

      </a>

      <a
        class="portal-service-card"
        href="tools.html#merge-pdf">

        <span class="portal-service-icon">
          🧩
        </span>

        <strong>
          Merge PDF
        </strong>

        <small>
          PDF Tool
        </small>

      </a>
      `;
  }


  if (otherGrid) {
    otherGrid.innerHTML =
      byCategory('Other')
        .map(serviceCard)
        .join('') +

      `
      <a
        class="portal-service-card"
        href="tools.html">

        <span class="portal-service-icon">
          🧰
        </span>

        <strong>
          All Online Tools
        </strong>

        <small>
          Open Toolkit
        </small>

      </a>
      `;
  }
}


/* =========================================================
   SERVICE DETAILS MODAL
========================================================= */

function createServiceDetailsModal() {
  if ($('serviceDetailsModal')) {
    return;
  }

  const wrapper =
    document.createElement('div');

  wrapper.id =
    'serviceDetailsModal';

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
      "
    >

      <div style="
        display:flex;
        justify-content:space-between;
        gap:14px;
        align-items:flex-start
      ">

        <div style="
          display:flex;
          gap:12px;
          align-items:center
        ">

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
              style="
                font-weight:800;
                color:#2855cc
              ">
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
        "
      >

        <small>
          Service Price
        </small>

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
          style="
            color:#566174;
            line-height:1.8
          ">
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
          style="
            color:#566174;
            line-height:1.7
          ">
        </div>

      </div>

      <button
        type="button"
        id="serviceApplyBtn"
        class="btn primary"
        style="
          width:100%;
          min-height:52px
        ">
        Apply Now
      </button>

    </div>
  `;

  document.body
    .appendChild(wrapper);

  $('serviceModalClose')
    .onclick =
      closeServiceDetails;

  $('serviceDetailsBackdrop')
    .onclick =
      closeServiceDetails;

  $('serviceApplyBtn')
    .onclick =
      handleServiceApply;
}


function documentList(text) {
  const value =
    String(text || '')
      .trim();

  if (!value) {
    return `
      Application के अनुसार
      documents अगले step में
      दिखाई जाएँगे।
    `;
  }

  return value
    .split(/\n+/)
    .filter(Boolean)
    .map(item => `
      <div style="
        display:flex;
        gap:8px;
        margin:6px 0
      ">
        <span>✓</span>

        <span>
          ${esc(item.trim())}
        </span>
      </div>
    `)
    .join('');
}


function openServiceDetails(id) {
  const service =
    services.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!service) {
    msg(
      'Service उपलब्ध नहीं है'
    );

    return;
  }

  activeService = service;
  activeVariant = null;

  $('serviceModalIcon')
    .textContent =
      service.icon ||
      '🧩';

  $('serviceModalCategory')
    .textContent =
      normalizeCategory(
        service.category
      );

  $('serviceModalName')
    .textContent =
      service.name;

  $('serviceModalDescription')
    .textContent =
      service.description || '';

  if (
    Number(service.price || 0) > 0
  ) {
    $('serviceModalPriceBox')
      .style.display =
        'block';

    $('serviceModalPrice')
      .textContent =
        money(service.price);

  } else {
    $('serviceModalPriceBox')
      .style.display =
        'none';
  }

  $('serviceModalDocuments')
    .innerHTML =
      documentList(
        service.required_documents
      );

  $('serviceModalInstructions')
    .textContent =
      service.instructions ||
      'आवेदन से पहले सभी जानकारी और दस्तावेज़ जाँच लें।';

  $('serviceDetailsBackdrop')
    .style.display =
      'block';

  requestAnimationFrame(() => {
    $('serviceDetailsBox')
      .style.transform =
        'translateX(-50%) translateY(0)';
  });

  document.body.style.overflow =
    'hidden';
}


function closeServiceDetails() {
  if (!$('serviceDetailsBox')) {
    return;
  }

  $('serviceDetailsBox')
    .style.transform =
      'translateX(-50%) translateY(110%)';

  setTimeout(() => {

    if ($('serviceDetailsBackdrop')) {
      $('serviceDetailsBackdrop')
        .style.display =
          'none';
    }

  }, 220);

  document.body.style.overflow =
    '';
}


window.openServiceDetails =
  openServiceDetails;

window.selectServiceById =
  openServiceDetails;


/* =========================================================
   APPLY / VARIANTS
========================================================= */

async function handleServiceApply() {
  if (!activeService) {
    return;
  }

  closeServiceDetails();

  try {
    const {
      data,
      error
    } = await sb
      .from('service_variants')
      .select(`
        id,
        service_id,
        variant_key,
        name,
        description,
        processing_mode,
        assistance_fee,
        official_fee,
        fee_note,
        requires_aadhaar_verification,
        requires_otp,
        official_portal_url,
        workflow_type,
        submit_button_text,
        requires_existing_pan,
        allows_document_upload,
        requires_eligibility_check,
        otp_flow,
        api_action,
        fallback_mode,
        active,
        sort_order
      `)
      .eq(
        'service_id',
        activeService.id
      )
      .eq(
        'active',
        true
      )
      .order(
        'sort_order',
        {
          ascending: true
        }
      );

    if (error) {
      throw error;
    }

    serviceVariants =
      data || [];

    if (
      serviceVariants.length
    ) {
      setTimeout(
        openVariantSelector,
        220
      );

      return;
    }

    setTimeout(
      () => {
        openApplicationForm(
          activeService.id,
          null
        );
      },
      220
    );

  } catch (error) {
    console.error(error);
    msg(error.message);
  }
}


/* =========================================================
   VARIANT SELECTOR
========================================================= */

function createVariantModal() {
  if ($('serviceVariantModal')) {
    return;
  }

  const wrapper =
    document.createElement('div');

  wrapper.id =
    'serviceVariantModal';

  wrapper.innerHTML = `

    <div
      id="variantBackdrop"
      style="
        display:none;
        position:fixed;
        inset:0;
        background:rgba(8,18,38,.65);
        z-index:10000
      ">
    </div>

    <div
      id="variantBox"
      style="
        position:fixed;
        left:50%;
        bottom:0;
        width:min(650px,100%);
        max-height:92vh;
        overflow:auto;
        transform:translateX(-50%) translateY(110%);
        background:#fff;
        z-index:10001;
        border-radius:26px 26px 0 0;
        padding:22px;
        box-shadow:0 -20px 60px rgba(0,0,0,.28);
        transition:.25s ease
      "
    >

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:14px
      ">

        <div>

          <small style="
            font-weight:800;
            color:#2855cc
          ">
            SELECT SERVICE
          </small>

          <h2
            id="variantServiceName"
            style="margin:4px 0">
            Select Work
          </h2>

          <p style="
            margin:0;
            color:#667085
          ">
            आपको कौन-सी सेवा चाहिए?
          </p>

        </div>

        <button
          type="button"
          id="variantClose"
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

      <div
        id="variantCards"
        style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(220px,1fr));
          gap:12px;
          margin-top:20px
        ">
      </div>

    </div>
  `;

  document.body
    .appendChild(wrapper);

  $('variantClose')
    .onclick =
      closeVariantSelector;

  $('variantBackdrop')
    .onclick =
      closeVariantSelector;
}


function variantIcon(key) {
  if (key === 'new_pan') {
    return '🆕';
  }

  if (
    key ===
    'pan_correction'
  ) {
    return '✏️';
  }

  if (key === 'epan') {
    return '📧';
  }

  if (key === 'track_pan') {
    return '🔎';
  }

  return '🧩';
}


function openVariantSelector() {
  if (!activeService) {
    return;
  }

  $('variantServiceName')
    .textContent =
      activeService.name;

  $('variantCards')
    .innerHTML =
      serviceVariants
        .map(variant => {

          const fee =
            Number(
              variant.assistance_fee ||
              0
            );

          return `
            <button
              type="button"
              data-variant-id="${esc(variant.id)}"
              class="variant-select-btn"
              style="
                text-align:left;
                border:1px solid #dfe5ef;
                border-radius:18px;
                padding:17px;
                background:#fff;
                cursor:pointer
              "
            >

              <span style="
                display:block;
                font-size:30px;
                margin-bottom:10px
              ">
                ${variantIcon(
                  variant.variant_key
                )}
              </span>

              <strong style="
                display:block;
                font-size:16px
              ">
                ${esc(variant.name)}
              </strong>

              <small style="
                display:block;
                color:#667085;
                margin-top:6px;
                line-height:1.5
              ">
                ${esc(
                  variant.description ||
                  ''
                )}
              </small>

              ${
                fee > 0
                  ? `
                    <span style="
                      display:block;
                      margin-top:10px;
                      color:#2855cc;
                      font-weight:800
                    ">
                      Assistance Fee:
                      ${money(fee)}
                    </span>
                  `
                  : ''
              }

              ${
                variant.variant_key ===
                'epan'
                  ? `
                    <small style="
                      display:block;
                      margin-top:4px;
                      color:#067647;
                      font-weight:700
                    ">
                      Official e-PAN service: Free
                    </small>
                  `
                  : ''
              }

            </button>
          `;
        })
        .join('');

  document
    .querySelectorAll(
      '.variant-select-btn'
    )
    .forEach(button => {

      button.onclick =
        () => {

          selectVariant(
            button.dataset
              .variantId
          );
        };
    });

  $('variantBackdrop')
    .style.display =
      'block';

  requestAnimationFrame(() => {

    $('variantBox')
      .style.transform =
        'translateX(-50%) translateY(0)';
  });

  document.body.style.overflow =
    'hidden';
}


function closeVariantSelector() {
  if (!$('variantBox')) {
    return;
  }

  $('variantBox')
    .style.transform =
      'translateX(-50%) translateY(110%)';

  setTimeout(() => {

    $('variantBackdrop')
      .style.display =
        'none';

  }, 220);

  document.body.style.overflow =
    '';
}


function selectVariant(id) {
  const variant =
    serviceVariants.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!variant) {
    msg(
      'Service option नहीं मिला'
    );

    return;
  }

  activeVariant =
    variant;

  closeVariantSelector();

  setTimeout(() => {

    openApplicationForm(
      activeService.id,
      variant.id
    );

  }, 220);
}


/* =========================================================
   APPLICATION MODAL
========================================================= */

function createApplicationModal() {
  if ($('dynamicApplicationModal')) {
    return;
  }

  const wrapper =
    document.createElement('div');

  wrapper.id =
    'dynamicApplicationModal';

  wrapper.innerHTML = `

    <div
      id="applicationBackdrop"
      style="
        display:none;
        position:fixed;
        inset:0;
        background:rgba(8,18,38,.65);
        z-index:10010
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
        z-index:10011;
        border-radius:26px 26px 0 0;
        padding:22px;
        box-shadow:0 -20px 60px rgba(0,0,0,.28);
        transition:.25s ease
      "
    >

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:14px
      ">

        <div>

          <small style="
            font-weight:800;
            color:#2855cc
          ">
            APPLICATION
          </small>

          <h2
            id="applicationServiceName"
            style="margin:4px 0">
            Service Application
          </h2>

          <p
            id="applicationVariantName"
            style="
              margin:0;
              color:#475467;
              font-weight:700
            ">
          </p>

          <p
            id="applicationServicePrice"
            style="
              margin:5px 0 0;
              color:#667085
            ">
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
          id="eligibilitySection"
          style="
            display:none;
            margin-top:18px
          ">
        </div>

        <div
          id="aadhaarVerificationSection"
          style="
            display:none;
            margin-top:20px
          ">
        </div>

        <div
          id="epanOtpSection"
          style="
            display:none;
            margin-top:20px
          ">
        </div>

        <div
          id="supportingDocumentsSection"
          style="margin-top:22px">
        </div>

        <div
          id="trackingInfoSection"
          style="
            display:none;
            margin-top:16px
          ">
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

  document.body
    .appendChild(wrapper);

  $('applicationClose')
    .onclick =
      closeApplicationForm;

  $('applicationBackdrop')
    .onclick =
      closeApplicationForm;

  $('dynamicApplicationForm')
    .onsubmit =
      handleApplicationAction;
}


/* =========================================================
   LOAD FORM
========================================================= */

async function openApplicationForm(
  serviceId,
  variantId = null
) {
  const service =
    services.find(
      item =>
        String(item.id) ===
        String(serviceId)
    );

  if (!service) {
    return;
  }

  activeService =
    service;

  if (variantId) {
    activeVariant =
      serviceVariants.find(
        item =>
          String(item.id) ===
          String(variantId)
      ) ||
      activeVariant;

  } else {
    activeVariant =
      null;
  }

  resetVerificationStates();

  $('applicationServiceName')
    .textContent =
      service.name;

  $('applicationVariantName')
    .textContent =
      activeVariant
        ? activeVariant.name
        : '';

  renderVariantPrice();

  $('beneficiaryFields')
    .innerHTML =
      '<p>Form loading...</p>';

  $('supportingDocumentsSection')
    .innerHTML =
      '';

  $('applicationError')
    .style.display =
      'none';

  try {
    let fieldsQuery =
      sb
        .from('service_fields')
        .select(`
          *,
          conditional_rules,
          validation_rules,
          ui_config
        `)
        .eq(
          'service_id',
          service.id
        )
        .eq(
          'active',
          true
        );

    let documentsQuery =
      sb
        .from('service_documents')
        .select(`
          *,
          max_size_kb,
          conditional_rules,
          ui_config
        `)
        .eq(
          'service_id',
          service.id
        )
        .eq(
          'active',
          true
        );

    if (variantId) {
      fieldsQuery =
        fieldsQuery.eq(
          'service_variant_id',
          variantId
        );

      documentsQuery =
        documentsQuery.eq(
          'service_variant_id',
          variantId
        );

    } else {
      fieldsQuery =
        fieldsQuery.is(
          'service_variant_id',
          null
        );

      documentsQuery =
        documentsQuery.is(
          'service_variant_id',
          null
        );
    }

    const [
      fieldsResult,
      docsResult
    ] =
      await Promise.all([

        fieldsQuery.order(
          'sort_order'
        ),

        documentsQuery.order(
          'sort_order'
        )
      ]);

    if (fieldsResult.error) {
      throw fieldsResult.error;
    }

    if (docsResult.error) {
      throw docsResult.error;
    }

    applicationFields =
      fieldsResult.data || [];

    applicationDocuments =
      docsResult.data || [];

    renderBeneficiaryFields();

    renderEligibility();

    renderAadhaarVerification();

    renderEPanOtpSection();

    renderSupportingDocuments();

    configureSubmitButton();

    applyConditionalRules();

    $('applicationBackdrop')
      .style.display =
        'block';

    requestAnimationFrame(() => {

      $('applicationBox')
        .style.transform =
          'translateX(-50%) translateY(0)';
    });

    document.body.style.overflow =
      'hidden';

  } catch (error) {
    console.error(error);
    msg(error.message);
  }
}


function renderVariantPrice() {
  const priceElement =
    $('applicationServicePrice');

  if (!priceElement) {
    return;
  }

  const fee =
    activeVariant
      ? Number(
          activeVariant
            .assistance_fee ||
          0
        )
      : Number(
          activeService?.price ||
          0
        );

  if (
    activeVariant?.variant_key ===
    'epan'
  ) {
    priceElement.innerHTML = `
      <strong style="color:#067647">
        Official e-PAN Service: Free
      </strong>
      <br>
      SUNIL MULTI HUB Assistance Fee:
      ${money(fee)}
    `;

    return;
  }

  priceElement.textContent =
    fee > 0
      ? `Assistance Fee: ${money(fee)}`
      : '';
}


function closeApplicationForm() {
  if (!$('applicationBox')) {
    return;
  }

  $('applicationBox')
    .style.transform =
      'translateX(-50%) translateY(110%)';

  setTimeout(() => {

    $('applicationBackdrop')
      .style.display =
        'none';

  }, 220);

  document.body.style.overflow =
    '';
}


/* =========================================================
   FIELD RENDERING
========================================================= */

function renderBeneficiaryFields() {
  if (!applicationFields.length) {
    $('beneficiaryFields')
      .innerHTML = `
        <div style="
          padding:15px;
          background:#fff7e8;
          border-radius:14px
        ">
          इस service का form अभी
          configure नहीं किया गया है।
        </div>
      `;

    return;
  }

  $('beneficiaryFields')
    .innerHTML = `
      <h3>
        👤 Beneficiary Details
      </h3>

      ${
        applicationFields
          .map(renderField)
          .join('')
      }
    `;

  bindDynamicFieldEvents();
}


function renderField(field) {
  /*
    PAN Correction multi selection
  */
  if (
    field.field_key ===
    'correction_type' &&
    activeVariant?.variant_key ===
    'pan_correction'
  ) {
    return renderCorrectionOptions(
      field
    );
  }

  const requiredMark =
    field.required
      ? `
        <span style="color:#d92d20">
          *
        </span>
      `
      : '';

  const requiredAttribute =
    field.required
      ? 'required'
      : '';

  let input = '';

  if (
    field.field_type ===
    'textarea'
  ) {
    input = `
      <textarea
        name="${esc(field.field_key)}"
        rows="3"
        placeholder="${esc(field.placeholder || '')}"
        ${requiredAttribute}
        style="${fieldInputStyle()}"
      ></textarea>
    `;

  } else if (
    field.field_type ===
    'select' ||
    field.field_type ===
    'radio'
  ) {
    const options =
      Array.isArray(field.options)
        ? field.options
        : [];

    input = `
      <select
        name="${esc(field.field_key)}"
        ${requiredAttribute}
        style="${fieldInputStyle()}"
      >

        <option value="">
          Select
        </option>

        ${
          options.map(option => `
            <option value="${esc(option)}">
              ${esc(option)}
            </option>
          `).join('')
        }

      </select>
    `;

  } else if (
    field.field_type ===
    'checkbox'
  ) {
    input = `
      <label style="
        display:flex;
        gap:9px;
        align-items:flex-start;
        margin-top:8px
      ">

        <input
          type="checkbox"
          name="${esc(field.field_key)}"
          ${requiredAttribute}
          style="margin-top:4px"
        >

        <span>
          ${esc(field.label)}
          ${requiredMark}
        </span>

      </label>
    `;

  } else {
    input = `
      <input
        name="${esc(field.field_key)}"
        type="${esc(field.field_type || 'text')}"
        placeholder="${esc(field.placeholder || '')}"
        ${requiredAttribute}
        ${
          field.min_length
            ? `minlength="${field.min_length}"`
            : ''
        }
        ${
          field.max_length
            ? `maxlength="${field.max_length}"`
            : ''
        }
        style="${fieldInputStyle()}"
      >
    `;
  }

  return `
    <div
      data-field-wrap="${esc(field.field_key)}"
      style="
        margin:14px 0;
        font-size:13px;
        font-weight:700
      "
    >

      ${
        field.field_type !==
        'checkbox'
          ? `
            <label>
              ${esc(field.label)}
              ${requiredMark}
            </label>
          `
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

    </div>
  `;
}


function renderCorrectionOptions(field) {
  const options = [
    'Name',
    'Father Name',
    'Date of Birth',
    'Gender',
    'Address',
    'Photo',
    'Signature',
    'Other'
  ];

  return `
    <div
      data-field-wrap="correction_type"
      style="
        margin:18px 0;
        padding:15px;
        border:1px solid #e4e9f1;
        border-radius:15px
      "
    >

      <strong>
        What do you want to correct?
        <span style="color:#d92d20">*</span>
      </strong>

      <small style="
        display:block;
        color:#667085;
        margin:5px 0 12px
      ">
        एक या एक से अधिक options चुनें।
      </small>

      <div style="
        display:grid;
        grid-template-columns:
          repeat(auto-fit,minmax(150px,1fr));
        gap:9px
      ">

        ${
          options.map(option => `
            <label style="
              display:flex;
              align-items:center;
              gap:8px;
              padding:10px;
              background:#f7f9fc;
              border-radius:10px
            ">

              <input
                type="checkbox"
                class="correction-option"
                value="${esc(option)}"
              >

              <span>
                ${esc(option)}
              </span>

            </label>
          `).join('')
        }

      </div>

    </div>
  `;
}


function bindDynamicFieldEvents() {
  document
    .querySelectorAll(
      '#beneficiaryFields input, #beneficiaryFields select, #beneficiaryFields textarea'
    )
    .forEach(element => {

      element.addEventListener(
        'change',
        () => {
          applyConditionalRules();
          resetAadhaarVerification();
        }
      );

      element.addEventListener(
        'input',
        () => {
          applyConditionalRules();
          resetAadhaarVerification();
        }
      );
    });
}


/* =========================================================
   CONDITIONAL RULES
========================================================= */

function selectedCorrections() {
  return [
    ...document.querySelectorAll(
      '.correction-option:checked'
    )
  ].map(
    element =>
      element.value
  );
}


function conditionIsMet(rule) {
  if (!rule) {
    return true;
  }

  const showWhen =
    rule.show_when ||
    rule.required_when;

  if (!showWhen) {
    return true;
  }

  return Object.entries(
    showWhen
  ).every(
    ([key, expected]) => {

      if (
        key ===
        'correction_type'
      ) {
        return selectedCorrections()
          .includes(
            String(expected)
          );
      }

      const element =
        document.querySelector(
          `[name="${key}"]`
        );

      if (!element) {
        return false;
      }

      const actual =
        element.type ===
        'checkbox'
          ? element.checked
          : element.value;

      return String(actual) ===
        String(expected);
    }
  );
}


function applyConditionalRules() {
  applicationFields.forEach(
    field => {

      if (
        field.field_key ===
        'correction_type'
      ) {
        return;
      }

      const wrapper =
        document.querySelector(
          `[data-field-wrap="${field.field_key}"]`
        );

      if (!wrapper) {
        return;
      }

      const rules =
        field.conditional_rules ||
        {};

      const hasCondition =
        !!rules.show_when;

      const show =
        hasCondition
          ? conditionIsMet(rules)
          : true;

      wrapper.style.display =
        show
          ? ''
          : 'none';

      const input =
        wrapper.querySelector(
          'input,select,textarea'
        );

      if (input) {
        if (
          hasCondition &&
          show
        ) {
          input.required = true;

        } else {
          input.required =
            !!field.required;
        }

        if (!show) {
          if (
            input.type ===
            'checkbox'
          ) {
            input.checked = false;

          } else {
            input.value = '';
          }
        }
      }
    }
  );

  renderSupportingDocuments();
}


/* =========================================================
   ELIGIBILITY
========================================================= */

function renderEligibility() {
  const box =
    $('eligibilitySection');

  if (
    !activeVariant
      ?.requires_eligibility_check
  ) {
    box.style.display =
      'none';

    return;
  }

  if (
    activeVariant.variant_key ===
    'epan'
  ) {
    box.style.display =
      'block';

    box.innerHTML = `
      <div style="
        padding:15px;
        border:1px solid #dce5ff;
        border-radius:15px;
        background:#f7f9ff
      ">

        <h3 style="margin-top:0">
          ✅ e-PAN Eligibility
        </h3>

        <label style="display:block;margin:9px 0">
          <input
            type="checkbox"
            id="epanNoExistingPan"
          >
          मेरे पास पहले से PAN allotted नहीं है।
        </label>

        <label style="display:block;margin:9px 0">
          <input
            type="checkbox"
            id="epanAdult"
          >
          मैं minor नहीं हूँ।
        </label>

        <label style="display:block;margin:9px 0">
          <input
            type="checkbox"
            id="epanMobileLinked"
          >
          मेरे Aadhaar से mobile number linked है।
        </label>

      </div>
    `;

    return;
  }

  box.style.display =
    'none';
}


/* =========================================================
   AADHAAR DEMOGRAPHIC VERIFICATION
========================================================= */

function renderAadhaarVerification() {
  const box =
    $('aadhaarVerificationSection');

  /*
    e-PAN uses OTP/eKYC flow,
    not this manual demographic flow.
  */
  if (
    activeVariant?.variant_key ===
    'epan'
  ) {
    box.style.display =
      'none';

    return;
  }

  if (
    !activeVariant
      ?.requires_aadhaar_verification
  ) {
    box.style.display =
      'none';

    return;
  }

  box.style.display =
    'block';

  box.innerHTML = `
    <div style="
      padding:16px;
      border:1px solid #dce5ff;
      border-radius:16px;
      background:#f6f8ff
    ">

      <h3 style="margin-top:0">
        🔐 Aadhaar Verification
      </h3>

      <p style="
        color:#667085;
        font-size:13px;
        line-height:1.5
      ">
        Name, DOB और Gender
        authorized Aadhaar verification
        provider से match होने चाहिए।
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
        style="width:100%"
      >
        Verify Aadhaar Details
      </button>

    </div>
  `;

  $('verifyAadhaarBtn')
    .onclick =
      verifyAadhaarDetails;
}


function resetAadhaarVerification() {
  if (
    aadhaarVerification.status ===
    'not_checked'
  ) {
    return;
  }

  aadhaarVerification = {
    status: 'not_checked',
    provider: null,
    verifiedAt: null,
    last4: null,
    result: {}
  };

  if (
    $('aadhaarVerificationStatus')
  ) {
    $('aadhaarVerificationStatus')
      .textContent =
        'Status: Details changed — Verify again';
  }
}


async function verifyAadhaarDetails() {
  const name =
    document.querySelector(
      '[name="full_name"]'
    )?.value.trim();

  const aadhaar =
    document.querySelector(
      '[name="aadhaar_number"]'
    )?.value
      .replace(/\D/g, '');

  const dob =
    document.querySelector(
      '[name="date_of_birth"]'
    )?.value;

  const gender =
    document.querySelector(
      '[name="gender"]'
    )?.value;

  if (
    !name ||
    !aadhaar ||
    !dob ||
    !gender
  ) {
    msg(
      'Name, Aadhaar, DOB और Gender पहले भरें।'
    );

    return;
  }

  if (
    !/^\d{12}$/.test(aadhaar)
  ) {
    msg(
      'Aadhaar number 12 digit होना चाहिए।'
    );

    return;
  }

  const button =
    $('verifyAadhaarBtn');

  button.disabled =
    true;

  button.textContent =
    'Verifying...';

  $('aadhaarVerificationStatus')
    .textContent =
      'Status: Verification in progress...';

  try {
    const {
      data,
      error
    } =
      await sb.functions.invoke(
        'verify-aadhaar-demographic',
        {
          body: {
            aadhaar_number:
              aadhaar,
            name,
            date_of_birth:
              dob,
            gender,
            service_variant:
              activeVariant
                ?.variant_key ||
              null
          }
        }
      );

    if (error) {
      throw error;
    }

    if (!data?.matched) {
      aadhaarVerification = {
        status:
          'mismatch',
        provider:
          data?.provider ||
          null,
        verifiedAt:
          null,
        last4:
          aadhaar.slice(-4),
        result:
          data || {}
      };

      $('aadhaarVerificationStatus')
        .innerHTML = `
          <strong style="color:#b42318">
            ❌ Aadhaar demographic mismatch
          </strong>
        `;

      return;
    }

    aadhaarVerification = {
      status:
        'matched',
      provider:
        data.provider ||
        'authorized_api',
      verifiedAt:
        new Date()
          .toISOString(),
      last4:
        aadhaar.slice(-4),
      result:
        data.match_result ||
        {}
    };

    $('aadhaarVerificationStatus')
      .innerHTML = `
        <strong style="color:#067647">
          ✅ Aadhaar details matched
        </strong>
      `;

  } catch (error) {
    console.error(error);

    aadhaarVerification.status =
      'unavailable';

    $('aadhaarVerificationStatus')
      .innerHTML = `
        <strong style="color:#b54708">
          ⚠️ Authorized Aadhaar API अभी connected नहीं है
        </strong>
      `;

    msg(
      'Aadhaar API integration अभी बाकी है'
    );

  } finally {
    button.disabled =
      false;

    button.textContent =
      'Verify Aadhaar Details';
  }
}


/* =========================================================
   e-PAN OTP FLOW
========================================================= */

function renderEPanOtpSection() {
  const box =
    $('epanOtpSection');

  if (
    activeVariant?.variant_key !==
    'epan'
  ) {
    box.style.display =
      'none';

    return;
  }

  box.style.display =
    'block';

  box.innerHTML = `
    <div style="
      padding:16px;
      border:1px solid #dce5ff;
      border-radius:16px;
      background:#f6f8ff
    ">

      <h3 style="margin-top:0">
        📲 Aadhaar OTP Verification
      </h3>

      <p style="
        color:#667085;
        font-size:13px;
        line-height:1.5
      ">
        OTP Aadhaar-linked mobile
        number पर आएगा।
      </p>

      <button
        type="button"
        class="btn secondary"
        id="sendEpanOtpBtn"
        style="width:100%"
      >
        Send OTP
      </button>

      <div
        id="epanOtpVerifyArea"
        style="display:none;margin-top:12px"
      >

        <input
          id="epanOtpInput"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="Enter OTP"
          style="${fieldInputStyle()}"
        >

        <button
          type="button"
          class="btn primary"
          id="verifyEpanOtpBtn"
          style="
            width:100%;
            margin-top:10px
          "
        >
          Verify OTP
        </button>

      </div>

      <div
        id="epanOtpStatus"
        style="
          margin-top:12px;
          padding:10px;
          background:#fff;
          border-radius:10px
        "
      >
        Status: OTP not verified
      </div>

      ${
        activeVariant
          ?.official_portal_url
          ? `
            <button
              type="button"
              class="btn secondary"
              id="openOfficialEpanPortal"
              style="
                width:100%;
                margin-top:12px
              "
            >
              Open Official e-PAN Portal
            </button>
          `
          : ''
      }

    </div>
  `;

  $('sendEpanOtpBtn')
    .onclick =
      sendEpanOtp;

  if (
    $('openOfficialEpanPortal')
  ) {
    $('openOfficialEpanPortal')
      .onclick =
        () => {

          window.open(
            activeVariant
              .official_portal_url,
            '_blank',
            'noopener'
          );
        };
  }
}


async function sendEpanOtp() {
  const aadhaar =
    document.querySelector(
      '[name="aadhaar_number"]'
    )?.value
      .replace(/\D/g, '');

  const consent =
    document.querySelector(
      '[name="consent"]'
    )?.checked;

  if (
    !/^\d{12}$/.test(
      aadhaar || ''
    )
  ) {
    msg(
      'Valid 12-digit Aadhaar Number भरें।'
    );

    return;
  }

  if (!consent) {
    msg(
      'Aadhaar OTP consent आवश्यक है।'
    );

    return;
  }

  if (!validateEPanEligibility()) {
    return;
  }

  const button =
    $('sendEpanOtpBtn');

  button.disabled =
    true;

  button.textContent =
    'Sending OTP...';

  try {
    /*
      Authorized PAN/Aadhaar provider
      backend Edge Function.
    */
    const {
      data,
      error
    } =
      await sb.functions.invoke(
        'epan-send-otp',
        {
          body: {
            aadhaar_number:
              aadhaar
          }
        }
      );

    if (error) {
      throw error;
    }

    if (!data?.request_id) {
      throw new Error(
        'OTP request failed'
      );
    }

    epanOtp = {
      requestId:
        data.request_id,
      sent:
        true,
      verified:
        false,
      aadhaarLast4:
        aadhaar.slice(-4)
    };

    $('epanOtpVerifyArea')
      .style.display =
        'block';

    $('epanOtpStatus')
      .textContent =
        'OTP sent to Aadhaar-linked mobile';

  } catch (error) {
    console.error(error);

    $('epanOtpStatus')
      .innerHTML = `
        <strong style="color:#b54708">
          Authorized e-PAN API अभी connected नहीं है।
        </strong>
      `;

    msg(
      'अभी official portal fallback इस्तेमाल करें।'
    );

  } finally {
    button.disabled =
      false;

    button.textContent =
      'Send OTP';
  }
}


async function verifyEpanOtp() {
  const otp =
    $('epanOtpInput')
      ?.value
      .replace(/\D/g, '');

  if (
    !epanOtp.requestId
  ) {
    msg(
      'पहले OTP भेजें।'
    );

    return;
  }

  if (
    !/^\d{4,8}$/.test(
      otp || ''
    )
  ) {
    msg(
      'Valid OTP भरें।'
    );

    return;
  }

  const button =
    $('verifyEpanOtpBtn');

  button.disabled =
    true;

  button.textContent =
    'Verifying...';

  try {
    const {
      data,
      error
    } =
      await sb.functions.invoke(
        'epan-verify-otp',
        {
          body: {
            request_id:
              epanOtp.requestId,
            otp
          }
        }
      );

    if (error) {
      throw error;
    }

    if (!data?.verified) {
      throw new Error(
        'OTP verification failed'
      );
    }

    epanOtp.verified =
      true;

    $('epanOtpStatus')
      .innerHTML = `
        <strong style="color:#067647">
          ✅ OTP Verified
        </strong>
      `;

    /*
      API provider may return verified
      Aadhaar/eKYC data here.
      We don't expose/store raw Aadhaar.
    */

  } catch (error) {
    console.error(error);

    $('epanOtpStatus')
      .innerHTML = `
        <strong style="color:#b42318">
          ❌ OTP verification failed
        </strong>
      `;

  } finally {
    button.disabled =
      false;

    button.textContent =
      'Verify OTP';
  }
}


function validateEPanEligibility() {
  if (
    !activeVariant ||
    activeVariant.variant_key !==
    'epan'
  ) {
    return true;
  }

  if (
    !$('epanNoExistingPan')
      ?.checked
  ) {
    showApplicationError(
      'e-PAN के लिए confirm करें कि आपके पास पहले से PAN allotted नहीं है।'
    );

    return false;
  }

  if (
    !$('epanAdult')
      ?.checked
  ) {
    showApplicationError(
      'e-PAN eligibility confirmation आवश्यक है।'
    );

    return false;
  }

  if (
    !$('epanMobileLinked')
      ?.checked
  ) {
    showApplicationError(
      'Aadhaar-linked mobile confirmation आवश्यक है।'
    );

    return false;
  }

  return true;
}


/* =========================================================
   SUPPORTING DOCUMENTS
========================================================= */

function documentConditionRequired(
  doc
) {
  if (doc.required) {
    return true;
  }

  const rule =
    doc.conditional_rules
      ?.required_when;

  if (!rule) {
    return false;
  }

  return conditionIsMet({
    required_when:
      rule
  });
}


function documentConditionVisible(
  doc
) {
  const requiredWhen =
    doc.conditional_rules
      ?.required_when;

  if (!requiredWhen) {
    return true;
  }

  /*
    Conditional photo/signature
    only shown when relevant.
  */
  return conditionIsMet({
    required_when:
      requiredWhen
  });
}


function renderSupportingDocuments() {
  const section =
    $('supportingDocumentsSection');

  if (
    activeVariant &&
    activeVariant
      .allows_document_upload ===
      false
  ) {
    section.innerHTML =
      '';

    return;
  }

  const visibleDocs =
    applicationDocuments.filter(
      documentConditionVisible
    );

  if (!visibleDocs.length) {
    section.innerHTML =
      '';

    return;
  }

  section.innerHTML = `

    <h3>
      📎 Supporting Documents
    </h3>

    <p style="
      color:#667085;
      font-size:13px
    ">
      * वाले documents upload करना अनिवार्य है।
    </p>

    ${
      visibleDocs.map(doc => {

        const required =
          documentConditionRequired(
            doc
          );

        const maxKb =
          Number(
            doc.max_size_kb ||
            (
              Number(
                doc.max_size_mb ||
                1
              ) *
              1024
            )
          );

        const accept =
          Array.isArray(
            doc.allowed_types
          )
            ? doc.allowed_types
                .join(',')
            : 'application/pdf,image/jpeg,image/png';

        return `
          <label
            data-document-wrap="${esc(doc.id)}"
            style="
              display:block;
              border:1px solid #e4e9f1;
              border-radius:14px;
              padding:14px;
              margin:12px 0
            "
          >

            <strong>
              ${esc(doc.name)}

              ${
                required
                  ? `
                    <span style="color:#d92d20">
                      *
                    </span>
                  `
                  : `
                    <small style="color:#667085">
                      (Optional)
                    </small>
                  `
              }
            </strong>

            ${
              doc.instructions
                ? `
                  <small style="
                    display:block;
                    color:#667085;
                    margin:5px 0 10px;
                    line-height:1.5
                  ">
                    ${esc(doc.instructions)}
                  </small>
                `
                : ''
            }

            <input
              type="file"
              data-document-id="${esc(doc.id)}"
              data-required="${required}"
              accept="${esc(accept)}"
              style="
                display:block;
                width:100%;
                margin-top:9px
              "
            >

            <small style="
              display:block;
              color:#667085;
              margin-top:6px
            ">
              Maximum ${maxKb} KB
            </small>

          </label>
        `;
      }).join('')
    }
  `;
}


/* =========================================================
   SUBMIT BUTTON
========================================================= */

function configureSubmitButton() {
  const button =
    $('submitDynamicApplication');

  if (!button) {
    return;
  }

  button.textContent =
    activeVariant
      ?.submit_button_text ||
    'Submit Application';

  if (
    activeVariant?.workflow_type ===
    'tracking'
  ) {
    button.textContent =
      'Track Status';
  }
}


/* =========================================================
   FORM VALUES
========================================================= */

function getFormValues() {
  const result = {};

  applicationFields
    .forEach(field => {

      if (
        field.field_key ===
        'correction_type'
      ) {
        result.correction_type =
          selectedCorrections();

        return;
      }

      const wrapper =
        document.querySelector(
          `[data-field-wrap="${field.field_key}"]`
        );

      if (
        wrapper &&
        wrapper.style.display ===
        'none'
      ) {
        return;
      }

      const element =
        document.querySelector(
          `[name="${field.field_key}"]`
        );

      if (!element) {
        return;
      }

      if (
        field.field_type ===
        'checkbox'
      ) {
        result[field.field_key] =
          element.checked;

      } else {
        result[field.field_key] =
          element.value.trim();
      }
    });

  return result;
}


/* =========================================================
   VALIDATION
========================================================= */

function showApplicationError(
  text
) {
  const box =
    $('applicationError');

  box.textContent =
    text;

  box.style.display =
    'block';

  box.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
}


function validateFieldRules(
  values
) {
  for (
    const field of
    applicationFields
  ) {
    const value =
      values[field.field_key];

    const rules =
      field.validation_rules ||
      {};

    if (
      rules.pattern &&
      value
    ) {
      const regex =
        new RegExp(
          rules.pattern
        );

      if (!regex.test(value)) {
        showApplicationError(
          rules.message ||
          `${field.label} invalid है।`
        );

        return false;
      }
    }
  }

  return true;
}


function validateApplication(
  values
) {
  const form =
    $('dynamicApplicationForm');

  if (!form.checkValidity()) {
    form.reportValidity();
    return false;
  }

  if (
    activeVariant
      ?.variant_key ===
      'pan_correction' &&
    selectedCorrections()
      .length === 0
  ) {
    showApplicationError(
      'कम से कम एक correction type चुनें।'
    );

    return false;
  }

  if (
    values.mobile &&
    !/^\d{10}$/.test(
      String(values.mobile)
        .replace(/\D/g, '')
    )
  ) {
    showApplicationError(
      'Mobile number 10 digit होना चाहिए।'
    );

    return false;
  }

  if (
    values.pincode &&
    !/^\d{6}$/.test(
      String(values.pincode)
        .replace(/\D/g, '')
    )
  ) {
    showApplicationError(
      'PIN Code 6 digit होना चाहिए।'
    );

    return false;
  }

  if (
    values.existing_pan &&
    !/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/
      .test(
        values.existing_pan
      )
  ) {
    showApplicationError(
      'PAN format सही नहीं है। Example: ABCDE1234F'
    );

    return false;
  }

  if (
    !validateFieldRules(values)
  ) {
    return false;
  }

  if (
    activeVariant
      ?.requires_aadhaar_verification &&
    activeVariant.variant_key !==
      'epan' &&
    aadhaarVerification.status !==
      'matched'
  ) {
    showApplicationError(
      'Aadhaar verification आवश्यक है।'
    );

    return false;
  }

  if (
    activeVariant
      ?.variant_key ===
    'epan'
  ) {
    if (
      !validateEPanEligibility()
    ) {
      return false;
    }

    if (!epanOtp.verified) {
      showApplicationError(
        'e-PAN process के लिए Aadhaar OTP verification आवश्यक है।'
      );

      return false;
    }
  }

  for (
    const doc of
    applicationDocuments
  ) {
    if (
      !documentConditionVisible(
        doc
      )
    ) {
      continue;
    }

    if (
      !documentConditionRequired(
        doc
      )
    ) {
      continue;
    }

    const input =
      document.querySelector(
        `[data-document-id="${doc.id}"]`
      );

    if (
      !input?.files?.length
    ) {
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


/* =========================================================
   MAIN FORM ACTION
========================================================= */

async function handleApplicationAction(
  event
) {
  event.preventDefault();

  $('applicationError')
    .style.display =
      'none';

  if (
    activeVariant?.workflow_type ===
    'tracking'
  ) {
    await trackPAN();

    return;
  }

  await submitDynamicApplication();
}


/* =========================================================
   TRACK PAN
========================================================= */

async function trackPAN() {
  const values =
    getFormValues();

  const form =
    $('dynamicApplicationForm');

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  /*
    No scraping/captcha bypass.
    If authorized API is later available,
    call it here.
  */

  try {
    const {
      data,
      error
    } =
      await sb.functions.invoke(
        'track-pan-status',
        {
          body: {
            tracking_method:
              values.tracking_method,

            tracking_number:
              values.tracking_number,

            date_of_birth:
              values.date_of_birth
          }
        }
      );

    if (
      !error &&
      data?.status
    ) {
      showTrackingResult(
        data
      );

      return;
    }

    throw error ||
      new Error(
        'Tracking API unavailable'
      );

  } catch (error) {
    console.log(
      'Track API unavailable:',
      error
    );

    showTrackingFallback(
      values
    );
  }
}


function showTrackingResult(data) {
  const section =
    $('trackingInfoSection');

  section.style.display =
    'block';

  section.innerHTML = `
    <div style="
      padding:15px;
      border-radius:15px;
      background:#f0fdf4;
      border:1px solid #bbf7d0
    ">

      <h3 style="margin-top:0">
        🔎 PAN Status
      </h3>

      <strong>
        ${esc(data.status)}
      </strong>

      ${
        data.message
          ? `
            <p>
              ${esc(data.message)}
            </p>
          `
          : ''
      }

    </div>
  `;
}


function showTrackingFallback() {
  const section =
    $('trackingInfoSection');

  section.style.display =
    'block';

  section.innerHTML = `
    <div style="
      padding:15px;
      border-radius:15px;
      background:#fff7e8;
      border:1px solid #fbd38d
    ">

      <h3 style="margin-top:0">
        Official Tracking Required
      </h3>

      <p style="
        color:#667085;
        line-height:1.5
      ">
        Authorized tracking API अभी
        connected नहीं है।
        UTIITSL का official tracking
        page खोलें।
      </p>

      <button
        type="button"
        class="btn primary"
        id="openOfficialTracking"
        style="width:100%"
      >
        Open Official PAN Tracking
      </button>

    </div>
  `;

  $('openOfficialTracking')
    .onclick =
      () => {

        window.open(
          activeVariant
            ?.official_portal_url ||
          'https://www.trackpan.utiitsl.com/PANONLINE/forms/TrackPan/trackApp#forward',
          '_blank',
          'noopener'
        );
      };
}


/* =========================================================
   SUBMIT NORMAL APPLICATION
========================================================= */

async function submitDynamicApplication() {
  if (
    !user ||
    !activeService
  ) {
    msg(
      'Please login again'
    );

    return;
  }

  const values =
    getFormValues();

  if (
    !validateApplication(
      values
    )
  ) {
    return;
  }

  const submitBtn =
    $('submitDynamicApplication');

  submitBtn.disabled =
    true;

  submitBtn.textContent =
    'Submitting...';

  const safeFormData = {
    ...values
  };

  /*
    Never save raw Aadhaar number
    in normal form_data.
  */
  if (
    safeFormData.aadhaar_number
  ) {
    delete safeFormData
      .aadhaar_number;

    const last4 =
      activeVariant
        ?.variant_key ===
        'epan'
        ? epanOtp.aadhaarLast4
        : aadhaarVerification.last4;

    safeFormData.aadhaar_masked =
      `XXXX-XXXX-${last4 || 'XXXX'}`;
  }

  const applicationId =
    crypto.randomUUID();

  try {
    const amount =
      activeVariant
        ? Number(
            activeVariant
              .assistance_fee ||
            0
          )
        : Number(
            activeService.price ||
            0
          );

    const mode =
      activeVariant
        ?.processing_mode ||
      activeService
        .processing_mode ||
      'admin';

    const aadhaarStatus =
      activeVariant
        ?.variant_key ===
        'epan'
        ? (
            epanOtp.verified
              ? 'matched'
              : 'not_checked'
          )
        : aadhaarVerification.status;

    const last4 =
      activeVariant
        ?.variant_key ===
        'epan'
        ? epanOtp.aadhaarLast4
        : aadhaarVerification.last4;

    const {
      error: appError
    } =
      await sb
        .from('applications')
        .insert({
          id:
            applicationId,

          user_id:
            user.id,

          service_id:
            activeService.id,

          service_variant_id:
            activeVariant?.id ||
            null,

          status:
            'draft',

          processing_mode:
            mode,

          beneficiary_name:
            values.full_name ||
            null,

          form_data:
            safeFormData,

          amount,

          aadhaar_verification_status:
            aadhaarStatus,

          aadhaar_verification_provider:
            activeVariant
              ?.variant_key ===
              'epan'
              ? 'otp_api'
              : aadhaarVerification
                  .provider,

          aadhaar_verified_at:
            aadhaarStatus ===
            'matched'
              ? new Date()
                  .toISOString()
              : null,

          aadhaar_last4:
            last4,

          demographic_match_result:
            activeVariant
              ?.variant_key ===
              'epan'
              ? {}
              : (
                  aadhaarVerification
                    .result ||
                  {}
                )
        });

    if (appError) {
      throw appError;
    }

    if (
      activeVariant
        ?.allows_document_upload !==
      false
    ) {
      await uploadApplicationDocuments(
        applicationId
      );
    }

/* =========================================================
   WALLET PAYMENT + FINAL SUBMIT
========================================================= */

const {
  data: paymentResult,
  error: paymentError
} =
  await sb.rpc(
    'pay_application_from_wallet',
    {
      p_application_id:
        applicationId
    }
  );


if (paymentError) {

  const paymentMessage =
    paymentError.message || '';


  if (
    paymentMessage.includes(
      'INSUFFICIENT_BALANCE'
    )
  ) {

    await loadCustomerWallet();

    showApplicationError(
      `Wallet balance कम है। इस service के लिए ${money(amount)} चाहिए।`
    );

    msg(
      'Insufficient wallet balance'
    );

    setTimeout(
      () => {

        if (
          typeof openCustomerWalletRecharge ===
          'function'
        ) {
          openCustomerWalletRecharge();
        }

      },
      500
    );

    return;
  }


  if (
    paymentMessage.includes(
      'WALLET_NOT_FOUND'
    )
  ) {
    throw new Error(
      'Wallet account नहीं मिला।'
    );
  }


  if (
    paymentMessage.includes(
      'APPLICATION_ALREADY_PROCESSED'
    )
  ) {
    throw new Error(
      'यह application पहले ही submit हो चुकी है।'
    );
  }


  throw paymentError;
}


/* Wallet refresh after successful payment */
await loadCustomerWallet();


if (
  paymentResult?.paid
) {

  msg(
    `Application submitted • ${money(paymentResult.amount)} wallet से paid`
  );

} else {

  msg(
    'Application submitted successfully'
  );

}


closeApplicationForm();

await loadCustomerActivity();

  } catch (error) {
    console.error(error);

    showApplicationError(
      error.message ||
      'Application submit नहीं हो सकी।'
    );

  } finally {
    submitBtn.disabled =
      false;

    configureSubmitButton();
  }
}


/* =========================================================
   DOCUMENT UPLOAD
========================================================= */

async function uploadApplicationDocuments(
  applicationId
) {
  for (
    const doc of
    applicationDocuments
  ) {
    if (
      !documentConditionVisible(
        doc
      )
    ) {
      continue;
    }

    const input =
      document.querySelector(
        `[data-document-id="${doc.id}"]`
      );

    const file =
      input?.files?.[0];

    if (!file) {
      continue;
    }

    const maxKb =
      Number(
        doc.max_size_kb ||
        (
          Number(
            doc.max_size_mb ||
            1
          ) *
          1024
        )
      );

    const maxBytes =
      maxKb * 1024;

    if (
      file.size >
      maxBytes
    ) {
      throw new Error(
        `${doc.name} maximum ${maxKb} KB होना चाहिए।`
      );
    }

    const allowed =
      Array.isArray(
        doc.allowed_types
      )
        ? doc.allowed_types
        : [
            'application/pdf',
            'image/jpeg',
            'image/png'
          ];

    if (
      allowed.length &&
      !allowed.includes(
        file.type
      )
    ) {
      throw new Error(
        `${doc.name} का file type allowed नहीं है।`
      );
    }

    const path =
      `${user.id}/${applicationId}/${doc.id}/${Date.now()}-${safeFileName(file.name)}`;

    const {
      error: uploadError
    } =
      await sb.storage
        .from(
          'application-documents'
        )
        .upload(
          path,
          file,
          {
            upsert: false,
            contentType:
              file.type
          }
        );

    if (uploadError) {
      throw uploadError;
    }

    const {
      error: metadataError
    } =
      await sb
        .from(
          'application_documents'
        )
        .insert({
          application_id:
            applicationId,

          service_document_id:
            doc.id,

          document_name:
            doc.name,

          storage_path:
            path,

          original_file_name:
            file.name,

          mime_type:
            file.type,

          file_size:
            file.size,

          uploaded_by:
            user.id
        });

    if (metadataError) {
      throw metadataError;
    }
  }
}


/* =========================================================
   RESET STATE
========================================================= */

function resetVerificationStates() {
  aadhaarVerification = {
    status: 'not_checked',
    provider: null,
    verifiedAt: null,
    last4: null,
    result: {}
  };

  epanOtp = {
    requestId: null,
    sent: false,
    verified: false,
    aadhaarLast4: null
  };

  if ($('eligibilitySection')) {
    $('eligibilitySection')
      .style.display =
        'none';
  }

  if (
    $('aadhaarVerificationSection')
  ) {
    $('aadhaarVerificationSection')
      .style.display =
        'none';
  }

  if ($('epanOtpSection')) {
    $('epanOtpSection')
      .style.display =
        'none';
  }

  if ($('trackingInfoSection')) {
    $('trackingInfoSection')
      .style.display =
        'none';
  }
}


/* =========================================================
   CUSTOMER APPLICATIONS
========================================================= */

async function loadCustomerActivity() {
  if (!user) {
    return;
  }

  const [
    applicationsResult,
    legacyResult
  ] =
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
          service_variant_id,
          services(name),
          service_variants(
            name,
            variant_key
          ),
          application_outputs(
            id,
            output_type,
            title,
            storage_path,
            external_url,
            reference_no
          )
        `)
        .eq(
          'user_id',
          user.id
        )
        .neq(
          'status',
          'draft'
        )
        .order(
          'submitted_at',
          {
            ascending: false
          }
        ),

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
        .eq(
          'user_id',
          user.id
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        )
    ]);

  if (
    applicationsResult.error
  ) {
    console.error(
      applicationsResult.error
    );
  }

  if (
    legacyResult.error
  ) {
    console.error(
      legacyResult.error
    );
  }

  const applications =
    applicationsResult.data ||
    [];

  const legacy =
    legacyResult.data ||
    [];

  const total =
    applications.length +
    legacy.length;

  const pending =
    applications.filter(
      application =>
        [
          'pending',
          'processing',
          'submitted'
        ].includes(
          application.status
        )
    ).length +

    legacy.filter(
      order =>
        [
          'pending',
          'processing'
        ].includes(
          order.status
        )
    ).length;

  const completed =
    applications.filter(
      application =>
        application.status ===
        'completed'
    ).length +

    legacy.filter(
      order =>
        order.status ===
        'completed'
    ).length;

  if ($('orderCount')) {
    $('orderCount')
      .textContent =
        total;
  }

  if ($('pendingCount')) {
    $('pendingCount')
      .textContent =
        pending;
  }

  if ($('doneCount')) {
    $('doneCount')
      .textContent =
        completed;
  }

  renderCustomerApplications(
    applications,
    legacy
  );
}


/* =========================================================
   CUSTOMER LIST
========================================================= */

function renderCustomerApplications(
  applications,
  legacy
) {
  const list =
    $('ordersList');

  if (!list) {
    return;
  }

  if (
    !applications.length &&
    !legacy.length
  ) {
    list.innerHTML =
      '<p>अभी कोई आवेदन नहीं है।</p>';

    return;
  }

  const applicationHtml =
    applications.map(
      application => {

        const outputs =
          application
            .application_outputs ||
          [];

        return `
          <div class="service-row">

            <div>

              <strong>
                ${esc(
                  application
                    .services
                    ?.name ||
                  'Application'
                )}
              </strong>

              ${
                application
                  .service_variants
                  ?.name
                  ? `
                    <small>
                      ${esc(
                        application
                          .service_variants
                          .name
                      )}
                    </small>
                  `
                  : ''
              }

              <small>
                Application ID:
                ${esc(
                  application
                    .application_no ||
                  application.id
                )}
              </small>

              ${
                application
                  .beneficiary_name
                  ? `
                    <small>
                      Beneficiary:
                      ${esc(
                        application
                          .beneficiary_name
                      )}
                    </small>
                  `
                  : ''
              }

              ${
                Number(
                  application.amount ||
                  0
                ) > 0
                  ? `
                    <small>
                      Amount:
                      ${money(
                        application.amount
                      )}
                    </small>
                  `
                  : ''
              }

              ${
                application
                  .external_reference_no
                  ? `
                    <small>
                      Reference:
                      ${esc(
                        application
                          .external_reference_no
                      )}
                    </small>
                  `
                  : ''
              }

              ${
                outputs.map(
                  output => `
                    <button
                      type="button"
                      class="btn secondary"
                      style="margin-top:7px"
                      onclick='window.downloadApplicationOutput(${JSON.stringify(output)})'
                    >
                      ⬇
                      ${esc(
                        output.title ||
                        'Download Receipt'
                      )}
                    </button>
                  `
                ).join('')
              }

            </div>

            <span
              class="status ${esc(application.status)}"
            >
              ${esc(application.status)}
            </span>

          </div>
        `;
      }
    ).join('');

  const legacyHtml =
    legacy.map(order => `
      <div class="service-row">

        <div>

          <strong>
            ${esc(
              order.services
                ?.name ||
              'Service'
            )}
          </strong>

          <small>
            ${esc(
              new Date(
                order.created_at
              )
                .toLocaleString(
                  'en-IN'
                )
            )}
          </small>

          ${
            order.note
              ? `
                <small>
                  ${esc(order.note)}
                </small>
              `
              : ''
          }

          ${
            Number(
              order.amount ||
              0
            ) > 0
              ? `
                <small>
                  Amount:
                  ${money(
                    order.amount
                  )}
                </small>
              `
              : ''
          }

        </div>

        <span
          class="status ${esc(order.status || 'pending')}"
        >
          ${esc(
            order.status ||
            'pending'
          )}
        </span>

      </div>
    `).join('');

  list.innerHTML =
    applicationHtml +
    legacyHtml;
}


/* =========================================================
   RECEIPT DOWNLOAD
========================================================= */

window.downloadApplicationOutput =
  async output => {

    try {
      if (
        output.external_url
      ) {
        window.open(
          output.external_url,
          '_blank',
          'noopener'
        );

        return;
      }

      if (
        !output.storage_path
      ) {
        msg(
          'Document file available नहीं है।'
        );

        return;
      }

      const {
        data,
        error
      } =
        await sb.storage
          .from(
            'application-outputs'
          )
          .createSignedUrl(
            output.storage_path,
            60
          );

      if (error) {
        throw error;
      }

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
/* =========================================================
   CUSTOMER WALLET MODULE
   SUNIL MULTI HUB
========================================================= */

const walletBalanceEl =
  document.getElementById('walletBalance');

const walletStatBalanceEl =
  document.getElementById('walletStatBalance');

const walletCurrencyEl =
  document.getElementById('walletCurrency');

const walletStatusEl =
  document.getElementById('walletStatus');

const walletUpdatedAtEl =
  document.getElementById('walletUpdatedAt');

const openWalletRechargeBtn =
  document.getElementById('openWalletRechargeBtn');

const refreshWalletBtn =
  document.getElementById('refreshWalletBtn');

const refreshWalletHistoryBtn =
  document.getElementById('refreshWalletHistoryBtn');

const walletRechargeHistory =
  document.getElementById('walletRechargeHistory');

const walletRechargeModal =
  document.getElementById('walletRechargeModal');

const walletRechargeClose =
  document.getElementById('walletRechargeClose');

const walletRechargeForm =
  document.getElementById('walletRechargeForm');

const walletRechargeAmount =
  document.getElementById('walletRechargeAmount');

const walletPaymentMethod =
  document.getElementById('walletPaymentMethod');

const walletUtr =
  document.getElementById('walletUtr');

const walletPaymentReference =
  document.getElementById('walletPaymentReference');

const walletRechargeSubmit =
  document.getElementById('walletRechargeSubmit');

const walletUpiId =
  document.getElementById('walletUpiId');

const walletPayeeName =
  document.getElementById('walletPayeeName');

const walletMinRechargeText =
  document.getElementById('walletMinRechargeText');

const walletPaymentMethodText =
  document.getElementById('walletPaymentMethodText');

const walletMinRechargeHelp =
  document.getElementById('walletMinRechargeHelp');

const walletQrImage =
  document.getElementById('walletQrImage');

const walletQrEmpty =
  document.getElementById('walletQrEmpty');


let customerWallet = null;

let customerWalletSettings = {
  minimum_amount: 100,
  currency: 'INR',
  payment_method: 'UPI_QR',
  upi_id: '',
  payee_name: 'SUNIL MULTI HUB',
  qr_storage_path: ''
};


/* =========================================================
   WALLET MONEY FORMAT
========================================================= */

function walletMoney(value) {

  return '₹' +
    Number(value || 0)
      .toLocaleString(
        'en-IN',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      );
}


/* =========================================================
   LOAD CUSTOMER WALLET
========================================================= */

async function loadCustomerWallet() {

  try {

    const {
      data: {
        session
      }
    } =
      await sb.auth.getSession();

    if (!session?.user) {
      return;
    }

    const userId =
      session.user.id;


    const {
      data,
      error
    } =
      await sb
        .from('wallets')
        .select(`
          id,
          user_id,
          balance,
          currency,
          created_at,
          updated_at
        `)
        .eq(
          'user_id',
          userId
        )
        .maybeSingle();


    if (error) {
      throw error;
    }


    customerWallet =
      data || null;


    const balance =
      Number(
        customerWallet?.balance || 0
      );


    if (walletBalanceEl) {

      walletBalanceEl.textContent =
        walletMoney(balance);

    }


    if (walletStatBalanceEl) {

      walletStatBalanceEl.textContent =
        walletMoney(balance);

    }


    if (walletCurrencyEl) {

      walletCurrencyEl.textContent =
        customerWallet?.currency ||
        'INR';

    }


    if (walletStatusEl) {

      walletStatusEl.textContent =
        customerWallet
          ? 'Active'
          : 'Not Available';

    }


    if (walletUpdatedAtEl) {

      if (customerWallet?.updated_at) {

        walletUpdatedAtEl.textContent =
          'Updated ' +
          new Date(
            customerWallet.updated_at
          ).toLocaleString(
            'en-IN'
          );

      } else {

        walletUpdatedAtEl.textContent =
          'Updated now';

      }

    }

  } catch (error) {

    console.error(
      'Wallet load error:',
      error
    );

    if (
      typeof msg ===
      'function'
    ) {

      msg(
        'Wallet load failed: ' +
        error.message
      );

    }

  }

}


/* =========================================================
   LOAD PAYMENT SETTINGS
========================================================= */

async function loadCustomerWalletSettings() {

  try {

    const {
      data,
      error
    } =
      await sb
        .from('payment_settings')
        .select(`
          id,
          setting_key,
          setting_value,
          active,
          updated_at
        `)
        .eq(
          'setting_key',
          'wallet_topup'
        )
        .eq(
          'active',
          true
        )
        .maybeSingle();


    if (error) {
      throw error;
    }


    if (
      data?.setting_value
    ) {

      customerWalletSettings = {
        ...customerWalletSettings,
        ...data.setting_value
      };

    }


    const minimum =
      Number(
        customerWalletSettings
          .minimum_amount || 100
      );


    if (walletUpiId) {

      walletUpiId.textContent =
        customerWalletSettings
          .upi_id ||
        'Not configured';

    }


    if (walletPayeeName) {

      walletPayeeName.textContent =
        customerWalletSettings
          .payee_name ||
        'SUNIL MULTI HUB';

    }


    if (walletMinRechargeText) {

      walletMinRechargeText.textContent =
        walletMoney(minimum);

    }


    if (walletPaymentMethodText) {

      walletPaymentMethodText.textContent =
        customerWalletSettings
          .payment_method ===
          'UPI_QR'
          ? 'UPI QR'
          : customerWalletSettings
              .payment_method ||
            'UPI QR';

    }


    if (walletMinRechargeHelp) {

      walletMinRechargeHelp.textContent =
        'Minimum recharge ' +
        walletMoney(minimum);

    }


    if (walletRechargeAmount) {

      walletRechargeAmount.min =
        String(minimum);

      if (
        !walletRechargeAmount.value
      ) {

        walletRechargeAmount.value =
          String(minimum);

      }

    }


    await loadCustomerWalletQr();

  } catch (error) {

    console.error(
      'Wallet settings error:',
      error
    );

  }

}


/* =========================================================
   LOAD UPI QR
========================================================= */

async function loadCustomerWalletQr() {

  const path =
    customerWalletSettings
      .qr_storage_path || '';


  if (
    !walletQrImage ||
    !walletQrEmpty
  ) {
    return;
  }


  walletQrImage.style.display =
    'none';

  walletQrImage.removeAttribute(
    'src'
  );

  walletQrEmpty.style.display =
    'block';


  if (!path) {

    walletQrEmpty.textContent =
      'UPI QR अभी उपलब्ध नहीं है।';

    return;
  }


  try {

    const {
      data,
      error
    } =
      await sb.storage
        .from('payment-qr')
        .createSignedUrl(
          path,
          600
        );


    if (error) {
      throw error;
    }


    if (!data?.signedUrl) {

      throw new Error(
        'QR URL not available'
      );

    }


    walletQrImage.src =
      data.signedUrl;

    walletQrImage.style.display =
      'block';

    walletQrEmpty.style.display =
      'none';


  } catch (error) {

    console.error(
      'QR load error:',
      error
    );

    walletQrEmpty.textContent =
      'QR Code load नहीं हो पाया।';

  }

}
/* =========================================================
   LOAD WALLET RECHARGE HISTORY
========================================================= */

async function loadCustomerWalletHistory() {

  if (
    !user ||
    !walletRechargeHistory
  ) {
    return;
  }

  try {

    walletRechargeHistory.innerHTML =
      '<div class="wallet-history-empty">Loading recharge history...</div>';


    const {
      data,
      error
    } =
      await sb
        .from('wallet_topups')
        .select(`
          id,
          user_id,
          wallet_id,
          amount,
          payment_method,
          utr,
          payment_reference,
          provider_reference,
          status,
          verification_mode,
          rejection_reason,
          created_at,
          updated_at
        `)
        .eq(
          'user_id',
          user.id
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        );


    if (error) {
      throw error;
    }


    const rows =
      data || [];


    if (!rows.length) {

      walletRechargeHistory.innerHTML =
        '<div class="wallet-history-empty">अभी कोई recharge request नहीं है।</div>';

      return;
    }


    walletRechargeHistory.innerHTML =
      rows.map(item => {

        const status =
          String(
            item.status ||
            'submitted'
          );

        const statusLabel =
          status
            .replace(/_/g, ' ')
            .replace(
              /\b\w/g,
              c => c.toUpperCase()
            );

        return `
          <div class="wallet-history-item">

            <div>

              <strong>
                ${walletMoney(item.amount)}
              </strong>

              <small>
                UTR:
                ${esc(item.utr || 'Not submitted')}
              </small>

              <small>
                ${new Date(
                  item.created_at
                ).toLocaleString('en-IN')}
              </small>

              ${
                item.rejection_reason
                  ? `
                    <small style="color:#b42318">
                      Reason:
                      ${esc(item.rejection_reason)}
                    </small>
                  `
                  : ''
              }

            </div>

            <span class="status ${esc(status)}">
              ${esc(statusLabel)}
            </span>

          </div>
        `;

      }).join('');


  } catch (error) {

    console.error(
      'Wallet history error:',
      error
    );

    walletRechargeHistory.innerHTML =
      `<div class="wallet-history-empty">
        ${esc(error.message || 'Recharge history load failed')}
      </div>`;

  }

}


/* =========================================================
   OPEN / CLOSE RECHARGE MODAL
========================================================= */

function openCustomerWalletRecharge() {

  if (!walletRechargeModal) {
    return;
  }

  const minimum =
    Number(
      customerWalletSettings
        .minimum_amount || 100
    );


  if (walletRechargeAmount) {

    walletRechargeAmount.min =
      String(minimum);

    if (
      !walletRechargeAmount.value ||
      Number(
        walletRechargeAmount.value
      ) < minimum
    ) {

      walletRechargeAmount.value =
        String(minimum);

    }

  }


  walletRechargeModal.classList.add(
    'show'
  );

  document.body.style.overflow =
    'hidden';

}


function closeCustomerWalletRecharge() {

  if (!walletRechargeModal) {
    return;
  }

  walletRechargeModal.classList.remove(
    'show'
  );

  document.body.style.overflow =
    '';

}


/* =========================================================
   CHECK DUPLICATE UTR
========================================================= */

async function walletUtrAlreadyExists(
  utr
) {

  const {
    data,
    error
  } =
    await sb
      .from('wallet_topups')
      .select('id')
      .eq(
        'utr',
        utr
      )
      .maybeSingle();


  if (
    error &&
    error.code !== 'PGRST116'
  ) {
    throw error;
  }


  return !!data;

}


/* =========================================================
   SUBMIT WALLET RECHARGE
========================================================= */

async function submitCustomerWalletRecharge(
  event
) {

  event.preventDefault();


  if (
    !user
  ) {

    msg(
      'Please login again'
    );

    return;
  }


  if (
    !customerWallet
  ) {

    msg(
      'Wallet account available नहीं है'
    );

    return;
  }


  const minimum =
    Number(
      customerWalletSettings
        .minimum_amount || 100
    );


  const amount =
    Number(
      walletRechargeAmount
        ?.value || 0
    );


  const utr =
    String(
      walletUtr
        ?.value || ''
    )
      .trim();


  const paymentReference =
    String(
      walletPaymentReference
        ?.value || ''
    )
      .trim();


  const method =
    customerWalletSettings
      .payment_method ||
    'UPI_QR';


  if (
    !Number.isFinite(amount) ||
    amount < minimum
  ) {

    msg(
      `Minimum recharge ${walletMoney(minimum)} है`
    );

    walletRechargeAmount
      ?.focus();

    return;
  }


  if (
    !utr ||
    utr.length < 6
  ) {

    msg(
      'Valid UTR / Transaction ID भरें'
    );

    walletUtr
      ?.focus();

    return;
  }


  if (
    !/^[A-Za-z0-9._\-\/]+$/
      .test(utr)
  ) {

    msg(
      'UTR में केवल letters, numbers और basic symbols रखें'
    );

    return;
  }


  if (
    walletRechargeSubmit
  ) {

    walletRechargeSubmit.disabled =
      true;

    walletRechargeSubmit.textContent =
      'Submitting...';

  }


  try {

    const duplicate =
      await walletUtrAlreadyExists(
        utr
      );


    if (duplicate) {

      throw new Error(
        'यह UTR पहले submit हो चुका है'
      );

    }


    const {
      error
    } =
      await sb
        .from('wallet_topups')
        .insert({
          user_id:
            user.id,

          wallet_id:
            customerWallet.id,

          amount:
            amount,

          payment_method:
            method,

          utr:
            utr,

          payment_reference:
            paymentReference ||
            null,

          status:
            'submitted',

          verification_mode:
            customerWalletSettings
              .auto_verification
              ? 'automatic'
              : 'manual'
        });


    if (error) {
      throw error;
    }


    if (
      walletRechargeForm
    ) {

      walletRechargeForm.reset();

    }


    if (
      walletRechargeAmount
    ) {

      walletRechargeAmount.value =
        String(minimum);

    }


    closeCustomerWalletRecharge();


    msg(
      'Recharge request submitted'
    );


    await loadCustomerWalletHistory();


  } catch (error) {

    console.error(
      'Recharge submit error:',
      error
    );

    msg(
      error.message ||
      'Recharge request submit failed'
    );


  } finally {

    if (
      walletRechargeSubmit
    ) {

      walletRechargeSubmit.disabled =
        false;

      walletRechargeSubmit.textContent =
        'Submit Recharge Request';

    }

  }

}
/* =========================================================
   WALLET EVENTS
========================================================= */

function setupCustomerWalletEvents() {

  if (openWalletRechargeBtn) {
    openWalletRechargeBtn.onclick =
      openCustomerWalletRecharge;
  }


  if (walletRechargeClose) {
    walletRechargeClose.onclick =
      closeCustomerWalletRecharge;
  }


  if (walletRechargeModal) {

    walletRechargeModal.onclick =
      event => {

        if (
          event.target ===
          walletRechargeModal
        ) {
          closeCustomerWalletRecharge();
        }

      };

  }


  if (walletRechargeForm) {

    walletRechargeForm.onsubmit =
      submitCustomerWalletRecharge;

  }


  if (refreshWalletBtn) {

    refreshWalletBtn.onclick =
      async () => {

        await loadCustomerWallet();

        msg(
          'Wallet balance refreshed'
        );

      };

  }


  if (refreshWalletHistoryBtn) {

    refreshWalletHistoryBtn.onclick =
      async () => {

        await loadCustomerWalletHistory();

        msg(
          'Recharge history refreshed'
        );

      };

  }

}


/* =========================================================
   CUSTOMER WALLET INITIAL LOAD
========================================================= */

async function initializeCustomerWallet() {

  try {

    const {
      data: {
        session
      }
    } =
      await sb.auth.getSession();


    if (!session?.user) {
      return;
    }


    /*
      Existing dashboard.js में global
      user variable पहले set होता है।
      Safety के लिए यहाँ भी ensure कर रहे हैं।
    */

    if (!user) {
      user = session.user;
    }


    setupCustomerWalletEvents();


    await Promise.all([
      loadCustomerWallet(),
      loadCustomerWalletSettings(),
      loadCustomerWalletHistory()
    ]);


  } catch (error) {

    console.error(
      'Customer wallet init error:',
      error
    );

  }

}


/* =========================================================
   REFRESH WALLET WHEN PAGE BECOMES ACTIVE
========================================================= */

document.addEventListener(
  'visibilitychange',
  async () => {

    if (
      document.visibilityState ===
      'visible' &&
      user
    ) {

      try {

        await loadCustomerWallet();

      } catch (error) {

        console.error(
          'Wallet refresh error:',
          error
        );

      }

    }

  }
);


/* =========================================================
   START CUSTOMER WALLET MODULE
========================================================= */

window.addEventListener(
  'load',
  async () => {

    /*
      Existing dashboard boot() भी page load
      के आसपास चलता है।

      छोटा delay इसलिए कि login/session
      और existing customer portal पहले
      initialize हो जाए।
    */

    setTimeout(
      async () => {

        await initializeCustomerWallet();

      },
      500
    );

  }
);
/* =========================================================
   AADHAAR → PAN LOOKUP (TEST MODE)
========================================================= */

const AADHAAR_PAN_SERVICE_ID =
  'edf53c2d-1712-4108-8f72-1acd10920c77';


function setupAadhaarPanLookupButton() {

  const form =
    document.getElementById(
      'dynamicApplicationForm'
    );

  if (!form) return;


  const serviceId =
    activeService?.id || '';


  if (
    String(serviceId) !==
    AADHAAR_PAN_SERVICE_ID
  ) {
    return;
  }


  if (
    document.getElementById(
      'fetchPanDataBtn'
    )
  ) {
    return;
  }


  const aadhaarInput =
    form.querySelector(
      '[name="aadhaar_number"]'
    );


  if (!aadhaarInput) {
    return;
  }


  const wrapper =
    document.createElement('div');

  wrapper.style.marginTop =
    '16px';


  wrapper.innerHTML = `
    <button
      type="button"
      id="fetchPanDataBtn"
      class="btn primary"
      style="
        width:100%;
        min-height:52px;
      "
    >
      🔎 Fetch PAN Data
    </button>

    <div
      id="panLookupResult"
      style="
        margin-top:14px;
        display:none;
        border:1px solid #dfe5ee;
        border-radius:14px;
        padding:14px;
        background:#f8fafc;
      "
    ></div>
  `;


  const aadhaarFieldWrap =
  document.querySelector(
    '[data-field-wrap="aadhaar_number"]'
  );

if (aadhaarFieldWrap) {
  aadhaarFieldWrap.after(wrapper);
}


  const fetchBtn =
    document.getElementById(
      'fetchPanDataBtn'
    );


  if (!fetchBtn) {
    return;
  }


  fetchBtn.onclick =
    async () => {

      const aadhaar =
        String(
          aadhaarInput.value || ''
        )
          .replace(/\D/g, '');


      if (
        !/^\d{12}$/.test(
          aadhaar
        )
      ) {

        msg(
          '12 digit Aadhaar Number भरें'
        );

        aadhaarInput.focus();

        return;
      }


      fetchBtn.disabled =
        true;

      fetchBtn.textContent =
        'Fetching PAN...';


      const resultBox =
        document.getElementById(
          'panLookupResult'
        );


      try {

        const {
          data,
          error
        } =
          await sb.functions.invoke(
            'aadhaar-pan-lookup',
            {
              body: {
                aadhaar
              }
            }
          );


        if (error) {
          throw error;
        }


        if (
          !data?.success
        ) {
          throw new Error(
            data?.message ||
            'PAN lookup failed'
          );
        }


        if (resultBox) {

          resultBox.style.display =
            'block';

          resultBox.innerHTML = `
            <div
              style="
                font-weight:800;
                color:#15803d;
                margin-bottom:10px;
              "
            >
              ✅ PAN Data Found
            </div>

            <div
              style="
                display:grid;
                gap:8px;
              "
            >
              <div>
                <strong>PAN Number:</strong>
                ${esc(
                  data.data?.pan || ''
                )}
              </div>

              <div>
                <strong>Aadhaar:</strong>
                ${esc(
                  data.data?.aadhaar || ''
                )}
              </div>

              <div>
                <strong>Status:</strong>
                ${esc(
                  data.data?.details || ''
                )}
              </div>

              ${
                data.test_mode
                  ? `
                    <div
                      style="
                        margin-top:8px;
                        padding:9px;
                        border-radius:10px;
                        background:#fff7e6;
                        color:#8a5a00;
                        font-size:13px;
                      "
                    >
                      TEST MODE — कोई real PAN lookup या wallet debit नहीं हुआ।
                    </div>
                  `
                  : ''
              }
            </div>
          `;

        }


        msg(
          'PAN data fetched successfully'
        );


      } catch (error) {

        console.error(
          'PAN lookup error:',
          error
        );


        if (resultBox) {

          resultBox.style.display =
            'block';

          resultBox.innerHTML = `
            <div
              style="
                color:#b42318;
                font-weight:700;
              "
            >
              PAN lookup failed:
              ${esc(
                error.message ||
                'Unknown error'
              )}
            </div>
          `;

        }


        msg(
          error.message ||
          'PAN lookup failed'
        );


      } finally {

        fetchBtn.disabled =
          false;

        fetchBtn.textContent =
          '🔎 Fetch PAN Data';

      }

    };

}


/* =========================================================
   AUTO ATTACH FETCH PAN BUTTON
========================================================= */

const panLookupObserver =
  new MutationObserver(
    () => {
      setupAadhaarPanLookupButton();
    }
  );


panLookupObserver.observe(
  document.body,
  {
    childList: true,
    subtree: true
  }
);


setTimeout(
  setupAadhaarPanLookupButton,
  1000
);
