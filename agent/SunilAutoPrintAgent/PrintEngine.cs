using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Printing;
using System.IO;
using System.Threading.Tasks;
namespace SunilAutoPrintAgent {
 public sealed class PrintEngine {
  readonly AgentApi api;
  public PrintEngine(AgentApi api){this.api=api;}
  public async Task PrintAsync(PrintJob job,string printer){
   if(job.Files==null||job.Files.Count==0)throw new InvalidOperationException("Job file missing");
   var dir=Path.Combine(Path.GetTempPath(),"SunilAutoPrint",job.Id);Directory.CreateDirectory(dir);var local=new List<string>();
   for(int i=0;i<job.Files.Count;i++){if(!string.IsNullOrEmpty(job.Files[i].Error))throw new InvalidOperationException(job.Files[i].Error);var ext=Path.GetExtension(job.Files[i].Path);var path=Path.Combine(dir,i+ext);var bytes=await api.Http.GetByteArrayAsync(job.Files[i].Url);File.WriteAllBytes(path,bytes);local.Add(path);}
   try{if(job.ServiceType=="pdf"||local.Exists(x=>string.Equals(Path.GetExtension(x),".pdf",StringComparison.OrdinalIgnoreCase)))PrintPdf(local,printer,job.Copies);else PrintImages(local,printer,job);}finally{try{Directory.Delete(dir,true);}catch{}}
  }
  static void PrintPdf(List<string> files,string printer,int copies){
   var exe=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"SumatraPDF.exe");if(!File.Exists(exe))throw new FileNotFoundException("SumatraPDF.exe Agent folder में नहीं मिला");
   foreach(var f in files)for(int i=0;i<Math.Max(1,copies);i++){var p=Process.Start(new ProcessStartInfo(exe,"-print-to \""+printer+"\" -silent \""+f+"\""){UseShellExecute=false,CreateNoWindow=true});if(!p.WaitForExit(120000)||p.ExitCode!=0)throw new InvalidOperationException("PDF print failed");}
  }
  static void PrintImages(List<string> files,string printer,PrintJob job){
   using(var doc=new PrintDocument()){doc.PrinterSettings.PrinterName=printer;if(!doc.PrinterSettings.IsValid)throw new InvalidOperationException("Printer available नहीं है");doc.PrinterSettings.Copies=(short)Math.Max(1,Math.Min(20,job.Copies));doc.PrintPage+=(s,e)=>{if(job.ServiceType=="id_card")DrawId(e.Graphics,files);else DrawA4(e.Graphics,e.MarginBounds,files[0]);e.HasMorePages=false;};doc.Print();}
  }
  static void DrawId(Graphics g,List<string> files){float w=85.6f/25.4f*100f,h=54f/25.4f*100f,x=50,y=50;for(int i=0;i<Math.Min(2,files.Count);i++)using(var img=Image.FromFile(files[i])){g.DrawImage(img,new RectangleF(x,y+i*(h+24),w,h));g.DrawRectangle(Pens.LightGray,x,y+i*(h+24),w,h);}}
  static void DrawA4(Graphics g,Rectangle bounds,string file){using(var img=Image.FromFile(file)){float r=Math.Min((float)bounds.Width/img.Width,(float)bounds.Height/img.Height);float w=img.Width*r,h=img.Height*r;g.DrawImage(img,bounds.Left+(bounds.Width-w)/2,bounds.Top+(bounds.Height-h)/2,w,h);}}
 }
}