import{useEffect,useMemo,useState}from'react';
import{useForm}from'react-hook-form';
import{zodResolver}from'@hookform/resolvers/zod';
import{z}from'zod';
import{toast}from'sonner';
import{BadgeCheck,CalendarDays,CreditCard,Hash,WalletCards}from'lucide-react';
import{api}from'../lib/api';
import{addDuration,money}from'../lib/format';
import{Button,Card,Input}from'../components/ui';
import type{Bootstrap,Receipt,UserSession}from'../types';
import{ReceiptDialog}from'../features/payments/ReceiptDialog';

const schema=z.object({fullName:z.string().trim().min(2),phone:z.string().optional(),secondaryPhone:z.string().optional(),branchId:z.string().min(1),specialtyId:z.string().min(1),startDate:z.string().min(8),paymentAmount:z.coerce.number().int().min(0),paymentMethodId:z.string().optional(),notes:z.string().optional()}).superRefine((v,ctx)=>{if(v.paymentAmount>0&&!v.paymentMethodId)ctx.addIssue({code:'custom',path:['paymentMethodId'],message:'اختر وسيلة الدفع'})});
type Form=z.infer<typeof schema>;
const err=(e:unknown)=>typeof e==='string'?e:e instanceof Error?e.message:'تعذر حفظ التسجيل. تحقق من البيانات وحاول مجدداً.';

