(() => {
  const SERVICE_RE = /आय.*जाति.*निवास|जाति.*निवास.*आय|निवास.*आय.*जाति/;

  function enhance() {
    const box = document.getElementById('variantBox');
    const title = document.getElementById('variantServiceName');
    const cards = document.getElementById('variantCards');
    if (!box || !title || !cards || !SERVICE_RE.test(title.textContent || '')) return;

    box.classList.add('smh-certificate-box');
    if (!document.getElementById('smhCertificateStyles')) {
      const style = document.createElement('style');
      style.id='smhCertificateStyles';
      style.textContent=`
        #variantBox.smh-certificate-box{width:min(760px,100%)!important;background:linear-gradient(180deg,#f8fbff,#fff)!important}
        #variantBox.smh-certificate-box #variantCards{grid-template-columns:repeat(3,minmax(0,1fr))!important}
        #variantBox.smh-certificate-box .variant-select-btn{border-radius:18px!important;min-height:150px!important;box-shadow:0 10px 24px rgba(25,60,120,.07)!important}
        .smh-cert-docs{margin-top:18px;padding-top:16px;border-top:1px solid #dfe6f0}.smh-cert-docs h3{margin:0 0 10px}.smh-cert-doc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.smh-cert-doc{padding:10px 12px;border:1px solid #e5eaf2;border-radius:12px;background:#fff;font-size:12px;font-weight:700;color:#475467}
        @media(max-width:560px){#variantBox.smh-certificate-box #variantCards{grid-template-columns:1fr!important}.smh-cert-doc-grid{grid-template-columns:1fr}}
      `;
      document.head.appendChild(style);
    }

    if (!box.querySelector('.smh-cert-docs')) {
      const docs=document.createElement('section');
      docs.className='smh-cert-docs';
      docs.innerHTML=`<h3>📄 आवश्यक दस्तावेज़</h3><div class="smh-cert-doc-grid"><div class="smh-cert-doc">✓ आधार कार्ड</div><div class="smh-cert-doc">✓ फोटो</div><div class="smh-cert-doc">✓ मोबाइल नंबर</div><div class="smh-cert-doc">✓ राशन कार्ड / परिवार दस्तावेज़</div><div class="smh-cert-doc">✓ संबंधित आय / जाति / निवास प्रमाण</div><div class="smh-cert-doc">✓ अन्य सहायक दस्तावेज़</div></div><p style="font-size:11px;color:#667085;line-height:1.45;margin:10px 0 0">दस्तावेज़ upload optional रहेगा। eDistrict पर Aadhaar OTP की जरूरत होने पर OTP वहीं manual दर्ज किया जाएगा।</p>`;
      cards.insertAdjacentElement('afterend',docs);
    }
  }

  const start=()=>{enhance();new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();