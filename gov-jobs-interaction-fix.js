(() => {
  const PANEL = '#smhGovJobsPanel';

  function setDetailState(url) {
    if (!url) return;
    try {
      const u = new URL(location.href);
      u.searchParams.set('gov', '1');
      u.searchParams.set('gjTab', u.searchParams.get('gjTab') || 'home');
      u.searchParams.set('gjDetail', url);
      history.replaceState(null, '', u);
    } catch (_) {}
  }

  function installStyle() {
    if (document.getElementById('gjInteractionFixStyle')) return;
    const style = document.createElement('style');
    style.id = 'gjInteractionFixStyle';
    style.textContent = `
      #smhGovJobsPanel{width:100vw!important;max-width:none!important;height:100dvh!important;inset:0!important}
      #smhGovJobsPanel .gj-shell{width:100%!important;max-width:none!important;margin:0!important;min-height:100dvh!important}
      @media(max-width:760px){
        #smhGovJobsPanel .gj-nav{
          display:flex!important;
          flex-direction:row!important;
          flex-wrap:nowrap!important;
          width:100%!important;
          overflow-x:auto!important;
          overflow-y:hidden!important;
          white-space:nowrap!important;
          -webkit-overflow-scrolling:touch!important;
          position:sticky!important;
          top:0!important;
          z-index:40!important;
          min-height:46px!important;
          max-height:50px!important;
        }
        #smhGovJobsPanel .gj-nav button{
          display:block!important;
          flex:0 0 auto!important;
          width:auto!important;
          min-width:96px!important;
          height:46px!important;
          padding:0 12px!important;
          margin:0!important;
          font-size:12px!important;
          line-height:46px!important;
        }
        #smhGovJobsPanel .gj-top{position:relative!important;top:auto!important}
      }
    `;
    document.head.appendChild(style);
  }

  function revealMore(list) {
    if (!list) return;
    const items = [...list.querySelectorAll('.gj-item')].filter(x => !x.dataset.homeTemp);
    if (!items.length) return;
    const visible = items.filter(x => getComputedStyle(x).display !== 'none').length;
    const next = Math.min(items.length, Math.max(visible, 10) + 10);
    items.forEach((item, index) => { item.style.display = index < next ? '' : 'none'; });
    list.dataset.smhVisibleCount = String(next);
    const btn = list.querySelector('.gj-existing-more');
    if (btn && next >= items.length) btn.remove();
  }

  function bind(panel) {
    if (!panel || panel.dataset.smhInteractionFix === '1') return;
    panel.dataset.smhInteractionFix = '1';

    panel.addEventListener('click', event => {
      const homeLink = event.target.closest('[data-home-url]');
      if (homeLink?.dataset.homeUrl) {
        // Set detail state before other observers react to Home mode being hidden.
        setDetailState(homeLink.dataset.homeUrl);
        return;
      }

      const regular = event.target.closest('.gj-item[data-url], .gj-trending button[data-url]');
      if (regular?.dataset.url) {
        setDetailState(regular.dataset.url);
        return;
      }

      const more = event.target.closest('.gj-existing-more');
      if (more) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        revealMore(more.closest('.gj-list'));
      }
    }, true);
  }

  installStyle();

  new MutationObserver(() => {
    const panel = document.querySelector(PANEL);
    if (panel) bind(panel);
  }).observe(document.documentElement, { subtree: true, childList: true });

  const existing = document.querySelector(PANEL);
  if (existing) bind(existing);
})();