import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const G="#0F6E56",GM="#1D9E75",GL="#E1F5EE",sf="#fff",bg="#F5F7F6",bd="#E2EAE7";
const ROLES={superadmin:{label:"Super Admin",icon:"👑",color:"#E65100",bg:"#FFF3E0"},admin:{label:"مدير",icon:"🔑",color:"#1565C0",bg:"#E3F2FD"},accountant:{label:"محاسب",icon:"💼",color:"#6A1B9A",bg:"#F3E5F5"},member:{label:"عضو",icon:"👤",color:"#2E7D32",bg:"#E8F5E9"}};

export default function OwnerDashboard({onLogout, onEnterGroup}){
  const [groups,setGroups]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [mobile]=useState(()=>window.innerWidth<600);

  // إنشاء جمعية
  const [name,setName]=useState("");
  const [adminName,setAdminName]=useState("");
  const [adminPhone,setAdminPhone]=useState("");
  const [adminPin,setAdminPin]=useState("");
  const [creating,setCreating]=useState(false);

  // تعديل جمعية
  const [editGroup,setEditGroup]=useState(null);
  const [editName,setEditName]=useState("");
  const [editAdminName,setEditAdminName]=useState("");
  const [editAdminPhone,setEditAdminPhone]=useState("");
  const [editAdminPin,setEditAdminPin]=useState("");
  const [saving,setSaving]=useState(false);

  useEffect(()=>{loadGroups();},[]);

  async function loadGroups(){
    setLoading(true);
    const{data}=await supabase.from("groups").select(`*, users(id,name,phone,pin,role)`).order("created_at",{ascending:false});
    setGroups(data||[]);
    setLoading(false);
  }

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);};

  async function createGroup(){
    if(!name||!adminName||!adminPhone||!adminPin){showToast("يرجى ملء كل الحقول","error");return;}
    setCreating(true);
    const{error}=await supabase.rpc("create_group",{group_name:name,admin_name:adminName,admin_phone:adminPhone,admin_pin:adminPin});
    if(error)showToast("خطأ: "+error.message,"error");
    else{showToast("✅ تم إنشاء جمعية: "+name);setName("");setAdminName("");setAdminPhone("");setAdminPin("");loadGroups();}
    setCreating(false);
  }

  async function saveEdit(){
    if(!editGroup)return;
    setSaving(true);
    // تعديل اسم الجمعية
    await supabase.from("groups").update({name:editName}).eq("id",editGroup.id);
    // تعديل بيانات المدير
    const admin=(editGroup.users||[]).find(u=>u.role==="admin");
    if(admin){
      const updates={name:editAdminName,phone:editAdminPhone};
      if(editAdminPin)updates.pin=editAdminPin;
      await supabase.from("users").update(updates).eq("id",admin.id);
    }
    showToast("✅ تم الحفظ");
    setSaving(false);
    setEditGroup(null);
    loadGroups();
  }

  async function deleteGroup(g){
    if(!window.confirm("حذف جمعية "+g.name+"؟ سيُحذف كل شيء لا يمكن التراجع."))return;
    try{
      // حذف المدفوعات أولاً (مرتبطة بالجولات)
      const{data:rounds}=await supabase.from("rounds").select("id").eq("group_id",g.id);
      if(rounds?.length){
        const rids=rounds.map(r=>r.id);
        await supabase.from("pays").delete().in("round_id",rids);
      }
      await supabase.from("history").delete().eq("group_id",g.id);
      await supabase.from("live_draw").delete().eq("group_id",g.id);
      await supabase.from("rounds").delete().eq("group_id",g.id);
      await supabase.from("members").delete().eq("group_id",g.id);
      await supabase.from("settings").delete().eq("group_id",g.id);
      await supabase.from("users").delete().eq("group_id",g.id);
      await supabase.from("groups").delete().eq("id",g.id);
      showToast("تم حذف الجمعية");
      loadGroups();
    }catch(e){showToast("خطأ: "+e.message,"error");}
  }

  function openEdit(g){
    const admin=(g.users||[]).find(u=>u.role==="admin");
    setEditGroup(g);
    setEditName(g.name);
    setEditAdminName(admin?.name||"");
    setEditAdminPhone(admin?.phone||"");
    setEditAdminPin("");
  }

  function copyLoginInfo(g){
    const admin=(g.users||[]).find(u=>u.role==="admin");
    if(!admin)return;
    const text=`الجمعية: ${g.name}\nرابط الدخول: ${window.location.origin}\nرقم الجوال: ${admin.phone}\nالرمز السري: ${admin.pin}`;
    navigator.clipboard.writeText(text);
    showToast("✅ تم نسخ بيانات الدخول");
  }

  return(
    <div translate="no" dir="rtl" style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F1923,#1A2E28)",fontFamily:"Tajawal,sans-serif",padding:mobile?"12px":"24px"}}>
      {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"#FCE4EC":GL,color:toast.type==="error"?"#880E4F":"#085041",padding:"10px 20px",borderRadius:12,fontWeight:700,fontSize:14,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,.3)",whiteSpace:"nowrap"}}>{toast.msg}</div>}

      {/* EDIT MODAL */}
      {editGroup&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)setEditGroup(null);}}>
          <div style={{background:sf,borderRadius:"20px 20px 0 0",padding:"20px 20px 32px",width:"100%",maxWidth:520}}>
            <div style={{width:40,height:4,borderRadius:2,background:"#E2EAE7",margin:"0 auto 16px"}}/>
            <h3 style={{fontSize:16,fontWeight:800,margin:"0 0 16px"}}>✏️ تعديل الجمعية</h3>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:12,fontWeight:700,color:"#5A7A72",marginBottom:4}}>اسم الجمعية</label>
              <input value={editName} onChange={e=>setEditName(e.target.value)} style={{width:"100%",padding:"10px 12px",border:"1px solid #E2EAE7",borderRadius:8,fontSize:14,fontFamily:"Tajawal,sans-serif",direction:"rtl",boxSizing:"border-box",outline:"none"}}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:12,fontWeight:700,color:"#5A7A72",marginBottom:4}}>اسم المدير</label>
              <input value={editAdminName} onChange={e=>setEditAdminName(e.target.value)} style={{width:"100%",padding:"10px 12px",border:"1px solid #E2EAE7",borderRadius:8,fontSize:14,fontFamily:"Tajawal,sans-serif",direction:"rtl",boxSizing:"border-box",outline:"none"}}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:12,fontWeight:700,color:"#5A7A72",marginBottom:4}}>جوال المدير</label>
              <input value={editAdminPhone} onChange={e=>setEditAdminPhone(e.target.value)} style={{width:"100%",padding:"10px 12px",border:"1px solid #E2EAE7",borderRadius:8,fontSize:14,fontFamily:"Tajawal,sans-serif",direction:"rtl",boxSizing:"border-box",outline:"none"}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:12,fontWeight:700,color:"#5A7A72",marginBottom:4}}>PIN جديد (اتركه فارغاً إذا لا تريد تغييره)</label>
              <input type="password" value={editAdminPin} onChange={e=>setEditAdminPin(e.target.value)} placeholder="••••" style={{width:"100%",padding:"10px 12px",border:"1px solid #E2EAE7",borderRadius:8,fontSize:14,fontFamily:"Tajawal,sans-serif",direction:"rtl",boxSizing:"border-box",outline:"none"}}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={saveEdit} disabled={saving} style={{flex:1,padding:12,borderRadius:10,background:G,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>{saving?"جاري الحفظ...":"💾 حفظ التعديلات"}</button>
              <button onClick={()=>setEditGroup(null)} style={{flex:1,padding:12,borderRadius:10,background:bg,color:"#5A7A72",fontSize:14,fontWeight:700,border:"1px solid "+bd,cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>إلغاء</button>
            </div>
          </div>
        </div>)}

      {/* HEADER */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h1 style={{color:"#fff",fontSize:mobile?18:22,fontWeight:800,margin:0}}>🔄 لوحة تحكم المالك</h1>
          <p style={{color:"rgba(255,255,255,.4)",fontSize:12,margin:"4px 0 0"}}>إدارة جميع الجمعيات</p>
        </div>
        <button onClick={onLogout} style={{background:"rgba(255,100,100,.2)",border:"1px solid rgba(255,100,100,.3)",color:"rgba(255,200,200,.9)",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>تسجيل الخروج</button>
      </div>

      {/* إنشاء جمعية */}
      <div style={{background:"rgba(255,255,255,.07)",borderRadius:16,padding:"18px 20px",marginBottom:20,border:"1px solid rgba(255,255,255,.1)"}}>
        <div style={{color:"#fff",fontSize:15,fontWeight:700,marginBottom:14}}>➕ إنشاء جمعية جديدة</div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
          {[["اسم الجمعية",name,setName,"الجمعية الدوّارة","text"],["اسم المدير",adminName,setAdminName,"محمد علي","text"],["جوال المدير",adminPhone,setAdminPhone,"05xxxxxxxx","text"],["PIN المدير",adminPin,setAdminPin,"1234","password"]].map(([lbl,val,set,ph,type],i)=>(
            <div key={i}>
              <label style={{color:"rgba(255,255,255,.6)",fontSize:11,fontWeight:700,display:"block",marginBottom:4}}>{lbl}</label>
              <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} type={type}
                style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.08)",color:"#fff",fontSize:13,fontFamily:"Tajawal,sans-serif",outline:"none",boxSizing:"border-box",direction:"rtl"}}/>
            </div>))}
        </div>
        <button onClick={createGroup} disabled={creating}
          style={{padding:"10px 24px",borderRadius:10,background:"linear-gradient(135deg,#0F6E56,#1D9E75)",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif",width:mobile?"100%":"auto"}}>
          {creating?"جاري الإنشاء...":"🚀 إنشاء الجمعية"}
        </button>
      </div>

      {/* قائمة الجمعيات */}
      <div style={{color:"rgba(255,255,255,.5)",fontSize:12,fontWeight:700,marginBottom:12}}>الجمعيات ({groups.length})</div>
      {loading&&<div style={{textAlign:"center",color:"rgba(255,255,255,.4)",padding:40}}>جاري التحميل...</div>}
      {!loading&&!groups.length&&<div style={{textAlign:"center",color:"rgba(255,255,255,.3)",padding:40}}>لا توجد جمعيات بعد</div>}
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:12}}>
        {groups.map(g=>{
          const admin=(g.users||[]).find(u=>u.role==="admin");
          const membersCount=(g.users||[]).filter(u=>u.role==="member").length;
          return(
            <div key={g.id} style={{background:"rgba(255,255,255,.07)",borderRadius:14,padding:"16px 18px",border:"1px solid rgba(255,255,255,.1)"}}>
              {/* اسم الجمعية والتاريخ */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{color:"#fff",fontSize:16,fontWeight:700}}>{g.name}</div>
                  <div style={{color:"rgba(255,255,255,.3)",fontSize:11,marginTop:2}}>{new Date(g.created_at).toLocaleDateString("ar-SA")}</div>
                </div>
                <span style={{background:"rgba(29,158,117,.2)",color:GM,fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:700,border:"1px solid rgba(29,158,117,.3)"}}>
                  {membersCount} عضو
                </span>
              </div>

              {/* بيانات المدير */}
              {admin&&(
                <div style={{background:"rgba(255,255,255,.06)",borderRadius:8,padding:"10px 12px",marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <span style={{color:"#fff",fontSize:13,fontWeight:700}}>{admin.name}</span>
                      <span style={{fontSize:10,background:"#E3F2FD",color:"#1565C0",padding:"1px 6px",borderRadius:8,fontWeight:700,marginRight:6}}>🔑 مدير</span>
                    </div>
                    <span style={{color:"rgba(255,255,255,.4)",fontSize:11}}>{admin.phone}</span>
                  </div>
                </div>)}

              {/* الأزرار */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                {/* دخول الجمعية */}
                <button onClick={()=>onEnterGroup(g)}
                  style={{padding:"8px 4px",borderRadius:8,background:"linear-gradient(135deg,#0F6E56,#1D9E75)",color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif",textAlign:"center"}}>
                  🚪 دخول
                </button>
                {/* تعديل */}
                <button onClick={()=>openEdit(g)}
                  style={{padding:"8px 4px",borderRadius:8,background:"rgba(21,101,192,.3)",color:"#90CAF9",fontSize:12,fontWeight:700,border:"1px solid rgba(21,101,192,.4)",cursor:"pointer",fontFamily:"Tajawal,sans-serif",textAlign:"center"}}>
                  ✏️ تعديل
                </button>
                {/* نسخ بيانات الدخول */}
                <button onClick={()=>copyLoginInfo(g)}
                  style={{padding:"8px 4px",borderRadius:8,background:"rgba(106,27,154,.3)",color:"#CE93D8",fontSize:12,fontWeight:700,border:"1px solid rgba(106,27,154,.4)",cursor:"pointer",fontFamily:"Tajawal,sans-serif",textAlign:"center"}}>
                  📋 نسخ
                </button>
              </div>
              {/* حذف */}
              <button onClick={()=>deleteGroup(g)}
                style={{width:"100%",marginTop:6,padding:"6px",borderRadius:8,background:"rgba(200,0,0,.15)",color:"#ff6b6b",fontSize:11,fontWeight:700,border:"1px solid rgba(200,0,0,.25)",cursor:"pointer",fontFamily:"Tajawal,sans-serif"}}>
                🗑️ حذف الجمعية
              </button>
            </div>);})}
      </div>
    </div>);
}
