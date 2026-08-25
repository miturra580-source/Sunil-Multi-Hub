using System;
using System.Collections.Generic;
using Newtonsoft.Json;
namespace SunilAutoPrintAgent {
 public sealed class AgentResponse {
  [JsonProperty("ok")] public bool Ok { get; set; }
  [JsonProperty("error")] public string Error { get; set; }
  [JsonProperty("status")] public string Status { get; set; }
  [JsonProperty("job")] public PrintJob Job { get; set; }
  [JsonProperty("jobs")] public List<PrintJob> Jobs { get; set; }
 }
 public sealed class PrintJob {
  [JsonProperty("id")] public string Id { get; set; }
  [JsonProperty("original_name")] public string OriginalName { get; set; }
  [JsonProperty("print_mode")] public string PrintMode { get; set; }
  [JsonProperty("copies")] public int Copies { get; set; }
  [JsonProperty("service_type")] public string ServiceType { get; set; }
  [JsonProperty("color_mode")] public string ColorMode { get; set; }
  [JsonProperty("page_count")] public int PageCount { get; set; }
  [JsonProperty("amount")] public decimal Amount { get; set; }
  [JsonProperty("payment_status")] public string PaymentStatus { get; set; }
  [JsonProperty("status")] public string Status { get; set; }
  [JsonProperty("created_at")] public DateTime CreatedAt { get; set; }
  [JsonProperty("files")] public List<JobFile> Files { get; set; }
 }
 public sealed class JobFile {
  [JsonProperty("path")] public string Path { get; set; }
  [JsonProperty("url")] public string Url { get; set; }
  [JsonProperty("error")] public string Error { get; set; }
 }
}