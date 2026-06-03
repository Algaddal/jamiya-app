import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const ini = n => n ? n.trim().split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "??";
const tod = () => new Date().toLocaleDateString("ar-SA");
const AVBG = [["#E8F5E9","#2E7D32"],["#E3F2FD","#1565C0"],["#FFF3E0","#E65100"],["#F3E5F5","#6A1B9A"],["#FCE4EC","#880E4F"],["#E0F7FA","#00695C"]];
const G="#0F6E56",GM="#1D9E75",GL="#E1F5EE",GD="#085041",sf="#fff",bg="#F5F7F6",bd="#E2EAE7";

const ROLES={superadmin:{label:"Super Admin",icon:"👑",color:"#E65100",bg:"#FFF3E0"},admin:{label:"مدير",icon:"🔑",color:"#1565C0",bg:"#E3F2FD"},accountant:{label:"محاسب",icon:"💼",color:"#6A1B9A",bg:"#F3E5F5"},member:{label:"عضو",icon:"👤",color:"#2E7D32",bg:"#E8F5E9"}};
const canDo=(user,action)=>{const r=user?.role;switch(action){case"reset":return r==="superadmin";case"manage_users":return r==="superadmin";case"rounds":return["superadmin","admin"].includes(r);case"members_write":return["superadmin","admin"].includes(r);case"pays_write":return["superadmin","admin","accountant"].includes(r);default:return false;}};

function buildShareLink(rid,token){return window.location.href.split("?")[0]+"?view=round&rid="+rid+"&token="+token;}
function buildLiveLink(drawId,token){return window.location.href.split("?")[0]+"?view=live&did="+drawId+"&token="+token;}


// ══════════════════════════════════════════
// LIVE DRAW VIEW — رابط ثابت مع تايمر + مشاهدين
// ══════════════════════════════════════════
function LiveDrawView(){
  const p=new URLSearchParams(window.location.search);
  const did=p.get("did"),token=p.get("token");
  const [draw,setDraw]=useState(null);
  const [pays,setPays]=useState([]);
  const [loading,setLoading]=useState(true);
  const [timeLeft,setTimeLeft]=useState(null);
  const [viewerToken]=useState(()=>localStorage.getItem("vt-"+did)||Math.random().toString(36).slice(2));
  const timerRef=useRef(null);

  // تسجيل المشاهد
  useEffect(()=>{
    if(!did||!token)return;
    localStorage.setItem("vt-"+did,viewerToken);
    
    // تسجيل الدخول للرابط
    supabase.from("live_viewers").upsert({draw_id:did,viewer_token:viewerToken,last_seen:new Date().toISOString()},{onConflict:"draw_id,viewer_token"}).then();
    
    // تحديث last_seen كل 10 ثوان
    const ping=setInterval(()=>{
      supabase.from("live_viewers").upsert({draw_id:did,viewer_token:viewerToken,last_seen:new Date().toISOString()},{onConflict:"draw_id,viewer_token"}).then();
    },10000);

    return()=>clearInterval(ping);
  },[did,viewerToken]);

  useEffect(()=>{
    supabase.from("live_draw").select("*").eq("id",did).eq("share_token",token).single()
      .then(({data})=>{
        setDraw(data);setLoading(false);
        if(data?.round_id)supabase.from("pays").select("*").eq("round_id",data.round_id).then(({data:ps})=>setPays(ps||[]));
        if(data?.countdown_start&&data?.countdown_seconds&&data?.status==="waiting"){
          startClientTimer(data.countdown_start,data.countdown_seconds);
        }
      });

    const ch=supabase.channel("live-"+did)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"live_draw",filter:"id=eq."+did},({new:d})=>{
        setDraw(d);
        if(d.round_id)supabase.from("pays").select("*").eq("round_id",d.round_id).then(({data:ps})=>setPays(ps||[]));
        if(d.countdown_start&&d.countdown_seconds&&d.status==="waiting")startClientTimer(d.countdown_start,d.countdown_seconds);
        if(d.status!=="waiting"&&timerRef.current){clearInterval(timerRef.current);setTimeLeft(null);}
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"pays"},({new:pay})=>{
        setPays(prev=>{const idx=prev.findIndex(x=>x.id===pay.id);if(idx>=0){const n=[...prev];n[idx]=pay;return n;}return[...prev,pay];});
      })
      .subscribe();
    return()=>{supabase.removeChannel(ch);if(timerRef.current)clearInterval(timerRef.current);};
  },[did]);

  function startClientTimer(startISO,totalSec){
    if(timerRef.current)clearInterval(timerRef.current);
    const startTime=new Date(startISO).getTime();
    const endTime=startTime+(totalSec*1000);
    timerRef.current=setInterval(()=>{
      const now=Date.now();
      const left=Math.max(0,Math.ceil((endTime-now)/1000));
      setTimeLeft(left);
      if(left<=0)clearInterval(timerRef.current);
    },500);
  }

  if(loading)return <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",color:"#1D9E75",fontSize:20}}>جاري التحميل...</div>;
  if(!draw)return <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",color:"#fff",fontSize:20}}>🔒 رابط غير صحيح</div>;

  const parts=draw.participants||[];
  const isWaiting=draw.status==="waiting";
  const isSpinning=draw.status==="spinning";
  const isDone=draw.status==="done";
  const isConfirmed=draw.is_confirmed;
  const paidCount=pays.filter(p=>p.paid).length;
  const totalPot=pays.reduce((s,p)=>s+Number(p.amt),0);

  // تنسيق الوقت
  const fmtTime=(sec)=>{
    if(sec===null)return null;
    const m=Math.floor(sec/60),s=sec%60;
    return m+":"+String(s).padStart(2,"0");
  };
  const timerDisplay=fmtTime(timeLeft);
  const isUrgent=timeLeft!==null&&timeLeft<=10;
  const isCritical=timeLeft!==null&&timeLeft<=30&&timeLeft>10;

  return(
    <div dir="rtl" style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a1628,#0F1923,#0a2820)",fontFamily:"Tajawal,sans-serif",padding:20}}>
      <div style={{maxWidth:520,margin:"0 auto"}}>

        {/* HEADER */}
        <div style={{textAlign:"center",marginBottom:24,paddingTop:12}}>
          <div style={{fontSize:40,marginBottom:6}}>🎰</div>
          <h1 style={{color:"#1D9E75",fontSize:22,fontWeight:800,margin:0}}>قرعة الجمعية الدوّارة</h1>
          <p style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:4}}>الجولة #{draw.round_num}</p>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:8,background:"rgba(255,255,255,.08)",borderRadius:20,padding:"4px 14px",fontSize:12}}>
            {isWaiting&&<><span style={{width:8,height:8,borderRadius:"50%",background:timerDisplay?"#FF9800":"#FFA726",display:"inline-block",animation:timerDisplay?"blink .6s ease-in-out infinite":"none"}}/><span style={{color:"#FFA726",fontWeight:700}}>{timerDisplay?"⏱️ ابدأ في "+timerDisplay:"في انتظار البدء..."}</span></>}
            {isSpinning&&<><span style={{width:8,height:8,borderRadius:"50%",background:"#1D9E75",display:"inline-block",animation:"blink .4s ease-in-out infinite"}}/><span style={{color:"#1D9E75",fontWeight:700}}>🔴 القرعة تدور الآن</span></>}
            {isDone&&!isConfirmed&&<><span style={{width:8,height:8,borderRadius:"50%",background:"#FFD700",display:"inline-block"}}/><span style={{color:"#FFD700",fontWeight:700}}>🏆 تم اختيار الفائز</span></>}
            {isConfirmed&&<><span style={{width:8,height:8,borderRadius:"50%",background:"#1D9E75",display:"inline-block"}}/><span style={{color:"#1D9E75",fontWeight:700}}>✅ الجولة مؤكدة</span></>}
          </div>
        </div>

        {/* TIMER — يظهر فقط في وضع الانتظار مع تايمر نشط */}
        {isWaiting&&timerDisplay&&(
          <div style={{background:isUrgent?"rgba(229,57,53,.15)":isCritical?"rgba(255,152,0,.1)":"rgba(255,255,255,.04)",border:"2px solid "+(isUrgent?"rgba(229,57,53,.5)":isCritical?"rgba(255,152,0,.4)":"rgba(255,255,255,.1)"),borderRadius:20,padding:"20px 24px",marginBottom:16,textAlign:"center",transition:"all .5s"}}>
            <div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:8,fontWeight:700}}>⏱️ القرعة تبدأ خلال</div>
            <div style={{fontSize:64,fontWeight:800,color:isUrgent?"#EF5350":isCritical?"#FF9800":"#fff",fontVariantNumeric:"tabular-nums",lineHeight:1,fontFamily:"monospace",animation:isUrgent?"shake .3s ease-in-out infinite":"none",textShadow:isUrgent?"0 0 30px rgba(229,57,53,.6)":isCritical?"0 0 20px rgba(255,152,0,.4)":"none"}}>
              {timerDisplay}
            </div>
            {isUrgent&&<div style={{color:"#EF5350",fontSize:13,fontWeight:700,marginTop:8,animation:"blink .3s ease-in-out infinite"}}>🔥 القرعة على وشك البدء!</div>}
            {isCritical&&!isUrgent&&<div style={{color:"#FF9800",fontSize:12,marginTop:6}}>استعد!</div>}
          </div>)}

        {/* DRUM MACHINE */}
        <div style={{background:"rgba(255,255,255,.04)",border:"2px solid "+(isSpinning?"rgba(29,158,117,.5)":isDone?"rgba(255,215,0,.3)":"rgba(255,255,255,.08)"),borderRadius:24,padding:"24px 20px",marginBottom:16,textAlign:"center",position:"relative",overflow:"hidden",transition:"border-color .5s"}}>
          {isSpinning&&<div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(15,110,86,.08),transparent)",animation:"pulse 1s ease-in-out infinite"}}/>}
          <div style={{fontSize:isConfirmed?64:isDone?58:isSpinning?48:38,marginBottom:12,transition:"font-size .4s",filter:isSpinning?"drop-shadow(0 0 24px #1D9E75)":isDone?"drop-shadow(0 0 30px #FFD700)":"none"}}>
            {isConfirmed?"🎊":isDone?"🏆":isSpinning?"🎲":"⏳"}
          </div>
          <div style={{minHeight:60,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            {isWaiting&&!timerDisplay&&<div style={{color:"rgba(255,255,255,.3)",fontSize:15}}>في انتظار بدء القرعة...</div>}
            {isWaiting&&timerDisplay&&<div style={{color:"rgba(255,255,255,.4)",fontSize:14}}>جهّز نفسك... القرعة قريباً!</div>}
            {isSpinning&&<div style={{color:"#fff",fontSize:30,fontWeight:800,animation:"bounce .15s ease-in-out infinite",textShadow:"0 0 40px #1D9E75"}}>{draw.current_name}</div>}
            {(isDone||isConfirmed)&&(
              <div style={{textAlign:"center"}}>
                <div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:4}}>🎊 الفائز هو</div>
                <div style={{color:"#FFD700",fontSize:34,fontWeight:800,textShadow:"0 0 40px rgba(255,215,0,.4)"}}>{draw.winner_name}</div>
                {isConfirmed&&totalPot>0&&<div style={{color:"rgba(255,255,255,.5)",fontSize:13,marginTop:6}}>💰 {totalPot.toLocaleString()} ر.س</div>}
              </div>)}
          </div>
          {isSpinning&&<div style={{marginTop:10,display:"flex",justifyContent:"center",gap:6}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#1D9E75",animation:"dot "+(.5+i*.2)+"s ease-in-out infinite alternate"}}/>)}</div>}
        </div>

        {/* PAYMENTS after confirmation */}
        {isConfirmed&&pays.length>0&&(
          <div style={{background:"rgba(255,255,255,.05)",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:13,fontWeight:700,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
              <span>💳 المدفوعات</span><span style={{color:"#1D9E75"}}>{paidCount}/{pays.length}</span>
            </div>
            <div style={{height:5,background:"rgba(255,255,255,.08)",borderRadius:3,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",background:"#1D9E75",borderRadius:3,width:(pays.length?paidCount/pays.length*100:0)+"%",transition:"width .5s"}}/>
            </div>
            {pays.map((pay,i)=>(
              <div key={pay.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:AVBG[i%6][0],color:AVBG[i%6][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,flexShrink:0}}>{ini(pay.member_name||"")}</div>
                <div style={{flex:1}}><div style={{color:"#fff",fontSize:13,fontWeight:600}}>{pay.member_name} {draw.winner_id===pay.member_id?"🏆":""}</div></div>
                <span style={{fontSize:11,padding:"2px 9px",borderRadius:20,fontWeight:700,background:pay.paid?"rgba(46,125,50,.25)":"rgba(230,81,0,.15)",color:pay.paid?"#81C784":"#FFB74D",border:"1px solid "+(pay.paid?"rgba(46,125,50,.3)":"rgba(230,81,0,.2)"),flexShrink:0}}>{pay.paid?"✓ دفع":"⏳"}</span>
              </div>))}
          </div>)}

        {/* PARTICIPANTS GRID */}
        <div style={{background:"rgba(255,255,255,.03)",borderRadius:14,padding:"14px 16px"}}>
          <div style={{color:"rgba(255,255,255,.4)",fontSize:11,fontWeight:700,marginBottom:10,textAlign:"center"}}>{parts.length} مشارك في القرعة</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:7}}>
            {parts.map((name,i)=>{
              const isWinner=(isDone||isConfirmed)&&name===draw.winner_name;
              const isActive=isSpinning&&name===draw.current_name;
              return(
                <div key={i} style={{background:isWinner?"linear-gradient(135deg,#0F6E56,#1D9E75)":isActive?"rgba(29,158,117,.2)":"rgba(255,255,255,.04)",borderRadius:9,padding:"9px 6px",textAlign:"center",border:isActive?"2px solid #1D9E75":isWinner?"2px solid #FFD700":"2px solid transparent",transform:isWinner?"scale(1.05)":"scale(1)",transition:"all .2s"}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:AVBG[i%6][0],color:AVBG[i%6][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,margin:"0 auto 5px"}}>{ini(name)}</div>
                  <div style={{color:isWinner||isActive?"#fff":"rgba(255,255,255,.5)",fontSize:10,lineHeight:1.3}}>{name}</div>
                  {isWinner&&<div style={{fontSize:12,marginTop:3}}>🏆</div>}
                </div>);})}
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:16,color:"rgba(255,255,255,.12)",fontSize:10}}>الجمعية الدوّارة · رابط ثابت</div>
      </div>
      <style>{"@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}@keyframes bounce{from{transform:scale(1)}to{transform:scale(1.04)}}@keyframes dot{from{opacity:.3;transform:scale(.8)}to{opacity:1;transform:scale(1.3)}}@keyframes blink{0%,100%{opacity:.3}50%{opacity:1}}@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}"}</style>
    </div>);
}

