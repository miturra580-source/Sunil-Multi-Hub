(function(){
  function apply(){
    const services=document.querySelector('.service-options');
    if(services){
      const smart=services.querySelector('.smart-id-select');
      const labels=[...services.querySelectorAll('label')];
      const a4=labels.find(l=>l.querySelector('input[name="service"][value="a4"]'));
      const pdf=labels.find(l=>l.querySelector('input[name="service"][value="pdf"]'));
      const oldId=labels.find(l=>l.querySelector('input[name="service"][value="id_card"]'));
      if(oldId)oldId.style.display='none';
      if(smart&&a4&&pdf){
        const visible=[...services.children].filter(el=>el!==oldId&&el.style.display!=='none');
        if(visible[0]!==smart||visible[1]!==a4||visible[2]!==pdf){
          services.insertBefore(smart,services.firstChild);
          services.insertBefore(a4,smart.nextSibling);
          services.insertBefore(pdf,a4.nextSibling);
        }
      }
    }

    const panel=document.querySelector('.smart-id-panel');
    if(panel){
      const cr80=[...panel.querySelectorAll('#sidPresets button')].find(b=>/CR80|PVC/i.test(b.textContent||''));
      if(cr80)cr80.remove();
      const aadhaar=[...panel.querySelectorAll('#sidPresets button')].find(b=>/Aadhaar/i.test(b.textContent||''));
      if(aadhaar&&!panel.querySelector('#sidPresets button.active'))aadhaar.classList.add('active');
    }

    const oldPreset=document.getElementById('cardPreset');
    if(oldPreset){
      const cr80=oldPreset.querySelector('option[value="cr80"]');
      if(cr80)cr80.remove();
      if(!oldPreset.value||oldPreset.value==='cr80')oldPreset.value='aadhaar';
    }
  }
  apply();
  const mo=new MutationObserver(()=>requestAnimationFrame(apply));
  mo.observe(document.documentElement,{childList:true,subtree:true});
})();