/* =========================================================
   SUNIL MULTI HUB
   COMPLETE ADMIN PANEL
========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   DOM
========================================================= */

const toast = $('toast');

const loggedIn = $('loggedIn');

const apiBadge = $('apiBadge');
const apiText = $('apiText');

const applicationsCount = $('applicationsCount');
const ordersCount = $('ordersCount');
const servicesCount = $('servicesCount');
const usersCount = $('usersCount');
const revenueCount = $('revenueCount');

const applicationsWrap = $('applicationsWrap');
const ordersWrap = $('ordersWrap');
const servicesWrap = $('servicesWrap');
const usersWrap = $('usersWrap');

const refreshBtn = $('refreshBtn');
const logoutBtn = $('logoutBtn');
const addServiceBtn = $('addServiceBtn');


/* APPLICATION MODAL */

const applicationViewModal = $('applicationViewModal');
const closeApplicationModal = $('closeApplicationModal');

const viewApplicationId = $('viewApplicationId');
const viewApplicationService = $('viewApplicationService');
const viewApplicationMeta = $('viewApplicationMeta');

const viewApplicationFields = $('viewApplicationFields');

const viewAadhaarStatus = $('viewAadhaarStatus');
const viewAadhaarDetails = $('viewAadhaarDetails');

const viewApplicationDocuments = $('viewApplicationDocuments');

const viewApplicationStatus = $('viewApplicationStatus');
const viewApplicationAmount = $('viewApplicationAmount');
const viewApplicationReference = $('viewApplicationReference');
const viewApplicationAdminNote = $('viewApplicationAdminNote');

const saveApplicationChanges = $('saveApplicationChanges');

const applicationOutputType = $('applicationOutputType');
const applicationOutputTitle = $('applicationOutputTitle');
const applicationOutputReference = $('applicationOutputReference');
const applicationOutputFile = $('applicationOutputFile');
const applicationOutputUrl = $('applicationOutputUrl');

const uploadApplicationOutput = $('uploadApplicationOutput');
const applicationOutputsList = $('applicationOutputsList');


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
const editServiceProcessingMode = $('editServiceProcessingMode');

const editServiceDescription = $('editServiceDescription');
const editServiceDocuments = $('editServiceDocuments');
const editServiceInstructions = $('editServiceInstructions');
const editServiceActive = $('editServiceActive');


/* =========================================================
   STATE
========================================================= */

let tm = null;

let me = null;

let currentApplications = [];
let currentOrders = [];
let services = [];
let users = [];


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

  clearTimeout(tm);

  tm = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}


function esc(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}


function money(value) {
  return '₹' + Number(value || 0).toLocaleString('en-IN');
}


function formatDate(value) {
  if (!value) return '';

  try {
    return new Date(value).toLocaleString('en-IN');
  } catch {
    return String(value);
  }
}


function safeFileName(name = 'file') {
  return String(name)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-120);
}


function prettyKey(key = '') {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}


/* =========================================================
   SUPABASE
========================================================= */

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
   STATUS
========================================================= */

function setApi(ok, text = '') {
  if (apiBadge) {
    apiBadge.textContent =
      ok ? 'Connected' : 'Not Connected';

    apiBadge.className =
      'status ' + (ok ? 'completed' : 'pending');
  }

  if (apiText) {
    apiText.textContent = text;
  }
}


/* =========================================================
   BOOT
========================================================= */

async function boot() {
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

    me = session.user;

    const {
      data: profile,
      error: profileError
    } = await sb
      .from('profiles')
      .select('id,email,full_name,role')
      .eq('id', me.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profile?.role !== 'admin') {
      msg('Admin access required');

      setTimeout(() => {
        location.replace('dashboard.html');
      }, 700);

      return;
    }

    if (loggedIn) {
      loggedIn.textContent =
        `Logged in: ${
          profile.full_name ||
          profile.email ||
          me.email
        }`;
    }

    setupActions();

    await loadAll();

  } catch (error) {
    console.error(error);

    setApi(
      false,
      error.message || 'Admin loading failed'
    );

    msg(
      error.message || 'Admin loading failed'
    );
  }
}