export function RegisterPage({data,user}:{data:Bootstrap;user:UserSession}){
  const[receipt,setReceipt]=useState<Receipt>();
  const[next,setNext]=useState<number>();
  const{register,watch,handleSubmit,reset,setValue,formState:{isSubmitting,errors}}=useForm<Form>({resolver:zodResolver(schema),defaultValues:{branchId:user.branchId||'',startDate:new Date().toISOString().slice(0,10),paymentAmount:0}});
  const branchId=watch('branchId');const specialtyId=watch('specialtyId');const startDate=watch('startDate');const paymentAmount=Number(watch('paymentAmount')||0);const selectedMethod=watch('paymentMethodId');
  const branches=useMemo(()=>data.branches.filter(x=>x.active&&(!user.branchId||x.id===user.branchId)),[data.branches,user.branchId]);
  const mappedIds=useMemo(()=>new Set(data.specialtyBranches.filter(x=>x.active&&x.branchId===branchId).map(x=>x.specialtyId)),[data.specialtyBranches,branchId]);
  const specialties=useMemo(()=>data.specialties.filter(x=>x.active&&(!branchId||!data.specialtyBranches.some(m=>m.specialtyId===x.id)||mappedIds.has(x.id))),[data.specialties,data.specialtyBranches,branchId,mappedIds]);
  const s=data.specialties.find(x=>x.id===specialtyId);
  const total=s?(s.billingMode==='monthly'?s.monthlyFee*s.durationValue:s.courseFee):0;
  const end=s&&startDate?addDuration(startDate,s.durationValue,s.durationUnit):'—';
  useEffect(()=>{if(branchId&&specialtyId&&specialties.some(x=>x.id===specialtyId)){void api.nextRegister(branchId,specialtyId).then(setNext).catch(()=>setNext(undefined))}else setNext(undefined)},[branchId,specialtyId,specialties]);

  async function submit(input:Form){
    try{const r=await api.register(input);setReceipt(r.receipt);toast.success(`تم تسجيل الطالب برقم ${String(r.registerNumber).padStart(4,'0')}`);reset({branchId:user.branchId||branchId,startDate:new Date().toISOString().slice(0,10),paymentAmount:0,fullName:'',phone:'',secondaryPhone:'',specialtyId:'',paymentMethodId:'',notes:''});setNext(undefined)}catch(e){toast.error(err(e))}
  }

  return <><div className="page-title"><div><p>التسجيل</p><h1>تسجيل طالب جديد</h1><span>ملف الطالب ورقم السجل والدورة والدفعة تُحفظ داخل عملية واحدة.</span></div><div className="page-badge"><BadgeCheck size={17}/> تسجيل آمن</div></div><form onSubmit={handleSubmit(submit)} className="registration"><div className="form-stack">
    <Card><div className="section-title"><div><h2>بيانات الطالب</h2><span>المعلومات الأساسية للتواصل والملف</span></div></div><div className="grid three"><label>اسم الطالب<Input {...register('fullName')} placeholder="الاسم الكامل"/><small>{errors.fullName&&'أدخل اسم الطالب'}</small></label><label>رقم الهاتف<Input {...register('phone')} placeholder="22 00 00 00"/></label><label>هاتف إضافي<Input {...register('secondaryPhone')} placeholder="اختياري"/></label></div></Card>
    <Card><div className="section-title"><div><h2>بيانات الدورة</h2><span>الفرع والتخصص يحددان تسلسل رقم السجل بشكل مستقل</span></div></div><div className="grid three"><label>الفرع<select disabled={!!user.branchId} {...register('branchId')}><option value="">اختر الفرع</option>{branches.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><small>{errors.branchId&&'اختر الفرع'}</small></label><label>التخصص<select {...register('specialtyId')}><option value="">اختر التخصص</option>{specialties.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><small>{errors.specialtyId&&'اختر التخصص'}</small></label><label>تاريخ البداية<Input type="date" {...register('startDate')}/></label></div>{s&&<div className="course-strip"><span><CalendarDays/>المدة <b>{s.durationValue} {s.durationUnit==='month'?'أشهر':s.durationUnit==='week'?'أسابيع':'أيام'}</b></span><span><CreditCard/>نظام الدفع <b>{s.billingMode==='monthly'?'شهري':'دفعة واحدة'}</b></span><span><CalendarDays/>تاريخ النهاية <b>{end}</b></span><span><Hash/>رقم السجل المتوقع <b>{next?String(next).padStart(4,'0'):'—'}</b></span></div>}</Card>
    <Card><div className="section-title"><div><h2>بيانات الدفع</h2><span>اختر الوسيلة فقط إذا استلمت دفعة الآن</span></div></div><div className="grid two"><label>المبلغ المدفوع الآن<Input min={0} max={total||undefined} type="number" {...register('paymentAmount',{valueAsNumber:true})}/></label><label className="wide">وسيلة الدفع<div className="payment-methods">{data.paymentMethods.filter(x=>x.active).map(x=><button type="button" key={x.id} className={`pay-method ${selectedMethod===x.id?'selected':''}`} onClick={()=>setValue('paymentMethodId',x.id,{shouldValidate:true})}>{x.logoDataUrl?<img src={x.logoDataUrl} alt=""/>:<WalletCards size={20}/>}<span>{x.name}</span></button>)}<button type="button" className={`pay-method ${!selectedMethod?'selected':''}`} onClick={()=>setValue('paymentMethodId','',{shouldValidate:true})}><span>بدون دفعة</span></button></div><small>{errors.paymentMethodId?.message}</small></label><label className="wide">ملاحظات<textarea {...register('notes')} placeholder="أي ملاحظة مرتبطة بالتسجيل..."/></label></div></Card>
  </div><Card className="summary"><p>ملخص التسجيل</p>{s?<><div><span>سعر الدورة</span><b>{money(total)}</b></div>{s.billingMode==='monthly'&&<div><span>القسط الشهري</span><b>{money(s.monthlyFee)}</b></div>}<div><span>المدفوع الآن</span><b className="green">{money(paymentAmount)}</b></div><div><span>المتبقي</span><b>{money(Math.max(0,total-paymentAmount))}</b></div><div><span>رقم السجل</span><b>{next?String(next).padStart(4,'0'):'بعد اختيار الدورة'}</b></div><hr/></>:<div className="summary-empty">اختر الفرع والتخصص لعرض السعر والمدة ورقم السجل المتوقع.</div>}<Button disabled={isSubmitting||!s}>{isSubmitting?'جارٍ الحفظ…':paymentAmount>0?'حفظ وإصدار الوصل':'حفظ التسجيل'}</Button><small>رقم السجل النهائي يُنشأ داخل قاعدة البيانات لحظة الحفظ لمنع التكرار.</small></Card></form>{receipt&&<ReceiptDialog receipt={receipt} close={()=>setReceipt(undefined)}/>}</>
}
