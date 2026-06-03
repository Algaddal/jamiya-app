const fs = require('fs');
const code = `import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const ini = n => n ? n.trim().split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "??";
const tod = () => new Date().toLocaleDateString("ar-SA");
const AVBG = [["#E8F5E9","#2E7D32"],["#E3F2FD","#1565C0"],["#FFF3E0","#E65100"],["#F3E5F5","#6A1B9A"],["#FCE4EC","#880E4F"],["#E0F7FA","#00695C"]];
const G="#0F6E56",GM="#1D9E75",GL="#E1F5EE",GD="#085041",sf="#fff",bg="#F5F7F6",bd="#E2EAE7";

const ROLES = {
  superadmin:{ label:"Super Admin", icon:"👑", color:"#E65100", bg:"#FFF3E0" },
  admin:     { label:"مدير",        icon:"🔑", color:"#1565C0", bg:"#E3F2FD" },
  accountant:{ label:"محاسب",      icon:"💼", color:"#6A1B9A", bg:"#F3E5F5" },
  member:    { label:"عضو",        icon:"👤", color:"#2E7D32", bg:"#E8F5E9"  }
};
const canDo=(user,action)=>{const r=user?.role;switch(action){case"reset":return r==="superadmin";case"manage_users":return r==="superadmin";case"rounds":return["superadmin","admin"].includes(r);case"members_write":return["superadmin","admin"].includes(r);case"pays_write":return["superadmin","admin","accountant"].includes(r);default:return false;}};

function buildShareLink(rid,token){return window.location.href.split("?")[0]+"?view=round&rid="+rid+"&token="+token;}
function buildLiveLink(drawId,token){return window.location.href.split("?")[0]+"?view=live&did="+drawId+"&token="+token;}
function parseShareParams(){const p=new URLSearchParams(window.location.search);if(p.get("view")==="round")return{type:"round",rid:p.get("rid"),token:p.get("token")};if(p.get("view")==="live")return{type:"live",did:p.get("did"),token:p.get("token")};return null;}

// ══ LIVE DRAW VIEW (ما يراه المشارك) ══
function LiveDrawView(){
  const p=new URLSearchParams(window.location.search);
  const did=p.get("did"),token=p.get("token");
  const [draw,setDraw]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    supabase.from("live_draw").select("*").eq("id",did).eq("share_token",token).single().then(({data})=>{setDraw(data);setLoading(false);});
    const ch=supabase.channel("live-"+did).on("postgres_changes",{event:"UPDATE",schema:"public",table:"live_draw",filter:"id=eq."+did},({new:d})=>setDraw(d)).subscribe();
    return()=>supabase.removeChannel(ch);
  },[did]);

  if(loading)return <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",color:GM,fontSize:20}}>جاري التحميل...</div>;
  if(!draw)return <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",color:"#fff",fontSize:20}}>🔒 رابط غير صحيح</div>;

  const parts=draw.participants||[];
  const isSpinning=draw.status==="spinning";
  const isDone=draw.status==="done";

  return(
    <div dir="rtl" style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a1628 0%,#0F1923 50%,#0a2820 100%)",fontFamily:"Tajawal,sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{maxWidth:500,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:52,marginBottom:8}}>🎰</div>
          <h1 style={{color:GM,fontSize:28,fontWeight:800,margin:0}}>قرعة الجمعية الدوّارة</h1>
          <p style={{color:"rgba(255,255,255,.5)",fontSize:14,marginTop:6}}>الجولة #{draw.round_num} · شاهد القرعة مباشرة</p>
        </div>

        {/* DRUM MACHINE */}
        <div style={{background:"rgba(255,255,255,.04)",border:"2px solid rgba(29,158,117,.3)",borderRadius:24,padding:32,marginBottom:24,textAlign:"center",position:"relative",overflow:"hidden"}}>
          {isSpinning&&<div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(15,110,86,.1),rgba(29,158,117,.05))",animation:"pulse 1s ease-in-out infinite"}}/>}
          
          <div style={{fontSize:isDone?80:isSpinning?60:50,marginBottom:16,transition:"font-size .3s",filter:isSpinning?"drop-shadow(0 0 20px #1D9E75)":"none"}}>
            {isDone?"🏆":isSpinning?"🎲":"⏳"}
          </div>

          <div style={{minHeight:60,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {draw.status==="waiting"&&(
              <div style={{color:"rgba(255,255,255,.5)",fontSize:18}}>في انتظار بدء القرعة...</div>)}
            {isSpinning&&(
              <div style={{color:"#fff",fontSize:32,fontWeight:800,letterSpacing:2,animation:"bounce .15s ease-in-out infinite",textShadow:"0 0 30px #1D9E75"}}>{draw.current_name}</div>)}
            {isDone&&(
              <div style={{textAlign:"center"}}>
                <div style={{color:"rgba(255,255,255,.6)",fontSize:14,marginBottom:6}}>🎊 الفائز هو</div>
                <div style={{color:"#fff",fontSize:36,fontWeight:800,textShadow:"0 0 40px #FFD700"}}>{draw.winner_name}</div>
              </div>)}
          </div>

          {isSpinning&&(
            <div style={{marginTop:16,display:"flex",justifyContent:"center",gap:6}}>
              {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:GM,animation:"dot "+(.6+i*.2)+"s ease-in-out infinite alternate"}}/>)}
            </div>)}
        </div>

        {/* PARTICIPANTS */}
        <div style={{background:"rgba(255,255,255,.04)",borderRadius:16,padding:"18px 20px"}}>
          <div style={{color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:700,marginBottom:14,textAlign:"center"}}>
            {isDone?"نتيجة القرعة":"المشاركون في القرعة"} · {parts.length} مشارك
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
            {parts.map((name,i)=>{
              const isWinner=isDone&&name===draw.winner_name;
              const isActive=isSpinning&&name===draw.current_name;
              return(
                <div key={i} style={{background:isWinner?"linear-gradient(135deg,#0F6E56,#1D9E75)":isActive?"rgba(29,158,117,.3)":"rgba(255,255,255,.06)",borderRadius:10,padding:"10px 12px",textAlign:"center",transition:"all .2s",border:isActive?"2px solid #1D9E75":"2px solid transparent",transform:isWinner?"scale(1.05)":"scale(1)"}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:AVBG[i%6][0],color:AVBG[i%6][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,margin:"0 auto 6px"}}>{ini(name)}</div>
                  <div style={{color:isWinner||isActive?"#fff":"rgba(255,255,255,.7)",fontSize:12,fontWeight:isWinner?700:400}}>{name}</div>
                  {isWinner&&<div style={{fontSize:16,marginTop:4}}>🏆</div>}
                </div>);})}
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:20,color:"rgba(255,255,255,.2)",fontSize:11}}>الجمعية الدوّارة · قرعة مباشرة</div>
      </div>
      <style>{"@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}@keyframes bounce{from{transform:scale(1)}to{transform:scale(1.05)}}@keyframes dot{from{opacity:.3;transform:scale(.8)}to{opacity:1;transform:scale(1.2)}}"}</style>
    </div>);
}

// ══ PUBLIC ROUND VIEW ══
function PublicRoundView(){
  const p=new URLSearchParams(window.location.search);
  const rid=p.get("rid"),token=p.get("token");
  const [round,setRound]=useState(null);
  const [pays,setPays]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    Promise.all([
      supabase.from("rounds").select("*").eq("id",rid).eq("share_token",token).single(),
      supabase.from("pays").select("*").eq("round_id",rid)
    ]).then(([{data:r},{data:ps}])=>{setRound(r);setPays(ps||[]);setLoading(false);});
    const ch=supabase.channel("pub-"+rid).on("postgres_changes",{event:"*",schema:"public",table:"pays",filter:"round_id=eq."+rid},({new:p2})=>setPays(prev=>prev.map(p=>p.id===p2.id?p2:p))).subscribe();
    return()=>supabase.removeChannel(ch);
  },[rid]);

  if(loading)return <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",color:GM,fontSize:20}}>جاري التحميل...</div>;
  if(!round)return <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",color:"#fff",fontSize:20}}>🔒 رابط غير صحيح</div>;

  const totalPot=pays.reduce((s,p)=>s+Number(p.amt),0);
  const paidCount=pays.filter(p=>p.paid).length;
  return(
    <div dir="rtl" style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F1923,#1A2E28)",fontFamily:"Tajawal,sans-serif",padding:24}}>
      <div style={{maxWidth:480,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:32,paddingTop:20}}>
          <div style={{fontSize:48,marginBottom:8}}>🔄</div>
          <h1 style={{color:GM,fontSize:26,fontWeight:800,margin:0}}>الجمعية الدوّارة</h1>
          <p style={{color:"rgba(255,255,255,.5)",fontSize:13,marginTop:4}}>الجولة #{round.round_num}</p>
        </div>
        {round.winner_id?(
          <div style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)",borderRadius:20,padding:"24px 28px",marginBottom:20,textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:8}}>🏆</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:13,marginBottom:4}}>الفائز بهذه الجولة</div>
            <div style={{color:"#fff",fontSize:28,fontWeight:800}}>{round.winner_name}</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:14,marginTop:8}}>إجمالي المبلغ: <strong style={{color:"#fff"}}>{totalPot.toLocaleString()} ر.س</strong></div>
          </div>):(
          <div style={{background:"rgba(255,255,255,.05)",border:"2px dashed rgba(255,255,255,.15)",borderRadius:20,padding:28,textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:36,marginBottom:8}}>⏳</div>
            <div style={{color:"rgba(255,255,255,.6)",fontSize:16}}>لم يتم اختيار الفائز بعد</div>
          </div>)}
        <div style={{background:"rgba(255,255,255,.05)",borderRadius:16,padding:"18px 20px"}}>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:13,fontWeight:700,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span>المشاركون</span><span style={{color:GM}}>دفعوا {paidCount} من {pays.length}</span>
          </div>
          {pays.map((pay,i)=>(
            <div key={pay.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:AVBG[i%6][0],color:AVBG[i%6][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>{ini(pay.member_name||"")}</div>
              <div style={{flex:1}}>
                <div style={{color:"#fff",fontSize:14,fontWeight:700}}>{pay.member_name} {round.winner_id===pay.member_id?"🏆":""}</div>
                <div style={{color:"rgba(255,255,255,.4)",fontSize:12}}>{Number(pay.amt).toLocaleString()} ر.س</div>
              </div>
              <span style={{fontSize:12,padding:"3px 10px",borderRadius:20,fontWeight:700,background:pay.paid?"#E8F5E9":"#FFF3E0",color:pay.paid?"#2E7D32":"#E65100"}}>{pay.paid?"✓ دفع":"⏳ لم يدفع"}</span>
            </div>))}
        </div>
        <div style={{textAlign:"center",marginTop:24,color:"rgba(255,255,255,.25)",fontSize:11}}>نظام الجمعية الدوّارة · هذا الرابط للعرض فقط</div>
      </div>
    </div>);
}

// ══ LOGIN ══
function LoginScreen({onLogin}){
  const [phone,setPhone]=useState("");const [pin,setPin]=useState("");const [err,setErr]=useState("");const [loading,setLoading]=useState(false);
  async function handleLogin(){
    setLoading(true);setErr("");
    const{data}=await supabase.from("users").select("*").eq("phone",phone).eq("pin",pin).single();
    if(data)onLogin(data);else setErr("رقم الجوال أو الرمز السري غير صحيح");
    setLoading(false);
  }
  return(
    <div dir="rtl" style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F1923,#1A2E28)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",padding:16}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:80,height:80,borderRadius:24,background:"linear-gradient(135deg,#0F6E56,#1D9E75)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:36}}>🔄</div>
          <h1 style={{color:"#fff",fontSize:28,fontWeight:800,margin:0}}>الجمعية الدوّارة</h1>
          <p style={{color:"rgba(255,255,255,.4)",fontSize:13,marginTop:6}}>إدارة المدخرات الجماعية</p>
        </div>
        <div style={{background:"rgba(255,255,255,.07)",borderRadius:20,padding:28,border:"1px solid rgba(255,255,255,.1)"}}>
          <div style={{marginBottom:16}}>
            <label style={{color:"rgba(255,255,255,.6)",fontSize:12,fontWeight:700,display:"block",marginBottom:6}}>رقم الجوال</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="05xxxxxxxx" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{width:"100%",padding:"12px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.08)",color:"#fff",fontSize:16,fontFamily:"Tajawal,sans-serif",outline:"none",boxSizing:"border-box",direction:"rtl"}}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{color:"rgba(255,255,255,.6)",fontSize:12,fontWeight:700,display:"block",marginBottom:6}}>الرمز السري</label>
            <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{width:"100%",padding:"12px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.08)",color:"#fff",fontSize:20,fontFamily:"Tajawal,sans-serif",outline:"none",boxSizing:"border-box",direction:"rtl",letterSpacing:4}}/>
          </div>
          {err&&<div style={{background:"#FCE4EC",color:"#880E4F",borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:16,textAlign:"center"}}>{err}</div>}
          <button onClick={handleLogin} disabled={loading} style={{width:"100%",padding:13,borderRadius:12,background:"linear-gradient(135deg,#0F6E56,#1D9E75)",color:"#fff",fontSize:16,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>{loading?"جاري التحقق...":"تسجيل الدخول"}</button>
        </div>
      </div>
    </div>);
}

// ══ RESET MODAL ══
function ResetModal({onClose,onReset}){
  const [selected,setSelected]=useState(null);
  const options=[
    {id:"winners", label:"إعادة تعيين الفائزين",    icon:"🔄",desc:"يمسح won_round فقط — البيانات تبقى",   color:"#E3F2FD",tc:"#1565C0"},
    {id:"rounds",  label:"Reset الجولات والمدفوعات",icon:"🗑️",desc:"يحذف الجولات ويبدأ من #1",              color:"#FFF3E0",tc:"#E65100"},
    {id:"history", label:"Reset سجل المعاملات",     icon:"📋",desc:"يمسح سجل المعاملات فقط",                color:"#F3E5F5",tc:"#6A1B9A"},
    {id:"members", label:"Reset الأعضاء",           icon:"👥",desc:"يحذف كل الأعضاء",                       color:"#FCE4EC",tc:"#880E4F"},
    {id:"full",    label:"Reset كامل للنظام",       icon:"⚠️",desc:"يمسح كل شيء ويبدأ من الصفر",           color:"#FFEBEE",tc:"#C62828"},
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif"}} dir="rtl">
      <div style={{background:sf,borderRadius:20,padding:28,width:460,maxWidth:"95vw"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{fontSize:18,fontWeight:800,margin:0,color:"#C62828"}}>⚠️ إعادة تعيين النظام</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#5A7A72"}}>×</button>
        </div>
        {options.map(o=>(
          <div key={o.id} onClick={()=>setSelected(o.id)} style={{border:"2px solid "+(selected===o.id?"#C62828":bd),borderRadius:10,padding:"12px 14px",marginBottom:8,cursor:"pointer",background:selected===o.id?o.color:"transparent",transition:"all .15s"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>{o.icon}</span>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,color:selected===o.id?o.tc:"#1A2E28"}}>{o.label}</div><div style={{fontSize:12,color:"#5A7A72",marginTop:2}}>{o.desc}</div></div>
              {selected===o.id&&<span style={{color:"#C62828",fontSize:18}}>✓</span>}
            </div>
          </div>))}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={()=>{if(!selected)return;const op=options.find(o=>o.id===selected);if(window.confirm("هل أنت متأكد من "+op.label+"؟ لا يمكن التراجع."))onReset(selected);}} disabled={!selected} style={{flex:1,padding:11,borderRadius:10,background:selected?"#C62828":"#ccc",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:selected?"pointer":"not-allowed",fontFamily:"Tajawal,sans-serif"}}>تنفيذ العملية</button>
          <button onClick={onClose} style={{flex:1,padding:11,borderRadius:10,background:bg,color:"#5A7A72",fontSize:14,fontWeight:700,border:"1px solid "+bd,cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>إلغاء</button>
        </div>
      </div>
    </div>);
}

// ══ MAIN APP ══
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
  const shareParams=parseShareParams();

  useEffect(()=>{loadAll();},[]);

  async function loadAll(){
    setLoading(true);
    const[{data:members},{data:rounds},{data:hist},{data:settings},{data:pays},{data:users}]=await Promise.all([
      supabase.from("members").select("*").order("created_at"),
      supabase.from("rounds").select("*").order("round_num"),
      supabase.from("history").select("*").order("created_at",{ascending:false}),
      supabase.from("settings").select("*"),
      supabase.from("pays").select("*"),
      supabase.from("users").select("*")
    ]);
    const sObj={};(settings||[]).forEach(s=>{try{sObj[s.key]=JSON.parse(s.value);}catch{sObj[s.key]=s.value;}});
    const pObj={};(pays||[]).forEach(p=>{if(!pObj[p.round_id])pObj[p.round_id]=[];pObj[p.round_id].push(p);});
    const roundsWithPays=(rounds||[]).map(r=>({...r,pays:(pObj[r.id]||[])}));
    setState({members:members||[],rounds:roundsWithPays,hist:hist||[],settings:sObj,pays:pObj,users:users||[]});
    setLoading(false);
  }

  useEffect(()=>{
    const ch=supabase.channel("all")
      .on("postgres_changes",{event:"*",schema:"public",table:"members"},()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"rounds"},()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"pays"},()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"history"},()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"settings"},()=>loadAll())
      .subscribe();
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
      if(type==="winners"){await supabase.from("members").update({won_round:null}).neq("id","00000000-0000-0000-0000-000000000000");showToast("✅ تم إعادة تعيين الفائزين");}
      else if(type==="rounds"){await supabase.from("pays").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("rounds").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("members").update({won_round:null}).neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("settings").update({value:"1"}).eq("key","current_round");showToast("✅ تم Reset الجولات");}
      else if(type==="history"){await supabase.from("history").delete().neq("id","00000000-0000-0000-0000-000000000000");showToast("✅ تم مسح السجل");}
      else if(type==="members"){await supabase.from("pays").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("rounds").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("members").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("settings").update({value:"1"}).eq("key","current_round");await supabase.from("settings").update({value:"[]"}).eq("key","current_participants");showToast("✅ تم حذف الأعضاء");}
      else if(type==="full"){await supabase.from("pays").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("rounds").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("members").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("history").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("live_draw").delete().neq("id","00000000-0000-0000-0000-000000000000");await supabase.from("settings").update({value:"1"}).eq("key","current_round");await supabase.from("settings").update({value:"[]"}).eq("key","current_participants");showToast("✅ تم Reset كامل");}
      loadAll();
    }catch(e){showToast("خطأ: "+e.message,"error");}
  }

  async function addMember(name,phone,amt){
    await supabase.from("members").insert({name,phone,amt:Number(amt)});
    const{data:all}=await supabase.from("members").select("id");
    const ids=(all||[]).map(x=>x.id);
    await supabase.from("settings").update({value:JSON.stringify(ids)}).eq("key","current_participants");
    await supabase.from("history").insert({type:"join",text:"انضم "+name,amt:Number(amt)});
    showToast("تم إضافة "+name);
  }

  async function removeMember(mid,name){
    await supabase.from("members").delete().eq("id",mid);
    await supabase.from("history").insert({type:"leave",text:"غادر "+name,amt:0});
    showToast("تم الحذف");
  }

  // ══ LIVE DRAW FUNCTIONS ══
  async function startLiveDraw(){
    const eligible=curParticipants.filter(mid=>{const m=state.members.find(x=>x.id===mid);return m&&!m.won_round;});
    if(!eligible.length){showToast("لا يوجد مشاركون مؤهلون","error");return;}
    const parts=eligible.map(mid=>state.members.find(x=>x.id===mid)?.name||"").filter(Boolean);
    const{data:draw}=await supabase.from("live_draw").insert({round_num:curRoundNum,status:"waiting",participants:parts,current_name:"",winner_name:""}).select().single();
    setLiveDraw(draw);
    setLiveModal({drawId:draw.id,shareToken:draw.share_token});
  }

  async function runLiveDraw(){
    if(!liveDraw)return;
    const eligible=curParticipants.filter(mid=>{const m=state.members.find(x=>x.id===mid);return m&&!m.won_round;});
    const parts=liveDraw.participants||[];
    await supabase.from("live_draw").update({status:"spinning"}).eq("id",liveDraw.id);
    setSpinning(true);setPendingWinner(null);
    let count=0,total=25+Math.floor(Math.random()*15);
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

  async function confirmWin(winner,method){
    if(!winner)return;
    const{data:newRound}=await supabase.from("rounds").insert({round_num:curRoundNum,winner_id:winner.id,winner_name:winner.name,draw_method:method,date:tod(),participants:curParticipants}).select().single();
    const payRecs=curParticipants.map(mid=>{const m=state.members.find(x=>x.id===mid);return{round_id:newRound.id,member_id:mid,member_name:m?m.name:"",paid:false,amt:m?Number(m.amt):0};});
    await supabase.from("pays").insert(payRecs);
    await supabase.from("members").update({won_round:curRoundNum}).eq("id",winner.id);
    const{data:all}=await supabase.from("members").select("id");
    const ids=(all||[]).map(x=>x.id);
    await supabase.from("settings").update({value:String(curRoundNum+1)}).eq("key","current_round");
    await supabase.from("settings").update({value:JSON.stringify(ids)}).eq("key","current_participants");
    await supabase.from("history").insert({type:"win",text:"فاز "+winner.name+" بالجولة #"+curRoundNum,amt:totalPot});
    if(liveDraw)await supabase.from("live_draw").delete().eq("id",liveDraw.id);
    setLiveDraw(null);setPendingWinner(null);setSpinDisplay("");setLiveModal(null);
    showToast("🏆 تم تسجيل فوز "+winner.name);
    setShareModal({roundId:newRound.id,shareToken:newRound.share_token});
    setTab("rounds");
  }

  async function togglePay(payId,currentStatus,memberName,roundNum,amt){
    await supabase.from("pays").update({paid:!currentStatus,paid_date:!currentStatus?tod():null}).eq("id",payId);
    await supabase.from("history").insert({type:!currentStatus?"pay":"unpay",text:(!currentStatus?"دفع ":"إلغاء دفع ")+memberName+" للجولة #"+roundNum,amt:!currentStatus?amt:0});
  }

  async function addUser(name,phone,pin,role){await supabase.from("users").insert({name,phone,pin,role});showToast("تم إضافة "+name);}
  async function removeUser(uid){await supabase.from("users").delete().eq("id",uid);showToast("تم الحذف");}

  if(shareParams?.type==="live"&&!loading)return <LiveDrawView/>;
  if(shareParams?.type==="round"&&!loading)return <PublicRoundView/>;
  if(loading)return <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",color:GM,fontSize:20}}>جاري التحميل...</div>;
  if(!currentUser)return <LoginScreen onLogin={u=>setCurrentUser(u)}/>;

  const isSuperAdmin=currentUser.role==="superadmin";
  const isAdmin=["superadmin","admin"].includes(currentUser.role);
  const isMember=currentUser.role==="member";

  const TABS=[
    {id:"members", label:"الأعضاء",       icon:"👥",show:!isMember},
    {id:"myinfo",  label:"بياناتي",        icon:"👤",show:isMember},
    {id:"newround",label:"جولة جديدة",    icon:"🎲",show:isAdmin},
    {id:"pay",     label:"المدفوعات",      icon:"💳",show:!isMember},
    {id:"rounds",  label:"سجل الجولات",   icon:"📋",show:true},
    {id:"history", label:"المعاملات",      icon:"🕐",show:!isMember},
    {id:"users",   label:"المستخدمون",    icon:"🔐",show:isSuperAdmin},
    {id:"reset",   label:"إعادة التعيين", icon:"⚠️",show:isSuperAdmin},
  ].filter(t=>t.show);

  const roleInfo=ROLES[currentUser.role]||ROLES.member;

  return(
    <div dir="rtl" style={{minHeight:"100vh",background:bg,fontFamily:"Tajawal,sans-serif",color:"#1A2E28",display:"flex"}}>
      {resetModal&&<ResetModal onClose={()=>setResetModal(false)} onReset={handleReset}/>}

      {/* LIVE MODAL */}
      {liveModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif"}} dir="rtl">
          <div style={{background:sf,borderRadius:20,padding:28,width:440,maxWidth:"95vw"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:48,marginBottom:8}}>🎰</div>
              <h3 style={{fontSize:18,fontWeight:800,margin:0}}>القرعة المباشرة جاهزة!</h3>
              <p style={{color:"#5A7A72",fontSize:13,marginTop:6}}>شارك الرابط مع المشاركين ليشاهدوا القرعة مباشرة</p>
            </div>
            <div style={{background:bg,borderRadius:10,padding:"12px 14px",marginBottom:16,wordBreak:"break-all",fontSize:11,color:"#5A7A72",border:"1px solid "+bd}}>{buildLiveLink(liveModal.drawId,liveModal.shareToken)}</div>
            <div style={{display:"flex",gap:10,marginBottom:12}}>
              <button onClick={()=>{navigator.clipboard.writeText(buildLiveLink(liveModal.drawId,liveModal.shareToken));showToast("تم نسخ رابط القرعة!");}} style={{flex:1,padding:11,borderRadius:10,background:"#1565C0",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>📋 نسخ الرابط</button>
              <button onClick={()=>window.open(buildLiveLink(liveModal.drawId,liveModal.shareToken),"_blank")} style={{flex:1,padding:11,borderRadius:10,background:bg,color:"#5A7A72",fontSize:14,fontWeight:700,border:"1px solid "+bd,cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>👁️ معاينة</button>
            </div>
            {!spinning&&!pendingWinner&&(
              <button onClick={runLiveDraw} style={{width:"100%",padding:13,borderRadius:10,background:"linear-gradient(135deg,#0F6E56,#1D9E75)",color:"#fff",fontSize:16,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>🎲 ابدأ القرعة المباشرة</button>)}
            {spinning&&(
              <div style={{textAlign:"center",padding:16,background:GL,borderRadius:10}}>
                <div style={{fontSize:24,fontWeight:700,color:G}}>{spinDisplay}</div>
                <div style={{fontSize:12,color:"#5A7A72",marginTop:4}}>القرعة تدور... يشاهدها المشاركون الآن</div>
              </div>)}
            {pendingWinner&&!spinning&&(
              <div>
                <div style={{textAlign:"center",padding:16,background:GL,borderRadius:10,marginBottom:12}}>
                  <div style={{fontSize:13,color:G,marginBottom:4}}>🏆 الفائز</div>
                  <div style={{fontSize:24,fontWeight:800,color:GD}}>{pendingWinner.name}</div>
                </div>
                <button onClick={()=>confirmWin(pendingWinner,"live")} style={{width:"100%",padding:13,borderRadius:10,background:G,color:"#fff",fontSize:15,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>✅ تأكيد وتسجيل الجولة</button>
              </div>)}
            <button onClick={()=>{if(!pendingWinner&&!spinning)setLiveModal(null);}} style={{width:"100%",padding:9,borderRadius:10,background:"transparent",color:"#8FADA6",fontSize:13,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif",marginTop:8}}>إغلاق</button>
          </div>
        </div>)}

      {/* SHARE MODAL */}
      {shareModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center"}} dir="rtl">
          <div style={{background:sf,borderRadius:20,padding:28,width:420,maxWidth:"95vw"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:48,marginBottom:8}}>🎉</div>
              <h3 style={{fontSize:18,fontWeight:800,margin:0}}>تم تسجيل الجولة!</h3>
              <p style={{color:"#5A7A72",fontSize:13,marginTop:6}}>شارك رابط نتيجة الجولة مع المشاركين</p>
            </div>
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
        {tab==="newround"&&<NewRoundTab state={state} curRoundNum={curRoundNum} curRound={curRound} curParticipants={curParticipants} totalPot={totalPot} drawMode={drawMode} setDrawMode={setDrawMode} pendingWinner={pendingWinner} setPendingWinner={setPendingWinner} spinning={spinning} spinDisplay={spinDisplay} onStartDraw={startDraw} onStartLiveDraw={startLiveDraw} onConfirm={confirmWin} onUpdateParticipants={async ids=>{await supabase.from("settings").update({value:JSON.stringify(ids)}).eq("key","current_participants");}} liveDraw={liveDraw}/>}
        {tab==="pay"&&<PayTab state={state} canWrite={canDo(currentUser,"pays_write")} activePayRound={activePayRound} setActivePayRound={setActivePayRound} onToggle={togglePay} onPayAll={async(roundId,pays)=>{for(const p of pays){if(!p.paid)await supabase.from("pays").update({paid:true,paid_date:tod()}).eq("id",p.id);}showToast("تم تسجيل كل الدفعات");}}/>}
        {tab==="rounds"&&<RoundsTab state={state} onShare={r=>setShareModal({roundId:r.id,shareToken:r.share_token})}/>}
        {tab==="history"&&<HistoryTab state={state}/>}
        {tab==="users"&&isSuperAdmin&&<UsersTab state={state} currentUser={currentUser} onAdd={addUser} onRemove={removeUser}/>}
      </main>
    </div>);

  function startDraw(){
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
        <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>الأعضاء ({sorted.length})</div>
        {!sorted.length&&<div style={{textAlign:"center",padding:32,color:"#8FADA6"}}>لا يوجد أعضاء بعد</div>}
        {sorted.map((m,rank)=>{
          const ci=state.members.indexOf(m)%6,paidCount=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===m.id&&p.paid)).length,partCount=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===m.id)).length,pct=partCount?Math.round(paidCount/partCount*100):0;
          return(
            <div key={m.id} style={{border:"1px solid #E2EAE7",borderRadius:10,padding:"13px 15px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:9}}>
                <span style={{width:24,height:24,display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:"#F5F7F6",fontSize:rank<3?14:11,color:"#5A7A72",fontWeight:700}}>{rank<3?["🥇","🥈","🥉"][rank]:rank+1}</span>
                <div style={{width:40,height:40,borderRadius:"50%",background:AVBG[ci][0],color:AVBG[ci][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>{ini(m.name)}</div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{m.name}</div><div style={{fontSize:12,color:"#5A7A72"}}>{m.phone} · {Number(m.amt).toLocaleString()} ر.س/شهر</div></div>
                {m.won_round&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:20,fontWeight:700,background:"#E3F2FD",color:"#1565C0"}}>🏆 فاز #{m.won_round}</span>}
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

function NewRoundTab({state,curRoundNum,curRound,curParticipants,totalPot,drawMode,setDrawMode,pendingWinner,setPendingWinner,spinning,spinDisplay,onStartDraw,onStartLiveDraw,onConfirm,onUpdateParticipants,liveDraw}){
  const eligible=curParticipants.filter(mid=>{const m=state.members.find(x=>x.id===mid);return m&&!m.won_round;});
  if(curRound)return(<div style={{background:"#fff",borderRadius:14,padding:28,maxWidth:500}}><div style={{background:"#E3F2FD",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#1565C0"}}>الجولة #{curRound.round_num} مكتملة — الفائز: <strong>{curRound.winner_name}</strong></div></div>);
  return(
    <div>
      <div style={{marginBottom:20}}><h2 style={{fontSize:21,fontWeight:700,margin:0}}>إعداد الجولة #{curRoundNum}</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14,display:"flex",justifyContent:"space-between"}}>المشاركون
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>onUpdateParticipants(state.members.map(m=>m.id))} style={{padding:"4px 10px",borderRadius:6,background:"#E1F5EE",color:"#0F6E56",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>الكل</button>
              <button onClick={()=>onUpdateParticipants([])} style={{padding:"4px 10px",borderRadius:6,background:"#F5F7F6",color:"#5A7A72",fontSize:12,border:"1px solid #E2EAE7",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>إلغاء</button>
            </div>
          </div>
          {state.members.map(m=>{const ci=state.members.indexOf(m)%6,checked=curParticipants.includes(m.id);return(
            <div key={m.id} onClick={()=>{const n=checked?curParticipants.filter(x=>x!==m.id):[...curParticipants,m.id];onUpdateParticipants(n);}} style={{border:"2px solid "+(checked?"#0F6E56":"#E2EAE7"),borderRadius:8,padding:"11px 14px",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:11,background:checked?"#E1F5EE":"transparent"}}>
              <div style={{width:20,height:20,borderRadius:5,border:"2px solid "+(checked?"#0F6E56":"#E2EAE7"),display:"flex",alignItems:"center",justifyContent:"center",background:checked?"#0F6E56":"transparent",color:"#fff",fontSize:13}}>{checked?"✓":""}</div>
              <div style={{width:36,height:36,borderRadius:"50%",background:AVBG[ci][0],color:AVBG[ci][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{ini(m.name)}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{m.name}</div><div style={{fontSize:12,color:"#5A7A72"}}>{Number(m.amt).toLocaleString()} ر.س</div></div>
              {m.won_round&&<span style={{fontSize:10,background:"#E3F2FD",color:"#1565C0",padding:"1px 7px",borderRadius:10,fontWeight:700}}>فاز</span>}
            </div>);})}
          <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #E2EAE7",display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:"#5A7A72"}}>الإجمالي:</span>
            <span style={{fontWeight:700,fontSize:16}}>{totalPot.toLocaleString()} ر.س ({curParticipants.length} مشارك)</span>
          </div>
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>اختيار طريقة القرعة</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10,marginBottom:16}}>
            <button onClick={()=>setDrawMode("random")} style={{padding:14,borderRadius:10,background:drawMode==="random"?"#0F6E56":"#F5F7F6",color:drawMode==="random"?"#fff":"#5A7A72",fontSize:14,fontWeight:700,border:"2px solid "+(drawMode==="random"?"#0F6E56":"#E2EAE7"),cursor:"pointer",fontFamily:"Tajawal,sans-serif",textAlign:"right",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:24}}>🎲</span><div><div>قرعة عشوائية محلية</div><div style={{fontSize:11,opacity:.7,fontWeight:400}}>يراها المدير فقط</div></div>
            </button>
            <button onClick={()=>{setDrawMode("live");if(drawMode!=="live"&&curParticipants.length>0)onStartLiveDraw();}} style={{padding:14,borderRadius:10,background:drawMode==="live"?"linear-gradient(135deg,#1565C0,#1976D2)":"#F5F7F6",color:drawMode==="live"?"#fff":"#5A7A72",fontSize:14,fontWeight:700,border:"2px solid "+(drawMode==="live"?"#1565C0":"#E2EAE7"),cursor:"pointer",fontFamily:"Tajawal,sans-serif",textAlign:"right",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:24}}>📺</span><div><div>قرعة مباشرة 🔴</div><div style={{fontSize:11,opacity:.7,fontWeight:400}}>يشاهدها الجميع في نفس الوقت</div></div>
            </button>
            <button onClick={()=>setDrawMode("manual")} style={{padding:14,borderRadius:10,background:drawMode==="manual"?"#6A1B9A":"#F5F7F6",color:drawMode==="manual"?"#fff":"#5A7A72",fontSize:14,fontWeight:700,border:"2px solid "+(drawMode==="manual"?"#6A1B9A":"#E2EAE7"),cursor:"pointer",fontFamily:"Tajawal,sans-serif",textAlign:"right",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:24}}>🤝</span><div><div>اختيار بالتراضي</div><div style={{fontSize:11,opacity:.7,fontWeight:400}}>اختر الفائز يدوياً</div></div>
            </button>
          </div>
          {drawMode==="random"&&(
            <div style={{textAlign:"center"}}>
              <div onClick={!spinning?onStartDraw:undefined} style={{width:80,height:80,borderRadius:"50%",border:"3px solid #0F6E56",background:"#E1F5EE",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",cursor:spinning?"not-allowed":"pointer",fontSize:34,animation:spinning?"spin .12s linear infinite":"none"}}>🎲</div>
              <div style={{fontSize:16,fontWeight:700,color:"#0F6E56",minHeight:24}}>{spinDisplay}</div>
            </div>)}
          {drawMode==="manual"&&eligible.map(mid=>{const m=state.members.find(x=>x.id===mid);if(!m)return null;const ci=state.members.indexOf(m)%6,isSel=pendingWinner?.id===mid;return(<div key={mid} onClick={()=>setPendingWinner(m)} style={{border:"2px solid "+(isSel?"#0F6E56":"#E2EAE7"),borderRadius:8,padding:"10px 13px",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:isSel?"#E1F5EE":"transparent"}}><div style={{width:34,height:34,borderRadius:"50%",background:AVBG[ci][0],color:AVBG[ci][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{ini(m.name)}</div><div style={{flex:1,fontWeight:700,fontSize:14}}>{m.name}</div>{isSel&&<span style={{color:"#0F6E56"}}>✓</span>}</div>);})}
          {pendingWinner&&drawMode!=="live"&&(
            <div>
              <div style={{background:"#E1F5EE",border:"2px solid #1D9E75",borderRadius:10,padding:14,margin:"12px 0"}}>
                <div style={{fontSize:11,color:"#0F6E56",marginBottom:4}}>🏆 الفائز</div>
                <div style={{fontSize:20,fontWeight:800,color:"#085041"}}>{pendingWinner.name}</div>
              </div>
              <button onClick={()=>onConfirm(pendingWinner,drawMode)} style={{width:"100%",padding:11,borderRadius:10,background:"#0F6E56",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>✅ تأكيد وبدء الجولة التالية</button>
            </div>)}
          {drawMode==="live"&&liveDraw&&<div style={{background:"#E3F2FD",borderRadius:10,padding:12,fontSize:13,color:"#1565C0",textAlign:"center"}}>📺 القرعة المباشرة نشطة — راجع النافذة المفتوحة</div>}
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
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{pay.member_name}</div><div style={{fontSize:12,color:"#5A7A72"}}>{Number(pay.amt).toLocaleString()} ر.س {pay.paid_date?"· "+pay.paid_date:""}</div></div>
              {canWrite?<button onClick={()=>onToggle(pay.id,pay.paid,pay.member_name,round.round_num,pay.amt)} style={{padding:"6px 16px",borderRadius:8,background:pay.paid?"#E1F5EE":"#FFF3E0",color:pay.paid?"#085041":"#E65100",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>{pay.paid?"✓ دفع":"تسجيل الدفع"}</button>:<span style={{fontSize:12,padding:"3px 10px",borderRadius:20,fontWeight:700,background:pay.paid?"#E8F5E9":"#FFF3E0",color:pay.paid?"#2E7D32":"#E65100"}}>{pay.paid?"✓ دفع":"⏳"}</span>}
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
`;

fs.writeFileSync('src/App.jsx', code);
console.log('✅ App.jsx written! Lines: ' + code.split('\n').length);
