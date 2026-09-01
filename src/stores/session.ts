import{create}from'zustand';export const useSession=create<{token:string|null;setToken:(v:string|null)=>void}>(set=>({token:null,setToken:token=>set({token})}));
