import {  auth, db, doc, getDoc, getDocs, collection, query, where , getCurrentUser } from './firebase.js';
import { getExamById } from './exam-store.js';
import { getQuestionBank } from './question-bank-store.js';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('resultContainer');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get('exam');
  const testId = urlParams.get('test');
  const attemptId = urlParams.get('attemptId');

  if (!examId || (!testId && !attemptId)) {
    container.innerHTML = `<div style="padding: 40px; text-align: center; color: #64748B;">Invalid result ID or URL parameters.</div>`;
    return;
  }

    container.innerHTML = ``;

  
  // Wait for auth to initialize
  const firebaseUser = await getCurrentUser();
  if (!firebaseUser) return; // auth-guard will redirect
  const uid = firebaseUser.uid;
  if (!uid) {

    container.innerHTML = `<div style="padding: 40px; text-align: center; color: #DC2626;">You don't have permission to view this result. Please sign in.</div>`;
    return;
  }

  try {
    let result = null;
    let resolvedTestId = testId;

    if (attemptId) {
      // Fetch specific attempt by document ID
      const docRef = doc(db, `users/${uid}/testAttempts`, attemptId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        result = docSnap.data();
        resolvedTestId = result.testId || testId;
      }
    }

    if (!result && resolvedTestId) {
      // Fetch attempts for this test without composite index requirement
      const attemptsRef = collection(db, `users/${uid}/testAttempts`);
      const q = query(attemptsRef, where("testId", "==", resolvedTestId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const attempts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        attempts.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
        result = attempts[0];
      }
    }

    if (!result) {
      container.innerHTML = `<div style="padding: 40px; text-align: center; color: #64748B;">Result not found.</div>`;
      return;
    }

    const examData = (await getExamById(examId)) || { name: 'Mock Test' };

    // Fetch stats for best score
    let stats = { bestScore: result.score || 0 };
    try {
      const statsDoc = await getDoc(doc(db, `users/${uid}/testStats`, resolvedTestId));
      if (statsDoc.exists()) {
        stats = statsDoc.data();
      }
    } catch (e) {
      console.warn("Could not fetch test stats:", e);
    }

    renderResultUI(result, examData, stats, resolvedTestId, examId);
  } catch (err) {
    console.error("Error loading result:", err);
    if (err.code === 'permission-denied') {
      container.innerHTML = `<div style="padding: 40px; text-align: center; color: #DC2626;">You don't have permission to view this result.</div>`;
    } else {
      container.innerHTML = `<div style="padding: 40px; text-align: center; color: #DC2626;">Unable to load result. Please try again.</div>`;
    }
  }

  function renderResultUI(result, examData, stats, tId, eId) {
    const scoreVal = result.score ?? 0;
    const maxScore = (result.totalQuestions || 4) * 2;
    const timeTaken = result.timeTaken || 0;
    const timeMins = Math.floor(timeTaken / 60);
    const timeSecs = timeTaken % 60;
    const submittedStr = result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'Recently';

    container.innerHTML = `
      <div style="background: #FFF; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #E2E8F0;">
        <h2 style="font-size: 1.5rem; font-weight: 800; color: #0F172A; margin-bottom: 8px;">${escapeHtml(result.testName || examData.name || 'Mock Test')} Result</h2>
        <p style="font-size: 0.9rem; color: #64748B; margin-bottom: 24px;">Attempt #${result.attemptNumber || 1} &bull; ${submittedStr}</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <div style="font-size: 1.875rem; font-weight: 800; color: #0F172A;">${scoreVal} / ${maxScore}</div>
            <div style="font-size: 0.875rem; color: #64748B;">Score</div>
          </div>
          <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <div style="font-size: 1.875rem; font-weight: 800; color: #0F172A;">${stats.bestScore ?? scoreVal} / ${maxScore}</div>
            <div style="font-size: 0.875rem; color: #64748B;">Best Score</div>
          </div>
          <div style="background: #F0FDF4; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #BBF7D0;">
            <div style="font-size: 1.875rem; font-weight: 800; color: #16A34A;">${result.percentage || result.accuracy || 0}%</div>
            <div style="font-size: 0.875rem; color: #64748B;">Percentage</div>
          </div>
          <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <div style="font-size: 1.875rem; font-weight: 800; color: #3B82F6;">${timeMins}m ${timeSecs}s</div>
            <div style="font-size: 0.875rem; color: #64748B;">Time Taken</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px;">
          <div style="background: #F8FAFC; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <span style="display: block; font-size: 1.25rem; font-weight: 700; color: #16A34A;">${result.correct || 0}</span>
            <span style="font-size: 0.75rem; color: #64748B;">Correct</span>
          </div>
          <div style="background: #F8FAFC; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <span style="display: block; font-size: 1.25rem; font-weight: 700; color: #DC2626;">${result.wrong || result.incorrect || 0}</span>
            <span style="font-size: 0.75rem; color: #64748B;">Incorrect</span>
          </div>
          <div style="background: #F8FAFC; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <span style="display: block; font-size: 1.25rem; font-weight: 700; color: #64748B;">${result.unanswered || result.unattempted || 0}</span>
            <span style="font-size: 0.75rem; color: #64748B;">Unattempted</span>
          </div>
          <div style="background: #F8FAFC; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
            <span style="display: block; font-size: 1.25rem; font-weight: 700; color: #0F172A;">${result.totalQuestions || 4}</span>
            <span style="font-size: 0.75rem; color: #64748B;">Total Qs</span>
          </div>
        </div>

        <div style="display: flex; gap: 16px;">
          <a href="./test-interface.html?exam=${eId}&test=${tId}&reattempt=true" style="flex: 1; padding: 12px; background: #DC2626; color: #FFF; text-align: center; border-radius: 8px; font-weight: 600; text-decoration: none;">Re-attempt Test</a>
          <button id="viewDetailedAnsBtn" style="flex: 1; padding: 12px; background: #FFF; color: #0F172A; text-align: center; border: 1px solid #CBD5E1; border-radius: 8px; font-weight: 600; cursor: pointer;">View Detailed Answers</button>
        </div>
      </div>

      <div id="detailedAnswersContainer" style="display: none; margin-top: 32px;">
        <h3 style="font-size: 1.25rem; font-weight: 800; color: #0F172A; margin-bottom: 16px;">Detailed Answers</h3>
        <div id="detailedAnswersList" style="display: flex; flex-direction: column; gap: 16px;"></div>
      </div>
    `;

    const btn = document.getElementById('viewDetailedAnsBtn');
    if (btn) {
      btn.addEventListener('click', async () => {
        const detailsContainer = document.getElementById('detailedAnswersContainer');
        if (detailsContainer) {
          detailsContainer.style.display = detailsContainer.style.display === 'none' ? 'block' : 'none';
          if (detailsContainer.style.display === 'block') {
             await renderDetailedAnswers(result);
          }
        }
      });
    }
  }

  async function renderDetailedAnswers(result) {
    const list = document.getElementById('detailedAnswersList');
    if (!list) return;

    const queryExamId = result.examId || result.testId || 'ssc-cgl';
    const allQuestions = await getQuestionBank({ examId: queryExamId });
    let MOCK_QUESTIONS = [];
    if (allQuestions.length > 0) {
      MOCK_QUESTIONS = allQuestions.slice(0, 50).map((q, idx) => {
        const opts = [q.optionA, q.optionB, q.optionC, q.optionD];
        const correctIdx = ['optionA', 'optionB', 'optionC', 'optionD'].indexOf(q.correctAnswer);
        return {
          id: q.id,
          question: q.question,
          options: opts,
          correct: correctIdx !== -1 ? correctIdx : 0,
          explanation: q.explanation
        };
      });
    }

    list.innerHTML = MOCK_QUESTIONS.map((q, idx) => {
      const userAns = result.answers ? result.answers[idx] : null;
      const isCorrect = userAns === q.correct;
      const isUnanswered = userAns === null || userAns === undefined;

      let statusHtml = '';
      if (isUnanswered) {
        statusHtml = `<span style="display: inline-block; padding: 4px 8px; background: #F1F5F9; color: #64748B; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">Skipped</span>`;
      } else if (isCorrect) {
        statusHtml = `<span style="display: inline-block; padding: 4px 8px; background: #DCFCE7; color: #16A34A; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">Correct</span>`;
      } else {
        statusHtml = `<span style="display: inline-block; padding: 4px 8px; background: #FEE2E2; color: #DC2626; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">Incorrect</span>`;
      }

      return `
        <div style="background: #FFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <h4 style="font-size: 1rem; font-weight: 700; color: #0F172A; margin: 0; line-height: 1.5;">Q${idx + 1}. ${escapeHtml(q.question)}</h4>
            ${statusHtml}
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
            ${q.options.map((opt, oIdx) => {
              let optStyle = "padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 0.9rem; color: #334155;";
              let icon = "";
              if (oIdx === q.correct) {
                optStyle = "padding: 10px 12px; border: 1px solid #16A34A; background: #F0FDF4; border-radius: 6px; font-size: 0.9rem; color: #15803D; font-weight: 600;";
                icon = " ✓";
              } else if (oIdx === userAns && !isCorrect) {
                optStyle = "padding: 10px 12px; border: 1px solid #DC2626; background: #FEF2F2; border-radius: 6px; font-size: 0.9rem; color: #B91C1C; font-weight: 600;";
                icon = " ✗";
              }
              return `<div style="${optStyle}">${String.fromCharCode(65 + oIdx)}. ${escapeHtml(opt)}${icon}</div>`;
            }).join('')}
          </div>
          <div style="background: #F8FAFC; padding: 12px; border-radius: 6px; border-left: 4px solid #3B82F6;">
            <p style="font-size: 0.875rem; color: #475569; margin: 0;"><strong>Explanation:</strong> ${escapeHtml(q.explanation)}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