/* =========================================================
   ACTION SETUP
========================================================= */

function setupActions() {
  if (refreshBtn) {
    refreshBtn.onclick = async () => {
      await loadAll();
      msg('Data refreshed');
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await sb.auth.signOut();
      location.href = 'auth.html';
    };
  }


  /* APPLICATION */

  if (closeApplicationModal) {
    closeApplicationModal.onclick =
      closeApplicationViewer;
  }

  if (applicationViewModal) {
    applicationViewModal.onclick = event => {
      if (event.target === applicationViewModal) {
        closeApplicationViewer();
      }
    };
  }

  if (saveApplicationChanges) {
    saveApplicationChanges.onclick =
      saveCurrentApplication;
  }

  if (uploadApplicationOutput) {
    uploadApplicationOutput.onclick =
      addApplicationOutput;
  }


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
    orderEditModal.onclick = event => {
      if (event.target === orderEditModal) {
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
    serviceEditModal.onclick = event => {
      if (event.target === serviceEditModal) {
        closeServiceEditor();
      }
    };
  }

  if (addServiceBtn) {
    addServiceBtn.onclick =
      () => openServiceEditor();
  }
}


/* =========================================================
   LOAD ALL
========================================================= */

async function loadAll() {
  if (refreshBtn) {
    refreshBtn.disabled = true;
  }

  try {
    await loadApplications();
    await loadOrders();
    await loadServices();
    await loadUsers();

    updateRevenue();

    setApi(
      true,
      'Connected to Supabase • Live data'
    );

  } catch (error) {
    console.error(error);

    setApi(
      false,
      error.message || 'Data loading failed'
    );

    msg(
      error.message || 'Data loading failed'
    );

  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
    }
  }
}


/* =========================================================
   REVENUE
========================================================= */

function updateRevenue() {
  const applicationRevenue =
    currentApplications
      .filter(
        item => item.status === 'completed'
      )
      .reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0
      );

  const oldOrderRevenue =
    currentOrders
      .filter(
        item => item.status === 'completed'
      )
      .reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0
      );

  if (revenueCount) {
    revenueCount.textContent =
      money(applicationRevenue + oldOrderRevenue);
  }
}


/* =========================================================
   APPLICATIONS
========================================================= */

async function loadApplications() {
  const {
    data,
    error
  } = await sb
    .from('applications')
    .select(`
      id,
      application_no,
      user_id,
      service_id,
      status,
      processing_mode,
      beneficiary_name,
      form_data,
      amount,
      external_reference_no,
      admin_note,
      submitted_at,
      updated_at,
      aadhaar_verification_status,
      aadhaar_verification_provider,
      aadhaar_verified_at,
      aadhaar_last4,
      demographic_match_result,
      services (
        name
      ),
      application_documents (
        id,
        service_document_id,
        document_name,
        storage_path,
        original_file_name,
        mime_type,
        file_size,
        created_at
      ),
      application_outputs (
        id,
        output_type,
        title,
        storage_path,
        external_url,
        reference_no,
        created_at
      )
    `)
    .neq('status', 'draft')
    .order('submitted_at', {
      ascending: false
    });

  if (error) throw error;

  currentApplications =
    data || [];

  if (applicationsCount) {
    applicationsCount.textContent =
      currentApplications.length;
  }

  if (!applicationsWrap) return;

  if (!currentApplications.length) {
    applicationsWrap.innerHTML =
      '<p>No applications yet.</p>';

    return;
  }

  applicationsWrap.innerHTML =
    currentApplications.map(application => {

      const verification =
        application.aadhaar_verification_status ||
        'not_checked';

      return `
        <article class="admin-application-card">

          <div class="admin-application-top">

            <div>

              <strong>
                ${esc(
                  application.services?.name ||
                  'Application'
                )}
              </strong>

              <small>
                Application ID:
                ${esc(
                  application.application_no ||
                  application.id
                )}
              </small>

              ${
                application.beneficiary_name
                  ? `
                    <small>
                      Beneficiary:
                      ${esc(application.beneficiary_name)}
                    </small>
                  `
                  : ''
              }

              <small>
                ${esc(formatDate(application.submitted_at))}
              </small>

              <small>
                Mode:
                ${esc(
                  application.processing_mode ||
                  'admin'
                )}
              </small>

              ${
                verification !== 'not_checked'
                  ? `
                    <small>
                      Aadhaar:
                      ${esc(verification)}
                    </small>
                  `
                  : ''
              }

            </div>

            <span
              class="status ${esc(application.status)}">
              ${esc(application.status)}
            </span>

          </div>


          <div class="admin-application-bottom">

            <div>
              <small>Amount</small>

              <div class="admin-application-amount">
                ${money(application.amount)}
              </div>
            </div>

            <button
              type="button"
              class="btn primary view-application-btn"
              data-id="${esc(application.id)}">

              View Application

            </button>

          </div>

        </article>
      `;
    }).join('');


  document
    .querySelectorAll('.view-application-btn')
    .forEach(button => {

      button.onclick =
        () => openApplicationViewer(
          button.dataset.id
        );
    });
}


