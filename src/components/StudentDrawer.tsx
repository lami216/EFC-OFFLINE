import{useCallback,useEffect,useMemo,useState}from'react';
import{X,Phone,BookOpen,CalendarDays,Wallet,ReceiptText,PlusCircle,Ban,RefreshCw,FileText}from'lucide-react';
import{toast}from'sonner';
import{api}from'../lib/api';
import{date,digits,money}from'../lib/format';
import{Button,Empty,Input}from'./ui';
import{ReceiptDialog}from'../features/payments/ReceiptDialog';
import{MonthlyStatementDialog}from'../features/payments/MonthlyStatementDialog';
import type{BillingPeriod,Bootstrap,Receipt,StudentDetails,StudentEnrollment,UserSession}from'../types';

const errorText=(e:unknown)=>typeof e==='string'?e:e instanceof Error?e.message:'تعذر تحميل ملف الطالب.';
const statusLabel:Record<string,string>={active:'نشطة',cancelled:'ملغاة',paid:'مدفوع',partial:'دفع جزئي',due:'مستحق',overdue:'متأخر',upcoming:'لم يحن بعد'};
const today=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function suggestion(enrollment:StudentEnrollment,period:BillingPeriod|undefined,amount:number){if(enrollment.billingMode==='monthly'&&period){return amount>=period.remaining?`مدفوع الشهر ${period.periodNumber} لدورة ${enrollment.specialtyName}`:`مدفوع جزئي من الشهر ${period.periodNumber} لدورة ${enrollment.specialtyName}`}return amount>=enrollment.remaining?`مدفوع كامل لدورة ${enrollment.specialtyName}`:`مدفوع جزئي لدورة ${enrollment.specialtyName}`}

