const toast = document.getElementById('toast');
let tm;

function msg(t) {
  if (!toast) return;
  toast.textContent = t;
  toast.classList.add('show');
  clearTimeout(tm);
  tm = setTimeout(() => toast.classList.remove('show'), 2500);
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
let user = null;

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

  const who = document.getElementById('who');
  if (who) {
    who.textContent = user.email || 'Customer';
  }

  await loadServices();
  await loadOrders();
}

/* =========================
   LOGOUT
========================= */

const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await sb.auth.signOut();
    location.href = 'auth.html';
  };
}

/* =========================
   LOAD ACTIVE SERVICES
========================= */

async function loadServices() {
  const { data, error } = await sb
    .from('services')
    .select('id,name,active,sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    msg(error.message);
    return;
  }

  const services = data || [];

  const select = document.getElementById('serviceSelect');

  if (select) {
    select.innerHTML =
      '<option value="">Select service</option>' +
      services
        .map(
          s =>
            `<option value="${s.id}">${escapeHtml(s.name)}</option>`
        )
        .join('');
  }

  const serviceCount = document.getElementById('serviceCount');

  if (serviceCount) {
    serviceCount.textContent = services.length;
  }
}

/* =========================
   LOAD CUSTOMER ORDERS
========================= */

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
      created_at,
      services (
        name
      )
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
  const ordersList = document.getElementById('ordersList');

  if (orderCount) {
    orderCount.textContent = rows.length;
  }

  if (pendingCount) {
    pendingCount.textContent =
      rows.filter(x => x.status === 'pending').length;
  }

  if (doneCount) {
    doneCount.textContent =
      rows.filter(x => x.status === 'completed').length;
  }

  if (!ordersList) return;

  if (!rows.length) {
    ordersList.innerHTML = '<p>No orders yet.</p>';
    return;
  }

  ordersList.innerHTML = rows
    .map(order => {
      const serviceName =
        order.services?.name || 'Service';

      const status =
        order.status || 'pending';

      const date = order.created_at
        ? new Date(order.created_at).toLocaleString()
        : '';

      return `
        <div class="service-row">
          <div>
            <strong>${escapeHtml(serviceName)}</strong>
            <small>${escapeHtml(date)}</small>
          </div>

          <span class="status ${escapeHtml(status)}">
            ${escapeHtml(status)}
          </span>
        </div>
      `;
    })
    .join('');
}

/* =========================
   CREATE NEW ORDER
========================= */

const orderForm = document.getElementById('orderForm');

if (orderForm) {
  orderForm.onsubmit = async e => {
    e.preventDefault();

    if (!user) {
      msg('Please login again');
      return;
    }

    const serviceSelect =
      document.getElementById('serviceSelect');

    const orderNote =
      document.getElementById('orderNote');

    const service_id =
      serviceSelect?.value || '';

    const note =
      orderNote?.value.trim() || '';

    if (!service_id) {
      msg('Service चुनें');
      return;
    }

    const submitBtn =
      orderForm.querySelector('button[type="submit"]');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    const { error } = await sb
      .from('orders')
      .insert({
        user_id: user.id,
        service_id: service_id,
        note: note,
        status: 'pending'
      });

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Request';
    }

    if (error) {
      msg(error.message);
      return;
    }

    if (orderNote) {
      orderNote.value = '';
    }

    if (serviceSelect) {
      serviceSelect.value = '';
    }

    msg('Request submitted successfully');

    await loadOrders();
  };
}

/* =========================
   SECURITY / HTML ESCAPE
========================= */

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* =========================
   START DASHBOARD
========================= */

boot();