function PublicRoundView(){
  const p=new URLSearchParams(window.location.search);
  const rid=p.get("rid"),token=p.get("token");
  const [round,setRound]=useState(null);const [pays,setPays]=useState([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{
    Promise.all([supabase.from("rounds").select("*").eq("id",rid).eq("share_token",token).single(),supabase.from("pays").select("*").eq("round_id",rid)]).then(([{data:r},{data:ps}])=>{setRound(r);setPays(ps||[]);setLoading(false);});
    const ch=supabase.channel("pub-"+rid).on("postgres_changes",{event:"*",schema:"public",table:"pays",filter:"round_id=eq."+rid},({new:pay})=>setPays(prev=>{const idx=prev.findIndex(x=>x.id===pay.id);if(idx>=0){const n=[...prev];n[idx]=pay;return n;}return[...prev,pay];})).subscribe();
    return()=>supabase.removeChannel(ch);
  },[rid]);
  if(loading)return <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",color:GM,fontSize:20}}>جاري التحميل...</div>;
  if(!round)return <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",color:"#fff",fontSize:20}}>🔒 رابط غير صحيح</div>;
  const totalPot=pays.reduce((s,p)=>s+Number(p.amt),0),paidCount=pays.filter(p=>p.paid).length;
  return(
    <div dir="rtl" style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F1923,#1A2E28)",fontFamily:"Tajawal,sans-serif",padding:24}}>
      <div style={{maxWidth:480,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:32,paddingTop:20}}>
          <div style={{fontSize:48,marginBottom:8}}>🔄</div>
          <h1 style={{color:GM,fontSize:26,fontWeight:800,margin:0}}>الجمعية الدوّارة</h1>
          <p style={{color:"rgba(255,255,255,.5)",fontSize:13,marginTop:4}}>الجولة #{round.round_num}</p>
        </div>
        <div style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)",borderRadius:20,padding:"24px 28px",marginBottom:20,textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:8}}>🏆</div>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:13,marginBottom:4}}>الفائز</div>
          <div style={{color:"#fff",fontSize:28,fontWeight:800}}>{round.winner_name}</div>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:14,marginTop:8}}>إجمالي: <strong style={{color:"#fff"}}>{totalPot.toLocaleString()} ر.س</strong></div>
        </div>
        <div style={{background:"rgba(255,255,255,.05)",borderRadius:16,padding:"18px 20px"}}>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:13,fontWeight:700,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span>المدفوعات</span><span style={{color:GM}}>{paidCount}/{pays.length}</span>
          </div>
          {pays.map((pay,i)=>(
            <div key={pay.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:AVBG[i%6][0],color:AVBG[i%6][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{ini(pay.member_name||"")}</div>
              <div style={{flex:1}}><div style={{color:"#fff",fontSize:13,fontWeight:700}}>{pay.member_name}</div><div style={{color:"rgba(255,255,255,.4)",fontSize:11}}>{Number(pay.amt).toLocaleString()} ر.س</div></div>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:700,background:pay.paid?"#E8F5E9":"#FFF3E0",color:pay.paid?"#2E7D32":"#E65100"}}>{pay.paid?"✓":"⏳"}</span>
            </div>))}
        </div>
      </div>
    </div>);
}

