// Demo-only refinement: Western digits, installment-aware monthly billing, precise charts, and newest-first ledger.
// This file lives only on gh-pages and does not modify the desktop application/main branch.

const V3_DUE_SOON_DAYS = 5;
const v3Number = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const moneyV3 = n => `${v3Number.format(Number(n || 0))} أوقية`;
const westernDigitsV3 = s => String(s ?? '')
  .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const deviceTodayV3 = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const deviceTimeV3 = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};
const fmtDateV3 = d => d ? new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${d}T12:00:00`)) : '—';
const daysDiffV3 = (a,b) => Math.round((dateOnly(b)-dateOnly(a))/86400000);
const monthStartV3 = d => `${d.slice(0,7)}-01`;

// Make every number rendered by older demo fragments use Western/French digits as well.
const convertDigitsInNodeV3 = root => {
  if (!root) return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n=>{
    const next=westernDigitsV3(n.nodeValue);
    if(next!==n.nodeValue) n.nodeValue=next;
  });
};
const digitObserverV3=new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(n=>{
  if(n.nodeType===Node.TEXT_NODE){n.nodeValue=westernDigitsV3(n.nodeValue)}
  else convertDigitsInNodeV3(n);
})));
digitObserverV3.observe(document.documentElement,{childList:true,subtree:true});
convertDigitsInNodeV3(document.documentElement);

function courseStatus(s){
  const today=deviceTodayV3();
  const diff=daysDiffV3(today,s.end);
  if(diff<0)return 'انتهت';
  if(diff<=7)return 'ستنتهي قريباً';
  return 'نشطة';
}

function paidUntilV3(s,asOf){
  return (s.payments||[]).filter(p=>p[0]<=asOf).reduce((sum,p)=>sum+Number(p[1]||0),0);
}

function installmentPlanV3(s, asOf=deviceTodayV3(), paidOverride=null){
  const snap=s.snapshot||{};
  if(snap.billing!=='monthly') return [];
  const fee=Math.max(0,Number(snap.fee||0));
  const count=Math.max(0,Number(snap.durationValue||0));
  let available=paidOverride===null?Number(s.paid||0):Number(paidOverride||0);
  return Array.from({length:count},(_,idx)=>{
    const number=idx+1;
    const dueDate=addDuration(s.start,idx,'month');
    const paid=Math.max(0,Math.min(fee,available));
    available=Math.max(0,available-fee);
    const remaining=Math.max(0,fee-paid);
    const until=daysDiffV3(asOf,dueDate);
    let state='upcoming';
    if(remaining===0) state='paid';
    else if(paid>0) state='partial';
    else if(dueDate<asOf) state='overdue';
    else if(until>=0&&until<=V3_DUE_SOON_DAYS) state='due';
    return {number,dueDate,fee,paid,remaining,state};
  });
}

function monthlyFocusV3(s, asOf=deviceTodayV3(), paidOverride=null){
  const plan=installmentPlanV3(s,asOf,paidOverride);
  if(!plan.length) return null;
  const firstOpen=plan.find(x=>x.remaining>0);
  if(!firstOpen){
    const last=plan[plan.length-1];
    return {state:'complete',number:last.number,label:`الشهر ${last.number} مدفوع`,dueAmount:0,dueDate:last.dueDate,plan};
  }
  if(firstOpen.state==='partial') return {state:'partial',number:firstOpen.number,label:`الشهر ${firstOpen.number} دفع جزئي`,dueAmount:firstOpen.remaining,dueDate:firstOpen.dueDate,plan};
  if(firstOpen.state==='overdue') return {state:'overdue',number:firstOpen.number,label:`الشهر ${firstOpen.number} متأخر`,dueAmount:firstOpen.remaining,dueDate:firstOpen.dueDate,plan};
  if(firstOpen.state==='due') return {state:'due',number:firstOpen.number,label:`الشهر ${firstOpen.number} مستحق`,dueAmount:firstOpen.remaining,dueDate:firstOpen.dueDate,plan};
  const previous=plan[firstOpen.number-2];
  if(previous&&previous.state==='paid') return {state:'paid',number:previous.number,label:`الشهر ${previous.number} مدفوع`,dueAmount:0,dueDate:firstOpen.dueDate,nextNumber:firstOpen.number,plan};
  return {state:'upcoming',number:firstOpen.number,label:`الشهر ${firstOpen.number} لم يحن`,dueAmount:0,dueDate:firstOpen.dueDate,plan};
}

function currentMonthStatus(s){
  const focus=monthlyFocusV3(s);
  return focus?focus.label:'—';
}

function financialStatus(s){
  const snap=s.snapshot||{};
  if(snap.billing==='monthly'){
    const focus=monthlyFocusV3(s);
    if(!focus) return 'لم يدفع';
    if(focus.state==='complete'||focus.state==='paid') return 'مدفوع كامل';
    if(focus.state==='partial') return 'دفع جزئي';
    if(focus.state==='due') return 'مستحق الآن';
    if(focus.state==='overdue') return 'متأخر';
    return Number(s.paid||0)>0?'مدفوع كامل':'لم يدفع';
  }
  const rem=remainingOf(s);
  if(rem===0)return 'مدفوع كامل';
  if(Number(s.paid||0)===0)return 'لم يدفع';
  if(s.end<deviceTodayV3())return 'متأخر';
  return 'دفع جزئي';
}

function monthBadgeV3(s, asOf=deviceTodayV3(), paidOverride=null){
  const focus=monthlyFocusV3(s,asOf,paidOverride);
  if(!focus) return '';
  const cls=focus.state==='paid'||focus.state==='complete'?'good':focus.state==='overdue'?'bad':focus.state==='upcoming'?'neutral':'warn';
  return `<span class="badge ${cls} month-badge">${westernDigitsV3(focus.label)}</span>`;
}
function financialCellV3(s){
  return (s.snapshot||{}).billing==='monthly'?monthBadgeV3(s):badge(financialStatus(s));
}
function dueNowV3(s){
  if((s.snapshot||{}).billing==='monthly') return monthlyFocusV3(s)?.dueAmount||0;
  return remainingOf(s);
}
function suggestedPaymentV3(s){
  if((s.snapshot||{}).billing!=='monthly') return remainingOf(s);
  const focus=monthlyFocusV3(s);
  if(focus?.dueAmount) return focus.dueAmount;
  const firstOpen=focus?.plan?.find(x=>x.remaining>0);
  return firstOpen?.remaining||0;
}

function allPayments(){
  const list=[];
  students.forEach((s,si)=>(s.payments||[]).forEach((p,pi)=>{
    const hiddenTime=String(p[3]||'00:00');
    const explicitOrder=Number(p[4]||0);
    const fallbackOrder=(Number(hiddenTime.slice(0,2)||0)*60)+Number(hiddenTime.slice(3,5)||0)+(si/1000)+(pi/100000);
    list.push({student:s,date:p[0],amount:Number(p[1]),method:p[2],time:hiddenTime,order:explicitOrder||fallbackOrder,receipt:String(500+s.reg*7+pi).padStart(5,'0')});
  }));
  return list.sort((a,b)=>b.date.localeCompare(a.date)||(b.order-a.order));
}

function studentRow(s,actions=true){
  return `<tr class="student-row" data-id="${s.id}">
    <td>${String(s.reg).padStart(4,'0')}</td>
    <td><b>${s.name}</b><small>${s.phone||''}</small></td>
    <td>${branchName(s.branch)}</td><td>${spec(s.specialty)?.name||s.specialty}</td>
    <td>${fmtDateV3(s.start)}</td><td>${fmtDateV3(s.end)}</td>
    <td>${moneyV3(s.required)}</td><td>${moneyV3(s.paid)}</td><td>${moneyV3(remainingOf(s))}</td>
    <td>${financialCellV3(s)}</td>
    ${actions?`<td>${remainingOf(s)>0?`<button class="mini pay-now" data-id="${s.id}">تسجيل دفعة</button>`:'<span class="badge good">مكتمل</span>'}</td>`:''}
  </tr>`;
}

function openStudent(id){
  const s=students.find(x=>x.id===id); if(!s)return;
  const monthly=(s.snapshot||{}).billing==='monthly';
  const plan=monthly?installmentPlanV3(s):[];
  const planTable=monthly?`<h3 class="sub-title">أشهر الدورة</h3>${table(['الشهر','موعده','المبلغ','المدفوع','المتبقي','الحالة'],plan.map(x=>{
    const cls=x.state==='paid'?'good':x.state==='overdue'?'bad':x.state==='upcoming'?'neutral':'warn';
    const label=x.state==='paid'?'مدفوع':x.state==='partial'?'دفع جزئي':x.state==='overdue'?'متأخر':x.state==='due'?'مستحق':'لم يحن';
    return `<tr><td>الشهر ${x.number}</td><td>${fmtDateV3(x.dueDate)}</td><td>${moneyV3(x.fee)}</td><td>${moneyV3(x.paid)}</td><td>${moneyV3(x.remaining)}</td><td><span class="badge ${cls}">${label}</span></td></tr>`;
  }).join(''))}`:'';
  const wrap=document.createElement('div'); wrap.className='modal';
  wrap.innerHTML=`<div class="modal-card wide-modal"><div class="modal-head"><div><p>ملف الطالب</p><h2>${s.name}</h2><span>${branchName(s.branch)} · ${spec(s.specialty)?.name} · سجل ${String(s.reg).padStart(4,'0')}</span></div><button class="x">×</button></div>
  <div class="student-kpis"><div><small>البداية</small><b>${fmtDateV3(s.start)}</b></div><div><small>النهاية</small><b>${fmtDateV3(s.end)}</b></div><div><small>حالة الدورة</small>${badge(courseStatus(s))}</div><div><small>${monthly?'وضع الشهر':'الوضع المالي'}</small>${monthly?monthBadgeV3(s):badge(financialStatus(s))}</div><div><small>المدفوع</small><b>${moneyV3(s.paid)}</b></div><div><small>المتبقي من الدورة</small><b>${moneyV3(remainingOf(s))}</b></div></div>
  ${planTable}
  <h3 class="sub-title">سجل الدفعات</h3>${table(['التاريخ','الوسيلة','المبلغ'],(s.payments||[]).slice().reverse().map(p=>`<tr><td>${fmtDateV3(p[0])}</td><td>${p[2]}</td><td>${moneyV3(p[1])}</td></tr>`).join(''))}
  <div class="modal-actions"><button class="button secondary close">إغلاق</button>${remainingOf(s)>0?`<button class="button pay-from-detail">تسجيل دفعة جديدة</button>`:''}</div></div>`;
  document.body.appendChild(wrap); const close=()=>wrap.remove();
  wrap.querySelector('.x').onclick=close; wrap.querySelector('.close').onclick=close;
  wrap.querySelector('.pay-from-detail')?.addEventListener('click',()=>{close();openPayment(id)});
  convertDigitsInNodeV3(wrap);
}

function openPayment(id){
  const s=students.find(x=>x.id===id); if(!s)return;
  const rem=remainingOf(s); if(rem<=0)return;
  const monthly=(s.snapshot||{}).billing==='monthly';
  const focus=monthly?monthlyFocusV3(s):null;
  const suggested=Math.min(rem,Math.max(1,suggestedPaymentV3(s)||rem));
  const wrap=document.createElement('div'); wrap.className='modal';
  wrap.innerHTML=`<div class="modal-card narrow"><div class="modal-head"><div><p>تسجيل دفعة</p><h2>${s.name}</h2><span>${spec(s.specialty)?.name} · ${branchName(s.branch)} · سجل ${String(s.reg).padStart(4,'0')}</span></div><button class="x">×</button></div>
  <div class="payment-balance"><div><small>إجمالي الدورة</small><b>${moneyV3(s.required)}</b></div><div><small>المدفوع</small><b>${moneyV3(s.paid)}</b></div><div><small>المتبقي من الدورة</small><b>${moneyV3(rem)}</b></div></div>
  ${monthly?`<div class="month-payment-focus"><span>الوضع الحالي</span>${monthBadgeV3(s)}<small>${focus?.dueAmount?`المطلوب لهذا الشهر: ${moneyV3(focus.dueAmount)}`:`القسط المقترح التالي: ${moneyV3(suggested)}`}</small></div>`:''}
  <form id="paymentForm" class="grid two"><label>المبلغ<input class="input" name="amount" type="number" min="1" max="${rem}" value="${suggested}" required></label><label>وسيلة الدفع<select name="method">${methods.map(x=>`<option>${x}</option>`).join('')}</select></label><label class="wide">تاريخ العملية<input class="input" name="date" type="date" value="${deviceTodayV3()}" required></label><label class="wide">البيان<input class="input" name="description" value="دفعة طالب"></label><div class="wide modal-actions"><button type="button" class="button secondary cancel">إلغاء</button><button class="button" type="submit">حفظ الدفعة</button></div></form></div>`;
  document.body.appendChild(wrap); const close=()=>wrap.remove();
  wrap.querySelector('.x').onclick=close; wrap.querySelector('.cancel').onclick=close;
  wrap.querySelector('#paymentForm').onsubmit=e=>{
    e.preventDefault(); const fd=new FormData(e.target), amount=Number(fd.get('amount'));
    if(amount<=0||amount>remainingOf(s)){alert('المبلغ غير صالح.');return}
    s.payments.push([String(fd.get('date')),amount,String(fd.get('method')),deviceTimeV3(),Date.now()]);
    s.paid+=amount; saveStudents(); close();
    alert(`تم تسجيل دفعة ${moneyV3(amount)}\nالمتبقي من الدورة: ${moneyV3(remainingOf(s))}`); renderCurrent();
  };
  convertDigitsInNodeV3(wrap);
}

renderRegister=function(){
  const first=specialties[0];
  shell(`${pageTitle('الواجهة الرئيسية','تسجيل طالب جديد','يسجل الطالب وتحسب مدة الدورة وإجماليها تلقائيًا، بينما الاستحقاق الشهري يحسب شهرًا بشهر.')}
  <div class="registration"><form id="regForm" class="card form-card"><div class="section-head"><h2>بيانات الطالب والتسجيل</h2><span>الحقول الأساسية</span></div><div class="grid two">
    <label>اسم الطالب<input class="input" name="name" required placeholder="اسم الطالب الكامل"></label><label>رقم الهاتف<input class="input" name="phone"></label>
    <label>الفرع<select name="branch" required>${opts(branches)}</select></label><label>التخصص<select name="specialty" id="regSpec" required>${opts(specialties)}</select></label>
    <label>تاريخ بداية الدورة<input class="input" name="start" id="regStart" type="date" value="${deviceTodayV3()}" required></label><label>المبلغ المدفوع الآن<input class="input" name="paid" id="regPaid" type="number" min="0" value="0"></label>
    <label>وسيلة الدفع<select name="method">${methods.map(x=>`<option>${x}</option>`).join('')}</select></label><label>تاريخ الدفعة<input class="input" name="paymentDate" type="date" value="${deviceTodayV3()}"></label>
  </div><div class="summary-inline" id="regSummary"></div><button class="button" type="submit">حفظ التسجيل</button></form>
  <div class="card side-summary"><h3>ملخص التسجيل</h3><div id="regSummarySide"></div><small>في التخصص الشهري لا يصبح كامل المتبقي مستحقًا فورًا؛ كل شهر له استحقاقه المستقل حسب تاريخ بداية الطالب.</small></div></div>`);
  const form=document.getElementById('regForm'),spEl=document.getElementById('regSpec'),startEl=document.getElementById('regStart'),paidEl=document.getElementById('regPaid');
  function update(){
    const sp=spec(spEl.value)||first, req=requiredFor(sp), paid=Math.max(0,Number(paidEl.value||0)), end=addDuration(startEl.value||deviceTodayV3(),sp.durationValue,sp.durationUnit);
    const firstDue=sp.billing==='monthly'?Math.max(0,sp.fee-paid):Math.max(0,req-paid);
    const html=`<div><span>مدة الدورة</span><b>${sp.durationValue} ${unitLabel(sp.durationUnit)}</b></div><div><span>نظام الدفع</span><b>${billingLabel(sp.billing)}</b></div><div><span>${sp.billing==='monthly'?'القسط الشهري':'سعر الدورة'}</span><b>${moneyV3(sp.fee)}</b></div><div><span>إجمالي الدورة</span><b>${moneyV3(req)}</b></div><div><span>تاريخ الانتهاء</span><b>${fmtDateV3(end)}</b></div><div><span>${sp.billing==='monthly'?'المتبقي من الشهر 1':'المتبقي'}</span><b>${moneyV3(firstDue)}</b></div>`;
    document.getElementById('regSummary').innerHTML=html;
    document.getElementById('regSummarySide').innerHTML=`<div class="big-money">${moneyV3(req)}</div><p>إجمالي الدورة</p><hr><div class="sum-line"><span>المدفوع الآن</span><b>${moneyV3(paid)}</b></div><div class="sum-line"><span>${sp.billing==='monthly'?'استحقاق الشهر الأول':'المتبقي'}</span><b>${moneyV3(firstDue)}</b></div>`;
    convertDigitsInNodeV3(document.getElementById('regSummary')); convertDigitsInNodeV3(document.getElementById('regSummarySide'));
  }
  spEl.onchange=update; startEl.onchange=update; paidEl.oninput=update; update();
  form.onsubmit=e=>{
    e.preventDefault(); const fd=new FormData(form),sp=spec(fd.get('specialty')),req=requiredFor(sp),paid=Math.max(0,Math.min(req,Number(fd.get('paid')||0)));
    const related=students.filter(x=>x.branch===fd.get('branch')&&x.specialty===sp.id); const reg=Math.max(0,...related.map(x=>x.reg))+1;
    const s={id:`demo-${Date.now()}`,name:String(fd.get('name')).trim(),phone:String(fd.get('phone')||''),branch:String(fd.get('branch')),specialty:sp.id,reg,start:String(fd.get('start')),end:addDuration(String(fd.get('start')),sp.durationValue,sp.durationUnit),required:req,paid,snapshot:{durationValue:sp.durationValue,durationUnit:sp.durationUnit,billing:sp.billing,fee:sp.fee},payments:paid>0?[[String(fd.get('paymentDate')||deviceTodayV3()),paid,String(fd.get('method')),deviceTimeV3(),Date.now()]]:[]};
    students.unshift(s);saveStudents();alert(`تم تسجيل ${s.name}\nرقم السجل: ${String(reg).padStart(4,'0')}\nالمتبقي من الدورة: ${moneyV3(remainingOf(s))}`);form.reset();startEl.value=deviceTodayV3();paidEl.value=0;update();
  };
  convertDigitsInNodeV3(document.querySelector('.content'));
};

renderPeriod=function(){
  const today=deviceTodayV3(), defaultFrom=monthStartV3(today);
  shell(`${pageTitle('بحث موحد','آلية البحث','ابحث بالطالب والفترة والفرع والتخصص والوضعية، ثم تنقّل بين التسجيلات والدفعات والمستحقات ونهايات الدورات.')}
    <div class="card period-search-card"><input class="input" id="periodSearch" placeholder="ابحث بالاسم أو الهاتف أو رقم السجل"><select id="periodBranch">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select><select id="periodSpec">${opts(specialties,x=>x.id,x=>x.name,'كل التخصصات')}</select><select id="periodState"><option value="">كل الحالات المالية</option><option value="outstanding">كل المستحقات</option><option value="متأخر">متأخر</option><option value="مستحق الآن">مستحق الآن</option><option value="دفع جزئي">دفع جزئي</option><option value="لم يدفع">لم يدفع</option><option value="مدفوع كامل">مدفوع كامل</option></select><div class="period-dates"><label>من<input class="input" id="periodFrom" type="date" value="${defaultFrom}"></label><label>إلى<input class="input" id="periodTo" type="date" value="${today}"></label></div></div>
    <div class="tabs"><button class="active" data-tab="registrations">المسجلون</button><button data-tab="payments">الدفعات</button><button data-tab="dues">المستحقات</button><button data-tab="ending">نهايات الدورات</button></div><div id="periodResult"></div>`);
  let tab='registrations';
  const controls=['periodFrom','periodTo','periodBranch','periodSpec','periodState']; controls.forEach(id=>document.getElementById(id).addEventListener('change',draw)); document.getElementById('periodSearch').addEventListener('input',draw);
  document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===b));draw()});
  function stateAsOf(s,to){
    if((s.snapshot||{}).billing!=='monthly') return financialStatus(s);
    const focus=monthlyFocusV3(s,to,paidUntilV3(s,to));
    if(!focus)return 'لم يدفع'; if(focus.state==='partial')return 'دفع جزئي'; if(focus.state==='due')return 'مستحق الآن'; if(focus.state==='overdue')return 'متأخر'; if(focus.state==='paid'||focus.state==='complete')return 'مدفوع كامل'; return paidUntilV3(s,to)>0?'مدفوع كامل':'لم يدفع';
  }
  function dueAsOf(s,to){
    if((s.snapshot||{}).billing!=='monthly') return remainingOf(s);
    return monthlyFocusV3(s,to,paidUntilV3(s,to))?.dueAmount||0;
  }
  function draw(){
    const q=document.getElementById('periodSearch').value.trim().toLowerCase(),from=document.getElementById('periodFrom').value,to=document.getElementById('periodTo').value,br=document.getElementById('periodBranch').value,sp=document.getElementById('periodSpec').value,st=document.getElementById('periodState').value;
    const identity=s=>!q||s.name.toLowerCase().includes(q)||String(s.phone||'').includes(q)||String(s.reg).padStart(4,'0').includes(q)||String(s.reg)===q;
    const statusMatch=s=>!st||(st==='outstanding'?dueAsOf(s,to)>0:stateAsOf(s,to)===st);
    const base=s=>identity(s)&&statusMatch(s)&&(!br||s.branch===br)&&(!sp||s.specialty===sp);
    const action=s=>remainingOf(s)>0?`<button class="mini pay-now period-pay" data-id="${s.id}">تسجيل دفعة</button>`:'<span class="badge good">مكتمل</span>';
    let html='',count=0;
    if(tab==='registrations'){
      const list=students.filter(s=>base(s)&&s.start>=from&&s.start<=to); count=list.length;
      html=table(['السجل','الطالب','الفرع','التخصص','تاريخ التسجيل','النهاية','الإجمالي','المدفوع','المتبقي من الدورة','الوضعية','الإجراء'],list.map(s=>`<tr class="student-row" data-id="${s.id}"><td>${String(s.reg).padStart(4,'0')}</td><td><b>${s.name}</b><small>${s.phone||''}</small></td><td>${branchName(s.branch)}</td><td>${spec(s.specialty)?.name}</td><td>${fmtDateV3(s.start)}</td><td>${fmtDateV3(s.end)}</td><td>${moneyV3(s.required)}</td><td>${moneyV3(s.paid)}</td><td>${moneyV3(remainingOf(s))}</td><td>${financialCellV3(s)}</td><td>${action(s)}</td></tr>`).join(''));
    }
    if(tab==='payments'){
      const list=allPayments().filter(p=>base(p.student)&&p.date>=from&&p.date<=to);count=list.length;
      html=table(['التاريخ','الطالب','الفرع','التخصص','الوسيلة','المبلغ','الإجراء'],list.map(p=>`<tr class="student-row" data-id="${p.student.id}"><td>${fmtDateV3(p.date)}</td><td><b>${p.student.name}</b><small>${p.student.phone||''}</small></td><td>${branchName(p.student.branch)}</td><td>${spec(p.student.specialty)?.name}</td><td>${p.method}</td><td>${moneyV3(p.amount)}</td><td>${action(p.student)}</td></tr>`).join(''));
    }
    if(tab==='dues'){
      const list=students.filter(s=>base(s)&&dueAsOf(s,to)>0&&s.start<=to);count=list.length;
      html=table(['السجل','الطالب','الفرع','التخصص','المتبقي من الدورة','المستحق الآن','وضع الشهر','الإجراء'],list.map(s=>{const paidAt=paidUntilV3(s,to);return `<tr class="student-row" data-id="${s.id}"><td>${String(s.reg).padStart(4,'0')}</td><td><b>${s.name}</b><small>${s.phone||''}</small></td><td>${branchName(s.branch)}</td><td>${spec(s.specialty)?.name}</td><td>${moneyV3(Math.max(0,s.required-paidAt))}</td><td><b>${moneyV3(dueAsOf(s,to))}</b></td><td>${(s.snapshot||{}).billing==='monthly'?monthBadgeV3(s,to,paidAt):badge(stateAsOf(s,to))}</td><td>${action(s)}</td></tr>`}).join(''));
    }
    if(tab==='ending'){
      const list=students.filter(s=>base(s)&&s.end>=from&&s.end<=to);count=list.length;
      html=table(['السجل','الطالب','الفرع','التخصص','النهاية','حالة الدورة','المتبقي من الدورة','وضع الشهر','الإجراء'],list.map(s=>`<tr class="student-row" data-id="${s.id}"><td>${String(s.reg).padStart(4,'0')}</td><td><b>${s.name}</b><small>${s.phone||''}</small></td><td>${branchName(s.branch)}</td><td>${spec(s.specialty)?.name}</td><td>${fmtDateV3(s.end)}</td><td>${badge(courseStatus(s))}</td><td>${moneyV3(remainingOf(s))}</td><td>${(s.snapshot||{}).billing==='monthly'?monthBadgeV3(s):'—'}</td><td>${action(s)}</td></tr>`).join(''));
    }
    document.getElementById('periodResult').innerHTML=`<div class="period-result-head"><b>${count} نتيجة</b><span>الفلاتر تطبق على التبويب الحالي</span></div>${html}`;bindStudentRows();convertDigitsInNodeV3(document.getElementById('periodResult'));
  }
  draw();
};

function niceStepV3(maxValue,target=5){
  if(maxValue<=0)return 1; const raw=maxValue/target, pow=Math.pow(10,Math.floor(Math.log10(raw))), n=raw/pow; const nice=n<=1?1:n<=2?2:n<=5?5:10; return nice*pow;
}
function chartSeriesV3(mode,anchor,payments){
  const d=dateOnly(anchor);
  if(mode==='daily') return Array.from({length:24},(_,h)=>{const label=String(h).padStart(2,'0');return {label,detail:`${fmtDateV3(anchor)} · ${label}:00`,value:payments.filter(p=>Number((p.time||'00:00').slice(0,2))===h).reduce((a,p)=>a+p.amount,0)}});
  if(mode==='weekly'){
    const bounds=periodBounds(mode,anchor),start=dateOnly(bounds.from);
    return Array.from({length:7},(_,i)=>{const x=new Date(start);x.setDate(start.getDate()+i);const key=iso(x);return {label:fmtDateV3(key).slice(0,5),detail:fmtDateV3(key),value:payments.filter(p=>p.date===key).reduce((a,p)=>a+p.amount,0)}});
  }
  if(mode==='monthly'){
    const days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    return Array.from({length:days},(_,i)=>{const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;return {label:String(i+1),detail:fmtDateV3(key),value:payments.filter(p=>p.date===key).reduce((a,p)=>a+p.amount,0)}});
  }
  return Array.from({length:12},(_,i)=>{const key=`${d.getFullYear()}-${String(i+1).padStart(2,'0')}`;return {label:String(i+1),detail:`${String(i+1).padStart(2,'0')}/${d.getFullYear()}`,value:payments.filter(p=>p.date.slice(0,7)===key).reduce((a,p)=>a+p.amount,0)}});
}
function lineChartV3(series){
  const W=1120,H=360,L=110,R=35,T=35,B=58,maxRaw=Math.max(0,...series.map(x=>x.value)),step=niceStepV3(maxRaw||1),max=Math.max(step,Math.ceil(maxRaw/step)*step),ticks=[];
  for(let v=0;v<=max;v+=step)ticks.push(v);
  const x=i=>L+(series.length===1?0:i*(W-L-R)/(series.length-1)); const y=v=>H-B-(v/max)*(H-T-B);
  const grid=ticks.map(v=>`<g><line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" class="gridline"/><text x="${L-16}" y="${y(v)+4}" text-anchor="end" class="axis yaxis">${v3Number.format(v)}</text></g>`).join('');
  const points=series.map((s,i)=>`${x(i)},${y(s.value)}`).join(' ');
  const labels=series.map((s,i)=>`<text x="${x(i)}" y="${H-22}" text-anchor="middle" class="axis xaxis">${westernDigitsV3(s.label)}</text>`).join('');
  const dots=series.map((s,i)=>`<circle cx="${x(i)}" cy="${y(s.value)}" r="5" class="dot chart-point" data-detail="${s.detail}" data-value="${s.value}"><title>${s.detail} — ${moneyV3(s.value)}</title></circle>`).join('');
  let peak=''; if(maxRaw>0){const idx=series.findIndex(s=>s.value===maxRaw),px=x(idx),py=y(maxRaw),labelY=py<65?py+30:py-15;peak=`<g class="peak-note"><line x1="${px}" y1="${py}" x2="${px}" y2="${labelY+(labelY<py?-4:4)}"/><text x="${px}" y="${labelY}" text-anchor="middle">${series[idx].detail} · ${v3Number.format(maxRaw)}</text></g>`;}
  return `<div class="chart-wrap precise-chart"><div class="chart-tooltip" hidden></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="المخطط المالي">${grid}<polyline points="${points}" class="line" fill="none"/>${dots}${peak}${labels}</svg></div>`;
}
function bindChartTooltipV3(){
  const wrap=document.querySelector('.precise-chart'),tip=wrap?.querySelector('.chart-tooltip'); if(!wrap||!tip)return;
  wrap.querySelectorAll('.chart-point').forEach(p=>{
    p.addEventListener('mouseenter',()=>{tip.hidden=false;tip.innerHTML=`<b>${p.dataset.detail}</b><span>${moneyV3(p.dataset.value)}</span>`});
    p.addEventListener('mousemove',e=>{const r=wrap.getBoundingClientRect();tip.style.left=`${e.clientX-r.left+12}px`;tip.style.top=`${e.clientY-r.top-52}px`});
    p.addEventListener('mouseleave',()=>tip.hidden=true);
  });
}

