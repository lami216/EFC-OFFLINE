// Demo v10 — compact receipt close to the original paper + persistent sidebar logo.
// gh-pages only; finance and desktop/main are untouched.
(() => {
  const esc10=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm10=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[ًٌٍَُِّْـ]/g,'');
  const logo10=()=>document.querySelector('link[rel="icon"]')?.href || '';

  function applyBrandLogo10(){
    const src=logo10();
    if(!src)return;
    document.querySelectorAll('.brand .logo').forEach(box=>{
      box.innerHTML='';
      box.style.setProperty('background-image',`url("${src}")`,'important');
      box.style.setProperty('background-repeat','no-repeat','important');
      box.style.setProperty('background-position','center','important');
      box.style.setProperty('background-size','contain','important');
      box.style.setProperty('background-color','#fff','important');
      box.style.setProperty('color','transparent','important');
    });
  }
  const shellBefore10=window.shell||shell;
  shell=function(content){shellBefore10(content);applyBrandLogo10();};
  applyBrandLogo10();

  function css10(){return `
  *{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#eef1f0;color:#121816}
  .paper{width:1040px;max-width:96vw;margin:18px auto;background:#fff;border:2px solid #2d3834;padding:12px 20px 11px;direction:ltr}
  .head10{display:grid;grid-template-columns:175px 1fr 245px;gap:15px;align-items:center;border-bottom:1px solid #abb2af;padding-bottom:7px}
  .headLogo10{height:72px;display:grid;place-items:center}.headLogo10 img{width:106px;height:68px;display:block;object-fit:contain;object-position:center}
  .center10{text-align:center;direction:rtl}.center10 h1{margin:0;font-size:28px;line-height:1}.center10 .tag10{font-size:12px;font-weight:700;margin-top:3px}
  .receiptNo10{display:flex;direction:ltr;align-items:center;justify-content:center;gap:10px;margin-top:4px;font-size:17px}.receiptNo10 b{font-size:22px}
  .contact10{display:grid;grid-template-columns:100px 1fr;gap:7px;align-items:center;direction:ltr;text-align:left}.contact10 img{width:94px;height:65px;object-fit:contain;object-position:center}.contact10 div{display:grid;gap:2px}.contact10 b{font-size:13px}.contact10 small{font-size:9px}
  .date10{text-align:right;direction:rtl;font-size:12px;margin:7px 0 2px}.recognition10{text-align:center;direction:rtl;font-size:12px;font-weight:700;margin:3px 0 6px}
  .full10{display:grid;grid-template-columns:118px minmax(0,1fr) 142px;gap:7px;align-items:center;height:31px;font-size:13px;direction:ltr}
  .ar10{direction:rtl;text-align:left;font-weight:700;white-space:nowrap}.fr10{direction:ltr;text-align:right;white-space:nowrap}
  .track10{position:relative;height:25px;display:flex;align-items:center;justify-content:center;min-width:0}.track10:before{content:"";position:absolute;left:0;right:0;top:50%;border-top:2px dotted #7d8581;transform:translateY(-50%)}.track10 b{position:relative;background:#fff;padding:0 9px;font-size:15px;font-weight:800;direction:rtl;white-space:nowrap;max-width:93%;overflow:hidden;text-overflow:ellipsis}
  .pair10{display:grid;grid-template-columns:1fr 1fr;gap:22px;direction:ltr;margin:1px 0}.half10{display:grid;grid-template-columns:112px minmax(0,1fr) 86px;gap:6px;align-items:center;height:31px;font-size:13px}.half10.regHalf10{grid-template-columns:112px minmax(0,1fr) 92px}.half10.branchHalf10{grid-template-columns:92px minmax(0,1fr) 72px}.half10.payHalf10{grid-template-columns:112px minmax(0,1fr) 126px}
  .regValue10{position:relative;z-index:1;background:#fff;border:2px solid #555;padding:3px 18px;min-width:92px;text-align:center;font-weight:800}
  .desc10{margin-top:2px;border-top:1px dotted #bbb;border-bottom:1px dotted #bbb;padding:2px 0}
  .note10{text-align:center;direction:rtl;font-size:10px;font-weight:700;margin:6px 0 5px}
  .methods10{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;direction:rtl}.method10{display:flex;align-items:center;justify-content:center;gap:5px;font-size:10px}.check10{width:27px;height:22px;border:2px solid #555;display:grid;place-items:center;font-weight:800}.method10.sel10 .check10{background:#159a55;border-color:#159a55;color:#fff}
  .mt10{width:100%;border-collapse:collapse;margin-top:7px;font-size:11px;direction:rtl}.mt10 th,.mt10 td{border:1px solid #ccd2d0;padding:5px;text-align:center}.mt10 th{background:#f2f4f3}.tot10{display:flex;direction:rtl;justify-content:space-between;margin-top:7px;font-size:12px}
  .actions10{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;direction:rtl;gap:8px}.actions10 button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.print10{background:#155ea8;color:#fff}.download10{background:#159a55;color:#fff}
  @media print{body{background:#fff}.paper{width:100%;max-width:none;margin:0;border:1px solid #222}.actions10{display:none}@page{size:landscape;margin:8mm}}
  `}

  const trk10=v=>`<span class="track10"><b>${esc10(v)}</b></span>`;
  const field10=(ar,val,fr,extra='')=>`<div class="full10 ${extra}"><span class="ar10">${ar}</span>${trk10(val)}<span class="fr10">${fr}</span></div>`;
  const half10=(ar,val,fr,cls='')=>`<div class="half10 ${cls}"><span class="ar10">${ar}</span>${trk10(val)}<span class="fr10">${fr}</span></div>`;

  function head10(r){const src=logo10();const img=`<img src="${src}" alt="EFC">`;return `<div class="head10"><div class="headLogo10">${img}</div><div class="center10"><h1>Centre EFC &nbsp; مركز</h1><div class="tag10">جميع الشهادات معترف بها من طرف الدولة</div><div class="receiptNo10"><span>Reçu N°</span><b>${westernDigitsV3(r.receipt||'')}</b><span>وصل رقم</span></div></div><div class="contact10">${img}<div><b>Tél: 48 02 84 84</b><b>☎ 32 09 86 89</b><small>● الأستاذ محمد لمين</small></div></div></div>`}

  function methods10(current){const list=[...new Set((methods||[]).map(String).map(s=>s.trim()).filter(Boolean))];if(current&&!list.some(x=>norm10(x)===norm10(current)))list.push(String(current));return list.map(name=>{const on=norm10(name)===norm10(current);return `<div class="method10 ${on?'sel10':''}"><span class="check10">${on?'✓':''}</span><b>${esc10(name)}</b></div>`}).join('')}

  function html10(r){
    const head=head10(r);
    if(r.statement){
      const rows=(r.plan||[]).map(m=>{const st=m.state==='paid'?'مدفوع':m.state==='partial'?'دفع جزئي':m.state==='overdue'?'متأخر':m.state==='due'?'مستحق':'لم يحن';return `<tr><td>الشهر ${westernDigitsV3(m.number)}</td><td>${fmtDateV3(m.dueDate)}</td><td>${moneyV3(m.fee)}</td><td>${moneyV3(m.paid)}</td><td>${moneyV3(m.remaining)}</td><td>${st}</td></tr>`}).join('');
      return `${head}<div class="date10">التاريخ: <b>${fmtDateV3(r.date)}</b></div>${field10('اسم الطالب',r.student,'Nom de l’étudiant')}${field10('التخصص',r.specialty,'Filière')}<div class="pair10">${half10('الفرع',r.branch,'Branche','branchHalf10')}${half10('رقم السجل',westernDigitsV3(r.reg),'N° Registre','regHalf10')}</div><table class="mt10"><thead><tr><th>الشهر</th><th>الاستحقاق</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table><div class="tot10"><b>إجمالي المدفوع: ${moneyV3(r.paid)}</b><b>المتبقي من الدورة: ${moneyV3(r.remaining)}</b></div><p class="note10">ملاحظة 1: لا يمكن استرجاع المبلغ المدفوع للمركز في أي حال من الأحوال.</p>`;
    }
    return `${head}<div class="date10">تم الدفع في تاريخ: <b>${fmtDateV3(r.date)}</b></div><div class="recognition10">جميع الشهادات معترف بها من طرف الدولة</div>${field10('اسم الطالب',r.student,'Nom de l’étudiant')}${field10('التخصص',r.specialty,'Filière')}<div class="pair10">${half10('المبلغ',moneyV3(r.amount),'Montant')}${half10('المبلغ المتبقي',moneyV3(r.remaining),'Reliquat')}</div><div class="pair10">${half10('الشهر',westernDigitsV3(r.month||'—'),'Mois')}${half10('رقم السجل',westernDigitsV3(r.reg),'N° Registre','regHalf10')}</div><div class="pair10">${half10('الفرع',r.branch,'Branche','branchHalf10')}${half10('وسيلة الدفع',r.method||'—','Mode de paiement','payHalf10')}</div><div class="desc10">${field10('البيان',r.desc||'','Libellé')}</div><p class="note10">ملاحظة 1: لا يمكن استرجاع المبلغ المدفوع للمركز في أي حال من الأحوال.</p><div class="methods10">${methods10(r.method)}</div>`;
  }

  async function waitImgs10(root){await Promise.all([...root.querySelectorAll('img')].map(img=>img.complete&&img.naturalWidth?Promise.resolve():new Promise(res=>{img.onload=res;img.onerror=res;setTimeout(res,1200)})))}
  function load10(src,key){return new Promise((res,rej)=>{if(window[key])return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
  async function download10(r){let stage;try{await load10('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js','html2canvas');await load10('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js','jspdf');stage=document.createElement('div');stage.style.cssText='position:fixed;left:-14000px;top:0;width:1040px;background:#fff;z-index:-9999';stage.innerHTML=`<style>${css10()}</style><div class="paper">${html10(r)}</div>`;document.body.appendChild(stage);await waitImgs10(stage);const canvas=await html2canvas(stage.querySelector('.paper'),{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false});const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const pw=doc.internal.pageSize.getWidth(),ph=doc.internal.pageSize.getHeight(),ratio=Math.min(pw/canvas.width,ph/canvas.height),w=canvas.width*ratio,h=canvas.height*ratio;doc.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pw-w)/2,(ph-h)/2,w,h);doc.save(`وصل-${westernDigitsV3(r.receipt||r.reg||'EFC')}.pdf`)}catch(e){console.error('receipt v10',e);alert('تعذر تنزيل PDF. جرّب زر الطباعة.')}finally{stage?.remove()}}
  window.downloadReceiptPdfV10=download10;

  receiptWindowV4=function(r,autoPrint=false){const w=window.open('','_blank','width=1120,height=720');if(!w)return;const data=JSON.stringify(r).replace(/</g,'\\u003c');w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>وصل ${westernDigitsV3(r.receipt||'')}</title><style>${css10()}</style></head><body><div class="paper">${html10(r)}</div><div class="actions10"><button class="print10" onclick="print()">طباعة</button><button class="download10" onclick="opener&&opener.downloadReceiptPdfV10(R10)">تحميل PDF</button></div><script>const R10=${data};${autoPrint?'setTimeout(()=>print(),250);':''}<\/script></body></html>`);w.document.close()};
  receiptActionsV4=function(r){const k='r10'+Date.now()+Math.random().toString(36).slice(2);setTimeout(()=>{document.querySelector(`[data-open="${k}"]`)?.addEventListener('click',()=>receiptWindowV4(r));document.querySelector(`[data-print="${k}"]`)?.addEventListener('click',()=>receiptWindowV4(r,true));document.querySelector(`[data-download="${k}"]`)?.addEventListener('click',()=>download10(r))},0);return `<button class="button secondary" data-open="${k}">فتح الروسي</button><button class="button secondary" data-print="${k}">طباعة</button><button class="button" data-download="${k}">تحميل PDF</button>`};
  receiptButtonsV4=function(r){const k='rb10'+Date.now()+Math.random().toString(36).slice(2);setTimeout(()=>{document.querySelector(`[data-print="${k}"]`)?.addEventListener('click',()=>receiptWindowV4(r,true));document.querySelector(`[data-download="${k}"]`)?.addEventListener('click',()=>download10(r))},0);return `<button class="button secondary" data-print="${k}">طباعة</button><button class="button" data-download="${k}">تحميل PDF</button>`};

  const style=document.createElement('style');style.textContent=`.brand .logo{background-repeat:no-repeat!important;background-position:center!important;background-size:contain!important;background-color:#fff!important;color:transparent!important}.brand .logo img{display:none!important}`;document.head.appendChild(style);
  setTimeout(applyBrandLogo10,0);
})();
