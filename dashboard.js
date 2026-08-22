const toast = document.getElementById('toast');

let tm;
let user = null;
let services = [];
let activeService = null;


/* =========================================
   HELPERS
========================================= */

function msg(text) {
  if (!toast) return;

  toast.textContent = text;
  toast.classList.add('show');

  clearTimeout(tm);

  tm = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function money(value) {
  return '₹' + Number(value || 0).toLocaleString('en-IN');
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


/* =========================================
   BOOT
========================================= */

async function boot() {
  createServiceModal();

  const {
    data: { session },
    error
  } = await sb.auth.getSession();

  if (error) {
    msg(error.message);
    return;
  }

  if (!session) {
    location.replace('auth.html');
    return;
  }

  user = session.user;

  const who = document.getElementById('who');

  if (who) {
    who.textContent = user.email || 'Customer';
  }

  await loadServices();
  await loadOrders();
}


/* =========================================
   LOGOUT
========================================= */

const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await sb.auth.signOut();
    location.href = 'auth.html';
  };
}


/* =========================================
   LOAD SERVICES
========================================= */

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
      instructions
    `)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    msg(error.message);
    return;
  }

  services = data || [];

  const serviceCount = document.getElementById('serviceCount');

  if (serviceCount) {
    serviceCount.textContent = services.length;
  }

  const select = document.getElementById('serviceSelect');

  if (select) {
    select.innerHTML =
      '<option value="">Select service</option>' +
      services.map(service => {
        const price = Number(service.price || 0);

        return `
          <option value="${esc(service.id)}">
            ${esc(service.name)}
            ${price > 0 ? ' — ' + money(price) : ''}
          </option>
        `;
      }).join('');
  }

  renderServiceSections();

  const requestedService = localStorage.getItem('smh-selected-service');

  if (requestedService) {
    const match = services.find(
      s =>
        String(s.name).trim().toLowerCase() ===
        requestedService.trim().toLowerCase()
    );

    if (match) {
      localStorage.removeItem('smh-selected-service');
      openServiceDetails(match.id);
    }
  }
}


/* =========================================
   CATEGORY
========================================= */

function normalCategory(value) {
  const category = String(value || 'Other').trim().toLowerCase();

  if (category === 'popular') return 'Popular';
  if (category === 'government') return 'Government';
  if (category === 'print') return 'Print';

  return 'Other';
}

function getGridByHeading(headingText) {
  const sections = [...document.querySelectorAll('.portal-section')];

  const section = sections.find(sec => {
    const heading = sec.querySelector('h2');

    return heading && heading.textContent.includes(headingText);
  });

  return section?.querySelector('.portal-service-grid');
}


/* =========================================
   SERVICE CARD
========================================= */

function serviceCard(service) {
  const price = Number(service.price || 0);

  const description =
    service.description || 'Online Service';

  return `
    <button
      type="button"
      class="portal-service-card"
      onclick="openServiceDetails('${esc(service.id)}')"
    >
      <span class="portal-service-icon">
        ${esc(service.icon || '🧩')}
      </span>

      <strong>
        ${esc(service.name)}
      </strong>

      <small>
        ${esc(description)}
      </small>

      ${
        price > 0
          ? `
            <span style="
              margin-top:7px;
              font-weight:800;
              color:#2855cc;
              font-size:13px;
            ">
              ${money(price)}
            </span>
          `
          : ''
      }
    </button>
  `;
}


/* =========================================
   TOOL CARDS
========================================= */

function printToolCards() {
  return `
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

    <a class="portal-service-card" href="tools.html#resize">
      <span class="portal-service-icon">🖼️</span>
      <strong>Photo Resize</strong>
      <small>Resize / Compress</small>
    </a>
  `;
}

function otherToolCards() {
  return `
    <a class="portal-service-card" href="tools.html">
      <span class="portal-service-icon">🧰</span>
      <strong>All Online Tools</strong>
      <small>Open Toolkit</small>
    </a>
  `;
}


/* =========================================
   RENDER SECTIONS
========================================= */

function renderServiceSections() {
  const popularGrid = getGridByHeading('लोकप्रिय सेवाएँ');
  const governmentGrid = getGridByHeading('सरकारी एवं नागरिक सेवाएँ');
  const printGrid = getGridByHeading('प्रिंट और दस्तावेज़ सेवाएँ');
  const otherGrid = getGridByHeading('अन्य सेवाएँ');

  const popular = services.filter(
    s => normalCategory(s.category) === 'Popular'
  );

  const government = services.filter(
    s => normalCategory(s.category) === 'Government'
  );

  const print = services.filter(
    s => normalCategory(s.category) === 'Print'
  );

  const other = services.filter(
    s => normalCategory(s.category) === 'Other'
  );

  if (popularGrid) {
    popularGrid.innerHTML =
      popular.length
        ? popular.map(serviceCard).join('')
        : '<p>No services available.</p>';
  }

  if (governmentGrid) {
    governmentGrid.innerHTML =
      government.length
        ? government.map(serviceCard).join('')
        : '<p>No services available.</p>';
  }

  if (printGrid) {
    printGrid.innerHTML =
      print.map(serviceCard).join('') +
      printToolCards();
  }

  if (otherGrid) {
    otherGrid.innerHTML =
      other.map(serviceCard).join('') +
      otherToolCards();
  }
}


/* =========================================
   SERVICE DETAILS MODAL
========================================= */

function createServiceModal() {
  if (document.getElementById('serviceDetailsModal')) return;

  const modal = document.createElement('div');

  modal.id = 'serviceDetailsModal';

  modal.innerHTML = `
    <div
      id="serviceDetailsBackdrop"
      style="
        position:fixed;
        inset:0;
        background:rgba(10,20,40,.55);
        z-index:9998;
        display:none;
      "
    ></div>

    <div
      id="serviceDetailsBox"
      style="
        position:fixed;
        left:50%;
        bottom:0;
        transform:translateX(-50%) translateY(110%);
        width:min(620px,100%);
        max-height:88vh;
        overflow:auto;
        background:#fff;
        z-index:9999;
        border-radius:26px 26px 0 0;
        padding:22px;
        box-shadow:0 -20px 60px rgba(0,0,0,.25);
        transition:.25s ease;
      "
    >
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:14px;
      ">
        <div style="
          display:flex;
          gap:13px;
          align-items:center;
        ">
          <div
            id="serviceModalIcon"
            style="
              width:58px;
              height:58px;
              border-radius:18px;
              background:#eef3ff;
              display:grid;
              place-items:center;
              font-size:29px;
            "
          >
            🧩
          </div>

          <div>
            <small
              id="serviceModalCategory"
              style="
                display:block;
                color:#2855cc;
                font-weight:800;
                margin-bottom:3px;
              "
            >
              SERVICE
            </small>

            <h2
              id="serviceModalName"
              style="margin:0;font-size:23px"
            >
              Service
            </h2>
          </div>
        </div>

        <button
          id="serviceModalClose"
          type="button"
          style="
            border:0;
            background:#f1f4f8;
            width:40px;
            height:40px;
            border-radius:50%;
            font-size:20px;
            cursor:pointer;
          "
        >
          ×
        </button>
      </div>

      <p
        id="serviceModalDescription"
        style="
          color:#667085;
          line-height:1.65;
          margin:18px 0;
        "
      ></p>

      <div
        id="serviceModalPriceBox"
        style="
          background:#edf3ff;
          border-radius:16px;
          padding:15px;
          margin-bottom:16px;
        "
      >
        <small style="
          display:block;
          color:#667085;
          margin-bottom:3px;
        ">
          Service Price
        </small>

        <strong
          id="serviceModalPrice"
          style="
            font-size:25px;
            color:#2855cc;
          "
        >
          ₹0
        </strong>
      </div>

      <div
        id="serviceDocumentsWrap"
        style="
          border:1px solid #e4e9f1;
          border-radius:16px;
          padding:16px;
          margin-bottom:15px;
        "
      >
        <h3 style="margin:0 0 10px">
          📄 आवश्यक दस्तावेज़
        </h3>

        <div
          id="serviceModalDocuments"
          style="
            color:#566174;
            line-height:1.8;
          "
        ></div>
      </div>

      <div
        id="serviceInstructionsWrap"
        style="
          border:1px solid #e4e9f1;
          border-radius:16px;
          padding:16px;
          margin-bottom:18px;
        "
      >
        <h3 style="margin:0 0 10px">
          ℹ️ जरूरी जानकारी
        </h3>

        <div
          id="serviceModalInstructions"
          style="
            color:#566174;
            line-height:1.7;
          "
        ></div>
      </div>

      <button
        id="serviceApplyBtn"
        type="button"
        class="btn primary"
        style="
          width:100%;
          min-height:50px;
          font-size:16px;
        "
      >
        Apply Now
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('serviceModalClose')
    .onclick = closeServiceDetails;

  document.getElementById('serviceDetailsBackdrop')
    .onclick = closeServiceDetails;

  document.getElementById('serviceApplyBtn')
    .onclick = applySelectedService;
}

