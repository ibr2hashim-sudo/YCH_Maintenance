const fs = require('fs');
const path = require('path');

const replaceInFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/text-slate-500/g, 'text-slate-700');
  content = content.replace(/text-slate-600/g, 'text-slate-800');
  content = content.replace(/text-blue-600/g, 'text-blue-800');
  content = content.replace(/text-blue-700/g, 'text-blue-900');
  content = content.replace(/text-amber-700/g, 'text-amber-900');
  content = content.replace(/text-emerald-600/g, 'text-emerald-800');
  fs.writeFileSync(filePath, content);
};

replaceInFile('./src/App.tsx');
// if components exist
if (fs.existsSync('./src/components')) {
  fs.readdirSync('./src/components').filter(f => f.endsWith('.tsx')).forEach(file => {
    replaceInFile(path.join('./src/components', file));
  });
}
