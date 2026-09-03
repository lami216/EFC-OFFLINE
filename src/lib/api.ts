import{invoke}from'@tauri-apps/api/core';
import type{AddPaymentInput,Bootstrap,FinanceReport,LoginResult,Receipt,RegistrationInput,RegistrationResult,Row,SettingsSnapshot,StudentDetails}from'../types';

const browser=typeof window!=='undefined'&&!('__TAURI_INTERNALS__' in window);
let sessionToken='';

function authArgs<T extends object>(args:T){
  if(!sessionToken)throw new Error('انتهت جلسة الدخول. أعد تسجيل الدخول.');
  return{...args,token:sessionToken};
}

async function queryRows(kind:string,filters:unknown={}){
  const rows=await invoke<Row[]>('query_view',authArgs({kind,filters}));
  if(!kind.startsWith('period_'))return rows;
  const statuses=await invoke<Row[]>('query_view',authArgs({kind:'status',filters}));
  const byEnrollment=new Map(statuses.map(row=>[String(row._enrollmentId??''),String(row['الوضعية المالية']??'')]));
  return rows.map(row=>{
    const current=String(row['الوضعية']??'');
    let financial=current||byEnrollment.get(String(row._enrollmentId??''))||'—';
    if(financial==='لا مستحق الآن')financial='لم يحن موعد الدفع';
    const next:Row={...row,'الحالة':financial};
    delete next['الوضعية'];
    return next;
  });
}

export const api={
  bootstrap:()=>browser?Promise.resolve({initialized:false,branches:[],specialties:[],specialtyBranches:[],paymentMethods:[],centerName:'',centerLogoDataUrl:null} satisfies Bootstrap):invoke<Bootstrap>('bootstrap'),
  setup:(input:unknown)=>invoke('first_run_setup',{input}),
  login:async(name:string,password:string)=>{const result=await invoke<LoginResult>('login',{name,password});sessionToken=result.token;return result},
  logout:async()=>{if(sessionToken){const token=sessionToken;sessionToken='';await invoke('logout',{token}).catch(()=>undefined)}},
  nextRegister:(branchId:string,specialtyId:string)=>invoke<number>('next_register_number',authArgs({branchId,specialtyId})),
  register:(input:RegistrationInput)=>invoke<RegistrationResult>('register_student',authArgs({input})),
  addPayment:(input:AddPaymentInput)=>invoke<Receipt>('add_payment',authArgs({input})),
  receipt:(receiptNumber:number)=>invoke<Receipt>('get_receipt',authArgs({receiptNumber})),
  studentDetails:(studentId:string)=>invoke<StudentDetails>('student_details',authArgs({studentId})),
  query:queryRows,
  financeReport:(filters:unknown={})=>invoke<FinanceReport>('finance_report',authArgs({filters})),
  settings:()=>invoke<SettingsSnapshot>('settings_snapshot',authArgs({})),
  saveEntity:(kind:string,value:unknown)=>invoke('save_entity',authArgs({kind,value})),
  voidPayment:(id:string,reason:string)=>invoke('void_payment',authArgs({id,reason})),
  backup:(destination:string)=>invoke<string>('backup_database',authArgs({destination})),
  restore:(source:string)=>invoke<string>('restore_database',authArgs({source})),
};
