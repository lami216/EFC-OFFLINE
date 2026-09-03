import{useEffect,useMemo,useState}from'react';
import{Download,Search,Filter,BarChart3,Users,Wallet,BookOpen,NotebookTabs,RefreshCw,Plus,Save}from'lucide-react';
import{CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis}from'recharts';
import{save}from'@tauri-apps/plugin-dialog';
import{writeFile}from'@tauri-apps/plugin-fs';
import{toast}from'sonner';
import{api}from'../lib/api';
import{Button,Card,Empty,Input}from'../components/ui';
import{compactNumber,date,digits,money}from'../lib/format';
import{StudentDrawer}from'../components/StudentDrawer';
import type{Bootstrap,ChartPoint,FinanceReport,PaymentMethod,Row,UserSession}from'../types';

const localIso=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>localIso(new Date());
const monthStart=()=>`${today().slice(0,8)}01`;
const moneyColumns=new Set(['المبلغ','المطلوب','المدفوع','المتبقي','المحصل']);
const errorText=(e:unknown)=>typeof e==='string'?e:e instanceof Error?e.message:'تعذر جلب البيانات.';

function useRows(kind:string,filters:Record<string,string>,refresh=0){
  const[rows,setRows]=useState<Row[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
  const key=JSON.stringify(filters);
  useEffect(()=>{let cancelled=false;setLoading(true);setError('');const timer=window.setTimeout(()=>{void api.query(kind,JSON.parse(key) as Record<string,string>).then(v=>{if(!cancelled)setRows(v)}).catch(e=>{if(!cancelled)setError(errorText(e))}).finally(()=>{if(!cancelled)setLoading(false)})},150);return()=>{cancelled=true;window.clearTimeout(timer)}},[kind,key,refresh]);
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
  if(typeof value==='number')return digits(value);
  const text=digits(String(value));
  if((text.includes('مدفوع')||text.includes('كل الأشهر مدفوعة')||text==='نشطة')&&!text.includes('جزئي'))return <span className="status paid">{text}</span>;
  if(text.includes('متأخر')||['ملغاة','انتهت','لم يدفع'].includes(text))return <span className="status overdue">{text}</span>;
  if(text.includes('مستحق')||text.includes('جزئي')||text.includes('ستنتهي'))return <span className="status due">{text}</span>;
  return text;
}
function DataTable({rows,onStudent,onPay,empty='لا توجد نتائج مطابقة'}:{rows:Row[];onStudent?:(id:string)=>void;onPay?:(id:string)=>void;empty?:string}){
  if(rows.length===0)return <Empty title={empty} detail="غيّر معايير البحث أو ابدأ بإضافة بيانات جديدة."/>;
  const columns=Object.keys(rows[0]).filter(k=>!k.startsWith('_'));
  return <div className="table-wrap"><table><thead><tr>{columns.map(k=><th key={k}>{k}</th>)}{onPay&&<th>الإجراء</th>}</tr></thead><tbody>{rows.map((row,index)=>{const studentId=typeof row._studentId==='string'?row._studentId:'';const enrollmentId=typeof row._enrollmentId==='string'?row._enrollmentId:'';return <tr key={`${studentId}-${enrollmentId}-${index}`} className={studentId&&onStudent?'clickable':''} onClick={()=>studentId&&onStudent?.(studentId)}>{columns.map(k=><td key={k}>{renderValue(k,row[k])}</td>)}{onPay&&<td><Button className="secondary table-pay" disabled={!studentId||!enrollmentId} onClick={e=>{e.stopPropagation();studentId&&onPay(studentId)}}>تسجيل دفعة</Button></td>}</tr>})}</tbody></table></div>
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
  return <><PageHeader title="البحث عن طالب" description="ابحث بالاسم أو الهاتف أو رقم السجل، ثم افتح ملف الطالب الكامل." action={<Button className="secondary" onClick={()=>void exportCsv(rows,'قائمة-الطلاب')}><Download size={16}/>تصدير</Button>}/><Card><div className="filter-bar"><div className="search-input"><Search size={17}/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="الاسم أو الهاتف أو رقم السجل..."/></div><BranchSelect data={data} user={user} value={branchId} onChange={setBranch}/><SpecialtySelect data={data} value={specialtyId} onChange={setSpecialty}/></div>{loading?<LoadingBlock/>:error?<ErrorBlock text={error}/>:<DataTable rows={rows} onStudent={onStudent}/>}</Card></>
}

function SpecialtiesPage({data,user,onStudent}:{data:Bootstrap;user:UserSession;onStudent:(id:string)=>void}){
  const[branchId,setBranch]=useState(user.branchId||'');const[selected,setSelected]=useState('');
  const summary=useRows('specialties',{branchId});
  const students=useRows('students',{q:'',branchId,specialtyId:selected});
  const name=data.specialties.find(x=>x.id===selected)?.name;
  return <><PageHeader title="التخصصات والدورات" description="نظرة على عدد الطلاب والتحصيل والمتبقي، ثم ادخل لأي تخصص لرؤية طلابه."/><Card><div className="filter-bar"><BranchSelect data={data} user={user} value={branchId} onChange={setBranch}/></div>{summary.loading?<LoadingBlock/>:summary.error?<ErrorBlock text={summary.error}/>:summary.rows.length===0?<Empty/>:<div className="specialty-grid">{summary.rows.map((r,i)=>{const id=String(r._specialtyId||'');return <button key={id||i} className={`specialty-card ${selected===id?'selected':''}`} onClick={()=>setSelected(id)}><div><BookOpen size={19}/><b>{r['التخصص']}</b></div><span>{digits(String(r['المدة']))} {r['الوحدة']}</span><div className="specialty-metrics"><span><small>الطلاب</small><b>{digits(String(r['الطلاب']))}</b></span><span><small>المحصل</small><b>{money(Number(r['المحصل']||0))}</b></span><span><small>المتبقي</small><b>{money(Number(r['المتبقي']||0))}</b></span></div></button>})}</div>}</Card>{selected&&<Card className="section-card"><div className="section-card-head"><div><p>طلاب التخصص</p><h2>{name}</h2></div><Button className="secondary" onClick={()=>void exportCsv(students.rows,`طلاب-${name||'التخصص'}`)}><Download size={16}/>تصدير</Button></div>{students.loading?<LoadingBlock/>:students.error?<ErrorBlock text={students.error}/>:<DataTable rows={students.rows} onStudent={onStudent}/>}</Card>}</>
}

const periodTabs=[['registrations','المسجلون'],['payments','الدفعات'],['dues','المستحقات'],['ended','نهايات الدورات']] as const;
const dueStates=new Set(['متأخر','مستحق الآن','دفع جزئي','لم يدفع']);
function PeriodPage({data,user,onStudent,onPay}:{data:Bootstrap;user:UserSession;onStudent:(id:string)=>void;onPay:(id:string)=>void}){
  const[from,setFrom]=useState(monthStart());const[to,setTo]=useState(today());const[q,setQ]=useState('');const[branchId,setBranch]=useState(user.branchId||'');const[specialtyId,setSpecialty]=useState('');const[financial,setFinancial]=useState('');const[tab,setTab]=useState<(typeof periodTabs)[number][0]>('registrations');
  const result=useRows(`period_${tab}`,{from,to,q,branchId,specialtyId});
  const statusResult=useRows('status',{q,branchId,specialtyId});
  const allowedIds=useMemo(()=>{if(!financial)return null;return new Set(statusResult.rows.filter(r=>financial==='all_due'?dueStates.has(String(r['الوضعية المالية'])):String(r['الوضعية المالية'])===financial).map(r=>String(r._studentId||'')))},[statusResult.rows,financial]);
  const rows=useMemo(()=>allowedIds?result.rows.filter(r=>allowedIds.has(String(r._studentId||''))):result.rows,[result.rows,allowedIds]);
  return <><PageHeader title="آلية البحث" description="المسجلون والدفعات والمستحقات ونهايات الدورات في مكان واحد مع بحث وفلاتر موحدة." action={<Button className="secondary" onClick={()=>void exportCsv(rows,`تقرير-${tab}-${from}-${to}`)}><Download size={16}/>تصدير</Button>}/><Card><div className="period-search"><div className="search-input"><Search size={17}/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث بالاسم أو الهاتف أو رقم السجل"/></div><BranchSelect data={data} user={user} value={branchId} onChange={setBranch}/><SpecialtySelect data={data} value={specialtyId} onChange={setSpecialty}/><select value={financial} onChange={e=>setFinancial(e.target.value)}><option value="">كل الحالات</option><option value="all_due">كل المستحقات</option><option value="متأخر">متأخر</option><option value="مستحق الآن">مستحق الآن</option><option value="دفع جزئي">دفع جزئي</option><option value="لم يدفع">لم يدفع</option><option value="مدفوع كامل">مدفوع كامل</option></select></div><div className="filter-grid two period-dates"><label>من تاريخ<Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>إلى تاريخ<Input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div><div className="segmented">{periodTabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>{result.loading||financial&&statusResult.loading?<LoadingBlock/>:result.error?<ErrorBlock text={result.error}/>:statusResult.error&&financial?<ErrorBlock text={statusResult.error}/>:<DataTable rows={rows} onStudent={onStudent} onPay={tab==='payments'?undefined:onPay}/>}</Card></>
}

function StatusPage({data,user,onStudent}:{data:Bootstrap;user:UserSession;onStudent:(id:string)=>void}){
  const[q,setQ]=useState('');const[branchId,setBranch]=useState(user.branchId||'');const[specialtyId,setSpecialty]=useState('');const[status,setStatus]=useState('');
  const result=useRows('status',{q,branchId,specialtyId});
  const rows=useMemo(()=>status?result.rows.filter(r=>String(r['الوضعية المالية'])===status||String(r['وضع الدورة'])===status):result.rows,[result.rows,status]);
  return <><PageHeader title="البحث بالوضعية" description="اعزل الطلاب بحسب حالة الدفع أو وضع الدورة، مع ظهور حالة الشهر المستحق للدورات الشهرية." action={<Button className="secondary" onClick={()=>void exportCsv(rows,'تقرير-الوضعيات')}><Download size={16}/>تصدير CSV</Button>}/><Card><div className="filter-bar status-filters"><div className="search-input"><Search size={17}/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="الاسم أو الهاتف أو رقم السجل"/></div><BranchSelect data={data} user={user} value={branchId} onChange={setBranch}/><SpecialtySelect data={data} value={specialtyId} onChange={setSpecialty}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">كل الوضعيات</option><option>مدفوع كامل</option><option>دفع جزئي</option><option>لم يدفع</option><option>مستحق الآن</option><option>متأخر</option><option>نشطة</option><option>ستنتهي قريباً</option><option>انتهت</option></select></div>{result.loading?<LoadingBlock/>:result.error?<ErrorBlock text={result.error}/>:<DataTable rows={rows} onStudent={onStudent}/>}</Card></>
}

function Breakdown({title,data,total}:{title:string;data:ChartPoint[];total:number}){const max=Math.max(1,...data.map(x=>x.value));return <Card className="breakdown"><h3>{title}</h3>{data.length===0?<Empty title="لا توجد حركة" detail="لا توجد دفعات في الفترة المحددة."/>:<div>{data.slice(0,10).map(x=>{const pct=total>0?x.value/total*100:0;return <div key={x.label} className="breakdown-row"><span>{x.label}<small>{pct.toFixed(pct>=10?0:1)}%</small></span><div><i style={{width:`${Math.max(3,(x.value/max)*100)}%`}}/></div><b>{money(x.value)}</b></div>})}</div>}</Card>}

type FinanceMode='day'|'week'|'month'|'year';
function financeRange(mode:FinanceMode,reference:string){const d=new Date(`${reference}T12:00:00`);let from=new Date(d),to=new Date(d),bucket='day';if(mode==='day')bucket='hour';if(mode==='week')from.setDate(from.getDate()-6);if(mode==='month'){from=new Date(d.getFullYear(),d.getMonth(),1,12);to=new Date(d.getFullYear(),d.getMonth()+1,0,12)}if(mode==='year'){from=new Date(d.getFullYear(),0,1,12);to=new Date(d.getFullYear(),11,31,12);bucket='month'}return{from:localIso(from),to:localIso(to),bucket}}
function fillTimeline(mode:FinanceMode,reference:string,raw:ChartPoint[]){const values=new Map(raw.map(x=>[x.label,x.value]));const d=new Date(`${reference}T12:00:00`);const result:ChartPoint[]=[];if(mode==='day'){for(let h=0;h<24;h++){const label=`${String(h).padStart(2,'0')}:00`;result.push({label,value:values.get(label)||0})}}else if(mode==='week'){for(let i=6;i>=0;i--){const x=new Date(d);x.setDate(x.getDate()-i);const label=localIso(x);result.push({label,value:values.get(label)||0})}}else if(mode==='month'){const count=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();for(let day=1;day<=count;day++){const label=localIso(new Date(d.getFullYear(),d.getMonth(),day,12));result.push({label,value:values.get(label)||0})}}else{for(let m=0;m<12;m++){const label=`${d.getFullYear()}-${String(m+1).padStart(2,'0')}`;result.push({label,value:values.get(label)||0})}}return result}
function axisLabel(mode:FinanceMode,label:string){if(mode==='day')return label.slice(0,2);if(mode==='year')return label.slice(5);const parts=label.split('-');return`${parts[2]}/${parts[1]}`}
function tooltipLabel(mode:FinanceMode,label:string){if(mode==='day')return`الساعة ${label}`;if(mode==='year')return`الشهر ${label.slice(5)} / ${label.slice(0,4)}`;return date(`${label}T12:00:00`)}

function MethodManager({data,refreshBootstrap}:{data:Bootstrap;refreshBootstrap:()=>Promise<void>|void}){
  const[draft,setDraft]=useState<Partial<PaymentMethod>&{name:string;active:boolean}>({name:'',active:true});const[saving,setSaving]=useState(false);
  async function persist(){if(!draft.name.trim())return;setSaving(true);try{await api.saveEntity('payment_method',draft);toast.success('تم حفظ وسيلة الدفع.');setDraft({name:'',active:true});await refreshBootstrap()}catch(e){toast.error(errorText(e))}finally{setSaving(false)}}
  return <Card className="finance-methods"><div className="section-card-head"><div><p>إعداد سريع</p><h2>وسائل الدفع</h2></div><Button className="secondary" onClick={()=>setDraft({name:'',active:true})}><Plus size={15}/>وسيلة جديدة</Button></div><div className="method-chips">{data.paymentMethods.map(m=><button key={m.id} className={!m.active?'inactive':''} onClick={()=>setDraft({...m})}>{m.name}<small>{m.active?'نشطة':'معطلة'}</small></button>)}</div><div className="method-editor"><Input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="اسم وسيلة الدفع"/><label className="inline-check"><input type="checkbox" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})}/> نشطة</label><Button disabled={saving||!draft.name.trim()} onClick={()=>void persist()}><Save size={15}/>{draft.id?'حفظ التعديل':'إضافة'}</Button></div></Card>
}

