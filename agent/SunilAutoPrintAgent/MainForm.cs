using System;
using System.Drawing;
using System.Drawing.Printing;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SunilAutoPrintAgent {
 public sealed class MainForm : Form {
  readonly Color Blue=Color.FromArgb(31,91,232), Green=Color.FromArgb(16,185,129), Red=Color.FromArgb(239,68,68), Ink=Color.FromArgb(23,32,51), Muted=Color.FromArgb(100,116,139);
  readonly TextBox token=new TextBox(){BorderStyle=BorderStyle.FixedSingle,Font=new Font("Segoe UI",10F),UseSystemPasswordChar=true};
  readonly ComboBox printers=new ComboBox(){DropDownStyle=ComboBoxStyle.DropDownList,Font=new Font("Segoe UI",10F)};
  readonly Button start=new Button(){Text="Connect & Start Auto Print",Height=44,FlatStyle=FlatStyle.Flat,Cursor=Cursors.Hand};
  readonly Button refresh=new Button(){Text="↻ Refresh",Height=34,FlatStyle=FlatStyle.Flat,Cursor=Cursors.Hand};
  readonly CheckBox showToken=new CheckBox(){Text="Show token",AutoSize=true};
  readonly Label status=new Label(){Text="●  AGENT OFFLINE",AutoSize=true,Font=new Font("Segoe UI Semibold",10F)};
  readonly Label printerState=new Label(){Text="No printer connected",AutoSize=true,ForeColor=Color.FromArgb(100,116,139)};
  readonly Label lastAction=new Label(){Text="Waiting to connect",AutoSize=true,ForeColor=Color.FromArgb(100,116,139)};
  readonly ListBox log=new ListBox(){BorderStyle=BorderStyle.None,Font=new Font("Consolas",9F),IntegralHeight=false};
  readonly Timer timer=new Timer(){Interval=8000};
  readonly AgentApi api=new AgentApi();
  readonly NotifyIcon tray=new NotifyIcon();
  bool busy,allowExit;

  public MainForm(){
   Text="MULTI HUB 24 Auto Print Agent";Width=760;Height=600;MinimumSize=new Size(620,500);StartPosition=FormStartPosition.CenterScreen;
   BackColor=Color.FromArgb(244,247,251);Font=new Font("Segoe UI",9F);Icon=SystemIcons.Application;
   BuildUi();LoadPrinters();
   var old=SecureSettings.Printer();if(printers.Items.Contains(old))printers.SelectedItem=old;else if(printers.Items.Count>0)printers.SelectedIndex=0;
   token.Text=SecureSettings.Token();start.Click+=async(s,e)=>await StartAsync();refresh.Click+=(s,e)=>LoadPrinters();
   showToken.CheckedChanged+=(s,e)=>token.UseSystemPasswordChar=!showToken.Checked;
   timer.Tick+=async(s,e)=>await PollAsync();Shown+=async(s,e)=>{if(token.Text.Trim().Length>=32&&printers.SelectedItem!=null)await StartAsync();};
   SetupTray();Resize+=(s,e)=>{if(WindowState==FormWindowState.Minimized){Hide();tray.ShowBalloonTip(1200,"MULTI HUB 24","Auto Print Agent background में चल रहा है।",ToolTipIcon.Info);}};
   FormClosing+=(s,e)=>{if(!allowExit){e.Cancel=true;Hide();tray.ShowBalloonTip(1200,"MULTI HUB 24","Agent बंद नहीं हुआ—system tray में चल रहा है।",ToolTipIcon.Info);}else api.Dispose();};
  }

  void BuildUi(){
   var header=new Panel(){Dock=DockStyle.Top,Height=96,BackColor=Blue,Padding=new Padding(24,15,24,12)};
   var logo=new Label(){Text="M24",ForeColor=Blue,BackColor=Color.White,Font=new Font("Segoe UI Black",14F),TextAlign=ContentAlignment.MiddleCenter,Size=new Size(58,58),Location=new Point(24,18)};
   var title=new Label(){Text="MULTI HUB 24",ForeColor=Color.White,Font=new Font("Segoe UI Black",18F),AutoSize=true,Location=new Point(98,17)};
   var subtitle=new Label(){Text="AUTO PRINT AGENT  •  WINDOWS",ForeColor=Color.FromArgb(220,232,255),Font=new Font("Segoe UI Semibold",9F),AutoSize=true,Location=new Point(100,53)};
   var version=new Label(){Text="v1.0  •  Secure background printing",ForeColor=Color.FromArgb(220,232,255),AutoSize=true,Anchor=AnchorStyles.Top|AnchorStyles.Right,Location=new Point(500,38)};
   header.Controls.AddRange(new Control[]{logo,title,subtitle,version});Controls.Add(header);

   var body=new TableLayoutPanel(){Dock=DockStyle.Fill,Padding=new Padding(20),RowCount=3,ColumnCount=1,BackColor=BackColor};
   body.RowStyles.Add(new RowStyle(SizeType.Absolute,74));body.RowStyles.Add(new RowStyle(SizeType.Absolute,190));body.RowStyles.Add(new RowStyle(SizeType.Percent,100));
   var live=Card();live.Padding=new Padding(18,13,18,10);status.ForeColor=Red;status.Location=new Point(18,14);status.Parent=live;
   printerState.Location=new Point(18,39);printerState.Parent=live;lastAction.Anchor=AnchorStyles.Top|AnchorStyles.Right;lastAction.Location=new Point(470,24);lastAction.Parent=live;body.Controls.Add(live,0,0);

   var setup=Card();setup.Padding=new Padding(18);var setupGrid=new TableLayoutPanel(){Dock=DockStyle.Fill,ColumnCount=2,RowCount=4};
   setupGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,72));setupGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,28));
   setupGrid.RowStyles.Add(new RowStyle(SizeType.Absolute,28));setupGrid.RowStyles.Add(new RowStyle(SizeType.Absolute,38));setupGrid.RowStyles.Add(new RowStyle(SizeType.Absolute,42));setupGrid.RowStyles.Add(new RowStyle(SizeType.Percent,100));
   var tokenLabel=LabelOf("DEVICE TOKEN");setupGrid.Controls.Add(tokenLabel,0,0);setupGrid.SetColumnSpan(tokenLabel,2);
   token.Dock=DockStyle.Fill;setupGrid.Controls.Add(token,0,1);showToken.Margin=new Padding(12,8,0,0);setupGrid.Controls.Add(showToken,1,1);
   var printerLabel=LabelOf("CONNECTED PRINTER");printerLabel.Margin=new Padding(0,10,0,0);setupGrid.Controls.Add(printerLabel,0,2);setupGrid.SetColumnSpan(printerLabel,2);
   var bottom=new TableLayoutPanel(){Dock=DockStyle.Fill,ColumnCount=3};bottom.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,58));bottom.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,18));bottom.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,24));
   printers.Dock=DockStyle.Fill;printers.Margin=new Padding(0,5,8,0);refresh.BackColor=Color.White;refresh.ForeColor=Ink;refresh.FlatAppearance.BorderColor=Color.FromArgb(203,213,225);refresh.Margin=new Padding(0,5,8,0);
   start.BackColor=Blue;start.ForeColor=Color.White;start.FlatAppearance.BorderSize=0;start.Margin=new Padding(0,1,0,0);
   bottom.Controls.Add(printers,0,0);bottom.Controls.Add(refresh,1,0);bottom.Controls.Add(start,2,0);setupGrid.Controls.Add(bottom,0,3);setupGrid.SetColumnSpan(bottom,2);setup.Controls.Add(setupGrid);body.Controls.Add(setup,0,1);

   var activity=Card();activity.Padding=new Padding(18,12,18,14);var activityTitle=LabelOf("RECENT ACTIVITY");activityTitle.Dock=DockStyle.Top;activityTitle.Height=28;log.Dock=DockStyle.Fill;log.BackColor=Color.White;log.ForeColor=Ink;
   activity.Controls.Add(log);activity.Controls.Add(activityTitle);body.Controls.Add(activity,0,2);Controls.Add(body);body.BringToFront();header.BringToFront();
  }

  Panel Card(){return new Panel(){Dock=DockStyle.Fill,BackColor=Color.White,Margin=new Padding(0,0,0,12)};}
  Label LabelOf(string text){return new Label(){Text=text,ForeColor=Muted,Font=new Font("Segoe UI Semibold",8.5F),AutoSize=true};}
  void SetupTray(){tray.Icon=SystemIcons.Application;tray.Text="MULTI HUB 24 Auto Print";tray.Visible=true;var menu=new ContextMenuStrip();menu.Items.Add("Open Agent",null,(s,e)=>OpenAgent());menu.Items.Add("Exit",null,(s,e)=>{allowExit=true;tray.Visible=false;Close();});tray.ContextMenuStrip=menu;tray.DoubleClick+=(s,e)=>OpenAgent();}
  void OpenAgent(){Show();WindowState=FormWindowState.Normal;Activate();}
  void LoadPrinters(){var selected=printers.SelectedItem==null?"":printers.SelectedItem.ToString();printers.Items.Clear();foreach(string p in PrinterSettings.InstalledPrinters)printers.Items.Add(p);if(printers.Items.Contains(selected))printers.SelectedItem=selected;else if(printers.Items.Count>0)printers.SelectedIndex=0;Add(printers.Items.Count+" printer(s) detected");}

  async Task StartAsync(){
   if(token.Text.Trim().Length<32||printers.SelectedItem==null){MessageBox.Show("Portal से Device Token copy करें और Printer चुनें।","MULTI HUB 24",MessageBoxButtons.OK,MessageBoxIcon.Warning);return;}
   start.Enabled=false;start.Text="Connecting…";SecureSettings.Save(token.Text.Trim(),printers.SelectedItem.ToString());
   try{await api.CallAsync(token.Text.Trim(),"heartbeat",printers.SelectedItem.ToString());SetState(true,"READY • WAITING FOR PAID JOB");timer.Start();Add("Secure connection established");}
   catch(Exception ex){SetState(false,"CONNECTION FAILED");Add(ex.Message);}
   finally{start.Enabled=true;start.Text="Reconnect Agent";}
  }
  async Task PollAsync(){
   if(busy)return;busy=true;
   try{var r=await api.CallAsync(SecureSettings.Token(),"claim",SecureSettings.Printer());SetState(true,r.Job==null?"READY • WAITING FOR PAID JOB":"PRINTING JOB");
    if(r.Job==null)return;Add("Received job "+r.Job.Id);
    try{await new PrintEngine(api).PrintAsync(r.Job,SecureSettings.Printer());await api.CallAsync(SecureSettings.Token(),"complete",SecureSettings.Printer(),r.Job.Id);SetState(true,"PRINT COMPLETED");Add("Printed successfully "+r.Job.Id);}
    catch(Exception ex){await api.CallAsync(SecureSettings.Token(),"failed",SecureSettings.Printer(),r.Job.Id,ex.Message);SetState(true,"JOB FAILED • AGENT ONLINE");Add("Print failed: "+ex.Message);}
   }catch(Exception ex){SetState(false,"CONNECTION ERROR");Add(ex.Message);}finally{busy=false;}
  }
  void SetState(bool online,string action){status.Text=online?"●  AGENT ONLINE":"●  AGENT OFFLINE";status.ForeColor=online?Green:Red;printerState.Text=online?"Printer: "+SecureSettings.Printer():"No active printer connection";lastAction.Text=action;}
  void Add(string s){if(InvokeRequired){BeginInvoke(new Action<string>(Add),s);return;}log.Items.Insert(0,DateTime.Now.ToString("HH:mm:ss")+"   "+s);while(log.Items.Count>100)log.Items.RemoveAt(log.Items.Count-1);}
 }
}