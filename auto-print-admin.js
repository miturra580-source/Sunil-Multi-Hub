(function(){
  function safe(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function whenReady(){
    var root=document.querySelector('main.admin-page .container');
    if(!root||typeof sb==='undefined')return setTimeout(whenReady,700);
    var section=document.createElement('section');
    section.className='admin-card';
    section.id='autoPrintSubscriptionsAdmin';
    section.innerHTML='<div class="card-head"><div><h2>🖨️ Auto Print ₹149 Subscriptions</h2><p>3 दिन trial के बाद दुकानदार की payment request approve या reject करें।</p></div><button class="btn secondary" id="refreshAutoPrintPlans">Refresh</button></div><div id="autoPrintPlanRows"><p>Loading…</p></div>';
    root.insertBefore(section,root.children[2]||null);
    document.getElementById('refreshAutoPrintPlans').onclick=load;
    load();
  }
  async function load(){
    var wrap=document.getElementById('autoPrintPlanRows');if(!wrap)return;
    var result=await sb.from('auto_print_subscription_requests').select('id,user_id,amount,payment_ref,status,created_at').order('created_at',{ascending:false}).limit(100);
    if(result.error){wrap.innerHTML='<p>'+safe(result.error.message)+'</p>';return}
    var rows=result.data||[];
    wrap.innerHTML=rows.length?rows.map(function(r){return '<div class="admin-list-row" style="display:grid;grid-template-columns:1fr auto;gap:12px;padding:14px 0;border-top:1px solid #e7ebf2"><div><strong>₹'+Number(r.amount).toLocaleString('en-IN')+' • '+safe(r.payment_ref)+'</strong><small style="display:block;color:#667085">User: '+safe(r.user_id)+' • '+new Date(r.created_at).toLocaleString('en-IN')+'</small></div><div><span class="status-pill">'+safe(r.status)+'</span>'+(r.status==='pending'?'<button class="btn primary plan-review" data-id="'+r.id+'" data-ok="1">Approve 30 Days</button> <button class="btn secondary plan-review" data-id="'+r.id+'" data-ok="0">Reject</button>':'')+'</div></div>'}).join(''):'<p>कोई subscription request नहीं है।</p>';
    wrap.querySelectorAll('.plan-review').forEach(function(btn){btn.onclick=async function(){var ok=btn.dataset.ok==='1';if(!confirm(ok?'Payment verify करके 30 दिन activate करें?':'Request reject करें?'))return;btn.disabled=true;var response=await sb.rpc('review_auto_print_subscription_request',{p_request_id:btn.dataset.id,p_approve:ok});if(response.error){alert(response.error.message);btn.disabled=false;return}load()}});
  }
  document.addEventListener('DOMContentLoaded',whenReady);
})();