renderFinance=function(){
  const today=deviceTodayV3();
  shell(`${pageTitle('تحليل الإيرادات','المالية','كل نقطة تمثل فترة فعلية، ويمكن الوقوف عليها لمعرفة التاريخ والمبلغ بالضبط.')}<div class="card finance-controls"><div class="segmented" id="financeMode"><button data-mode="daily">يومي</button><button data-mode="weekly">أسبوعي</button><button data-mode="monthly" class="active">شهري</button><button data-mode="yearly">سنوي</button></div><label>التاريخ المرجعي<input class="input" id="financeDate" type="date" value="${today}"></label><label>الفرع<select id="financeBranch">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select></label><label>التخصص<select id="financeSpec">${opts(specialties,x=>x.id,x=>x.name,'كل التخصصات')}</select></label></div><div id="financeBody"></div>`);
  let mode='monthly'; document.querySelectorAll('#financeMode button').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('#financeMode button').forEach(x=>x.classList.toggle('active',x===b));draw()}); ['financeDate','financeBranch','financeSpec'].forEach(id=>document.getElementById(id).onchange=draw);
  function draw(){
    const anchor=document.getElementById('financeDate').value,br=document.getElementById('financeBranch').value,sp=document.getElementById('financeSpec').value,bounds=periodBounds(mode,anchor);
    const ps=allPayments().filter(p=>p.date>=bounds.from&&p.date<=bounds.to&&(!br||p.student.branch===br)&&(!sp||p.student.specialty===sp)); const series=chartSeriesV3(mode,anchor,ps),total=ps.reduce((a,p)=>a+p.amount,0),avg=ps.length?Math.round(total/ps.length):0;
    const relevant=students.filter(s=>(!br||s.branch===br)&&(!sp||s.specialty===sp)); const outstanding=relevant.reduce((a,s)=>a+dueNowV3(s),0);
    const byBranch=branches.map(b=>[b.name,ps.filter(p=>p.student.branch===b.id).reduce((a,p)=>a+p.amount,0)]).filter(x=>x[1]); const bySpec=specialties.map(s=>[s.name,ps.filter(p=>p.student.specialty===s.id).reduce((a,p)=>a+p.amount,0)]).filter(x=>x[1]); const byMethod=methods.map(m=>[m,ps.filter(p=>p.method===m).reduce((a,p)=>a+p.amount,0)]).filter(x=>x[1]);
    document.getElementById('financeBody').innerHTML=`<div class="kpis"><div class="card"><small>دخل الفترة</small><b>${moneyV3(total)}</b><span>${fmtDateV3(bounds.from)} — ${fmtDateV3(bounds.to)}</span></div><div class="card"><small>عدد الدفعات</small><b>${ps.length}</b><span>عملية مالية</span></div><div class="card"><small>متوسط الدفعة</small><b>${moneyV3(avg)}</b><span>للفترة المختارة</span></div><div class="card"><small>المستحق حاليًا</small><b>${moneyV3(outstanding)}</b><span>لا يشمل أشهرًا مستقبلية غير مستحقة</span></div></div><div class="card chart-card"><div class="chart-head"><div><h2>${mode==='daily'?'الدخل حسب الساعة':mode==='yearly'?'الدخل حسب الشهر':'الدخل حسب اليوم'}</h2><span>${br?branchName(br):'كل الفروع'} · ${sp?spec(sp)?.name:'كل التخصصات'}</span></div><b>${moneyV3(total)}</b></div>${lineChartV3(series)}</div><div class="grid three breakdowns"><div class="card"><h3>حسب الفرع</h3>${breakdown(byBranch,total)}</div><div class="card"><h3>حسب التخصص</h3>${breakdown(bySpec,total)}</div><div class="card"><h3>حسب وسيلة الدفع</h3>${breakdown(byMethod,total)}</div></div>`;
    bindChartTooltipV3();convertDigitsInNodeV3(document.getElementById('financeBody'));
  }
  draw();
};

