import{useState}from'react';
import{useForm}from'react-hook-form';
import{LockKeyhole,ShieldCheck}from'lucide-react';
import{api}from'../lib/api';
import{Button,Card,Input}from'../components/ui';
import type{Bootstrap,UserSession}from'../types';

type Form={name:string;password:string};
const message=(e:unknown)=>typeof e==='string'?e:e instanceof Error?e.message:'تعذر تسجيل الدخول. تحقق من الاسم وكلمة المرور.';

export function LoginPage({data,done}:{data:Bootstrap;done:(user:UserSession)=>void}){
  const[error,setError]=useState('');
  const{register,handleSubmit,formState:{isSubmitting}}=useForm<Form>();
  const submit=handleSubmit(async values=>{
    setError('');
    try{const result=await api.login(values.name,values.password);done(result.user)}catch(e){setError(message(e))}
  });
  return <div className="auth-screen"><div className="auth-brand">
    <div className="auth-mark">{data.centerLogoDataUrl?<img src={data.centerLogoDataUrl}/>:<span>EFC</span>}</div>
    <p><ShieldCheck size={18}/> نظام محلي آمن يعمل دون اتصال</p>
    <h1>{data.centerName||'مركز EFC للتدريب'}</h1>
    <span>إدارة التسجيلات والمدفوعات والدورات والفروع من مكان واحد.</span>
  </div><Card className="login-card"><div className="login-icon"><LockKeyhole/></div><h2>تسجيل الدخول</h2><p>أدخل حساب الموظف للمتابعة إلى النظام.</p><form onSubmit={submit} className="grid">
    <label>اسم المستخدم<Input autoFocus autoComplete="username" required {...register('name')}/></label>
    <label>كلمة المرور<Input type="password" autoComplete="current-password" required {...register('password')}/></label>
    {error&&<div className="form-error" role="alert">{error}</div>}
    <Button disabled={isSubmitting}>{isSubmitting?'جارٍ التحقق…':'دخول إلى النظام'}</Button>
  </form><small>بياناتك محفوظة على هذا الجهاز في قاعدة SQLite المحلية.</small></Card></div>
}
