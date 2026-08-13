const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const htmlFiles = files.map(f => f.replace('.html', ''));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  htmlFiles.forEach(hf => {
    if (hf === 'index') {
      content = content.replace(/href=["']\/?["']/g, 'href="./index.html"');
      content = content.replace(/href=["']\/(index)?["']/g, 'href="./index.html"');
    }
    
    // Replace href="/page" or href="/page#..." or href="./page" without .html
    const re = new RegExp(`href=["']\\.?\\/?${hf}(#[^"']*)?["']`, 'g');
    content = content.replace(re, `href="./${hf}.html$1"`);
    
    const re2 = new RegExp(`href=["']\\.?\\/?${hf}\\?([^"']*)["']`, 'g');
    content = content.replace(re2, `href="./${hf}.html?$1"`);
  });

  fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed hrefs');
