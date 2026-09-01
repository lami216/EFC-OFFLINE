export const money=(v:number)=>`${new Intl.NumberFormat('ar-MR').format(v)} أوقية`;
export const date=(v:string)=>new Intl.DateTimeFormat('ar-MR',{dateStyle:'medium'}).format(new Date(v));
export const addDuration=(iso:string,value:number,unit:'day'|'week'|'month')=>{const d=new Date(`${iso}T12:00:00`);if(unit==='month'){const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+value);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));}else d.setDate(d.getDate()+value*(unit==='week'?7:1));return d.toISOString().slice(0,10)};
