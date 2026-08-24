(() => {
  const PANEL = '#smhGovJobsPanel';
  let synthetic = false;

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

  function clearDetailState() {
    try {
      const u = new URL(location.href);
      u.searchParams.set('gov', '1');
      u.searchParams.delete('gjDetail');
      history.replaceState(null, '', u);
    } catch (_) {}
  }

  function openViaBaseHandler(panel, url) {
    if (!panel || !url) return;
    setDetailState(url);

    const homeWrap = panel.querySelector('.gj-home-wrap');
    if (homeWrap) homeWrap.style.display = 'none';
    const toolbar = panel.querySelector('.gj-toolbar');
    const status = panel.querySelector('.gj-status');
    const list = panel.querySelector('.gj-list');
    if (toolbar) toolbar.style.display = '';
    if (status) status.style.display = '';
    if (list) list.style.display = 'block';
    panel.dataset.smhDetailFromHome = '1';

    let target = [...panel.querySelectorAll('.gj-list .gj-item[data-url]')]
      .find(el => el.dataset.url === url);

    let temp = null;
    if (!target && list) {
      temp = document.createElement('button');
      temp.type = 'button';
      temp.className = 'gj-item';
      temp.dataset.url = url;
      temp.dataset.masterTemp = '1';
      temp.style.display = 'none';
      list.appendChild(temp);
      target = temp;
    }

    if (!target) return;
    synthetic = true;
    try {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    } finally {
      synthetic = false;
      if (temp) setTimeout(() => temp.remove(), 1500);
    }
    panel.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function revealHomeMore(button) {
    const card = button.closest('.gj-home-card');
    const key = button.dataset.moreKey;
    if (!card || !key) return false;

    const all = [...document.querySelectorAll(`${PANEL} .gj-home-card[data-section-key="${CSS.escape(key)}"] .gj-home-link`)];
    if (!all.length) return false;
    all.forEach(el => { el.style.display = ''; });
    button.closest('.gj-home-more-row')?.remove();
    return true;
  }

  function bind(panel) {
    if (!panel || panel.dataset.masterControllerBound === '1') return;
    panel.dataset.masterControllerBound = '1';

    panel.addEventListener('click', event => {
      if (synthetic || event.target.closest('[data-master-temp]')) return;

      const homeLink = event.target.closest('[data-home-url]');
      if (homeLink?.dataset.homeUrl) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openViaBaseHandler(panel, homeLink.dataset.homeUrl);
        return;
      }

      const trend = event.target.closest('.gj-trending button[data-url]');
      if (trend?.dataset.url) {
        setDetailState(trend.dataset.url);
        return;
      }

      const regular = event.target.closest('.gj-item[data-url]');
      if (regular?.dataset.url) {
        setDetailState(regular.dataset.url);
        return;
      }

      const homeMore = event.target.closest('.gj-home-more[data-more-key]');
      if (homeMore) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (!revealHomeMore(homeMore)) {
          homeMore.click();
        }
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