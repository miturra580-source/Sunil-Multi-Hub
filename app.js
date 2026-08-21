
let lang = localStorage.getItem('smh-lang') || 'hi';
const langToggle = document.getElementById('langToggle');
const menuBtn = document.getElementById('menuBtn');
const mainNav = document.getElementById('mainNav');
const search = document.getElementById('serviceSearch');
const cards = [...document.querySelectorAll('.service-card')];
const emptyState = document.getElementById('emptyState');

function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-hi][data-en]').forEach(el=>{ el.textContent = el.dataset[lang]; });
  document.querySelectorAll('[data-placeholder-hi][data-placeholder-en]').forEach(el=>{
    el.placeholder = lang === 'hi' ? el.dataset.placeholderHi : el.dataset.placeholderEn;
  });
  if(langToggle) langToggle.textContent = lang === 'hi' ? 'EN' : 'हिं';
}
applyLang();

if(langToggle) langToggle.addEventListener('click',()=>{
  lang = lang === 'hi' ? 'en' : 'hi';
  localStorage.setItem('smh-lang',lang);
  applyLang();
});
if(menuBtn) menuBtn.addEventListener('click',()=>mainNav.classList.toggle('show'));
if(mainNav) mainNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>mainNav.classList.remove('show')));

if(search) search.addEventListener('input',()=>{
  const q = search.value.trim().toLowerCase();
  let count = 0;
  cards.forEach(card=>{
    const text = ((card.dataset.search||'')+' '+card.innerText).toLowerCase();
    const show = !q || text.includes(q);
    card.style.display = show ? 'grid' : 'none';
    if(show) count++;
  });
  if(emptyState) emptyState.style.display = count ? 'none' : 'block';
});

function scrollToCard(id){ document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'center'}); }
function openService(name){
  document.getElementById('modalTitle').textContent = name;
  openModal('serviceModal');
}
function openTool(name){
  const map = {
    'Passport Photo Maker':'passport',
    'JPG to PDF':'jpg-pdf',
    'Merge PDF':'merge-pdf',
    'Photo Resize':'resize',
    'ID Card Print':'id-card',
    'Resume Maker':'resize'
  };
  const tool = map[name] || 'jpg-pdf';
  window.location.href = `tools.html#${tool}`;
}
function openContact(){
  document.getElementById('modalTitle').textContent = 'WhatsApp / Enquiry';
  openModal('serviceModal');
}
function openModal(id){
  const m=document.getElementById(id); if(!m) return;
  m.classList.add('show');m.setAttribute('aria-hidden','false');
}
function closeModal(id){
  const m=document.getElementById(id); if(!m) return;
  m.classList.remove('show');m.setAttribute('aria-hidden','true');
}
document.querySelectorAll('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-backdrop.show').forEach(m=>closeModal(m.id))});
let toastTimer;
function openToast(msg){
  const t=document.getElementById('toast'); if(!t) return;
  t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),2600);
}
