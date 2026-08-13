const fs = require('fs');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

for (let file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace rankhub-footer
  // Using a regex that matches <footer class="rankhub-footer">...</footer> across multiple lines
  const rankhubFooterRegex = /<footer class="rankhub-footer">[\s\S]*?<\/footer>/g;
  if (rankhubFooterRegex.test(content)) {
    content = content.replace(rankhubFooterRegex, '');
    console.log(`Removed rankhub-footer from ${file}`);
  }
  
  // Replace site-footer
  const siteFooterRegex = /<footer class="site-footer">[\s\S]*?<\/footer>/g;
  if (siteFooterRegex.test(content)) {
    content = content.replace(siteFooterRegex, '');
    console.log(`Removed site-footer from ${file}`);
  }
  
  // Safely handle currentYear script if it exists
  const currentYearScript = "document.getElementById('currentYear').textContent = new Date().getFullYear();";
  const safeCurrentYearScript = "const cyEl = document.getElementById('currentYear'); if (cyEl) cyEl.textContent = new Date().getFullYear();";
  
  if (content.includes(currentYearScript)) {
    content = content.replace(currentYearScript, safeCurrentYearScript);
    console.log(`Patched currentYear script in ${file}`);
  }

  fs.writeFileSync(file, content);
}

// Remove rankhub-footer CSS from style.css just to be clean
let css = fs.readFileSync('style.css', 'utf8');
// Not strictly required but we can do it if needed. Leaving it alone is safer unless requested.
// We can just leave it since it's just CSS rules.

console.log('Footer removal complete.');
