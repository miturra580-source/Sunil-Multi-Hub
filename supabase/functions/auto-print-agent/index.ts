import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, apikey","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
async function sha256(v:string){const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function db(){return createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}})}
const entitled=(s:any)=>s&&s.status!=="suspended"&&((s.paid_until&&new Date(s.paid_until)>new Date())||(s.trial_ends_at&&new Date(s.trial_ends_at)>new Date()));
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return reply({error:"POST required"},405);
 try{
  const b=await req.json(),token=String(b.token||""),action=String(b.action||"");if(token.length<32)return reply({error:"Invalid device token"},401);
  const admin=db(),tokenHash=await sha256(token);
  const {data:agent,error:ae}=await admin.from("auto_print_agents").select("id,user_id,enabled,status,printer_name").eq("token_hash",tokenHash).eq("enabled",true).maybeSingle();
  if(ae)throw ae;if(!agent)return reply({error:"Device not paired or disabled"},401);
  const {data:sub}=await admin.from("auto_print_subscriptions").select("trial_ends_at,paid_until,status").eq("user_id",agent.user_id).maybeSingle();
  const access=entitled(sub);
  const heartbeat={last_seen_at:new Date().toISOString(),status:action==="pause"?"paused":access?"online":"subscription_expired",printer_name:b.printer_name?String(b.printer_name).slice(0,180):agent.printer_name,platform:b.platform?String(b.platform).slice(0,80):undefined,version:b.version?String(b.version).slice(0,30):undefined};
  await admin.from("auto_print_agents").update(heartbeat).eq("id",agent.id);
  if(!access)return reply({error:"Auto Print plan समाप्त है। ₹149 monthly plan renew करें",code:"SUBSCRIPTION_EXPIRED"},403);
  if(action==="heartbeat"||action==="pause")return reply({ok:true,agent_id:agent.id,status:heartbeat.status});
  if(action==="list_jobs"){
   const {data,error}=await admin.from("print_jobs").select("id,original_name,service_type,color_mode,copies,page_count,amount,payment_status,status,created_at,error_message,updated_at").eq("user_id",agent.user_id).order("created_at",{ascending:false}).limit(100);
   if(error)throw error;return reply({ok:true,jobs:data||[]});
  }
  if(action==="list_pending"){
   const {data,error}=await admin.from("print_jobs").select("id,original_name,service_type,color_mode,copies,page_count,amount,payment_status,status,created_at").eq("user_id",agent.user_id).eq("payment_status","pending").eq("status","pending").order("created_at",{ascending:true}).limit(100);
   if(error)throw error;return reply({ok:true,jobs:data||[]});
  }
  if(action==="approve_payment"){
   const jobId=String(b.job_id||""),received=Number(b.received_amount);
   if(!/^[0-9a-f-]{36}$/i.test(jobId)||!Number.isFinite(received)||received<0)return reply({error:"Invalid approval details"},400);
   const {data:job,error:je}=await admin.from("print_jobs").select("id,amount").eq("id",jobId).eq("user_id",agent.user_id).eq("payment_status","pending").eq("status","pending").maybeSingle();
   if(je)throw je;if(!job)return reply({error:"Pending job not found"},404);
   if(Number(received.toFixed(2))!==Number(Number(job.amount).toFixed(2)))return reply({error:"Payment mismatch. Exact amount मिलने पर ही approve करें"},409);
   const suppliedReference=String(b.payment_reference||"").trim();
   const reference=(suppliedReference||("MANUAL-"+jobId+"-"+received.toFixed(2))).slice(0,180);
   const {data,error}=await admin.from("print_jobs").update({payment_status:"paid",payment_reference:reference,status:"approved",updated_at:new Date().toISOString()}).eq("id",jobId).eq("user_id",agent.user_id).eq("payment_status","pending").eq("status","pending").select("id").maybeSingle();
   if(error?.code==="23505")return reply({error:"यह UPI transaction ID पहले इस्तेमाल हो चुकी है। Reference जाँचकर दोबारा approve करें।"},409);
   if(error)throw error;if(!data)return reply({error:"Job already updated"},409);return reply({ok:true,job_id:jobId,status:"approved"});
  }
  if(action==="reject_payment"){
   const jobId=String(b.job_id||"");if(!/^[0-9a-f-]{36}$/i.test(jobId))return reply({error:"Invalid job id"},400);
   const reason=String(b.error||"Payment not received").slice(0,500);
   const {data,error}=await admin.from("print_jobs").update({payment_status:"rejected",status:"cancelled",error_message:reason,updated_at:new Date().toISOString()}).eq("id",jobId).eq("user_id",agent.user_id).eq("payment_status","pending").eq("status","pending").select("id").maybeSingle();
   if(error)throw error;if(!data)return reply({error:"Job already updated"},409);return reply({ok:true,job_id:jobId,status:"rejected"});
  }
  if(action==="claim"){
   const {data:candidates,error:fe}=await admin.from("print_jobs").select("id,file_path,original_name,print_mode,copies,service_type,color_mode,page_count,amount").eq("user_id",agent.user_id).eq("payment_status","paid").eq("status","approved").order("created_at",{ascending:true}).limit(1);
   if(fe)throw fe;const job=candidates?.[0];if(!job)return reply({ok:true,job:null});
   const {data:claimed,error:ce}=await admin.from("print_jobs").update({status:"printing",agent_id:agent.id,claimed_at:new Date().toISOString(),print_attempts:1}).eq("id",job.id).eq("status","approved").select("id").maybeSingle();
   if(ce)throw ce;if(!claimed)return reply({ok:true,job:null});
   let paths:string[]=[];try{const p=JSON.parse(job.file_path||"[]");paths=Array.isArray(p)?p:[String(job.file_path)]}catch{if(job.file_path)paths=[String(job.file_path)]}
   const {data:signed,error:se}=await admin.storage.from("print-uploads").createSignedUrls(paths,300);
   if(se){await admin.from("print_jobs").update({status:"failed",error_message:se.message}).eq("id",job.id);throw se}
   return reply({ok:true,job:{...job,files:(signed||[]).map((x:any,i:number)=>({path:paths[i],url:x.signedUrl,error:x.error||null}))}});
  }
  if(action==="complete"||action==="failed"){
   const jobId=String(b.job_id||"");if(!/^[0-9a-f-]{36}$/i.test(jobId))return reply({error:"Invalid job id"},400);
   const status=action==="complete"?"printed":"failed",patch={status,printed_at:action==="complete"?new Date().toISOString():null,error_message:action==="failed"?String(b.error||"Print failed").slice(0,500):null,updated_at:new Date().toISOString()};
   const {data,error}=await admin.from("print_jobs").update(patch).eq("id",jobId).eq("user_id",agent.user_id).eq("agent_id",agent.id).eq("status","printing").select("id").maybeSingle();
   if(error)throw error;if(!data)return reply({error:"Job not claimed by this agent"},409);return reply({ok:true,job_id:jobId,status});
  }
  return reply({error:"Unknown action"},400);
 }catch(error){
  const message=error instanceof Error?error.message:(error&&typeof error==="object"&&"message" in error?String((error as {message?:unknown}).message||"Server error"):"Server error");
  return reply({error:message},500)
 }
});