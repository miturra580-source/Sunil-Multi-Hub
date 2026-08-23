(() => {
  const SERVICE_RE = /आय.*जाति.*निवास|जाति.*निवास.*आय|निवास.*आय.*जाति/;
  const VILLAGE_ZIP = 'https://raw.githubusercontent.com/planemad/india-local-government-directory/main/administrative/4-village.csv.zip';

  // Verified district / tehsil / block lists for Chitrakoot Dham Division only.
  // Tehsil and block are kept as separate district-level lists because some blocks
  // can overlap tehsil boundaries. Village filtering further narrows the result.
  const MASTER = {
    'Banda': {
      label: 'बाँदा',
      tehsils: ['Banda', 'Baberu', 'Naraini', 'Atarra', 'Pailani'],
      blocks: ['Badokhar Khurd', 'Mahuva', 'Baberu', 'Bisanda', 'Kamasin', 'Jaspura', 'Naraini', 'Tindwari']
    },
    'Chitrakoot': {
      label: 'चित्रकूट',
      tehsils: ['Karwi', 'Mau', 'Manikpur', 'Rajapur'],
      blocks: ['Karwi', 'Mau', 'Pahari', 'Ramnagar', 'Manikpur']
    },
    'Hamirpur': {
      label: 'हमीरपुर',
      tehsils: ['Hamirpur', 'Maudaha', 'Rath', 'Sarila'],
      blocks: ['Gohand', 'Kurara', 'Maudaha', 'Muskara', 'Rath', 'Sarila', 'Sumerpur']
    },
    'Mahoba': {
      label: 'महोबा',
      tehsils: ['Mahoba', 'Charkhari', 'Kulpahar'],
      blocks: ['Kabrai', 'Charkhari', 'Jaitpur', 'Panwari']
    }
  };

  let villagePromise = null;
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

  function canonicalDistrict(name) {
    const n = norm(name);
    return Object.keys(MASTER).find(k => norm(k) === n || norm(MASTER[k].label) === n) || '';
  }

  function uniq(items) {
    return [...new Set(items.filter(Boolean).map(x => String(x).trim()))].sort((a,b)=>a.localeCompare(b,'en'));
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
      const r = await fetch(VILLAGE_ZIP, { cache: 'force-cache' });
      if (!r.ok) throw new Error('Village directory unavailable');
      const zip = await JSZip.loadAsync(await r.arrayBuffer());
      const file = Object.values(zip.files).find(f => !f.dir && /\.csv$/i.test(f.name));
      if (!file) throw new Error('Village CSV unavailable');
      const rows = toObjects(await file.async('string'));
      villages = rows.map(o => ({
        district: val(o, ['District Name']),
        tehsil: val(o, ['Sub-district Name', 'Subdistrict Name']),
        block: val(o, ['Block Name']),
        gp: val(o, ['Localbody Name', 'Local Body Name', 'Gram Panchayat Name', 'GP Name']),
        village: val(o, ['Village Name'])
      })).filter(x => canonicalDistrict(x.district) && x.village);
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

  function fill(select, items, placeholder) {
    if (!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>` + items.map(item => {
      const value = typeof item === 'string' ? item : item.value;
      const label = typeof item === 'string' ? item : item.label;
      const safeValue = String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
      const safeLabel = String(label).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      return `<option value="${safeValue}">${safeLabel}</option>`;
    }).join('');
  }

  function removeOldStatus() {
    document.getElementById('smhUpLocationStatus')?.remove();
  }

  async function enhance() {
    const appTitle = document.getElementById('applicationServiceName');
    if (!appTitle || !SERVICE_RE.test(appTitle.textContent || '')) return;

    removeOldStatus();

    const district = replaceWithSelect('district', 'जिला चुनें');
    const tehsil = replaceWithSelect('tehsil', 'तहसील चुनें');
    const block = replaceWithSelect('block', 'विकासखंड / ब्लॉक चुनें');
    const gp = replaceWithSelect('gram_panchayat', 'ग्राम पंचायत चुनें');
    const village = replaceWithSelect('village_ward', 'गाँव / वार्ड चुनें');
    if (!district || !tehsil || !block || !village) return;
    if (district.dataset.smhBound === '1') return;
    district.dataset.smhBound = '1';

    fill(district, Object.entries(MASTER).map(([value, data]) => ({ value, label: data.label })), 'जिला चुनें');
    fill(tehsil, [], 'तहसील चुनें');
    fill(block, [], 'विकासखंड / ब्लॉक चुनें');
    fill(gp, [], 'ग्राम पंचायत चुनें');
    fill(village, [], 'गाँव / वार्ड चुनें');

    district.addEventListener('change', () => {
      const d = MASTER[district.value];
      fill(tehsil, d?.tehsils || [], 'तहसील चुनें');
      fill(block, [], 'पहले तहसील चुनें');
      fill(gp, [], 'ग्राम पंचायत चुनें');
      fill(village, [], 'गाँव / वार्ड चुनें');
    });

    tehsil.addEventListener('change', () => {
      const d = MASTER[district.value];
      // Blocks are district verified. They are shown after tehsil selection so the flow remains sequential.
      fill(block, d?.blocks || [], 'विकासखंड / ब्लॉक चुनें');
      fill(gp, [], 'ग्राम पंचायत चुनें');
      fill(village, [], 'गाँव / वार्ड चुनें');
    });

    async function refreshVillageLists() {
      if (!district.value || !tehsil.value || !block.value) return;
      try {
        const rows = await loadVillages();
        const filtered = rows.filter(x => {
          const dk = canonicalDistrict(x.district);
          if (dk !== district.value) return false;
          const tehsilOk = !x.tehsil || norm(x.tehsil) === norm(tehsil.value);
          const blockOk = !x.block || norm(x.block) === norm(block.value);
          return tehsilOk && blockOk;
        });

        const gps = uniq(filtered.map(x => x.gp));
        const vs = uniq(filtered.map(x => x.village));
        fill(gp, gps, gps.length ? 'ग्राम पंचायत चुनें' : 'ग्राम पंचायत उपलब्ध नहीं');
        fill(village, vs, vs.length ? 'गाँव / वार्ड चुनें' : 'गाँव उपलब्ध नहीं');
      } catch (err) {
        console.error('Certificate village directory:', err);
        fill(gp, [], 'ग्राम पंचायत सूची लोड नहीं हुई');
        fill(village, [], 'गाँव सूची लोड नहीं हुई');
      }
    }

    block.addEventListener('change', refreshVillageLists);
    gp?.addEventListener('change', async () => {
      if (!gp.value) return;
      try {
        const rows = await loadVillages();
        const filtered = rows.filter(x => canonicalDistrict(x.district) === district.value &&
          (!x.tehsil || norm(x.tehsil) === norm(tehsil.value)) &&
          (!x.block || norm(x.block) === norm(block.value)) &&
          norm(x.gp) === norm(gp.value));
        fill(village, uniq(filtered.map(x => x.village)), 'गाँव / वार्ड चुनें');
      } catch (err) { console.error(err); }
    });
  }

  function start() {
    removeOldStatus();
    const observer = new MutationObserver(() => setTimeout(enhance, 60));
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', () => setTimeout(enhance, 250), true);
    enhance();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();