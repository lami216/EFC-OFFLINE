// Demo v6 — targeted repair: correct EFC logo, finance restore, paper-like receipt, separate print/PDF.
const EFC_LOGO_V6 = new URL('./efc-logo.svg', window.location.href).href;

function applyEfcLogoV6(){
  let fav=document.querySelector('link[rel="icon"]');
  if(!fav){fav=document.createElement('link');fav.rel='icon';document.head.appendChild(fav)}
  fav.href=EFC_LOGO_V6;
  document.querySelectorAll('.brand .logo').forEach(box=>{
    box.innerHTML=`<img src="${EFC_LOGO_V6}" alt="EFC" style="width:100%;height:100%;object-fit:contain;display:block">`;
  });
}
if(typeof shell==='function'&&!window.__efcV6Shell){
  window.__efcV6Shell=true;
  const shellV6=shell;
  shell=function(...args){const out=shellV6.apply(this,args);queueMicrotask(applyEfcLogoV6);return out};
}
applyEfcLogoV6();

function labelVisibleV6(i,n){if(n<=12)return true;const s=Math.ceil(n/9);return i===0||i===n-1||i%s===0}
lineChartV3=function(series){
  const W=1120,H=360,L=125,R=35,T=35,B=58,mr=Math.max(0,...series.map(x=>Number(x.value||0))),st=niceStepV3(mr||1),mx=Math.max(st,Math.ceil(mr/st)*st),ticks=[];
  for(let v=0;v<=mx;v+=st)ticks.push(v);
  const x=i=>L+(series.length===1?0:i*(W-L-R)/(series.length-1)),y=v=>H-B-(Number(v||0)/mx)*(H-T-B);
  const grid=ticks.map(v=>`<g><line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" class="gridline"/><text x="${L-20}" y="${y(v)+4}" text-anchor="end" class="axis yaxis">${v3Number.format(v)}</text></g>`).join('');
  const pts=series.map((s,i)=>`${x(i)},${y(s.value)}`).join(' ');
  const labs=series.map((s,i)=>labelVisibleV6(i,series.length)?`<text x="${x(i)}" y="${H-22}" text-anchor="middle" class="axis xaxis">${westernDigitsV3(s.label)}</text>`:'').join('');
  const hits=series.map((s,i)=>`<circle cx="${x(i)}" cy="${y(s.value)}" r="14" fill="transparent" class="hitv6" data-detail="${s.detail}" data-value="${s.value}"/>`).join('');
  const dots=series.map((s,i)=>`<circle cx="${x(i)}" cy="${y(s.value)}" r="5" class="dot chart-point" data-detail="${s.detail}" data-value="${s.value}"/>`).join('');
  return `<div class="chart-wrap precise-chart"><div class="chart-tooltip" hidden></div><svg viewBox="0 0 ${W} ${H}">${grid}<polyline points="${pts}" class="line" fill="none"/>${hits}${dots}${labs}</svg></div>`;
};
bindChartTooltipV3=function(){
  const w=document.querySelector('.precise-chart'),t=w?.querySelector('.chart-tooltip');if(!w||!t)return;
  const hide=()=>{t.hidden=true;t.style.opacity='0';t.innerHTML=''};
  const show=(e,n)=>{t.hidden=false;t.style.opacity='1';t.innerHTML=`<b>${westernDigitsV3(n.dataset.detail||'')}</b><span>${moneyV3(n.dataset.value)}</span>`;const r=w.getBoundingClientRect();t.style.left=`${Math.min(r.width-170,Math.max(8,e.clientX-r.left+12))}px`;t.style.top=`${Math.max(8,e.clientY-r.top-58)}px`};
  w.querySelectorAll('.hitv6,.chart-point').forEach(n=>{n.onpointerenter=e=>show(e,n);n.onpointermove=e=>show(e,n);n.onpointerleave=hide});
  w.onpointerleave=hide;w.onmouseleave=hide;w.onscroll=hide;
};

