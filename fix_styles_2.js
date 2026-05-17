const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components/Wrapped');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'WrappedButton.tsx' && f !== 'WrappedCTA.tsx');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to remove any hanging style properties that follow a `  },` and end with `  },`
  // Specifically we look for `  },\n    elevation: 4, ...` and remove the latter part.
  
  content = content.replace(/  \},\n\s+elevation: 4,\s+alignItems: "center",\s+\},/g, '  },');
  content = content.replace(/  \},\n\s+elevation: 4,\s+minWidth: 160,\s+alignItems: "center",\s+\},/g, '  },');
  content = content.replace(/  \},\n\s+elevation: 4,\s+alignItems: "center",\s+minWidth: 120,\s+\},/g, '  },');
  content = content.replace(/  \},\n\s+elevation: 4,\s+alignItems: "center",\s+minWidth: 200,\s+\},/g, '  },');
  content = content.replace(/  \},\n\s+elevation: 4,\s+minWidth: 200,\s+alignItems: "center",\s+\},/g, '  },');
  
  fs.writeFileSync(filePath, content, 'utf8');
}