// ══ LOGIN ══
function LoginScreen({onLogin}){
  const [phone,setPhone]=useState("");const [pin,setPin]=useState("");const [err,setErr]=useState("");const [loading,setLoading]=useState(false);
  async function handleLogin(){setLoading(true);setErr("");const{data}=await supabase.from("users").select("*").eq("phone",phone).eq("pin",pin).single();if(data)onLogin(data);else setErr("رقم الجوال أو الرمز السري غير صحيح");setLoading(false);}
  return(
    <div dir="rtl" style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F1923,#1A2E28)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",padding:16}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:80,height:80,borderRadius:24,background:"linear-gradient(135deg,#0F6E56,#1D9E75)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:36}}>🔄</div>
          <h1 style={{color:"#fff",fontSize:28,fontWeight:800,margin:0}}>الجمعية الدوّارة</h1>
          <p style={{color:"rgba(255,255,255,.4)",fontSize:13,marginTop:6}}>إدارة المدخرات الجماعية</p>
        </div>
        <div style={{background:"rgba(255,255,255,.07)",borderRadius:20,padding:28,border:"1px solid rgba(255,255,255,.1)"}}>
          <div style={{marginBottom:16}}><label style={{color:"rgba(255,255,255,.6)",fontSize:12,fontWeight:700,display:"block",marginBottom:6}}>رقم الجوال</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="05xxxxxxxx" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{width:"100%",padding:"12px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.08)",color:"#fff",fontSize:16,fontFamily:"Tajawal,sans-serif",outline:"none",boxSizing:"border-box",direction:"rtl"}}/></div>
          <div style={{marginBottom:20}}><label style={{color:"rgba(255,255,255,.6)",fontSize:12,fontWeight:700,display:"block",marginBottom:6}}>الرمز السري</label><input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{width:"100%",padding:"12px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.08)",color:"#fff",fontSize:20,fontFamily:"Tajawal,sans-serif",outline:"none",boxSizing:"border-box",direction:"rtl",letterSpacing:4}}/></div>
          {err&&<div style={{background:"#FCE4EC",color:"#880E4F",borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:16,textAlign:"center"}}>{err}</div>}
          <button onClick={handleLogin} disabled={loading} style={{width:"100%",padding:13,borderRadius:12,background:"linear-gradient(135deg,#0F6E56,#1D9E75)",color:"#fff",fontSize:16,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>{loading?"جاري التحقق...":"تسجيل الدخول"}</button>
        </div>
      </div>
    </div>);
}

// ══ RESET MODAL ══
function ResetModal({onClose,onReset}){
  const [selected,setSelected]=useState(null);
  const options=[{id:"winners",label:"إعادة تعيين الفائزين",icon:"🔄",desc:"يمسح won_round فقط",color:"#E3F2FD",tc:"#1565C0"},{id:"rounds",label:"Reset الجولات والمدفوعات",icon:"🗑️",desc:"يحذف الجولات ويبدأ من #1",color:"#FFF3E0",tc:"#E65100"},{id:"history",label:"Reset سجل المعاملات",icon:"📋",desc:"يمسح السجل فقط",color:"#F3E5F5",tc:"#6A1B9A"},{id:"members",label:"Reset الأعضاء",icon:"👥",desc:"يحذف كل الأعضاء",color:"#FCE4EC",tc:"#880E4F"},{id:"full",label:"Reset كامل للنظام",icon:"⚠️",desc:"يمسح كل شيء",color:"#FFEBEE",tc:"#C62828"}];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif"}} dir="rtl">
      <div style={{background:sf,borderRadius:20,padding:28,width:460,maxWidth:"95vw"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h3 style={{fontSize:18,fontWeight:800,margin:0,color:"#C62828"}}>⚠️ إعادة تعيين النظام</h3><button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#5A7A72"}}>×</button></div>
        {options.map(o=><div key={o.id} onClick={()=>setSelected(o.id)} style={{border:"2px solid "+(selected===o.id?"#C62828":bd),borderRadius:10,padding:"12px 14px",marginBottom:8,cursor:"pointer",background:selected===o.id?o.color:"transparent"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{o.icon}</span><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,color:selected===o.id?o.tc:"#1A2E28"}}>{o.label}</div><div style={{fontSize:12,color:"#5A7A72"}}>{o.desc}</div></div>{selected===o.id&&<span style={{color:"#C62828"}}>✓</span>}</div></div>)}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={()=>{if(!selected)return;const op=options.find(o=>o.id===selected);if(window.confirm("هل أنت متأكد من "+op.label+"؟ لا يمكن التراجع."))onReset(selected);}} disabled={!selected} style={{flex:1,padding:11,borderRadius:10,background:selected?"#C62828":"#ccc",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:selected?"pointer":"not-allowed",fontFamily:"Tajawal,sans-serif"}}>تنفيذ</button>
          <button onClick={onClose} style={{flex:1,padding:11,borderRadius:10,background:bg,color:"#5A7A72",fontSize:14,fontWeight:700,border:"1px solid "+bd,cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>إلغاء</button>
        </div>
      </div>
    </div>);
}

// ══ MAIN APP ══

// ══ VIEWERS COUNT COMPONENT ══
function ViewersCount({drawId}){
  const [count,setCount]=useState(0);
  useEffect(()=>{
    function refresh(){
      const cutoff=new Date(Date.now()-30000).toISOString();
      supabase.from("live_viewers").select("id",{count:"exact"}).eq("draw_id",drawId).gte("last_seen",cutoff)
        .then(({count:c})=>setCount(c||0));
    }
    refresh();
    const t=setInterval(refresh,8000);
    return()=>clearInterval(t);
  },[drawId]);
  return(
    <div style={{background:"#F0F7FF",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:"#1D9E75",display:"inline-block",animation:"blink .8s ease-in-out infinite"}}/>
        <span style={{fontSize:13,color:"#1565C0",fontWeight:700}}>المشاهدون الآن</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:22,fontWeight:800,color:"#1565C0"}}>{count}</span>
        <span style={{fontSize:12,color:"#5A7A72"}}>متصل</span>
      </div>
    </div>);
}

// ══ TIMER SELECTOR COMPONENT ══
function TimerSelector({drawId,onSet}){
  const [active,setActive]=useState(null);
  const options=[{sec:60,label:"1 دقيقة"},{sec:120,label:"2 دقيقة"},{sec:180,label:"3 دقائق"},{sec:300,label:"5 دقائق"},{sec:600,label:"10 دقائق"},{sec:0,label:"بلا تايمر"}];
  return(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:700,color:"#5A7A72",marginBottom:8}}>⏱️ تايمر للتنبيه قبل القرعة</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
        {options.map(o=>(
          <button key={o.sec} onClick={async()=>{setActive(o.sec);await onSet(o.sec);}} style={{padding:"7px 8px",borderRadius:8,background:active===o.sec?"#1565C0":"#F5F7F6",color:active===o.sec?"#fff":"#5A7A72",fontSize:12,fontWeight:700,border:"2px solid "+(active===o.sec?"#1565C0":"#E2EAE7"),cursor:"pointer",fontFamily:"Tajawal,sans-serif",transition:"all .15s"}}>
            {o.sec===0?"❌ بلا":"⏱️ "+o.label}
          </button>))}
      </div>
    </div>);
}

