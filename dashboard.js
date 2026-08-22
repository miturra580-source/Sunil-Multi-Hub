const toast = document.getElementById('toast');

let tm;
let user = null;
let services = [];


/* =========================================
   BASIC HELPERS
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
  return String(value).replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]
  );
}


function money(value) {
  return '₹' + Number(value || 0).toLocaleString('en-IN');
}


function makeClient() {
  const cfg = window.SMH_CONFIG || {};

  const url = cfg.supabaseUrl;
  const key =
    cfg.supabaseAnonKey ||
    cfg.supabaseKey;

  if (!url || !key) {
    throw new Error('Supabase config missing');
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


/* =========================================
   START CUSTOMER PORTAL
========================================= */

async function boot() {

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

  const who =
    document.getElementById('who');

  if (who) {
    who.textContent =
      user.email || 'Customer';
  }

  await loadServices();
  await loadOrders();
}


/* =========================================
   LOGOUT
========================================= */

const logoutBtn =
  document.getElementById('logoutBtn');

if (logoutBtn) {

  logoutBtn.onclick = async () => {

    await sb.auth.signOut();

    location.href = 'auth.html';
  };
}


/* =========================================
   LOAD SERVICES FROM SUPABASE
========================================= */

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
      icon
    `)
    .eq('active', true)
    .order(
      'sort_order',
      { ascending: true }
    );

  if (error) {
    msg(error.message);
    return;
  }

  services = data || [];


  /* SERVICE COUNT */

  const serviceCount =
    document.getElementById(
      'serviceCount'
    );

  if (serviceCount) {
    serviceCount.textContent =
      services.length;
  }


  /* REQUEST DROPDOWN */

  const select =
    document.getElementById(
      'serviceSelect'
    );

  if (select) {

    select.innerHTML =
      '<option value="">Select service</option>' +

      services
        .map(service => {

          const price =
            Number(service.price || 0);

          return `
            <option value="${esc(service.id)}">
              ${esc(service.name)}
              ${
                price > 0
                  ? ' — ' + money(price)
                  : ''
              }
            </option>
          `;
        })
        .join('');
  }


  /* DYNAMIC CUSTOMER PORTAL CARDS */

  renderServiceSections();


  /* HOMEPAGE SELECTED SERVICE */

  const requestedService =
    localStorage.getItem(
      'smh-selected-service'
    );

  if (
    requestedService &&
    select
  ) {

    const match =
      services.find(
        s =>
          String(s.name)
            .trim()
            .toLowerCase() ===
          requestedService
            .trim()
            .toLowerCase()
      );

    if (match) {

      select.value =
        match.id;

      localStorage.removeItem(
        'smh-selected-service'
      );

      setTimeout(() => {

        document
          .getElementById(
            'requestSection'
          )
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });

      }, 300);

      msg(
        `${match.name} selected`
      );
    }
  }
}


/* =========================================
   CATEGORY HELPERS
========================================= */

function normalCategory(value) {

  const category =
    String(value || 'Other')
      .trim()
      .toLowerCase();

  if (
    category === 'popular'
  ) {
    return 'Popular';
  }

  if (
    category === 'government'
  ) {
    return 'Government';
  }

  if (
    category === 'print'
  ) {
    return 'Print';
  }

  return 'Other';
}


/* =========================================
   FIND PORTAL GRID BY HEADING
========================================= */

function getGridByHeading(
  headingText
) {

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
          .includes(headingText)
      );
    });

  return section
    ?.querySelector(
      '.portal-service-grid'
    );
}


/* =========================================
   BUILD SERVICE CARD
========================================= */

function serviceCard(service) {

  const price =
    Number(service.price || 0);

  const description =
    service.description ||
    'Online Service';

  return `
    <button
      type="button"
      class="portal-service-card"
      onclick="selectServiceById('${esc(service.id)}')"
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
            <span
              style="
                margin-top:7px;
                font-weight:800;
                color:#2855cc;
                font-size:13px;
              "
            >
              ${money(price)}
            </span>
          `
          : ''
      }

    </button>
  `;
}


/* =========================================
   STATIC ONLINE TOOL CARDS
========================================= */

function printToolCards() {

  return `

    <a
      class="portal-service-card"
      href="tools.html#passport"
    >
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
      href="tools.html#jpg-pdf"
    >
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
      href="tools.html#merge-pdf"
    >
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


    <a
      class="portal-service-card"
      href="tools.html#resize"
    >
      <span class="portal-service-icon">
        🖼️
      </span>

      <strong>
        Photo Resize
      </strong>

      <small>
        Resize / Compress
      </small>
    </a>
  `;
}


