(() => {
  const PANEL = '#smhGovJobsPanel';
  const qs = () => new URLSearchParams(location.search);

  const setState = (patch = {}) => {
    const u = new URL(location.href);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    });
    history.replaceState(null, '', u);
  };

  const TREND_JUNK = /^(about us|terms(?: and| &) conditions|privacy policy|contact us|disclaimer|sitemap|home|menu|tools?|download app|join (?:telegram|whatsapp)|skip to content)$/i;
  const TREND_SIGNAL = /(20\d{2}|recruit|vacancy|online form|admit|result|exam|answer key|job|post|clerk|group|constable|teacher|engineer|officer|assistant|apprentice|railway|ssc|upsc|uppsc|upsssc|ibps|rrb|ntpc|police|army|navy|air force|patwari|tgt|pgt)/i;

  function installStyle() {
    if (document.getElementById('gjEnhanceStyle')) return;

    const s = document.createElement('style');
    s.id = 'gjEnhanceStyle';
    s.textContent = `
      #smhGovJobsPanel{width:100vw!important;height:100dvh!important;max-width:none!important;overflow:auto!important;background:#fff!important}
      #smhGovJobsPanel .gj-shell{width:100%!important;max-width:none!important;min-height:100dvh!important;margin:0!important;box-shadow:none!important}
      #smhGovJobsPanel .gj-top{position:sticky;top:0;z-index:20}
      #smhGovJobsPanel .gj-nav{position:sticky;top:82px;z-index:19}
      #smhGovJobsPanel .gj-content{max-width:1180px;margin:0 auto;padding-left:16px!important;padding-right:16px!important}
      #smhGovJobsPanel .gj-toolbar,#smhGovJobsPanel .gj-status,#smhGovJobsPanel .gj-intro{max-width:1180px;margin-left:auto!important;margin-right:auto!important}

      #smhGovJobsPanel .gj-trending{
        max-width:1180px;
        margin:12px auto 16px!important;
        border:0!important;
        background:transparent!important;
        padding:0 16px!important;
        text-align:left!important;
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:8px;
      }
      #smhGovJobsPanel .gj-trending::before{
        content:'Latest / Trending Updates';
        grid-column:1 / -1;
        display:block;
        background:#8b0000;
        color:#fff;
        font-weight:900;
        text-align:center;
        padding:10px;
        border-radius:7px 7px 0 0;
        margin:0 0 2px;
        font-size:18px;
      }
      #smhGovJobsPanel .gj-trending button{
        display:flex!important;
        align-items:center;
        justify-content:center;
        width:100%;
        min-height:62px;
        padding:10px!important;
        border-radius:6px!important;
        color:#fff!important;
        text-decoration:none!important;
        font-weight:800!important;
        line-height:1.25!important;
        text-align:center!important;
        background:#9f1239!important;
        border:1px solid rgba(0,0,0,.12)!important;
      }
      #smhGovJobsPanel .gj-trending button:nth-child(2){background:#b45309!important}
      #smhGovJobsPanel .gj-trending button:nth-child(3){background:#7e22ce!important}
      #smhGovJobsPanel .gj-trending button:nth-child(4){background:#1d4ed8!important}
      #smhGovJobsPanel .gj-trending button:nth-child(5){background:#0f766e!important}
      #smhGovJobsPanel .gj-trending button:nth-child(6){background:#0369a1!important}
      #smhGovJobsPanel .gj-trending button:nth-child(7){background:#9f1239!important}
      #smhGovJobsPanel .gj-trending button:nth-child(8){background:#166534!important}

      #smhGovJobsPanel .gj-detail-card{width:100%!important;max-width:1180px!important;margin:0 auto!important}
      #smhGovJobsPanel .gj-table-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch}

      @media(max-width:760px){
        #smhGovJobsPanel .gj-top{position:relative!important}
        #smhGovJobsPanel .gj-nav{top:0!important}
        #smhGovJobsPanel .gj-trending{grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:0 10px!important}
        #smhGovJobsPanel .gj-trending button{min-height:68px;font-size:12px!important}
        #smhGovJobsPanel .gj-content{padding-left:8px!important;padding-right:8px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function trendCandidates(panel) {
    const all = [...panel.querySelectorAll('.gj-list .gj-item')]
      .map(b => ({
        title: String(b.textContent || '').replace(/\s+/g, ' ').trim(),
        url: b.dataset.url || ''
      }))
      .filter(x => x.title && !TREND_JUNK.test(x.title));

    const useful = all.filter(x => TREND_SIGNAL.test(x.title));
    return (useful.length >= 8 ? useful : [...useful, ...all.filter(x => !useful.includes(x))]).slice(0, 8);
  }

  function rebuildTrending(panel) {
    const trend = panel.querySelector('.gj-trending');
    if (!trend) return;

    const chosen = trendCandidates(panel);
    if (!chosen.length) return;

    const signature = chosen.map(x => `${x.url}::${x.title}`).join('|');
    const hasSeparatorText = [...trend.childNodes].some(
      n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()
    );
    const current = [...trend.querySelectorAll(':scope > button')]
      .map(b => `${b.dataset.url || ''}::${String(b.textContent || '').replace(/\s+/g, ' ').trim()}`)
      .join('|');

    if (!hasSeparatorText && current === signature) {
      trend.dataset.enhanced = '1';
      trend.dataset.signature = signature;
      return;
    }

    const frag = document.createDocumentFragment();
    chosen.forEach(item => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.url = item.url;
      b.textContent = item.title;
      frag.appendChild(b);
    });

    trend.replaceChildren(frag);
    trend.dataset.enhanced = '1';
    trend.dataset.signature = signature;
    trend.title = 'Latest updates refresh automatically from live source';
  }

  function tabFromPanel(panel) {
    return panel.querySelector('.gj-nav button.active')?.dataset.k || 'jobs';
  }

  function watchPanel(panel) {
    if (panel.dataset.enhanceWatch === '1') return;
    panel.dataset.enhanceWatch = '1';

    panel.addEventListener('click', e => {
      const nav = e.target.closest('.gj-nav button[data-k]');
      if (nav) setState({ gov: '1', gjTab: nav.dataset.k, gjDetail: null });

      const item = e.target.closest('.gj-item[data-url],.gj-trending button[data-url]');
      if (item?.dataset.url) {
        setState({ gov: '1', gjTab: tabFromPanel(panel), gjDetail: item.dataset.url });
      }

      const internal = e.target.closest('[data-internal-url]');
      if (internal?.dataset.internalUrl) {
        setState({ gov: '1', gjTab: tabFromPanel(panel), gjDetail: internal.dataset.internalUrl });
      }

      if (e.target.closest('.gj-back')) setState({ gov: '1', gjTab: tabFromPanel(panel), gjDetail: null });
      if (e.target.closest('.gj-close')) setState({ gov: null, gjTab: null, gjDetail: null });
    }, true);

    let queued = false;
    new MutationObserver(() => {
      if (!panel.classList.contains('show')) return;
      setState({ gov: '1', gjTab: tabFromPanel(panel) });
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        rebuildTrending(panel);
      });
    }).observe(panel, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  function restore() {
    const p = qs();
    if (p.get('gov') !== '1') return;

    const tryOpen = () => {
      if (typeof window.openGovernmentJobsLive !== 'function') {
        return setTimeout(tryOpen, 120);
      }

      window.openGovernmentJobsLive();
      const panel = document.querySelector(PANEL);
      if (!panel) return;

      const tab = p.get('gjTab') || 'jobs';
      setTimeout(() => {
        panel.querySelector(`.gj-nav button[data-k="${CSS.escape(tab)}"]`)?.click();
      }, 180);

      const detail = p.get('gjDetail');
      if (detail) {
        let tries = 0;
        const go = () => {
          tries++;
          const btn = [...panel.querySelectorAll('.gj-item[data-url],.gj-trending button[data-url]')]
            .find(b => b.dataset.url === detail);
          if (btn) {
            btn.click();
            return;
          }
          if (tries < 30) setTimeout(go, 250);
        };
        setTimeout(go, 500);
      }
    };

    tryOpen();
  }

  installStyle();

  new MutationObserver(() => {
    const p = document.querySelector(PANEL);
    if (p) {
      watchPanel(p);
      rebuildTrending(p);
    }
  }).observe(document.documentElement, { subtree: true, childList: true });

  const existing = document.querySelector(PANEL);
  if (existing) watchPanel(existing);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore, { once: true });
  } else {
    restore();
  }
})();