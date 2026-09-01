import type{ButtonHTMLAttributes,InputHTMLAttributes,ReactNode}from'react';
export const Button=({className='',...p}:ButtonHTMLAttributes<HTMLButtonElement>)=><button className={`button ${className}`} {...p}/>;
export const Input=({className='',...p}:InputHTMLAttributes<HTMLInputElement>)=><input className={`input ${className}`} {...p}/>;
export const Card=({children,className=''}:{children:ReactNode;className?:string})=><section className={`card ${className}`}>{children}</section>;
export const Empty=({title='لا توجد بيانات',detail='ستظهر البيانات هنا بعد إضافتها.'})=><div className="empty"><b>{title}</b><span>{detail}</span></div>;