/* =========================================================
   APPLICATION VIEWER
========================================================= */

function openApplicationViewer(id) {
  const application =
    currentApplications.find(
      item =>
        String(item.id) === String(id)
    );

  if (!application) {
    msg('Application not found');
    return;
  }

  if (viewApplicationId) {
    viewApplicationId.value =
      application.id;
  }

  if (viewApplicationService) {
    viewApplicationService.textContent =
      application.services?.name ||
      'Application';
  }

  if (viewApplicationMeta) {
    viewApplicationMeta.textContent =
      `${
        application.application_no ||
        application.id
      } • ${
        application.beneficiary_name ||
        'Beneficiary'
      }`;
  }

  renderApplicationFormData(application);
  renderAadhaarDetails(application);
  renderApplicationDocuments(application);
  renderApplicationOutputs(application);

  if (viewApplicationStatus) {
    viewApplicationStatus.value =
      application.status || 'pending';
  }

  if (viewApplicationAmount) {
    viewApplicationAmount.value =
      Number(application.amount || 0);
  }

  if (viewApplicationReference) {
    viewApplicationReference.value =
      application.external_reference_no || '';
  }

  if (viewApplicationAdminNote) {
    viewApplicationAdminNote.value =
      application.admin_note || '';
  }

  applicationViewModal?.classList.add('show');

  document.body.style.overflow =
    'hidden';
}


function closeApplicationViewer() {
  applicationViewModal?.classList.remove('show');

  document.body.style.overflow =
    '';
}


/* =========================================================
   FORM DATA DISPLAY
========================================================= */

function renderApplicationFormData(application) {
  const formData =
    application.form_data || {};

  if (!viewApplicationFields) return;

  const entries =
    Object.entries(formData);

  if (!entries.length) {
    viewApplicationFields.innerHTML =
      '<p>No beneficiary data.</p>';

    return;
  }

  viewApplicationFields.innerHTML =
    entries.map(([key, value]) => {

      let displayValue = value;

      if (
        typeof value === 'object' &&
        value !== null
      ) {
        displayValue =
          JSON.stringify(value);
      }

      return `
        <div class="application-field-row">

          <span>
            ${esc(prettyKey(key))}
          </span>

          <strong>
            ${esc(displayValue ?? '')}
          </strong>

        </div>
      `;
    }).join('');
}


/* =========================================================
   AADHAAR STATUS
========================================================= */

