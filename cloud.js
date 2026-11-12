/* TeamOps AI: opt-in private Supabase workspace sync. No secret keys. */
(() => {
"use strict";
const API="https://edoupxohgamzvixlepiw.supabase.co";
const KEY="sb_publishable_vPCpVLRKIQ1ib8fhgujpXQ_xRV5-uGL";
let session=null,revision=0,ready=false,blocked=false,busy=false,pending=false,lastSent="",clock=null,cloudError="";
function status(t){const el=document.getElementById("cloudStatus");if(el)el.textContent=t;const badge=document.getElementById("cloudBadge");if(badge)badge.textContent=t;}
function authHeaders(){return {"apikey":KEY,"Authorization":"Bearer "+(session?.access_token||KEY),"Content-Type":"application/json"};}
async function request(path,method="GET",body,headers={}){
 const r=await fetch(API+path,{method,headers:{...authHeaders(),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 const txt=await r.text();let data=null;try{data=txt?JSON.parse(txt):null}catch{data=txt;}
 if(!r.ok)throw new Error((data?.msg||data?.message||data?.error_description||data?.error||"伺服器錯誤")+" ("+r.status+")");
 return data;
}
function hasData(){return !!(db.projects.length||db.tasks.length||db.notes.length||db.events.length||db.clients?.length);}
function digest(){return JSON.stringify(db)}
function storeSession(s){session=s;sessionStorage.setItem("teamops_cloud_session",JSON.stringify(s));}
async function refresh(){
 if(!session?.refresh_token)throw new Error("請重新登入");
 const s=await request("/auth/v1/token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});
 storeSession(s);
}
async function authorized(fn){if(!session?.access_token)throw new Error("尚未登入");if(session.expires_at && Date.now()/1000>session.expires_at-90)await refresh();try{return await fn()}catch(e){if(String(e).includes("401")&&session.refresh_token){await refresh();return fn()}throw e;}}
async function signIn(){
 const email=document.getElementById("cloudEmail")?.value.trim(),password=document.getElementById("cloudPassword")?.value;
 if(!email||!password)return alert("請輸入 Email 與密碼");
 try{
 status("正在登入…");
 const s=await request("/auth/v1/token?grant_type=password","POST",{email,password});if(!s.access_token)throw new Error("尚未完成 Email 驗證");
 s.expires_at=Math.floor(Date.now()/1000)+(s.expires_in||3600);storeSession(s);
 closeModal();await loadCloud();render();
 }catch(e){status("登入失敗");alert("登入失敗："+e.message);}
}
async function signUp(){
 const email=document.getElementById("cloudEmail")?.value.trim(),password=document.getElementById("cloudPassword")?.value;
 if(!email||!password||password.length<8)return alert("請輸入 Email 與至少 8 字元的密碼");
 try{await request("/auth/v1/signup","POST",{email,password});alert("已送出註冊申請。如系統要求驗證信，請至信箱完成驗證。完成後回來登入。\n若未收到郵件，請檢查垃圾郵件或 Supabase Auth 設定。");}
 catch(e){alert("註冊失敗："+e.message)}
}
function signOut(){if(!confirm("登出雲端帳號？本機資料會保留；登入其他帳號前請先檢查本機備份。"))return;session=null;sessionStorage.removeItem("teamops_cloud_session");ready=false;revision=0;blocked=false;pending=false;status("未登入 · 目前只儲存在本機");render();}
async function loadCloud(){
 if(!session)return;
 busy=true;ready=false;status("正在取得私人雲端資料…");
 try{
 const rows=await authorized(()=>request("/rest/v1/teamops_workspaces?select=data,revision&limit=1"));
 if(!Array.isArray(rows))throw new Error("雲端資料格式不正確");
 if(rows.length){
   const row=rows[0];
   if(hasData() && JSON.stringify(row.data)!==JSON.stringify(db)){
     const load=confirm("雲端已存在資料。按「確定」載入雲端資料（目前本機資料可先備份）；按「取消」保留本機資料並暫停同步。\n注意：切換裝置時通常應載入雲端資料。");
     if(!load){blocked=true;status("資料不同步：請先備份並決定保留哪份資料");return}
   }
   db=row.data;
   if(!Array.isArray(db.members)||!Array.isArray(db.projects))throw new Error("雲端資料需要修復，已停止載入");
   for(const k of ["clients","notes","tasks","events","reminders"])if(!Array.isArray(db[k]))db[k]=[];
   revision=Number(row.revision);
   originalSave();lastSent=digest();
 }else{
   if(hasData()&&!confirm("雲端目前沒有資料。是否把這台裝置的現有資料上傳為第一份雲端資料？\n按取消則不覆蓋本機資料，並暫停雲端同步。")){blocked=true;status("已登入，但尚未設定同步");return;}
   const me=await authorized(()=>request("/auth/v1/user"));
   if(!me.id)throw new Error("無法取得登入者資訊");
   const created=await authorized(()=>request("/rest/v1/teamops_workspaces","POST",{owner_id:me.id,data:db,revision:1},{Prefer:"return=representation"}));
   revision=Number(created?.[0]?.revision||1);lastSent=digest();
 }
 blocked=false;ready=true;cloudError="";status("雲端已連線 ✓");render();
 }catch(e){cloudError=e.message;blocked=true;status("雲端讀取失敗："+e.message);alert("雲端連線錯誤："+e.message);}
 finally{busy=false;}
}
async function push(){
 if(!session||!ready||blocked)return;
 if(busy){pending=true;return;}
 const snapshot=digest();if(snapshot===lastSent)return;
 busy=true;status("正在同步…");
 try{
 const result=await authorized(()=>request("/rest/v1/teamops_workspaces?revision=eq."+revision,"PATCH",{data:JSON.parse(snapshot),revision:revision+1,updated_at:new Date().toISOString()},{Prefer:"return=representation"}));
 if(!Array.isArray(result)||result.length!==1){blocked=true;ready=false;status("雲端版本衝突，已停止自動上傳");alert("另一台裝置可能已更新資料。請先匯出這台裝置的 JSON 備份，再點「重新載入雲端」，避免覆蓋較新資料。");return;}
 revision=Number(result[0].revision);lastSent=snapshot;cloudError="";status("雲端已同步 ✓");
 }catch(e){cloudError=e.message;status("同步失敗 · 本機已保存："+e.message);}
 finally{busy=false;if(pending){pending=false;queue()}}
}
function queue(){if(!session||!ready||blocked)return;if(clock)clearTimeout(clock);clock=setTimeout(push,900);}
const originalSave=save;
save=function(){originalSave();queue()};
const originalRender=render;
function decorate(){
 const settings=document.getElementById("view");
 if(page==="settings" && settings){
  const panel=document.createElement("div");panel.className="panel";panel.innerHTML='<h2>☁️ 私人雲端同步</h2><p class="help">使用 Supabase 免費資料庫；登入後只同步自己的工作空間。尚未登入時仍可離線使用。</p><p id="cloudStatus" class="muted small"></p><div class="row"><button class="btn primary" onclick="cloudLogin()">登入／建立帳號</button><button class="btn" onclick="cloudReload()">重新載入雲端</button><button class="btn danger" onclick="cloudLogout()">登出</button></div><p class="help">第一次登入會請你選擇保留雲端還是本機資料。若兩台裝置各自修改而出現版本衝突，請先備份，再重新載入。不要把公司資料放進公開 GitHub。</p>';
  settings.prepend(panel);
  status(session?(ready?"雲端已連線 ✓":blocked?"同步暫停":"正在連線"):"未登入 · 本機儲存");
 }
 const nav=document.getElementById("nav");if(nav){let b=document.getElementById("cloudBadge");if(!b){b=document.createElement("div");b.id="cloudBadge";b.className="sidefoot";nav.appendChild(b)}b.textContent=session?(ready?"☁️ 已同步":blocked?"⚠️ 同步暫停":"☁️ 已登入"):"☁️ 尚未登入";}
}
render=function(){originalRender();decorate();if(typeof window.renderGoogleControl==="function")window.renderGoogleControl()};
window.cloudLogin=function(){modal("TeamOps AI 私人雲端登入",'<p class="help">第一次請先建立帳號。Email 驗證完成後登入。資料僅限登入者本人存取。</p>'+field("cloudEmail","Email") + field("cloudPassword","密碼（至少 8 字元）","","password")+'<div class="row" style="margin-top:14px"><button class="btn primary" onclick="cloudSignIn()">登入</button><button class="btn" onclick="cloudSignUp()">建立帳號</button></div>')};
window.cloudSignIn=signIn;window.cloudSignUp=signUp;window.cloudLogout=signOut;
window.cloudReload=async function(){if(!session)return window.cloudLogin();if(!confirm("重新載入雲端資料前，建議先匯出本機 JSON 備份。繼續嗎？"))return;await loadCloud()};
window.cloudStatus=function(){return {connected:ready,revision,error:cloudError}};
const saved=sessionStorage.getItem("teamops_cloud_session");if(saved){try{session=JSON.parse(saved);loadCloud()}catch{session=null}}
render();
})();