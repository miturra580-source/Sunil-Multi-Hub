(() => {
  const PAN_NAME_RE = /pan/i;

  function injectStyles() {
    if (document.getElementById('smhPanUiStyles')) return;
    const style = document.createElement('style');
    style.id = 'smhPanUiStyles';
    style.textContent = `
      #variantBox.smh-pan-box{width:min(760px,100%)!important;padding:18px!important;background:linear-gradient(180deg,#f8fbff 0%,#fff 100%)!important}
      #variantBox.smh-pan-box #variantCards{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;margin-top:16px!important}
      #variantBox.smh-pan-box .variant-select-btn{position:relative!important;min-height:150px!important;border:1px solid #e2e8f0!important;border-radius:20px!important;padding:16px!important;background:#fff!important;box-shadow:0 10px 26px rgba(28,54,108,.07)!important;transition:.18s ease!important;overflow:hidden!important}
      #variantBox.smh-pan-box .variant-select-btn:hover{transform:translateY(-2px)!important;border-color:#c9d7ff!important;box-shadow:0 14px 30px rgba(28,54,108,.11)!important}
      #variantBox.smh-pan-box .variant-select-btn::after{content:'›';position:absolute;right:14px;top:14px;width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:#f3f6fb;color:#3157d8;font-size:20px;font-weight:900}
      #variantBox.smh-pan-box .smh-pan-icon{width:46px!important;height:46px!important;display:grid!important;place-items:center!important;border-radius:14px!important;margin:0 0 12px!important;font-size:24px!important;background:linear-gradient(145deg,#edf3ff,#f8fbff)!important;border:1px solid #e1e8ff!important}
      #variantBox.smh-pan-box .variant-select-btn strong{font-size:15px!important;line-height:1.35!important;padding-right:34px!important}
      #variantBox.smh-pan-box .variant-select-btn small{font-size:12px!important;line-height:1.45!important}
      #variantBox.smh-pan-box .smh-pan-tag{display:inline-flex;align-items:center;margin-top:9px;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:900;background:#eef4ff;color:#3157d8}
      #variantBox.smh-pan-box .smh-pan-docs{margin-top:18px;padding-top:17px;border-top:1px solid #dfe6f0}
      #variantBox.smh-pan-box .smh-pan-docs h3{margin:0 0 12px;font-size:16px;color:#172033}
      #variantBox.smh-pan-box .smh-pan-doc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      #variantBox.smh-pan-box .smh-pan-doc-item{display:flex;align-items:center;gap:8px;padding:10px 11px;border:1px solid #e4eaf2;border-radius:12px;background:#fff;color:#475467;font-size:12px;font-weight:700}
      #variantBox.smh-pan-box .smh-pan-doc-item span:first-child{color:#16794b;font-weight:900}
      #variantBox.smh-pan-box .smh-pan-note{margin-top:10px;padding:10px 12px;border-radius:14px;background:#fff8e8;border:1px solid #f7e3ae;color:#775514;font-size:11px;line-height:1.45}
      @media(max-width:560px){
        #variantBox.smh-pan-box{padding:14px!important;border-radius:22px 22px 0 0!important}
        #variantBox.smh-pan-box #variantCards{grid-template-columns:1fr 1fr!important;gap:9px!important}
        #variantBox.smh-pan-box .variant-select-btn{min-height:142px!important;padding:12px!important;border-radius:16px!important}
        #variantBox.smh-pan-box .smh-pan-icon{width:40px!important;height:40px!important;font-size:21px!important;border-radius:12px!important;margin-bottom:9px!important}
        #variantBox.smh-pan-box .variant-select-btn strong{font-size:13px!important;padding-right:22px!important}
        #variantBox.smh-pan-box .variant-select-btn small{font-size:10.5px!important}
        #variantBox.smh-pan-box .variant-select-btn::after{width:23px;height:23px;right:9px;top:9px;font-size:17px}
        #variantBox.smh-pan-box .smh-pan-tag{font-size:9px;padding:4px 6px}
        #variantBox.smh-pan-box .smh-pan-doc-grid{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function getIcon(text) {
    const t = String(text || '').toLowerCase();
    if (t.includes('minor')) return '🧒';
    if (t.includes('correction') || t.includes('change')) return '✏️';
    if (t.includes('detail')) return '🔍';
    if (t.includes('track')) return '📍';
    if (t.includes('find')) return '🕵️';
    if (t.includes('download') || t.includes('pdf')) return '📥';
    if (t.includes('itr')) return '🧾';
    if (t.includes('e-pan') || t.includes('epan')) return '📧';
    if (t.includes('new pan')) return '🆕';
    return '🪪';
  }

  function getTag(text) {
    const t = String(text || '').toLowerCase();
    if (t.includes('find')) return 'Aadhaar Based';
    if (t.includes('detail')) return 'Quick Check';
    if (t.includes('track')) return 'Status';
    if (t.includes('download') || t.includes('pdf')) return 'Download';
    if (t.includes('itr')) return 'Tax Service';
    if (t.includes('minor')) return 'Minor';
    if (t.includes('correction') || t.includes('change')) return 'Update';
    if (t.includes('e-pan') || t.includes('epan')) return 'Digital PAN';
    return 'Application';
  }

  function addDocuments(box, cards) {
    let docs = box.querySelector('.smh-pan-docs');
    if (docs) return;

    docs = document.createElement('section');
    docs.className = 'smh-pan-docs';
    docs.innerHTML = `
      <h3>📄 आवश्यक दस्तावेज़</h3>
      <div class="smh-pan-doc-grid">
        <div class="smh-pan-doc-item"><span>✓</span><span>आधार कार्ड</span></div>
        <div class="smh-pan-doc-item"><span>✓</span><span>फोटो</span></div>
        <div class="smh-pan-doc-item"><span>✓</span><span>मोबाइल नंबर</span></div>
        <div class="smh-pan-doc-item"><span>✓</span><span>ईमेल ID</span></div>
        <div class="smh-pan-doc-item"><span>✓</span><span>आवश्यकतानुसार पहचान / पता प्रमाण</span></div>
      </div>
      <div class="smh-pan-note">ℹ️ अलग-अलग PAN services में documents और eligibility अलग हो सकते हैं। Aadhaar/PAN आधारित sensitive lookup केवल authorized provider/API उपलब्ध होने पर real-time चलेगा।</div>
    `;
    cards.insertAdjacentElement('afterend', docs);
  }

  function enhancePanPanel() {
    const box = document.getElementById('variantBox');
    const title = document.getElementById('variantServiceName');
    const cards = document.getElementById('variantCards');
    if (!box || !title || !cards) return;

    const isPan = PAN_NAME_RE.test(title.textContent || '');
    if (!isPan) {
      box.classList.remove('smh-pan-box');
      box.dataset.smhPanEnhanced = '';
      box.querySelector('.smh-pan-docs')?.remove();
      return;
    }

    box.classList.add('smh-pan-box');

    const subtitle = title.parentElement?.querySelector('p');
    if (subtitle && !subtitle.dataset.smhPanText) {
      subtitle.textContent = 'PAN से जुड़ी सेवा चुनें — आवेदन, correction, verification, download और tracking एक ही जगह।';
      subtitle.dataset.smhPanText = '1';
    }

    cards.querySelectorAll('.variant-select-btn').forEach(btn => {
      if (btn.dataset.smhPanEnhanced === '1') return;
      const text = btn.innerText || '';
      const firstIcon = btn.querySelector('span');
      if (firstIcon) {
        firstIcon.classList.add('smh-pan-icon');
        firstIcon.textContent = getIcon(text);
      }
      const tag = document.createElement('span');
      tag.className = 'smh-pan-tag';
      tag.textContent = getTag(text);
      btn.appendChild(tag);
      btn.dataset.smhPanEnhanced = '1';
    });

    addDocuments(box, cards);
    box.dataset.smhPanEnhanced = '1';
  }

  injectStyles();

  function start() {
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(enhancePanPanel);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('click', () => {
      setTimeout(enhancePanPanel, 260);
    }, true);

    enhancePanPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