function renderAadhaarDetails(application) {
  const status =
    application.aadhaar_verification_status ||
    'not_checked';

  if (viewAadhaarStatus) {
    viewAadhaarStatus.textContent =
      prettyKey(status);

    viewAadhaarStatus.className =
      `verify-badge ${esc(status)}`;
  }

  if (!viewAadhaarDetails) return;

  const details = [];

  if (application.aadhaar_last4) {
    details.push(`
      <div class="application-field-row">
        <span>Aadhaar</span>
        <strong>
          XXXX-XXXX-${esc(application.aadhaar_last4)}
        </strong>
      </div>
    `);
  }

  if (application.aadhaar_verification_provider) {
    details.push(`
      <div class="application-field-row">
        <span>Provider</span>
        <strong>
          ${esc(application.aadhaar_verification_provider)}
        </strong>
      </div>
    `);
  }

  if (application.aadhaar_verified_at) {
    details.push(`
      <div class="application-field-row">
        <span>Verified At</span>
        <strong>
          ${esc(formatDate(application.aadhaar_verified_at))}
        </strong>
      </div>
    `);
  }

  viewAadhaarDetails.innerHTML =
    details.join('') ||
    '<p>No verification details.</p>';
}


/* =========================================================
   APPLICATION DOCUMENTS
========================================================= */

function renderApplicationDocuments(application) {
  if (!viewApplicationDocuments) return;

  const documents =
    application.application_documents || [];

  if (!documents.length) {
    viewApplicationDocuments.innerHTML =
      '<p>No documents uploaded.</p>';

    return;
  }

  viewApplicationDocuments.innerHTML =
    documents.map(doc => `
      <div class="document-row">

        <div>

          <strong>
            ${esc(doc.document_name || 'Document')}
          </strong>

          <small style="display:block;color:#667085;margin-top:4px">
            ${esc(doc.original_file_name || '')}
          </small>

        </div>

        <button
          type="button"
          class="btn secondary open-app-document"
          data-path="${esc(doc.storage_path)}">

          View

        </button>

      </div>
    `).join('');


  document
    .querySelectorAll('.open-app-document')
    .forEach(button => {

      button.onclick =
        () => openApplicationDocument(
          button.dataset.path
        );
    });
}


