(() => {
  const PANEL = '#smhGovJobsPanel';
  let opening = false;
  let lastRequested = '';

  function currentDetailUrl() {
    try {
      return new URLSearchParams(location.search).get('gjDetail') || '';
    } catch (_) {
      return '';
    }
  }

  function forceDetailVisible(panel) {
    const url = currentDetailUrl();
    if (!panel || !url) return false;

    const home = panel.querySelector('.gj-home-wrap');
    const list = panel.querySelector('.gj-list');
    const detail = panel.querySelector('.gj-detail');
    const toolbar = panel.querySelector('.gj-toolbar');
    const status = panel.querySelector('.gj-status');
    const back = panel.querySelector('.gj-back');

    if (home) home.style.setProperty('display', 'none', 'important');
    if (list) list.style.setProperty('display', 'none', 'important');
    if (detail) detail.style.setProperty('display', 'block', 'important');
    if (toolbar) toolbar.style.display = '';
    if (status) status.style.display = '';
    if (back) back.style.display = '';

    panel.dataset.smhDetailLocked = '1';
    return true;
  }

  function releaseDetailLock(panel) {
    if (!panel) return;
    if (currentDetailUrl()) return;
    panel.dataset.smhDetailLocked = '0';
    const home = panel.querySelector('.gj-home-wrap');
    const list = panel.querySelector('.gj-list');
    const detail = panel.querySelector('.gj-detail');
    if (home) home.style.removeProperty('display');
    if (list) list.style.removeProperty('display');
    if (detail) detail.style.removeProperty('display');
  }

  async function ensureDetailLoaded(panel) {
    const url = currentDetailUrl();
    if (!panel || !url || opening) return;

    forceDetailVisible(panel);

    const detail = panel.querySelector('.gj-detail');
    const hasRendered = !!detail?.querySelector('.gj-detail-card');
    const isLoading = /details loading/i.test(detail?.textContent || '');
    if (hasRendered || isLoading || lastRequested === url) return;

    if (typeof window.openGovernmentJobDetail !== 'function') return;

    opening = true;
    lastRequested = url;
    try {
      await window.openGovernmentJobDetail(url);
      forceDetailVisible(panel);
      panel.scrollTo({ top: 0, behavior: 'auto' });
    } catch (_) {
      lastRequested = '';
    } finally {
      opening = false;
    }
  }

  function bind(panel) {
    if (!panel || panel.dataset.smhDetailGuardBound === '1') return;
    panel.dataset.smhDetailGuardBound = '1';

    panel.addEventListener('click', event => {
      const link = event.target.closest('[data-home-url], .gj-item[data-url], .gj-trending button[data-url]');
      const url = link?.dataset.homeUrl || link?.dataset.url || '';
      if (url) {
        try {
          const u = new URL(location.href);
          u.searchParams.set('gov', '1');
          u.searchParams.set('gjTab', u.searchParams.get('gjTab') || 'home');
          u.searchParams.set('gjDetail', url);
          history.replaceState(null, '', u);
        } catch (_) {}
        queueMicrotask(() => {
          forceDetailVisible(panel);
          ensureDetailLoaded(panel);
        });
      }

      if (event.target.closest('.gj-back')) {
        try {
          const u = new URL(location.href);
          u.searchParams.delete('gjDetail');
          history.replaceState(null, '', u);
        } catch (_) {}
        lastRequested = '';
        setTimeout(() => releaseDetailLock(panel), 0);
      }
    }, true);

    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (currentDetailUrl()) {
          forceDetailVisible(panel);
          ensureDetailLoaded(panel);
        } else {
          releaseDetailLock(panel);
        }
      });
    }).observe(panel, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });

    if (currentDetailUrl()) setTimeout(() => ensureDetailLoaded(panel), 120);
  }

  new MutationObserver(() => {
    const panel = document.querySelector(PANEL);
    if (panel) bind(panel);
  }).observe(document.documentElement, { subtree: true, childList: true });

  const existing = document.querySelector(PANEL);
  if (existing) bind(existing);
})();