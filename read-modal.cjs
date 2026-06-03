const fs = require('fs');
const code = fs.readFileSync('src/App.jsx', 'utf8');
const idx = code.indexOf('>القرعة المباشرة</h3>');
if(idx !== -1) {
  // Show exact bytes around this section
  const section = code.slice(idx-100, idx+400);
  // Convert to escaped string to see exact whitespace
  console.log(JSON.stringify(section));
}
