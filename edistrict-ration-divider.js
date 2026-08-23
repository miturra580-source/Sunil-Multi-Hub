(() => {
  const RATION_RE = /राशन\s*कार्ड|पात्र\s*गृहस्थी|अन्त्योदय|अंत्योदय|ration/i;
  const RESIDENCE_RE = /निवास\s*प्रमाण|residence/i;

  function ensureStyle() {
    if (document.getElementById('smhRationDividerStyle')) return;
    const style = document.createElement('style');
    style.id = 'smhRationDividerStyle';
    style.textContent = `
      #variantCards .smh-ration-divider{
        grid-column:1 / -1;
        display:flex;
        align-items:center;
        gap:12px;
        margin:4px 0 2px;
        color:#315b1f;
        font-weight:800;
        font-size:14px;
        letter-spacing:.2px;
      }
      #variantCards .smh-ration-divider::before,
      #variantCards .smh-ration-divider::after{
        content:'';
        height:1px;
        flex:1;
        background:#cdddbf;
      }
      #variantCards .smh-ration-divider span{
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:7px 12px;
        border-radius:999px;
        background:#f3f8ee;
        border:1px solid #dbe8d0;
        white-space:nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  function cardTitle(card) {
    return (card?.querySelector('strong')?.textContent || card?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function applyDivider() {
    const grid = document.getElementById('variantCards');
    if (!grid) return;

    const heading = (document.getElementById('variantServiceName')?.textContent || '').toLowerCase();
    if (!heading.includes('edistrict')) return;

    const cards = [...grid.children].filter(el => !el.classList.contains('smh-ration-divider'));
    if (!cards.length) return;

    const rationCard = cards.find(card => RATION_RE.test(cardTitle(card)));
    if (!rationCard) return;

    const residenceIndex = cards.findIndex(card => RESIDENCE_RE.test(cardTitle(card)));
    const rationIndex = cards.indexOf(rationCard);
    if (residenceIndex < 0 || rationIndex <= residenceIndex) return;

    ensureStyle();

    let divider = grid.querySelector('.smh-ration-divider');
    if (!divider) {
      divider = document.createElement('div');
      divider.className = 'smh-ration-divider';
      divider.setAttribute('aria-label', 'Ration Card services');
      divider.innerHTML = '<span>🌾 राशन कार्ड</span>';
    }

    if (divider.nextElementSibling !== rationCard) {
      grid.insertBefore(divider, rationCard);
    }
  }

  function start() {
    const grid = document.getElementById('variantCards');
    if (!grid) return;

    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        applyDivider();
      });
    };

    applyDivider();
    new MutationObserver(schedule).observe(grid, { childList:true });
    document.addEventListener('click', () => setTimeout(schedule, 60), true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