async function openApplicationDocument(path) {
  try {
    const {
      data,
      error
    } = await sb.storage
      .from('application-documents')
      .createSignedUrl(
        path,
        120
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
}


/* =========================================================
   SAVE APPLICATION
========================================================= */

async function saveCurrentApplication() {
  const id =
    viewApplicationId?.value;

  if (!id) {
    msg('Application ID missing');
    return;
  }

  saveApplicationChanges.disabled =
    true;

  saveApplicationChanges.textContent =
    'Saving...';

  try {
    const {
      error
    } = await sb
      .from('applications')
      .update({
        status:
          viewApplicationStatus?.value ||
          'pending',

        amount:
          Number(
            viewApplicationAmount?.value ||
            0
          ),

        external_reference_no:
          viewApplicationReference?.value
            .trim() ||
          null,

        admin_note:
          viewApplicationAdminNote?.value
            .trim() ||
          null
      })
      .eq('id', id);

    if (error) throw error;

    msg('Application updated');

    await loadApplications();

    const refreshed =
      currentApplications.find(
        item =>
          String(item.id) === String(id)
      );

    if (refreshed) {
      openApplicationViewer(id);
    }

    updateRevenue();

  } catch (error) {
    msg(error.message);

  } finally {
    saveApplicationChanges.disabled =
      false;

    saveApplicationChanges.textContent =
      'Save Application';
  }
}


/* =========================================================
   APPLICATION OUTPUTS
========================================================= */

function renderApplicationOutputs(application) {
  if (!applicationOutputsList) return;

  const outputs =
    application.application_outputs || [];

  if (!outputs.length) {
    applicationOutputsList.innerHTML =
      '<p>No receipt/output added.</p>';

    return;
  }

  applicationOutputsList.innerHTML =
    outputs.map(output => `
      <div class="output-row">

        <div>

          <strong>
            ${esc(output.title || 'Output')}
          </strong>

          <small style="display:block;color:#667085;margin-top:4px">
            ${esc(prettyKey(output.output_type))}
            ${
              output.reference_no
                ? ' • ' + esc(output.reference_no)
                : ''
            }
          </small>

        </div>

        <button
          type="button"
          class="btn secondary open-app-output"
          data-id="${esc(output.id)}">

          Open

        </button>

      </div>
    `).join('');


  document
    .querySelectorAll('.open-app-output')
    .forEach(button => {

      button.onclick =
        () => openApplicationOutput(
          button.dataset.id
        );
    });
}


async function openApplicationOutput(outputId) {
  const applicationId =
    viewApplicationId?.value;

  const application =
    currentApplications.find(
      item =>
        String(item.id) ===
        String(applicationId)
    );

  const output =
    application?.application_outputs?.find(
      item =>
        String(item.id) ===
        String(outputId)
    );

  if (!output) {
    msg('Output not found');
    return;
  }

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
      msg('Output file unavailable');
      return;
    }

    const {
      data,
      error
    } = await sb.storage
      .from('application-outputs')
      .createSignedUrl(
        output.storage_path,
        120
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
}


/* =========================================================
   ADD RECEIPT / OUTPUT
========================================================= */

async function addApplicationOutput() {
  const applicationId =
    viewApplicationId?.value;

  if (!applicationId) {
    msg('Application ID missing');
    return;
  }

  const title =
    applicationOutputTitle?.value
      .trim();

  if (!title) {
    msg('Output title required');
    return;
  }

  const file =
    applicationOutputFile?.files?.[0];

  const externalUrl =
    applicationOutputUrl?.value
      .trim();

  if (!file && !externalUrl) {
    msg('File या External URL दें');
    return;
  }

  uploadApplicationOutput.disabled =
    true;

  uploadApplicationOutput.textContent =
    'Adding...';

  try {
    let storagePath = null;

    if (file) {
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png'
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          'Only PDF, JPG or PNG allowed'
        );
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error(
          'File maximum 10 MB होना चाहिए'
        );
      }

      storagePath =
        `${applicationId}/${Date.now()}-${safeFileName(file.name)}`;

      const {
        error: uploadError
      } = await sb.storage
        .from('application-outputs')
        .upload(
          storagePath,
          file,
          {
            upsert: false,
            contentType: file.type
          }
        );

      if (uploadError) {
        throw uploadError;
      }
    }

    const {
      error
    } = await sb
      .from('application_outputs')
      .insert({
        application_id: applicationId,

        output_type:
          applicationOutputType?.value ||
          'receipt',

        title,

        storage_path:
          storagePath,

        external_url:
          externalUrl || null,

        reference_no:
          applicationOutputReference?.value
            .trim() ||
          null,

        created_by:
          me.id
      });

    if (error) throw error;

    applicationOutputTitle.value = '';
    applicationOutputReference.value = '';
    applicationOutputUrl.value = '';
    applicationOutputFile.value = '';

    msg('Receipt / Output added');

    await loadApplications();

    openApplicationViewer(
      applicationId
    );

  } catch (error) {
    console.error(error);
    msg(error.message);

  } finally {
    uploadApplicationOutput.disabled =
      false;

    uploadApplicationOutput.textContent =
      'Add Receipt / Output';
  }
}


