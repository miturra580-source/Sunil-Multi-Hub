
let lang = localStorage.getItem('smh-lang') || 'hi';
const langToggle = document.getElementById('langToggle');
const menuBtn = document.getElementById('menuBtn');
const mainNav = document.getElementById('mainNav');
const search = document.getElementById('serviceSearch');
const cards = [...document.querySelectorAll('.service-card')];
const emptyState = document.getElementById('emptyState');

function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-hi][data-en]').forEach(el=>{
    el.textContent = el.dataset[lang];
  });
  document.querySelectorAll('[data-placeholder-hi][data-placeholder-en]').forEach(el=>{
    el.placeholder = lang === 'hi' ? el.dataset.placeholderHi : el.dataset.placeholderEn;
  });
  langToggle.textContent = lang === 'hi' ? 'EN' : 'हिं';
}
applyLang();

langToggle.addEventListener('click',()=>{
  lang = lang === 'hi' ? 'en' : 'hi';
  localStorage.setItem('smh-lang',lang);
  applyLang();
});
menuBtn.addEventListener('click',()=>mainNav.classList.toggle('show'));
mainNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>mainNav.classList.remove('show')));

search.addEventListener('input',()=>{
  const q = search.value.trim().toLowerCase();
  let count = 0;
  cards.forEach(card=>{
    const text = (card.dataset.search+' '+card.innerText).toLowerCase();
    const show = !q || text.includes(q);
    card.style.display = show ? 'grid' : 'none';
    if(show) count++;
  });
  emptyState.style.display = count ? 'none' : 'block';
});

function scrollToCard(id){
  document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'center'});
}
function openService(name){
  document.getElementById('modalTitle').textContent = name;
  openModal('serviceModal');
}
function openTool(name){
  document.getElementById('toolTitle').textContent = name;
  document.getElementById('fileInfo').textContent = '';
  document.getElementById('toolFile').value = '';
  openModal('toolModal');
}
function openContact(){
  document.getElementById('modalTitle').textContent = 'WhatsApp / Enquiry';
  openModal('serviceModal');
}
function openModal(id){
  const m=document.getElementById(id);m.classList.add('show');m.setAttribute('aria-hidden','false');
}
function closeModal(id){
  const m=document.getElementById(id);m.classList.remove('show');m.setAttribute('aria-hidden','true');
}
document.querySelectorAll('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-backdrop.show').forEach(m=>closeModal(m.id))});

const dropZone = document.getElementById('dropZone');
const toolFile = document.getElementById('toolFile');
dropZone.addEventListener('click',()=>toolFile.click());
dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.style.borderColor='#0b4fd8'});
dropZone.addEventListener('dragleave',()=>dropZone.style.borderColor='');
dropZone.addEventListener('drop',e=>{
  e.preventDefault();dropZone.style.borderColor='';
  const file=e.dataTransfer.files[0]; if(file) showFile(file);
});
toolFile.addEventListener('change',()=>{if(toolFile.files[0])showFile(toolFile.files[0])});
function showFile(file){
  document.getElementById('fileInfo').textContent = `Selected: ${file.name} • ${(file.size/1024/1024).toFixed(2)} MB`;
}
let toastTimer;
function openToast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600);
}
