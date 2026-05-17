const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components/Wrapped');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'WrappedButton.tsx' && f !== 'WrappedCTA.tsx');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the broken leftover styles from the greedy regex
  content = content.replace(/\s*elevation: 4,\s*alignItems: "center",\s*\},/g, '');
  content = content.replace(/\s*elevation: 4,\s*minWidth: 160,\s*alignItems: "center",\s*\},/g, '');
  content = content.replace(/\s*elevation: 4,\s*minWidth: 200,\s*alignItems: "center",\s*\},/g, '');
  content = content.replace(/\s*elevation: 4,\s*minWidth: 120,\s*alignItems: "center",\s*\},/g, '');
  
  // also check for `minWidth: 120,` and others
  content = content.replace(/\s*elevation: 4,\s*alignItems: "center",\s*minWidth: 120,\s*\},/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
}
