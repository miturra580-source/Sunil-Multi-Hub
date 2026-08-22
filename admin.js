/* =========================================================
   SUNIL MULTI HUB - ADMIN PANEL
   Complete Admin JS
========================================================= */


/* =========================================================
   DOM REFERENCES
========================================================= */

const $ = id => document.getElementById(id);

const toast = $('toast');

const loggedIn = $('loggedIn');

const apiBadge = $('apiBadge');
const apiText = $('apiText');

const ordersCount = $('ordersCount');
const servicesCount = $('servicesCount');
const usersCount = $('usersCount');
const revenueCount = $('revenueCount');

const ordersWrap = $('ordersWrap');
const servicesWrap = $('servicesWrap');
const usersWrap = $('usersWrap');

const refreshBtn = $('refreshBtn');
const logoutBtn = $('logoutBtn');
const addServiceBtn = $('addServiceBtn');


/* ORDER MODAL */

const orderEditModal = $('orderEditModal');
const closeOrderModal = $('closeOrderModal');
const cancelOrderEdit = $('cancelOrderEdit');
const saveOrderEdit = $('saveOrderEdit');

const editOrderId = $('editOrderId');
const editOrderService = $('editOrderService');
const editOrderCustomer = $('editOrderCustomer');
const editOrderStatus = $('editOrderStatus');
const editOrderAmount = $('editOrderAmount');
const editOrderNote = $('editOrderNote');


/* SERVICE MODAL */

const serviceEditModal = $('serviceEditModal');
const closeServiceModal = $('closeServiceModal');
const cancelServiceEdit = $('cancelServiceEdit');
const saveServiceEdit = $('saveServiceEdit');

const editServiceId = $('editServiceId');
const serviceModalHeading = $('serviceModalHeading');

const editServiceName = $('editServiceName');
const editServicePrice = $('editServicePrice');
const editServiceIcon = $('editServiceIcon');
const editServiceCategory = $('editServiceCategory');
const editServiceSort = $('editServiceSort');

const editServiceDescription = $('editServiceDescription');
const editServiceDocuments = $('editServiceDocuments');
const editServiceInstructions = $('editServiceInstructions');
const editServiceActive = $('editServiceActive');


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let toastTimer = null;

let me = null;

let currentOrders = [];

let services = [];


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

  }, 2600);
}


function money(value) {

  return '₹' + Number(value || 0)
    .toLocaleString('en-IN');
}


function esc(value = '') {

  return String(value)
    .replace(/[&<>"']/g, character => ({

      '&': '&amp;',

      '<': '&lt;',

      '>': '&gt;',

      '"': '&quot;',

      "'": '&#39;'

    })[character]);
}


function formatDate(value) {

  if (!value) return '';

  try {

    return new Date(value)
      .toLocaleString('en-IN');

  } catch {

    return value;
  }
}


/* =========================================================
   SUPABASE
========================================================= */