export function StudentDrawer({studentId,data,user,autoOpenPayment=false,onClose}:{studentId:string;data:Bootstrap;user:UserSession;autoOpenPayment?:boolean;onClose:()=>void}){
  const[details,setDetails]=useState<StudentDetails>();
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  const[receipt,setReceipt]=useState<Receipt>();
  const[paymentOpen,setPaymentOpen]=useState(false);
  const[autoOpened,setAutoOpened]=useState(false);
  const[enrollmentId,setEnrollmentId]=useState('');
  const[amount,setAmount]=useState(0);
  const[methodId,setMethodId]=useState('');
  const[paymentDate,setPaymentDate]=useState(today());
  const[description,setDescription]=useState('');
  const[saving,setSaving]=useState(false);
  const[statementId,setStatementId]=useState('');

  const load=useCallback(async()=>{setLoading(true);setError('');try{setDetails(await api.studentDetails(studentId))}catch(e){setError(errorText(e))}finally{setLoading(false)}},[studentId]);
  useEffect(()=>{void load()},[load]);
  const payable=useMemo(()=>details?.enrollments.filter(x=>x.status==='active'&&x.remaining>0)||[],[details]);
  useEffect(()=>{if(paymentOpen&&!enrollmentId&&payable[0])setEnrollmentId(payable[0].id)},[paymentOpen,enrollmentId,payable]);
  useEffect(()=>{if(autoOpenPayment&&!autoOpened&&!loading&&payable.length){setPaymentOpen(true);setAutoOpened(true)}},[autoOpenPayment,autoOpened,loading,payable]);
  const selected=payable.find(x=>x.id===enrollmentId);
  const selectedPeriods=useMemo(()=>details?.billingPeriods.filter(p=>p.enrollmentId===enrollmentId).sort((a,b)=>a.periodNumber-b.periodNumber)||[],[details,enrollmentId]);
  const nextPeriod=selectedPeriods.find(p=>p.remaining>0);
  const statementEnrollment=details?.enrollments.find(e=>e.id===statementId);
  const statementPeriods=useMemo(()=>details?.billingPeriods.filter(p=>p.enrollmentId===statementId).sort((a,b)=>a.periodNumber-b.periodNumber)||[],[details,statementId]);

  useEffect(()=>{if(!paymentOpen||!selected)return;const suggested=selected.billingMode==='monthly'&&nextPeriod?nextPeriod.remaining:selected.remaining;setAmount(suggested);setPaymentDate(today());setDescription(suggestion(selected,nextPeriod,suggested))},[paymentOpen,selected?.id,nextPeriod?.id]);

  async function addPayment(){
    if(!selected||amount<=0||!methodId){toast.error('اختر التسجيل ووسيلة الدفع وأدخل مبلغاً صحيحاً.');return}
    if(amount>selected.remaining){toast.error('المبلغ أكبر من المتبقي على هذا التسجيل.');return}
    setSaving(true);
    try{const r=await api.addPayment({enrollmentId:selected.id,amount,paymentMethodId:methodId,paymentDate,description:description.trim()||undefined});setReceipt(r);setPaymentOpen(false);setAmount(0);setMethodId('');setDescription('');await load();toast.success('تم تسجيل الدفعة وإصدار الروسي.')}catch(e){toast.error(errorText(e))}finally{setSaving(false)}
  }
  async function reprint(number?:number|null){if(!number)return;try{setReceipt(await api.receipt(number))}catch(e){toast.error(errorText(e))}}
  async function voidPayment(id:string){const reason=window.prompt('اكتب سبب إلغاء الدفعة. لن يتم حذفها من السجل:');if(!reason)return;try{await api.voidPayment(id,reason);await load();toast.success('تم إلغاء الدفعة مع الاحتفاظ بسجلها.')}catch(e){toast.error(errorText(e))}}

  return <><div className="drawer-backdrop" onMouseDown={onClose}><aside className="student-drawer" onMouseDown={e=>e.stopPropagation()}><header><div><p>ملف الطالب</p><h2>{details?.student.fullName||'جارٍ التحميل…'}</h2></div><button className="icon-button" onClick={onClose}><X/></button></header>
    {loading?<div className="drawer-loading"><span className="loader"/>جارٍ تحميل الملف…</div>:error?<div className="drawer-error"><p>{error}</p><Button onClick={()=>void load()}><RefreshCw size={16}/>إعادة المحاولة</Button></div>:details?<div className="drawer-content">
      <section className="student-hero"><div className="student-avatar">{details.student.fullName.slice(0,1)}</div><div><h3>{details.student.fullName}</h3><p><Phone size={15}/>{details.student.phone||'لا يوجد رقم هاتف'}{details.student.secondaryPhone&&` · ${details.student.secondaryPhone}`}</p></div>{payable.length>0&&<Button onClick={()=>setPaymentOpen(true)}><PlusCircle size={16}/>تسجيل دفعة</Button>}</section>
      <section><div className="drawer-section-title"><BookOpen size={17}/><h3>الدورات والتسجيلات</h3></div><div className="enrollment-cards">{details.enrollments.map(e=><article key={e.id} className="enrollment-card"><div className="enrollment-head"><div><b>{e.specialtyName}</b><span>{e.branchName} · سجل {String(e.registerNumber).padStart(4,'0')}</span></div><span className={`status ${e.status}`}>{statusLabel[e.status]||e.status}</span></div><div className="mini-grid"><span><small>البداية</small>{date(`${e.startDate}T12:00:00`)}</span><span><small>النهاية</small>{date(`${e.endDate}T12:00:00`)}</span><span><small>المطلوب</small>{money(e.totalRequired)}</span><span><small>المدفوع</small>{money(e.paid)}</span><span><small>المتبقي من الدورة</small><b>{money(e.remaining)}</b></span><span><small>النظام</small>{e.billingMode==='monthly'?'شهري':'دفعة واحدة'}</span></div>{e.billingMode==='monthly'&&<div className="enrollment-actions"><Button className="secondary" onClick={()=>setStatementId(e.id)}><FileText size={15}/>كشف الأشهر</Button></div>}</article>)}</div></section>
      {details.billingPeriods.length>0&&<section><div className="drawer-section-title"><CalendarDays size={17}/><h3>الأشهر والأقساط</h3></div><div className="period-list">{details.billingPeriods.map(p=><div key={p.id}><span>الشهر {digits(p.periodNumber)}<small>الاستحقاق {date(`${p.dueDate}T12:00:00`)}</small></span><span>{money(p.amountDue)}<small>مدفوع {money(p.paid)} · متبقي {money(p.remaining)}</small></span><span className={`status ${p.status}`}>{statusLabel[p.status]||p.status}</span></div>)}</div></section>}
      <section><div className="drawer-section-title"><Wallet size={17}/><h3>سجل الدفعات والوصولات</h3></div>{details.payments.length===0?<Empty title="لا توجد دفعات بعد" detail="يمكن تسجيل أول دفعة من أعلى ملف الطالب."/>:<div className="payment-list">{details.payments.map(p=><div key={p.id} className={p.status==='void'?'void-row':''}><div><b>{money(p.amount)}</b><span>{p.methodName} · {date(p.paidAt)}</span>{p.description&&<small>{p.description}</small>}</div><div className="row-actions">{p.receiptNumber&&<button onClick={()=>void reprint(p.receiptNumber)} title="فتح الروسي"><ReceiptText size={17}/>#{String(p.receiptNumber).padStart(5,'0')}</button>}{p.status==='active'&&(user.role==='ADMIN'||user.role==='FINANCE')&&<button className="danger-link" onClick={()=>void voidPayment(p.id)} title="إلغاء الدفعة"><Ban size={17}/></button>}{p.status==='void'&&<span className="status cancelled">ملغاة</span>}</div></div>)}</div>}</section>
      {details.student.notes&&<section className="note-box"><b>ملاحظات</b><p>{details.student.notes}</p></section>}
    </div>:null}
  </aside></div>
  {paymentOpen&&<div className="modal-backdrop" onMouseDown={()=>setPaymentOpen(false)}><div className="modal-card" onMouseDown={e=>e.stopPropagation()}><header><div><p>دفعة جديدة</p><h3>تسجيل دفعة للطالب</h3></div><button className="icon-button" onClick={()=>setPaymentOpen(false)}><X/></button></header><div className="grid two"><label className="wide">التسجيل<select value={enrollmentId} onChange={e=>setEnrollmentId(e.target.value)}>{payable.map(e=><option key={e.id} value={e.id}>{e.specialtyName} · {e.branchName} · متبقي {money(e.remaining)}</option>)}</select></label><label>المبلغ<Input type="number" min={1} max={selected?.remaining} value={amount||''} onChange={e=>{const v=Number(e.target.value);setAmount(v);if(selected)setDescription(suggestion(selected,nextPeriod,v))}}/></label><label>تاريخ الدفع<Input type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)}/></label><label>وسيلة الدفع<select value={methodId} onChange={e=>setMethodId(e.target.value)}><option value="">اختر الوسيلة</option>{data.paymentMethods.filter(x=>x.active).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="wide">البيان<Input value={description} onChange={e=>setDescription(e.target.value)} placeholder="يُنشأ تلقائياً ويمكن تعديله"/></label></div>{selected?.billingMode==='monthly'&&nextPeriod&&<div className="due-period-hint"><b>الشهر {digits(nextPeriod.periodNumber)}</b><span>المطلوب لهذا الشهر {money(nextPeriod.remaining)} · {statusLabel[nextPeriod.status]||nextPeriod.status}</span></div>}<div className="modal-summary"><span>المتبقي من الدورة قبل الدفعة <b>{money(selected?.remaining||0)}</b></span><span>المتبقي بعدها <b>{money(Math.max(0,(selected?.remaining||0)-amount))}</b></span></div><div className="modal-actions"><Button className="secondary" onClick={()=>setPaymentOpen(false)}>إلغاء</Button><Button disabled={saving} onClick={()=>void addPayment()}>{saving?'جارٍ الحفظ…':'حفظ وإصدار الروسي'}</Button></div></div></div>}
  {receipt&&<ReceiptDialog receipt={receipt} paymentMethods={data.paymentMethods} close={()=>setReceipt(undefined)}/>} {statementEnrollment&&<MonthlyStatementDialog studentName={details?.student.fullName||''} enrollment={statementEnrollment} periods={statementPeriods} data={data} close={()=>setStatementId('')}/>}</>
}
