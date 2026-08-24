(() => {
  const PANEL = '#smhGovJobsPanel';
  const JUNK = /^(about us|terms(?: and| &) conditions|privacy(?: policy)?|contact(?: us)?|disclaimer|cookie policy|advertise|dmca|career|careers|sitemap|skip to content|home|menu)$/i;

  const RULES = {
    syllabus: /(syllabus|पाठ्यक्रम|exam pattern|pattern)/i,
    answer: /(answer key|response sheet|उत्तर कुंजी|objection)/i,
    admit: /(admit card|hall ticket|exam city|city intimation|call letter|प्रवेश पत्र)/i,
    result: /(result|merit|marks|score\s*card|cut\s*off|cutoff|परिणाम)/i,
    admission: /(admission|counsell?ing|seat allotment|entrance|college|university|neet|jee|clat|cat)/i
  };

  function activeKey(panel) {
    return panel?.querySelector('.gj-nav button.active')?.dataset.k || '';
  }

  function cleanText(text = '') {
    return String(text).replace(/\s+/g, ' ').trim();
  }

  function isJunk(text) {
    const value = cleanText(text);
    return !value || JUNK.test(value);
  }

  function isRelevant(key, text) {
    if (!key || key === 'home' || key === 'jobs') return true;
    const rule = RULES[key];
    return rule ? rule.test(cleanText(text)) : true;
  }

  function cleanCategoryList(panel) {
    if (!panel) return;
    const key = activeKey(panel);
    const list = panel.querySelector('.gj-list');
    if (!list) return;

    [...list.querySelectorAll('.gj-item')].forEach(item => {
      const text = cleanText(item.textContent);
      if (isJunk(text) || !isRelevant(key, text)) item.remove();
    });

    const remaining = [...list.querySelectorAll('.gj-item')];
    if (remaining.length && remaining.length <= 10) {
      list.querySelector('.gj-existing-more')?.remove();
    }
  }

  function cleanHomeCards(panel) {
    if (!panel) return;
    panel.querySelectorAll('.gj-home-card').forEach(card => {
      const key = card.dataset.sectionKey || '';
      [...card.querySelectorAll('.gj-home-link')].forEach(item => {
        const text = cleanText(item.textContent);
        if (isJunk(text) || !isRelevant(key, text)) item.remove();
      });
      const links = card.querySelectorAll('.gj-home-link');
      if (!links.length) {
        const box = card.querySelector('.gj-home-links');
        if (box) box.innerHTML = '<div class="gj-home-empty">कोई नई जानकारी नहीं मिली।</div>';
        card.querySelector('.gj-home-more-row')?.remove();
      }
    });
  }

  function cleanTrending(panel) {
    if (!panel) return;
    [...panel.querySelectorAll('.gj-trending button')].forEach(item => {
      if (isJunk(item.textContent)) item.remove();
    });
  }

  function run(panel) {
    cleanCategoryList(panel);
    cleanHomeCards(panel);
    cleanTrending(panel);
  }

  function bind(panel) {
    if (!panel || panel.dataset.smhCleanupBound === '1') return;
    panel.dataset.smhCleanupBound = '1';
    let timer = null;
    const queue = () => {
      clearTimeout(timer);
      timer = setTimeout(() => run(panel), 30);
    };
    panel.addEventListener('click', queue, true);
    new MutationObserver(queue).observe(panel, { subtree: true, childList: true, attributes: true, attributeFilter: ['class','style'] });
    queue();
  }

  new MutationObserver(() => {
    const panel = document.querySelector(PANEL);
    if (panel) bind(panel);
  }).observe(document.documentElement, { subtree: true, childList: true });

  const existing = document.querySelector(PANEL);
  if (existing) bind(existing);
})();