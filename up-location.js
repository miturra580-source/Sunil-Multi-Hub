(() => {
  const SERVICE_RE=/आय.*जाति.*निवास|जाति.*निवास.*आय|निवास.*आय.*जाति/;
  const RAW='https://raw.githubusercontent.com/planemad/india-local-government-directory/main/';
  const URLS={districts:RAW+'administrative/2-district.csv',subdistricts:RAW+'administrative/3-subdistrict.csv',blocks:RAW+'administrative/blocks.csv',villageZip:RAW+'village-directory.csv.zip',villageFallback:RAW+'administrative/4-village.csv.zip'};
  let masterPromise=null,villagePromise=null,master=null,villages=[];

  function parseCSV(text){
    const rows=[];let row=[],cell='',q=false;
    for(let i=0;i<text.length;i++){
      const c=text[i],n=text[i+1];
      if(c==='"'){if(q&&n==='"'){cell+='"';i++;}else q=!q;}
      else if(c===','&&!q){row.push(cell.trim());cell='';}
      else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell.trim());cell='';if(row.some(v=>v!==''))rows.push(row);row=[];}
      else cell+=c;
    }
    if(cell||row.length){row.push(cell.trim());if(row.some(v=>v!==''))rows.push(row);}
    return rows;
  }
  function toObjects(text){const r=parseCSV(text.replace(/^\uFEFF/,''));if(!r.length)return[];const h=r[0].map(x=>x.trim());return r.slice(1).map(a=>Object.fromEntries(h.map((k,i)=>[k,a[i]??''])));}
  function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
  function val(o,patterns){const e=Object.entries(o);for(const p of patterns){const np=norm(p);const m=e.find(([k])=>norm(k)===np)||e.find(([k])=>norm(k).includes(np));if(m&&m[1]!==undefined)return String(m[1]).trim();}return'';}
  function isUP(o){const sc=val(o,['State Code','State LGD Code']);const sn=val(o,['State Name (In English)','State Name','State Name English']);return sc==='9'||/^UTTAR PRADESH$/i.test(sn);}
  function uniq(arr,key='name'){const m=new Map();arr.forEach(x=>{const k=String(x[key]||'').trim();if(k&&!m.has(k))m.set(k,x);});return [...m.values()].sort((a,b)=>a[key].localeCompare(b[key],'en'));}
  async function fetchText(url){const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw new Error('Location data load failed');return r.text();}

  async function loadMaster(){
    if(masterPromise)return masterPromise;
    masterPromise=(async()=>{
      const [d,s,b]=await Promise.all([fetchText(URLS.districts),fetchText(URLS.subdistricts),fetchText(URLS.blocks)]);
      const districts=toObjects(d).filter(isUP).map(o=>({code:val(o,['District Code']),name:val(o,['District Name (In English)','District Name'])}));
      const tehsils=toObjects(s).filter(isUP).map(o=>({districtCode:val(o,['District Code']),code:val(o,['Sub-District Code','Subdistrict Code']),name:val(o,['Sub-District Name','Subdistrict Name (In English)','Sub-District Name (In English)'])}));
      const blocks=toObjects(b).filter(isUP).map(o=>({districtCode:val(o,['District Code']),code:val(o,['Block Code','Development Block Code']),name:val(o,['Block Name (In English)','Block Name','Development Block Name (In English)'])}));
      master={districts:uniq(districts),tehsils:uniq(tehsils,'code'),blocks:uniq(blocks,'code')};return master;
    })();return masterPromise;
  }

  async function ensureJSZip(){if(window.JSZip)return window.JSZip;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});return window.JSZip;}
  async function loadVillages(){
    if(villagePromise)return villagePromise;
    villagePromise=(async()=>{
      const JSZip=await ensureJSZip();let buf=null;
      for(const url of [URLS.villageZip,URLS.villageFallback]){try{const r=await fetch(url,{cache:'force-cache'});if(r.ok){buf=await r.arrayBuffer();break;}}catch(_){} }
      if(!buf)throw new Error('Village directory unavailable');
      const zip=await JSZip.loadAsync(buf);const file=Object.values(zip.files).find(f=>!f.dir&&/\.csv$/i.test(f.name));if(!file)throw new Error('Village CSV unavailable');
      const text=await file.async('string');
      villages=toObjects(text).filter(isUP).map(o=>({
        districtCode:val(o,['District Code']),district:val(o,['District Name (In English)','District Name']),
        tehsilCode:val(o,['Subdistrict Code','Sub-District Code']),tehsil:val(o,['Subdistrict Name (In English)','Sub-District Name (In English)','Subdistrict Name','Sub-District Name']),
        blockCode:val(o,['Block Code','Development Block Code']),block:val(o,['Block Name (In English)','Development Block Name (In English)','Block Name']),
        gp:val(o,['Localbody Name (In English)','Local Body Name (in English)','Gram Panchayat/ TLB (In English)','Gram Panchayat Name','GP Name']),
        villageCode:val(o,['Village Code']),village:val(o,['Village Name (In English)','Village Name'])
      })).filter(x=>x.village);
      return villages;
    })();return villagePromise;
  }

  function replaceWithSelect(name,label){
    const old=document.querySelector(`#beneficiaryFields [name="${name}"]`);if(!old||old.tagName==='SELECT'&&old.dataset.smhLocation)return old;
    const s=document.createElement('select');s.name=name;s.required=old.required;s.dataset.smhLocation='1';s.style.cssText=old.style.cssText;s.innerHTML=`<option value="">${label}</option>`;old.replaceWith(s);return s;
  }
  function options(select,items,placeholder,valueKey='name',labelKey='name'){
    const current=select.value;select.innerHTML=`<option value="">${placeholder}</option>`+items.map(x=>`<option value="${String(x[valueKey]||'').replace(/"/g,'&quot;')}">${String(x[labelKey]||'')}</option>`).join('');if([...select.options].some(o=>o.value===current))select.value=current;
  }
  function status(text,bad=false){let el=document.getElementById('smhUpLocationStatus');if(!el){el=document.createElement('div');el.id='smhUpLocationStatus';el.style.cssText='margin:10px 0;padding:10px 12px;border-radius:12px;font-size:11px;line-height:1.45';const w=document.querySelector('[data-field-wrap="district"]');w?.parentNode?.insertBefore(el,w);}if(el){el.textContent=text;el.style.background=bad?'#fff1f1':'#eef6ff';el.style.color=bad?'#9b2c2c':'#244eaf';}}

  async function enhance(){
    const app=document.getElementById('applicationServiceName');if(!app||!SERVICE_RE.test(app.textContent||''))return;
    const d=replaceWithSelect('district','जिला चुनें');const t=replaceWithSelect('tehsil','तहसील चुनें');const b=replaceWithSelect('block','ब्लॉक चुनें');const g=replaceWithSelect('gram_panchayat','ग्राम पंचायत चुनें');const v=replaceWithSelect('village_ward','गाँव / वार्ड चुनें');if(!d||!t||!b||!v)return;
    if(d.dataset.smhBound==='1')return;d.dataset.smhBound='1';status('उत्तर प्रदेश Location Directory लोड हो रही है…');
    try{
      const m=await loadMaster();options(d,m.districts,'जिला चुनें','code','name');status('जिला चुनें → तहसील → ब्लॉक → ग्राम पंचायत / गाँव। गाँव की सूची जरूरत पर लोड होगी।');
      d.onchange=()=>{const dc=d.value;options(t,uniq(m.tehsils.filter(x=>x.districtCode===dc)),'तहसील चुनें','code','name');options(b,uniq(m.blocks.filter(x=>x.districtCode===dc)),'ब्लॉक चुनें','code','name');options(g,[],'ग्राम पंचायत चुनें');options(v,[],'गाँव / वार्ड चुनें');};
      async function refreshVillageOptions(){
        if(!d.value)return;status('गाँव और ग्राम पंचायत सूची लोड हो रही है…');
        try{const rows=await loadVillages();let f=rows.filter(x=>!x.districtCode||x.districtCode===d.value);if(t.value)f=f.filter(x=>!x.tehsilCode||x.tehsilCode===t.value||x.tehsil===t.options[t.selectedIndex]?.text);if(b.value)f=f.filter(x=>!x.blockCode||x.blockCode===b.value||x.block===b.options[b.selectedIndex]?.text);const gps=uniq(f.filter(x=>x.gp).map(x=>({name:x.gp})));const vs=uniq(f.map(x=>({name:x.village})));options(g,gps,'ग्राम पंचायत चुनें');options(v,vs,'गाँव / वार्ड चुनें');status(`${vs.length.toLocaleString('en-IN')} गाँव उपलब्ध हैं${gps.length?` • ${gps.length.toLocaleString('en-IN')} ग्राम पंचायत`:''}.`);}catch(e){console.error(e);status('गाँव directory अभी load नहीं हो सकी। कृपया network check करें; बाकी form editable है।',true);}
      }
      t.onchange=refreshVillageOptions;b.onchange=refreshVillageOptions;v.onfocus=()=>{if(v.options.length<=1)refreshVillageOptions();};g.onfocus=()=>{if(g.options.length<=1)refreshVillageOptions();};
    }catch(e){console.error(e);status('UP location master load नहीं हुआ। कृपया network check करें।',true);}
  }
  const start=()=>{new MutationObserver(()=>setTimeout(enhance,80)).observe(document.body,{childList:true,subtree:true});document.addEventListener('click',()=>setTimeout(enhance,350),true);enhance();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();