/* TeamOps AI Google Calendar read-only bridge.
   Requires an OAuth Client ID created in the user's Google Cloud project.
   Access token stays only in memory; Google calendars are never modified. */
(() => {
"use strict";
let token="",expires=0,working=false,available=[];
const SCOPE="https://www.googleapis.com/auth/calendar.readonly";
const TZ="Asia/Taipei";
function ensureSettings(){db.settings=db.settings||{};db.settings.googleMappings=db.settings.googleMappings||{};}
function msg(s){const el=document.getElementById("googleStatus");if(el)el.textContent=s;}
function signed(){return token&&Date.now()<expires}
function setupInputs(){ensureSettings();const html=db.members.map(m=>{const id="gmap_"+m.id.replace(/[^a-zA-Z0-9]/g,"_");return '<div><label>'+esc(m.name)+' 的日曆 ID</label><input id="'+id+'" data-member-id="'+esc(m.id)+'" placeholder="在 Google 日曆清單中複製 ID" value="'+esc(db.settings.googleMappings[m.id]||'')+'"></div>'}).join("");return html;}
function showAvailable(){const el=document.getElementById("googleCalendars");if(el)el.innerHTML=available.length?'<p class="help">以下是授權帳號可讀取的日曆。複製日曆 ID 填入上面的對應欄位。</p>'+available.map(c=>'<div class="item"><div class="body"><strong>'+esc(c.summary||'未命名日曆')+'</strong><div class="desc" style="overflow-wrap:anywhere">'+esc(c.id)+'</div></div><button class="btn" data-id="'+esc(c.id)+'" onclick="navigator.clipboard.writeText(this.dataset.id)">複製 ID</button></div>').join(""):'<p class="muted small">尚未讀取 Google 日曆清單。</p>'}
window.renderGoogleControl=function(){
 if(page!=="settings")return;const settings=document.getElementById("view");if(!settings||document.getElementById("googlePanel"))return;
 ensureSettings();const panel=document.createElement("div");panel.className="panel";panel.id="googlePanel";
 panel.innerHTML='<h2>🗓️ Google Calendar 唯讀同步</h2><p class="help">Google 日曆的網頁授權與 ChatGPT 連線不同。先在 Google Cloud 建立 OAuth「網頁應用程式」用戶端，授權來源設定為 https://a4544875-ship-it.github.io，再填入 Client ID。只讀取有權限的日曆，完全不改動同事行程。</p>'+field("googleClientId","Google OAuth Client ID（非密碼）",db.settings.googleClientId||"")+'<div class="row"><button class="btn" onclick="googleSaveSettings()">儲存設定</button><button class="btn primary" onclick="googleAuthorize()">以 Google 授權唯讀</button><button class="btn" onclick="googleListCalendars()">列出可用日曆</button></div><p id="googleStatus" class="muted small">尚未授權</p><h3>組員日曆對應</h3><div class="formgrid">'+setupInputs()+'</div><div class="row"><button class="btn" onclick="googleSaveSettings()">儲存對應</button><button class="btn primary" onclick="googleSync()">立即同步 5 人行程</button></div><p class="help">匯入範圍：過去 30 天～未來 90 天；重複事件自動展開，不會覆蓋手動行程。取消或刪除的 Google 事件會從這個範圍內的同步副本移除。Google 登入權杖只在本次瀏覽器頁面暫存，過期需重新授權；頁面關閉時不會在背景同步。</p><div id="googleCalendars"></div>';
 settings.appendChild(panel);showAvailable();if(signed())msg("已取得唯讀授權（本次頁面有效）");
}
window.googleSaveSettings=function(){ensureSettings();db.settings.googleClientId=document.getElementById("googleClientId")?.value.trim()||"";for(const el of document.querySelectorAll("[data-member-id]"))db.settings.googleMappings[el.dataset.memberId]=el.value.trim();save();msg("設定已儲存（只存本機及已登入的私人雲端）")};
function loadGIS(){return new Promise((resolve,reject)=>{if(window.google?.accounts?.oauth2)return resolve();let s=document.getElementById("gsi-lib");if(!s){s=document.createElement("script");s.id="gsi-lib";s.src="https://accounts.google.com/gsi/client";s.async=true;document.head.appendChild(s)}let c=0;const check=()=>{if(window.google?.accounts?.oauth2)return resolve();if(++c>50)return reject(new Error("Google Identity Services 載入失敗，請檢查網路或廣告封鎖器"));setTimeout(check,200)};check()})}
window.googleAuthorize=async function(){
 googleSaveSettings();const id=db.settings.googleClientId;
 if(!id)return alert("請先填入 Google Cloud 網頁 OAuth Client ID");
 try{await loadGIS();const client=google.accounts.oauth2.initTokenClient({client_id:id,scope:SCOPE,callback:res=>{if(res.error){msg("授權失敗："+res.error);return}token=res.access_token;expires=Date.now()+(Number(res.expires_in)||3500)*1000;msg("已授權讀取 Google Calendar ✓");}});client.requestAccessToken({prompt:signed()?"":"consent"});}
 catch(e){msg(e.message);alert(e.message)}
};
async function gget(url){if(!signed())throw new Error("Google 授權已過期，請重新授權");const response=await fetch(url,{headers:{Authorization:"Bearer "+token}});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Google API 錯誤 "+response.status);return data}
window.googleListCalendars=async function(){try{available=[];let pageToken="";do{const q=new URLSearchParams({maxResults:"250"});if(pageToken)q.set("pageToken",pageToken);const d=await gget("https://www.googleapis.com/calendar/v3/users/me/calendarList?"+q);available.push(...d.items||[]);pageToken=d.nextPageToken||""}while(pageToken&&available.length<1000);showAvailable();msg("成功讀取 "+available.length+" 個日曆");}catch(e){msg("讀取清單失敗："+e.message)}};
function local(dateTime,date){if(date)return {date,hm:""};if(!dateTime)return {date:"",hm:""};const d=new Date(dateTime);if(!Number.isFinite(d.getTime()))return {date:"",hm:""};const parts=Intl.DateTimeFormat("sv-SE",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d);const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));return {date:o.year+"-"+o.month+"-"+o.day,hm:o.hour+":"+o.minute}}
async function fetchEvents(calendarId,timeMin,timeMax){
 let list=[],pageToken="";let loops=0;
 do{const p=new URLSearchParams({timeMin,timeMax,singleEvents:"true",showDeleted:"false",maxResults:"2500",timeZone:TZ});if(pageToken)p.set("pageToken",pageToken);
 const d=await gget("https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId)+"/events?"+p);
 list.push(...(d.items||[]));pageToken=d.nextPageToken||"";loops++;
 if(loops>=15&&pageToken)throw Error("行程超過分頁安全上限，請縮短範圍");
 }while(pageToken);return list;
}
window.googleSync=async function(){
 if(working)return;googleSaveSettings();if(!signed())return alert("請先按「以 Google 授權唯讀」");
 ensureSettings();const maps=db.members.map(m=>({m,id:db.settings.googleMappings[m.id]})).filter(x=>x.id);
 if(!maps.length)return alert("請先在組員日曆對應中填寫至少一人的日曆 ID");
 working=true;msg("正在同步 Google 行程…");
 const now=new Date(),start=new Date(now.getTime()-30*86400000).toISOString(),end=new Date(now.getTime()+90*86400000).toISOString();
 let total=0,errors=[],updates=[];
 try{
 for(const x of maps){
  try{const data=await fetchEvents(x.id,start,end);let rows=[];
   for(const e of data){if(e.status==="cancelled")continue;
    const a=local(e.start?.dateTime,e.start?.date),b=local(e.end?.dateTime,e.end?.date);if(!a.date)continue;
    rows.push({id:"g_"+x.m.id+"_"+e.id,sourceId:"google:"+x.id+":"+e.id,origin:"Google Calendar",title:e.summary||"(未命名行程)",description:e.description||"",person:x.m.name,date:a.date,start:a.hm,end:b.hm,type:e.transparency==="transparent"?"預留／不阻擋":"Google 日曆",googleUrl:e.htmlLink||"",updatedAt:e.updated||""});
   }
   updates.push({x,rows});total+=rows.length;
  }catch(err){errors.push(x.m.name+"："+err.message)}
 }
 const successful=new Set(updates.map(x=>x.x.m.name));
 const mappedCalIds=new Set(updates.map(x=>x.x.id));
 const minDate=start.slice(0,10),maxDate=end.slice(0,10);
 db.events=db.events.filter(e=>!(e.origin==="Google Calendar" && mappedCalIds.has((e.sourceId||"").split(":").slice(1,-1).join(":")) && e.date>=minDate&&e.date<=maxDate));
 for(const u of updates)db.events.push(...u.rows);
 save();render();msg("Google 同步完成："+total+" 筆行程"+(errors.length?"；有 "+errors.length+" 個失敗":""));if(errors.length)alert("部分日曆未同步：\n"+errors.join("\n"));
 }catch(e){msg("同步失敗："+e.message);alert(e.message)}
 finally{working=false}
};
render();
})();