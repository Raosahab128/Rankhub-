const fs = require('fs');
let code = fs.readFileSync('js/test-interface.js', 'utf8');

const replacement = `
  const reattemptParam = urlParams.get('reattempt');
  if (reattemptParam) {
    sessionStorage.removeItem(\`rankhub_test_endtime_\${pyqParam || examId}\`);
  }

  // Timer Initialization
`;

const startIndex = code.indexOf('  // Timer Initialization');

if (startIndex !== -1) {
  code = code.substring(0, startIndex) + replacement + code.substring(startIndex + '  // Timer Initialization'.length);
  fs.writeFileSync('js/test-interface.js', code);
  console.log("Successfully replaced block.");
} else {
  console.log("Could not find block boundaries.");
}
