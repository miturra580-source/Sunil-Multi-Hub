(() => {
  const PANEL = '#smhGovJobsPanel';

  function setDetailState(url) {
    if (!url) return;
    try {
      const u = new URL(location.href);
      u.searchParams.set('gov', '1');
      u.searchParams.set('gjTab', 'home');
      u.searchParams.set('gjDetail', url);
      history.replaceState(null, '', u);
    } catch (_) {}
  }

  function clearDetailState() {
    try {
      const u = new URL(location.href);
      u.searchParams.set('gov', '1');
      u.searchParams.delete('gjDetail');
      history.replaceState(null, '', u);
    } catch (_) {}
  }

  async function openDetail(panel, url) {
    if (!panel || !url) return;
    setDetailState(url);
    panel.dataset.smhDetailFromHome = '1';

    const homeWrap = panel.querySelector('.gj-home-wrap');
    if (homeWrap) homeWrap.style.display = 'none';
    const toolbar = panel.querySelector('.gj-toolbar');
    const status = panel.querySelector('.gj-status');
    const list = panel.querySelector('.gj-list');
    const detail = panel.querySelector('.gj-detail');
    if (toolbar) toolbar.style.display = '';
    if (status) status.style.display = '';
    if (list) list.style.display = 'none';
    if (detail) detail.style.display = 'block';

    panel.scrollTo({ top: 0, behavior: 'auto' });

    if (typeof window.openGovernmentJobDetail === 'function') {
      try {
        await window.openGovernmentJobDetail(url);
      } catch (_) {}
    }
  }

  function bind(panel) {
    if (!panel || panel.dataset.masterControllerBound === '2') return;
    panel.dataset.masterControllerBound = '2';

    panel.addEventListener('click', event => {
      const homeLink = event.target.closest('[data-home-url]');
      if (homeLink?.dataset.homeUrl) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openDetail(panel, homeLink.dataset.homeUrl);
        return;
      }

      const trend = event.target.closest('.gj-trending button[data-url]');
      if (trend?.dataset.url) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openDetail(panel, trend.dataset.url);
        return;
      }

      const regular = event.target.closest('.gj-item[data-url]');
      if (regular?.dataset.url) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openDetail(panel, regular.dataset.url);
        return;
      }

      if (event.target.closest('.gj-back')) clearDetailState();
    }, true);
  }

  new MutationObserver(() => {
    const panel = document.querySelector(PANEL);
    if (panel) bind(panel);
  }).observe(document.documentElement, { subtree: true, childList: true });

  const existing = document.querySelector(PANEL);
  if (existing) bind(existing);
})();