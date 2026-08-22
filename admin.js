const toast = document.getElementById('toast');
let tm;

function msg(t) {
  if (!toast) return;
  toast.textContent = t;
  toast.classList.add('show');
  clearTimeout(tm);
  tm = setTimeout(() => toast.classList.remove('show'), 2500);
}

function money(v) {
  return '₹' + Number(v || 0).toLocaleString('en-IN');
}

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
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
let me = null;

async function boot() {
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    location.replace('auth.html');
    return;
  }

  me = session.user;

  const { data: profile, error: pErr } = await sb
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
    setTimeout(() => location.replace('dashboard.html'), 900);
    return;
  }

  loggedIn.textContent =
    `Logged in: ${profile.full_name || profile.email || me.email}`;

  setApi(true, 'Connected to Supabase');
  await loadAll();
}

function setApi(ok, text) {
  apiBadge.textContent = ok ? 'Connected' : 'Not Connected';
  apiBadge.className = 'status ' + (ok ? 'completed' : 'pending');
  apiText.textContent = text || '';
}

async function loadAll() {
  refreshBtn.disabled = true;

  try {
    await Promise.all([
      loadOrders(),
      loadServices(),
      loadUsers()
    ]);

    setApi(true, 'Connected to Supabase • Live data');
  } catch (e) {
    setApi(false, e.message);
    msg(e.message);
  } finally {
    refreshBtn.disabled = false;
  }
}


/* =========================
   ORDERS
========================= */

