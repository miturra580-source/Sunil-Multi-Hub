window.SMH_CONFIG = {
  supabaseUrl: "https://zktobzhvyxiclvyqnjco.supabase.co",
  supabaseAnonKey: "sb_publishable_IvYEQWxo1jrQo8O5gayraw_wXAJj7JH"
};

(function loadSmhModules() {
  const page = (location.pathname.split('/').pop() || '').toLowerCase();
  const modules = [
    ['csc-module.js?v=20260823-2','data-smh-csc-module', ['dashboard.html','admin.html']],
    ['full-page-panels.js?v=20260823-1','data-smh-full-page-panels',['dashboard.html']],
    ['dashboard-nav.js?v=20260823-3','data-smh-dashboard-nav',['dashboard.html']],
    ['gov-jobs-live.js?v=20260824-2','data-smh-gov-jobs-live',['dashboard.html']],
    ['application-modal-guard.js?v=20260824-1','data-smh-application-modal-guard',['dashboard.html']],
    ['pan-ui.js?v=20260824-6','data-smh-pan-ui',['dashboard.html']],
    ['certificate-direct.js?v=20260823-6','data-smh-certificate-direct',['dashboard.html']],
    ['edistrict-ui.js?v=20260823-3','data-smh-edistrict-ui',['dashboard.html']],
    ['edistrict-document-picker.js?v=20260823-3','data-smh-edistrict-document-picker',['dashboard.html']],
    ['edistrict-ration-divider.js?v=20260824-2','data-smh-edistrict-ration-divider',['dashboard.html']],
    ['ration-card-ui.js?v=20260823-5','data-smh-ration-card-ui',['dashboard.html']],
    ['ration-card-hotfix.js?v=20260824-12','data-smh-ration-card-hotfix',['dashboard.html']],
    ['ration-card-persistence.js?v=20260824-3','data-smh-ration-card-persistence',['dashboard.html']],
    ['ration-required-test-off.js?v=20260824-2','data-smh-ration-required-test-off',['dashboard.html']],
    ['ration-document-fix.js?v=20260824-2','data-smh-ration-document-fix',['dashboard.html']],
    ['ration-entry-fix.js?v=20260824-1','data-smh-ration-entry-fix',['dashboard.html']],
    ['certificate-ui.js?v=20260823-3','data-smh-certificate-ui',['dashboard.html']],
    ['up-location.js?v=20260823-4','data-smh-up-location',['dashboard.html']],
    ['certificate-radio.js?v=20260823-1','data-smh-certificate-radio',['dashboard.html']],
    ['certificate-document-rules.js?v=20260823-3','data-smh-certificate-document-rules',['dashboard.html']],
    ['dashboard-wallet-sync.js?v=20260823-1','data-smh-dashboard-wallet-sync',['dashboard.html']],
    ['service-card-cleanup.js?v=20260823-1','data-smh-service-card-cleanup',['dashboard.html']],
    ['service-config-guard.js?v=20260824-6','data-smh-service-config-guard',['dashboard.html']],
    ['dashboard-stat-links.js?v=20260823-1','data-smh-dashboard-stat-links',['dashboard.html']],
    ['wallet-compact.js?v=20260823-1','data-smh-wallet-compact',['wallet.html']]
  ];
  modules.forEach(([src,attr,pages])=>{
    if(!pages.includes(page)||document.querySelector(`script[${attr}]`)) return;
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.setAttribute(attr,'true');
    document.head.appendChild(s);
  });
})();