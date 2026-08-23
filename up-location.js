(() => {
  const SERVICE_RE = /आय.*जाति.*निवास|जाति.*निवास.*आय|निवास.*आय.*जाति/;
  const RAW = 'https://raw.githubusercontent.com/planemad/india-local-government-directory/main/';
  const URLS = {
    districts: RAW + 'administrative/2-district.csv',
    subdistricts: RAW + 'administrative/3-subdistrict.csv',
    blocks: RAW + 'administrative/blocks.csv',
    villageZip: RAW + 'administrative/4-village.csv.zip'
  };

  let masterPromise = null;
  let villagePromise = null;
  let master = null;
  let villages = [];

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (c === '"') {
        if (quoted && n === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (c === ',' && !quoted) {
        row.push(cell.trim()); cell = '';
      } else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && n === '\n') i++;
        row.push(cell.trim()); cell = '';
        if (row.some(v => v !== '')) rows.push(row);
        row = [];
      } else cell += c;
    }
    if (cell || row.length) {
      row.push(cell.trim());
      if (row.some(v => v !== '')) rows.push(row);
    }
    return rows;
  }

  function toObjects(text) {
    const rows = parseCSV(text.replace(/^\uFEFF/, ''));
    if (!rows.length) return [];
    const headers = rows[0].map(x => x.trim());
    return rows.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
  }

  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function val(obj, patterns) {
    const entries = Object.entries(obj);
    for (const pattern of patterns) {
      const p = norm(pattern);
      const exact = entries.find(([k]) => norm(k) === p);
      if (exact && exact[1] !== undefined) return String(exact[1]).trim();
      const partial = entries.find(([k]) => norm(k).includes(p));
      if (partial && partial[1] !== undefined) return String(partial[1]).trim();
    }
    return '';
  }
  function isUP(o) {
    return val(o, ['State Code']) === '9' || /^UTTAR PRADESH$/i.test(val(o, ['State Name']));
  }
  function uniq(arr, key = 'name') {
    const map = new Map();
    for (const item of arr) {
      const k = String(item[key] || '').trim();
      if (k && !map.has(k)) map.set(k, item);
    }
    return [...map.values()].sort((a, b) => String(a[key]).localeCompare(String(b[key]), 'en'));
  }
  async function fetchText(url) {
    const r = await fetch(url, { cache: 'force-cache' });
    if (!r.ok) throw new Error('Location data load failed');
    return r.text();
  }

  async function loadMaster() {
    if (masterPromise) return masterPromise;
    masterPromise = (async () => {
      const [dText, tText, bText] = await Promise.all([
        fetchText(URLS.districts),
        fetchText(URLS.subdistricts),
        fetchText(URLS.blocks)
      ]);
      const districts = toObjects(dText).filter(isUP).map(o => ({
        code: val(o, ['District Code']),
        name: val(o, ['District Name'])
      })).filter(x => x.code && x.name);
      const tehsils = toObjects(tText).filter(isUP).map(o => ({
        districtCode: val(o, ['District Code']),
        code: val(o, ['Sub-district Code', 'Subdistrict Code']),
        name: val(o, ['Sub-district Name', 'Subdistrict Name'])
      })).filter(x => x.districtCode && x.code && x.name);
      const blocks = toObjects(bText).filter(isUP).map(o => ({
        districtCode: val(o, ['District Code']),
        code: val(o, ['Block Code']),
        name: val(o, ['Block Name'])
      })).filter(x => x.districtCode && x.code && x.name);
      master = { districts: uniq(districts, 'code'), tehsils: uniq(tehsils, 'code'), blocks: uniq(blocks, 'code') };
      return master;
    })();
    return masterPromise;
  }

  async function ensureJSZip() {
    if (window.JSZip) return window.JSZip;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.JSZip;
  }

  async function loadVillages() {
    if (villagePromise) return villagePromise;
    villagePromise = (async () => {
      const JSZip = await ensureJSZip();
      const r = await fetch(URLS.villageZip, { cache: 'force-cache' });
      if (!r.ok) throw new Error('Village directory unavailable');
      const zip = await JSZip.loadAsync(await r.arrayBuffer());
      const file = Object.values(zip.files).find(f => !f.dir && /\.csv$/i.test(f.name));
      if (!file) throw new Error('Village CSV unavailable');
      const rows = toObjects(await file.async('string')).filter(isUP);
      villages = rows.map(o => ({
        districtCode: val(o, ['District Code']),
        district: val(o, ['District Name']),
        tehsilCode: val(o, ['Sub-district Code', 'Subdistrict Code']),
        tehsil: val(o, ['Sub-district Name', 'Subdistrict Name']),
        blockCode: val(o, ['Block Code']),
        block: val(o, ['Block Name']),
        gp: val(o, ['Localbody Name', 'Local Body Name', 'Gram Panchayat Name', 'GP Name']),
        villageCode: val(o, ['Village Code']),
        village: val(o, ['Village Name'])
      })).filter(x => x.village);
      return villages;
    })();
    return villagePromise;
  }

  function replaceWithSelect(name, placeholder) {
    const old = document.querySelector(`#beneficiaryFields [name="${name}"]`);
    if (!old) return null;
    if (old.tagName === 'SELECT' && old.dataset.smhLocation === '1') return old;
    const select = document.createElement('select');
    select.name = name;
    select.required = old.required;
    select.dataset.smhLocation = '1';
    select.style.cssText = old.style.cssText;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    old.replaceWith(select);
    return select;
  }

  function fillOptions(select, items, placeholder) {
    if (!select) return;
    const previous = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>` + items.map(item => {
      const name = String(item.name || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      const code = String(item.code || '').replace(/"/g, '&quot;');
      return `<option value="${name}" data-code="${code}">${name}</option>`;
    }).join('');
    if ([...select.options].some(o => o.value === previous)) select.value = previous;
  }

  function selectedCode(select) {
    return select?.selectedOptions?.[0]?.dataset?.code || '';
  }

  function status(text, bad = false) {
    let el = document.getElementById('smhUpLocationStatus');
    if (!el) {
      el = document.createElement('div');
      el.id = 'smhUpLocationStatus';
      el.style.cssText = 'margin:10px 0;padding:10px 12px;border-radius:12px;font-size:11px;line-height:1.45';
      const wrap = document.querySelector('[data-field-wrap="district"]');
      wrap?.parentNode?.insertBefore(el, wrap);
    }
    if (!el) return;
    el.textContent = text;
    el.style.background = bad ? '#fff1f1' : '#eef6ff';
    el.style.color = bad ? '#9b2c2c' : '#244eaf';
  }

  async function enhance() {
    const appTitle = document.getElementById('applicationServiceName');
    if (!appTitle || !SERVICE_RE.test(appTitle.textContent || '')) return;

    const district = replaceWithSelect('district', 'जिला चुनें');
    const tehsil = replaceWithSelect('tehsil', 'तहसील चुनें');
    const block = replaceWithSelect('block', 'ब्लॉक चुनें');
    const gp = replaceWithSelect('gram_panchayat', 'ग्राम पंचायत चुनें');
    const village = replaceWithSelect('village_ward', 'गाँव / वार्ड चुनें');
    if (!district || !tehsil || !block || !village) return;
    if (district.dataset.smhBound === '1') return;
    district.dataset.smhBound = '1';

    status('उत्तर प्रदेश के जिला, तहसील और ब्लॉक लोड हो रहे हैं…');
    try {
      const m = await loadMaster();
      fillOptions(district, m.districts, 'जिला चुनें');
      status(`${m.districts.length} जिले उपलब्ध हैं। जिला चुनें → तहसील → ब्लॉक → ग्राम पंचायत / गाँव।`);

      district.addEventListener('change', () => {
        const dc = selectedCode(district);
        fillOptions(tehsil, uniq(m.tehsils.filter(x => x.districtCode === dc)), 'तहसील चुनें');
        fillOptions(block, uniq(m.blocks.filter(x => x.districtCode === dc)), 'ब्लॉक चुनें');
        fillOptions(gp, [], 'ग्राम पंचायत चुनें');
        fillOptions(village, [], 'गाँव / वार्ड चुनें');
      });

      async function refreshVillages() {
        const dc = selectedCode(district);
        if (!dc) return;
        status('ग्राम पंचायत और गाँव की सूची लोड हो रही है…');
        try {
          const rows = await loadVillages();
          let filtered = rows.filter(x => !x.districtCode || x.districtCode === dc || x.district === district.value);
          const tc = selectedCode(tehsil);
          const bc = selectedCode(block);
          if (tc || tehsil.value) filtered = filtered.filter(x => !x.tehsilCode || x.tehsilCode === tc || x.tehsil === tehsil.value);
          if (bc || block.value) filtered = filtered.filter(x => !x.blockCode || x.blockCode === bc || x.block === block.value);

          const gps = uniq(filtered.filter(x => x.gp).map(x => ({ name: x.gp, code: x.gp })));
          const vs = uniq(filtered.map(x => ({ name: x.village, code: x.villageCode || x.village })));
          fillOptions(gp, gps, 'ग्राम पंचायत चुनें');
          fillOptions(village, vs, 'गाँव / वार्ड चुनें');
          status(`${vs.length.toLocaleString('en-IN')} गाँव${gps.length ? ` • ${gps.length.toLocaleString('en-IN')} ग्राम पंचायत` : ''} उपलब्ध हैं।`);
        } catch (error) {
          console.error(error);
          status('गाँव directory अभी load नहीं हो सकी। District/Tehsil/Block selection काम करता रहेगा।', true);
        }
      }

      tehsil.addEventListener('change', refreshVillages);
      block.addEventListener('change', refreshVillages);
      village.addEventListener('focus', () => { if (village.options.length <= 1) refreshVillages(); });
      gp?.addEventListener('focus', () => { if (gp.options.length <= 1) refreshVillages(); });
    } catch (error) {
      console.error(error);
      status('UP location master load नहीं हुआ। कृपया network check करें।', true);
    }
  }

  function start() {
    const observer = new MutationObserver(() => setTimeout(enhance, 60));
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', () => setTimeout(enhance, 300), true);
    enhance();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();