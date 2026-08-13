const fs = require('fs');
let code = fs.readFileSync('js/test-result.js', 'utf8');

const replacement = `
        <p style="color: #64748B; margin-bottom: 24px;">Attempt #\${result.attemptNumber} &bull; \${new Date(result.submittedAt).toLocaleString()}</p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <div style="font-size: 1.875rem; font-weight: 800; color: #0F172A;">\${scoreVal} / \${maxScore}</div>
            <div style="font-size: 0.875rem; color: #64748B;">Score</div>
          </div>
          <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <div style="font-size: 1.875rem; font-weight: 800; color: #0F172A;">\${stats.bestScore} / \${maxScore}</div>
            <div style="font-size: 0.875rem; color: #64748B;">Best Score</div>
          </div>
          <div style="background: #F0FDF4; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #BBF7D0;">
            <div style="font-size: 1.875rem; font-weight: 800; color: #16A34A;">\${result.percentage || result.accuracy}%</div>
            <div style="font-size: 0.875rem; color: #64748B;">Percentage</div>
          </div>
          <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <div style="font-size: 1.875rem; font-weight: 800; color: #3B82F6;">\${timeMins}m \${timeSecs}s</div>
            <div style="font-size: 0.875rem; color: #64748B;">Time Taken</div>
          </div>
        </div>
`;

const startIndex = code.indexOf('        <p style="color: #64748B; margin-bottom: 24px;">Attempt #${result.attemptNumber}');
const endIndex = code.indexOf('        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px;">');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('js/test-result.js', code);
  console.log("Successfully replaced block.");
} else {
  console.log("Could not find block boundaries.");
}