renderLedger=function(){
  const today=deviceTodayV3();
  shell(`${pageTitle('الحركة اليومية','اليومية','اختر التاريخ الذي تريد عرضه؛ أحدث عملية مسجلة تظهر في الأعلى.')}<div class="card ledger-controls"><label>اليوم<input class="input" id="ledgerDate" type="date" value="${today}"></label><label>الفرع<select id="ledgerBranch">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select></label><label>التخصص<select id="ledgerSpec">${opts(specialties,x=>x.id,x=>x.name,'كل التخصصات')}</select></label><label>وسيلة الدفع<select id="ledgerMethod"><option value="">كل وسائل الدفع</option>${methods.map(x=>`<option>${x}</option>`).join('')}</select></label></div><div id="ledgerBody"></div>`);
  ['ledgerDate','ledgerBranch','ledgerSpec','ledgerMethod'].forEach(id=>document.getElementById(id).onchange=draw);
  function draw(){
    const date=document.getElementById('ledgerDate').value,br=document.getElementById('ledgerBranch').value,sp=document.getElementById('ledgerSpec').value,m=document.getElementById('ledgerMethod').value;
    const ps=allPayments().filter(p=>p.date===date&&(!br||p.student.branch===br)&&(!sp||p.student.specialty===sp)&&(!m||p.method===m)); const total=ps.reduce((a,p)=>a+p.amount,0);
    document.getElementById('ledgerBody').innerHTML=`<div class="ledger-summary"><div><small>التاريخ</small><b>${fmtDateV3(date)}</b></div><div><small>عدد العمليات</small><b>${ps.length}</b></div><div><small>إجمالي دخل اليوم</small><b>${moneyV3(total)}</b></div></div>${table(['رقم الوصل','الطالب','الفرع','التخصص','البيان','وسيلة الدفع','المبلغ'],ps.map(p=>`<tr><td>${p.receipt}</td><td>${p.student.name}</td><td>${branchName(p.student.branch)}</td><td>${spec(p.student.specialty)?.name}</td><td>دفعة طالب</td><td>${p.method}</td><td><b>${moneyV3(p.amount)}</b></td></tr>`).join(''))}<div class="day-breakdown">${methods.map(x=>`<div><span>${x}</span><b>${moneyV3(ps.filter(p=>p.method===x).reduce((a,p)=>a+p.amount,0))}</b></div>`).join('')}</div>`;
    convertDigitsInNodeV3(document.getElementById('ledgerBody'));
  }
  draw();
};

