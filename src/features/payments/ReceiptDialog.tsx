import{useRef,useState}from'react';
import html2canvas from'html2canvas';
import{jsPDF}from'jspdf';
import{save}from'@tauri-apps/plugin-dialog';
import{writeFile}from'@tauri-apps/plugin-fs';
import{Download,Printer,X}from'lucide-react';
import{toast}from'sonner';
import{Button}from'../../components/ui';
import{money,date}from'../../lib/format';
import type{Receipt}from'../../types';

export function ReceiptDialog({receipt:r,close}:{receipt:Receipt;close:()=>void}){
  const ref=useRef<HTMLDivElement>(null);const[busy,setBusy]=useState(false);
  async function pdf(){
    if(!ref.current)return;setBusy(true);
    try{const canvas=await html2canvas(ref.current,{scale:3,useCORS:true,backgroundColor:'#ffffff',logging:false});const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a5',compress:true});const margin=7;const width=148-margin*2;const height=canvas.height*(width/canvas.width);doc.addImage(canvas.toDataURL('image/jpeg',0.95),'JPEG',margin,margin,width,Math.min(height,196));const bytes=new Uint8Array(doc.output('arraybuffer'));const safe=r.studentName.replace(/[^\p{L}\p{N}-]/gu,'-').replace(/-+/g,'-');const name=`وصل-${String(r.receiptNumber).padStart(5,'0')}-${safe}.pdf`;const path=await save({defaultPath:name,filters:[{name:'PDF',extensions:['pdf']}]});if(path){await writeFile(path,bytes);toast.success('تم حفظ الوصل PDF.')}}catch{toast.error('تعذر إنشاء ملف PDF. حاول مرة أخرى.')}finally{setBusy(false)}
  }
  return <div className="overlay"><div className="dialog receipt-dialog"><div className="dialog-top"><div><p>الوصل</p><b>رقم {String(r.receiptNumber).padStart(5,'0')}</b></div><button className="icon-button" onClick={close}><X/></button></div><div className="receipt" ref={ref}><header>{r.centerLogoDataUrl&&<img src={r.centerLogoDataUrl} alt=""/>}<div><h2>{r.centerName}</h2><p>وصل تسجيل / دفع</p></div></header><div className="receipt-contact">{[r.centerPhone1,r.centerPhone2,r.centerAddress].filter(Boolean).join(' · ')}</div><div className="receipt-no"><span>رقم الوصل <b>{String(r.receiptNumber).padStart(5,'0')}</b></span><span>{date(r.issuedAt)}</span></div><dl><dt>اسم الطالب</dt><dd><b>{r.studentName}</b></dd><dt>التخصص</dt><dd>{r.specialtyName}</dd><dt>الفرع</dt><dd>{r.branchName}</dd><dt>رقم السجل</dt><dd>{String(r.registerNumber).padStart(4,'0')}</dd>{r.periodLabel&&<><dt>الفترة</dt><dd>{r.periodLabel}</dd></>}<dt>وسيلة الدفع</dt><dd>{r.methodName}</dd><dt>المبلغ المدفوع</dt><dd className="receipt-money">{money(r.amount)}</dd><dt>المتبقي</dt><dd>{money(r.remaining)}</dd></dl><div className="receipt-note">تم استلام المبلغ المذكور أعلاه وتسجيله في نظام المركز.</div><footer><span>توقيع المستلم</span><span>الختم</span></footer></div><div className="actions"><Button disabled={busy} onClick={()=>void pdf()}><Download size={16}/>{busy?'جارٍ إنشاء PDF…':'حفظ PDF'}</Button><Button className="secondary" onClick={()=>window.print()}><Printer size={16}/>طباعة</Button><Button className="secondary" onClick={close}>إغلاق</Button></div></div></div>
}
