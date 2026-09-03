import{useCallback,useEffect,useState}from'react';
import{BrowserRouter,Navigate,Route,Routes}from'react-router-dom';
import{api}from'./lib/api';
import type{Bootstrap,UserSession}from'./types';
import{Layout}from'./components/Layout';
import{RegisterPage}from'./pages/RegisterPage';
import{DataPage}from'./pages/DataPages';
import{SettingsPage}from'./pages/SettingsPage';
import{SetupPage}from'./pages/SetupPage';
import{LoginPage}from'./pages/LoginPage';
import{Button}from'./components/ui';

const errorText=(e:unknown)=>typeof e==='string'?e:e instanceof Error?e.message:'تعذر فتح قاعدة البيانات المحلية.';
const registrarPages=new Set(['register','specialties','period','students','status']);
const financePages=new Set(['specialties','period','students','status','finance','ledger']);
function canAccess(role:UserSession['role'],page:string){if(role==='ADMIN')return true;if(role==='REGISTRAR')return registrarPages.has(page);return financePages.has(page)}

export default function App(){
  const[data,setData]=useState<Bootstrap>();
  const[user,setUser]=useState<UserSession>();
  const[error,setError]=useState('');
  const load=useCallback(async()=>{setError('');try{setData(await api.bootstrap())}catch(e){setError(errorText(e))}},[]);
  useEffect(()=>{void load()},[load]);
  if(error)return <div className="fatal"><b>تعذر تشغيل النظام</b><p>{error}</p><Button onClick={()=>void load()}>إعادة المحاولة</Button></div>;
  if(!data)return <div className="loading"><span className="loader"/>جارٍ فتح قاعدة البيانات…</div>;
  if(!data.initialized)return <SetupPage done={()=>void load()}/>;
  if(!user)return <LoginPage data={data} done={setUser}/>;
  const logout=async()=>{await api.logout();setUser(undefined)};
  const home=user.role==='FINANCE'?'/finance':'/register';
  const guard=(page:string,node:React.ReactNode)=>canAccess(user.role,page)?node:<Navigate to={home} replace/>;
  return <BrowserRouter><Routes><Route element={<Layout data={data} user={user} onLogout={logout}/> }>
    <Route path="/register" element={guard('register',<RegisterPage data={data} user={user}/>)}/>
    {['specialties','period','students','status','finance','ledger'].map(k=><Route key={k} path={`/${k}`} element={guard(k,<DataPage kind={k} data={data} user={user} refreshBootstrap={load}/>)}/>)}
    <Route path="/settings" element={user.role==='ADMIN'?<SettingsPage refreshBootstrap={load}/>:<Navigate to={home} replace/>}/>
    <Route path="*" element={<Navigate to={home} replace/>}/>
  </Route></Routes></BrowserRouter>
}
