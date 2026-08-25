using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Printing;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SunilAutoPrintAgent {
 public sealed class MainForm : Form {
  readonly Color Blue=Color.FromArgb(31,91,232), Green=Color.FromArgb(16,185,129), Red=Color.FromArgb(239,68,68), Amber=Color.FromArgb(217,119,6), Ink=Color.FromArgb(23,32,51), Muted=Color.FromArgb(100,116,139);
  readonly TextBox token=new TextBox(){BorderStyle=BorderStyle.FixedSingle,Font=new Font("Segoe UI",10F),UseSystemPasswordChar=true};
  readonly ComboBox printers=new ComboBox(){DropDownStyle=ComboBoxStyle.DropDownList,Font=new Font("Segoe UI",10F)};
  readonly Button start=new Button(){Text="Connect & Start",Height=42,FlatStyle=FlatStyle.Flat,Cursor=Cursors.Hand};
  readonly Button refreshPrinters=new Button(){Text="↻ Printers",Height=42,FlatStyle=FlatStyle.Flat,Cursor=Cursors.Hand};
  readonly Button refreshJobs=new Button(){Text="↻ Refresh orders",Height=34,AutoSize=true,FlatStyle=FlatStyle.Flat,Cursor=Cursors.Hand};
  readonly CheckBox showToken=new CheckBox(){Text="Show token",AutoSize=true};
  readonly Label status=new Label(){Text="●  AGENT OFFLINE",AutoSize=true,Font=new Font("Segoe UI Semibold",10F)};
  readonly Label printerState=new Label(){Text="No printer connected",AutoSize=true,ForeColor=Color.FromArgb(100,116,139)};
  readonly Label lastAction=new Label(){Text="Waiting to connect",AutoSize=true,ForeColor=Color.FromArgb(100,116,139)};
  readonly Label pendingCount=new Label(), queuedCount=new Label(), printingCount=new Label(), printedCount=new Label();
  readonly Label ordersHint=new Label(){Text="Connect करने के बाद customer orders यहाँ अपने-आप आएँगे।",AutoSize=true,ForeColor=Color.FromArgb(100,116,139)};
  readonly DataGridView jobsGrid=new DataGridView();
  readonly ListBox log=new ListBox(){BorderStyle=BorderStyle.None,Font=new Font("Consolas",9F),IntegralHeight=false};
  readonly Timer timer=new Timer(){Interval=5000};
  readonly AgentApi api=new AgentApi();
  readonly NotifyIcon tray=new NotifyIcon();
  List<PrintJob> currentJobs=new List<PrintJob>();
  HashSet<string> knownPending=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
  bool busy,connected,allowExit,jobsLoaded;

  public MainForm(){
   Text="MULTI HUB 24 — Payments & Auto Print";Width=1120;Height=760;MinimumSize=new Size(900,650);StartPosition=FormStartPosition.CenterScreen;
   BackColor=Color.FromArgb(244,247,251);Font=new Font("Segoe UI",9F);Icon=SystemIcons.Application;AutoScaleMode=AutoScaleMode.Dpi;
   BuildUi();LoadPrinters();
   var old=SecureSettings.Printer();if(printers.Items.Contains(old))printers.SelectedItem=old;else if(printers.Items.Count>0)printers.SelectedIndex=0;
   token.Text=SecureSettings.Token();start.Click+=async(s,e)=>await StartAsync();refreshPrinters.Click+=(s,e)=>LoadPrinters();refreshJobs.Click+=async(s,e)=>await RefreshButtonAsync();
   showToken.CheckedChanged+=(s,e)=>token.UseSystemPasswordChar=!showToken.Checked;
   timer.Tick+=async(s,e)=>await PollAsync();Shown+=async(s,e)=>{if(token.Text.Trim().Length>=32&&printers.SelectedItem!=null)await StartAsync();};
   jobsGrid.CellContentClick+=async(s,e)=>await HandleJobActionAsync(e);
   SetupTray();Resize+=(s,e)=>{if(WindowState==FormWindowState.Minimized){Hide();tray.ShowBalloonTip(1200,"MULTI HUB 24","Payment approval और Auto Print background में चालू हैं।",ToolTipIcon.Info);}};
   FormClosing+=(s,e)=>{if(!allowExit){e.Cancel=true;Hide();tray.ShowBalloonTip(1200,"MULTI HUB 24","Software बंद नहीं हुआ—system tray में चल रहा है।",ToolTipIcon.Info);}else api.Dispose();};
  }

  void BuildUi(){
   var header=new Panel(){Dock=DockStyle.Top,Height=92,BackColor=Blue,Padding=new Padding(24,15,24,12)};
   var logo=new Label(){Text="M24",ForeColor=Blue,BackColor=Color.White,Font=new Font("Segoe UI Black",14F),TextAlign=ContentAlignment.MiddleCenter,Size=new Size(58,58),Location=new Point(24,17)};
   var title=new Label(){Text="MULTI HUB 24",ForeColor=Color.White,Font=new Font("Segoe UI Black",18F),AutoSize=true,Location=new Point(98,14)};
   var subtitle=new Label(){Text="PAYMENT APPROVAL  •  AUTO PRINT  •  WINDOWS",ForeColor=Color.FromArgb(220,232,255),Font=new Font("Segoe UI Semibold",9F),AutoSize=true,Location=new Point(100,50)};
   var version=new Label(){Text="v1.2  •  Shop control dashboard",ForeColor=Color.FromArgb(220,232,255),AutoSize=true,Anchor=AnchorStyles.Top|AnchorStyles.Right,Location=new Point(840,35)};
   header.Controls.AddRange(new Control[]{logo,title,subtitle,version});Controls.Add(header);

   var body=new TableLayoutPanel(){Dock=DockStyle.Fill,Padding=new Padding(18),RowCount=4,ColumnCount=1,BackColor=BackColor};
   body.RowStyles.Add(new RowStyle(SizeType.Absolute,72));body.RowStyles.Add(new RowStyle(SizeType.Absolute,116));body.RowStyles.Add(new RowStyle(SizeType.Absolute,86));body.RowStyles.Add(new RowStyle(SizeType.Percent,100));

   var live=Card();live.Padding=new Padding(18,12,18,10);status.ForeColor=Red;status.Location=new Point(18,13);status.Parent=live;
   printerState.Location=new Point(18,39);printerState.Parent=live;lastAction.Anchor=AnchorStyles.Top|AnchorStyles.Right;lastAction.Location=new Point(760,25);lastAction.Parent=live;body.Controls.Add(live,0,0);

   var setup=Card();setup.Padding=new Padding(18,12,18,13);var setupGrid=new TableLayoutPanel(){Dock=DockStyle.Fill,ColumnCount=5,RowCount=2};
   setupGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,43));setupGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,11));setupGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,25));setupGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,9));setupGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,12));
   setupGrid.RowStyles.Add(new RowStyle(SizeType.Absolute,28));setupGrid.RowStyles.Add(new RowStyle(SizeType.Percent,100));
   var tokenLabel=LabelOf("DEVICE TOKEN");var printerLabel=LabelOf("CONNECTED PRINTER");setupGrid.Controls.Add(tokenLabel,0,0);setupGrid.SetColumnSpan(tokenLabel,2);setupGrid.Controls.Add(printerLabel,2,0);setupGrid.SetColumnSpan(printerLabel,3);
   token.Dock=DockStyle.Fill;token.Margin=new Padding(0,3,10,5);showToken.Margin=new Padding(0,13,10,0);printers.Dock=DockStyle.Fill;printers.Margin=new Padding(0,3,10,5);
   refreshPrinters.BackColor=Color.White;refreshPrinters.ForeColor=Ink;refreshPrinters.FlatAppearance.BorderColor=Color.FromArgb(203,213,225);refreshPrinters.Margin=new Padding(0,3,8,5);
   start.BackColor=Blue;start.ForeColor=Color.White;start.FlatAppearance.BorderSize=0;start.Margin=new Padding(0,3,0,5);
   setupGrid.Controls.Add(token,0,1);setupGrid.Controls.Add(showToken,1,1);setupGrid.Controls.Add(printers,2,1);setupGrid.Controls.Add(refreshPrinters,3,1);setupGrid.Controls.Add(start,4,1);setup.Controls.Add(setupGrid);body.Controls.Add(setup,0,1);

   var stats=new TableLayoutPanel(){Dock=DockStyle.Fill,ColumnCount=4,Margin=new Padding(0,0,0,12)};for(var i=0;i<4;i++)stats.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,25));
   stats.Controls.Add(SummaryCard("PAYMENT PENDING",pendingCount,Amber),0,0);stats.Controls.Add(SummaryCard("PRINT QUEUE",queuedCount,Blue),1,0);stats.Controls.Add(SummaryCard("PRINTING / FAILED",printingCount,Red),2,0);stats.Controls.Add(SummaryCard("PRINTED TODAY",printedCount,Green),3,0);body.Controls.Add(stats,0,2);

   var tabs=new TabControl(){Dock=DockStyle.Fill,Font=new Font("Segoe UI Semibold",9F)};var ordersTab=new TabPage("Orders & Payments"){BackColor=Color.White,Padding=new Padding(12)};var activityTab=new TabPage("Activity Log"){BackColor=Color.White,Padding=new Padding(14)};
   var ordersToolbar=new Panel(){Dock=DockStyle.Top,Height=45};ordersHint.Location=new Point(2,12);ordersHint.Parent=ordersToolbar;refreshJobs.Dock=DockStyle.Right;refreshJobs.Margin=new Padding(8,4,0,7);refreshJobs.BackColor=Color.White;refreshJobs.FlatAppearance.BorderColor=Color.FromArgb(203,213,225);refreshJobs.Parent=ordersToolbar;
   ConfigureJobsGrid();ordersTab.Controls.Add(jobsGrid);ordersTab.Controls.Add(ordersToolbar);jobsGrid.BringToFront();
   var logTitle=LabelOf("RECENT SOFTWARE ACTIVITY");logTitle.Dock=DockStyle.Top;logTitle.Height=28;log.Dock=DockStyle.Fill;log.BackColor=Color.White;log.ForeColor=Ink;activityTab.Controls.Add(log);activityTab.Controls.Add(logTitle);
   tabs.TabPages.Add(ordersTab);tabs.TabPages.Add(activityTab);body.Controls.Add(tabs,0,3);Controls.Add(body);body.BringToFront();header.BringToFront();
  }

  void ConfigureJobsGrid(){
   jobsGrid.Dock=DockStyle.Fill;jobsGrid.BackgroundColor=Color.White;jobsGrid.BorderStyle=BorderStyle.None;jobsGrid.RowHeadersVisible=false;jobsGrid.AllowUserToAddRows=false;jobsGrid.AllowUserToDeleteRows=false;jobsGrid.AllowUserToResizeRows=false;jobsGrid.MultiSelect=false;jobsGrid.SelectionMode=DataGridViewSelectionMode.FullRowSelect;jobsGrid.ReadOnly=true;jobsGrid.AutoSizeRowsMode=DataGridViewAutoSizeRowsMode.AllCells;jobsGrid.ColumnHeadersHeight=38;jobsGrid.RowTemplate.Height=44;jobsGrid.EnableHeadersVisualStyles=false;
   jobsGrid.ColumnHeadersDefaultCellStyle.BackColor=Color.FromArgb(239,244,252);jobsGrid.ColumnHeadersDefaultCellStyle.ForeColor=Ink;jobsGrid.ColumnHeadersDefaultCellStyle.Font=new Font("Segoe UI Semibold",9F);jobsGrid.DefaultCellStyle.Padding=new Padding(5);jobsGrid.DefaultCellStyle.SelectionBackColor=Color.FromArgb(230,238,255);jobsGrid.DefaultCellStyle.SelectionForeColor=Ink;
   jobsGrid.Columns.Add(Column("time","Time",90));jobsGrid.Columns.Add(Column("file","Document",230,true));jobsGrid.Columns.Add(Column("details","Print details",150));jobsGrid.Columns.Add(Column("amount","Amount",80));jobsGrid.Columns.Add(Column("payment","Payment",110));jobsGrid.Columns.Add(Column("print","Print status",110));
   jobsGrid.Columns.Add(ButtonColumn("approve","Payment action",125));jobsGrid.Columns.Add(ButtonColumn("reject","Reject",75));
  }
  DataGridViewTextBoxColumn Column(string name,string title,int width,bool fill=false){return new DataGridViewTextBoxColumn(){Name=name,HeaderText=title,Width=width,AutoSizeMode=fill?DataGridViewAutoSizeColumnMode.Fill:DataGridViewAutoSizeColumnMode.None,SortMode=DataGridViewColumnSortMode.NotSortable};}
  DataGridViewButtonColumn ButtonColumn(string name,string title,int width){return new DataGridViewButtonColumn(){Name=name,HeaderText=title,Width=width,FlatStyle=FlatStyle.Flat,UseColumnTextForButtonValue=false,SortMode=DataGridViewColumnSortMode.NotSortable};}
  Panel Card(){return new Panel(){Dock=DockStyle.Fill,BackColor=Color.White,Margin=new Padding(0,0,0,12)};}
  Label LabelOf(string text){return new Label(){Text=text,ForeColor=Muted,Font=new Font("Segoe UI Semibold",8.5F),AutoSize=true};}
  Panel SummaryCard(string title,Label value,Color accent){var p=Card();p.Margin=new Padding(0,0,10,12);var t=LabelOf(title);t.Location=new Point(15,10);value.Text="0";value.ForeColor=accent;value.Font=new Font("Segoe UI Black",18F);value.AutoSize=true;value.Location=new Point(14,32);p.Controls.Add(t);p.Controls.Add(value);return p;}

  void SetupTray(){tray.Icon=SystemIcons.Application;tray.Text="MULTI HUB 24 Payments & Auto Print";tray.Visible=true;var menu=new ContextMenuStrip();menu.Items.Add("Open Dashboard",null,(s,e)=>OpenAgent());menu.Items.Add("Refresh Orders",null,async(s,e)=>await RefreshButtonAsync());menu.Items.Add("Exit",null,(s,e)=>{allowExit=true;tray.Visible=false;Close();});tray.ContextMenuStrip=menu;tray.DoubleClick+=(s,e)=>OpenAgent();}
  void OpenAgent(){Show();WindowState=FormWindowState.Normal;Activate();}
  void LoadPrinters(){var selected=printers.SelectedItem==null?"":printers.SelectedItem.ToString();printers.Items.Clear();foreach(string p in PrinterSettings.InstalledPrinters)printers.Items.Add(p);if(printers.Items.Contains(selected))printers.SelectedItem=selected;else if(printers.Items.Count>0)printers.SelectedIndex=0;Add(printers.Items.Count+" printer(s) detected");}

  async Task StartAsync(){
   if(token.Text.Trim().Length<32||printers.SelectedItem==null){MessageBox.Show("Portal से Device Token copy करें और Printer चुनें।","MULTI HUB 24",MessageBoxButtons.OK,MessageBoxIcon.Warning);return;}
   timer.Stop();connected=false;start.Enabled=false;start.Text="Connecting…";SecureSettings.Save(token.Text.Trim(),printers.SelectedItem.ToString());
   try{await api.CallAsync(token.Text.Trim(),"heartbeat",printers.SelectedItem.ToString());connected=true;SetState(true,"READY • CHECKING ORDERS");await RefreshJobsCoreAsync();timer.Start();Add("Secure connection established");await PollAsync();}
   catch(Exception ex){SetState(false,"CONNECTION FAILED");Add(ex.Message);MessageBox.Show(ex.Message,"Connection failed",MessageBoxButtons.OK,MessageBoxIcon.Error);}
   finally{start.Enabled=true;start.Text="Reconnect";}
  }

  async Task RefreshButtonAsync(){
   if(!connected){MessageBox.Show("पहले agent connect करें।","MULTI HUB 24",MessageBoxButtons.OK,MessageBoxIcon.Information);return;}if(busy)return;busy=true;refreshJobs.Enabled=false;
   try{await RefreshJobsCoreAsync();SetState(true,"ORDERS UPDATED");}catch(Exception ex){SetState(false,"CONNECTION ERROR");Add(ex.Message);}finally{refreshJobs.Enabled=true;busy=false;}
  }

  async Task PollAsync(){
   if(busy||!connected)return;busy=true;
   try{await RefreshJobsCoreAsync();var printed=await ClaimAndPrintCoreAsync();if(printed)await RefreshJobsCoreAsync();else SetState(true,currentJobs.Any(IsPending)?"PAYMENT APPROVAL REQUIRED":"READY • WAITING FOR ORDERS");}
   catch(Exception ex){SetState(false,"CONNECTION ERROR");Add(ex.Message);}finally{busy=false;}
  }

  async Task RefreshJobsCoreAsync(){
   var r=await api.CallAsync(SecureSettings.Token(),"list_jobs",SecureSettings.Printer());currentJobs=r.Jobs??new List<PrintJob>();RenderJobs();
   var pending=currentJobs.Where(IsPending).Select(x=>x.Id).Where(x=>!String.IsNullOrWhiteSpace(x)).ToList();var newlyArrived=pending.Where(x=>!knownPending.Contains(x)).Count();
   if(jobsLoaded&&newlyArrived>0)tray.ShowBalloonTip(2200,"New payment approval",newlyArrived+" नया customer print order आया है।",ToolTipIcon.Info);
   knownPending=new HashSet<string>(pending,StringComparer.OrdinalIgnoreCase);jobsLoaded=true;
  }

  async Task<bool> ClaimAndPrintCoreAsync(){
   var r=await api.CallAsync(SecureSettings.Token(),"claim",SecureSettings.Printer());SetState(true,r.Job==null?"READY • WAITING FOR PAID JOB":"PRINTING JOB");if(r.Job==null)return false;
   Add("Received paid job "+r.Job.Id);
   try{await new PrintEngine(api).PrintAsync(r.Job,SecureSettings.Printer());await api.CallAsync(SecureSettings.Token(),"complete",SecureSettings.Printer(),r.Job.Id);SetState(true,"PRINT COMPLETED");Add("Printed successfully "+r.Job.Id);tray.ShowBalloonTip(1800,"Print completed",ShortName(r.Job.OriginalName,52),ToolTipIcon.Info);}
   catch(Exception ex){await api.CallAsync(SecureSettings.Token(),"failed",SecureSettings.Printer(),r.Job.Id,ex.Message);SetState(true,"JOB FAILED • AGENT ONLINE");Add("Print failed: "+ex.Message);}
   return true;
  }

  void RenderJobs(){
   jobsGrid.SuspendLayout();jobsGrid.Rows.Clear();foreach(var job in currentJobs){var pending=IsPending(job);var row=jobsGrid.Rows.Add(job.CreatedAt.ToLocalTime().ToString("dd MMM\nHH:mm"),ShortName(job.OriginalName,75),Details(job),Money(job.Amount),PaymentLabel(job.PaymentStatus),PrintLabel(job.Status),pending?"Verify & Approve":"—",pending?"Reject":"—");jobsGrid.Rows[row].Tag=job;if(pending){jobsGrid.Rows[row].Cells["payment"].Style.ForeColor=Amber;jobsGrid.Rows[row].Cells["approve"].Style.BackColor=Color.FromArgb(228,238,255);jobsGrid.Rows[row].Cells["approve"].Style.ForeColor=Blue;}else if(String.Equals(job.Status,"printed",StringComparison.OrdinalIgnoreCase)){jobsGrid.Rows[row].Cells["print"].Style.ForeColor=Green;}}
   jobsGrid.ResumeLayout();var now=DateTime.Now.Date;pendingCount.Text=currentJobs.Count(IsPending).ToString();queuedCount.Text=currentJobs.Count(x=>String.Equals(x.PaymentStatus,"paid",StringComparison.OrdinalIgnoreCase)&&String.Equals(x.Status,"approved",StringComparison.OrdinalIgnoreCase)).ToString();printingCount.Text=currentJobs.Count(x=>String.Equals(x.Status,"printing",StringComparison.OrdinalIgnoreCase)||String.Equals(x.Status,"failed",StringComparison.OrdinalIgnoreCase)).ToString();printedCount.Text=currentJobs.Count(x=>String.Equals(x.Status,"printed",StringComparison.OrdinalIgnoreCase)&&x.CreatedAt.ToLocalTime().Date==now).ToString();ordersHint.Text=currentJobs.Count==0?"अभी कोई customer order नहीं है।":"Latest "+currentJobs.Count+" orders • Pending payment को verify करके approve करें।";
  }

  async Task HandleJobActionAsync(DataGridViewCellEventArgs e){
   if(e.RowIndex<0||e.ColumnIndex<0||busy||!connected)return;var row=jobsGrid.Rows[e.RowIndex];var job=row.Tag as PrintJob;if(job==null||!IsPending(job))return;var name=jobsGrid.Columns[e.ColumnIndex].Name;
   if(name=="approve")await ApprovePaymentAsync(job);else if(name=="reject")await RejectPaymentAsync(job);
  }

  async Task ApprovePaymentAsync(PrintJob job){
   using(var dialog=new PaymentApprovalDialog(job,Blue,Ink,Muted)){if(dialog.ShowDialog(this)!=DialogResult.OK)return;busy=true;timer.Stop();jobsGrid.Enabled=false;
    try{await api.CallAsync(SecureSettings.Token(),"approve_payment",SecureSettings.Printer(),job.Id,null,dialog.ReceivedAmount,dialog.PaymentReference);Add("Payment approved "+job.Id+" • "+Money(dialog.ReceivedAmount));SetState(true,"PAYMENT APPROVED • SENDING TO PRINTER");await RefreshJobsCoreAsync();await ClaimAndPrintCoreAsync();await RefreshJobsCoreAsync();}
    catch(Exception ex){Add("Approval failed: "+ex.Message);MessageBox.Show(ex.Message,"Payment approve नहीं हुआ",MessageBoxButtons.OK,MessageBoxIcon.Warning);}
    finally{jobsGrid.Enabled=true;busy=false;if(connected)timer.Start();}
   }
  }

  async Task RejectPaymentAsync(PrintJob job){
   var answer=MessageBox.Show(Money(job.Amount)+" payment नहीं मिला या गलत है?\n\nReject करने पर customer को दोबारा payment करने का message दिखेगा।","Reject payment",MessageBoxButtons.YesNo,MessageBoxIcon.Warning,MessageBoxDefaultButton.Button2);if(answer!=DialogResult.Yes)return;
   busy=true;timer.Stop();jobsGrid.Enabled=false;try{await api.CallAsync(SecureSettings.Token(),"reject_payment",SecureSettings.Printer(),job.Id,"Payment not received or amount mismatch");Add("Payment rejected "+job.Id);await RefreshJobsCoreAsync();}
   catch(Exception ex){Add("Reject failed: "+ex.Message);MessageBox.Show(ex.Message,"Payment reject नहीं हुआ",MessageBoxButtons.OK,MessageBoxIcon.Warning);}finally{jobsGrid.Enabled=true;busy=false;if(connected)timer.Start();}
  }

  static bool IsPending(PrintJob job){return job!=null&&String.Equals(job.PaymentStatus,"pending",StringComparison.OrdinalIgnoreCase)&&String.Equals(job.Status,"pending",StringComparison.OrdinalIgnoreCase);}
  static string ShortName(string value,int max){value=String.IsNullOrWhiteSpace(value)?"Print Job":value.Trim();return value.Length<=max?value:value.Substring(0,max-1)+"…";}
  static string Details(PrintJob j){var service=String.Equals(j.ServiceType,"id_card",StringComparison.OrdinalIgnoreCase)?"ID Card":String.Equals(j.ServiceType,"pdf",StringComparison.OrdinalIgnoreCase)?"PDF":"A4";var colour=String.Equals(j.ColorMode,"color",StringComparison.OrdinalIgnoreCase)?"Colour":"B&W";return service+" • "+colour+"\n"+Math.Max(1,j.PageCount)+" page × "+Math.Max(1,j.Copies)+" copy";}
  static string Money(decimal n){return "₹"+n.ToString("0.00");}
  static string PaymentLabel(string value){switch((value??"").ToLowerInvariant()){case "paid":return "✓ Paid";case "rejected":return "Rejected";default:return "Pending";}}
  static string PrintLabel(string value){switch((value??"").ToLowerInvariant()){case "approved":return "Print queue";case "printing":return "Printing…";case "printed":return "✓ Printed";case "failed":return "Failed";case "rejected":return "Rejected";case "cancelled":return "Cancelled";default:return "Pending";}}
  void SetState(bool online,string action){status.Text=online?"●  AGENT ONLINE":"●  AGENT OFFLINE";status.ForeColor=online?Green:Red;printerState.Text=online?"Printer: "+SecureSettings.Printer():"No active printer connection";lastAction.Text=action;}
  void Add(string s){if(InvokeRequired){BeginInvoke(new Action<string>(Add),s);return;}log.Items.Insert(0,DateTime.Now.ToString("HH:mm:ss")+"   "+s);while(log.Items.Count>150)log.Items.RemoveAt(log.Items.Count-1);}

  sealed class PaymentApprovalDialog : Form {
   readonly NumericUpDown received=new NumericUpDown(){DecimalPlaces=2,Minimum=0,Maximum=1000000,ThousandsSeparator=true,Font=new Font("Segoe UI Semibold",12F)};
   readonly TextBox reference=new TextBox(){Font=new Font("Segoe UI",10F)};readonly PrintJob job;
   public decimal ReceivedAmount{get{return received.Value;}}public string PaymentReference{get{return String.IsNullOrWhiteSpace(reference.Text)?null:reference.Text.Trim();}}
   public PaymentApprovalDialog(PrintJob value,Color blue,Color ink,Color muted){job=value;Text="Verify customer payment";Width=500;Height=410;MinimumSize=new Size(470,390);StartPosition=FormStartPosition.CenterParent;FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;MinimizeBox=false;BackColor=Color.White;Font=new Font("Segoe UI",9F);
    var title=new Label(){Text="Payment वास्तव में मिला है?",Font=new Font("Segoe UI Black",16F),ForeColor=ink,AutoSize=true,Location=new Point(24,20)};var sub=new Label(){Text=ShortName(job.OriginalName,62)+"\nExpected amount: "+Money(job.Amount),ForeColor=muted,AutoSize=true,Location=new Point(26,58)};
    var amountLabel=new Label(){Text="RECEIVED AMOUNT",Font=new Font("Segoe UI Semibold",8.5F),ForeColor=muted,AutoSize=true,Location=new Point(26,112)};received.Location=new Point(26,136);received.Size=new Size(430,35);received.Value=job.Amount;
    var refLabel=new Label(){Text="UPI REFERENCE / NOTE (OPTIONAL)",Font=new Font("Segoe UI Semibold",8.5F),ForeColor=muted,AutoSize=true,Location=new Point(26,188)};reference.Location=new Point(26,212);reference.Size=new Size(430,34);
    var warning=new Label(){Text="सुरक्षा: Bank/Paytm में exact amount दिखाई देने पर ही approve करें। Screenshot देखकर approve न करें।",ForeColor=Color.FromArgb(146,64,14),BackColor=Color.FromArgb(255,247,237),AutoSize=false,Size=new Size(430,48),Location=new Point(26,260),Padding=new Padding(9)};
    var cancel=new Button(){Text="Cancel",DialogResult=DialogResult.Cancel,Size=new Size(105,40),Location=new Point(238,316),FlatStyle=FlatStyle.Flat,BackColor=Color.White};var approve=new Button(){Text="Approve & Print",Size=new Size(115,40),Location=new Point(350,316),FlatStyle=FlatStyle.Flat,BackColor=blue,ForeColor=Color.White};approve.FlatAppearance.BorderSize=0;
    approve.Click+=(s,e)=>{if(Math.Round(received.Value,2)!=Math.Round(job.Amount,2)){MessageBox.Show("Expected "+Money(job.Amount)+" है, लेकिन received amount "+Money(received.Value)+" डाला गया है। Exact amount मिले बिना approve नहीं होगा।","Amount mismatch",MessageBoxButtons.OK,MessageBoxIcon.Warning);return;}DialogResult=DialogResult.OK;Close();};
    Controls.AddRange(new Control[]{title,sub,amountLabel,received,refLabel,reference,warning,cancel,approve});CancelButton=cancel;AcceptButton=approve;
   }
  }
 }
}
