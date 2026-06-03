import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const ini = n => n ? n.trim().split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "??";
const tod = () => new Date().toLocaleDateString("ar-SA");
const AVBG = [["#E8F5E9","#2E7D32"],["#E3F2FD","#1565C0"],["#FFF3E0","#E65100"],["#F3E5F5","#6A1B9A"],["#FCE4EC","#880E4F"],["#E0F7FA","#00695C"]];
const G="#0F6E56",GM="#1D9E75",GL="#E1F5EE",GD="#085041",sf="#fff",bg="#F5F7F6",bd="#E2EAE7";

function buildShareLink(rid,token){return window.location.href.split("?")[0]+"?view=round&rid="+rid+"&token="+token;}
function parseShareParams(){const p=new URLSearchParams(window.location.search);if(p.get("view")==="round")return{rid:p.get("rid"),token:p.get("token")};return null;}

function PublicRoundView({state}){
  const params=parseShareParams();
  if(!params)return null;
  const round=state.rounds.find(r=>r.id===params.rid);
  if(!round||round.share_token!==params.token)return(
    <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif"}}>
      <div style={{color:"#fff",textAlign:"center"}}><div style={{fontSize:48}}>🔒</div><div style={{fontSize:20,marginTop:16}}>رابط غير صحيح</div></div>
    </div>);
  const totalPot=round.pays.reduce((s,p)=>s+p.amt,0);
  const paidCount=round.pays.filter(p=>p.paid).length;
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
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          {[{label:"المشاركون",val:round.pays.length+" عضو",icon:"👥"},{label:"دفعوا",val:paidCount+"/"+round.pays.length,icon:"✅"},{label:"صندوق الجولة",val:totalPot.toLocaleString()+" ر.س",icon:"💰"},{label:"تاريخ البدء",val:round.date,icon:"📅"}].map((s,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,.06)",borderRadius:14,padding:"16px 18px"}}>
              <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
              <div style={{color:"#fff",fontWeight:700,fontSize:18}}>{s.val}</div>
              <div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginTop:2}}>{s.label}</div>
            </div>))}
        </div>
        <div style={{background:"rgba(255,255,255,.05)",borderRadius:16,padding:"18px 20px"}}>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:13,fontWeight:700,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span>المشاركون</span><span style={{color:GM}}>دفعوا {paidCount} من {round.pays.length}</span>
          </div>
          {round.pays.map((pay,i)=>(
            <div key={pay.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:AVBG[i%6][0],color:AVBG[i%6][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>{ini(pay.member_name||"")}</div>
              <div style={{flex:1}}>
                <div style={{color:"#fff",fontSize:14,fontWeight:700}}>{pay.member_name} {round.winner_id===pay.member_id?"🏆":""}</div>
                <div style={{color:"rgba(255,255,255,.4)",fontSize:12}}>{pay.amt.toLocaleString()} ر.س</div>
              </div>
              <span style={{fontSize:12,padding:"3px 10px",borderRadius:20,fontWeight:700,background:pay.paid?"#E8F5E9":"#FFF3E0",color:pay.paid?"#2E7D32":"#E65100"}}>{pay.paid?"✓ دفع":"⏳ لم يدفع"}</span>
            </div>))}
        </div>
        <div style={{textAlign:"center",marginTop:24,color:"rgba(255,255,255,.25)",fontSize:11}}>نظام الجمعية الدوّارة · هذا الرابط للعرض فقط</div>
      </div>
    </div>);
}

