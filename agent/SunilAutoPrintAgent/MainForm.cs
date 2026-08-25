using System;
using System.Drawing;
using System.Drawing.Printing;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;
namespace SunilAutoPrintAgent {
 public sealed class MainForm:Form {
  readonly TextBox token=new TextBox(){UseSystemPasswordChar=true,Dock=DockStyle.Top};
  readonly ComboBox printers=new ComboBox(){Dock=DockStyle.Top,DropDownStyle=ComboBoxStyle.DropDownList};
  readonly Button save=new Button(){Text="Save & Start",Dock=DockStyle.Top,Height=38};
  readonly Label status=new Label(){Text="Agent Offline",Dock=DockStyle.Top,Height=35,TextAlign=ContentAlignment.MiddleLeft};
  readonly ListBox log=new ListBox(){Dock=DockStyle.Fill};
  readonly Timer timer=new Timer(){Interval=8000};
  readonly AgentApi api=new AgentApi();bool busy;
  public MainForm(){Text="SUNIL Auto Print Agent";Width=520;Height=420;MinimumSize=new Size(430,320);Controls.Add(log);Controls.Add(status);Controls.Add(save);Controls.Add(printers);Controls.Add(new Label(){Text="Printer",Dock=DockStyle.Top,Height=22});Controls.Add(token);Controls.Add(new Label(){Text="Device Token",Dock=DockStyle.Top,Height=22});foreach(string p in PrinterSettings.InstalledPrinters)printers.Items.Add(p);var old=SecureSettings.Printer();if(printers.Items.Contains(old))printers.SelectedItem=old;else if(printers.Items.Count>0)printers.SelectedIndex=0;token.Text=SecureSettings.Token();save.Click+=async(s,e)=>await StartAsync();timer.Tick+=async(s,e)=>await PollAsync();Shown+=async(s,e)=>{if(token.Text.Length>=32&&printers.SelectedItem!=null)await StartAsync();};FormClosed+=(s,e)=>api.Dispose();}
  async Task StartAsync(){if(token.Text.Trim().Length<32||printers.SelectedItem==null){MessageBox.Show("Device Token और Printer चुनें");return;}SecureSettings.Save(token.Text.Trim(),printers.SelectedItem.ToString());try{await api.CallAsync(token.Text.Trim(),"heartbeat",printers.SelectedItem.ToString());status.Text="Agent Online • "+printers.SelectedItem;timer.Start();Add("Connected");}catch(Exception ex){status.Text="Agent Offline";Add(ex.Message);}}
  async Task PollAsync(){if(busy)return;busy=true;try{var r=await api.CallAsync(SecureSettings.Token(),"claim",SecureSettings.Printer());if(r.Job==null){status.Text="Agent Online • Waiting";return;}Add("Claimed "+r.Job.Id);try{await new PrintEngine(api).PrintAsync(r.Job,SecureSettings.Printer());await api.CallAsync(SecureSettings.Token(),"complete",SecureSettings.Printer(),r.Job.Id);Add("Printed "+r.Job.Id);}catch(Exception ex){await api.CallAsync(SecureSettings.Token(),"failed",SecureSettings.Printer(),r.Job.Id,ex.Message);Add("Failed: "+ex.Message);}}catch(Exception ex){status.Text="Connection error";Add(ex.Message);}finally{busy=false;}}
  void Add(string s){log.Items.Insert(0,DateTime.Now.ToString("HH:mm:ss")+"  "+s);while(log.Items.Count>100)log.Items.RemoveAt(log.Items.Count-1);}
 }
}