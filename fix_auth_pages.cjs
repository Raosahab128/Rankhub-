const fs = require('fs');

['signin.html', 'signup.html'].forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if not already wrapped
    if (!content.includes('document.addEventListener("DOMContentLoaded"')) {
      content = content.replace(
        "document.getElementById('currentYear').textContent = new Date().getFullYear();",
        `document.addEventListener("DOMContentLoaded", () => {
      document.getElementById('currentYear').textContent = new Date().getFullYear();`
      );
      
      content = content.replace(
        "</script>\n</body>",
        "  });\n  </script>\n</body>"
      );
      
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
});
