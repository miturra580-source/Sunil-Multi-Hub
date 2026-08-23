const toast = document.getElementById('toast');
let timer;
function msg(t){
  toast.textContent=t;
  toast.classList.add('show');
  clearTimeout(timer);
  timer=setTimeout(()=>toast.classList.remove('show'),2800);
}

function makeClient(){
  const cfg = window.SMH_CONFIG || {};
  const url = cfg.supabaseUrl;
  const key = cfg.supabaseAnonKey || cfg.supabaseKey;
  if(!url || !key) throw new Error('Supabase URL / Publishable key missing in config.js');
  return window.supabase.createClient(url,key,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
}

let sb;
let recoveryMode = false;

try{
  sb=makeClient();
  document.getElementById('apiText').textContent='Supabase connected';
  document.getElementById('apiDot').className='ok';
}catch(e){
  document.getElementById('apiText').textContent='Supabase config error';
  document.getElementById('apiDot').className='bad';
  msg(e.message);
}

function showAuthForm(name){
  document.querySelectorAll('.auth-form').forEach(f=>f.classList.toggle('active',f.id===`${name}Form`));
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));
  const tabs=document.getElementById('authTabs');
  if(tabs) tabs.style.display=name==='recovery'?'none':'';
}

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showAuthForm(b.dataset.tab));

document.getElementById('registerForm').onsubmit=async e=>{
  e.preventDefault();
  if(!sb) return msg('Supabase connect नहीं है');
  const email=document.getElementById('regEmail').value.trim().toLowerCase();
  const password=document.getElementById('regPassword').value;
  const full_name=document.getElementById('regName').value.trim();
  const phone=document.getElementById('regPhone').value.trim();

  const {data,error}=await sb.auth.signUp({
    email,
    password,
    options:{data:{full_name,phone}}
  });
  if(error) return msg(error.message);

  if(data.session){
    msg('Account created');
    setTimeout(()=>location.href='dashboard.html',700);
  }else{
    msg('Account created — email verify करें');
  }
};

document.getElementById('loginForm').onsubmit=async e=>{
  e.preventDefault();
  if(!sb) return msg('Supabase connect नहीं है');
  const {data,error}=await sb.auth.signInWithPassword({
    email:document.getElementById('loginEmail').value.trim().toLowerCase(),
    password:document.getElementById('loginPassword').value
  });
  if(error) return msg(error.message);

  let role='customer';
  const {data:profile}=await sb.from('profiles').select('role').eq('id',data.user.id).maybeSingle();
  if(profile?.role) role=profile.role;
  msg('Login successful');
  setTimeout(()=>location.href=role==='admin'?'admin.html':'dashboard.html',500);
};

document.getElementById('forgotBtn').onclick=async()=>{
  if(!sb) return msg('Supabase connect नहीं है');
  const email=document.getElementById('loginEmail').value.trim().toLowerCase();
  if(!email) return msg('पहले email डालें');
  const redirectTo=new URL('auth.html?recovery=1',location.href).href;
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});
  msg(error?error.message:'Password reset email भेजा गया');
};

document.getElementById('recoveryForm').onsubmit=async e=>{
  e.preventDefault();
  if(!sb) return msg('Supabase connect नहीं है');
  const p1=document.getElementById('newPassword').value;
  const p2=document.getElementById('confirmPassword').value;
  if(p1.length<6) return msg('Password कम से कम 6 characters का रखें');
  if(p1!==p2) return msg('दोनों passwords match नहीं कर रहे');
  const {error}=await sb.auth.updateUser({password:p1});
  if(error) return msg(error.message);
  recoveryMode=false;
  msg('Password successfully updated');
  history.replaceState({},document.title,location.pathname);
  setTimeout(()=>location.href='dashboard.html',800);
};

document.getElementById('googleLoginBtn').onclick=async()=>{
  if(!sb) return msg('Supabase connect नहीं है');
  const redirectTo=new URL('dashboard.html',location.href).href;
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
  if(error) msg(error.message);
};

(async()=>{
  if(!sb) return;

  const params=new URLSearchParams(location.search);
  if(params.get('recovery')==='1') recoveryMode=true;

  sb.auth.onAuthStateChange((event)=>{
    if(event==='PASSWORD_RECOVERY'){
      recoveryMode=true;
      showAuthForm('recovery');
      msg('नया password सेट करें');
    }
  });

  const {data:{session}}=await sb.auth.getSession();

  if(recoveryMode){
    showAuthForm('recovery');
    return;
  }

  if(session){
    const {data:profile}=await sb.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
    location.replace(profile?.role==='admin'?'admin.html':'dashboard.html');
  }
})();
