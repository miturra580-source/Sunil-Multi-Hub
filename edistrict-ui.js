(() => {
  const MAX_BYTES = 100 * 1024;
  const ALLOWED = ['image/jpeg', 'image/png'];

  function isEdistrictApplication() {
    const title = (document.getElementById('applicationServiceName')?.textContent || '').toLowerCase();
    return title.includes('edistrict') || title.includes('आय प्रमाण') || title.includes('जाति प्रमाण') || title.includes('निवास प्रमाण');
  }

  function ensureLegacyMarker() {
    const title = document.getElementById('applicationServiceName');
    if (!title || title.querySelector('.smh-cert-legacy-marker')) return;
    const marker = document.createElement('span');
    marker.className = 'smh-cert-legacy-marker';
    marker.textContent = ' आय जाति निवास';
    marker.hidden = true;
    title.appendChild(marker);
  }

  function ensureStyles() {
    if (document.getElementById('smhEdistrictUploadStyles')) return;
    const style = document.createElement('style');
    style.id = 'smhEdistrictUploadStyles';
    style.textContent = `
      #applicationBox.smh-edistrict-app #supportingDocumentsSection{
        padding:14px!important;border:1px solid #e3e8ef!important;border-radius:16px!important;background:#fafcff!important;
      }
      #applicationBox.smh-edistrict-app #supportingDocumentsSection [data-document-wrap]{
        display:grid!important;grid-template-columns:minmax(0,1fr) minmax(170px,230px)!important;
        align-items:center!important;gap:10px!important;padding:9px 0!important;margin:0!important;border-bottom:1px solid #edf0f4!important;
      }
      #applicationBox.smh-edistrict-app #supportingDocumentsSection [data-document-wrap]:last-child{border-bottom:0!important}
      #applicationBox.smh-edistrict-app #supportingDocumentsSection input[type=file]{
        width:100%!important;max-width:230px!important;padding:7px!important;margin:0!important;font-size:12px!important;
        border:1px solid #d7dee8!important;border-radius:10px!important;background:#fff!important;
      }
      #applicationBox.smh-edistrict-app .smh-file-note{font-size:11px;color:#667085;margin-top:8px;line-height:1.4}
      @media(max-width:560px){
        #applicationBox.smh-edistrict-app #supportingDocumentsSection [data-document-wrap]{grid-template-columns:1fr!important;gap:6px!important}
        #applicationBox.smh-edistrict-app #supportingDocumentsSection input[type=file]{max-width:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function showMessage(text) {
    if (typeof window.msg === 'function') window.msg(text);
    else alert(text);
  }

  function validateFile(input) {
    const file = input.files?.[0];
    if (!file) return true;
    const typeOk = ALLOWED.includes(file.type) || /\.(jpe?g|png)$/i.test(file.name || '');
    if (!typeOk) {
      input.value = '';
      showMessage('केवल JPG या PNG फाइल अपलोड करें।');
      return false;
    }
    if (file.size > MAX_BYTES) {
      input.value = '';
      showMessage('फाइल 100 KB से अधिक नहीं हो सकती।');
      return false;
    }
    return true;
  }

  function enhance() {
    if (!isEdistrictApplication()) return;
    ensureLegacyMarker();
    ensureStyles();
    const box = document.getElementById('applicationBox');
    if (box) box.classList.add('smh-edistrict-app');

    const email = document.querySelector('#beneficiaryFields [name="email"]');
    const emailWrap = email?.closest('[data-field-wrap]') || email?.parentElement;
    if (emailWrap) emailWrap.style.display = 'none';

    const applicant = document.querySelector('#beneficiaryFields [name="applicant_name"]');
    if (applicant) applicant.placeholder = '';

    const section = document.getElementById('supportingDocumentsSection');
    if (section && !section.querySelector('.smh-file-note')) {
      const note = document.createElement('div');
      note.className = 'smh-file-note';
      note.textContent = 'केवल JPG/PNG • अधिकतम 100 KB प्रति दस्तावेज़';
      const h = section.querySelector('h3');
      if (h) h.insertAdjacentElement('afterend', note); else section.prepend(note);
    }

    document.querySelectorAll('#supportingDocumentsSection input[type="file"]').forEach(input => {
      input.accept = '.jpg,.jpeg,.png,image/jpeg,image/png';
      if (input.dataset.smh100kb === '1') return;
      input.dataset.smh100kb = '1';
      input.addEventListener('change', () => validateFile(input));
    });
  }

  document.addEventListener('change', event => {
    const input = event.target.closest?.('#supportingDocumentsSection input[type="file"]');
    if (input && isEdistrictApplication()) validateFile(input);
  }, true);

  function start() {
    enhance();
    new MutationObserver(() => requestAnimationFrame(enhance)).observe(document.body, {childList:true, subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();