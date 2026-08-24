(() => {
  const PANEL = '#smhGovJobsPanel';

  // A page refresh must return to the grouped Home dashboard, not a stale
  // category such as Syllabus from the previous URL state.
  try {
    const url = new URL(location.href);
    if (url.searchParams.get('gov') === '1' && !url.searchParams.get('gjDetail')) {
      url.searchParams.set('gjTab', 'home');
      history.replaceState(null, '', url);
    }
  } catch (_) {}

  function hasDetail() {
    try {
      return !!new URLSearchParams(location.search).get('gjDetail');
    } catch {
      return false;
    }
  }

  function showGroupedHome(panel) {
    if (!panel || hasDetail()) return;
    const home = panel.querySelector('.gj-nav button[data-k="home"]');
    if (!home) return;

    setTimeout(() => {
      if (!panel.classList.contains('show') || hasDetail()) return;
      if (panel.querySelector('.gj-nav button.active')?.dataset.k === 'home' &&
          panel.querySelector('.gj-home-wrap')?.style.display !== 'none') return;
      home.click();
    }, 140);
  }

  function bind(panel) {
    if (!panel || panel.dataset.smhDefaultHomeBound === '1') return;
    panel.dataset.smhDefaultHomeBound = '1';

    let wasShown = panel.classList.contains('show');
    if (wasShown) showGroupedHome(panel);

    new MutationObserver(() => {
      const shown = panel.classList.contains('show');
      if (shown && !wasShown) showGroupedHome(panel);
      wasShown = shown;
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  new MutationObserver(() => {
    const panel = document.querySelector(PANEL);
    if (panel) bind(panel);
  }).observe(document.documentElement, { subtree: true, childList: true });

  const current = document.querySelector(PANEL);
  if (current) bind(current);
})();