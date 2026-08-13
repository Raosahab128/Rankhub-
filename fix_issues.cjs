const fs = require('fs');
const path = require('path');

// ID 07: CSS Fix
let css = fs.readFileSync('style.css', 'utf8');
css = css.replace(/width:\s*100vw;/g, 'width: 100%;');
fs.writeFileSync('style.css', css);

// ID 08: Admin Hardcoded Email
let adminJs = fs.readFileSync('admin.js', 'utf8');
adminJs = adminJs.replace(/if \(!isAdmin && user\.email !== 'dk9665676@gmail\.com'\) \{/g, 'if (!isAdmin) {');
fs.writeFileSync('admin.js', adminJs);

// ID 02: Broken Navigation
const files = fs.readdirSync('.');
const jsFiles = files.filter(f => f.endsWith('.js'));
for (let file of jsFiles) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/href="\/practice\?/g, 'href="./practice.html?');
  content = content.replace(/href="\/test-result\?/g, 'href="./test-result.html?');
  content = content.replace(/href="\/test-interface\?/g, 'href="./test-interface.html?');
  content = content.replace(/href="\/exam-detail\?/g, 'href="./exam-detail.html?');
  content = content.replace(/href="\/pyq-detail\?/g, 'href="./pyq-detail.html?');
  content = content.replace(/href="\/pyq\?/g, 'href="./pyq.html?');
  content = content.replace(/href="\/notes\?/g, 'href="./notes.html?');
  content = content.replace(/href="\/current-affairs\?/g, 'href="./current-affairs.html?');
  content = content.replace(/href="\/live-tests\?/g, 'href="./live-tests.html?');
  
  content = content.replace(/ctaLink:\s*['"]\/practice\?/g, "ctaLink: './practice.html?");
  content = content.replace(/ctaLink:\s*['"]\/test-interface\?/g, "ctaLink: './test-interface.html?");
  content = content.replace(/ctaLink:\s*['"]\/live-tests\?/g, "ctaLink: './live-tests.html?");
  
  content = content.replace(/link:\s*['"]\/current-affairs\?/g, "link: './current-affairs.html?");
  content = content.replace(/link:\s*['"]\/exam-detail\?/g, "link: './exam-detail.html?");
  content = content.replace(/link:\s*['"]\/notes\?/g, "link: './notes.html?");
  
  content = content.replace(/route:\s*['"]\/rankhub-pass['"]/g, "route: './rankhub-pass.html'");
  
  content = content.replace(/`\/exam-detail\?/g, '`./exam-detail.html?');
  content = content.replace(/`\/test-result\?/g, '`./test-result.html?');
  content = content.replace(/`\/test-interface\?/g, '`./test-interface.html?');
  content = content.replace(/`\/practice\?/g, '`./practice.html?');

  fs.writeFileSync(file, content);
}

console.log("Basic fixes applied.");