function LoginScreen({onLogin}){
  const [phone,setPhone]=useState("");
  const [pin,setPin]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
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
          <div style={{marginTop:16,textAlign:"center",color:"rgba(255,255,255,.3)",fontSize:11}}>المدير: 0500000000 · PIN: 1234</div>
        </div>
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
  const [drawMode,setDrawMode]=useState("random");
  const [pendingWinner,setPendingWinner]=useState(null);
  const [spinning,setSpinning]=useState(false);
  const [spinDisplay,setSpinDisplay]=useState("");
  const [activePayRound,setActivePayRound]=useState(null);
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
    const sObj={};
    (settings||[]).forEach(s=>{try{sObj[s.key]=JSON.parse(s.value);}catch{sObj[s.key]=s.value;}});
    const pObj={};
    (pays||[]).forEach(p=>{if(!pObj[p.round_id])pObj[p.round_id]=[];pObj[p.round_id].push(p);});
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

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const isAdmin=currentUser?.role==="admin";
  const curRoundNum=Number(state.settings?.current_round)||1;
  const curRound=state.rounds.find(r=>r.round_num===curRoundNum);
  const curParticipants=state.settings?.current_participants||[];
  const totalPot=curParticipants.reduce((s,mid)=>{const m=state.members.find(x=>x.id===mid);return s+(m?Number(m.amt):0);},0);
  const curPaid=curRound?curRound.pays.filter(p=>p.paid).length:0;

  async function addMember(name,phone,amt){
    const{data:m}=await supabase.from("members").insert({name,phone,amt:Number(amt)}).select().single();
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

  function startDraw(){
    const eligible=curParticipants.filter(mid=>{const m=state.members.find(x=>x.id===mid);return m&&!m.won_round;});
    if(!eligible.length){showToast("لا يوجد مشاركون مؤهلون","error");return;}
    setSpinning(true);setPendingWinner(null);
    let count=0,total=20+Math.floor(Math.random()*15);
    spinRef.current=setInterval(()=>{
      const rid=eligible[Math.floor(Math.random()*eligible.length)];
      const m=state.members.find(x=>x.id===rid);
      setSpinDisplay(m?m.name:"");count++;
      if(count>=total){
        clearInterval(spinRef.current);setSpinning(false);
        const winner=state.members.find(x=>x.id===eligible[Math.floor(Math.random()*eligible.length)]);
        setPendingWinner(winner);setSpinDisplay(winner?winner.name:"");
      }
    },100);
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
    setPendingWinner(null);setSpinDisplay("");
    showToast("🏆 تم تسجيل فوز "+winner.name);
    setShareModal({roundId:newRound.id,shareToken:newRound.share_token});
    setTab("rounds");
  }

  async function togglePay(payId,currentStatus,memberName,roundNum,amt){
    await supabase.from("pays").update({paid:!currentStatus,paid_date:!currentStatus?tod():null}).eq("id",payId);
    await supabase.from("history").insert({type:!currentStatus?"pay":"unpay",text:(!currentStatus?"دفع ":"إلغاء دفع ")+memberName+" للجولة #"+roundNum,amt:!currentStatus?amt:0});
  }

  async function addUser(name,phone,pin,role){
    await supabase.from("users").insert({name,phone,pin,role});
    showToast("تم إضافة "+name);
  }

  async function removeUser(uid){
    await supabase.from("users").delete().eq("id",uid);
    showToast("تم الحذف");
  }

  if(shareParams&&!loading)return <PublicRoundView state={state}/>;
  if(loading)return <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",color:GM,fontSize:20}}>جاري التحميل...</div>;
  if(!currentUser)return <LoginScreen onLogin={u=>setCurrentUser(u)}/>;

  const TABS=[{id:"members",label:"الأعضاء",icon:"👥",admin:false},{id:"newround",label:"جولة جديدة",icon:"🎲",admin:true},{id:"pay",label:"المدفوعات",icon:"💳",admin:true},{id:"rounds",label:"سجل الجولات",icon:"📋",admin:false},{id:"history",label:"المعاملات",icon:"🕐",admin:false},{id:"users",label:"المستخدمون",icon:"🔐",admin:true}].filter(t=>!t.admin||isAdmin);

  return(
    <div dir="rtl" style={{minHeight:"100vh",background:bg,fontFamily:"Tajawal,sans-serif",color:"#1A2E28",display:"flex"}}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet"/>
      <aside style={{width:230,background:G,display:"flex",flexDirection:"column",padding:"24px 0 16px",position:"fixed",right:0,top:0,bottom:0,zIndex:100,boxShadow:"4px 0 20px rgba(0,0,0,.15)"}}>
        <div style={{padding:"0 20px 20px",borderBottom:"1px solid rgba(255,255,255,.12)",marginBottom:14}}>
          <div style={{fontSize:26,marginBottom:4}}>🔄</div>
          <h1 style={{fontSize:17,fontWeight:700,color:"#fff",margin:0}}>الجمعية الدوّارة</h1>
          <p style={{fontSize:11,color:"rgba(255,255,255,.5)",margin:"2px 0 0"}}>إدارة المدخرات الجماعية</p>
        </div>
        <nav style={{flex:1}}>
          {TABS.map(t=>(
            <div key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 20px",color:tab===t.id?"#fff":"rgba(255,255,255,.65)",cursor:"pointer",fontSize:14,fontWeight:500,borderRight:"3px solid "+(tab===t.id?"#fff":"transparent"),background:tab===t.id?"rgba(255,255,255,.14)":"transparent",transition:"all .18s"}}>
              <span style={{fontSize:16}}>{t.icon}</span>{t.label}
            </div>))}
        </nav>
        <div style={{padding:"14px 20px 0",borderTop:"1px solid rgba(255,255,255,.12)"}}>
          <div style={{background:"rgba(255,255,255,.12)",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
            <div style={{color:"#fff",fontSize:13,fontWeight:700}}>{currentUser.name}</div>
            <div style={{color:"rgba(255,255,255,.5)",fontSize:11,marginTop:2}}>{isAdmin?"مدير":"مشترك"}</div>
          </div>
          <button onClick={()=>setCurrentUser(null)} style={{width:"100%",background:"rgba(255,100,100,.2)",border:"1px solid rgba(255,100,100,.3)",color:"rgba(255,200,200,.9)",borderRadius:8,padding:"7px 12px",fontSize:12,cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>تسجيل الخروج</button>
        </div>
      </aside>
      <main style={{flex:1,marginRight:230,padding:28,minWidth:0}}>
        {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"#FCE4EC":GL,color:toast.type==="error"?"#880E4F":GD,padding:"12px 24px",borderRadius:12,fontWeight:700,fontSize:14,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,.15)",border:"2px solid "+(toast.type==="error"?"#F48FB1":GM)}}>{toast.msg}</div>}
        {shareModal&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:sf,borderRadius:20,padding:28,width:420,maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:48,marginBottom:8}}>🎉</div>
                <h3 style={{fontSize:18,fontWeight:800,margin:0}}>تم تسجيل الجولة!</h3>
                <p style={{color:"#5A7A72",fontSize:13,marginTop:6}}>شارك الرابط مع المشاركين ليروا النتيجة</p>
              </div>
              <div style={{background:bg,borderRadius:10,padding:"12px 14px",marginBottom:16,wordBreak:"break-all",fontSize:11,color:"#5A7A72",border:"1px solid "+bd}}>{buildShareLink(shareModal.roundId,shareModal.shareToken)}</div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{navigator.clipboard.writeText(buildShareLink(shareModal.roundId,shareModal.shareToken));showToast("تم النسخ!");}} style={{flex:1,padding:11,borderRadius:10,background:G,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>📋 نسخ الرابط</button>
                <button onClick={()=>setShareModal(null)} style={{flex:1,padding:11,borderRadius:10,background:bg,color:"#5A7A72",fontSize:14,fontWeight:700,border:"1px solid "+bd,cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>إغلاق</button>
              </div>
            </div>
          </div>)}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
          {[{label:"إجمالي الأعضاء",val:state.members.length,bg:GL,icon:"👥"},{label:"صندوق الجولة",val:totalPot.toLocaleString()+" ر.س",bg:"#FFF3E0",icon:"💰"},{label:"دفعوا / المشاركون",val:curPaid+"/"+(curRound?curRound.pays.length:0),bg:"#E3F2FD",icon:"✅"},{label:"الجولة الحالية",val:"#"+curRoundNum,bg:"#FCE4EC",icon:"🎯"}].map((k,i)=>(
            <div key={i} style={{background:sf,borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,.06)",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:11,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{k.icon}</div>
              <div><div style={{fontSize:20,fontWeight:700,lineHeight:1}}>{k.val}</div><div style={{fontSize:11,color:"#5A7A72",marginTop:3}}>{k.label}</div></div>
            </div>))}
        </div>
        {tab==="members"&&<MembersTab state={state} isAdmin={isAdmin} onAdd={addMember} onRemove={removeMember}/>}
        {tab==="newround"&&isAdmin&&<NewRoundTab state={state} curRoundNum={curRoundNum} curRound={curRound} curParticipants={curParticipants} totalPot={totalPot} drawMode={drawMode} setDrawMode={setDrawMode} pendingWinner={pendingWinner} setPendingWinner={setPendingWinner} spinning={spinning} spinDisplay={spinDisplay} onStartDraw={startDraw} onConfirm={confirmWin} onUpdateParticipants={async ids=>{await supabase.from("settings").update({value:JSON.stringify(ids)}).eq("key","current_participants");}}/>}
        {tab==="pay"&&isAdmin&&<PayTab state={state} activePayRound={activePayRound} setActivePayRound={setActivePayRound} onToggle={togglePay} onPayAll={async(roundId,pays)=>{for(const p of pays){if(!p.paid)await supabase.from("pays").update({paid:true,paid_date:tod()}).eq("id",p.id);}showToast("تم تسجيل كل الدفعات");}}/>}
        {tab==="rounds"&&<RoundsTab state={state} onShare={r=>setShareModal({roundId:r.id,shareToken:r.share_token})}/>}
        {tab==="history"&&<HistoryTab state={state}/>}
        {tab==="users"&&isAdmin&&<UsersTab state={state} currentUser={currentUser} onAdd={addUser} onRemove={removeUser}/>}
      </main>
    </div>);
}

function MembersTab({state,isAdmin,onAdd,onRemove}){
  const [name,setName]=useState("");const [phone,setPhone]=useState("");const [amt,setAmt]=useState("");
  const medals=["🥇","🥈","🥉"];
  const sorted=[...state.members].sort((a,b)=>{
    const pA=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===a.id&&p.paid)).length;
    const tA=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===a.id)).length;
    const pB=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===b.id&&p.paid)).length;
    const tB=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===b.id)).length;
    return(tB?pB/tB:0)-(tA?pA/tA:0);
  });
  return(
    <div>
      <div style={{marginBottom:20}}><h2 style={{fontSize:21,fontWeight:700,margin:0}}>الأعضاء</h2><p style={{fontSize:13,color:"#5A7A72",margin:"4px 0 0"}}>مرتبون حسب الالتزام بالدفع</p></div>
      {isAdmin&&(
        <div style={{background:sf,borderRadius:14,padding:"18px 22px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>إضافة عضو جديد</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:10,alignItems:"end"}}>
            {[["الاسم",name,setName,"محمد علي"],["رقم الجوال",phone,setPhone,"05xxxxxxxx"],["المبلغ الشهري",amt,setAmt,"500"]].map(([lbl,val,set,ph])=>(
              <div key={lbl}><label style={{display:"block",fontSize:12,fontWeight:700,color:"#5A7A72",marginBottom:4}}>{lbl}</label><input value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={{width:"100%",padding:"9px 12px",border:"1px solid "+bd,borderRadius:8,fontSize:14,fontFamily:"Tajawal,sans-serif",direction:"rtl",boxSizing:"border-box",outline:"none"}}/></div>))}
            <button onClick={()=>{if(!name||!phone||!amt)return;onAdd(name,phone,amt);setName("");setPhone("");setAmt("");}} style={{padding:"9px 20px",borderRadius:8,background:G,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif",whiteSpace:"nowrap"}}>+ إضافة</button>
          </div>
        </div>)}
      <div style={{background:sf,borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>الأعضاء المشتركون <span style={{fontSize:12,color:"#5A7A72",fontWeight:400}}>({sorted.length} عضو)</span></div>
        {!sorted.length&&<div style={{textAlign:"center",padding:32,color:"#8FADA6"}}>لا يوجد أعضاء بعد</div>}
        {sorted.map((m,rank)=>{
          const ci=state.members.indexOf(m)%6;
          const paidCount=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===m.id&&p.paid)).length;
          const partCount=state.rounds.filter(r=>r.pays?.find(p=>p.member_id===m.id)).length;
          const pct=partCount?Math.round(paidCount/partCount*100):0;
          return(
            <div key={m.id} style={{border:"1px solid "+bd,borderRadius:10,padding:"13px 15px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:9}}>
                <span style={{width:24,height:24,display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:bg,fontSize:rank<3?14:11,color:"#5A7A72",fontWeight:700}}>{rank<3?medals[rank]:rank+1}</span>
                <div style={{width:40,height:40,borderRadius:"50%",background:AVBG[ci][0],color:AVBG[ci][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>{ini(m.name)}</div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{m.name}</div><div style={{fontSize:12,color:"#5A7A72"}}>{m.phone} · {Number(m.amt).toLocaleString()} ر.س/شهر</div></div>
                {m.won_round&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:20,fontWeight:700,background:"#E3F2FD",color:"#1565C0"}}>🏆 فاز #{m.won_round}</span>}
                {isAdmin&&<button onClick={()=>{if(window.confirm("حذف "+m.name+"؟"))onRemove(m.id,m.name);}} style={{padding:"3px 10px",borderRadius:6,background:"#FCE4EC",color:"#880E4F",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>حذف</button>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{flex:1,height:5,background:"#EBF2EF",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:GM,borderRadius:3,width:pct+"%",transition:"width .4s"}}/></div>
                <span style={{fontSize:11,color:"#5A7A72",whiteSpace:"nowrap"}}>{paidCount}/{partCount} جولة</span>
              </div>
            </div>);})}
      </div>
    </div>);
}

function NewRoundTab({state,curRoundNum,curRound,curParticipants,totalPot,drawMode,setDrawMode,pendingWinner,setPendingWinner,spinning,spinDisplay,onStartDraw,onConfirm,onUpdateParticipants}){
  const eligible=curParticipants.filter(mid=>{const m=state.members.find(x=>x.id===mid);return m&&!m.won_round;});
  if(curRound)return(<div style={{background:sf,borderRadius:14,padding:28,boxShadow:"0 1px 4px rgba(0,0,0,.06)",maxWidth:500}}><div style={{background:"#E3F2FD",border:"1px solid #90CAF9",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#1565C0"}}>الجولة #{curRound.round_num} مكتملة — الفائز: <strong>{curRound.winner_name}</strong></div></div>);
  return(
    <div>
      <div style={{marginBottom:20}}><h2 style={{fontSize:21,fontWeight:700,margin:0}}>إعداد الجولة #{curRoundNum}</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:sf,borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14,display:"flex",justifyContent:"space-between"}}>المشاركون
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>onUpdateParticipants(state.members.map(m=>m.id))} style={{padding:"4px 10px",borderRadius:6,background:GL,color:G,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>الكل</button>
              <button onClick={()=>onUpdateParticipants([])} style={{padding:"4px 10px",borderRadius:6,background:bg,color:"#5A7A72",fontSize:12,border:"1px solid "+bd,cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>إلغاء</button>
            </div>
          </div>
          {state.members.map(m=>{
            const ci=state.members.indexOf(m)%6;const checked=curParticipants.includes(m.id);
            return(<div key={m.id} onClick={()=>{const n=checked?curParticipants.filter(x=>x!==m.id):[...curParticipants,m.id];onUpdateParticipants(n);}} style={{border:"2px solid "+(checked?G:bd),borderRadius:8,padding:"11px 14px",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:11,background:checked?GL:"transparent"}}>
              <div style={{width:20,height:20,borderRadius:5,border:"2px solid "+(checked?G:bd),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:checked?G:"transparent",color:"#fff"}}>{checked?"✓":""}</div>
              <div style={{width:36,height:36,borderRadius:"50%",background:AVBG[ci][0],color:AVBG[ci][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{ini(m.name)}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{m.name}</div><div style={{fontSize:12,color:"#5A7A72"}}>{Number(m.amt).toLocaleString()} ر.س</div></div>
              {m.won_round&&<span style={{fontSize:10,background:"#E3F2FD",color:"#1565C0",padding:"1px 7px",borderRadius:10,fontWeight:700}}>فاز #{m.won_round}</span>}
            </div>);})}
          <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid "+bd,display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:"#5A7A72"}}>الإجمالي:</span>
            <span style={{fontWeight:700,fontSize:16}}>{totalPot.toLocaleString()} ر.س ({curParticipants.length} مشارك)</span>
          </div>
        </div>
        <div style={{background:sf,borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>اختيار الفائز</div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {[["random","🎲 قرعة عشوائية"],["manual","🤝 بالتراضي"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setDrawMode(m);setPendingWinner(null);}} style={{flex:1,padding:9,borderRadius:9,background:drawMode===m?G:bg,color:drawMode===m?"#fff":"#5A7A72",fontSize:13,fontWeight:700,border:"1px solid "+(drawMode===m?G:bd),cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>{l}</button>))}
          </div>
          {drawMode==="random"&&(
            <div style={{textAlign:"center"}}>
              <div onClick={!spinning?onStartDraw:undefined} style={{width:90,height:90,borderRadius:"50%",border:"3px solid "+G,background:GL,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",cursor:spinning?"not-allowed":"pointer",fontSize:38,animation:spinning?"spin .12s linear infinite":"none"}}>🎲</div>
              <div style={{fontSize:16,fontWeight:700,color:G,minHeight:24}}>{spinDisplay}</div>
              {!spinning&&!pendingWinner&&<div style={{fontSize:12,color:"#8FADA6",marginTop:4}}>اضغط للقرعة</div>}
            </div>)}
          {drawMode==="manual"&&eligible.map(mid=>{const m=state.members.find(x=>x.id===mid);if(!m)return null;const ci=state.members.indexOf(m)%6;const isSel=pendingWinner?.id===mid;return(<div key={mid} onClick={()=>setPendingWinner(m)} style={{border:"2px solid "+(isSel?G:bd),borderRadius:8,padding:"11px 14px",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:11,background:isSel?GL:"transparent"}}><div style={{width:36,height:36,borderRadius:"50%",background:AVBG[ci][0],color:AVBG[ci][1],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{ini(m.name)}</div><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{m.name}</div></div>{isSel&&<span style={{color:G}}>✓</span>}</div>);})}
          {pendingWinner&&(
            <div style={{background:GL,border:"2px solid "+GM,borderRadius:10,padding:16,margin:"12px 0"}}>
              <div style={{fontSize:11,fontWeight:700,color:G,marginBottom:4}}>الفائز المختار</div>
              <div style={{fontSize:20,fontWeight:700,color:GD}}>{pendingWinner.name}</div>
              <div style={{fontSize:13,color:G,marginTop:4}}>المبلغ الإجمالي: {totalPot.toLocaleString()} ر.س</div>
            </div>)}
          {pendingWinner&&<button onClick={()=>onConfirm(pendingWinner,drawMode)} style={{width:"100%",padding:11,borderRadius:10,background:G,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif",marginTop:8}}>✅ تأكيد وبدء الجولة التالية</button>}
        </div>
      </div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>);
}

function PayTab({state,activePayRound,setActivePayRound,onToggle,onPayAll}){
  const curRoundNum=activePayRound??(state.rounds.length?state.rounds[state.rounds.length-1].round_num:null);
  const round=state.rounds.find(r=>r.round_num===curRoundNum);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontSize:21,fontWeight:700,margin:0}}>المدفوعات</h2>
        {round&&<button onClick={()=>onPayAll(round.id,round.pays)} style={{padding:"8px 16px",borderRadius:8,background:GL,color:G,fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>تحديد الكل مدفوع</button>}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {[...state.rounds].reverse().map(r=>(
          <button key={r.round_num} onClick={()=>setActivePayRound(r.round_num)} style={{padding:"5px 14px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",border:"1px solid "+(r.round_num===curRoundNum?G:bd),background:r.round_num===curRoundNum?G:bg,color:r.round_num===curRoundNum?"#fff":"#5A7A72",fontFamily:"Tajawal,sans-serif"}}>جولة #{r.round_num}</button>))}
      </div>
      {!round&&<div style={{textAlign:"center",padding:40,color:"#8FADA6"}}>لا توجد جولات بعد</div>}
      {round&&(
        <div style={{background:sf,borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>دفعات الجولة #{round.round_num}</div>
          <div style={{fontSize:12,color:"#5A7A72",marginBottom:14}}>الفائز: <strong>{round.winner_name}</strong> · {round.pays.filter(p=>p.paid).length}/{round.pays.length} دفعوا</div>
          {round.pays.map(pay=>(
            <div key={pay.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid "+bd}}>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{pay.member_name}</div><div style={{fontSize:12,color:"#5A7A72"}}>{Number(pay.amt).toLocaleString()} ر.س {pay.paid_date?"· "+pay.paid_date:""}</div></div>
              <button onClick={()=>onToggle(pay.id,pay.paid,pay.member_name,round.round_num,pay.amt)} style={{padding:"6px 16px",borderRadius:8,background:pay.paid?GL:"#FFF3E0",color:pay.paid?GD:"#E65100",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>{pay.paid?"✓ دفع":"تسجيل الدفع"}</button>
            </div>))}
          <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid "+bd,display:"flex",justifyContent:"space-between",fontSize:13,color:"#5A7A72"}}>
            <span>إجمالي المحصّل:</span>
            <span style={{fontWeight:700,color:G}}>{round.pays.filter(p=>p.paid).reduce((s,p)=>s+Number(p.amt),0).toLocaleString()} ر.س</span>
          </div>
        </div>)}
    </div>);
}

function RoundsTab({state,onShare}){
  const [sel,setSel]=useState(null);
  const selRound=state.rounds.find(r=>r.round_num===sel);
  return(
    <div>
      <div style={{marginBottom:20}}><h2 style={{fontSize:21,fontWeight:700,margin:0}}>سجل الجولات</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:sf,borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          {!state.rounds.length&&<div style={{textAlign:"center",padding:28,color:"#8FADA6"}}>لا توجد جولات بعد</div>}
          {[...state.rounds].reverse().map(r=>{
            const paidCount=r.pays.filter(p=>p.paid).length;
            return(<div key={r.round_num} onClick={()=>setSel(r.round_num)} style={{border:"1px solid "+(r.round_num===sel?G:bd),borderRadius:10,padding:"13px 15px",marginBottom:9,cursor:"pointer",background:r.round_num===sel?GL:"transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:14,fontWeight:700}}>الجولة #{r.round_num}</span>
                <div style={{display:"flex",gap:6}}>
                  {r.share_token&&<button onClick={e=>{e.stopPropagation();onShare(r);}} style={{padding:"2px 8px",borderRadius:6,background:"#E3F2FD",color:"#1565C0",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>🔗 مشاركة</button>}
                </div>
              </div>
              <div style={{fontSize:13,color:"#5A7A72",marginTop:4}}>🏆 {r.winner_name} · {r.date}</div>
              <div style={{fontSize:12,color:"#8FADA6",marginTop:2}}>{paidCount}/{r.pays.length} دفعوا</div>
            </div>);})}
        </div>
        {selRound&&(
          <div style={{background:sf,borderRadius:14,padding:"18px 22px",boxShadow:"0 4px 16px rgba(0,0,0,.08)",borderRight:"4px solid "+GM}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>تفاصيل الجولة #{selRound.round_num}</div>
            <div style={{fontSize:12,color:"#5A7A72",marginBottom:16}}>الفائز: <strong style={{color:G}}>{selRound.winner_name}</strong></div>
            {selRound.pays.map(pay=>(
              <div key={pay.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid "+bd,fontSize:13}}>
                <div style={{flex:1,fontWeight:700}}>{pay.member_name}</div>
                <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:700,background:pay.paid?GL:"#FFF3E0",color:pay.paid?GD:"#E65100"}}>{pay.paid?"✓ دفع":"لم يدفع"}</span>
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
      <div style={{background:sf,borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        {!state.hist.length&&<div style={{textAlign:"center",padding:32,color:"#8FADA6"}}>لا توجد معاملات بعد</div>}
        {state.hist.map(h=>{const[ico,hbg,tc]=typeMap[h.type]||["📌","#F5F7F6","#5A7A72"];return(
          <div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid "+bd}}>
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
      <div style={{background:sf,borderRadius:14,padding:"18px 22px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>إضافة مستخدم جديد</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 120px 120px auto",gap:10,alignItems:"end"}}>
          {[["الاسم",name,setName,"الاسم"],["الجوال",phone,setPhone,"05xxxxxxxx"],["PIN",pin,setPin,"1234"]].map(([lbl,val,set,ph])=>(
            <div key={lbl}><label style={{display:"block",fontSize:12,fontWeight:700,color:"#5A7A72",marginBottom:4}}>{lbl}</label><input value={val} onChange={e=>set(e.target.value)} placeholder={ph} type={lbl==="PIN"?"password":"text"} style={{width:"100%",padding:"9px 12px",border:"1px solid "+bd,borderRadius:8,fontSize:14,fontFamily:"Tajawal,sans-serif",direction:"rtl",boxSizing:"border-box",outline:"none"}}/></div>))}
          <div><label style={{display:"block",fontSize:12,fontWeight:700,color:"#5A7A72",marginBottom:4}}>الصلاحية</label><select value={role} onChange={e=>setRole(e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1px solid "+bd,borderRadius:8,fontSize:14,fontFamily:"Tajawal,sans-serif",direction:"rtl",outline:"none"}}><option value="member">مشترك</option><option value="admin">مدير</option></select></div>
          <button onClick={()=>{if(!name||!phone||!pin)return;onAdd(name,phone,pin,role);setName("");setPhone("");setPin("");setRole("member");}} style={{padding:"9px 20px",borderRadius:8,background:G,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif",whiteSpace:"nowrap"}}>+ إضافة</button>
        </div>
      </div>
      <div style={{background:sf,borderRadius:14,padding:"18px 22px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        {(state.users||[]).map(u=>(
          <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:"1px solid "+bd}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:u.role==="admin"?"#FFF3E0":GL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{u.role==="admin"?"🔑":"👤"}</div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{u.name}{u.id===currentUser.id?<span style={{fontSize:10,background:GL,color:GD,padding:"1px 7px",borderRadius:10,fontWeight:700,marginRight:6}}>أنت</span>:null}</div><div style={{fontSize:12,color:"#5A7A72"}}>{u.phone}</div></div>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:700,background:u.role==="admin"?"#FFF3E0":GL,color:u.role==="admin"?"#E65100":GD}}>{u.role==="admin"?"مدير":"مشترك"}</span>
            {u.id!==currentUser.id&&<button onClick={()=>{if(window.confirm("حذف "+u.name+"؟"))onRemove(u.id);}} style={{padding:"4px 12px",borderRadius:6,background:"#FCE4EC",color:"#880E4F",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>حذف</button>}
          </div>))}
      </div>
    </div>);
}