export default function App(){
  const [state,setState]=useState({members:[],rounds:[],users:[],hist:[],settings:{current_round:1,current_participants:[]},pays:{}});
  const [currentUser,setCurrentUser]=useState(null);
  const [tab,setTab]=useState("members");
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [shareModal,setShareModal]=useState(null);
  const [liveModal,setLiveModal]=useState(null);
  const [resetModal,setResetModal]=useState(false);
  const [drawMode,setDrawMode]=useState("random");
  const [pendingWinner,setPendingWinner]=useState(null);
  const [spinning,setSpinning]=useState(false);
  const [spinDisplay,setSpinDisplay]=useState("");
  const [activePayRound,setActivePayRound]=useState(null);
  const [liveDraw,setLiveDraw]=useState(null);
  const spinRef=useRef(null);

  const shareParams=new URLSearchParams(window.location.search);
  const viewType=shareParams.get("view");

  useEffect(()=>{loadAll();},[]);
  async function loadAll(){
    setLoading(true);
    const[{data:members},{data:rounds},{data:hist},{data:settings},{data:pays},{data:users}]=await Promise.all([supabase.from("members").select("*").order("created_at"),supabase.from("rounds").select("*").order("round_num"),supabase.from("history").select("*").order("created_at",{ascending:false}),supabase.from("settings").select("*"),supabase.from("pays").select("*"),supabase.from("users").select("*")]);
    const sObj={};(settings||[]).forEach(s=>{try{sObj[s.key]=JSON.parse(s.value);}catch{sObj[s.key]=s.value;}});
    const pObj={};(pays||[]).forEach(p=>{if(!pObj[p.round_id])pObj[p.round_id]=[];pObj[p.round_id].push(p);});
    setState({members:members||[],rounds:(rounds||[]).map(r=>({...r,pays:(pObj[r.id]||[])})),hist:hist||[],settings:sObj,pays:pObj,users:users||[]});
    setLoading(false);
  }

  useEffect(()=>{
    const ch=supabase.channel("all").on("postgres_changes",{event:"*",schema:"public",table:"members"},()=>loadAll()).on("postgres_changes",{event:"*",schema:"public",table:"rounds"},()=>loadAll()).on("postgres_changes",{event:"*",schema:"public",table:"pays"},()=>loadAll()).on("postgres_changes",{event:"*",schema:"public",table:"history"},()=>loadAll()).on("postgres_changes",{event:"*",schema:"public",table:"settings"},()=>loadAll()).subscribe();
    return()=>supabase.removeChannel(ch);
  },[]);

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);};
  const curRoundNum=Number(state.settings?.current_round)||1;
  const curRound=state.rounds.find(r=>r.round_num===curRoundNum);
  const curParticipants=state.settings?.current_participants||[];
  const totalPot=curParticipants.reduce((s,mid)=>{const m=state.members.find(x=>x.id===mid);return s+(m?Number(m.amt):0);},0);
  const curPaid=curRound?curRound.pays.filter(p=>p.paid).length:0;

  async function handleReset(type){
    setResetModal(false);
    try{
      if(type==="winners")await supabase.from("members").update({won_round:null}).neq("id","00000000-0000-0000-0000-000000000000");
      else if(type==="rounds"){await supabase.from("pays").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("rounds").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("members").update({won_round:null}).neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("settings").update({value:"1"}).eq("key","current_round");}
      else if(type==="history")await supabase.from("history").delete().neq("id","00000000-0000-0000-0000-000000000000");
      else if(type==="members"){await supabase.from("pays").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("rounds").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("members").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("settings").update({value:"1"}).eq("key","current_round");await supabase.from("settings").update({value:"[]"}).eq("key","current_participants");}
      else if(type==="full"){await supabase.from("pays").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("rounds").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("members").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("history").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("live_draw").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("settings").update({value:"1"}).eq("key","current_round");await supabase.from("settings").update({value:"[]"}).eq("key","current_participants");}
      showToast("✅ تمت العملية بنجاح");loadAll();
    }catch(e){showToast("خطأ: "+e.message,"error");}
  }

  async function addMember(name,phone,amt){
    await supabase.from("members").insert({name,phone,amt:Number(amt)});
    const{data:all}=await supabase.from("members").select("id");
    await supabase.from("settings").update({value:JSON.stringify((all||[]).map(x=>x.id))}).eq("key","current_participants");
    await supabase.from("history").insert({type:"join",text:"انضم "+name,amt:Number(amt)});
    showToast("تم إضافة "+name);
  }

  async function removeMember(mid,name){
    await supabase.from("members").delete().eq("id",mid);
    await supabase.from("history").insert({type:"leave",text:"غادر "+name,amt:0});
    showToast("تم الحذف");
  }

  // ══ LIVE DRAW — يُنشئ القرعة ويحتفظ بالرابط ثابتاً ══
  async function startLiveDraw(countdownSec=300){
    const eligible=curParticipants.filter(mid=>{const m=state.members.find(x=>x.id===mid);return m&&!m.won_round;});
    if(!eligible.length){showToast("لا يوجد مشاركون مؤهلون","error");return;}
    const parts=eligible.map(mid=>state.members.find(x=>x.id===mid)?.name||"").filter(Boolean);
    const now=new Date().toISOString();
    const{data:draw}=await supabase.from("live_draw").insert({round_num:curRoundNum,status:"waiting",participants:parts,current_name:"",winner_name:"",is_confirmed:false,countdown_seconds:countdownSec,countdown_start:countdownSec>0?now:null,viewers_count:0}).select().single();
    setLiveDraw(draw);
    setLiveModal({drawId:draw.id,shareToken:draw.share_token,countdownSec});
    showToast("📺 تم إنشاء رابط القرعة المباشرة!");
    // Auto-start draw when timer ends
    if(countdownSec>0){
      setTimeout(async()=>{
        const{data:current}=await supabase.from("live_draw").select("status").eq("id",draw.id).single();
        if(current?.status==="waiting"){
          // trigger draw automatically
          document.getElementById("auto-draw-btn-"+draw.id)?.click();
        }
      },(countdownSec*1000)+500);
    }
  }

  async function runLiveDraw(){
    if(!liveDraw)return;
    const parts=liveDraw.participants||[];
    const eligible=curParticipants.filter(mid=>{const m=state.members.find(x=>x.id===mid);return m&&!m.won_round;});
    await supabase.from("live_draw").update({status:"spinning",updated_at:new Date().toISOString()}).eq("id",liveDraw.id);
    setSpinning(true);setPendingWinner(null);
    let count=0,total=28+Math.floor(Math.random()*12);
    const interval=setInterval(async()=>{
      const name=parts[Math.floor(Math.random()*parts.length)];
      setSpinDisplay(name);
      await supabase.from("live_draw").update({current_name:name,updated_at:new Date().toISOString()}).eq("id",liveDraw.id);
      count++;
      if(count>=total){
        clearInterval(interval);
        const winMid=eligible[Math.floor(Math.random()*eligible.length)];
        const winner=state.members.find(x=>x.id===winMid);
        if(winner){
          await supabase.from("live_draw").update({status:"done",current_name:winner.name,winner_id:winner.id,winner_name:winner.name,updated_at:new Date().toISOString()}).eq("id",liveDraw.id);
          setSpinning(false);setSpinDisplay(winner.name);setPendingWinner(winner);
        }
      }
    },150);
    spinRef.current=interval;
  }

  // ══ تأكيد الفوز — يربط القرعة بالجولة ويبقي الرابط حياً ══
  async function confirmWin(winner,method){
    if(!winner)return;
    const{data:newRound}=await supabase.from("rounds").insert({round_num:curRoundNum,winner_id:winner.id,winner_name:winner.name,draw_method:method,date:tod(),participants:curParticipants}).select().single();
    const payRecs=curParticipants.map(mid=>{const m=state.members.find(x=>x.id===mid);return{round_id:newRound.id,member_id:mid,member_name:m?m.name:"",paid:false,amt:m?Number(m.amt):0};});
    await supabase.from("pays").insert(payRecs);
    await supabase.from("members").update({won_round:curRoundNum}).eq("id",winner.id);
    const{data:all}=await supabase.from("members").select("id");
    await supabase.from("settings").update({value:String(curRoundNum+1)}).eq("key","current_round");
    await supabase.from("settings").update({value:JSON.stringify((all||[]).map(x=>x.id))}).eq("key","current_participants");
    await supabase.from("history").insert({type:"win",text:"فاز "+winner.name+" بالجولة #"+curRoundNum,amt:totalPot});
    // ربط القرعة بالجولة وتحديث الحالة (الرابط يبقى ثابتاً)
    if(liveDraw){
      await supabase.from("live_draw").update({round_id:newRound.id,is_confirmed:true,status:"done",updated_at:new Date().toISOString()}).eq("id",liveDraw.id);
    }
    setPendingWinner(null);setSpinDisplay("");
    showToast("🏆 تم تسجيل فوز "+winner.name);
    // رابط المشاركة العادي للجولة
    setShareModal({roundId:newRound.id,shareToken:newRound.share_token});
    setLiveModal(prev=>prev?{...prev,confirmed:true}:null);
    setTab("rounds");
  }

  async function togglePay(payId,currentStatus,memberName,roundNum,amt){
    await supabase.from("pays").update({paid:!currentStatus,paid_date:!currentStatus?tod():null}).eq("id",payId);
    await supabase.from("history").insert({type:!currentStatus?"pay":"unpay",text:(!currentStatus?"دفع ":"إلغاء دفع ")+memberName+" للجولة #"+roundNum,amt:!currentStatus?amt:0});
  }

  async function addUser(name,phone,pin,role){await supabase.from("users").insert({name,phone,pin,role});showToast("تم إضافة "+name);}
  async function removeUser(uid){await supabase.from("users").delete().eq("id",uid);showToast("تم الحذف");}

  // ══ ROUTING ══
  if(viewType==="live"&&!loading)return <LiveDrawView/>;
  if(viewType==="round"&&!loading)return <PublicRoundView/>;
  if(loading)return <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",color:GM,fontSize:20}}>جاري التحميل...</div>;
  if(!currentUser)return <LoginScreen onLogin={u=>setCurrentUser(u)}/>;

  const isSuperAdmin=currentUser.role==="superadmin";
  const isAdmin=["superadmin","admin"].includes(currentUser.role);
  const isMember=currentUser.role==="member";
  const roleInfo=ROLES[currentUser.role]||ROLES.member;

  const TABS=[
    {id:"members",label:"الأعضاء",icon:"👥",show:!isMember},
    {id:"myinfo",label:"بياناتي",icon:"👤",show:isMember},
    {id:"newround",label:"جولة جديدة",icon:"🎲",show:isAdmin},
    {id:"pay",label:"المدفوعات",icon:"💳",show:!isMember},
    {id:"rounds",label:"سجل الجولات",icon:"📋",show:true},
    {id:"history",label:"المعاملات",icon:"🕐",show:!isMember},
    {id:"users",label:"المستخدمون",icon:"🔐",show:isSuperAdmin},
    {id:"reset",label:"إعادة التعيين",icon:"⚠️",show:isSuperAdmin},
  ].filter(t=>t.show);

  return(
    <div dir="rtl" style={{minHeight:"100vh",background:bg,fontFamily:"Tajawal,sans-serif",color:"#1A2E28",display:"flex"}}>
      {resetModal&&<ResetModal onClose={()=>setResetModal(false)} onReset={handleReset}/>}

      {/* LIVE MODAL */}
      {liveModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif"}} dir="rtl">
          <div style={{background:sf,borderRadius:20,padding:28,width:460,maxWidth:"95vw"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:44,marginBottom:8}}>📺</div>
              <h3 style={{fontSize:18,fontWeight:800,margin:0}}>القرعة المباشرة</h3>
              <p style={{color:"#5A7A72",fontSize:13,marginTop:6}}>الرابط ثابت — يشاهد المشاركون القرعة ثم المدفوعات</p>
            </div>
            {liveModal&&<ViewersCount drawId={liveModal.drawId}/>}
            {!spinning&&!pendingWinner&&!liveModal?.confirmed&&liveDraw&&(
              <TimerSelector drawId={liveDraw.id} onSet={async(sec)=>{
                const now=new Date().toISOString();
                await supabase.from("live_draw").update({countdown_seconds:sec,countdown_start:sec>0?now:null,updated_at:now}).eq("id",liveDraw.id);
                showToast(sec>0?"⏱️ تم تفعيل التايمر: "+Math.floor(sec/60)+" دقيقة":"تم إلغاء التايمر");
              }}/>)}

            {/* RINK DISPLAY */}
            {spinning&&(
              <div style={{background:"linear-gradient(135deg,#0F1923,#0a2820)",borderRadius:12,padding:16,marginBottom:14,textAlign:"center",border:"1px solid rgba(29,158,117,.3)"}}>
                <div style={{color:"#fff",fontSize:28,fontWeight:800,animation:"bounce .15s ease-in-out infinite"}}>{spinDisplay}</div>
                <div style={{color:GM,fontSize:12,marginTop:6}}>يشاهدها المشاركون الآن 🔴</div>
              </div>)}
            {pendingWinner&&!spinning&&(
              <div style={{background:GL,border:"2px solid "+GM,borderRadius:12,padding:14,marginBottom:14,textAlign:"center"}}>
                <div style={{fontSize:11,color:G,marginBottom:4}}>🏆 الفائز</div>
                <div style={{fontSize:26,fontWeight:800,color:GD}}>{pendingWinner.name}</div>
              </div>)}
            {!spinning&&!pendingWinner&&!liveModal.confirmed&&(
              <div style={{background:"#F0F7FF",borderRadius:10,padding:12,marginBottom:14,textAlign:"center"}}>
                <div style={{fontSize:13,color:"#1565C0"}}>⏳ المشاركون يشاهدون شاشة الانتظار</div>
              </div>)}
            {liveModal.confirmed&&(
              <div style={{background:GL,borderRadius:10,padding:12,marginBottom:14,textAlign:"center"}}>
                <div style={{fontSize:13,color:G}}>✅ الجولة مؤكدة — المشاركون يرون المدفوعات الآن</div>
              </div>)}

            {/* LINK */}
            <div style={{background:bg,borderRadius:10,padding:"10px 14px",marginBottom:14,wordBreak:"break-all",fontSize:11,color:"#5A7A72",border:"1px solid "+bd}}>{buildLiveLink(liveModal.drawId,liveModal.shareToken)}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <button onClick={()=>{navigator.clipboard.writeText(buildLiveLink(liveModal.drawId,liveModal.shareToken));showToast("تم نسخ رابط القرعة!");}} style={{padding:10,borderRadius:9,background:"#1565C0",color:"#fff",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>📋 نسخ الرابط</button>
              <button onClick={()=>window.open(buildLiveLink(liveModal.drawId,liveModal.shareToken),"_blank")} style={{padding:10,borderRadius:9,background:bg,color:"#5A7A72",fontSize:13,fontWeight:700,border:"1px solid "+bd,cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>👁️ معاينة</button>
            </div>

            {/* ACTIONS */}
            {!spinning&&!pendingWinner&&!liveModal.confirmed&&(
              <button onClick={runLiveDraw} style={{width:"100%",padding:13,borderRadius:10,background:"linear-gradient(135deg,#0F6E56,#1D9E75)",color:"#fff",fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif",marginBottom:8}}>🎲 ابدأ القرعة المباشرة</button>)}
            {pendingWinner&&!spinning&&!liveModal.confirmed&&(
              <button onClick={()=>confirmWin(pendingWinner,"live")} style={{width:"100%",padding:13,borderRadius:10,background:G,color:"#fff",fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif",marginBottom:8}}>✅ تأكيد وتسجيل الجولة</button>)}
            <button onClick={()=>{if(!spinning)setLiveModal(null);}} style={{width:"100%",padding:8,borderRadius:9,background:"transparent",color:"#8FADA6",fontSize:12,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>إغلاق النافذة (الرابط يبقى نشطاً)</button>
          </div>
        </div>)}

      {/* SHARE MODAL */}
      {shareModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center"}} dir="rtl">
          <div style={{background:sf,borderRadius:20,padding:28,width:420,maxWidth:"95vw"}}>
            <div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:48,marginBottom:8}}>🎉</div><h3 style={{fontSize:18,fontWeight:800,margin:0}}>تم تسجيل الجولة!</h3></div>
            <div style={{background:bg,borderRadius:10,padding:"12px 14px",marginBottom:16,wordBreak:"break-all",fontSize:11,color:"#5A7A72",border:"1px solid "+bd}}>{buildShareLink(shareModal.roundId,shareModal.shareToken)}</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{navigator.clipboard.writeText(buildShareLink(shareModal.roundId,shareModal.shareToken));showToast("تم النسخ!");}} style={{flex:1,padding:11,borderRadius:10,background:G,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>📋 نسخ الرابط</button>
              <button onClick={()=>setShareModal(null)} style={{flex:1,padding:11,borderRadius:10,background:bg,color:"#5A7A72",fontSize:14,fontWeight:700,border:"1px solid "+bd,cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>إغلاق</button>
            </div>
          </div>
        </div>)}

      <aside style={{width:230,background:G,display:"flex",flexDirection:"column",padding:"24px 0 16px",position:"fixed",right:0,top:0,bottom:0,zIndex:100,boxShadow:"4px 0 20px rgba(0,0,0,.15)"}}>
        <div style={{padding:"0 20px 20px",borderBottom:"1px solid rgba(255,255,255,.12)",marginBottom:14}}>
          <div style={{fontSize:26,marginBottom:4}}>🔄</div>
          <h1 style={{fontSize:17,fontWeight:700,color:"#fff",margin:0}}>الجمعية الدوّارة</h1>
          <p style={{fontSize:11,color:"rgba(255,255,255,.5)",margin:"2px 0 0"}}>إدارة المدخرات الجماعية</p>
        </div>
        <nav style={{flex:1}}>
          {TABS.map(t=>(
            <div key={t.id} onClick={()=>t.id==="reset"?setResetModal(true):setTab(t.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 20px",color:tab===t.id?"#fff":"rgba(255,255,255,.65)",cursor:"pointer",fontSize:14,fontWeight:500,borderRight:"3px solid "+(tab===t.id?"#fff":"transparent"),background:t.id==="reset"?"rgba(255,100,100,.15)":tab===t.id?"rgba(255,255,255,.14)":"transparent",transition:"all .18s"}}>
              <span style={{fontSize:16}}>{t.icon}</span>{t.label}
            </div>))}
        </nav>
        <div style={{padding:"14px 20px 0",borderTop:"1px solid rgba(255,255,255,.12)"}}>
          <div style={{background:"rgba(255,255,255,.12)",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
            <div style={{color:"#fff",fontSize:13,fontWeight:700}}>{currentUser.name}</div>
            <div style={{marginTop:4}}><span style={{fontSize:10,background:roleInfo.bg,color:roleInfo.color,padding:"2px 8px",borderRadius:10,fontWeight:700}}>{roleInfo.icon} {roleInfo.label}</span></div>
          </div>
          <button onClick={()=>setCurrentUser(null)} style={{width:"100%",background:"rgba(255,100,100,.2)",border:"1px solid rgba(255,100,100,.3)",color:"rgba(255,200,200,.9)",borderRadius:8,padding:"7px 12px",fontSize:12,cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>تسجيل الخروج</button>
        </div>
      </aside>

      <main style={{flex:1,marginRight:230,padding:28,minWidth:0}}>
        {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"#FCE4EC":GL,color:toast.type==="error"?"#880E4F":GD,padding:"12px 24px",borderRadius:12,fontWeight:700,fontSize:14,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,.15)"}}>{toast.msg}</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
          {[{label:"إجمالي الأعضاء",val:state.members.length,bg:GL,icon:"👥"},{label:"صندوق الجولة",val:totalPot.toLocaleString()+" ر.س",bg:"#FFF3E0",icon:"💰"},{label:"دفعوا / المشاركون",val:curPaid+"/"+(curRound?curRound.pays.length:0),bg:"#E3F2FD",icon:"✅"},{label:"الجولة الحالية",val:"#"+curRoundNum,bg:"#FCE4EC",icon:"🎯"}].map((k,i)=>(
            <div key={i} style={{background:sf,borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,.06)",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:11,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{k.icon}</div>
              <div><div style={{fontSize:20,fontWeight:700,lineHeight:1}}>{k.val}</div><div style={{fontSize:11,color:"#5A7A72",marginTop:3}}>{k.label}</div></div>
            </div>))}
        </div>
        {tab==="members"&&<MembersTab state={state} canWrite={canDo(currentUser,"members_write")} onAdd={addMember} onRemove={removeMember}/>}
        {tab==="myinfo"&&<MyInfoTab state={state} currentUser={currentUser}/>}
        {tab==="newround"&&<NewRoundTab state={state} curRoundNum={curRoundNum} curRound={curRound} curParticipants={curParticipants} totalPot={totalPot} drawMode={drawMode} setDrawMode={setDrawMode} pendingWinner={pendingWinner} setPendingWinner={setPendingWinner} spinning={spinning} spinDisplay={spinDisplay} onStartDraw={startLocalDraw} onStartLiveDraw={startLiveDraw} onConfirm={confirmWin} onUpdateParticipants={async ids=>{await supabase.from("settings").update({value:JSON.stringify(ids)}).eq("key","current_participants");}} liveDraw={liveDraw} liveModal={liveModal}/>}
        {tab==="pay"&&<PayTab state={state} canWrite={canDo(currentUser,"pays_write")} activePayRound={activePayRound} setActivePayRound={setActivePayRound} onToggle={togglePay} onPayAll={async(roundId,pays)=>{for(const p of pays){if(!p.paid)await supabase.from("pays").update({paid:true,paid_date:tod()}).eq("id",p.id);}showToast("تم تسجيل كل الدفعات");}}/>}
        {tab==="rounds"&&<RoundsTab state={state} onShare={r=>setShareModal({roundId:r.id,shareToken:r.share_token})}/>}
        {tab==="history"&&<HistoryTab state={state}/>}
        {tab==="users"&&isSuperAdmin&&<UsersTab state={state} currentUser={currentUser} onAdd={addUser} onRemove={removeUser}/>}
      </main>
    </div>);

  function startLocalDraw(){
    const eligible=curParticipants.filter(mid=>{const m=state.members.find(x=>x.id===mid);return m&&!m.won_round;});
    if(!eligible.length){showToast("لا يوجد مشاركون مؤهلون","error");return;}
    setSpinning(true);setPendingWinner(null);
    let count=0,total=20+Math.floor(Math.random()*15);
    spinRef.current=setInterval(()=>{
      const rid=eligible[Math.floor(Math.random()*eligible.length)];
      const m=state.members.find(x=>x.id===rid);
      setSpinDisplay(m?m.name:"");count++;
      if(count>=total){clearInterval(spinRef.current);setSpinning(false);const winner=state.members.find(x=>x.id===eligible[Math.floor(Math.random()*eligible.length)]);setPendingWinner(winner);setSpinDisplay(winner?winner.name:"");}
    },100);
  }
}

function MyInfoTab({state,currentUser}){
  const member=state.members.find(m=>m.phone===currentUser.phone);
  const myRounds=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===member?.id));
  const myPays=myRounds.map(r=>({...r,pay:r.pays.find(p=>p.member_id===member?.id)}));
  const totalPaid=myPays.reduce((s,r)=>s+(r.pay?.paid?Number(r.pay.amt):0),0);
  const totalDue=myPays.reduce((s,r)=>s+Number(r.pay?.amt||0),0);
  if(!member)return <div style={{textAlign:"center",padding:40,color:"#8FADA6"}}>لم يتم ربط حسابك بعضو بعد</div>;
  return(
    <div>
      <div style={{marginBottom:20}}><h2 style={{fontSize:21,fontWeight:700,margin:0}}>بياناتي</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[{label:"إجمالي مدفوع",val:totalPaid.toLocaleString()+" ر.س",bg:"#E8F5E9",icon:"✅"},{label:"إجمالي مستحق",val:totalDue.toLocaleString()+" ر.س",bg:"#FFF3E0",icon:"💰"},{label:"الجولات",val:myRounds.length+" جولة",bg:"#E3F2FD",icon:"📋"}].map((k,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,.06)",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:11,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{k.icon}</div>
            <div><div style={{fontSize:18,fontWeight:700}}>{k.val}</div><div style={{fontSize:11,color:"#5A7A72",marginTop:3}}>{k.label}</div></div>
          </div>))}
      </div>
      <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>سجل مدفوعاتي</div>
        {!myPays.length&&<div style={{textAlign:"center",padding:28,color:"#8FADA6"}}>لا توجد جولات بعد</div>}
        {myPays.map(r=>(
          <div key={r.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #E2EAE7"}}>
            <div><div style={{fontWeight:700,fontSize:14}}>الجولة #{r.round_num} {r.winner_id===member.id?"🏆":""}</div><div style={{fontSize:12,color:"#5A7A72"}}>{r.date}</div></div>
            <span style={{fontSize:12,padding:"3px 10px",borderRadius:20,fontWeight:700,background:r.pay?.paid?"#E8F5E9":"#FFF3E0",color:r.pay?.paid?"#2E7D32":"#E65100"}}>{r.pay?.paid?"✓ دفعت":"⏳ لم أدفع"}</span>
          </div>))}
      </div>
    </div>);
}

function MembersTab({state,canWrite,onAdd,onRemove}){
  const [name,setName]=useState("");const [phone,setPhone]=useState("");const [amt,setAmt]=useState("");
  const medals=["🥇","🥈","🥉"];
  const sorted=[...state.members].sort((a,b)=>{const pA=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===a.id&&p.paid)).length,tA=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===a.id)).length,pB=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===b.id&&p.paid)).length,tB=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===b.id)).length;return(tB?pB/tB:0)-(tA?pA/tA:0);});
  return(
    <div>
      <div style={{marginBottom:20}}><h2 style={{fontSize:21,fontWeight:700,margin:0}}>الأعضاء</h2></div>
      {canWrite&&(
        <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>إضافة عضو جديد</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:10,alignItems:"end"}}>
            {[["الاسم",name,setName,"محمد علي"],["رقم الجوال",phone,setPhone,"05xxxxxxxx"],["المبلغ الشهري",amt,setAmt,"500"]].map(([lbl,val,set,ph])=>(
              <div key={lbl}><label style={{display:"block",fontSize:12,fontWeight:700,color:"#5A7A72",marginBottom:4}}>{lbl}</label><input value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={{width:"100%",padding:"9px 12px",border:"1px solid #E2EAE7",borderRadius:8,fontSize:14,fontFamily:"Tajawal,sans-serif",direction:"rtl",boxSizing:"border-box",outline:"none"}}/></div>))}
            <button onClick={()=>{if(!name||!phone||!amt)return;onAdd(name,phone,amt);setName("");setPhone("");setAmt("");}} style={{padding:"9px 20px",borderRadius:8,background:"#0F6E56",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif",whiteSpace:"nowrap"}}>+ إضافة</button>
          </div>
        </div>)}
      <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        {!sorted.length&&<div style={{textAlign:"center",padding:32,color:"#8FADA6"}}>لا يوجد أعضاء بعد</div>}
        {sorted.map((m,rank)=>{
          const ci=state.members.indexOf(m)%6,paidCount=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===m.id&&p.paid)).length,partCount=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===m.id)).length,pct=partCount?Math.round(paidCount/partCount*100):0;
          return(
            <div key={m.id} style={{border:"1px solid #E2EAE7",borderRadius:10,padding:"13px 15px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:9}}>
                <span style={{width:24,height:24,display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:"#F5F7F6",fontSize:rank<3?14:11,color:"#5A7A72",fontWeight:700}}>{rank<3?medals[rank]:rank+1}</span>
                <div style={{width:40,height:40,borderRadius:"50%",background:AVBG[ci][0],color:AVBG[ci][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>{ini(m.name)}</div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{m.name}</div><div style={{fontSize:12,color:"#5A7A72"}}>{m.phone} · {Number(m.amt).toLocaleString()} ر.س/شهر</div></div>
                {m.won_round&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:20,fontWeight:700,background:"#E3F2FD",color:"#1565C0"}}>🏆 #{m.won_round}</span>}
                {canWrite&&<button onClick={()=>{if(window.confirm("حذف "+m.name+"؟"))onRemove(m.id,m.name);}} style={{padding:"3px 10px",borderRadius:6,background:"#FCE4EC",color:"#880E4F",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>حذف</button>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{flex:1,height:5,background:"#EBF2EF",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:"#1D9E75",borderRadius:3,width:pct+"%"}}/></div>
                <span style={{fontSize:11,color:"#5A7A72"}}>{paidCount}/{partCount}</span>
              </div>
            </div>);})}
      </div>
    </div>);
}

function NewRoundTab({state,curRoundNum,curRound,curParticipants,totalPot,drawMode,setDrawMode,pendingWinner,setPendingWinner,spinning,spinDisplay,onStartDraw,onStartLiveDraw,onConfirm,onUpdateParticipants,liveDraw,liveModal}){
  const eligible=curParticipants.filter(mid=>{const m=state.members.find(x=>x.id===mid);return m&&!m.won_round;});
  if(curRound)return <div style={{background:"#fff",borderRadius:14,padding:28,maxWidth:500}}><div style={{background:"#E3F2FD",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#1565C0"}}>الجولة #{curRound.round_num} مكتملة — الفائز: <strong>{curRound.winner_name}</strong></div></div>;
  return(
    <div>
      <div style={{marginBottom:20}}><h2 style={{fontSize:21,fontWeight:700,margin:0}}>إعداد الجولة #{curRoundNum}</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* PARTICIPANTS */}
        <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14,display:"flex",justifyContent:"space-between"}}>المشاركون
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>onUpdateParticipants(state.members.map(m=>m.id))} style={{padding:"4px 10px",borderRadius:6,background:"#E1F5EE",color:"#0F6E56",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>الكل</button>
              <button onClick={()=>onUpdateParticipants([])} style={{padding:"4px 10px",borderRadius:6,background:"#F5F7F6",color:"#5A7A72",fontSize:12,border:"1px solid #E2EAE7",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>إلغاء</button>
            </div>
          </div>
          {state.members.map(m=>{const ci=state.members.indexOf(m)%6,checked=curParticipants.includes(m.id);return(
            <div key={m.id} onClick={()=>{const n=checked?curParticipants.filter(x=>x!==m.id):[...curParticipants,m.id];onUpdateParticipants(n);}} style={{border:"2px solid "+(checked?"#0F6E56":"#E2EAE7"),borderRadius:8,padding:"10px 13px",marginBottom:7,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:checked?"#E1F5EE":"transparent"}}>
              <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(checked?"#0F6E56":"#E2EAE7"),display:"flex",alignItems:"center",justifyContent:"center",background:checked?"#0F6E56":"transparent",color:"#fff",fontSize:11,flexShrink:0}}>{checked?"✓":""}</div>
              <div style={{width:34,height:34,borderRadius:"50%",background:AVBG[ci][0],color:AVBG[ci][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{ini(m.name)}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div><div style={{fontSize:11,color:"#5A7A72"}}>{Number(m.amt).toLocaleString()} ر.س</div></div>
              {m.won_round&&<span style={{fontSize:10,background:"#E3F2FD",color:"#1565C0",padding:"1px 6px",borderRadius:8,fontWeight:700,flexShrink:0}}>فاز</span>}
            </div>);})}
          <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #E2EAE7",display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:"#5A7A72"}}>الإجمالي:</span>
            <span style={{fontWeight:700}}>{totalPot.toLocaleString()} ر.س ({curParticipants.length})</span>
          </div>
        </div>

        {/* DRAW METHOD */}
        <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>طريقة القرعة</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            {[["random","🎲","قرعة عشوائية","يراها المدير فقط","#0F6E56"],["live","📺","قرعة مباشرة 🔴","يشاهدها الجميع في نفس الوقت","#1565C0"],["manual","🤝","اختيار بالتراضي","اختر الفائز يدوياً","#6A1B9A"]].map(([m,ic,lb,desc,col])=>(
              <button key={m} onClick={()=>{setDrawMode(m);if(m==="live"&&drawMode!=="live")onStartLiveDraw();}} style={{padding:"12px 14px",borderRadius:10,background:drawMode===m?col:"#F5F7F6",color:drawMode===m?"#fff":"#5A7A72",fontSize:13,fontWeight:700,border:"2px solid "+(drawMode===m?col:"#E2EAE7"),cursor:"pointer",fontFamily:"Tajawal,sans-serif",display:"flex",alignItems:"center",gap:10,textAlign:"right"}}>
                <span style={{fontSize:22,flexShrink:0}}>{ic}</span>
                <div><div>{lb}</div><div style={{fontSize:11,opacity:.7,fontWeight:400,marginTop:2}}>{desc}</div></div>
              </button>))}
          </div>

          {drawMode==="random"&&(
            <div style={{textAlign:"center"}}>
              <div onClick={!spinning?onStartDraw:undefined} style={{width:78,height:78,borderRadius:"50%",border:"3px solid #0F6E56",background:"#E1F5EE",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",cursor:spinning?"not-allowed":"pointer",fontSize:32,animation:spinning?"spin .12s linear infinite":"none"}}>🎲</div>
              <div style={{fontSize:15,fontWeight:700,color:"#0F6E56",minHeight:22}}>{spinDisplay}</div>
            </div>)}
          {drawMode==="manual"&&eligible.map(mid=>{const m=state.members.find(x=>x.id===mid);if(!m)return null;const ci=state.members.indexOf(m)%6,isSel=pendingWinner?.id===mid;return(<div key={mid} onClick={()=>setPendingWinner(m)} style={{border:"2px solid "+(isSel?"#0F6E56":"#E2EAE7"),borderRadius:8,padding:"10px 12px",marginBottom:7,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:isSel?"#E1F5EE":"transparent"}}><div style={{width:32,height:32,borderRadius:"50%",background:AVBG[ci][0],color:AVBG[ci][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{ini(m.name)}</div><div style={{flex:1,fontWeight:700,fontSize:13}}>{m.name}</div>{isSel&&<span style={{color:"#0F6E56",flexShrink:0}}>✓</span>}</div>);})}
          {drawMode==="live"&&liveModal&&<div style={{background:"#E3F2FD",borderRadius:10,padding:12,textAlign:"center",fontSize:13,color:"#1565C0"}}>📺 رابط القرعة نشط — انظر النافذة المفتوحة</div>}

          {pendingWinner&&drawMode!=="live"&&(
            <div style={{marginTop:12}}>
              <div style={{background:"#E1F5EE",border:"2px solid #1D9E75",borderRadius:10,padding:12,marginBottom:10,textAlign:"center"}}>
                <div style={{fontSize:11,color:"#0F6E56",marginBottom:3}}>🏆 الفائز</div>
                <div style={{fontSize:20,fontWeight:800,color:"#085041"}}>{pendingWinner.name}</div>
              </div>
              <button onClick={()=>onConfirm(pendingWinner,drawMode)} style={{width:"100%",padding:11,borderRadius:10,background:"#0F6E56",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>✅ تأكيد وبدء الجولة التالية</button>
            </div>)}
        </div>
      </div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>);
}

function PayTab({state,canWrite,activePayRound,setActivePayRound,onToggle,onPayAll}){
  const curRoundNum=activePayRound??(state.rounds.length?state.rounds[state.rounds.length-1].round_num:null);
  const round=state.rounds.find(r=>r.round_num===curRoundNum);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontSize:21,fontWeight:700,margin:0}}>المدفوعات</h2>
        {round&&canWrite&&<button onClick={()=>onPayAll(round.id,round.pays)} style={{padding:"8px 16px",borderRadius:8,background:"#E1F5EE",color:"#0F6E56",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>تحديد الكل مدفوع</button>}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {[...state.rounds].reverse().map(r=><button key={r.round_num} onClick={()=>setActivePayRound(r.round_num)} style={{padding:"5px 14px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",border:"1px solid "+(r.round_num===curRoundNum?"#0F6E56":"#E2EAE7"),background:r.round_num===curRoundNum?"#0F6E56":"#F5F7F6",color:r.round_num===curRoundNum?"#fff":"#5A7A72",fontFamily:"Tajawal,sans-serif"}}>جولة #{r.round_num}</button>)}
      </div>
      {!round&&<div style={{textAlign:"center",padding:40,color:"#8FADA6"}}>لا توجد جولات بعد</div>}
      {round&&(
        <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>دفعات الجولة #{round.round_num}</div>
          <div style={{fontSize:12,color:"#5A7A72",marginBottom:14}}>الفائز: <strong>{round.winner_name}</strong> · {round.pays.filter(p=>p.paid).length}/{round.pays.length} دفعوا</div>
          {round.pays.map(pay=>(
            <div key={pay.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #E2EAE7"}}>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{pay.member_name}</div><div style={{fontSize:12,color:"#5A7A72"}}>{Number(pay.amt).toLocaleString()} ر.س{pay.paid_date?" · "+pay.paid_date:""}</div></div>
              {canWrite?<button onClick={()=>onToggle(pay.id,pay.paid,pay.member_name,round.round_num,pay.amt)} style={{padding:"6px 16px",borderRadius:8,background:pay.paid?"#E1F5EE":"#FFF3E0",color:pay.paid?"#085041":"#E65100",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>{pay.paid?"✓ دفع":"تسجيل الدفع"}</button>:<span style={{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:700,background:pay.paid?"#E8F5E9":"#FFF3E0",color:pay.paid?"#2E7D32":"#E65100"}}>{pay.paid?"✓":"⏳"}</span>}
            </div>))}
          <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #E2EAE7",display:"flex",justifyContent:"space-between",fontSize:13,color:"#5A7A72"}}>
            <span>إجمالي المحصّل:</span><span style={{fontWeight:700,color:"#0F6E56"}}>{round.pays.filter(p=>p.paid).reduce((s,p)=>s+Number(p.amt),0).toLocaleString()} ر.س</span>
          </div>
        </div>)}
    </div>);
}

function RoundsTab({state,onShare}){
  const [sel,setSel]=useState(null);const selRound=state.rounds.find(r=>r.round_num===sel);
  return(
    <div>
      <div style={{marginBottom:20}}><h2 style={{fontSize:21,fontWeight:700,margin:0}}>سجل الجولات</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          {!state.rounds.length&&<div style={{textAlign:"center",padding:28,color:"#8FADA6"}}>لا توجد جولات بعد</div>}
          {[...state.rounds].reverse().map(r=>{const paidCount=r.pays.filter(p=>p.paid).length;return(
            <div key={r.round_num} onClick={()=>setSel(r.round_num)} style={{border:"1px solid "+(r.round_num===sel?"#0F6E56":"#E2EAE7"),borderRadius:10,padding:"13px 15px",marginBottom:9,cursor:"pointer",background:r.round_num===sel?"#E1F5EE":"transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:14,fontWeight:700}}>الجولة #{r.round_num}</span>
                {r.share_token&&<button onClick={e=>{e.stopPropagation();onShare(r);}} style={{padding:"2px 8px",borderRadius:6,background:"#E3F2FD",color:"#1565C0",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>🔗 مشاركة</button>}
              </div>
              <div style={{fontSize:13,color:"#5A7A72",marginTop:4}}>🏆 {r.winner_name} · {r.date}</div>
              <div style={{fontSize:12,color:"#8FADA6",marginTop:2}}>{paidCount}/{r.pays.length} دفعوا</div>
            </div>);})}
        </div>
        {selRound&&(
          <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",boxShadow:"0 4px 16px rgba(0,0,0,.08)",borderRight:"4px solid #1D9E75"}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>تفاصيل الجولة #{selRound.round_num}</div>
            <div style={{fontSize:12,color:"#5A7A72",marginBottom:16}}>الفائز: <strong style={{color:"#0F6E56"}}>{selRound.winner_name}</strong></div>
            {selRound.pays.map(pay=>(
              <div key={pay.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #E2EAE7",fontSize:13}}>
                <div style={{flex:1,fontWeight:700}}>{pay.member_name}</div>
                <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:700,background:pay.paid?"#E1F5EE":"#FFF3E0",color:pay.paid?"#085041":"#E65100"}}>{pay.paid?"✓":"لم يدفع"}</span>
                <span style={{fontWeight:700}}>{Number(pay.amt).toLocaleString()} ر.س</span>
              </div>))}
          </div>)}
      </div>
    </div>);
}

function HistoryTab({state}){
  const typeMap={join:["👤","#E8F5E9","#2E7D32"],leave:["🚪","#FCE4EC","#880E4F"],win:["🏆","#E3F2FD","#1565C0"],pay:["💰","#E1F5EE","#085041"],unpay:["↩️","#FFF3E0","#E65100"]};
  return(
    <div>
      <div style={{marginBottom:20}}><h2 style={{fontSize:21,fontWeight:700,margin:0}}>سجل المعاملات</h2></div>
      <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        {!state.hist.length&&<div style={{textAlign:"center",padding:32,color:"#8FADA6"}}>لا توجد معاملات بعد</div>}
        {state.hist.map(h=>{const[ico,hbg,tc]=typeMap[h.type]||["📌","#F5F7F6","#5A7A72"];return(
          <div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #E2EAE7"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:8,background:hbg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{ico}</div>
              <div><div style={{fontSize:13,fontWeight:600}}>{h.text}</div><div style={{fontSize:11,color:"#8FADA6"}}>{h.date}</div></div>
            </div>
            {h.amt>0&&<span style={{fontWeight:700,fontSize:14,color:tc}}>{Number(h.amt).toLocaleString()} ر.س</span>}
          </div>);})}
      </div>
    </div>);
}

function UsersTab({state,currentUser,onAdd,onRemove}){
  const [name,setName]=useState("");const [phone,setPhone]=useState("");const [pin,setPin]=useState("");const [role,setRole]=useState("member");
  return(
    <div>
      <div style={{marginBottom:20}}><h2 style={{fontSize:21,fontWeight:700,margin:0}}>إدارة المستخدمين</h2></div>
      <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>إضافة مستخدم جديد</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 120px 160px auto",gap:10,alignItems:"end"}}>
          {[["الاسم",name,setName,"الاسم"],["الجوال",phone,setPhone,"05xxxxxxxx"],["PIN",pin,setPin,"1234"]].map(([lbl,val,set,ph])=>(
            <div key={lbl}><label style={{display:"block",fontSize:12,fontWeight:700,color:"#5A7A72",marginBottom:4}}>{lbl}</label><input value={val} onChange={e=>set(e.target.value)} placeholder={ph} type={lbl==="PIN"?"password":"text"} style={{width:"100%",padding:"9px 12px",border:"1px solid #E2EAE7",borderRadius:8,fontSize:14,fontFamily:"Tajawal,sans-serif",direction:"rtl",boxSizing:"border-box",outline:"none"}}/></div>))}
          <div><label style={{display:"block",fontSize:12,fontWeight:700,color:"#5A7A72",marginBottom:4}}>الصلاحية</label>
            <select value={role} onChange={e=>setRole(e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1px solid #E2EAE7",borderRadius:8,fontSize:14,fontFamily:"Tajawal,sans-serif",direction:"rtl",outline:"none"}}>
              <option value="admin">مدير 🔑</option><option value="accountant">محاسب 💼</option><option value="member">عضو 👤</option>
            </select>
          </div>
          <button onClick={()=>{if(!name||!phone||!pin)return;onAdd(name,phone,pin,role);setName("");setPhone("");setPin("");setRole("member");}} style={{padding:"9px 20px",borderRadius:8,background:"#0F6E56",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif",whiteSpace:"nowrap"}}>+ إضافة</button>
        </div>
      </div>
      <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        {(state.users||[]).map(u=>{const ri=ROLES[u.role]||ROLES.member;return(
          <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:"1px solid #E2EAE7"}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:ri.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{ri.icon}</div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{u.name}{u.id===currentUser.id?<span style={{fontSize:10,background:"#E1F5EE",color:"#085041",padding:"1px 7px",borderRadius:10,fontWeight:700,marginRight:6}}>أنت</span>:null}</div><div style={{fontSize:12,color:"#5A7A72"}}>{u.phone}</div></div>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:700,background:ri.bg,color:ri.color}}>{ri.label}</span>
            {u.id!==currentUser.id&&u.role!=="superadmin"&&<button onClick={()=>{if(window.confirm("حذف "+u.name+"؟"))onRemove(u.id);}} style={{padding:"4px 12px",borderRadius:6,background:"#FCE4EC",color:"#880E4F",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>حذف</button>}
          </div>);})}
      </div>
    </div>);
}
