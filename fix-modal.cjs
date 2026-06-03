const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const oldSection = `>القرعة المباشرة</h3>\n              <p style={{color:"#5A7A72",fontSize:13,marginTop:6}}>الرابط ثابت — يشاهد المشاركون القرعة ثم المدفوعات</p>\n            </div>\n\n            {/* RINK DISPLAY */}`;

const newSection = `>القرعة المباشرة</h3>\n              <p style={{color:"#5A7A72",fontSize:13,marginTop:6}}>الرابط ثابت — يشاهد المشاركون القرعة ثم المدفوعات</p>\n            </div>\n            {liveModal&&<ViewersCount drawId={liveModal.drawId}/>}\n            {!spinning&&!pendingWinner&&!liveModal?.confirmed&&liveDraw&&(\n              <TimerSelector drawId={liveDraw.id} onSet={async(sec)=>{\n                const now=new Date().toISOString();\n                await supabase.from("live_draw").update({countdown_seconds:sec,countdown_start:sec>0?now:null,updated_at:now}).eq("id",liveDraw.id);\n                showToast(sec>0?"⏱️ تم تفعيل التايمر: "+Math.floor(sec/60)+" دقيقة":"تم إلغاء التايمر");\n              }}/>)}\n\n            {/* RINK DISPLAY */}`;

if(code.includes(oldSection)){
  code = code.replace(oldSection, newSection);
  console.log('✅ liveModal patched with viewers + timer!');
} else {
  console.log('⚠️ Not found');
}

fs.writeFileSync('src/App.jsx', code);
console.log('Lines:', code.split('\n').length);
