import{useEffect}from'react';
import{NavLink,Outlet,useNavigate}from'react-router-dom';
import{UserPlus,BookOpen,CalendarSearch,Search,Filter,Landmark,NotebookTabs,Settings,SunMoon,LogOut}from'lucide-react';
import type{Bootstrap,Role,UserSession}from'../types';
import{EFC_LOGO_DATA_URL}from'../lib/brand';

const allLinks:[string,string,typeof UserPlus,Role[]][]=[
  ['/register','تسجيل طالب',UserPlus,['ADMIN','REGISTRAR']],
  ['/specialties','التخصصات',BookOpen,['ADMIN','REGISTRAR','FINANCE']],
  ['/period','آلية البحث',CalendarSearch,['ADMIN','REGISTRAR','FINANCE']],
  ['/students','البحث عن طالب',Search,['ADMIN','REGISTRAR','FINANCE']],
  ['/status','البحث بالوضعية',Filter,['ADMIN','REGISTRAR','FINANCE']],
  ['/finance','المالية',Landmark,['ADMIN','FINANCE','REGISTRAR']],
  ['/ledger','اليومية',NotebookTabs,['ADMIN','FINANCE','REGISTRAR']],
  ['/settings','الإعدادات',Settings,['ADMIN']],
];
const roles:Record<Role,string>={ADMIN:'مدير النظام',REGISTRAR:'موظف التسجيل',FINANCE:'المالية'};

export function Layout({data,user,onLogout}:{data:Bootstrap;user:UserSession;onLogout:()=>void}){
  const nav=useNavigate();
  const branch=data.branches.find(x=>x.id===user.branchId)?.name||'جميع الفروع';
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.ctrlKey&&e.key.toLowerCase()==='n'&&user.role!=='FINANCE'){e.preventDefault();nav('/register')}if(e.ctrlKey&&e.key.toLowerCase()==='f'){e.preventDefault();nav('/students')}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[nav,user.role]);
  const theme=()=>{const dark=document.documentElement.classList.toggle('dark');localStorage.setItem('efc-theme',dark?'dark':'light')};
  useEffect(()=>{document.documentElement.classList.toggle('dark',localStorage.getItem('efc-theme')==='dark')},[]);
  const logo=data.centerLogoDataUrl||EFC_LOGO_DATA_URL;
  return <div className="shell"><aside><div className="brand"><span><img src={logo} alt="EFC"/></span><div><b>{data.centerName||'مركز EFC للتدريب'}</b><small>نظام إدارة الطلاب والمالية</small></div></div><nav>{allLinks.filter(([, , ,allowed])=>allowed.includes(user.role)).map(([to,label,I])=><NavLink to={to} key={to}><I size={19}/>{label}</NavLink>)}</nav><div className="profile"><div className="avatar">{user.name.slice(0,1)}</div><div><b>{user.name}</b><small>{roles[user.role]} · {branch}</small></div><button aria-label="تغيير المظهر" title="تغيير المظهر" onClick={theme}><SunMoon size={18}/></button><button aria-label="تسجيل الخروج" title="تسجيل الخروج" onClick={onLogout}><LogOut size={18}/></button></div></aside><main><header><div><b>{data.centerName||'مركز EFC للتدريب'}</b><small>نظام محلي · قاعدة SQLite · {branch}</small></div><div className="shortcuts"><kbd>Ctrl+F بحث</kbd>{user.role!=='FINANCE'&&<kbd>Ctrl+N تسجيل</kbd>}</div></header><div className="content"><Outlet/></div></main></div>
}
