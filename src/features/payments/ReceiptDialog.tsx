import{useRef,useState}from'react';
import html2canvas from'html2canvas';
import{jsPDF}from'jspdf';
import{save}from'@tauri-apps/plugin-dialog';
import{writeFile}from'@tauri-apps/plugin-fs';
import{Download,Printer,X}from'lucide-react';
import{toast}from'sonner';
import{Button}from'../../components/ui';
import{date,money}from'../../lib/format';
import{EFC_LOGO_DATA_URL,EFC_PHONE,EFC_TEACHER,EFC_WHATSAPP}from'../../lib/brand';
import type{PaymentMethod,Receipt}from'../../types';

function WhatsAppIcon(){return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.05 3.2A12.65 12.65 0 0 0 5.2 22.34L3.5 28.5l6.3-1.65a12.63 12.63 0 1 0 6.25-23.65Zm0 22.98a10.4 10.4 0 0 1-5.3-1.45l-.38-.23-3.74.98 1-3.64-.25-.38a10.42 10.42 0 1 1 8.67 4.72Zm5.72-7.8c-.31-.16-1.85-.91-2.14-1.02-.28-.1-.49-.16-.7.16-.2.31-.8 1.02-.98 1.23-.18.2-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.55-1.84-1.73-2.15-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.55.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.7-1.68-.96-2.3-.25-.6-.51-.52-.7-.53h-.6c-.2 0-.54.08-.83.39-.28.31-1.08 1.05-1.08 2.57 0 1.51 1.1 2.98 1.26 3.18.16.2 2.17 3.31 5.25 4.64.73.32 1.3.5 1.75.64.74.23 1.4.2 1.93.12.59-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.2-.6-.36Z"/></svg>}
function FacebookIcon(){return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M18.3 29V17.1h4l.6-4.7h-4.6v-3c0-1.35.37-2.28 2.32-2.28H23V2.94c-.41-.06-1.82-.18-3.47-.18-3.44 0-5.8 2.1-5.8 5.96v3.68H9.84v4.7h3.89V29h4.57Z"/></svg>}

function Track({value,register=false}:{value:React.ReactNode;register?:boolean}){return <span className={`receipt-track ${register?'register-track':''}`}><b>{value}</b></span>}
function Row({fr,value,ar}:{fr:string;value:React.ReactNode;ar:string}){return <div className="receipt-field"><span className="receipt-fr">{fr}</span><Track value={value}/><span className="receipt-ar">{ar}</span></div>}
function Half({fr,value,ar,register=false}:{fr:string;value:React.ReactNode;ar:string;register?:boolean}){return <div className="receipt-half"><span className="receipt-fr">{fr}</span><Track value={value} register={register}/><span className="receipt-ar">{ar}</span></div>}

async function waitForImages(root:HTMLElement){await Promise.all([...root.querySelectorAll('img')].map(img=>img.complete&&img.naturalWidth>0?Promise.resolve():new Promise<void>(resolve=>{img.onload=()=>resolve();img.onerror=()=>resolve();window.setTimeout(resolve,1200)})))}

export function ReceiptDialog({receipt:r,paymentMethods=[],close}:{receipt:Receipt;paymentMethods?:PaymentMethod[];close:()=>void}){
  const ref=useRef<HTMLDivElement>(null);const[busy,setBusy]=useState(false);
  const logo=r.centerLogoDataUrl||EFC_LOGO_DATA_URL;
  const phone1=r.centerPhone1||EFC_PHONE;const phone2=r.centerPhone2||EFC_WHATSAPP;
  const description=r.description||(`مدفوع ${r.periodLabel?`${r.periodLabel} لدورة ${r.specialtyName}`:`لدورة ${r.specialtyName}`}`);
  const methods=[...paymentMethods.filter(x=>x.active)];
  if(r.methodName&&!methods.some(x=>x.name.trim().toLowerCase()===r.methodName.trim().toLowerCase()))methods.push({id:'receipt-method',name:r.methodName,active:true});

  async function pdf(){
    if(!ref.current)return;setBusy(true);
    try{await waitForImages(ref.current);const canvas=await html2canvas(ref.current,{scale:2.5,useCORS:false,allowTaint:false,backgroundColor:'#ffffff',logging:false});const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});const pw=doc.internal.pageSize.getWidth(),ph=doc.internal.pageSize.getHeight(),margin=7;const ratio=Math.min((pw-margin*2)/canvas.width,(ph-margin*2)/canvas.height);const width=canvas.width*ratio,height=canvas.height*ratio;doc.addImage(canvas.toDataURL('image/jpeg',0.96),'JPEG',(pw-width)/2,(ph-height)/2,width,height);const bytes=new Uint8Array(doc.output('arraybuffer'));const safe=r.studentName.replace(/[^\p{L}\p{N}-]/gu,'-').replace(/-+/g,'-');const name=`وصل-${String(r.receiptNumber).padStart(5,'0')}-${safe}.pdf`;const path=await save({defaultPath:name,filters:[{name:'PDF',extensions:['pdf']}]});if(path){await writeFile(path,bytes);toast.success('تم حفظ الوصل PDF.')}}catch(e){console.error(e);toast.error('تعذر إنشاء ملف PDF. حاول مرة أخرى.')}finally{setBusy(false)}
  }

  return <div className="overlay receipt-overlay"><div className="dialog receipt-dialog approved-receipt-dialog"><div className="dialog-top no-print"><div><p>الروسي</p><b>وصل رقم {String(r.receiptNumber).padStart(5,'0')}</b></div><button className="icon-button" onClick={close}><X/></button></div>
    <div className="approved-receipt receipt-print-root" ref={ref}>
      <div className="receipt-head">
        <div className="receipt-contact-block"><img src={logo} alt="EFC"/><div><b>Tél: {phone1}</b><div className="receipt-social"><WhatsAppIcon/><b>{phone2}</b></div><div className="receipt-social receipt-teacher"><FacebookIcon/><b>{EFC_TEACHER}</b></div></div></div>
        <div className="receipt-center-title"><h1><span>Centre EFC</span><span>مركز</span></h1><p>جميع الشهادات معترف بها من طرف الدولة</p><div className="receipt-number"><span>Reçu N°</span><b>{String(r.receiptNumber).padStart(5,'0')}</b><span>وصل رقم</span></div></div>
        <div className="receipt-logo-only"><img src={logo} alt="EFC"/></div>
      </div>
      <div className="receipt-meta"><span>تم الدفع في تاريخ: <b>{date(r.issuedAt)}</b></span><span>الفرع: <b>{r.branchName}</b></span></div>
      <Row fr="Nom de l’étudiant" value={r.studentName} ar="اسم الطالب"/>
      <Row fr="Filière" value={r.specialtyName} ar="تخصص"/>
      <div className="receipt-pair"><Half fr="Reliquat" value={money(r.remaining)} ar="المبلغ المتبقي"/><Half fr="Montant" value={money(r.amount)} ar="المبلغ"/></div>
      <div className="receipt-pair"><Half fr="Mois" value={r.periodLabel||'—'} ar="الشهر"/><Half fr="N° Registre" value={String(r.registerNumber).padStart(4,'0')} ar="رقم السجل" register/></div>
      <div className="receipt-description"><Row fr="Libellé" value={description} ar="البيان"/></div>
      <p className="receipt-warning">ملاحظة 1: لا يمكن استرجاع المبلغ المدفوع للمركز في أي حال من الأحوال.</p>
      <div className="receipt-method-list">{methods.map(m=>{const selected=m.name.trim().toLowerCase()===r.methodName.trim().toLowerCase();return <div key={m.id||m.name} className={`receipt-method ${selected?'selected':''}`}><span>{selected?'✓':''}</span>{m.logoDataUrl&&<img src={m.logoDataUrl} alt=""/>}<b>{m.name}</b></div>})}</div>
    </div>
    <div className="actions no-print"><Button className="secondary" onClick={()=>window.print()}><Printer size={16}/>طباعة</Button><Button disabled={busy} onClick={()=>void pdf()}><Download size={16}/>{busy?'جارٍ إنشاء PDF…':'تحميل PDF'}</Button><Button className="secondary" onClick={close}>إغلاق</Button></div>
  </div></div>
}
