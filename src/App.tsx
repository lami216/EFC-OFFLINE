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
  return <BrowserRouter><Routes><Route element={<Layout data={data} user={user} onLogout={logout}/> }>
    <Route path="/register" element={user.role==='FINANCE'?<Navigate to="/finance" replace/>:<RegisterPage data={data}/>}/>
    {['specialties','period','students','status','finance','ledger'].map(k=><Route key={k} path={`/${k}`} element={<DataPage kind={k} data={data} user={user}/>}/>)}
    <Route path="/settings" element={user.role==='ADMIN'?<SettingsPage refreshBootstrap={load}/>:<Navigate to="/finance" replace/>}/>
    <Route path="*" element={<Navigate to={user.role==='FINANCE'?'/finance':'/register'} replace/>}/>
  </Route></Routes></BrowserRouter>
}
