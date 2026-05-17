const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components/Wrapped');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'WrappedButton.tsx' && f !== 'WrappedCTA.tsx');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to remove ctaButton block
  content = content.replace(/\s*ctaButton:\s*\{[\s\S]*?\},/g, '');
  content = content.replace(/\s*ctaButtonDisabled:\s*\{[\s\S]*?\},/g, '');
  content = content.replace(/\s*ctaText:\s*\{[\s\S]*?\},/g, '');
  
  content = content.replace(/\s*doneButton:\s*\{[\s\S]*?\},/g, '');
  content = content.replace(/\s*doneText:\s*\{[\s\S]*?\},/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Cleaned ' + file);
}
