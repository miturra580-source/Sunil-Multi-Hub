(() => {
  const PANEL = '#smhGovJobsPanel';
  const CACHE_KEY = 'smh-gov-home-v1';
  const HOME_LIMIT = 10;
  const PAGE_STEP = 10;
  const REFRESH_MS = 5 * 60 * 1000;
  const CATEGORY_MAP = {
    result: 'result',
    admit: 'admit',
    jobs: 'jobs',
    answer: 'answer',
    admission: 'admission',
    syllabus: 'syllabus'
  };

  let client = null;
  let panel = null;
  let homeMode = false;
  let homeData = null;
  let lastFetchAt = 0;
  let fetchPromise = null;
  let paginateBusy = false;

  const esc = (value = '') => String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);

  function getClient() {
    if (client) return client;
    const cfg = window.SMH_CONFIG || {};
    if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      throw new Error('Portal config missing');
    }
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    return client;
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.sections)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function setUrlHome() {
    try {
      const url = new URL(location.href);
      url.searchParams.set('gov', '1');
      url.searchParams.set('gjTab', 'home');
      url.searchParams.delete('gjDetail');
      history.replaceState(null, '', url);
    } catch (_) {}
  }

  function setUrlDetail(detailUrl) {
    try {
      const url = new URL(location.href);
      url.searchParams.set('gov', '1');
      url.searchParams.set('gjTab', 'home');
      if (detailUrl) url.searchParams.set('gjDetail', detailUrl);
      else url.searchParams.delete('gjDetail');
      history.replaceState(null, '', url);
    } catch (_) {}
  }

  function fmtTime(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  function installStyles() {
    if (document.getElementById('gjHomeStyle')) return;
    const style = document.createElement('style');
    style.id = 'gjHomeStyle';
    style.textContent = `
      #smhGovJobsPanel .gj-home-wrap{max-width:1180px;margin:0 auto 24px;padding:0 16px}
      #smhGovJobsPanel .gj-home-status{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:9px 12px;margin-bottom:10px;background:#f7f7f7;border:1px solid #ddd;font-size:12px;color:#555}
      #smhGovJobsPanel .gj-home-refresh{border:0;border-radius:4px;background:#333;color:#fff;padding:7px 11px;font-weight:800;cursor:pointer}
      #smhGovJobsPanel .gj-home-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}
      #smhGovJobsPanel .gj-home-card{border:1px solid #bb0000;background:#fff;min-width:0}
      #smhGovJobsPanel .gj-home-title{background:#b40000;color:#fff;text-align:center;font-size:17px;font-weight:900;padding:9px 8px}
      #smhGovJobsPanel .gj-home-links{padding:7px 12px 5px}
      #smhGovJobsPanel .gj-home-link{width:100%;display:block;border:0;border-bottom:1px dotted #d4d4d4;background:#fff;color:#0645ad;text-align:left;padding:7px 2px;font-size:12px;line-height:1.35;cursor:pointer}
      #smhGovJobsPanel .gj-home-link::before{content:'•';color:#111;margin-right:7px}
      #smhGovJobsPanel .gj-home-link:hover{text-decoration:underline;background:#fafafa}
      #smhGovJobsPanel .gj-home-more-row{text-align:right;padding:7px 8px 9px}
      #smhGovJobsPanel .gj-home-more{border:0;border-radius:999px;background:#1478d4;color:#fff;padding:7px 12px;font-size:11px;font-weight:900;cursor:pointer}
      #smhGovJobsPanel .gj-home-empty{padding:18px 10px;text-align:center;color:#777;font-size:12px}
      #smhGovJobsPanel .gj-home-expanded{border:1px solid #b40000;background:#fff}
      #smhGovJobsPanel .gj-home-expanded-head{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#b40000;color:#fff;padding:9px 10px}
      #smhGovJobsPanel .gj-home-expanded-head strong{font-size:17px}
      #smhGovJobsPanel .gj-home-back{border:0;background:#fff;color:#333;border-radius:4px;padding:6px 10px;font-weight:800;cursor:pointer}
      #smhGovJobsPanel .gj-existing-more{display:block;width:max-content;margin:10px auto;border:0;border-radius:999px;background:#1478d4;color:#fff;padding:8px 14px;font-size:12px;font-weight:900;cursor:pointer}
      @media(max-width:900px){#smhGovJobsPanel .gj-home-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:620px){
        #smhGovJobsPanel .gj-home-wrap{padding:0 9px}
        #smhGovJobsPanel .gj-home-grid{grid-template-columns:1fr;gap:10px}
        #smhGovJobsPanel .gj-home-title{font-size:16px}
        #smhGovJobsPanel .gj-home-link{font-size:12px;padding:8px 2px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureHomeWrap() {
    if (!panel) return null;
    let wrap = panel.querySelector('.gj-home-wrap');
    if (wrap) return wrap;

    wrap = document.createElement('section');
    wrap.className = 'gj-home-wrap';
    wrap.style.display = 'none';
    wrap.innerHTML = `
      <div class="gj-home-status">
        <span class="gj-home-status-text">Latest sections loading...</span>
        <button type="button" class="gj-home-refresh">Refresh</button>
      </div>
      <div class="gj-home-body"></div>
    `;

    const toolbar = panel.querySelector('.gj-toolbar');
    if (toolbar?.parentNode) toolbar.parentNode.insertBefore(wrap, toolbar);
    else panel.querySelector('.gj-shell')?.appendChild(wrap);

    wrap.querySelector('.gj-home-refresh')?.addEventListener('click', () => fetchHome(true));
    wrap.addEventListener('click', onHomeClick);
    return wrap;
  }

  async function apiHome(force = false) {
    const sb = getClient();
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) throw error;
    if (!session) throw new Error('Please login again');

    const cfg = window.SMH_CONFIG || {};
    const suffix = force ? `?t=${Date.now()}` : '';
    const response = await fetch(`${cfg.supabaseUrl}/functions/v1/sarkari-home-feed${suffix}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: cfg.supabaseAnonKey
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Government updates load failed');
    return data;
  }

  function normalizedSections(data) {
    const input = Array.isArray(data?.sections) ? data.sections : [];
    const order = ['result','admit','jobs','answer','documents','admission','tenth_iti','outsourcing','syllabus'];
    return order.map(key => input.find(section => section?.key === key)).filter(Boolean);
  }

  function renderHome(data) {
    const wrap = ensureHomeWrap();
    if (!wrap) return;
    homeData = data;
    const sections = normalizedSections(data);
    const body = wrap.querySelector('.gj-home-body');
    const status = wrap.querySelector('.gj-home-status-text');
    const when = fmtTime(data?.fetched_at);
    if (status) status.textContent = `${sections.length} sections • Auto refresh every 5 min${when ? ` • Updated ${when}` : ''}`;

    if (!sections.length) {
      body.innerHTML = '<div class="gj-home-empty">अभी section data उपलब्ध नहीं है। Refresh करें।</div>';
      return;
    }

    body.innerHTML = `<div class="gj-home-grid">${sections.map(section => {
      const items = Array.isArray(section.items) ? section.items : [];
      const top = items.slice(0, HOME_LIMIT);
      return `
        <article class="gj-home-card" data-section-key="${esc(section.key)}">
          <div class="gj-home-title">${esc(section.title || section.key)}</div>
          <div class="gj-home-links">
            ${top.length ? top.map(item => `
              <button type="button" class="gj-home-link" data-home-url="${esc(item.url || '')}">${esc(item.title || '')}</button>
            `).join('') : '<div class="gj-home-empty">कोई नई जानकारी नहीं मिली।</div>'}
          </div>
          ${items.length > HOME_LIMIT ? `
            <div class="gj-home-more-row"><button type="button" class="gj-home-more" data-more-key="${esc(section.key)}">View More</button></div>
          ` : ''}
        </article>
      `;
    }).join('')}</div>`;
  }

  function renderExpanded(key, visibleCount = HOME_LIMIT) {
    const wrap = ensureHomeWrap();
    const section = normalizedSections(homeData).find(item => item.key === key);
    if (!wrap || !section) return;
    const body = wrap.querySelector('.gj-home-body');
    const items = Array.isArray(section.items) ? section.items : [];
    const safeCount = Math.max(HOME_LIMIT, Math.min(Number(visibleCount || HOME_LIMIT), items.length));
    const shown = items.slice(0, safeCount);
    body.innerHTML = `
      <div class="gj-home-expanded" data-expanded-key="${esc(key)}" data-visible-count="${safeCount}">
        <div class="gj-home-expanded-head">
          <strong>${esc(section.title || key)}</strong>
          <button type="button" class="gj-home-back">← All Sections</button>
        </div>
        <div class="gj-home-links">
          ${shown.map(item => `<button type="button" class="gj-home-link" data-home-url="${esc(item.url || '')}">${esc(item.title || '')}</button>`).join('')}
        </div>
        ${items.length > shown.length ? `<div class="gj-home-more-row"><button type="button" class="gj-home-more" data-expand-more="${esc(key)}">और 10 देखें</button></div>` : ''}
      </div>
    `;
  }

  function triggerExistingDetail(url) {
    if (!panel || !url) return;
    exitHomeMode();
    panel.dataset.smhDetailFromHome = '1';
    setUrlDetail(url);
    panel.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof window.openGovernmentJobDetail === 'function') {
      window.openGovernmentJobDetail(url).catch?.(() => {});
      return;
    }

    const list = panel.querySelector('.gj-list');
    if (!list) return;
    const temp = document.createElement('button');
    temp.type = 'button';
    temp.className = 'gj-item';
    temp.dataset.url = url;
    temp.dataset.homeTemp = '1';
    temp.style.display = 'none';
    list.appendChild(temp);
    requestAnimationFrame(() => {
      temp.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      setTimeout(() => temp.remove(), 1200);
    });
  }

  function onHomeClick(event) {
    const link = event.target.closest('[data-home-url]');
    if (link?.dataset.homeUrl) {
      event.preventDefault();
      triggerExistingDetail(link.dataset.homeUrl);
      return;
    }

    if (event.target.closest('.gj-home-back')) {
      event.preventDefault();
      renderHome(homeData);
      return;
    }

    const expandMore = event.target.closest('[data-expand-more]');
    if (expandMore) {
      event.preventDefault();
      const box = event.target.closest('.gj-home-expanded');
      const current = Number(box?.dataset.visibleCount || HOME_LIMIT);
      renderExpanded(expandMore.dataset.expandMore, current + PAGE_STEP);
      return;
    }

    const more = event.target.closest('[data-more-key]');
    if (!more) return;
    event.preventDefault();
    const key = more.dataset.moreKey;
    renderExpanded(key, HOME_LIMIT + PAGE_STEP);
  }

  async function fetchHome(force = false) {
    if (fetchPromise) return fetchPromise;
    const wrap = ensureHomeWrap();
    const status = wrap?.querySelector('.gj-home-status-text');
    if (status) status.textContent = force ? 'Fresh updates checking...' : 'Latest sections loading...';

    fetchPromise = (async () => {
      try {
        const data = await apiHome(force);
        data.cached_at = Date.now();
        lastFetchAt = Date.now();
        writeCache(data);
        if (homeMode) renderHome(data);
        else homeData = data;
        return data;
      } catch (error) {
        const cached = readCache();
        if (cached) {
          homeData = cached;
          if (homeMode) {
            renderHome(cached);
            const text = ensureHomeWrap()?.querySelector('.gj-home-status-text');
            if (text) text.textContent = `Last saved updates shown • Live refresh failed: ${error?.message || 'try again'}`;
          }
          return cached;
        }
        if (status) status.textContent = `Updates load नहीं हो सके • ${error?.message || 'Refresh करें'}`;
        throw error;
      } finally {
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  }

  function showHome(force = false) {
    if (!panel) return;
    installStyles();
    const wrap = ensureHomeWrap();
    homeMode = true;
    panel.dataset.smhDetailFromHome = '0';
    setUrlHome();

    panel.querySelectorAll('.gj-nav button').forEach(button => {
      button.classList.toggle('active', button.dataset.k === 'home');
    });

    if (wrap) wrap.style.display = 'block';
    const toolbar = panel.querySelector('.gj-toolbar');
    const status = panel.querySelector('.gj-status');
    const list = panel.querySelector('.gj-list');
    const detail = panel.querySelector('.gj-detail');
    if (toolbar) toolbar.style.display = 'none';
    if (status) status.style.display = 'none';
    if (list) list.style.display = 'none';
    if (detail) detail.style.display = 'none';

    const cached = readCache();
    if (cached) {
      homeData = cached;
      renderHome(cached);
    }
    const stale = !cached || !cached.cached_at || Date.now() - Number(cached.cached_at) > REFRESH_MS;
    if (force || stale) fetchHome(force).catch(() => {});
  }

  function exitHomeMode() {
    if (!panel) return;
    homeMode = false;
    const wrap = panel.querySelector('.gj-home-wrap');
    if (wrap) wrap.style.display = 'none';
    const toolbar = panel.querySelector('.gj-toolbar');
    const status = panel.querySelector('.gj-status');
    const list = panel.querySelector('.gj-list');
    if (toolbar) toolbar.style.display = '';
    if (status) status.style.display = '';
    if (list) list.style.display = 'block';
  }

  function paginateExistingList() {
    if (!panel || homeMode || paginateBusy) return;
    const detail = panel.querySelector('.gj-detail');
    const list = panel.querySelector('.gj-list');
    if (!list || (detail && getComputedStyle(detail).display !== 'none')) return;

    const items = [...list.querySelectorAll('.gj-item')].filter(item => !item.dataset.homeTemp);
    if (!items.length) return;

    paginateBusy = true;
    try {
      let count = Number(list.dataset.smhVisibleCount || HOME_LIMIT);
      count = Math.max(HOME_LIMIT, count);
      items.forEach((item, index) => { item.style.display = index < count ? '' : 'none'; });

      let button = list.querySelector('.gj-existing-more');
      if (items.length > count) {
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          button.className = 'gj-existing-more';
          button.textContent = 'View More';
          button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            list.dataset.smhVisibleCount = String(Number(list.dataset.smhVisibleCount || HOME_LIMIT) + PAGE_STEP);
            paginateExistingList();
          });
          list.appendChild(button);
        }
        button.style.display = 'block';
      } else if (button) {
        button.remove();
      }
    } finally {
      paginateBusy = false;
    }
  }

  function bindPanel(found) {
    if (!found || found.dataset.smhHomeBound === '1') return;
    panel = found;
    panel.dataset.smhHomeBound = '1';
    installStyles();
    ensureHomeWrap();

    panel.addEventListener('click', event => {
      const back = event.target.closest('.gj-back');
      if (back && panel.dataset.smhDetailFromHome === '1') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        showHome(false);
        panel.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const nav = event.target.closest('.gj-nav button[data-k]');
      if (!nav) return;
      panel.dataset.smhDetailFromHome = '0';
      if (nav.dataset.k === 'home') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        showHome(false);
      } else {
        exitHomeMode();
        const list = panel.querySelector('.gj-list');
        if (list) list.dataset.smhVisibleCount = String(HOME_LIMIT);
        setTimeout(paginateExistingList, 350);
      }
    }, true);

    new MutationObserver(mutations => {
      if (panel.classList.contains('show')) {
        const params = new URLSearchParams(location.search);
        const tab = params.get('gjTab');
        const detail = params.get('gjDetail');
        if (!detail && (tab === 'home' || !tab || (tab === 'jobs' && panel.dataset.smhOpenedOnce !== '1'))) {
          panel.dataset.smhOpenedOnce = '1';
          setTimeout(() => showHome(false), 80);
        } else if (!homeMode) {
          setTimeout(paginateExistingList, 60);
        }
      }

      if (!homeMode && mutations.some(m => m.type === 'childList' && m.target.closest?.('.gj-list'))) {
        const list = panel.querySelector('.gj-list');
        if (list && !list.querySelector('.gj-existing-more')) list.dataset.smhVisibleCount = String(HOME_LIMIT);
        setTimeout(paginateExistingList, 30);
      }
    }).observe(panel, { subtree: true, childList: true, attributes: true, attributeFilter: ['class','style'] });
  }

  new MutationObserver(() => {
    const found = document.querySelector(PANEL);
    if (found) bindPanel(found);
  }).observe(document.documentElement, { subtree: true, childList: true });

  const existing = document.querySelector(PANEL);
  if (existing) bindPanel(existing);

  setInterval(() => {
    if (panel?.classList.contains('show') && homeMode) fetchHome(true).catch(() => {});
  }, REFRESH_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !panel?.classList.contains('show') || !homeMode) return;
    if (Date.now() - lastFetchAt > 60 * 1000) fetchHome(true).catch(() => {});
  });
})();