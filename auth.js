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
try{
  sb=makeClient();
  document.getElementById('apiText').textContent='Supabase connected';
  document.getElementById('apiDot').className='ok';
}catch(e){
  document.getElementById('apiText').textContent='Supabase config error';
  document.getElementById('apiDot').className='bad';
  msg(e.message);
}

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.auth-form').forEach(f=>f.classList.toggle('active',f.id.startsWith(b.dataset.tab)));
});

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
  const email=document.getElementById('loginEmail').value.trim();
  if(!email) return msg('पहले email डालें');
  const redirectTo=location.origin+location.pathname.replace(/auth\.html$/,'auth.html');
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});
  msg(error?error.message:'Password reset email भेजा गया');
};

document.getElementById('googleLoginBtn').onclick=async()=>{
  if(!sb) return msg('Supabase connect नहीं है');
  const redirectTo=location.origin+location.pathname.replace(/auth\.html$/,'dashboard.html');
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
  if(error) msg(error.message);
};

(async()=>{
  if(!sb) return;
  const {data:{session}}=await sb.auth.getSession();
  if(session){
    const {data:profile}=await sb.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
    location.replace(profile?.role==='admin'?'admin.html':'dashboard.html');
  }
})();
