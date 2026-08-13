const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.js'));
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html')).map(f => f.replace('.html', ''));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  htmlFiles.forEach(hf => {
    // exact matches like window.location.href = '/exam-detail' or '/exam-detail?exam=123'
    // or './exam-detail'
    
    if (hf === 'index') {
      const re = /location\.href\s*=\s*['"]\/?['"]/g;
      if (re.test(content)) {
        content = content.replace(re, `location.href = './index.html'`);
        changed = true;
      }
    }
    
    const re = new RegExp(`location\\.href\\s*=\\s*[\`'"]\\.?\\/?${hf}(#[^\`'"]*)?[\`'"]`, 'g');
    if (re.test(content)) {
      content = content.replace(re, `location.href = './${hf}.html$1'`);
      changed = true;
    }
    
    // For query string e.g. location.href = `/exam-detail?exam=${examId}`
    const re2 = new RegExp(`location\\.href\\s*=\\s*[\`'"]\\.?\\/?${hf}\\?([^\`'"]*)[\`'"]`, 'g');
    if (re2.test(content)) {
      content = content.replace(re2, `location.href = \`./${hf}.html?$1\``);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed location.href in ${file}`);
  }
});
