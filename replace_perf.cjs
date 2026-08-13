const fs = require('fs');
let code = fs.readFileSync('js/performance.js', 'utf8');

const newCode = `
import { auth, db, collection, getDocs, query, orderBy, limit } from './firebase.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  let user = null;
  try {
    const saved = localStorage.getItem('rankhub_user');
    if (saved) user = JSON.parse(saved);
  } catch (e) {}

  if (!user || !user.email) {
    return;
  }

  // Wait for auth init
  await new Promise(resolve => {
    const check = () => {
      if (auth.currentUser || localStorage.getItem('rankhub_user')) resolve();
      else setTimeout(check, 100);
    };
    check();
  });

  const uid = auth.currentUser ? auth.currentUser.uid : user.uid;

  let stats = {};
  try {
    const rawStats = localStorage.getItem('rankhub_user_stats');
    if (rawStats) stats = JSON.parse(rawStats);
  } catch (e) {}

  let recentResults = [];
  try {
    const attemptsRef = collection(db, \`users/\${uid}/testAttempts\`);
    const q = query(attemptsRef, orderBy("submittedAt", "desc"), limit(20));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      recentResults.push(docSnap.data());
    });
  } catch (err) {
    console.error("Failed to load test history", err);
  }

  const attempted = stats.attempted || stats.solved ? parseInt(stats.solved || stats.attempted, 10) : 0;
  const testsAttempted = stats.testsAttempted || 0;
  const testsCompleted = stats.testsCompleted || 0;
  const practiceQuestions = stats.practiceQuestions || attempted;
  const averageScore = stats.averageScore || '0%';
  const bestScore = stats.bestScore || '0%';
  const currentStreak = stats.streak || stats.currentStreak || 0;

  renderPerformanceDashboard({
    testsAttempted,
    testsCompleted,
    practiceQuestions,
    averageScore,
    bestScore,
    currentStreak,
    recentResults,
    subjectPerformance: stats.subjectPerformance || []
  });
});

function renderPerformanceDashboard(data) {
  const container = document.getElementById('performanceContainer');
  if (!container) return;

  container.innerHTML = \`
    <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 20px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
        <div>
          <span style="display: inline-block; padding: 4px 12px; background: #FEF2F2; color: #DC2626; border-radius: 999px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 8px;">Analytics & Reports</span>
          <h1 style="font-size: 1.625rem; font-weight: 800; color: #0F172A; margin: 0;">Performance Dashboard</h1>
        </div>
      </div>

      <!-- Key Metrics Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 28px;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 12px;">
          <div style="font-size: 0.72rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Tests Attempted</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #0F172A; margin-top: 6px;">\${data.testsAttempted}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 12px;">
          <div style="font-size: 0.72rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Average Score</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #9333EA; margin-top: 6px;">\${data.averageScore}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 12px;">
          <div style="font-size: 0.72rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Current Streak</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #DC2626; margin-top: 6px;">🔥 \${data.currentStreak} Days</div>
        </div>
      </div>

      <!-- Recent Test Results -->
      <div style="margin-bottom: 28px;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin-bottom: 14px;">📝 Test History</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
        \${data.recentResults.length > 0 ? data.recentResults.map(res => \`
          <div style="padding: 16px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="flex: 1; min-width: 200px;">
              <div style="font-weight: 700; color: #0F172A; font-size: 1rem;">\${res.testName || 'Mock Test'}</div>
              <div style="font-size: 0.8rem; color: #64748B; margin-top: 4px;">
                Attempt #\${res.attemptNumber} &bull; \${new Date(res.submittedAt).toLocaleString()}
              </div>
              <div style="font-size: 0.8rem; color: #64748B; margin-top: 4px;">
                Correct: <span style="color:#16A34A;font-weight:600">\${res.correct}</span> &bull; 
                Wrong: <span style="color:#DC2626;font-weight:600">\${res.wrong || res.incorrect}</span> &bull; 
                Skipped: <span style="color:#64748B;font-weight:600">\${res.unattempted || res.unanswered || 0}</span>
              </div>
            </div>
            <div style="text-align: right; margin-right: 16px;">
              <div style="font-weight: 800; color: #16A34A; font-size: 1.2rem;">\${res.score} / \${res.totalQuestions * 2}</div>
              <div style="font-size: 0.8rem; color: #64748B;">\${res.percentage}% Accuracy</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <a href="/pages/test-result.html?exam=\${res.examId}&test=\${res.testId}" style="padding: 8px 12px; background: #FFF; border: 1px solid #DC2626; color: #DC2626; border-radius: 6px; font-size: 0.85rem; font-weight: 600; text-decoration: none;">View Result</a>
              <a href="/pages/test-interface.html?exam=\${res.examId}&test=\${res.testId}&reattempt=true" style="padding: 8px 12px; background: #DC2626; color: #FFF; border-radius: 6px; font-size: 0.85rem; font-weight: 600; text-decoration: none;">Re-attempt</a>
            </div>
          </div>
        \`).join('') : \`
          <div style="text-align: center; padding: 32px 0; color: #64748B; font-size: 0.875rem;">
            No tests attempted yet. Take a mock test to view your scores here.
          </div>
        \`}
        </div>
      </div>
    </div>
  \`;
}
`;

fs.writeFileSync('js/performance.js', newCode);
console.log("Successfully replaced performance.js");
