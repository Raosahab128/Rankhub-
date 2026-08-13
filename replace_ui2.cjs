const fs = require('fs');
let code = fs.readFileSync('js/test-result.js', 'utf8');

const replacement = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px;">
          <div style="background: #F8FAFC; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <span style="display: block; font-size: 1.25rem; font-weight: 700; color: #16A34A;">\${result.correct}</span>
            <span style="font-size: 0.75rem; color: #64748B;">Correct</span>
          </div>
          <div style="background: #F8FAFC; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <span style="display: block; font-size: 1.25rem; font-weight: 700; color: #DC2626;">\${result.wrong || result.incorrect}</span>
            <span style="font-size: 0.75rem; color: #64748B;">Incorrect</span>
          </div>
          <div style="background: #F8FAFC; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <span style="display: block; font-size: 1.25rem; font-weight: 700; color: #64748B;">\${result.unanswered || result.unattempted || 0}</span>
            <span style="font-size: 0.75rem; color: #64748B;">Unattempted</span>
          </div>
          <div style="background: #F8FAFC; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <span style="display: block; font-size: 1.25rem; font-weight: 700; color: #0F172A;">\${result.totalQuestions}</span>
            <span style="font-size: 0.75rem; color: #64748B;">Total Qs</span>
          </div>
        </div>
`;

const startIndex = code.indexOf('        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px;">');
const endIndex = code.indexOf('        <div style="display: flex; gap: 16px;">');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('js/test-result.js', code);
  console.log("Successfully replaced block.");
} else {
  console.log("Could not find block boundaries.");
}