/* =========================================================
   LEGACY ORDERS
========================================================= */

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

  if (error) throw error;

  currentOrders =
    data || [];

  if (ordersCount) {
    ordersCount.textContent =
      currentOrders.length;
  }

  if (!ordersWrap) return;

  if (!currentOrders.length) {
    ordersWrap.innerHTML =
      '<p>No legacy orders.</p>';

    return;
  }

  ordersWrap.innerHTML =
    currentOrders.map(order => {

      const customer =
        order.profiles?.full_name ||
        order.profiles?.email ||
        'Customer';

      return `
        <article class="admin-order-card">

          <div class="admin-order-top">

            <div>

              <strong>
                ${esc(
                  order.services?.name ||
                  'Service'
                )}
              </strong>

              <small>
                ${esc(customer)}
              </small>

              <small>
                ${esc(formatDate(order.created_at))}
              </small>

            </div>

            <span
              class="status ${esc(order.status)}">
              ${esc(order.status)}
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

      button.onclick =
        () => openOrder(
          button.dataset.id
        );
    });
}


function openOrder(id) {
  const order =
    currentOrders.find(
      item =>
        String(item.id) === String(id)
    );

  if (!order) return;

  editOrderId.value =
    order.id;

  editOrderService.textContent =
    order.services?.name ||
    'Service';

  editOrderCustomer.textContent =
    order.profiles?.full_name ||
    order.profiles?.email ||
    'Customer';

  editOrderStatus.value =
    order.status ||
    'pending';

  editOrderAmount.value =
    Number(order.amount || 0);

  editOrderNote.value =
    order.note || '';

  orderEditModal?.classList.add('show');

  document.body.style.overflow =
    'hidden';
}


function closeOrder() {
  orderEditModal?.classList.remove('show');

  document.body.style.overflow =
    '';
}


async function saveOrder() {
  const id =
    editOrderId?.value;

  if (!id) return;

  saveOrderEdit.disabled =
    true;

  try {
    const {
      error
    } = await sb
      .from('orders')
      .update({
        status:
          editOrderStatus?.value ||
          'pending',

        amount:
          Number(
            editOrderAmount?.value ||
            0
          ),

        updated_at:
          new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    closeOrder();

    msg('Order updated');

    await loadOrders();

    updateRevenue();

  } catch (error) {
    msg(error.message);

  } finally {
    saveOrderEdit.disabled =
      false;
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
    .order('sort_order', {
      ascending: true
    });

  if (error) throw error;

  services =
    data || [];

  if (servicesCount) {
    servicesCount.textContent =
      services.length;
  }

  if (!servicesWrap) return;

  servicesWrap.innerHTML =
    services.map(service => `
      <div class="service-row">

        <div>

          <strong>
            ${esc(service.icon || '🧩')}
            ${esc(service.name)}
          </strong>

          <span class="service-admin-meta">
            ${esc(service.category || 'Other')}
            •
            ${service.active ? 'Active' : 'Inactive'}
            •
            ${money(service.price)}
            •
            ${esc(service.processing_mode || 'admin')}
            •
            Sort ${Number(service.sort_order || 0)}
          </span>

          ${
            service.description
              ? `
                <span class="service-admin-meta">
                  ${esc(service.description)}
                </span>
              `
              : ''
          }

        </div>

        <div class="row-actions">

          <button
            type="button"
            class="btn secondary edit-service-btn"
            data-id="${esc(service.id)}">

            Edit

          </button>

          <button
            type="button"
            class="btn secondary toggle-service-btn"
            data-id="${esc(service.id)}">

            ${service.active ? 'Disable' : 'Enable'}

          </button>

          <button
            type="button"
            class="btn secondary delete-service-btn"
            data-id="${esc(service.id)}">

            Delete

          </button>

        </div>

      </div>
    `).join('');


  document
    .querySelectorAll('.edit-service-btn')
    .forEach(button => {

      button.onclick =
        () => openServiceEditor(
          button.dataset.id
        );
    });


  document
    .querySelectorAll('.toggle-service-btn')
    .forEach(button => {

      button.onclick =
        () => toggleService(
          button.dataset.id
        );
    });


  document
    .querySelectorAll('.delete-service-btn')
    .forEach(button => {

      button.onclick =
        () => deleteService(
          button.dataset.id
        );
    });
}


function nextSort() {
  if (!services.length) {
    return 10;
  }

  return (
    Math.max(
      ...services.map(
        service =>
          Number(service.sort_order || 0)
      )
    ) + 10
  );
}


function openServiceEditor(id = null) {
  let service = null;

  if (id) {
    service =
      services.find(
        item =>
          String(item.id) === String(id)
      );

    if (!service) {
      msg('Service not found');
      return;
    }
  }

  editServiceId.value =
    service?.id || '';

  serviceModalHeading.textContent =
    service
      ? 'Edit Service'
      : 'Add Service';

  editServiceName.value =
    service?.name || '';

  editServicePrice.value =
    Number(service?.price || 0);

  editServiceIcon.value =
    service?.icon || '🧩';

  editServiceCategory.value =
    service?.category || 'Other';

  editServiceSort.value =
    service
      ? Number(service.sort_order || 0)
      : nextSort();

  if (editServiceProcessingMode) {
    editServiceProcessingMode.value =
      service?.processing_mode ||
      'admin';
  }

  editServiceDescription.value =
    service?.description || '';

  editServiceDocuments.value =
    service?.required_documents || '';

  editServiceInstructions.value =
    service?.instructions ||
    'आवेदन से पहले सभी जानकारी और दस्तावेज़ जाँच लें।';

  editServiceActive.value =
    String(service?.active ?? true);

  serviceEditModal?.classList.add('show');

  document.body.style.overflow =
    'hidden';
}


function closeServiceEditor() {
  serviceEditModal?.classList.remove('show');

  document.body.style.overflow =
    '';
}


async function saveService() {
  const id =
    editServiceId?.value || '';

  const payload = {
    name:
      editServiceName?.value.trim(),

    price:
      Number(
        editServicePrice?.value ||
        0
      ),

    icon:
      editServiceIcon?.value.trim() ||
      '🧩',

    category:
      editServiceCategory?.value ||
      'Other',

    sort_order:
      Number(
        editServiceSort?.value ||
        0
      ),

    processing_mode:
      editServiceProcessingMode?.value ||
      'admin',

    description:
      editServiceDescription?.value.trim() ||
      '',

    required_documents:
      editServiceDocuments?.value.trim() ||
      '',

    instructions:
      editServiceInstructions?.value.trim() ||
      '',

    active:
      editServiceActive?.value ===
      'true'
  };

  if (!payload.name) {
    msg('Service name required');
    return;
  }

  saveServiceEdit.disabled =
    true;

  saveServiceEdit.textContent =
    'Saving...';

  try {
    let result;

    if (id) {
      result = await sb
        .from('services')
        .update(payload)
        .eq('id', id);

    } else {
      result = await sb
        .from('services')
        .insert(payload);
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
    msg(error.message);

  } finally {
    saveServiceEdit.disabled =
      false;

    saveServiceEdit.textContent =
      'Save Service';
  }
}


async function toggleService(id) {
  const service =
    services.find(
      item =>
        String(item.id) === String(id)
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
}


async function deleteService(id) {
  const service =
    services.find(
      item =>
        String(item.id) === String(id)
    );

  if (!service) return;

  if (
    !confirm(
      `Delete "${service.name}" service?`
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
}


/* =========================================================
   USERS
========================================================= */

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

  if (error) throw error;

  users =
    data || [];

  if (usersCount) {
    usersCount.textContent =
      users.length;
  }

  if (!usersWrap) return;

  if (!users.length) {
    usersWrap.innerHTML =
      '<p>No users.</p>';

    return;
  }

  usersWrap.innerHTML =
    users.map(user => `
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
                ? ' • ' + esc(user.phone)
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

          ${esc(user.role || 'customer')}

        </span>

      </div>
    `).join('');
}


/* =========================================================
   ERROR DISPLAY
========================================================= */

window.addEventListener(
  'unhandledrejection',
  event => {
    console.error(event.reason);

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


window.addEventListener(
  'error',
  event => {
    console.error(event.error || event.message);

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


/* =========================================================
   START
========================================================= */

boot();
