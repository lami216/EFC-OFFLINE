// Demo v5 — EFC visual identity, receipt redesign, and strict hover-only chart details.
// gh-pages only; desktop/main is untouched.

const EFC_SYMBOL_V5 = "data:image/jpeg;base64,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";

const EFC_NAME_V5 = 'Centre EFC مركز';
const EFC_AR_NAME_V5 = 'مركز EFC للغات والمعلوماتية';
const EFC_PHONE_1_V5 = '48 02 84 84';
const EFC_PHONE_2_V5 = '32 09 86 89';
const EFC_BLUE_V5 = '#135FA7';
const EFC_GREEN_V5 = '#179B55';
const EFC_YELLOW_V5 = '#F3B51B';

function applyBrandV5(){
  document.title='مركز EFC للغات والمعلوماتية';
  let fav=document.querySelector('link[rel="icon"]');
  if(!fav){fav=document.createElement('link');fav.rel='icon';document.head.appendChild(fav)}
  fav.href=EFC_SYMBOL_V5;
  document.querySelectorAll('.brand .logo').forEach(box=>{
    if(box.dataset.v5)return; box.dataset.v5='1';
    box.innerHTML=`<img src="${EFC_SYMBOL_V5}" alt="EFC">`;
  });
}
const brandObserverV5=new MutationObserver(()=>applyBrandV5());
brandObserverV5.observe(document.documentElement,{subtree:true,childList:true});

// Keep chart labels sparse, but only activate the tooltip when the pointer is actually near a point.
lineChartV3=function(series){
  const W=1120,H=360,L=125,R=35,T=35,B=58,maxRaw=Math.max(0,...series.map(x=>x.value)),step=niceStepV3(maxRaw||1),max=Math.max(step,Math.ceil(maxRaw/step)*step),ticks=[];
  for(let v=0;v<=max;v+=step)ticks.push(v);
  const x=i=>L+(series.length===1?0:i*(W-L-R)/(series.length-1));
  const y=v=>H-B-(v/max)*(H-T-B);
  const grid=ticks.map(v=>`<g><line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" class="gridline"/><text x="${L-20}" y="${y(v)+4}" text-anchor="end" class="axis yaxis">${v3Number.format(v)}</text></g>`).join('');
  const points=series.map((s,i)=>`${x(i)},${y(s.value)}`).join(' ');
  const labels=series.map((s,i)=>xLabelVisibleV4(i,series.length)?`<text x="${x(i)}" y="${H-22}" text-anchor="middle" class="axis xaxis">${westernDigitsV3(s.label)}</text>`:'').join('');
  const hit=series.map((s,i)=>`<circle cx="${x(i)}" cy="${y(s.value)}" r="19" fill="transparent" class="chart-hit-v5" data-detail="${s.detail}" data-value="${s.value}"></circle>`).join('');
  const dots=series.map((s,i)=>`<circle cx="${x(i)}" cy="${y(s.value)}" r="5" class="dot chart-point" data-detail="${s.detail}" data-value="${s.value}"></circle>`).join('');
  return `<div class="chart-wrap precise-chart"><div class="chart-tooltip" hidden></div><svg viewBox="0 0 ${W} ${H}" role="img">${grid}<polyline points="${points}" class="line" fill="none"/>${hit}${dots}${labels}</svg></div>`;
};
bindChartTooltipV3=function(){
  const wrap=document.querySelector('.precise-chart'),tip=wrap?.querySelector('.chart-tooltip'); if(!wrap||!tip)return;
  const hide=()=>{tip.hidden=true;tip.style.opacity='0';};
  const show=(el,e)=>{
    tip.hidden=false;tip.style.opacity='1';
    tip.innerHTML=`<b>${el.dataset.detail}</b><span>${moneyV3(el.dataset.value)}</span>`;
    const r=wrap.getBoundingClientRect();
    tip.style.left=`${Math.min(r.width-170,Math.max(8,e.clientX-r.left+12))}px`;
    tip.style.top=`${Math.max(8,e.clientY-r.top-58)}px`;
  };
  wrap.querySelectorAll('.chart-hit-v5,.chart-point').forEach(el=>{
    el.addEventListener('pointerenter',e=>show(el,e));
    el.addEventListener('pointermove',e=>show(el,e));
    el.addEventListener('pointerleave',hide);
  });
  wrap.addEventListener('pointerleave',hide);
  wrap.addEventListener('mouseleave',hide);
  window.addEventListener('blur',hide,{once:true});
};

