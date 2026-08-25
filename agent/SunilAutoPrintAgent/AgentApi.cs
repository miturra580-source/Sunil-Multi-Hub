using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
namespace SunilAutoPrintAgent {
 public sealed class AgentApi : IDisposable {
  const string Endpoint="https://zktobzhvyxiclvyqnjco.supabase.co/functions/v1/auto-print-agent";
  const string PublishableKey="sb_publishable_IvYEQWxo1jrQo8O5gayraw_wXAJj7JH";
  readonly HttpClient http=new HttpClient(){Timeout=TimeSpan.FromSeconds(40)};
  public AgentApi(){http.DefaultRequestHeaders.Add("apikey",PublishableKey);http.DefaultRequestHeaders.UserAgent.ParseAdd("MultiHub24AutoPrintAgent/1.1.0");}
  public async Task<AgentResponse> CallAsync(string token,string action,string printer,string jobId=null,string error=null,decimal? receivedAmount=null,string paymentReference=null){
   var body=new{token,action,printer_name=printer,platform=Environment.OSVersion.VersionString,version="1.1.0",job_id=jobId,error,received_amount=receivedAmount,payment_reference=paymentReference};
   var res=await http.PostAsync(Endpoint,new StringContent(JsonConvert.SerializeObject(body),Encoding.UTF8,"application/json"));
   var text=await res.Content.ReadAsStringAsync();var data=JsonConvert.DeserializeObject<AgentResponse>(text)??new AgentResponse();
   if(!res.IsSuccessStatusCode)throw new InvalidOperationException(data.Error??("API "+(int)res.StatusCode));return data;
  }
  public HttpClient Http{get{return http;}}
  public void Dispose(){http.Dispose();}
 }
}