function textLines(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '<p style="margin:0">इस service के लिए दस्तावेज़ की जानकारी उपलब्ध नहीं है।</p>';
  }

  return text
    .split(/\n+/)
    .filter(Boolean)
    .map(line => `
      <div style="
        display:flex;
        gap:8px;
        margin:6px 0;
      ">
        <span>✓</span>
        <span>${esc(line.trim())}</span>
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

  document.getElementById('serviceModalIcon').textContent =
    service.icon || '🧩';

  document.getElementById('serviceModalCategory').textContent =
    normalCategory(service.category);

  document.getElementById('serviceModalName').textContent =
    service.name;

  document.getElementById('serviceModalDescription').textContent =
    service.description || 'Online service assistance';

  const price = Number(service.price || 0);

  const priceBox = document.getElementById('serviceModalPriceBox');

  if (price > 0) {
    priceBox.style.display = 'block';
    document.getElementById('serviceModalPrice').textContent =
      money(price);
  } else {
    priceBox.style.display = 'none';
  }

  document.getElementById('serviceModalDocuments').innerHTML =
    textLines(service.required_documents);

  document.getElementById('serviceModalInstructions').innerHTML =
    service.instructions
      ? esc(service.instructions).replace(/\n/g, '<br>')
      : 'आवेदन से पहले सभी जानकारी और दस्तावेज़ जाँच लें।';

  document.getElementById('serviceDetailsBackdrop').style.display =
    'block';

  requestAnimationFrame(() => {
    document.getElementById('serviceDetailsBox').style.transform =
      'translateX(-50%) translateY(0)';
  });

  document.body.style.overflow = 'hidden';
}

function closeServiceDetails() {
  const box = document.getElementById('serviceDetailsBox');
  const backdrop = document.getElementById('serviceDetailsBackdrop');

  if (!box || !backdrop) return;

  box.style.transform =
    'translateX(-50%) translateY(110%)';

  setTimeout(() => {
    backdrop.style.display = 'none';
  }, 220);

  document.body.style.overflow = '';
}

function applySelectedService() {
  if (!activeService) return;

  const select = document.getElementById('serviceSelect');

  if (!select) return;

  select.value = activeService.id;

  const selectedName = activeService.name;

  closeServiceDetails();

  setTimeout(() => {
    document
      .getElementById('requestSection')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

    msg(`${selectedName} selected`);
  }, 250);
}


/* =========================================
   OLD COMPATIBILITY
========================================= */

function selectServiceById(id) {
  openServiceDetails(id);
}

function selectServiceByName(name) {
  const service = services.find(
    s =>
      String(s.name).trim().toLowerCase() ===
      String(name).trim().toLowerCase()
  );

  if (!service) {
    msg('यह service अभी available नहीं है');
    return;
  }

  openServiceDetails(service.id);
}


/* =========================================
   LOAD ORDERS
========================================= */

async function loadOrders() {
  if (!user) return;

  const { data, error } = await sb
    .from('orders')
    .select(`
      id,
      user_id,
      service_id,
      status,
      note,
      amount,
      created_at,
      services(name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    msg(error.message);
    return;
  }

  const rows = data || [];

  const orderCount = document.getElementById('orderCount');
  const pendingCount = document.getElementById('pendingCount');
  const doneCount = document.getElementById('doneCount');

  if (orderCount) {
    orderCount.textContent = rows.length;
  }

  if (pendingCount) {
    pendingCount.textContent = rows.filter(
      order =>
        order.status === 'pending' ||
        order.status === 'processing'
    ).length;
  }

  if (doneCount) {
    doneCount.textContent = rows.filter(
      order => order.status === 'completed'
    ).length;
  }

  const ordersList = document.getElementById('ordersList');

  if (!ordersList) return;

  if (!rows.length) {
    ordersList.innerHTML =
      '<p>अभी कोई आवेदन नहीं है।</p>';
    return;
  }

  ordersList.innerHTML = rows.map(order => {
    const serviceName =
      order.services?.name || 'Service';

    const status =
      order.status || 'pending';

    const date =
      new Date(order.created_at)
        .toLocaleString('en-IN');

    const amount =
      Number(order.amount || 0);

    return `
      <div class="service-row">

        <div>
          <strong>
            ${esc(serviceName)}
          </strong>

          <small>
            ${esc(date)}
          </small>

          ${
            order.note
              ? `<small>${esc(order.note)}</small>`
              : ''
          }

          ${
            amount > 0
              ? `<small>Amount: ${money(amount)}</small>`
              : ''
          }
        </div>

        <span class="status ${esc(status)}">
          ${esc(status)}
        </span>

      </div>
    `;
  }).join('');
}


