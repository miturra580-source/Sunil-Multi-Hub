(() => {
  const TARGET = 'वोटर ID सेवाएँ';
  const PANEL_ID = 'smhVoterEciPanel';
  const SERVICE_ID = '45ed1c1b-228e-4610-ac0a-3e397456656f';
  const CHARGE = 20;
  let sb = null;
  let busy = false;

  const SERVICES = [
    { icon:'🆕', title:'New Voter ID', desc:'18+ नागरिक के लिए नया voter registration (Form 6).', url:'https://voters.eci.gov.in/form6', key:'form6' },
    { icon:'✏️', title:'Voter ID Correction / Shift', desc:'नाम, पता, फोटो, अन्य correction या residence shift (Form 8).', url:'https://voters.eci.gov.in/form8', key:'form8-correction' },
    { icon:'📱', title:'Mobile Number Correction', desc:'Existing voter record में mobile number correction/update के लिए Form 8.', url:'https://voters.eci.gov.in/form8', key:'form8-mobile' },
    { icon:'🪪', title:'Replacement Voter ID', desc:'Lost/damaged EPIC replacement के लिए Form 8.', url:'https://voters.eci.gov.in/form8', key:'form8-replacement' },
    { icon:'⬇️', title:'Download e-EPIC', desc:'Digital Voter ID (e-EPIC) download करें.', url:'https://voters.eci.gov.in/home/e-epic-download', key:'eepic' },
    { icon:'🔎', title:'Search Name in Voter List', desc:'नाम/EPIC से electoral roll में अपनी entry खोजें.', url:'https://electoralsearch.eci.gov.in/', key:'search-roll' },
    { icon:'📍', title:'Track Application Status', desc:'Submitted voter application का status track करें.', url:'https://voters.eci.gov.in/track-status', key:'track' },
    { icon:'📄', title:'Download Electoral Roll', desc:'Official electoral roll PDF download करें.', url:'https://voters.eci.gov.in/download-eroll', key:'eroll' }
  ];

  function client(){
    if (sb) return sb;
    const cfg = window.SMH_CONFIG || {};
    if (!window.supabase || !cfg.supabaseUrl || !(cfg.supabaseAnonKey || cfg.supabaseKey)) throw new Error('Portal config missing');
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey || cfg.supabaseKey, {auth:{persistSession:true,autoRefreshToken:true}});
    return sb;
  }

  function toast(msg){
    const el = document.getElementById('toast');
    if (el) { el.textContent = msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2800); }
    else alert(msg);
  }

  function makeRef(key){
    return `voter:${key}:${Date.now()}:${Math.random().toString(36).slice(2,8)}`;
  }

  async function chargeAndOpen(item, button){
    if (busy || !item?.url) return;
    busy = true;
    const old = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Processing ₹20…'; }

    // Open synchronously so browsers do not block the ECI tab after async wallet debit.
    const target = window.open('about:blank', '_blank');
    try {
      const api = client();
      const { data:{ session }, error:sessionError } = await api.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('Please login again');

      const { data, error } = await api.rpc('debit_wallet_for_service', {
        p_service_id: SERVICE_ID,
        p_request_reference: makeRef(item.key)
      });
      if (error) throw error;
      if (!data?.success) {
        if (target) target.close();
        if (data?.code === 'INSUFFICIENT_BALANCE') {
          toast(`Wallet balance कम है। ₹${CHARGE} आवश्यक है।`);
          return;
        }
        throw new Error(data?.message || 'Payment failed');
      }

      if (target) {
        target.opener = null;
        target.location.replace(item.url);
      } else {
        location.href = item.url;
      }
      toast(`₹${CHARGE} deducted • ECI service opened`);
      try { window.dispatchEvent(new CustomEvent('smh-wallet-updated', {detail:{balance:data.balance_after}})); } catch(_) {}
    } catch (err) {
      if (target) target.close();
      const message = String(err?.message || 'Service open failed');
      if (/insufficient/i.test(message)) toast(`Wallet balance कम है। ₹${CHARGE} आवश्यक है।`);
      else toast(message);
    } finally {
      busy = false;
      if (button) { button.disabled = false; button.textContent = old; }
    }
  }

  function ensurePanel(){
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    const style = document.createElement('style');
    style.id = 'smhVoterEciStyle';
    style.textContent = `
      #${PANEL_ID}{position:fixed;inset:0;z-index:32100;background:#f5f7fb;display:none;overflow:auto;font-family:Arial,Helvetica,sans-serif;color:#172033}
      #${PANEL_ID}.show{display:block}
      #${PANEL_ID} .ve-shell{max-width:1120px;min-height:100%;margin:auto;background:#fff}
      #${PANEL_ID} .ve-head{position:sticky;top:0;z-index:5;background:linear-gradient(135deg,#ff7a00,#138808);color:#fff;padding:18px 56px 16px 18px;box-shadow:0 4px 14px rgba(0,0,0,.16)}
      #${PANEL_ID} .ve-head small{display:block;font-weight:800;opacity:.9;margin-bottom:4px}
      #${PANEL_ID} .ve-head h2{margin:0;font-size:25px}
      #${PANEL_ID} .ve-head p{margin:6px 0 0;font-size:13px;line-height:1.5}
      #${PANEL_ID} .ve-close{position:absolute;right:14px;top:14px;width:38px;height:38px;border:0;border-radius:50%;background:#fff;color:#123;font-size:24px;cursor:pointer}
      #${PANEL_ID} .ve-info{margin:15px 16px;padding:13px 14px;border-radius:14px;background:#eef5ff;border:1px solid #d5e3f8;font-size:13px;line-height:1.55}
      #${PANEL_ID} .ve-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:0 16px 18px}
      #${PANEL_ID} .ve-card{border:1px solid #e1e7f0;border-radius:18px;padding:16px;background:#fff;box-shadow:0 8px 24px rgba(30,55,95,.06);display:flex;flex-direction:column;min-height:190px}
      #${PANEL_ID} .ve-icon{font-size:28px}
      #${PANEL_ID} .ve-card h3{margin:9px 0 6px;font-size:16px}
      #${PANEL_ID} .ve-card p{margin:0;color:#667085;font-size:12.5px;line-height:1.55;flex:1}
      #${PANEL_ID} .ve-price{margin-top:11px;font-size:14px;font-weight:900;color:#138808}
      #${PANEL_ID} .ve-action{margin-top:10px;width:100%;border:0;border-radius:10px;background:#1557d6;color:#fff;padding:11px;font-weight:900;cursor:pointer}
      #${PANEL_ID} .ve-action:disabled{opacity:.55;cursor:not-allowed}
      #${PANEL_ID} .ve-foot{padding:0 16px 22px;text-align:center;color:#667085;font-size:11px;line-height:1.5}
      @media(max-width:820px){#${PANEL_ID} .ve-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){#${PANEL_ID} .ve-grid{grid-template-columns:1fr;padding:0 10px 14px}#${PANEL_ID} .ve-info{margin:12px 10px}#${PANEL_ID} .ve-head h2{font-size:21px}}
    `;
    document.head.appendChild(style);

    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="ve-shell">
        <header class="ve-head">
          <small>Election Commission of India • Citizen Services</small>
          <h2>वोटर ID सेवाएँ</h2>
          <p>Service चुनें। ₹20 wallet से deduct होने के बाद वही संबंधित official ECI service सीधे खुलेगी।</p>
          <button type="button" class="ve-close" aria-label="Close">×</button>
        </header>
        <div class="ve-info"><b>प्रति सेवा ₹20</b> • Login/OTP/form submission Election Commission of India के official portal पर ही होगा।</div>
        <div class="ve-grid">
          ${SERVICES.map((s,i)=>`<article class="ve-card"><div class="ve-icon">${s.icon}</div><h3>${s.title}</h3><p>${s.desc}</p><div class="ve-price">₹20</div><button type="button" class="ve-action" data-index="${i}">Open Service ↗</button></article>`).join('')}
        </div>
        <div class="ve-foot">Multi Hub ECI credentials, OTP या voter portal password collect नहीं करता। Final application official ECI portal पर ही submit होगी।</div>
      </div>`;
    panel.querySelector('.ve-close').addEventListener('click', closePanel);
    panel.addEventListener('click', e => {
      const btn = e.target.closest('.ve-action[data-index]');
      if (!btn) return;
      e.preventDefault();
      const item = SERVICES[Number(btn.dataset.index)];
      if (item) chargeAndOpen(item, btn);
    });
    document.body.appendChild(panel);
    return panel;
  }

  function openPanel(){ ensurePanel().classList.add('show'); document.body.style.overflow='hidden'; }
  function closePanel(){ document.getElementById(PANEL_ID)?.classList.remove('show'); document.body.style.overflow=''; }

  document.addEventListener('click', e => {
    const card = e.target.closest('.portal-service-card');
    if (!card) return;
    const title = String(card.querySelector('strong')?.textContent || card.textContent || '').replace(/\s+/g,' ').trim();
    if (title !== TARGET) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openPanel();
  }, true);

  window.openVoterEciServices = openPanel;
})();