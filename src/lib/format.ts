export const digits=(v:number|string)=>String(v).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
export const number=(v:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(v);
export const money=(v:number)=>`${number(v)} أوقية`;
export const date=(v:string)=>{const d=new Date(v);if(Number.isNaN(d.getTime()))return digits(v);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`};
export const compactNumber=(v:number)=>{const n=Math.abs(v);if(n>=1_000_000)return`${(v/1_000_000).toFixed(n>=10_000_000?0:1)}M`;if(n>=1_000)return`${(v/1_000).toFixed(n>=10_000?0:1)}K`;return number(v)};
export const addDuration=(iso:string,value:number,unit:'day'|'week'|'month')=>{const d=new Date(`${iso}T12:00:00`);if(unit==='month'){const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+value);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));}else d.setDate(d.getDate()+value*(unit==='week'?7:1));return d.toISOString().slice(0,10)};