/* =========================================
   SUBMIT ORDER
========================================= */

const orderForm =
  document.getElementById('orderForm');

if (orderForm) {
  orderForm.onsubmit = async event => {
    event.preventDefault();

    if (!user) {
      msg('Please login again');
      return;
    }

    const serviceSelect =
      document.getElementById('serviceSelect');

    const noteInput =
      document.getElementById('orderNote');

    const serviceId =
      serviceSelect?.value;

    if (!serviceId) {
      msg('Service चुनें');
      return;
    }

    const selectedService =
      services.find(
        s => String(s.id) === String(serviceId)
      );

    if (!selectedService) {
      msg('Invalid service');
      return;
    }

    const note =
      noteInput?.value?.trim() || '';

    const submitButton =
      orderForm.querySelector(
        'button[type="submit"]'
      );

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent =
        'Submitting...';
    }

    const { error } = await sb
      .from('orders')
      .insert({
        user_id: user.id,
        service_id: selectedService.id,
        note,
        status: 'pending'
      });

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent =
        'Submit Request';
    }

    if (error) {
      msg(error.message);
      return;
    }

    if (noteInput) {
      noteInput.value = '';
    }

    if (serviceSelect) {
      serviceSelect.value = '';
    }

    msg(
      `${selectedService.name} request submitted`
    );

    await loadOrders();
  };
}


