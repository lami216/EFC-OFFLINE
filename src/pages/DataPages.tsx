import{useEffect,useMemo,useState}from'react';
import{Download,Search,CalendarRange,Filter,BarChart3,Users,Wallet,BookOpen,NotebookTabs,RefreshCw}from'lucide-react';
import{Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis}from'recharts';
import{save}from'@tauri-apps/plugin-dialog';
import{writeFile}from'@tauri-apps/plugin-fs';
import{toast}from'sonner';
import{api}from'../lib/api';
import{Button,Card,Empty,Input}from'../components/ui';
import{money}from'../lib/format';
import{StudentDrawer}from'../components/StudentDrawer';
import type{Bootstrap,ChartPoint,FinanceReport,Row,UserSession}from'../types';

const today=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const monthStart=()=>`${today().slice(0,8)}01`;
const moneyColumns=new Set(['المبلغ','المطلوب','المدفوع','المتبقي','المحصل']);
const errorText=(e:unknown)=>typeof e==='string'?e:e instanceof Error?e.message:'تعذر جلب البيانات.';

function useRows(kind:string,filters:Record<string,string>,refresh=0){
  const[rows,setRows]=useState<Row[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
  const key=JSON.stringify(filters);
  useEffect(()=>{let cancelled=false;setLoading(true);setError('');const timer=window.setTimeout(()=>{void api.query(kind,JSON.parse(key) as Record<string,string>).then(v=>{if(!cancelled)setRows(v)}).catch(e=>{if(!cancelled)setError(errorText(e))}).finally(()=>{if(!cancelled)setLoading(false)})},180);return()=>{cancelled=true;window.clearTimeout(timer)}},[kind,key,refresh]);
  return{rows,loading,error};
}

function BranchSelect({data,user,value,onChange}:{data:Bootstrap;user:UserSession;value:string;onChange:(v:string)=>void}){
  if(user.branchId){const b=data.branches.find(x=>x.id===user.branchId);return <select value={user.branchId} disabled><option value={user.branchId}>{b?.name||'فرع الموظف'}</option></select>}
  return <select value={value} onChange={e=>onChange(e.target.value)}><option value="">كل الفروع</option>{data.branches.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
}
function SpecialtySelect({data,value,onChange}:{data:Bootstrap;value:string;onChange:(v:string)=>void}){return <select value={value} onChange={e=>onChange(e.target.value)}><option value="">كل التخصصات</option>{data.specialties.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>}
function MethodSelect({data,value,onChange}:{data:Bootstrap;value:string;onChange:(v:string)=>void}){return <select value={value} onChange={e=>onChange(e.target.value)}><option value="">كل وسائل الدفع</option>{data.paymentMethods.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>}

function renderValue(key:string,value:string|number|null){
  if(value===null)return'—';
  if(typeof value==='number'&&moneyColumns.has(key))return money(value);
  const text=String(value);
  if(['مدفوع كامل','نشطة','مدفوع'].includes(text))return <span className="status paid">{text}</span>;
  if(['متأخر','ملغاة','انتهت','لم يدفع'].includes(text))return <span className="status overdue">{text}</span>;
  if(['مستحق الآن','دفع جزئي','ستنتهي قريباً'].includes(text))return <span className="status due">{text}</span>;
  return text;
}
function DataTable({rows,onStudent,empty='لا توجد نتائج مطابقة'}:{rows:Row[];onStudent?:(id:string)=>void;empty?:string}){
  if(rows.length===0)return <Empty title={empty} detail="غيّر معايير البحث أو ابدأ بإضافة بيانات جديدة."/>;
  const columns=Object.keys(rows[0]).filter(k=>!k.startsWith('_'));
  return <div className="table-wrap"><table><thead><tr>{columns.map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{rows.map((row,index)=>{const id=typeof row._studentId==='string'?row._studentId:'';return <tr key={`${id}-${index}`} className={id&&onStudent?'clickable':''} onClick={()=>id&&onStudent?.(id)}>{columns.map(k=><td key={k}>{renderValue(k,row[k])}</td>)}</tr>})}</tbody></table></div>
}

async function exportCsv(rows:Row[],name:string){
  if(rows.length===0){toast.error('لا توجد بيانات لتصديرها.');return}
  const cols=Object.keys(rows[0]).filter(k=>!k.startsWith('_'));
  const escape=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`;
  const body=['\uFEFF'+cols.map(escape).join(','),...rows.map(r=>cols.map(k=>escape(r[k])).join(','))].join('\r\n');
  const path=await save({defaultPath:`${name}.csv`,filters:[{name:'CSV',extensions:['csv']}]});
  if(path){await writeFile(path,new TextEncoder().encode(body));toast.success('تم تصدير الملف بنجاح.')}
}

function PageHeader({eyebrow='إدارة المركز',title,description,action}:{eyebrow?:string;title:string;description:string;action?:React.ReactNode}){return <div className="page-title"><div><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>{action}</div>}

function LoadingBlock(){return <div className="data-loading"><span className="loader"/>جارٍ تحديث البيانات…</div>}
function ErrorBlock({text}:{text:string}){return <div className="data-error"><b>تعذر تحميل البيانات</b><span>{text}</span></div>}

function StudentsPage({data,user,onStudent}:{data:Bootstrap;user:UserSession;onStudent:(id:string)=>void}){
  const[q,setQ]=useState('');const[branchId,setBranch]=useState(user.branchId||'');const[specialtyId,setSpecialty]=useState('');
  const{rows,loading,error}=useRows('students',{q,branchId,specialtyId});
  return <><PageHeader title="البحث عن طالب" description="ابحث بالاسم أو الهاتف أو رقم السجل، ثم افتح ملف الطالب الكامل." action={<Button className="secondary" onClick={()=>void exportCsv(rows,'قائمة-الطلاب')}><Download size={16}/>تصدير</Button>}/><Card><div className="filter-bar"><div className="search-input"><Search size={17}/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="اسم الطالب، الهاتف أو رقم السجل..."/></div><BranchSelect data={data} user={user} value={branchId} onChange={setBranch}/><SpecialtySelect data={data} value={specialtyId} onChange={setSpecialty}/></div>{loading?<LoadingBlock/>:error?<ErrorBlock text={error}/>:<DataTable rows={rows} onStudent={onStudent}/>}</Card></>
}

function SpecialtiesPage({data,user,onStudent}:{data:Bootstrap;user:UserSession;onStudent:(id:string)=>void}){
  const[branchId,setBranch]=useState(user.branchId||'');const[selected,setSelected]=useState('');
  const summary=useRows('specialties',{branchId});
  const students=useRows('students',{q:'',branchId,specialtyId:selected});
  const name=data.specialties.find(x=>x.id===selected)?.name;
  return <><PageHeader title="التخصصات والدورات" description="نظرة على عدد الطلاب والتحصيل والمتبقي، ثم ادخل لأي تخصص لرؤية طلابه."/><Card><div className="filter-bar"><BranchSelect data={data} user={user} value={branchId} onChange={setBranch}/></div>{summary.loading?<LoadingBlock/>:summary.error?<ErrorBlock text={summary.error}/>:summary.rows.length===0?<Empty/>:<div className="specialty-grid">{summary.rows.map((r,i)=>{const id=String(r._specialtyId||'');return <button key={id||i} className={`specialty-card ${selected===id?'selected':''}`} onClick={()=>setSelected(id)}><div><BookOpen size={19}/><b>{r['التخصص']}</b></div><span>{r['المدة']} {r['الوحدة']}</span><div className="specialty-metrics"><span><small>الطلاب</small><b>{r['الطلاب']}</b></span><span><small>المحصل</small><b>{money(Number(r['المحصل']||0))}</b></span><span><small>المتبقي</small><b>{money(Number(r['المتبقي']||0))}</b></span></div></button>})}</div>}</Card>{selected&&<Card className="section-card"><div className="section-card-head"><div><p>طلاب التخصص</p><h2>{name}</h2></div><Button className="secondary" onClick={()=>void exportCsv(students.rows,`طلاب-${name||'التخصص'}`)}><Download size={16}/>تصدير</Button></div>{students.loading?<LoadingBlock/>:students.error?<ErrorBlock text={students.error}/>:<DataTable rows={students.rows} onStudent={onStudent}/>}</Card>}</>
}

const periodTabs=[['registrations','المسجلون'],['payments','الدفعات'],['dues','المستحقات'],['ended','نهايات الدورات']] as const;
function PeriodPage({data,user,onStudent}:{data:Bootstrap;user:UserSession;onStudent:(id:string)=>void}){
  const[from,setFrom]=useState(monthStart());const[to,setTo]=useState(today());const[branchId,setBranch]=useState(user.branchId||'');const[specialtyId,setSpecialty]=useState('');const[tab,setTab]=useState<(typeof periodTabs)[number][0]>('registrations');
  const{rows,loading,error}=useRows(`period_${tab}`,{from,to,branchId,specialtyId});
  return <><PageHeader title="آلية البحث بالفترة" description="اعرف من سجل، من دفع، من عليه استحقاق، وأي دورة تنتهي داخل أي فترة تختارها." action={<Button className="secondary" onClick={()=>void exportCsv(rows,`تقرير-${tab}-${from}-${to}`)}><Download size={16}/>تصدير</Button>}/><Card><div className="filter-grid"><label>من تاريخ<Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>إلى تاريخ<Input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><label>الفرع<BranchSelect data={data} user={user} value={branchId} onChange={setBranch}/></label><label>التخصص<SpecialtySelect data={data} value={specialtyId} onChange={setSpecialty}/></label></div><div className="segmented">{periodTabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>{loading?<LoadingBlock/>:error?<ErrorBlock text={error}/>:<DataTable rows={rows} onStudent={onStudent}/>}</Card></>
}

function StatusPage({data,user,onStudent}:{data:Bootstrap;user:UserSession;onStudent:(id:string)=>void}){
  const[branchId,setBranch]=useState(user.branchId||'');const[specialtyId,setSpecialty]=useState('');const[status,setStatus]=useState('');
  const result=useRows('status',{branchId,specialtyId});
  const rows=useMemo(()=>status?result.rows.filter(r=>String(r['الوضعية المالية'])===status||String(r['وضع الدورة'])===status):result.rows,[result.rows,status]);
  return <><PageHeader title="البحث بالوضعية" description="اعزل الطلاب المدفوعين أو المتأخرين أو المستحقين الآن أو الذين قاربت دوراتهم على الانتهاء." action={<Button className="secondary" onClick={()=>void exportCsv(rows,'تقرير-الوضعيات')}><Download size={16}/>تصدير CSV</Button>}/><Card><div className="filter-bar"><BranchSelect data={data} user={user} value={branchId} onChange={setBranch}/><SpecialtySelect data={data} value={specialtyId} onChange={setSpecialty}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">كل الوضعيات</option><option>مدفوع كامل</option><option>دفع جزئي</option><option>لم يدفع</option><option>مستحق الآن</option><option>متأخر</option><option>نشطة</option><option>ستنتهي قريباً</option><option>انتهت</option></select></div>{result.loading?<LoadingBlock/>:result.error?<ErrorBlock text={result.error}/>:<DataTable rows={rows} onStudent={onStudent}/>}</Card></>
}

function Breakdown({title,data}:{title:string;data:ChartPoint[]}){const max=Math.max(1,...data.map(x=>x.value));return <Card className="breakdown"><h3>{title}</h3>{data.length===0?<Empty title="لا توجد حركة" detail="لا توجد دفعات في الفترة المحددة."/>:<div>{data.slice(0,10).map(x=><div key={x.label} className="breakdown-row"><span>{x.label}</span><div><i style={{width:`${Math.max(3,(x.value/max)*100)}%`}}/></div><b>{money(x.value)}</b></div>)}</div>}</Card>}

function FinancePage({data,user}:{data:Bootstrap;user:UserSession}){
  const[from,setFrom]=useState(monthStart());const[to,setTo]=useState(today());const[branchId,setBranch]=useState(user.branchId||'');const[specialtyId,setSpecialty]=useState('');const[paymentMethodId,setMethod]=useState('');const[bucket,setBucket]=useState('day');const[report,setReport]=useState<FinanceReport>();const[loading,setLoading]=useState(true);const[error,setError]=useState('');
  const key=JSON.stringify({from,to,branchId,specialtyId,paymentMethodId,bucket});
  useEffect(()=>{let cancelled=false;setLoading(true);setError('');void api.financeReport(JSON.parse(key)).then(r=>{if(!cancelled)setReport(r)}).catch(e=>{if(!cancelled)setError(errorText(e))}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[key]);
  function preset(type:'today'|'week'|'month'|'year'){
    const now=new Date();const end=today();let start=end;let b='day';
    if(type==='week'){const d=new Date(now);d.setDate(d.getDate()-6);start=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
    if(type==='month')start=monthStart();
    if(type==='year'){start=`${now.getFullYear()}-01-01`;b='month'}
    setFrom(start);setTo(end);setBucket(b);
  }
  return <><PageHeader title="المالية" description="تحليل الدخل الحقيقي من الدفعات غير الملغاة حسب الفترة والفرع والتخصص ووسيلة الدفع."/><div className="preset-row"><button onClick={()=>preset('today')}>اليوم</button><button onClick={()=>preset('week')}>7 أيام</button><button onClick={()=>preset('month')}>هذا الشهر</button><button onClick={()=>preset('year')}>هذه السنة</button></div><Card><div className="filter-grid five"><label>من<Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>إلى<Input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><label>الفرع<BranchSelect data={data} user={user} value={branchId} onChange={setBranch}/></label><label>التخصص<SpecialtySelect data={data} value={specialtyId} onChange={setSpecialty}/></label><label>وسيلة الدفع<MethodSelect data={data} value={paymentMethodId} onChange={setMethod}/></label></div></Card>{loading?<LoadingBlock/>:error?<ErrorBlock text={error}/>:report?<><div className="stats four"><div><span>إجمالي الدخل</span><b>{money(report.totalIncome)}</b><Wallet/></div><div><span>عدد الدفعات</span><b>{report.paymentCount}</b><Users/></div><div><span>متوسط الدفعة</span><b>{money(report.averagePayment)}</b><BarChart3/></div><div><span>المبالغ المتبقية</span><b>{money(report.outstanding)}</b><Filter/></div></div><Card className="chart-card"><div className="chart-head"><div><p>حركة الدخل</p><h2>{bucket==='month'?'حسب الأشهر':'حسب الأيام'}</h2></div></div>{report.timeline.length===0?<Empty title="لا توجد دفعات في هذه الفترة"/>:<div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={report.timeline}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28}/><stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" tickMargin={10}/><YAxis tickFormatter={v=>Intl.NumberFormat('ar-MR',{notation:'compact'}).format(Number(v))}/><Tooltip formatter={(v)=>money(Number(v))}/><Area type="monotone" dataKey="value" stroke="var(--primary)" fill="url(#incomeFill)" strokeWidth={2.5}/></AreaChart></ResponsiveContainer></div>}</Card><div className="breakdown-grid"><Breakdown title="الدخل حسب الفرع" data={report.byBranch}/><Breakdown title="الدخل حسب التخصص" data={report.bySpecialty}/><Breakdown title="الدخل حسب وسيلة الدفع" data={report.byMethod}/></div></>:null}</>
}

function LedgerPage({data,user,onStudent}:{data:Bootstrap;user:UserSession;onStudent:(id:string)=>void}){
  const[day,setDay]=useState(today());const[branchId,setBranch]=useState(user.branchId||'');const[specialtyId,setSpecialty]=useState('');const[paymentMethodId,setMethod]=useState('');const[refresh,setRefresh]=useState(0);
  const result=useRows('ledger',{from:day,branchId,specialtyId,paymentMethodId},refresh);
  const total=result.rows.reduce((sum,r)=>sum+Number(r['المبلغ']||0),0);
  return <><PageHeader title="اليومية" description="دفتر الحركة اليومية: كل دفعة، وصلها، صاحبها، بيانها، وسيلة الدفع والموظف." action={<div className="header-actions"><Button className="secondary" onClick={()=>setRefresh(x=>x+1)}><RefreshCw size={16}/></Button><Button className="secondary" onClick={()=>void exportCsv(result.rows,`اليومية-${day}`)}><Download size={16}/>تصدير</Button></div>}/><div className="ledger-total"><div><NotebookTabs/><span>إجمالي دخل اليوم</span></div><b>{money(total)}</b><small>{result.rows.length} عملية دفع</small></div><Card><div className="filter-grid four"><label>التاريخ<Input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label><label>الفرع<BranchSelect data={data} user={user} value={branchId} onChange={setBranch}/></label><label>التخصص<SpecialtySelect data={data} value={specialtyId} onChange={setSpecialty}/></label><label>وسيلة الدفع<MethodSelect data={data} value={paymentMethodId} onChange={setMethod}/></label></div>{result.loading?<LoadingBlock/>:result.error?<ErrorBlock text={result.error}/>:<DataTable rows={result.rows} onStudent={onStudent} empty="لا توجد حركة مالية في هذا اليوم"/>}</Card></>
}

export function DataPage({kind,data,user}:{kind:string;data:Bootstrap;user:UserSession}){
  const[studentId,setStudentId]=useState('');
  let page:React.ReactNode;
  if(kind==='students')page=<StudentsPage data={data} user={user} onStudent={setStudentId}/>;
  else if(kind==='specialties')page=<SpecialtiesPage data={data} user={user} onStudent={setStudentId}/>;
  else if(kind==='period')page=<PeriodPage data={data} user={user} onStudent={setStudentId}/>;
  else if(kind==='status')page=<StatusPage data={data} user={user} onStudent={setStudentId}/>;
  else if(kind==='finance')page=<FinancePage data={data} user={user}/>;
  else page=<LedgerPage data={data} user={user} onStudent={setStudentId}/>;
  return <>{page}{studentId&&<StudentDrawer studentId={studentId} data={data} user={user} onClose={()=>setStudentId('')}/>}</>
}