function otherToolCards() {

  return `

    <a
      class="portal-service-card"
      href="tools.html"
    >
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


/* =========================================
   RENDER DYNAMIC SERVICE SECTIONS
========================================= */

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


  const popular =
    services.filter(
      s =>
        normalCategory(
          s.category
        ) === 'Popular'
    );


  const government =
    services.filter(
      s =>
        normalCategory(
          s.category
        ) === 'Government'
    );


  const print =
    services.filter(
      s =>
        normalCategory(
          s.category
        ) === 'Print'
    );


  const other =
    services.filter(
      s =>
        normalCategory(
          s.category
        ) === 'Other'
    );


  if (popularGrid) {

    popularGrid.innerHTML =
      popular.length
        ? popular
            .map(serviceCard)
            .join('')
        : `
          <p>
            No services available.
          </p>
        `;
  }


  if (governmentGrid) {

    governmentGrid.innerHTML =
      government.length
        ? government
            .map(serviceCard)
            .join('')
        : `
          <p>
            No services available.
          </p>
        `;
  }


  if (printGrid) {

    printGrid.innerHTML =
      print
        .map(serviceCard)
        .join('') +
      printToolCards();
  }


  if (otherGrid) {

    otherGrid.innerHTML =
      other
        .map(serviceCard)
        .join('') +
      otherToolCards();
  }
}


/* =========================================
   SERVICE CARD CLICK
========================================= */

function selectServiceById(id) {

  const select =
    document.getElementById(
      'serviceSelect'
    );

  const service =
    services.find(
      s =>
        String(s.id) ===
        String(id)
    );

  if (
    !select ||
    !service
  ) {
    msg(
      'Service उपलब्ध नहीं है'
    );

    return;
  }

  select.value =
    service.id;

  document
    .getElementById(
      'requestSection'
    )
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

  const price =
    Number(
      service.price || 0
    );

  msg(
    price > 0
      ? `${service.name} • ${money(price)}`
      : `${service.name} selected`
  );
}


/*
  Compatibility:
  पुराने HTML onclick buttons भी
  काम करते रहेंगे.
*/

function selectServiceByName(name) {

  const service =
    services.find(
      s =>
        String(s.name)
          .trim()
          .toLowerCase() ===
        String(name)
          .trim()
          .toLowerCase()
    );

  if (!service) {

    msg(
      'यह service अभी available नहीं है'
    );

    return;
  }

  selectServiceById(
    service.id
  );
}


/* =========================================
   LOAD CUSTOMER ORDERS
========================================= */

async function loadOrders() {

  if (!user) return;

  const {
    data,
    error
  } = await sb
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
    .eq(
      'user_id',
      user.id
    )
    .order(
      'created_at',
      { ascending: false }
    );

  if (error) {

    msg(error.message);

    return;
  }

  const rows =
    data || [];


  const orderCount =
    document.getElementById(
      'orderCount'
    );

  const pendingCount =
    document.getElementById(
      'pendingCount'
    );

  const doneCount =
    document.getElementById(
      'doneCount'
    );


  if (orderCount) {

    orderCount.textContent =
      rows.length;
  }


  if (pendingCount) {

    pendingCount.textContent =
      rows.filter(
        order =>
          order.status ===
            'pending' ||
          order.status ===
            'processing'
      ).length;
  }


  if (doneCount) {

    doneCount.textContent =
      rows.filter(
        order =>
          order.status ===
          'completed'
      ).length;
  }


  const ordersList =
    document.getElementById(
      'ordersList'
    );


  if (!ordersList) return;


  if (!rows.length) {

    ordersList.innerHTML =
      '<p>अभी कोई आवेदन नहीं है।</p>';

    return;
  }


  ordersList.innerHTML =
    rows
      .map(order => {

        const serviceName =
          order.services?.name ||
          'Service';

        const status =
          order.status ||
          'pending';

        const date =
          new Date(
            order.created_at
          ).toLocaleString(
            'en-IN'
          );

        const amount =
          Number(
            order.amount || 0
          );

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
                  ? `
                    <small>
                      ${esc(order.note)}
                    </small>
                  `
                  : ''
              }

              ${
                amount > 0
                  ? `
                    <small>
                      Amount:
                      ${money(amount)}
                    </small>
                  `
                  : ''
              }

            </div>

            <span
              class="status ${esc(status)}"
            >
              ${esc(status)}
            </span>

          </div>
        `;
      })
      .join('');
}


/* =========================================
   SUBMIT SERVICE REQUEST
========================================= */

const orderForm =
  document.getElementById(
    'orderForm'
  );


if (orderForm) {

  orderForm.onsubmit =
    async event => {

      event.preventDefault();


      if (!user) {

        msg(
          'Please login again'
        );

        return;
      }


      const serviceSelect =
        document.getElementById(
          'serviceSelect'
        );


      const noteInput =
        document.getElementById(
          'orderNote'
        );


      const serviceId =
        serviceSelect?.value;


      if (!serviceId) {

        msg(
          'Service चुनें'
        );

        return;
      }


      const selectedService =
        services.find(
          s =>
            String(s.id) ===
            String(serviceId)
        );


      if (!selectedService) {

        msg(
          'Invalid service'
        );

        return;
      }


      const note =
        noteInput
          ?.value
          ?.trim() || '';


      const submitButton =
        orderForm.querySelector(
          'button[type="submit"]'
        );


      if (submitButton) {

        submitButton.disabled =
          true;

        submitButton.textContent =
          'Submitting...';
      }


      const {
        error
      } = await sb
        .from('orders')
        .insert({

          user_id:
            user.id,

          service_id:
            selectedService.id,

          note,

          status:
            'pending'
        });


      if (submitButton) {

        submitButton.disabled =
          false;

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


      localStorage.removeItem(
        'smh-selected-service'
      );


      msg(
        `${selectedService.name} request submitted`
      );


      await loadOrders();
    };
}


/* =========================================
   START
========================================= */

boot();
