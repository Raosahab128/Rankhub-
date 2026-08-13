const fs = require('fs');

const filesToFix = [
  'exams.js',
  'home.js',
  'practice.js',
  'pyq-detail.js',
  'pyq.js'
];

filesToFix.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes("import { getCurrentUser } from './firebase.js'") && !code.includes(", getCurrentUser } from './firebase.js'")) {
    // Add import at the top
    code = "import { getCurrentUser } from './firebase.js';\n" + code;
    fs.writeFileSync(file, code);
    console.log("Fixed imports in " + file);
  }
});