receiptButtonsV4=function(model){
  const key=`r5-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  setTimeout(()=>{
    document.querySelector(`[data-download="${key}"]`)?.addEventListener('click',()=>downloadReceiptPdfV4(model));
    document.querySelector(`[data-print="${key}"]`)?.addEventListener('click',()=>printReceiptV4(model));
  },0);
  return `<button class="button secondary" data-print="${key}">طباعة</button><button class="button" data-download="${key}">تنزيل PDF</button>`;
};

async function drawReceiptCanvasV4(model){
  const statement=model.type==='statement';
  const W=1240,H=statement?1040:760;
  const canvas=document.createElement('canvas'); canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#222';ctx.lineWidth=2;ctx.strokeRect(24,24,W-48,H-48);
  let logo=null;try{logo=await loadImageV4(EFC_SYMBOL_V5)}catch{}
  if(logo){ctx.drawImage(logo,70,52,120,120);ctx.drawImage(logo,W-190,52,120,120)}
  canvasTextV4(ctx,EFC_NAME_V5,W/2,73,38,'bold','center','#111');
  canvasTextV4(ctx,'جميع الشهادات معترف بها من طرف الدولة',W/2,112,18,'bold','center','#303936');
  canvasTextV4(ctx,`Tél: ${EFC_PHONE_1_V5}`,220,72,20,'bold','left','#17344c');
  canvasTextV4(ctx,`WhatsApp: ${EFC_PHONE_2_V5}`,220,105,18,'bold','left','#17344c');
  canvasTextV4(ctx,`وصل رقم / Reçu N°  ${model.receipt}`,W/2,158,25,'bold','center','#111');
  ctx.beginPath();ctx.moveTo(58,192);ctx.lineTo(W-58,192);ctx.strokeStyle='#9ea8a4';ctx.stroke();

  const lineField=(ar,fr,value,y)=>{
    canvasTextV4(ctx,`${ar}`,W-78,y,20,'bold');
    canvasTextV4(ctx,fr,78,y,20,'bold','left','#333');
    ctx.beginPath();ctx.moveTo(235,y+12);ctx.lineTo(W-235,y+12);ctx.strokeStyle='#878f8c';ctx.setLineDash([4,5]);ctx.stroke();ctx.setLineDash([]);
    canvasTextV4(ctx,value,W/2,y-3,22,'bold','center','#121918');
  };
  lineField('اسم الطالب','Nom de l’étudiant',model.student,245);
  lineField('التخصص','Filière',model.specialty,302);

  canvasTextV4(ctx,'المبلغ',W-78,362,20,'bold');
  canvasTextV4(ctx,'Montant',78,362,20,'bold','left');
  canvasTextV4(ctx,moneyV3(model.amount),W-250,362,23,'bold');
  canvasTextV4(ctx,'المبلغ المتبقي',W/2-25,362,20,'bold');
  canvasTextV4(ctx,'Reliquat',78,408,20,'bold','left');
  canvasTextV4(ctx,moneyV3(model.remaining),W/2-250,408,22,'bold');
  canvasTextV4(ctx,'رقم سجل',W-78,418,20,'bold');
  ctx.strokeRect(W-300,394,150,50);canvasTextV4(ctx,model.register,W-225,420,22,'bold','center');
  canvasTextV4(ctx,'الشهر',W/2+120,466,20,'bold');
  canvasTextV4(ctx,'Mois',78,466,20,'bold','left');
  canvasTextV4(ctx,model.month||'—',W/2,466,22,'bold','center');

  ctx.fillStyle='#f6f8f7';ctx.fillRect(60,506,W-120,76);
  canvasTextV4(ctx,'البيان',W-80,530,18,'bold');
  canvasTextV4(ctx,model.description||'',W/2,558,20,'bold','center','#172622');

  if(statement){
    const cols=[W-80,W-275,W-465,W-655,W-845,W-1035];
    ['الشهر','الاستحقاق','المبلغ','المدفوع','المتبقي','الحالة'].forEach((h,i)=>canvasTextV4(ctx,h,cols[i],625,17,'bold'));
    ctx.beginPath();ctx.moveTo(60,650);ctx.lineTo(W-60,650);ctx.strokeStyle='#a7afac';ctx.stroke();
    let yy=688;
    (model.plan||[]).forEach(m=>{
      const state=m.state==='paid'?'مدفوع':m.state==='partial'?'دفع جزئي':m.state==='overdue'?'متأخر':m.state==='due'?'مستحق':'لم يحن';
      [`الشهر ${m.number}`,fmtDateV3(m.dueDate),moneyV3(m.fee),moneyV3(m.paid),moneyV3(m.remaining),state].forEach((v,i)=>canvasTextV4(ctx,v,cols[i],yy,16,i===0?'bold':'normal'));
      yy+=52;
    });
  }else{
    const methodsV5=['نقداً','Masrvi','Bankily','السداد'];
    const boxY=625,boxW=245,gap=18,start=72;
    methodsV5.forEach((m,i)=>{
      const x=start+i*(boxW+gap),selected=String(model.method||'').toLowerCase().includes(m.toLowerCase().replace('اً',''))||model.method===m;
      ctx.strokeStyle=selected?EFC_GREEN_V5:'#666';ctx.lineWidth=selected?4:2;ctx.strokeRect(x,boxY,38,38);
      if(selected){ctx.fillStyle=EFC_GREEN_V5;ctx.fillRect(x+7,boxY+7,24,24);canvasTextV4(ctx,'✓',x+19,boxY+20,20,'bold','center','#fff')}
      canvasTextV4(ctx,m,x+50,boxY+20,17,'bold','left','#222');
    });
  }
  canvasTextV4(ctx,'ملاحظة: لا يمكن استرجاع المبلغ المدفوع للمركز في أي حال من الأحوال',W/2,H-60,16,'bold','center','#4b5552');
  canvasTextV4(ctx,`${EFC_AR_NAME_V5} · ${EFC_PHONE_1_V5} · ${EFC_PHONE_2_V5}`,W/2,H-30,13,'normal','center','#6a7471');
  return canvas;
}

const v5Style=document.createElement('style');
v5Style.textContent=`
:root{--bg:#f4f7fa;--surface:#fff;--surface2:#f7f9fb;--text:#17212b;--muted:#6f7a84;--border:#dce3ea;--primary:${EFC_BLUE_V5};--primary2:#0d4b82;--soft:#eaf3fb;--danger:#b83d43;--warn:#9a6800;--shadow:0 12px 34px rgba(15,63,103,.07)}
.demo-strip{background:#0d3558;color:#e7f1f8}.shell aside{background:linear-gradient(180deg,#0c355a 0%,#0a2945 72%,#08243d 100%)}
.brand{border-bottom-color:#ffffff24}.brand .logo{width:60px;height:52px;border-radius:12px;background:#fff;padding:3px;overflow:hidden}.brand .logo img{width:100%;height:100%;object-fit:contain;display:block}.brand small{color:#c9d8e6}
.shell nav a{color:#d3deea}.shell nav a:hover,.shell nav a.active{background:#ffffff12}.shell nav a.active{box-shadow:inset -3px 0 ${EFC_YELLOW_V5}}
.header-pill{color:${EFC_BLUE_V5};background:#eaf3fb;border-color:#cbdff0}.page-title p{color:${EFC_GREEN_V5}}
.button{background:${EFC_BLUE_V5}}.button:hover{background:#0d4b82}.mini{color:${EFC_BLUE_V5}}.mini:hover{background:#eef5fb;border-color:#bdd5ea}
.summary-inline{background:#eef6fb;border-color:#d3e4f1}.big-money,.chart-head>b{color:${EFC_GREEN_V5}}
.line{stroke:${EFC_GREEN_V5}!important}.dot{stroke:${EFC_GREEN_V5}!important}.dot:hover{fill:${EFC_GREEN_V5}!important}.break-row i{background:${EFC_GREEN_V5}}
.badge.good{background:#e7f6ed;color:#117244}.badge.warn{background:#fff4cf;color:#865c00}.tabs button.active,.segmented button.active{color:${EFC_BLUE_V5}}
.chart-tooltip{background:#123a59!important;border:1px solid #ffffff24}.precise-chart .chart-hit-v5{cursor:crosshair}.precise-chart .peak-note{display:none!important}
.card{border-color:#dde5ec}.student-row:hover{background:#f2f7fb}.x:hover{border-color:#bfd2e4;color:${EFC_BLUE_V5}}
.receipt-success-v4 .modal-card,.receipt-preview-v4 .modal-card{border-top:4px solid ${EFC_YELLOW_V5}}
`;
document.head.appendChild(v5Style);

applyBrandV5();
setTimeout(()=>{applyBrandV5();try{renderCurrentMerged()}catch{renderCurrent()}},0);
