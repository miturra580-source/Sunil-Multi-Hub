(() => {
  function isPanAadhaarOpen(){
    const service=(document.getElementById('applicationServiceName')?.textContent||'').toLowerCase();
    const variant=(document.getElementById('applicationVariantName')?.textContent||'').toLowerCase();
    return service.includes('pan') && variant.includes('aadhaar');
  }

  function findGroup(input){
    let el=input;
    for(let i=0;i<5 && el;i++,el=el.parentElement){
      const text=(el.textContent||'').toLowerCase();
      if(text.includes('aadhaar number') && text.includes('find pan by aadhaar')) return el;
    }
    return input.parentElement;
  }

  function clean(){
    if(!isPanAadhaarOpen()) return;
    const inputs=[...document.querySelectorAll('input')].filter(i=>{
      const ph=(i.getAttribute('placeholder')||'').toLowerCase();
      const label=(i.closest('label')?.textContent||'').toLowerCase();
      return ph.includes('aadhaar') || label.includes('aadhaar number');
    });
    if(inputs.length<=1) return;

    const groups=[];
    for(const input of inputs){
      const g=findGroup(input);
      if(g && !groups.includes(g)) groups.push(g);
    }
    groups.slice(1).forEach(g=>g.remove());

    const buttons=[...document.querySelectorAll('button')].filter(b=>(b.textContent||'').toLowerCase().includes('find pan by aadhaar'));
    buttons.slice(1).forEach(b=>{
      const g=findGroup(b.closest('div')?.querySelector('input')||b);
      if(g) g.remove(); else b.remove();
    });
  }

  const start=()=>{
    clean();
    const obs=new MutationObserver(()=>requestAnimationFrame(clean));
    obs.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',()=>setTimeout(clean,60),true);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();