function receiptCssV6(){
return `*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#edf0ef;color:#151b19;direction:rtl}.paper{width:1040px;max-width:96vw;margin:18px auto;background:#fff;border:2px solid #273630;padding:14px 22px 13px}.head{display:grid;grid-template-columns:290px 1fr 150px;align-items:center;border-bottom:1px solid #a7aeab;padding-bottom:7px}.left{display:flex;direction:ltr;align-items:center;gap:8px;text-align:left}.left>div{display:grid;gap:2px}.left b{font-size:15px}.left small{font-size:11px}.logo{width:105px;height:74px;object-fit:contain}.right{text-align:left}.center{text-align:center}.center h1{margin:0;font-size:29px}.center .tag{font-weight:700;font-size:13px}.rn{display:flex;justify-content:center;gap:16px;align-items:center;margin-top:4px;font-size:19px}.rn b{font-size:23px}.date{display:flex;justify-content:space-between;margin:8px 0 4px;font-size:13px}.recognition{text-align:center;font-size:13px;font-weight:700;margin:3px 0 6px}.line{display:grid;grid-template-columns:auto 1fr auto 1fr auto;gap:8px;align-items:end;margin:7px 0;font-size:15px}.line i,.half i,.month i{height:11px;border-bottom:2px dotted #777}.line b{text-align:center;font-size:17px}.fr{direction:ltr}.halves{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin:8px 0}.half{display:grid;grid-template-columns:auto 1fr auto auto;gap:7px;align-items:end;font-size:14px}.half b{font-size:16px}.monthrow{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin:8px 0}.month{display:flex;align-items:center;gap:8px}.month i{flex:1}.regbox{border:2px solid #555;padding:4px 22px;min-width:100px;text-align:center}.sub{display:flex;justify-content:space-between;font-size:12px;margin:6px 0}.desc{border-top:1px dashed #999;border-bottom:1px dashed #999;padding:6px 0;display:grid;grid-template-columns:auto 1fr;gap:10px}.desc b{text-align:center;font-size:15px}.note{text-align:center;font-size:11px;font-weight:700;margin:7px 0}.methods{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.method{display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px}.check{width:29px;height:24px;border:2px solid #555;display:grid;place-items:center;font-weight:800}.method.sel .check{background:#159a55;border-color:#159a55;color:#fff}.mt{width:100%;border-collapse:collapse;margin-top:9px;font-size:12px}.mt th,.mt td{border:1px solid #ccd2d0;padding:6px;text-align:center}.mt th{background:#f2f4f3}.tot{display:flex;justify-content:space-between;margin-top:9px}.actions{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;gap:8px}.actions button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.pb{background:#155ea8;color:#fff}.db{background:#159a55;color:#fff}@media print{body{background:#fff}.paper{width:100%;max-width:none;margin:0;border:1px solid #222}.actions{display:none}@page{size:landscape;margin:8mm}}`;
}
function receiptHtmlV6(r){
 const logo=`<img class="logo" src="${EFC_LOGO_V6}" alt="EFC">`;
 const head=`<div class="head"><div class="left">${logo}<div><b>Tél: 48 02 84 84</b><b>☏ 32 09 86 89</b><small>● الأستاذ محمد لمين</small></div></div><div class="center"><h1>Centre EFC &nbsp; مركز</h1><div class="tag">جميع الشهادات معترف بها من طرف الدولة</div><div class="rn"><span>Reçu N°</span><b>${westernDigitsV3(r.receipt||'')}</b><span>وصل رقم</span></div></div><div class="right">${logo}</div></div>`;
 if(r.statement){
  const rows=(r.plan||[]).map(m=>{const st=m.state==='paid'?'مدفوع':m.state==='partial'?'دفع جزئي':m.state==='overdue'?'متأخر':m.state==='due'?'مستحق':'لم يحن';return `<tr><td>الشهر ${m.number}</td><td>${fmtDateV3(m.dueDate)}</td><td>${moneyV3(m.fee)}</td><td>${moneyV3(m.paid)}</td><td>${moneyV3(m.remaining)}</td><td>${st}</td></tr>`}).join('');
  return `${head}<div class="date"><span>التاريخ: <b>${fmtDateV3(r.date)}</b></span><b>كشف الأشهر</b></div><div class="line"><span class="fr">Nom de l’étudiant</span><i></i><b>${escV4(r.student)}</b><i></i><span>اسم الطالب</span></div><div class="line"><span class="fr">Filière</span><i></i><b>${escV4(r.specialty)}</b><i></i><span>تخصص</span></div><div class="sub"><span>الفرع: <b>${escV4(r.branch)}</b></span><span>رقم سجل: <b class="regbox">${westernDigitsV3(r.reg)}</b></span></div><table class="mt"><thead><tr><th>الشهر</th><th>الاستحقاق</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table><div class="tot"><b>إجمالي المدفوع: ${moneyV3(r.paid)}</b><b>المتبقي من الدورة: ${moneyV3(r.remaining)}</b></div><p class="note">ملاحظة 1: لا يمكن استرجاع المبلغ المدفوع للمركز في أي حال من الأحوال.</p>`;
 }
 const names=['نقداً','Masrvi','Bankily','السداد','بنكي'],norm=String(r.method||'').toLowerCase().replace(/[ًاأإآ]/g,'');
 const methods=names.map(n=>`<div class="method ${norm.includes(n.toLowerCase().replace(/[ًاأإآ]/g,''))?'sel':''}"><span class="check">${norm.includes(n.toLowerCase().replace(/[ًاأإآ]/g,''))?'✓':''}</span><b>${n}</b></div>`).join('');
 return `${head}<div class="date"><span>تم الدفع في تاريخ: <b>${fmtDateV3(r.date)}</b></span></div><div class="recognition">جميع الشهادات معترف بها من طرف الدولة</div><div class="line"><span class="fr">Nom de l’étudiant</span><i></i><b>${escV4(r.student)}</b><i></i><span>اسم الطالب</span></div><div class="line"><span class="fr">Filière</span><i></i><b>${escV4(r.specialty)}</b><i></i><span>تخصص</span></div><div class="halves"><div class="half"><span class="fr">Reliquat</span><i></i><b>${moneyV3(r.remaining)}</b><span>المبلغ المتبقي</span></div><div class="half"><span class="fr">Montant</span><i></i><b>${moneyV3(r.amount)}</b><span>المبلغ</span></div></div><div class="monthrow"><div class="month"><span class="fr">Mois</span><i></i><b>${westernDigitsV3(r.month||'—')}</b><span>الشهر</span></div><div class="month"><span>رقم سجل</span><b class="regbox">${westernDigitsV3(r.reg)}</b></div></div><div class="sub"><span>الفرع: <b>${escV4(r.branch)}</b></span><span>وسيلة الدفع: <b>${escV4(r.method||'—')}</b></span></div><div class="desc"><span>البيان</span><b>${escV4(r.desc||'')}</b></div><p class="note">ملاحظة 1: لا يمكن استرجاع المبلغ المدفوع للمركز في أي حال من الأحوال.</p><div class="methods">${methods}</div>`;
}
function loadLibV6(src,key){return new Promise((res,rej)=>{if(window[key])return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
async function downloadReceiptPdfV6(r){
 let stage;
 try{
  await loadLibV6('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js','html2canvas');
  await loadLibV6('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js','jspdf');
  stage=document.createElement('div');stage.style.cssText='position:fixed;left:-12000px;top:0;width:1040px;background:white;z-index:-1';stage.innerHTML=`<style>${receiptCssV6()}</style><div class="paper">${receiptHtmlV6(r)}</div>`;document.body.appendChild(stage);
  const canvas=await html2canvas(stage.querySelector('.paper'),{scale:2,useCORS:true,backgroundColor:'#fff'});
  const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pw=doc.internal.pageSize.getWidth(),ph=doc.internal.pageSize.getHeight(),ratio=Math.min(pw/canvas.width,ph/canvas.height),w=canvas.width*ratio,h=canvas.height*ratio;
  doc.addImage(canvas.toDataURL('image/jpeg',.95),'JPEG',(pw-w)/2,(ph-h)/2,w,h);doc.save(`وصل-${westernDigitsV3(r.receipt||r.reg||'EFC')}.pdf`);
 }catch(e){console.error(e);alert('تعذر تنزيل PDF الآن. استخدم زر الطباعة مؤقتاً.')}finally{stage?.remove()}
}
receiptWindowV4=function(r,autoPrint=false){
 const w=window.open('','_blank','width=1120,height=760');if(!w)return;const data=JSON.stringify(r).replace(/</g,'\\u003c');
 w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>وصل ${westernDigitsV3(r.receipt||'')}</title><style>${receiptCssV6()}</style></head><body><div class="paper">${receiptHtmlV6(r)}</div><div class="actions"><button class="pb" onclick="print()">طباعة</button><button class="db" onclick="opener&&opener.downloadReceiptPdfV6(RV6)">تحميل PDF</button></div><script>const RV6=${data};${autoPrint?'setTimeout(()=>print(),250);':''}<\/script></body></html>`);w.document.close()
};
receiptActionsV4=function(r){
 const k='rv6'+Date.now()+Math.random().toString(36).slice(2);setTimeout(()=>{document.querySelector(`[data-p6="${k}"]`)?.addEventListener('click',()=>receiptWindowV4(r,true));document.querySelector(`[data-d6="${k}"]`)?.addEventListener('click',()=>downloadReceiptPdfV6(r))},0);
 return `<button class="button secondary" data-p6="${k}">طباعة</button><button class="button" data-d6="${k}">تحميل PDF</button>`;
};

const fixStyleV6=document.createElement('style');fixStyleV6.textContent=`.brand .logo{width:68px!important;height:58px!important;padding:1px!important;background:#fff!important}.precise-chart .peak-note{display:none!important}.precise-chart .hitv6{cursor:crosshair}.chart-tooltip{transition:none!important}.line{stroke:#159a55!important}.dot{stroke:#159a55!important}.break-row i{background:#159a55!important}`;document.head.appendChild(fixStyleV6);
setTimeout(()=>{applyEfcLogoV6();try{renderCurrentMerged()}catch{try{renderCurrent()}catch(e){console.error(e)}}},0);
