
const session=JSON.parse(localStorage.getItem('smh_session')||'null');
if(!session){ location.replace('auth.html'); }
document.getElementById('adminUser').textContent=session?`Logged in: ${session.name||session.email}`:'';
document.getElementById('logoutBtn').onclick=()=>{localStorage.removeItem('smh_session');location.href='auth.html'};

const defaults=[
 'आय • जाति • निवास प्रमाण पत्र',
 'जीवन प्रमाण पत्र • पेंशन फार्म',
 'राशन कार्ड • श्रम कार्ड',
 'आयुष्मान कार्ड',
 'प्रिंट • फोटोकॉपी • लेमिनेशन',
 'मोबाइल सेल्स • रिपेयरिंग',
 'वाहन सेवाएँ'
];
let services=JSON.parse(localStorage.getItem('smh_services')||'null')||defaults;
function save(){localStorage.setItem('smh_services',JSON.stringify(services));render()}
function render(){
 const wrap=document.getElementById('serviceTable');wrap.innerHTML='';
 services.forEach((s,i)=>{
   const row=document.createElement('div');row.className='service-row';
   row.innerHTML=`<strong>${s}</strong><button data-edit="${i}">Edit</button><button data-del="${i}">Delete</button>`;
   wrap.appendChild(row);
 });
 document.getElementById('statServices').textContent=services.length;
 wrap.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{services.splice(+b.dataset.del,1);save()});
 wrap.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const i=+b.dataset.edit;const n=prompt('Service name',services[i]);if(n){services[i]=n.trim();save()}});
}
document.getElementById('addServiceBtn').onclick=()=>{const n=prompt('New service name');if(n){services.push(n.trim());save()}};
render();
