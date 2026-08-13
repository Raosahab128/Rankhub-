const fs = require('fs');

let adminJs = fs.readFileSync('admin.js', 'utf8');
adminJs = adminJs.replace(/href="\/"/g, 'href="./index.html"');
fs.writeFileSync('admin.js', adminJs);

let navJs = fs.readFileSync('navigation.js', 'utf8');
navJs = navJs.replace(/href="\/profile#settings"/g, 'href="./profile.html#settings"');
fs.writeFileSync('navigation.js', navJs);

console.log("Remaining fixes applied.");
