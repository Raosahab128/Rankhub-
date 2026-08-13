const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Extract all <script ... src="..."></script> tags
  // including type="module"
  const scriptRegex = /<script\s+(?:[^>]*\s+)?src=["'][^>]+><\/script>\s*/gi;
  const scripts = [];
  
  content = content.replace(scriptRegex, (match) => {
    scripts.push(match.trim());
    return ''; // remove from current location
  });
  
  // Insert right before </body>
  if (scripts.length > 0) {
    const scriptsStr = '\n  ' + scripts.join('\n  ') + '\n</body>';
    content = content.replace(/\s*<\/body>/, scriptsStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Moved scripts in ${file}`);
  }
});