function makeClient() {

  const config =
    window.SMH_CONFIG || {};

  const url =
    config.supabaseUrl;

  const key =
    config.supabaseAnonKey ||
    config.supabaseKey;

  if (!url || !key) {

    throw new Error(
      'Supabase config missing'
    );
  }

  if (
    !window.supabase ||
    !window.supabase.createClient
  ) {

    throw new Error(
      'Supabase library failed to load'
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


let sb;

try {

  sb = makeClient();

} catch (error) {

  console.error(error);

  if (apiBadge) {

    apiBadge.textContent =
      'Not Connected';

    apiBadge.className =
      'status pending';
  }

  if (apiText) {

    apiText.textContent =
      error.message;
  }
}


/* =========================================================
   API STATUS
========================================================= */

function setApi(ok, text = '') {

  if (apiBadge) {

    apiBadge.textContent =
      ok
        ? 'Connected'
        : 'Not Connected';

    apiBadge.className =
      'status ' +
      (
        ok
          ? 'completed'
          : 'pending'
      );
  }

  if (apiText) {

    apiText.textContent =
      text;
  }
}


/* =========================================================
   MODAL SETUP
========================================================= */

function setupModals() {

  /* ORDER */

  if (closeOrderModal) {

    closeOrderModal.onclick =
      closeOrder;
  }

  if (cancelOrderEdit) {

    cancelOrderEdit.onclick =
      closeOrder;
  }

  if (saveOrderEdit) {

    saveOrderEdit.onclick =
      saveOrder;
  }

  if (orderEditModal) {

    orderEditModal.onclick =
      event => {

        if (
          event.target ===
          orderEditModal
        ) {

          closeOrder();
        }
      };
  }


  /* SERVICE */

  if (closeServiceModal) {

    closeServiceModal.onclick =
      closeServiceEditor;
  }

  if (cancelServiceEdit) {

    cancelServiceEdit.onclick =
      closeServiceEditor;
  }

  if (saveServiceEdit) {

    saveServiceEdit.onclick =
      saveService;
  }

  if (serviceEditModal) {

    serviceEditModal.onclick =
      event => {

        if (
          event.target ===
          serviceEditModal
        ) {

          closeServiceEditor();
        }
      };
  }


  /* ADD SERVICE */

  if (addServiceBtn) {

    addServiceBtn.onclick =
      () => {

        openServiceEditor();
      };
  }


  /* REFRESH */

  if (refreshBtn) {

    refreshBtn.onclick =
      async () => {

        await loadAll();

        msg(
          'Data refreshed'
        );
      };
  }


  /* LOGOUT */

  if (logoutBtn) {

    logoutBtn.onclick =
      async () => {

        try {

          await sb.auth.signOut();

        } finally {

          location.href =
            'auth.html';
        }
      };
  }
}


/* =========================================================
   BOOT
========================================================= */

async function boot() {

  try {

    if (!sb) {

      throw new Error(
        'Supabase client unavailable'
      );
    }

    setApi(
      false,
      'Checking login...'
    );


    const {
      data,
      error
    } =
      await sb.auth.getSession();


    if (error) {

      throw error;
    }


    const session =
      data?.session;


    if (!session) {

      location.replace(
        'auth.html'
      );

      return;
    }


    me =
      session.user;


    const {
      data: profile,
      error: profileError
    } =
      await sb
        .from('profiles')
        .select(
          'id,email,full_name,role'
        )
        .eq(
          'id',
          me.id
        )
        .maybeSingle();


    if (profileError) {

      throw profileError;
    }


    if (
      !profile ||
      profile.role !== 'admin'
    ) {

      msg(
        'Admin access required'
      );

      setTimeout(
        () => {

          location.replace(
            'dashboard.html'
          );

        },
        700
      );

      return;
    }


    if (loggedIn) {

      loggedIn.textContent =
        `Logged in: ${
          profile.full_name ||
          profile.email ||
          me.email ||
          'Admin'
        }`;
    }


    setupModals();


    await loadAll();

  } catch (error) {

    console.error(
      'Admin boot error:',
      error
    );

    setApi(
      false,
      error.message ||
      'Admin loading failed'
    );

    msg(
      error.message ||
      'Admin loading failed'
    );
  }
}


/* =========================================================
   LOAD ALL
========================================================= */

async function loadAll() {

  if (!sb) return;


  if (refreshBtn) {

    refreshBtn.disabled =
      true;
  }


  try {

    await loadOrders();

    await loadServices();

    await loadUsers();


    setApi(
      true,
      'Connected to Supabase • Live data'
    );

  } catch (error) {

    console.error(
      'Load data error:',
      error
    );

    setApi(
      false,
      error.message ||
      'Failed to load data'
    );

    msg(
      error.message ||
      'Failed to load data'
    );

  } finally {

    if (refreshBtn) {

      refreshBtn.disabled =
        false;
    }
  }
}


/* =========================================================
   ORDERS
========================================================= */

async function loadOrders() {

  const {
    data,
    error
  } =
    await sb
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
      .order(
        'created_at',
        {
          ascending: false
        }
      );


  if (error) {

    throw error;
  }


  currentOrders =
    data || [];


  if (ordersCount) {

    ordersCount.textContent =
      currentOrders.length;
  }


  const revenue =
    currentOrders
      .filter(
        order =>
          order.status ===
          'completed'
      )
      .reduce(
        (
          total,
          order
        ) =>
          total +
          Number(
            order.amount || 0
          ),
        0
      );


  if (revenueCount) {

    revenueCount.textContent =
      money(revenue);
  }


  if (!ordersWrap) {

    return;
  }


  if (
    currentOrders.length === 0
  ) {

    ordersWrap.innerHTML =
      '<p>No orders yet.</p>';

    return;
  }


  ordersWrap.innerHTML =
    currentOrders
      .map(order => {

        const customer =
          order.profiles?.full_name ||
          order.profiles?.email ||
          'Customer';


        const phone =
          order.profiles?.phone ||
          '';


        const serviceName =
          order.services?.name ||
          'Service Request';


        const status =
          order.status ||
          'pending';


        return `

          <article class="admin-order-card">

            <div class="admin-order-top">

              <div>

                <strong>
                  ${esc(serviceName)}
                </strong>

                <small>
                  ${esc(customer)}
                  ${
                    phone
                      ? ' • ' +
                        esc(phone)
                      : ''
                  }
                </small>

                <small>
                  ${esc(
                    formatDate(
                      order.created_at
                    )
                  )}
                </small>

              </div>

              <span
                class="status ${esc(status)}">

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

                <small>
                  Amount
                </small>

                <div class="admin-order-amount">
                  ${money(order.amount)}
                </div>

              </div>


              <button
                type="button"
                class="btn primary edit-order"
                data-id="${esc(order.id)}">

                Edit Order

              </button>

            </div>

          </article>
        `;
      })
      .join('');


  document
    .querySelectorAll(
      '.edit-order'
    )
    .forEach(button => {

      button.onclick =
        () => {

          openOrder(
            button.dataset.id
          );
        };
    });
}


/* =========================================================
   OPEN ORDER
========================================================= */

function openOrder(id) {

  const order =
    currentOrders.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!order) {

    msg(
      'Order not found'
    );

    return;
  }


  if (!orderEditModal) {

    msg(
      'Order editor unavailable'
    );

    return;
  }


  if (editOrderId) {

    editOrderId.value =
      order.id;
  }


  if (editOrderService) {

    editOrderService.textContent =
      order.services?.name ||
      'Service Request';
  }


  if (editOrderCustomer) {

    const customer =
      order.profiles?.full_name ||
      order.profiles?.email ||
      'Customer';


    const phone =
      order.profiles?.phone;


    editOrderCustomer.textContent =
      customer +
      (
        phone
          ? ' • ' + phone
          : ''
      );
  }


  if (editOrderStatus) {

    editOrderStatus.value =
      order.status ||
      'pending';
  }


  if (editOrderAmount) {

    editOrderAmount.value =
      Number(
        order.amount || 0
      );
  }


  if (editOrderNote) {

    editOrderNote.value =
      order.note || '';
  }


  orderEditModal.classList.add(
    'show'
  );


  document.body.style.overflow =
    'hidden';
}


/* =========================================================
   SAVE ORDER
========================================================= */

async function saveOrder() {

  const id =
    editOrderId?.value;


  if (!id) {

    msg(
      'Order ID missing'
    );

    return;
  }


  const status =
    editOrderStatus?.value ||
    'pending';


  const amount =
    Number(
      editOrderAmount?.value ||
      0
    );


  if (saveOrderEdit) {

    saveOrderEdit.disabled =
      true;

    saveOrderEdit.textContent =
      'Saving...';
  }


  try {

    const {
      error
    } =
      await sb
        .from('orders')
        .update({

          status,

          amount,

          updated_at:
            new Date()
              .toISOString()

        })
        .eq(
          'id',
          id
        );


    if (error) {

      throw error;
    }


    closeOrder();


    msg(
      'Order updated'
    );


    await loadOrders();

  } catch (error) {

    console.error(
      error
    );

    msg(
      error.message
    );

  } finally {

    if (saveOrderEdit) {

      saveOrderEdit.disabled =
        false;

      saveOrderEdit.textContent =
        'Save Changes';
    }
  }
}


/* =========================================================
   CLOSE ORDER
========================================================= */

function closeOrder() {

  if (orderEditModal) {

    orderEditModal.classList.remove(
      'show'
    );
  }

  document.body.style.overflow =
    '';
}


/* =========================================================
   SERVICES
========================================================= */

async function loadServices() {

  const {
    data,
    error
  } =
    await sb
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
      .order(
        'sort_order',
        {
          ascending: true
        }
      );


  if (error) {

    throw error;
  }


  services =
    data || [];


  if (servicesCount) {

    servicesCount.textContent =
      services.length;
  }


  if (!servicesWrap) {

    return;
  }


  if (
    services.length === 0
  ) {

    servicesWrap.innerHTML =
      '<p>No services.</p>';

    return;
  }


  servicesWrap.innerHTML =
    services
      .map(service => `

        <div class="service-row">

          <div>

            <strong>
              ${esc(
                service.icon ||
                '🧩'
              )}
              ${esc(
                service.name
              )}
            </strong>


            <span class="service-admin-meta">

              ${esc(
                service.category ||
                'Other'
              )}

              •

              ${
                service.active
                  ? 'Active'
                  : 'Inactive'
              }

              •

              ${money(
                service.price
              )}

              •

              Sort
              ${Number(
                service.sort_order ||
                0
              )}

            </span>


            ${
              service.description
                ? `
                  <span class="service-admin-meta">
                    ${esc(
                      service.description
                    )}
                  </span>
                `
                : ''
            }

          </div>


          <div class="row-actions">

            <button
              type="button"
              class="btn secondary edit-service"
              data-id="${esc(service.id)}">

              Edit

            </button>


            <button
              type="button"
              class="btn secondary toggle-service"
              data-id="${esc(service.id)}">

              ${
                service.active
                  ? 'Disable'
                  : 'Enable'
              }

            </button>


            <button
              type="button"
              class="btn secondary delete-service"
              data-id="${esc(service.id)}">

              Delete

            </button>

          </div>

        </div>

      `)
      .join('');


  document
    .querySelectorAll(
      '.edit-service'
    )
    .forEach(button => {

      button.onclick =
        () => {

          openServiceEditor(
            button.dataset.id
          );
        };
    });


  document
    .querySelectorAll(
      '.toggle-service'
    )
    .forEach(button => {

      button.onclick =
        () => {

          toggleService(
            button.dataset.id
          );
        };
    });


  document
    .querySelectorAll(
      '.delete-service'
    )
    .forEach(button => {

      button.onclick =
        () => {

          deleteService(
            button.dataset.id
          );
        };
    });
}


/* =========================================================
   NEXT SORT ORDER
========================================================= */

function nextSort() {

  if (
    services.length === 0
  ) {

    return 10;
  }


  return (
    Math.max(
      ...services.map(
        service =>
          Number(
            service.sort_order ||
            0
          )
      )
    ) + 10
  );
}


/* =========================================================
   OPEN SERVICE EDITOR
========================================================= */

function openServiceEditor(
  id = null
) {

  if (!serviceEditModal) {

    msg(
      'Service editor unavailable'
    );

    return;
  }


  let service = null;


  if (id) {

    service =
      services.find(
        item =>
          String(item.id) ===
          String(id)
      );


    if (!service) {

      msg(
        'Service not found'
      );

      return;
    }
  }


  if (editServiceId) {

    editServiceId.value =
      service?.id ||
      '';
  }


  if (serviceModalHeading) {

    serviceModalHeading.textContent =
      service
        ? 'Edit Service'
        : 'Add Service';
  }


  if (editServiceName) {

    editServiceName.value =
      service?.name ||
      '';
  }


  if (editServicePrice) {

    editServicePrice.value =
      Number(
        service?.price ||
        0
      );
  }


  if (editServiceIcon) {

    editServiceIcon.value =
      service?.icon ||
      '🧩';
  }


  if (editServiceCategory) {

    editServiceCategory.value =
      service?.category ||
      'Other';
  }


  if (editServiceSort) {

    editServiceSort.value =
      service
        ? Number(
            service.sort_order ||
            0
          )
        : nextSort();
  }


  if (editServiceDescription) {

    editServiceDescription.value =
      service?.description ||
      '';
  }


  if (editServiceDocuments) {

    editServiceDocuments.value =
      service?.required_documents ||
      '';
  }


  if (editServiceInstructions) {

    editServiceInstructions.value =
      service?.instructions ||
      'आवेदन से पहले सभी जानकारी और दस्तावेज़ जाँच लें।';
  }


  if (editServiceActive) {

    editServiceActive.value =
      String(
        service?.active ??
        true
      );
  }


  serviceEditModal.classList.add(
    'show'
  );


  document.body.style.overflow =
    'hidden';
}


/* =========================================================
   SAVE SERVICE
========================================================= */

async function saveService() {

  const id =
    editServiceId?.value ||
    '';


  const payload = {

    name:
      editServiceName?.value
        .trim() ||
      '',

    price:
      Number(
        editServicePrice?.value ||
        0
      ),

    icon:
      editServiceIcon?.value
        .trim() ||
      '🧩',

    category:
      editServiceCategory?.value ||
      'Other',

    sort_order:
      Number(
        editServiceSort?.value ||
        0
      ),

    description:
      editServiceDescription?.value
        .trim() ||
      '',

    required_documents:
      editServiceDocuments?.value
        .trim() ||
      '',

    instructions:
      editServiceInstructions?.value
        .trim() ||
      '',

    active:
      editServiceActive?.value ===
      'true'
  };


  if (!payload.name) {

    msg(
      'Service name required'
    );

    return;
  }


  if (saveServiceEdit) {

    saveServiceEdit.disabled =
      true;

    saveServiceEdit.textContent =
      'Saving...';
  }


  try {

    let result;


    if (id) {

      result =
        await sb
          .from('services')
          .update(
            payload
          )
          .eq(
            'id',
            id
          );

    } else {

      result =
        await sb
          .from('services')
          .insert(
            payload
          );
    }


    if (result.error) {

      throw result.error;
    }


    closeServiceEditor();


    msg(
      id
        ? 'Service updated'
        : 'Service added'
    );


    await loadServices();

  } catch (error) {

    console.error(
      error
    );

    msg(
      error.message
    );

  } finally {

    if (saveServiceEdit) {

      saveServiceEdit.disabled =
        false;

      saveServiceEdit.textContent =
        'Save Service';
    }
  }
}


/* =========================================================
   TOGGLE SERVICE
========================================================= */

async function toggleService(id) {

  const service =
    services.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!service) {

    msg(
      'Service not found'
    );

    return;
  }


  try {

    const {
      error
    } =
      await sb
        .from('services')
        .update({

          active:
            !service.active

        })
        .eq(
          'id',
          id
        );


    if (error) {

      throw error;
    }


    msg(
      service.active
        ? 'Service disabled'
        : 'Service enabled'
    );


    await loadServices();

  } catch (error) {

    msg(
      error.message
    );
  }
}


/* =========================================================
   DELETE SERVICE
========================================================= */

async function deleteService(id) {

  const service =
    services.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!service) {

    return;
  }


  const confirmed =
    confirm(
      `Delete "${service.name}" service?`
    );


  if (!confirmed) {

    return;
  }


  try {

    const {
      error
    } =
      await sb
        .from('services')
        .delete()
        .eq(
          'id',
          id
        );


    if (error) {

      throw error;
    }


    msg(
      'Service deleted'
    );


    await loadServices();

  } catch (error) {

    msg(
      error.message
    );
  }
}


