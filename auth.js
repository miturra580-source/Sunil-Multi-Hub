
const toast=document.getElementById('toast'); let timer;
function msg(t){toast.textContent=t;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),2200)}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.auth-form').forEach(f=>f.classList.toggle('active',f.id.startsWith(b.dataset.tab)));
});
document.getElementById('registerForm').onsubmit=e=>{
  e.preventDefault();
  const user={name:regName.value.trim(),email:regEmail.value.trim().toLowerCase(),phone:regPhone.value.trim(),password:regPassword.value};
  localStorage.setItem('smh_user',JSON.stringify(user));
  localStorage.setItem('smh_session',JSON.stringify({email:user.email,role:'admin',name:user.name}));
  msg('Account created'); setTimeout(()=>location.href='admin.html',600);
};
document.getElementById('loginForm').onsubmit=e=>{
  e.preventDefault();
  const saved=JSON.parse(localStorage.getItem('smh_user')||'null');
  if(!saved || saved.email!==loginEmail.value.trim().toLowerCase() || saved.password!==loginPassword.value){
    return msg('Email या password गलत है');
  }
  localStorage.setItem('smh_session',JSON.stringify({email:saved.email,role:'admin',name:saved.name}));
  msg('Login successful'); setTimeout(()=>location.href='admin.html',500);
};
