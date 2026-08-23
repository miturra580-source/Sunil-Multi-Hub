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

  if (page === 'dashboard.html' && !document.querySelector('script[data-smh-pan-ui]')) {
    const panUiScript = document.createElement('script');
    panUiScript.src = 'pan-ui.js?v=20260823-3';
    panUiScript.defer = true;
    panUiScript.dataset.smhPanUi = 'true';
    document.head.appendChild(panUiScript);
  }

  if (page === 'dashboard.html' && !document.querySelector('script[data-smh-wallet-sync]')) {
    const walletSyncScript = document.createElement('script');
    walletSyncScript.src = 'dashboard-wallet-sync.js?v=20260823-1';
    walletSyncScript.defer = true;
    walletSyncScript.dataset.smhWalletSync = 'true';
    document.head.appendChild(walletSyncScript);
  }

  if (page === 'wallet.html' && !document.querySelector('script[data-smh-wallet-compact]')) {
    const walletScript = document.createElement('script');
    walletScript.src = 'wallet-compact.js?v=20260823-1';
    walletScript.defer = true;
    walletScript.dataset.smhWalletCompact = 'true';
    document.head.appendChild(walletScript);
  }
})();
