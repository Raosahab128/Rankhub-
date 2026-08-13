const fs = require('fs');

const filesToFix = [
  'exam-detail.js',
  'exams.js',
  'practice.js',
  'pyq-detail.js',
  'pyq.js'
];

filesToFix.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes("document.addEventListener('DOMContentLoaded', async () => {")) {
    code = code.replace(
      "document.addEventListener('DOMContentLoaded', () => {",
      "document.addEventListener('DOMContentLoaded', async () => {"
    );
    fs.writeFileSync(file, code);
    console.log("Fixed " + file);
  }
});