function FinancePage({data,user,refreshBootstrap}:{data:Bootstrap;user:UserSession;refreshBootstrap:()=>Promise<void>|void}){
  const[mode,setMode]=useState<FinanceMode>('month');const[reference,setReference]=useState(today());const[branchId,setBranch]=useState(user.branchId||'');const[specialtyId,setSpecialty]=useState('');const[paymentMethodId,setMethod]=useState('');const[report,setReport]=useState<FinanceReport>();const[loading,setLoading]=useState(true);const[error,setError]=useState('');
  const range=useMemo(()=>financeRange(mode,reference),[mode,reference]);
  const key=JSON.stringify({...range,branchId,specialtyId,paymentMethodId});
  useEffect(()=>{let cancelled=false;setLoading(true);setError('');void api.financeReport(JSON.parse(key)).then(r=>{if(!cancelled)setReport(r)}).catch(e=>{if(!cancelled)setError(errorText(e))}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[key]);
  const series=useMemo(()=>fillTimeline(mode,reference,report?.timeline||[]),[mode,reference,report?.timeline]);
  return <><PageHeader title="المالية" description="تحليل تفاعلي للدخل حسب المدة والفرع والتخصص ووسيلة الدفع."/><Card><div className="finance-mode-row"><div className="segmented finance-segmented">{([['day','يومي'],['week','أسبوعي'],['month','شهري'],['year','سنوي']] as const).map(([id,label])=><button key={id} className={mode===id?'active':''} onClick={()=>setMode(id)}>{label}</button>)}</div><label>التاريخ المرجعي<Input type="date" value={reference} onChange={e=>setReference(e.target.value)}/></label><label>الفرع<BranchSelect data={data} user={user} value={branchId} onChange={setBranch}/></label><label>التخصص<SpecialtySelect data={data} value={specialtyId} onChange={setSpecialty}/></label><label>وسيلة الدفع<MethodSelect data={data} value={paymentMethodId} onChange={setMethod}/></label></div></Card>{loading?<LoadingBlock/>:error?<ErrorBlock text={error}/>:report?<><div className="stats four"><div><span>إجمالي الدخل</span><b>{money(report.totalIncome)}</b><Wallet/></div><div><span>عدد الدفعات</span><b>{digits(report.paymentCount)}</b><Users/></div><div><span>متوسط الدفعة</span><b>{money(report.averagePayment)}</b><BarChart3/></div><div><span>المستحق حاليًا</span><b>{money(report.outstanding)}</b><Filter/></div></div><Card className="chart-card"><div className="chart-head"><div><p>حركة الدخل</p><h2>{mode==='day'?'بالساعة':mode==='year'?'بالشهر':'باليوم'}</h2></div><b>{money(report.totalIncome)}</b></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={series} margin={{top:18,right:18,left:12,bottom:4}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" tickFormatter={v=>axisLabel(mode,String(v))} interval={mode==='month'?3:mode==='day'?2:0} tickMargin={10}/><YAxis width={72} tickFormatter={v=>compactNumber(Number(v))}/><Tooltip cursor={{stroke:'var(--border)',strokeDasharray:'3 3'}} labelFormatter={v=>tooltipLabel(mode,String(v))} formatter={v=>[money(Number(v)),'الدخل']}/><Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} dot={{r:3.7,strokeWidth:2,fill:'var(--surface)'}} activeDot={{r:6}}/></LineChart></ResponsiveContainer></div></Card><div className="breakdown-grid"><Breakdown title="حسب الفرع" data={report.byBranch} total={report.totalIncome}/><Breakdown title="حسب التخصص" data={report.bySpecialty} total={report.totalIncome}/><Breakdown title="حسب وسيلة الدفع" data={report.byMethod} total={report.totalIncome}/></div></>:null}{user.role==='ADMIN'&&<MethodManager data={data} refreshBootstrap={refreshBootstrap}/>}</>
}

function LedgerPage({data,user,onStudent}:{data:Bootstrap;user:UserSession;onStudent:(id:string)=>void}){
  const[day,setDay]=useState(today());const[branchId,setBranch]=useState(user.branchId||'');const[specialtyId,setSpecialty]=useState('');const[paymentMethodId,setMethod]=useState('');const[refresh,setRefresh]=useState(0);
  const result=useRows('ledger',{from:day,branchId,specialtyId,paymentMethodId},refresh);
  const total=result.rows.reduce((sum,r)=>sum+Number(r['المبلغ']||0),0);
  return <><PageHeader title="اليومية" description="اختر يومًا واحدًا؛ تظهر أحدث عملية مسجلة أولًا مع البيان ووسيلة الدفع." action={<div className="header-actions"><Button className="secondary" onClick={()=>setRefresh(x=>x+1)}><RefreshCw size={16}/></Button><Button className="secondary" onClick={()=>void exportCsv(result.rows,`اليومية-${day}`)}><Download size={16}/>تصدير</Button></div>}/><div className="ledger-total"><div><NotebookTabs/><span>إجمالي دخل اليوم</span></div><b>{money(total)}</b><small>{digits(result.rows.length)} عملية دفع</small></div><Card><div className="filter-grid four"><label>التاريخ<Input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label><label>الفرع<BranchSelect data={data} user={user} value={branchId} onChange={setBranch}/></label><label>التخصص<SpecialtySelect data={data} value={specialtyId} onChange={setSpecialty}/></label><label>وسيلة الدفع<MethodSelect data={data} value={paymentMethodId} onChange={setMethod}/></label></div>{result.loading?<LoadingBlock/>:result.error?<ErrorBlock text={result.error}/>:<DataTable rows={result.rows} onStudent={onStudent} empty="لا توجد حركة مالية في هذا اليوم"/>}</Card></>
}

export function DataPage({kind,data,user,refreshBootstrap}:{kind:string;data:Bootstrap;user:UserSession;refreshBootstrap:()=>Promise<void>|void}){
  const[drawer,setDrawer]=useState<{id:string;pay:boolean}>({id:'',pay:false});
  const openStudent=(id:string)=>setDrawer({id,pay:false});const openPay=(id:string)=>setDrawer({id,pay:true});
  let page:React.ReactNode;
  if(kind==='students')page=<StudentsPage data={data} user={user} onStudent={openStudent}/>;
  else if(kind==='specialties')page=<SpecialtiesPage data={data} user={user} onStudent={openStudent}/>;
  else if(kind==='period')page=<PeriodPage data={data} user={user} onStudent={openStudent} onPay={openPay}/>;
  else if(kind==='status')page=<StatusPage data={data} user={user} onStudent={openStudent}/>;
  else if(kind==='finance')page=<FinancePage data={data} user={user} refreshBootstrap={refreshBootstrap}/>;
  else page=<LedgerPage data={data} user={user} onStudent={openStudent}/>;
  return <>{page}{drawer.id&&<StudentDrawer studentId={drawer.id} data={data} user={user} autoOpenPayment={drawer.pay} onClose={()=>setDrawer({id:'',pay:false})}/>}</>
}