/* =========================================
   START
========================================= */
/* =========================================
   SERVICE DETAILS POPUP FIX
========================================= */

function createServiceModal() {
  if (document.getElementById('serviceDetailsModal')) return;

  const wrap = document.createElement('div');
  wrap.id = 'serviceDetailsModal';

  wrap.innerHTML = `
    <div id="serviceDetailsBackdrop"
      style="display:none;position:fixed;inset:0;background:rgba(8,18,38,.58);z-index:9998;">
    </div>

    <div id="serviceDetailsBox"
      style="
        position:fixed;
        left:50%;
        bottom:0;
        width:min(620px,100%);
        max-height:88vh;
        overflow:auto;
        background:#fff;
        z-index:9999;
        border-radius:26px 26px 0 0;
        padding:22px;
        box-shadow:0 -20px 60px rgba(0,0,0,.25);
        transform:translateX(-50%) translateY(110%);
        transition:.25s ease;
      ">

      <div style="display:flex;justify-content:space-between;gap:15px;align-items:flex-start">

        <div style="display:flex;gap:12px;align-items:center">

          <div id="serviceModalIcon"
            style="
              width:58px;
              height:58px;
              border-radius:18px;
              background:#eef3ff;
              display:grid;
              place-items:center;
              font-size:29px;
            ">🧩</div>

          <div>
            <small id="serviceModalCategory"
              style="color:#2855cc;font-weight:800">
              SERVICE
            </small>

            <h2 id="serviceModalName"
              style="margin:4px 0 0">
              Service
            </h2>
          </div>

        </div>

        <button type="button" id="serviceModalClose"
          style="
            width:40px;
            height:40px;
            border:0;
            border-radius:50%;
            background:#f1f4f8;
            font-size:22px;
          ">×</button>

      </div>

      <p id="serviceModalDescription"
        style="color:#667085;line-height:1.6;margin:18px 0">
      </p>

      <div id="serviceModalPriceBox"
        style="
          background:#edf3ff;
          padding:15px;
          border-radius:16px;
          margin-bottom:15px;
        ">

        <small style="color:#667085">
          Service Price
        </small>

        <strong id="serviceModalPrice"
          style="
            display:block;
            font-size:26px;
            color:#2855cc;
            margin-top:3px;
          ">₹0</strong>
      </div>

      <div style="
        border:1px solid #e4e9f1;
        border-radius:16px;
        padding:16px;
        margin-bottom:14px;
      ">
        <h3 style="margin:0 0 10px">
          📄 आवश्यक दस्तावेज़
        </h3>

        <div id="serviceModalDocuments"
          style="color:#566174;line-height:1.8">
        </div>
      </div>

      <div style="
        border:1px solid #e4e9f1;
        border-radius:16px;
        padding:16px;
        margin-bottom:18px;
      ">
        <h3 style="margin:0 0 10px">
          ℹ️ जरूरी जानकारी
        </h3>

        <div id="serviceModalInstructions"
          style="color:#566174;line-height:1.7">
        </div>
      </div>

      <button type="button"
        id="serviceApplyBtn"
        class="btn primary"
        style="width:100%;min-height:52px;font-size:16px">
        Apply Now
      </button>

    </div>
  `;

  document.body.appendChild(wrap);

  document.getElementById('serviceModalClose').onclick =
    closeServiceDetails;

  document.getElementById('serviceDetailsBackdrop').onclick =
    closeServiceDetails;

  document.getElementById('serviceApplyBtn').onclick =
    applySelectedService;
}


