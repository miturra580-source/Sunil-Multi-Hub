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
        display:none!important;
      }
      #applicationBox.smh-edistrict-app #supportingDocumentsSection > h1,
      #applicationBox.smh-edistrict-app #supportingDocumentsSection > h2,
      #applicationBox.smh-edistrict-app #supportingDocumentsSection > h3,
      #applicationBox.smh-edistrict-app #supportingDocumentsSection > h4,
      #applicationBox.smh-edistrict-app #supportingDocumentsSection > p{
        display:none!important;
      }
      #applicationBox.smh-edistrict-app #supportingDocumentsSection .smh-doc-picker,
      #applicationBox.smh-edistrict-app #supportingDocumentsSection .smh-upload-quality-warning{
        display:block!important;
      }
      #applicationBox.smh-edistrict-app .smh-file-note{display:none!important}
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
    if (section) {
      section.querySelectorAll('[data-document-wrap]').forEach(el => el.style.setProperty('display','none','important'));
      [...section.children].forEach(el => {
        if (el.classList?.contains('smh-doc-picker') || el.classList?.contains('smh-upload-quality-warning')) return;
        if (/^H[1-6]$/.test(el.tagName) || el.tagName === 'P') el.style.setProperty('display','none','important');
      });
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