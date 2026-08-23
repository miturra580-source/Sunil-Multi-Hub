window.SMH_CONFIG = {
  supabaseUrl: "https://zktobzhvyxiclvyqnjco.supabase.co",
  supabaseAnonKey: "sb_publishable_IvYEQWxo1jrQo8O5gayraw_wXAJj7JH"
};

(function loadSmhModules() {
  const page = (location.pathname.split('/').pop() || '').toLowerCase();

  if ((page === 'dashboard.html' || page === 'admin.html') && !document.querySelector('script[data-smh-csc-module]')) {
    const script = document.createElement('script');
    script.src = 'csc-module.js?v=20260823-2';
    script.defer = true;
    script.dataset.smhCscModule = 'true';
    document.head.appendChild(script);
  }

  if (page === 'dashboard.html' && !document.querySelector('script[data-smh-dashboard-nav]')) {
    const navScript = document.createElement('script');
    navScript.src = 'dashboard-nav.js?v=20260823-3';
    navScript.defer = true;
    navScript.dataset.smhDashboardNav = 'true';
    document.head.appendChild(navScript);
  }
})();
