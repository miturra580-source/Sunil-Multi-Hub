// ==UserScript==
// @name         SUNIL MULTI HUB eDistrict Autofill
// @namespace    https://sunil-multi-hub.vercel.app/
// @version      1.0.0
// @description  Autofill eDistrict forms from SUNIL MULTI HUB copied application data. Does not bypass OTP/CAPTCHA or submit forms.
// @match        https://edistrict.up.gov.in/*
// @grant        GM_addStyle
// ==/UserScript==

(function(){
  'use strict';
  const aliases={
    applicant_name:['applicant name','name of applicant','आवेदक का नाम','नाम'],
    father_husband_name:['father name','husband name','father/husband','पिता','पति'],
    gender:['gender','लिंग'], dob:['date of birth','dob','जन्म तिथि'],
    aadhaar_number:['aadhaar','aadhar','आधार'], mobile:['mobile','phone','मोबाइल'], email:['email','ईमेल'],
    address:['address','पता'], district:['district','जिला'], tehsil:['tehsil','तहसील'], village_ward:['village','ward','ग्राम','वार्ड'],
    occupation:['occupation','profession','व्यवसाय','रोजगार'], family_annual_income:['annual income','family income','वार्षिक आय','परिवार की आय'],
    ration_card_no:['ration card','राशन कार्ड'], purpose:['purpose','उद्देश्य']
  };
  const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
  function textFor(el){
    const bits=[el.name,el.id,el.placeholder,el.getAttribute('aria-label')];
    if(el.id){const l=document.querySelector(`label[for="${CSS.escape(el.id)}"]`);if(l)bits.push(l.innerText);}
    const parent=el.closest('label,.form-group,.row,.field,.control-group,.input-group'); if(parent)bits.push(parent.innerText?.slice(0,220));
    return norm(bits.filter(Boolean).join(' '));
  }
  function bestField(key){
    const keys=(aliases[key]||[key]).map(norm); let best=null,bestScore=0;
    document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea').forEach(el=>{
      if(el.disabled||el.readOnly)return; const t=textFor(el); let score=0;
      keys.forEach(k=>{if(t===k)score=Math.max(score,100);else if(t.includes(k))score=Math.max(score,60+k.length);});
      if(score>bestScore){best=el;bestScore=score;}
    }); return best;
  }
  function setValue(el,value){
    if(!el||value===undefined||value===null||value==='')return false;
    if(el.tagName==='SELECT'){
      const v=norm(value); const opt=[...el.options].find(o=>norm(o.textContent).includes(v)||norm(o.value)===v); if(opt)el.value=opt.value; else return false;
    } else {el.focus(); el.value=String(value);}
    el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true;
  }
  function toast(msg){let t=document.getElementById('smhAutoToast');if(!t){t=document.createElement('div');t.id='smhAutoToast';Object.assign(t.style,{position:'fixed',right:'16px',bottom:'76px',zIndex:2147483647,background:'#172033',color:'#fff',padding:'10px 13px',borderRadius:'10px',fontSize:'13px',maxWidth:'320px'});document.body.appendChild(t);}t.textContent=msg;setTimeout(()=>t.remove(),3500);}
  async function run(){
    try{
      const raw=await navigator.clipboard.readText(); const data=JSON.parse(raw); let filled=0,missing=[];
      Object.keys(aliases).forEach(key=>{if(data[key]===undefined||data[key]==='')return; const el=bestField(key); if(el&&setValue(el,data[key]))filled++; else missing.push(key);});
      toast(`SMH Autofill: ${filled} fields filled${missing.length?`, ${missing.length} fields manual`:''}. OTP/CAPTCHA manually complete करें।`);
    }catch(e){toast('Clipboard में SUNIL MULTI HUB Autofill JSON copy करें, फिर दोबारा Autofill दबाएँ।');}
  }
  function install(){
    if(document.getElementById('smhAutofillBtn'))return; const b=document.createElement('button');b.id='smhAutofillBtn';b.type='button';b.textContent='⚡ SMH Autofill';
    Object.assign(b.style,{position:'fixed',right:'14px',bottom:'16px',zIndex:2147483647,border:'0',borderRadius:'999px',padding:'12px 16px',background:'#1557d6',color:'#fff',fontWeight:'800',boxShadow:'0 8px 24px rgba(0,0,0,.2)',cursor:'pointer'});b.onclick=run;document.body.appendChild(b);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();