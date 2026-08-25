using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
namespace SunilAutoPrintAgent {
 public static class SecureSettings {
  static readonly string Dir=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"SunilMultiHub","AutoPrint");
  static readonly string TokenFile=Path.Combine(Dir,"device.dat");
  static readonly string PrinterFile=Path.Combine(Dir,"printer.txt");
  public static void Save(string token,string printer){Directory.CreateDirectory(Dir);File.WriteAllBytes(TokenFile,ProtectedData.Protect(Encoding.UTF8.GetBytes(token),null,DataProtectionScope.CurrentUser));File.WriteAllText(PrinterFile,printer??"",Encoding.UTF8);}
  public static string Token(){try{return Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(TokenFile),null,DataProtectionScope.CurrentUser));}catch{return "";}}
  public static string Printer(){try{return File.ReadAllText(PrinterFile,Encoding.UTF8);}catch{return "";}}
 }
}