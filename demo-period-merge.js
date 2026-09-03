// Demo-only patch: merge the separate payment collection screen into آلية البحث.
// This file is intentionally isolated on gh-pages and does not affect the desktop app/main.

navItems.splice(0, navItems.length,
  ['register','＋','تسجيل طالب'],
  ['specialties','▦','التخصصات'],
  ['period','◷','آلية البحث'],
  ['students','⌕','البحث عن طالب'],
  ['status','◎','البحث بالوضعية'],
  ['finance','⌁','المالية'],
  ['ledger','≡','اليومية']
);

const periodPatchStyle=document.createElement('style');
periodPatchStyle.textContent=`
.period-search-card{display:grid;grid-template-columns:2fr repeat(3,minmax(145px,1fr));gap:12px;margin-bottom:14px}
.period-search-card .period-dates{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:12px;padding-top:2px}
.period-search-card label{margin:0}
.period-help{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:9px;margin:-2px 0 16px}
.period-help b{color:var(--primary)}
.period-result-head{display:flex;align-items:center;justify-content:space-between;margin:0 0 10px;font-size:9px;color:var(--muted)}
.period-result-head b{font-size:11px;color:var(--text)}
.period-pay{white-space:nowrap}
@media(max-width:1250px){.period-search-card{grid-template-columns:repeat(2,minmax(0,1fr))}.period-search-card .period-dates{grid-column:1/-1}}
`;
document.head.appendChild(periodPatchStyle);

