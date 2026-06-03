const fs = require('fs');

// Read current App.jsx
let code = fs.readFileSync('src/App.jsx', 'utf8');

// ══ REPLACE LiveDrawView with new version including timer + viewers ══
const newLiveDrawView = `
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
`;

// Find and replace LiveDrawView
const startMarker = '// ══════════════════════════════════════════\n// LIVE DRAW VIEW';
const endMarker = 'function PublicRoundView(){';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if(startIdx !== -1 && endIdx !== -1) {
  code = code.slice(0, startIdx) + newLiveDrawView + '\n' + code.slice(endIdx);
  console.log('✅ LiveDrawView replaced successfully');
} else {
  console.log('⚠️ Could not find LiveDrawView — prepending');
  code = newLiveDrawView + '\n' + code;
}

// ══ ADD TIMER + VIEWERS to startLiveDraw and liveModal ══
// Patch startLiveDraw to include countdown
const oldStartLive = `async function startLiveDraw(){
    const eligible=curParticipants.filter(mid=>{const m=state.members.find(x=>x.id===mid);return m&&!m.won_round;});
    if(!eligible.length){showToast("لا يوجد مشاركون مؤهلون","error");return;}
    const parts=eligible.map(mid=>state.members.find(x=>x.id===mid)?.name||"").filter(Boolean);
    const{data:draw}=await supabase.from("live_draw").insert({round_num:curRoundNum,status:"waiting",participants:parts,current_name:"",winner_name:"",is_confirmed:false}).select().single();
    setLiveDraw(draw);
    setLiveModal({drawId:draw.id,shareToken:draw.share_token});
    showToast("📺 تم إنشاء رابط القرعة المباشرة!");
  }`;

const newStartLive = `async function startLiveDraw(countdownSec=300){
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
  }`;

if(code.includes(oldStartLive)) {
  code = code.replace(oldStartLive, newStartLive);
  console.log('✅ startLiveDraw patched with countdown');
} else {
  console.log('⚠️ startLiveDraw not found for patching');
}

// ══ Patch liveModal to add timer selector + viewers count ══
const oldLiveModalHeader = `<div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:44,marginBottom:8}}>📺</div>
            <h3 style={{fontSize:18,fontWeight:800,margin:0}}>القرعة المباشرة</h3>
            <p style={{color:"#5A7A72",fontSize:13,marginTop:6}}>الرابط ثابت — يشاهد المشاركون القرعة ثم المدفوعات</p>
          </div>`;

const newLiveModalHeader = `<div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:44,marginBottom:8}}>📺</div>
            <h3 style={{fontSize:18,fontWeight:800,margin:0}}>القرعة المباشرة</h3>
            <p style={{color:"#5A7A72",fontSize:13,marginTop:6}}>الرابط ثابت — يشاهد المشاركون القرعة ثم المدفوعات</p>
          </div>
          {/* VIEWERS COUNT */}
          {liveModal&&<ViewersCount drawId={liveModal.drawId}/>}
          {/* TIMER SELECTOR — يظهر قبل البدء */}
          {!spinning&&!pendingWinner&&!liveModal?.confirmed&&liveDraw&&(
            <TimerSelector drawId={liveDraw.id} onSet={async(sec)=>{
              const now=new Date().toISOString();
              await supabase.from("live_draw").update({countdown_seconds:sec,countdown_start:sec>0?now:null,updated_at:now}).eq("id",liveDraw.id);
              showToast(sec>0?"⏱️ تم تفعيل التايمر: "+Math.floor(sec/60)+" دقيقة":"تم إلغاء التايمر");
            }}/>)}`;

if(code.includes(oldLiveModalHeader)) {
  code = code.replace(oldLiveModalHeader, newLiveModalHeader);
  console.log('✅ liveModal patched with timer selector + viewers');
} else {
  console.log('⚠️ liveModal header not found');
}

// ══ Add helper components before export default ══
const viewerComponents = `
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

`;

const insertBefore = 'export default function App(){';
if(code.includes(insertBefore)) {
  code = code.replace(insertBefore, viewerComponents + insertBefore);
  console.log('✅ ViewersCount + TimerSelector added');
} else {
  console.log('⚠️ Could not find export default App');
}

fs.writeFileSync('src/App.jsx', code);
console.log('✅ App.jsx patched! Lines: ' + code.split('\n').length);
