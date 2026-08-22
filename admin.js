const toast = document.getElementById('toast');

let tm;
let me = null;
let services = [];
let currentOrders = [];

/* =========================
   HELPERS
========================= */

function msg(text) {
  if (!toast) return;

  toast.textContent = text;
  toast.classList.add('show');

  clearTimeout(tm);
  tm = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function money(value) {
  return '₹' + Number(value || 0).toLocaleString('en-IN');
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

function formatDate(value) {
  if (!value) return '';

  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
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


/* =========================
   BOOT
========================= */

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

  me = session.user;

  const {
    data: profile,
    error: pErr
  } = await sb
    .from('profiles')
    .select('id,email,full_name,role')
    .eq('id', me.id)
    .maybeSingle();

  if (pErr) {
    setApi(false, pErr.message);
    return;
  }

  if (profile?.role !== 'admin') {

    msg('Admin access required');

    setTimeout(() => {
      location.replace('dashboard.html');
    }, 900);

    return;
  }

  const loggedIn = document.getElementById('loggedIn');

  if (loggedIn) {
    loggedIn.textContent =
      `Logged in: ${profile.full_name || profile.email || me.email}`;
  }

  setApi(true, 'Connected to Supabase');

  setupOrderModal();

  await loadAll();
}


/* =========================
   API STATUS
========================= */

function setApi(ok, text) {

  const badge = document.getElementById('apiBadge');
  const apiText = document.getElementById('apiText');

  if (badge) {
    badge.textContent = ok ? 'Connected' : 'Not Connected';
    badge.className =
      'status ' + (ok ? 'completed' : 'pending');
  }

  if (apiText) {
    apiText.textContent = text || '';
  }
}


/* =========================
   LOAD ALL
========================= */

async function loadAll() {

  const refreshBtn =
    document.getElementById('refreshBtn');

  if (refreshBtn) {
    refreshBtn.disabled = true;
  }

  try {

    await Promise.all([
      loadOrders(),
      loadServices(),
      loadUsers()
    ]);

    setApi(
      true,
      'Connected to Supabase • Live data'
    );

  } catch (e) {

    console.error(e);

    setApi(false, e.message);
    msg(e.message);

  } finally {

    if (refreshBtn) {
      refreshBtn.disabled = false;
    }
  }
}


/* =========================
   ORDERS
========================= */

async function loadOrders() {

  const {
    data,
    error
  } = await sb
    .from('orders')
    .select(`
      id,
      user_id,
      service_id,
      note,
      status,
      amount,
      created_at,
      updated_at,
      profiles (
        full_name,
        email,
        phone
      ),
      services (
        name
      )
    `)
    .order('created_at', {
      ascending: false
    });

  if (error) {
    throw error;
  }

  currentOrders = data || [];

  const ordersCount =
    document.getElementById('ordersCount');

  const revenueCount =
    document.getElementById('revenueCount');

  const ordersWrap =
    document.getElementById('ordersWrap');

  if (ordersCount) {
    ordersCount.textContent =
      currentOrders.length;
  }

  if (revenueCount) {

    const revenue = currentOrders
      .filter(order =>
        order.status === 'completed'
      )
      .reduce(
        (total, order) =>
          total + Number(order.amount || 0),
        0
      );

    revenueCount.textContent =
      money(revenue);
  }

  if (!ordersWrap) return;

  if (!currentOrders.length) {

    ordersWrap.innerHTML =
      '<p>No orders yet.</p>';

    return;
  }

  ordersWrap.innerHTML =
    currentOrders.map(order => {

      const customer =
        order.profiles?.full_name ||
        order.profiles?.email ||
        'Customer';

      const service =
        order.services?.name ||
        'Service Request';

      const status =
        order.status || 'pending';

      return `
        <article class="admin-order-card">

          <div class="admin-order-top">

            <div>
              <strong>
                ${esc(service)}
              </strong>

              <small>
                ${esc(customer)}
                ${order.profiles?.phone
                  ? ' • ' + esc(order.profiles.phone)
                  : ''}
              </small>

              <small>
                ${esc(formatDate(order.created_at))}
              </small>
            </div>

            <span class="status ${esc(status)}">
              ${esc(status)}
            </span>

          </div>

          ${
            order.note
              ? `
                <div class="admin-order-note">
                  ${esc(order.note)}
                </div>
              `
              : ''
          }

          <div class="admin-order-bottom">

            <div>
              <small>Amount</small>

              <div class="admin-order-amount">
                ${money(order.amount)}
              </div>
            </div>

            <button
              type="button"
              class="btn primary edit-order-btn"
              data-id="${esc(order.id)}">
              Edit Order
            </button>

          </div>

        </article>
      `;

    }).join('');

  document
    .querySelectorAll('.edit-order-btn')
    .forEach(button => {

      button.onclick = () => {
        openOrderEditor(
          button.dataset.id
        );
      };

    });
}


/* =========================
   ORDER MODAL
========================= */

function setupOrderModal() {

  const modal =
    document.getElementById('orderEditModal');

  const closeBtn =
    document.getElementById('closeOrderModal');

  const cancelBtn =
    document.getElementById('cancelOrderEdit');

  const saveBtn =
    document.getElementById('saveOrderEdit');

  if (closeBtn) {
    closeBtn.onclick = closeOrderEditor;
  }

  if (cancelBtn) {
    cancelBtn.onclick = closeOrderEditor;
  }

  if (saveBtn) {
    saveBtn.onclick = saveOrderChanges;
  }

  if (modal) {

    modal.addEventListener(
      'click',
      event => {

        if (event.target === modal) {
          closeOrderEditor();
        }

      }
    );
  }
}

function openOrderEditor(id) {

  const order =
    currentOrders.find(
      item =>
        String(item.id) === String(id)
    );

  if (!order) {
    msg('Order not found');
    return;
  }

  const modal =
    document.getElementById('orderEditModal');

  const service =
    document.getElementById('editOrderService');

  const customer =
    document.getElementById('editOrderCustomer');

  const idInput =
    document.getElementById('editOrderId');

  const status =
    document.getElementById('editOrderStatus');

  const amount =
    document.getElementById('editOrderAmount');

  const note =
    document.getElementById('editOrderNote');

  if (service) {
    service.textContent =
      order.services?.name ||
      'Service Request';
  }

  if (customer) {

    const customerName =
      order.profiles?.full_name ||
      order.profiles?.email ||
      'Customer';

    customer.textContent =
      customerName +
      (order.profiles?.phone
        ? ' • ' + order.profiles.phone
        : '');
  }

  if (idInput) {
    idInput.value = order.id;
  }

  if (status) {
    status.value =
      order.status || 'pending';
  }

  if (amount) {
    amount.value =
      Number(order.amount || 0);
  }

  if (note) {
    note.value =
      order.note || '';
  }

  if (modal) {
    modal.classList.add('show');
  }

  document.body.style.overflow = 'hidden';
}

function closeOrderEditor() {

  const modal =
    document.getElementById('orderEditModal');

  if (modal) {
    modal.classList.remove('show');
  }

  document.body.style.overflow = '';
}

async function saveOrderChanges() {

  const id =
    document.getElementById(
      'editOrderId'
    )?.value;

  const status =
    document.getElementById(
      'editOrderStatus'
    )?.value;

  const amount =
    Number(
      document.getElementById(
        'editOrderAmount'
      )?.value || 0
    );

  const saveBtn =
    document.getElementById(
      'saveOrderEdit'
    );

  if (!id) {
    msg('Order ID missing');
    return;
  }

  if (saveBtn) {

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
  }

  try {

    const {
      error
    } = await sb
      .from('orders')
      .update({
        status,
        amount,
        updated_at:
          new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    closeOrderEditor();

    msg('Order updated successfully');

    await loadOrders();

  } catch (error) {

    console.error(error);
    msg(error.message);

  } finally {

    if (saveBtn) {

      saveBtn.disabled = false;
      saveBtn.textContent =
        'Save Changes';
    }
  }
}


/* =========================
   SERVICES
========================= */

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
      sort_order
    `)
    .order('sort_order', {
      ascending: true
    });

  if (error) {
    throw error;
  }

  services = data || [];

  const servicesCount =
    document.getElementById(
      'servicesCount'
    );

  const servicesWrap =
    document.getElementById(
      'servicesWrap'
    );

  if (servicesCount) {
    servicesCount.textContent =
      services.length;
  }

  if (!servicesWrap) return;

  if (!services.length) {

    servicesWrap.innerHTML =
      '<p>No services.</p>';

    return;
  }

  servicesWrap.innerHTML =
    services.map(service => `

      <div
        class="service-row"
        data-service="${esc(service.id)}">

        <div>

          <strong>
            ${esc(service.name)}
          </strong>

          <small>
            ${service.active
              ? 'Active'
              : 'Inactive'}
            • ${money(service.price)}
            • Sort ${Number(
              service.sort_order || 0
            )}
          </small>

          ${
            service.description
              ? `
                <p>
                  ${esc(service.description)}
                </p>
              `
              : ''
          }

        </div>

        <div class="row-actions">

          <button
            class="btn secondary edit-service">
            Edit
          </button>

          <button
            class="btn secondary toggle-service">
            ${service.active
              ? 'Disable'
              : 'Enable'}
          </button>

          <button
            class="btn secondary delete-service">
            Delete
          </button>

        </div>

      </div>

    `).join('');


  document
    .querySelectorAll('.edit-service')
    .forEach(button => {

      button.onclick = () => {

        const id =
          button
            .closest('[data-service]')
            .dataset.service;

        editService(id);
      };

    });


  document
    .querySelectorAll('.toggle-service')
    .forEach(button => {

      button.onclick =
        async () => {

          const id =
            button
              .closest('[data-service]')
              .dataset.service;

          const service =
            services.find(
              item =>
                String(item.id) ===
                String(id)
            );

          if (!service) return;

          const {
            error
          } = await sb
            .from('services')
            .update({
              active: !service.active
            })
            .eq('id', id);

          if (error) {
            msg(error.message);
            return;
          }

          msg('Service updated');

          await loadServices();
        };

    });


  document
    .querySelectorAll('.delete-service')
    .forEach(button => {

      button.onclick =
        async () => {

          const id =
            button
              .closest('[data-service]')
              .dataset.service;

          if (
            !confirm(
              'Delete this service?'
            )
          ) {
            return;
          }

          const {
            error
          } = await sb
            .from('services')
            .delete()
            .eq('id', id);

          if (error) {
            msg(error.message);
            return;
          }

          msg('Service deleted');

          await loadServices();
        };

    });
}


/* =========================
   EDIT SERVICE
========================= */

async function editService(id) {

  const service =
    services.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!service) {
    msg('Service not found');
    return;
  }

  const name =
    prompt(
      'Service name',
      service.name
    );

  if (name === null) return;

  const price =
    prompt(
      'Price',
      String(service.price || 0)
    );

  if (price === null) return;

  const description =
    prompt(
      'Description',
      service.description || ''
    );

  if (description === null) return;

  const {
    error
  } = await sb
    .from('services')
    .update({
      name: name.trim(),
      price: Number(price || 0),
      description:
        description.trim()
    })
    .eq('id', id);

  if (error) {
    msg(error.message);
    return;
  }

  msg('Service saved');

  await loadServices();
}


/* =========================
   ADD SERVICE
========================= */

const addServiceBtn =
  document.getElementById(
    'addServiceBtn'
  );

if (addServiceBtn) {

  addServiceBtn.onclick =
    async () => {

      const name =
        prompt(
          'New service name'
        );

      if (!name?.trim()) return;

      const price =
        prompt(
          'Price',
          '0'
        );

      if (price === null) return;

      const description =
        prompt(
          'Description',
          ''
        ) ?? '';

      const {
        data: maxRows,
        error: maxError
      } = await sb
        .from('services')
        .select('sort_order')
        .order('sort_order', {
          ascending: false
        })
        .limit(1);

      if (maxError) {
        msg(maxError.message);
        return;
      }

      const sort_order =
        Number(
          maxRows?.[0]?.sort_order || 0
        ) + 10;

      const {
        error
      } = await sb
        .from('services')
        .insert({
          name: name.trim(),
          price: Number(price || 0),
          description:
            description.trim(),
          active: true,
          sort_order
        });

      if (error) {
        msg(error.message);
        return;
      }

      msg('Service added');

      await loadServices();
    };
}


/* =========================
   USERS
========================= */

async function loadUsers() {

  const {
    data,
    error
  } = await sb
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      role,
      created_at
    `)
    .order('created_at', {
      ascending: false
    });

  if (error) {
    throw error;
  }

  const rows = data || [];

  const usersCount =
    document.getElementById(
      'usersCount'
    );

  const usersWrap =
    document.getElementById(
      'usersWrap'
    );

  if (usersCount) {
    usersCount.textContent =
      rows.length;
  }

  if (!usersWrap) return;

  if (!rows.length) {

    usersWrap.innerHTML =
      '<p>No users.</p>';

    return;
  }

  usersWrap.innerHTML =
    rows.map(user => `

      <div class="service-row">

        <div>

          <strong>
            ${esc(
              user.full_name ||
              user.email ||
              'User'
            )}
          </strong>

          <small>
            ${esc(user.email || '')}

            ${
              user.phone
                ? ' • ' +
                  esc(user.phone)
                : ''
            }
          </small>

        </div>

        <span
          class="status ${
            user.role === 'admin'
              ? 'completed'
              : 'pending'
          }">

          ${esc(
            user.role || 'customer'
          )}

        </span>

      </div>

    `).join('');
}


/* =========================
   BUTTONS
========================= */

const refreshBtn =
  document.getElementById(
    'refreshBtn'
  );

if (refreshBtn) {
  refreshBtn.onclick = loadAll;
}


const logoutBtn =
  document.getElementById(
    'logoutBtn'
  );

if (logoutBtn) {

  logoutBtn.onclick =
    async () => {

      await sb.auth.signOut();

      location.href =
        'auth.html';
    };
}


/* =========================
   START
========================= */

boot();
