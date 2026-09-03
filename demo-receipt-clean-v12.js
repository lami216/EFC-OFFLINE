// Demo v12 — small receipt cleanup requested by user.
// gh-pages only. Removes the duplicate branch/payment row, keeps payment methods at bottom,
// and places the branch beside the payment date at the top.
(() => {
  const esc12 = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const norm12 = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g,' ').replace(/[ًٌٍَُِّْـ]/g,'');
  const logo12 = () => document.querySelector('link[rel="icon"]')?.href || '';

  function css12(){ return `
    *{box-sizing:border-box}
    body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#eef1f0;color:#111715}
    .paper12{width:1040px;max-width:96vw;margin:18px auto;background:#fff;border:2px solid #293631;padding:12px 18px 11px;direction:ltr}
    .head12{display:grid;grid-template-columns:240px 1fr 150px;gap:14px;align-items:center;border-bottom:1px solid #b2b8b5;padding-bottom:6px}
    .contact12{display:grid;grid-template-columns:92px 1fr;gap:8px;align-items:center;direction:ltr;text-align:left}
    .contact12 img,.logoOnly12 img{width:82px;height:62px;object-fit:contain;object-position:center;display:block}
    .contact12 b{display:block;font-size:13px;line-height:1.35;white-space:nowrap;direction:ltr;text-align:left}
    .contact12 small{font-size:9px;display:block;margin-top:2px}
    .center12{text-align:center;direction:rtl}.center12 h1{margin:0;font-size:27px;line-height:1}.center12 .tag12{font-size:11px;font-weight:700;margin-top:3px}
    .rn12{display:flex;direction:ltr;justify-content:center;align-items:center;gap:9px;margin-top:4px;font-size:17px}.rn12 b{font-size:21px}
    .logoOnly12{height:66px;display:grid;place-items:center}
    .meta12{display:flex;justify-content:space-between;align-items:center;gap:24px;direction:ltr;padding:6px 0 3px;font-size:11px}
    .meta12 .branch12{direction:rtl;text-align:right}.meta12 .branch12 b{font-size:13px;font-weight:900;color:#0b2e24}
    .meta12 .date12{direction:rtl;text-align:left}.meta12 .date12 b{font-weight:800}
    .recognition12{text-align:center;direction:rtl;font-size:11px;font-weight:800;margin:2px 0 4px}
    .row12{display:grid;grid-template-columns:145px minmax(0,1fr) 135px;gap:8px;align-items:center;height:31px;font-size:13px;direction:ltr}
    .fr12{text-align:left;direction:ltr;font-weight:700}.ar12{text-align:right;direction:rtl;font-weight:800}
    .track12{position:relative;height:26px;display:flex;align-items:center;justify-content:center;min-width:0}
    .track12:before{content:"";position:absolute;left:0;right:0;top:50%;border-top:2px dotted #7d8581;transform:translateY(-50%)}
    .track12 b{position:relative;z-index:1;background:#fff;padding:0 10px;font-size:15px;font-weight:800;direction:rtl;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis}
    .pair12{display:grid;grid-template-columns:1fr 1fr;gap:24px;direction:ltr}
    .half12{display:grid;grid-template-columns:92px minmax(0,1fr) 110px;gap:7px;align-items:center;height:31px;font-size:13px;direction:ltr}
    .half12 .fr12{font-weight:700}.half12 .ar12{font-weight:800}
    .regTrack12 b{border:2px solid #555;min-width:120px;text-align:center;padding:3px 20px;background:#fff}
    .desc12{border-top:1px dotted #c4c8c6;border-bottom:1px dotted #c4c8c6;margin-top:1px;padding:1px 0}
    .note12{text-align:center;direction:rtl;font-size:10px;font-weight:700;margin:5px 0 4px}
    .methods12{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;direction:rtl}
    .method12{display:flex;align-items:center;justify-content:center;gap:6px;font-size:10px}.check12{width:28px;height:23px;border:2px solid #555;display:grid;place-items:center;font-weight:900}.method12.on12 .check12{background:#159a55;border-color:#159a55;color:#fff}
    .mt12{width:100%;border-collapse:collapse;margin-top:7px;font-size:11px;direction:rtl}.mt12 th,.mt12 td{border:1px solid #ccd2d0;padding:5px;text-align:center}.mt12 th{background:#f2f4f3}.tot12{display:flex;direction:rtl;justify-content:space-between;margin-top:7px;font-size:12px}
    .actions12{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;direction:rtl;gap:8px}.actions12 button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.print12{background:#155ea8;color:#fff}.download12{background:#159a55;color:#fff}
    @media print{body{background:#fff}.paper12{width:100%;max-width:none;margin:0;border:1px solid #222}.actions12{display:none}@page{size:landscape;margin:8mm}}
  `; }

  const track12 = (v, cls='') => `<span class="track12 ${cls}"><b>${esc12(v)}</b></span>`;
  const row12 = (fr,val,ar,cls='') => `<div class="row12 ${cls}"><span class="fr12">${fr}</span>${track12(val)}<span class="ar12">${ar}</span></div>`;
  const half12 = (fr,val,ar,cls='') => `<div class="half12 ${cls}"><span class="fr12">${fr}</span>${track12(val, cls==='reg12'?'regTrack12':'')}<span class="ar12">${ar}</span></div>`;

  function head12(r){
    const src=logo12(); const img=`<img src="${src}" alt="EFC">`;
    return `<div class="head12"><div class="contact12">${img}<div><b>Tél: 48 02 84 84</b><b>☎ 32 09 86 89</b><small>الأستاذ محمد لمين</small></div></div><div class="center12"><h1>Centre EFC &nbsp; مركز</h1><div class="tag12">جميع الشهادات معترف بها من طرف الدولة</div><div class="rn12"><span>Reçu N°</span><b>${westernDigitsV3(r.receipt||'')}</b><span>وصل رقم</span></div></div><div class="logoOnly12">${img}</div></div>`;
  }

  function meta12(r){
    return `<div class="meta12"><div class="date12">تم الدفع في تاريخ: <b>${fmtDateV3(r.date)}</b></div><div class="branch12">الفرع: <b>${esc12(r.branch||'—')}</b></div></div>`;
  }

  function methods12(current){
    const list=[...new Set((methods||[]).map(String).map(s=>s.trim()).filter(Boolean))];
    if(current&&!list.some(x=>norm12(x)===norm12(current))) list.push(String(current));
    return list.map(name=>{const on=norm12(name)===norm12(current);return `<div class="method12 ${on?'on12':''}"><span class="check12">${on?'✓':''}</span><b>${esc12(name)}</b></div>`}).join('');
  }

  function html12(r){
    const h=head12(r);
    if(r.statement){
      const rows=(r.plan||[]).map(m=>{const st=m.state==='paid'?'مدفوع':m.state==='partial'?'دفع جزئي':m.state==='overdue'?'متأخر':m.state==='due'?'مستحق':'لم يحن';return `<tr><td>الشهر ${westernDigitsV3(m.number)}</td><td>${fmtDateV3(m.dueDate)}</td><td>${moneyV3(m.fee)}</td><td>${moneyV3(m.paid)}</td><td>${moneyV3(m.remaining)}</td><td>${st}</td></tr>`}).join('');
      return `${h}${meta12(r)}<div class="recognition12">جميع الشهادات معترف بها من طرف الدولة</div>${row12("Nom de l’étudiant",r.student,'اسم الطالب')}${row12('Filière',r.specialty,'تخصص')}<div class="pair12">${half12('N° Registre',westernDigitsV3(r.reg),'رقم السجل','reg12')}${half12('Montant',moneyV3(r.paid),'إجمالي المدفوع')}</div><table class="mt12"><thead><tr><th>الشهر</th><th>الاستحقاق</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table><div class="tot12"><b>إجمالي المدفوع: ${moneyV3(r.paid)}</b><b>المتبقي من الدورة: ${moneyV3(r.remaining)}</b></div><p class="note12">ملاحظة 1: لا يمكن استرجاع المبلغ المدفوع للمركز في أي حال من الأحوال.</p>`;
    }
    return `${h}${meta12(r)}<div class="recognition12">جميع الشهادات معترف بها من طرف الدولة</div>${row12("Nom de l’étudiant",r.student,'اسم الطالب')}${row12('Filière',r.specialty,'تخصص')}<div class="pair12">${half12('Reliquat',moneyV3(r.remaining),'المبلغ المتبقي')}${half12('Montant',moneyV3(r.amount),'المبلغ')}</div><div class="pair12">${half12('Mois',westernDigitsV3(r.month||'—'),'الشهر')}${half12('N° Registre',westernDigitsV3(r.reg),'رقم السجل','reg12')}</div><div class="desc12">${row12('Libellé',r.desc||'','البيان')}</div><p class="note12">ملاحظة 1: لا يمكن استرجاع المبلغ المدفوع للمركز في أي حال من الأحوال.</p><div class="methods12">${methods12(r.method)}</div>`;
  }

  function load12(src,key){return new Promise((res,rej)=>{if(window[key])return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)});}
  async function wait12(root){await Promise.all([...root.querySelectorAll('img')].map(img=>img.complete&&img.naturalWidth?Promise.resolve():new Promise(res=>{img.onload=res;img.onerror=res;setTimeout(res,1200)})));}
  async function download12(r){let stage;try{await load12('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js','html2canvas');await load12('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js','jspdf');stage=document.createElement('div');stage.style.cssText='position:fixed;left:-14000px;top:0;width:1040px;background:#fff;z-index:-9999';stage.innerHTML=`<style>${css12()}</style><div class="paper12">${html12(r)}</div>`;document.body.appendChild(stage);await wait12(stage);const canvas=await html2canvas(stage.querySelector('.paper12'),{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false});const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const pw=doc.internal.pageSize.getWidth(),ph=doc.internal.pageSize.getHeight(),ratio=Math.min(pw/canvas.width,ph/canvas.height),w=canvas.width*ratio,h=canvas.height*ratio;doc.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pw-w)/2,(ph-h)/2,w,h);doc.save(`وصل-${westernDigitsV3(r.receipt||r.reg||'EFC')}.pdf`)}catch(e){console.error('receipt v12',e);alert('تعذر تنزيل PDF. جرّب زر الطباعة.')}finally{stage?.remove();}}
  window.downloadReceiptPdfV12=download12;

  receiptWindowV4=function(r,autoPrint=false){const w=window.open('','_blank','width=1120,height=700');if(!w)return;const data=JSON.stringify(r).replace(/</g,'\\u003c');w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>وصل ${westernDigitsV3(r.receipt||'')}</title><style>${css12()}</style></head><body><div class="paper12">${html12(r)}</div><div class="actions12"><button class="print12" onclick="print()">طباعة</button><button class="download12" onclick="opener&&opener.downloadReceiptPdfV12(R12)">تحميل PDF</button></div><script>const R12=${data};${autoPrint?'setTimeout(()=>print(),250);':''}<\/script></body></html>`);w.document.close();};
  receiptActionsV4=function(r){const k='r12'+Date.now()+Math.random().toString(36).slice(2);setTimeout(()=>{document.querySelector(`[data-open="${k}"]`)?.addEventListener('click',()=>receiptWindowV4(r));document.querySelector(`[data-print="${k}"]`)?.addEventListener('click',()=>receiptWindowV4(r,true));document.querySelector(`[data-download="${k}"]`)?.addEventListener('click',()=>download12(r));},0);return `<button class="button secondary" data-open="${k}">فتح الروسي</button><button class="button secondary" data-print="${k}">طباعة</button><button class="button" data-download="${k}">تحميل PDF</button>`;};
  receiptButtonsV4=function(r){const k='rb12'+Date.now()+Math.random().toString(36).slice(2);setTimeout(()=>{document.querySelector(`[data-print="${k}"]`)?.addEventListener('click',()=>receiptWindowV4(r,true));document.querySelector(`[data-download="${k}"]`)?.addEventListener('click',()=>download12(r));},0);return `<button class="button secondary" data-print="${k}">طباعة</button><button class="button" data-download="${k}">تحميل PDF</button>`;};
})();