const v3Style=document.createElement('style');
v3Style.textContent=`
.month-badge{white-space:nowrap}.month-payment-focus{margin:14px 0;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--surface2);display:flex;align-items:center;gap:10px;flex-wrap:wrap}.month-payment-focus>span:first-child{font-size:9px;color:var(--muted)}.month-payment-focus small{width:100%;font-size:8px;color:var(--muted)}
.precise-chart{position:relative;overflow:visible}.precise-chart svg{overflow:visible;width:100%;min-height:330px}.precise-chart .axis{font-size:10px;fill:var(--muted);direction:ltr;unicode-bidi:plaintext}.precise-chart .yaxis{font-size:11px}.precise-chart .xaxis{font-size:8px}.precise-chart .gridline{stroke:var(--border);stroke-width:1}.precise-chart .line{stroke:var(--primary);stroke-width:3;stroke-linejoin:round;stroke-linecap:round}.precise-chart .dot{fill:var(--surface);stroke:var(--primary);stroke-width:3;cursor:crosshair}.precise-chart .dot:hover{r:7;fill:var(--primary)}.chart-tooltip{position:absolute;z-index:8;pointer-events:none;background:#153d34;color:#fff;border-radius:8px;padding:8px 10px;box-shadow:0 8px 25px #0002;display:flex;flex-direction:column;gap:3px;font-size:9px;white-space:nowrap}.chart-tooltip b{font-size:9px}.chart-tooltip span{font-size:11px;font-weight:700}.peak-note line{stroke:var(--primary);stroke-dasharray:3 3}.peak-note text{font-size:9px;fill:var(--primary);font-weight:700;direction:ltr;unicode-bidi:plaintext}
`;
document.head.appendChild(v3Style);

// Repaint current view with the refined demo logic after all previous demo patches load.
setTimeout(()=>{try{renderCurrentMerged()}catch{renderCurrent()}convertDigitsInNodeV3(document.documentElement)},0);