async function loadOrders() {
  const { data, error } = await sb
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
      profiles(full_name,email,phone),
      services(name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = data || [];

  ordersCount.textContent = rows.length;

  revenueCount.textContent = money(
    rows
      .filter(x => x.status === 'completed')
      .reduce((a, b) => a + Number(b.amount || 0), 0)
  );

  ordersWrap.innerHTML = rows.length
    ? rows.map(o => `
      <div class="order-row" data-order="${o.id}">
        <div class="order-main">
          <strong>${esc(o.services?.name || 'Service')}</strong>

          <small>
            ${esc(o.profiles?.full_name || o.profiles?.email || 'Customer')}
            •
            ${new Date(o.created_at).toLocaleString()}
          </small>

          ${o.note ? `<p>${esc(o.note)}</p>` : ''}
        </div>

        <div class="order-controls">
          <select class="order-status">
            ${
              ['pending', 'processing', 'completed', 'cancelled']
                .map(s =>
                  `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
                )
                .join('')
            }
          </select>

          <input
            class="order-amount"
            type="number"
            min="0"
            step="0.01"
            value="${Number(o.amount || 0)}"
            placeholder="Amount"
          >

          <button class="btn secondary save-order">
            Save
          </button>
        </div>
      </div>
    `).join('')
    : '<p>No orders yet.</p>';

  document.querySelectorAll('.save-order').forEach(btn => {
    btn.onclick = async () => {
      const row = btn.closest('[data-order]');
      const id = row.dataset.order;

      const status = row.querySelector('.order-status').value;
      const amount = Number(row.querySelector('.order-amount').value || 0);

      btn.disabled = true;

      const { error } = await sb
        .from('orders')
        .update({
          status,
          amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      btn.disabled = false;

      if (error) {
        msg(error.message);
        return;
      }

      msg('Order updated');
      await loadOrders();
    };
  });
}


/* =========================
   SERVICES
========================= */

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
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const rows = data || [];

  servicesCount.textContent = rows.length;

  servicesWrap.innerHTML = rows.length
    ? rows.map(s => `
      <div class="service-row" data-service="${s.id}">
        <div>
          <strong>
            ${esc(s.icon || '🧩')}
            ${esc(s.name)}
          </strong>

          <small>
            ${esc(s.category || 'Other')}
            •
            ${s.active ? 'Active' : 'Inactive'}
            •
            ${money(s.price)}
            •
            Sort ${Number(s.sort_order || 0)}
          </small>

          ${
            s.description
              ? `<small>${esc(s.description)}</small>`
              : ''
          }
        </div>

        <div class="row-actions">
          <button class="btn secondary edit-service">
            Edit
          </button>

          <button class="btn secondary toggle-service">
            ${s.active ? 'Disable' : 'Enable'}
          </button>

          <button class="btn secondary delete-service">
            Delete
          </button>
        </div>
      </div>
    `).join('')
    : '<p>No services.</p>';

  document.querySelectorAll('.edit-service').forEach(btn => {
    btn.onclick = () => {
      const id = btn.closest('[data-service]').dataset.service;
      editService(id, rows);
    };
  });

  document.querySelectorAll('.toggle-service').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.closest('[data-service]').dataset.service;
      const service = rows.find(x => x.id === id);

      if (!service) return;

      const { error } = await sb
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

  document.querySelectorAll('.delete-service').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.closest('[data-service]').dataset.service;

      if (!confirm('Delete this service?')) return;

      const { error } = await sb
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

async function editService(id, rows) {
  const s = rows.find(x => x.id === id);

  if (!s) return;

  const name = prompt('Service name', s.name || '');
  if (name === null) return;

  const price = prompt('Price', String(s.price || 0));
  if (price === null) return;

  const category = prompt(
    'Category: Popular / Government / Print / Other',
    s.category || 'Other'
  );
  if (category === null) return;

  const icon = prompt(
    'Icon / Emoji',
    s.icon || '🧩'
  );
  if (icon === null) return;

  const sortOrder = prompt(
    'Sort order',
    String(s.sort_order || 0)
  );
  if (sortOrder === null) return;

  const description = prompt(
    'Short description',
    s.description || ''
  );
  if (description === null) return;

  const requiredDocuments = prompt(
    'Required documents — हर document नई line में लिखें',
    s.required_documents || ''
  );
  if (requiredDocuments === null) return;

  const instructions = prompt(
    'Instructions / Important information',
    s.instructions || ''
  );
  if (instructions === null) return;

  const { error } = await sb
    .from('services')
    .update({
      name: name.trim(),
      price: Number(price || 0),
      category: category.trim() || 'Other',
      icon: icon.trim() || '🧩',
      sort_order: Number(sortOrder || 0),
      description: description.trim(),
      required_documents: requiredDocuments.trim(),
      instructions: instructions.trim()
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

addServiceBtn.onclick = async () => {
  const name = prompt('New service name');
  if (!name?.trim()) return;

  const price = prompt('Price', '0');
  if (price === null) return;

  const category = prompt(
    'Category: Popular / Government / Print / Other',
    'Other'
  );
  if (category === null) return;

  const icon = prompt(
    'Icon / Emoji',
    '🧩'
  );
  if (icon === null) return;

  const description = prompt(
    'Short description',
    ''
  ) ?? '';

  const requiredDocuments = prompt(
    'Required documents — हर document नई line में लिखें',
    ''
  ) ?? '';

  const instructions = prompt(
    'Instructions / Important information',
    'आवेदन से पहले सभी जानकारी और दस्तावेज़ जाँच लें।'
  ) ?? '';

  const { data: maxRows } = await sb
    .from('services')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  const sort_order =
    (maxRows?.[0]?.sort_order || 0) + 10;

  const { error } = await sb
    .from('services')
    .insert({
      name: name.trim(),
      price: Number(price || 0),
      description: description.trim(),
      active: true,
      sort_order,
      category: category.trim() || 'Other',
      icon: icon.trim() || '🧩',
      required_documents: requiredDocuments.trim(),
      instructions: instructions.trim()
    });

  if (error) {
    msg(error.message);
    return;
  }

  msg('Service added');
  await loadServices();
};


/* =========================
   USERS
========================= */

async function loadUsers() {
  const { data, error } = await sb
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      role,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = data || [];

  usersCount.textContent = rows.length;

  usersWrap.innerHTML = rows.length
    ? rows.map(u => `
      <div class="service-row">
        <div>
          <strong>
            ${esc(u.full_name || u.email || 'User')}
          </strong>

          <small>
            ${esc(u.email || '')}
            ${u.phone ? ' • ' + esc(u.phone) : ''}
          </small>
        </div>

        <span class="status ${
          u.role === 'admin'
            ? 'completed'
            : 'pending'
        }">
          ${esc(u.role || 'customer')}
        </span>
      </div>
    `).join('')
    : '<p>No users.</p>';
}


/* =========================
   ACTIONS
========================= */

refreshBtn.onclick = loadAll;

logoutBtn.onclick = async () => {
  await sb.auth.signOut();
  location.href = 'auth.html';
};

boot();