renderPeriod=function(){
  const defaultFrom='2026-08-01';
  shell(`${pageTitle('بحث موحد','آلية البحث','ابحث بالطالب والفترة والفرع والتخصص والوضعية، ثم تنقّل بين التسجيلات والدفعات والمستحقات ونهايات الدورات.')}
    <div class="card period-search-card">
      <input class="input" id="periodSearch" placeholder="ابحث بالاسم أو الهاتف أو رقم السجل">
      <select id="periodBranch">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select>
      <select id="periodSpec">${opts(specialties,x=>x.id,x=>x.name,'كل التخصصات')}</select>
      <select id="periodState">
        <option value="">كل الحالات المالية</option>
        <option value="outstanding">كل المستحقات</option>
        <option value="متأخر">متأخر</option>
        <option value="مستحق الآن">مستحق الآن</option>
        <option value="دفع جزئي">دفع جزئي</option>
        <option value="لم يدفع">لم يدفع</option>
        <option value="مدفوع كامل">مدفوع كامل</option>
      </select>
      <div class="period-dates">
        <label>من<input class="input" id="periodFrom" type="date" value="${defaultFrom}"></label>
        <label>إلى<input class="input" id="periodTo" type="date" value="${DEMO_TODAY}"></label>
      </div>
    </div>
    <div class="period-help"><b>ملاحظة:</b><span>زر «تسجيل دفعة» يظهر مباشرة بجانب أي طالب لديه مبلغ متبقٍ.</span></div>
    <div class="tabs">
      <button class="active" data-tab="registrations">المسجلون</button>
      <button data-tab="payments">الدفعات</button>
      <button data-tab="dues">المستحقات</button>
      <button data-tab="ending">نهايات الدورات</button>
    </div>
    <div id="periodResult"></div>`);

  let tab='registrations';
  const controls=['periodFrom','periodTo','periodBranch','periodSpec','periodState'];
  document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{
    tab=b.dataset.tab;
    document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===b));
    draw();
  });
  controls.forEach(id=>document.getElementById(id).addEventListener('change',draw));
  document.getElementById('periodSearch').addEventListener('input',draw);

  function draw(){
    const q=document.getElementById('periodSearch').value.trim().toLowerCase();
    const from=document.getElementById('periodFrom').value;
    const to=document.getElementById('periodTo').value;
    const br=document.getElementById('periodBranch').value;
    const sp=document.getElementById('periodSpec').value;
    const st=document.getElementById('periodState').value;

    const identity=s=>!q || s.name.toLowerCase().includes(q) || String(s.phone||'').includes(q) || String(s.reg).padStart(4,'0').includes(q) || String(s.reg)===q;
    const statusMatch=s=>!st || (st==='outstanding' ? remainingOf(s)>0 : financialStatus(s)===st);
    const base=s=>identity(s)&&statusMatch(s)&&(!br||s.branch===br)&&(!sp||s.specialty===sp);
    const action=s=>remainingOf(s)>0?`<button class="mini pay-now period-pay" data-id="${s.id}">تسجيل دفعة</button>`:'<span class="badge good">مكتمل</span>';

    let html='';
    let count=0;

    if(tab==='registrations'){
      const list=students.filter(s=>base(s)&&s.start>=from&&s.start<=to);
      count=list.length;
      html=table(['السجل','الطالب','الفرع','التخصص','تاريخ التسجيل','النهاية','الإجمالي','المدفوع','المتبقي','الوضعية','الإجراء'],
        list.map(s=>`<tr class="student-row" data-id="${s.id}"><td>${String(s.reg).padStart(4,'0')}</td><td><b>${s.name}</b><small>${s.phone||''}</small></td><td>${branchName(s.branch)}</td><td>${spec(s.specialty)?.name||s.specialty}</td><td>${fmtDate(s.start)}</td><td>${fmtDate(s.end)}</td><td>${money(s.required)}</td><td>${money(s.paid)}</td><td>${money(remainingOf(s))}</td><td>${badge(financialStatus(s))}</td><td>${action(s)}</td></tr>`).join(''));
    }

    if(tab==='payments'){
      const list=allPayments().filter(p=>base(p.student)&&p.date>=from&&p.date<=to);
      count=list.length;
      html=table(['التاريخ','الوقت','الطالب','الفرع','التخصص','الوسيلة','المبلغ','الإجراء'],
        list.map(p=>`<tr class="student-row" data-id="${p.student.id}"><td>${fmtDate(p.date)}</td><td>${p.time}</td><td><b>${p.student.name}</b><small>${p.student.phone||''}</small></td><td>${branchName(p.student.branch)}</td><td>${spec(p.student.specialty)?.name||p.student.specialty}</td><td>${p.method}</td><td>${money(p.amount)}</td><td>${action(p.student)}</td></tr>`).join(''));
    }

    if(tab==='dues'){
      const list=students.filter(s=>base(s)&&remainingOf(s)>0&&s.start<=to&&s.end>=from);
      count=list.length;
      html=table(['السجل','الطالب','الفرع','التخصص','البداية','النهاية','الإجمالي','المدفوع','المتبقي','الوضعية','الإجراء'],
        list.map(s=>`<tr class="student-row" data-id="${s.id}"><td>${String(s.reg).padStart(4,'0')}</td><td><b>${s.name}</b><small>${s.phone||''}</small></td><td>${branchName(s.branch)}</td><td>${spec(s.specialty)?.name||s.specialty}</td><td>${fmtDate(s.start)}</td><td>${fmtDate(s.end)}</td><td>${money(s.required)}</td><td>${money(s.paid)}</td><td>${money(remainingOf(s))}</td><td>${badge(financialStatus(s))}</td><td>${action(s)}</td></tr>`).join(''));
    }

    if(tab==='ending'){
      const list=students.filter(s=>base(s)&&s.end>=from&&s.end<=to);
      count=list.length;
      html=table(['السجل','الطالب','الفرع','التخصص','النهاية','حالة الدورة','المتبقي','الإجراء'],
        list.map(s=>`<tr class="student-row" data-id="${s.id}"><td>${String(s.reg).padStart(4,'0')}</td><td><b>${s.name}</b><small>${s.phone||''}</small></td><td>${branchName(s.branch)}</td><td>${spec(s.specialty)?.name||s.specialty}</td><td>${fmtDate(s.end)}</td><td>${badge(courseStatus(s))}</td><td>${money(remainingOf(s))}</td><td>${action(s)}</td></tr>`).join(''));
    }

    document.getElementById('periodResult').innerHTML=`<div class="period-result-head"><b>${count} نتيجة</b><span>الفلاتر تطبق على التبويب الحالي</span></div>${html}`;
    bindStudentRows();
  }

  draw();
};

// Old bookmarked #payments URLs now land on the unified search screen.
const renderCurrentMerged=function(){
  currentPage=location.hash.replace('#','')||'register';
  if(currentPage==='payments'){
    history.replaceState(null,'','#period');
    currentPage='period';
  }
  ({register:renderRegister,specialties:renderSpecialties,period:renderPeriod,students:renderStudents,status:renderStatus,finance:renderFinance,ledger:renderLedger}[currentPage]||renderRegister)();
};

window.addEventListener('hashchange',()=>setTimeout(renderCurrentMerged,0));
renderCurrentMerged();