/* =========================================================
   CLOSE SERVICE EDITOR
========================================================= */

function closeServiceEditor() {

  if (serviceEditModal) {

    serviceEditModal.classList.remove(
      'show'
    );
  }


  document.body.style.overflow =
    '';
}


/* =========================================================
   USERS
========================================================= */

async function loadUsers() {

  const {
    data,
    error
  } =
    await sb
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        phone,
        role,
        created_at
      `)
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


  if (usersCount) {

    usersCount.textContent =
      rows.length;
  }


  if (!usersWrap) {

    return;
  }


  if (
    rows.length === 0
  ) {

    usersWrap.innerHTML =
      '<p>No users.</p>';

    return;
  }


  usersWrap.innerHTML =
    rows
      .map(user => `

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

              ${esc(
                user.email ||
                ''
              )}

              ${
                user.phone
                  ? ' • ' +
                    esc(
                      user.phone
                    )
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
              user.role ||
              'customer'
            )}

          </span>

        </div>

      `)
      .join('');
}


/* =========================================================
   GLOBAL JAVASCRIPT ERROR DISPLAY
========================================================= */

window.addEventListener(
  'error',
  event => {

    console.error(
      'JavaScript error:',
      event.error ||
      event.message
    );


    if (apiText) {

      apiText.textContent =
        'JavaScript Error: ' +
        (
          event.message ||
          'Unknown error'
        );
    }
  }
);


window.addEventListener(
  'unhandledrejection',
  event => {

    console.error(
      'Unhandled promise:',
      event.reason
    );


    if (apiText) {

      apiText.textContent =
        'Error: ' +
        (
          event.reason?.message ||
          event.reason ||
          'Unknown error'
        );
    }
  }
);


/* =========================================================
   START ADMIN
========================================================= */

boot();