function documentList(text) {
  const value = String(text || '').trim();

  if (!value) {
    return 'इस सेवा के लिए दस्तावेज़ की जानकारी उपलब्ध नहीं है।';
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
  createServiceModal();

  const service = services.find(
    s => String(s.id) === String(id)
  );

  if (!service) {
    msg('Service उपलब्ध नहीं है');
    return;
  }

  activeService = service;

  document.getElementById('serviceModalIcon').textContent =
    service.icon || '🧩';

  document.getElementById('serviceModalCategory').textContent =
    service.category || 'Service';

  document.getElementById('serviceModalName').textContent =
    service.name;

  document.getElementById('serviceModalDescription').textContent =
    service.description || '';

  const price = Number(service.price || 0);

  const priceBox =
    document.getElementById('serviceModalPriceBox');

  if (price > 0) {
    priceBox.style.display = 'block';

    document.getElementById('serviceModalPrice').textContent =
      money(price);
  } else {
    priceBox.style.display = 'none';
  }

  document.getElementById('serviceModalDocuments').innerHTML =
    documentList(service.required_documents);

  document.getElementById('serviceModalInstructions').textContent =
    service.instructions ||
    'आवेदन से पहले सभी जानकारी और दस्तावेज़ जाँच लें।';

  document.getElementById('serviceDetailsBackdrop').style.display =
    'block';

  requestAnimationFrame(() => {
    document.getElementById('serviceDetailsBox').style.transform =
      'translateX(-50%) translateY(0)';
  });

  document.body.style.overflow = 'hidden';
}


function closeServiceDetails() {
  const box = document.getElementById('serviceDetailsBox');
  const backdrop = document.getElementById('serviceDetailsBackdrop');

  if (!box || !backdrop) return;

  box.style.transform =
    'translateX(-50%) translateY(110%)';

  setTimeout(() => {
    backdrop.style.display = 'none';
  }, 220);

  document.body.style.overflow = '';
}


function applySelectedService() {
  if (!activeService) return;

  const select = document.getElementById('serviceSelect');

  if (select) {
    select.value = activeService.id;
  }

  const name = activeService.name;

  closeServiceDetails();

  setTimeout(() => {
    document.getElementById('requestSection')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

    msg(name + ' selected');
  }, 250);
}


/* Existing service cards को popup से connect करें */

window.selectServiceById = function(id) {
  openServiceDetails(id);
};

window.selectServiceByName = function(name) {
  const service = services.find(
    s =>
      String(s.name).trim().toLowerCase() ===
      String(name).trim().toLowerCase()
  );

  if (!service) {
    msg('यह service अभी available नहीं है');
    return;
  }

  openServiceDetails(service.id);
};

window.openServiceDetails = openServiceDetails;
boot();
