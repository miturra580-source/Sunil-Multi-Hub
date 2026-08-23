window.SMH_CONFIG = {
  supabaseUrl: "https://zktobzhvyxiclvyqnjco.supabase.co",
  supabaseAnonKey: "sb_publishable_IvYEQWxo1jrQo8O5gayraw_wXAJj7JH"
};

(function loadCscModule() {
  const page = (location.pathname.split('/').pop() || '').toLowerCase();
  if (page !== 'dashboard.html' && page !== 'admin.html') return;
  if (document.querySelector('script[data-smh-csc-module]')) return;

  const script = document.createElement('script');
  script.src = 'csc-module.js';
  script.defer = true;
  script.dataset.smhCscModule = 'true';
  document.head.appendChild(script);
})();
