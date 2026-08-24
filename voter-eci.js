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
    { icon:'📱', title:'Mobile Number Correction', desc:'पहले EPIC ID और नया mobile number भरें, फिर ₹20 payment के बाद official Form 8 खुलेगा.', url:'https://voters.eci.gov.in/form8', key:'form8-mobile', intake:true },
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

  function normalizeEpic(value){
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,20);
  }

  function normalizeMobile(value){
    return String(value || '').replace(/\D/g,'').slice(-10);
  }

  function saveMobileDraft(epic, mobile){
    try {
      sessionStorage.setItem('smh-voter-mobile-draft', JSON.stringify({epic,mobile,savedAt:Date.now()}));
    } catch(_) {}
  }

  async function copyMobileDetails(epic, mobile){
    const text = `EPIC ID: ${epic}\nNew Mobile Number: ${mobile}`;
    try { await navigator.clipboard.writeText(text); toast('EPIC और mobile number copied'); }
    catch(_) {}
  }

  function showMobileIntake(item){
    const panel = ensurePanel();
    const box = panel.querySelector('.ve-mobile-intake');
    if (!box) return;
    let draft = {};
    try { draft = JSON.parse(sessionStorage.getItem('smh-voter-mobile-draft') || '{}'); } catch(_) {}
    const epic = box.querySelector('#veEpic');
    const mobile = box.querySelector('#veMobile');
    if (epic && draft.epic) epic.value = draft.epic;
    if (mobile && draft.mobile) mobile.value = draft.mobile;
    box.dataset.itemKey = item.key;
    box.classList.add('show');
    box.scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(()=>epic?.focus(),200);
  }

  function hideMobileIntake(){
    document.querySelector(`#${PANEL_ID} .ve-mobile-intake`)?.classList.remove('show');
  }

  async function chargeAndOpen(item, button, metadata){
    if (busy || !item?.url) return;
    busy = true;
    const old = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Processing ₹20…'; }

    const target = window.open('about:blank', '_blank');
    try {
      const api = client();
      const { data:{ session }, error:sessionError } = await api.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('Please login again');

      const refSuffix = metadata?.epic ? `${item.key}:${metadata.epic.slice(-6)}` : item.key;
      const { data, error } = await api.rpc('debit_wallet_for_service', {
        p_service_id: SERVICE_ID,
        p_request_reference: makeRef(refSuffix)
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

      if (metadata?.epic && metadata?.mobile) {
        saveMobileDraft(metadata.epic, metadata.mobile);
        await copyMobileDetails(metadata.epic, metadata.mobile);
      }

      if (target) {
        target.opener = null;
        target.location.replace(item.url);
      } else {
        location.href = item.url;
      }
      toast(`₹${CHARGE} deducted • Official ECI service opened`);
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
      #${PANEL_ID} .ve-mobile-intake{display:none;margin:0 16px 18px;border:1px solid #cfdcf0;background:#f8fbff;border-radius:18px;padding:16px;box-shadow:0 10px 28px rgba(30,55,95,.08)}
      #${PANEL_ID} .ve-mobile-intake.show{display:block}
      #${PANEL_ID} .ve-mobile-intake h3{margin:0 0 5px;font-size:18px}
      #${PANEL_ID} .ve-mobile-intake p{margin:0 0 14px;color:#667085;font-size:12px;line-height:1.55}
      #${PANEL_ID} .ve-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      #${PANEL_ID} .ve-field{display:block;font-size:12px;font-weight:900;color:#344054}
      #${PANEL_ID} .ve-field input{width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border:1px solid #cfd8e6;border-radius:10px;font:inherit;background:#fff;text-transform:none}
      #${PANEL_ID} .ve-mobile-actions{display:flex;gap:9px;margin-top:12px}
      #${PANEL_ID} .ve-mobile-actions button{flex:1;border:0;border-radius:10px;padding:11px;font-weight:900;cursor:pointer}
      #${PANEL_ID} .ve-mobile-submit{background:#1557d6;color:#fff}
      #${PANEL_ID} .ve-mobile-cancel{background:#eef2f6;color:#344054}
      #${PANEL_ID} .ve-intake-note{margin-top:10px;padding:10px;border-radius:10px;background:#fff8dd;border:1px solid #edd98a;color:#665200;font-size:11px;line-height:1.55}
      #${PANEL_ID} .ve-foot{padding:0 16px 22px;text-align:center;color:#667085;font-size:11px;line-height:1.5}
      @media(max-width:820px){#${PANEL_ID} .ve-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){#${PANEL_ID} .ve-grid{grid-template-columns:1fr;padding:0 10px 14px}#${PANEL_ID} .ve-info{margin:12px 10px}#${PANEL_ID} .ve-mobile-intake{margin:0 10px 14px}#${PANEL_ID} .ve-fields{grid-template-columns:1fr}#${PANEL_ID} .ve-head h2{font-size:21px}}
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
        <div class="ve-mobile-intake">
          <h3>📱 Voter Mobile Number Correction</h3>
          <p>EPIC ID और नया mobile number यहाँ भरें। Details save रहेंगी और ₹20 payment के बाद official ECI Form 8 खुलेगा।</p>
          <div class="ve-fields">
            <label class="ve-field">EPIC ID<input id="veEpic" type="text" maxlength="20" autocomplete="off" placeholder="Example: ABC1234567"></label>
            <label class="ve-field">New Mobile Number<input id="veMobile" type="tel" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10 digit mobile number"></label>
          </div>
          <div class="ve-intake-note">ECI portal पर login/OTP या verification मांगी जा सकती है। Multi Hub OTP bypass नहीं करता और इन details से direct ECI database update नहीं करता।</div>
          <div class="ve-mobile-actions"><button type="button" class="ve-mobile-cancel">Cancel</button><button type="button" class="ve-mobile-submit">Pay ₹20 & Open Form 8 ↗</button></div>
        </div>
        <div class="ve-grid">
          ${SERVICES.map((s,i)=>`<article class="ve-card"><div class="ve-icon">${s.icon}</div><h3>${s.title}</h3><p>${s.desc}</p><div class="ve-price">₹20</div><button type="button" class="ve-action" data-index="${i}">${s.intake ? 'Enter Details' : 'Open Service ↗'}</button></article>`).join('')}
        </div>
        <div class="ve-foot">Multi Hub ECI credentials, OTP या voter portal password collect नहीं करता। Final application official ECI portal पर ही submit होगी।</div>
      </div>`;

    panel.querySelector('.ve-close').addEventListener('click', closePanel);
    panel.querySelector('.ve-mobile-cancel').addEventListener('click', hideMobileIntake);
    panel.querySelector('#veEpic').addEventListener('input', e => { e.target.value = normalizeEpic(e.target.value); });
    panel.querySelector('#veMobile').addEventListener('input', e => { e.target.value = normalizeMobile(e.target.value); });
    panel.querySelector('.ve-mobile-submit').addEventListener('click', e => {
      const epic = normalizeEpic(panel.querySelector('#veEpic')?.value);
      const mobile = normalizeMobile(panel.querySelector('#veMobile')?.value);
      if (epic.length < 8) return toast('Valid EPIC ID भरें');
      if (!/^[6-9]\d{9}$/.test(mobile)) return toast('Valid 10 digit mobile number भरें');
      const item = SERVICES.find(x => x.key === 'form8-mobile');
      if (!item) return;
      saveMobileDraft(epic, mobile);
      chargeAndOpen(item, e.currentTarget, {epic,mobile});
    });

    panel.addEventListener('click', e => {
      const btn = e.target.closest('.ve-action[data-index]');
      if (!btn) return;
      e.preventDefault();
      const item = SERVICES[Number(btn.dataset.index)];
      if (!item) return;
      if (item.intake) showMobileIntake(item);
      else chargeAndOpen(item, btn);
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