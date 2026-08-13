import { getExamById } from './exam-store.js';
import { getPyqPaperById } from './pyq-store.js';
import { getQuestionBank } from './question-bank-store.js';
import {  auth, db, collection, addDoc, doc, setDoc, getDoc , getCurrentUser } from './firebase.js';
import { canAccessContent, showRankHubPassModal } from './subscription-service.js';

let MOCK_QUESTIONS = [];

document.addEventListener('DOMContentLoaded', async () => {
  
  const firebaseUser = await getCurrentUser();
  if (!firebaseUser) return; // auth-guard handles redirect
  
  let currentUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
  };
  try {
    const saved = localStorage.getItem('rankhub_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      currentUser = Object.assign(currentUser, parsed);
    }
  } catch(e) {}
    

  const urlParams = new URLSearchParams(window.location.search);
  
  const examId = urlParams.get('exam') || 'ssc-cgl';
  
  // Dynamic mock questions from bank
  const allQuestions = await getQuestionBank({ examId });
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

  const exam = (await getExamById(examId)) || { name: 'SSC CGL', category: 'SSC' };

  const testId = urlParams.get('test');
  const pyqId = urlParams.get('pyq');

  let itemIndex = 0;
  if (testId && exam.mockTestsList) {
    const foundIdx = exam.mockTestsList.findIndex(t => t.id === testId);
    if (foundIdx !== -1) itemIndex = foundIdx;
  } else if (pyqId && exam.pyqList) {
    const foundIdx = exam.pyqList.findIndex(p => p.id === pyqId);
    if (foundIdx !== -1) itemIndex = foundIdx;
  }

  const allowed = await canAccessContent(currentUser, 'test', itemIndex);
  if (!allowed) {
    showRankHubPassModal(testId ? `Mock Test #${itemIndex + 1}` : `PYQ Paper #${itemIndex + 1}`);
    setTimeout(() => {
      window.location.href = `./exam-detail.html?id=${exam.id}&tab=tests`;
    }, 1800);
    return;
  }

  let currentQIdx = 0;
  let userAnswers = new Array(MOCK_QUESTIONS.length).fill(null);
  let isMarkedForReview = new Array(MOCK_QUESTIONS.length).fill(false);
  let targetEndTime = null;
  let timerInterval = null;

  // DOM Elements
  const headerTitleEl = document.getElementById('testHeaderTitle');
  const examTagEl = document.getElementById('testExamTag');
  const timerDisplayEl = document.getElementById('timeRemainingDisplay');
  const qNumBadge = document.getElementById('qNumBadge');
  const questionText = document.getElementById('questionText');
  const optionsContainer = document.getElementById('optionsContainer');
  const paletteGrid = document.getElementById('qPaletteGrid');

  const prevBtn = document.getElementById('prevQBtn');
  const nextBtn = document.getElementById('nextQBtn');
  const clearBtn = document.getElementById('clearOptionBtn');
  const markReviewBtn = document.getElementById('markReviewBtn');
  const submitTopBtn = document.getElementById('submitTestTopBtn');
  const submitSideBtn = document.getElementById('submitTestSideBtn');

  // Drawer Elements
  const togglePaletteMenuBtn = document.getElementById('togglePaletteMenuBtn');
  const closePaletteBtn = document.getElementById('closePaletteBtn');
  const closePaletteFooterBtn = document.getElementById('closePaletteFooterBtn');
  const paletteBackdrop = document.getElementById('paletteDrawerBackdrop');
  const paletteAside = document.getElementById('testPaletteAside');

  // Submit Confirmation Modal Elements
  const submitConfirmBackdrop = document.getElementById('submitConfirmBackdrop');
  const submitConfirmModal = document.getElementById('submitConfirmModal');
  const confirmTotalQ = document.getElementById('confirmTotalQ');
  const confirmAnsweredQ = document.getElementById('confirmAnsweredQ');
  const confirmMarkedQ = document.getElementById('confirmMarkedQ');
  const confirmUnansweredQ = document.getElementById('confirmUnansweredQ');
  const cancelSubmitModalBtn = document.getElementById('cancelSubmitModalBtn');
  const confirmSubmitModalBtn = document.getElementById('confirmSubmitModalBtn');

  // Leave Test Confirmation Modal Elements
  const testBackBtn = document.getElementById('testBackBtn');
  const leaveConfirmBackdrop = document.getElementById('leaveConfirmBackdrop');
  const leaveConfirmModal = document.getElementById('leaveConfirmModal');
  const cancelLeaveModalBtn = document.getElementById('cancelLeaveModalBtn');
  const confirmLeaveModalBtn = document.getElementById('confirmLeaveModalBtn');

  // Result Modal Elements
  const resultModal = document.getElementById('testResultModal');
  const resultBackdrop = document.getElementById('testResultBackdrop');
  const finalScoreVal = document.getElementById('finalScoreVal');
  const resultAccuracyVal = document.getElementById('resultAccuracyVal');
  const correctCountVal = document.getElementById('correctCountVal');
  const wrongCountVal = document.getElementById('wrongCountVal');
  const skippedCountVal = document.getElementById('skippedCountVal');
  const timeTakenVal = document.getElementById('timeTakenVal');
  const restartTestBtn = document.getElementById('restartTestBtn');
  const examData = exam;

  function openPaletteDrawer() {
    if (paletteAside) paletteAside.classList.add('open');
    if (paletteBackdrop) paletteBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closePaletteDrawer() {
    if (paletteAside) paletteAside.classList.remove('open');
    if (paletteBackdrop) paletteBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  function openSubmitConfirmModal() {
    closePaletteDrawer();
    let answered = 0;
    let marked = 0;
    let unanswered = 0;

    MOCK_QUESTIONS.forEach((_, idx) => {
      if (isMarkedForReview[idx]) {
        marked++;
      } else if (userAnswers[idx] !== null) {
        answered++;
      } else {
        unanswered++;
      }
    });

    if (confirmTotalQ) confirmTotalQ.textContent = MOCK_QUESTIONS.length.toString();
    if (confirmAnsweredQ) confirmAnsweredQ.textContent = answered.toString();
    if (confirmMarkedQ) confirmMarkedQ.textContent = marked.toString();
    if (confirmUnansweredQ) confirmUnansweredQ.textContent = unanswered.toString();

    if (submitConfirmModal) submitConfirmModal.classList.add('active');
    if (submitConfirmBackdrop) submitConfirmBackdrop.classList.add('active');
  }

  function closeSubmitConfirmModal() {
    if (submitConfirmModal) submitConfirmModal.classList.remove('active');
    if (submitConfirmBackdrop) submitConfirmBackdrop.classList.remove('active');
  }

  if (togglePaletteMenuBtn) togglePaletteMenuBtn.addEventListener('click', openPaletteDrawer);
  if (closePaletteBtn) closePaletteBtn.addEventListener('click', closePaletteDrawer);
  if (closePaletteFooterBtn) closePaletteFooterBtn.addEventListener('click', closePaletteDrawer);
  if (paletteBackdrop) paletteBackdrop.addEventListener('click', closePaletteDrawer);

  if (cancelSubmitModalBtn) cancelSubmitModalBtn.addEventListener('click', closeSubmitConfirmModal);
  if (submitConfirmBackdrop) submitConfirmBackdrop.addEventListener('click', closeSubmitConfirmModal);
  if (confirmSubmitModalBtn) {
    confirmSubmitModalBtn.addEventListener('click', () => {
      closeSubmitConfirmModal();
      submitTest();
    });
  }

  function openLeaveConfirmModal() {
    closePaletteDrawer();
    if (leaveConfirmBackdrop) leaveConfirmBackdrop.classList.add('active');
    if (leaveConfirmModal) leaveConfirmModal.classList.add('active');
  }

  function closeLeaveConfirmModal() {
    if (leaveConfirmBackdrop) leaveConfirmBackdrop.classList.remove('active');
    if (leaveConfirmModal) leaveConfirmModal.classList.remove('active');
  }

  if (testBackBtn) testBackBtn.addEventListener('click', openLeaveConfirmModal);
  if (cancelLeaveModalBtn) cancelLeaveModalBtn.addEventListener('click', closeLeaveConfirmModal);
  if (leaveConfirmBackdrop) leaveConfirmBackdrop.addEventListener('click', closeLeaveConfirmModal);
  if (confirmLeaveModalBtn) {
    confirmLeaveModalBtn.addEventListener('click', () => {
      closeLeaveConfirmModal();
      window.location.href = `./exam-detail.html?id=${examId}`;
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePaletteDrawer();
      closeSubmitConfirmModal();
      closeLeaveConfirmModal();
    }
  });

  const pyqParam = urlParams.get('pyq');
  const pyqPaper = pyqParam ? getPyqPaperById(pyqParam) : null;

  // Determine test duration (default 60 mins or from paper details)
  let durationSeconds = 3600;
  if (pyqPaper && pyqPaper.duration) {
    const parsedMin = parseInt(pyqPaper.duration, 10);
    if (!isNaN(parsedMin) && parsedMin > 0) {
      durationSeconds = parsedMin * 60;
    }
  }

  // Initialize Header Info
  if (headerTitleEl) {
    if (pyqPaper) {
      headerTitleEl.textContent = pyqPaper.paperTitle;
    } else {
      headerTitleEl.textContent = `${exam.name} Full Mock Test 01`;
    }
  }
  if (examTagEl) examTagEl.textContent = pyqPaper ? pyqPaper.examCategory : exam.name;

  startTimer(urlParams.get('reattempt') === 'true');
  renderQuestion(currentQIdx);
  renderPalette();

  // Button Handlers
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentQIdx > 0) {
        currentQIdx--;
        renderQuestion(currentQIdx);
        renderPalette();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentQIdx < MOCK_QUESTIONS.length - 1) {
        currentQIdx++;
        renderQuestion(currentQIdx);
        renderPalette();
      } else {
        openSubmitConfirmModal();
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      userAnswers[currentQIdx] = null;
      renderQuestion(currentQIdx);
      renderPalette();
    });
  }

  if (markReviewBtn) {
    markReviewBtn.addEventListener('click', () => {
      isMarkedForReview[currentQIdx] = !isMarkedForReview[currentQIdx];
      renderQuestion(currentQIdx);
      renderPalette();
    });
  }

  if (submitTopBtn) submitTopBtn.addEventListener('click', openSubmitConfirmModal);
  if (submitSideBtn) submitSideBtn.addEventListener('click', openSubmitConfirmModal);

  if (restartTestBtn) {
    restartTestBtn.addEventListener('click', () => {
      userAnswers.fill(null);
      isMarkedForReview.fill(false);
      currentQIdx = 0;
      if (resultModal) resultModal.classList.remove('active');
      if (resultBackdrop) resultBackdrop.classList.remove('active');
      isSubmitting = false;
      if (confirmSubmitModalBtn) {
        confirmSubmitModalBtn.textContent = 'Confirm Submit';
        confirmSubmitModalBtn.disabled = false;
      }
      if (submitTopBtn) submitTopBtn.disabled = false;
      if (submitSideBtn) submitSideBtn.disabled = false;
      startTimer(true);
      renderQuestion(currentQIdx);
      renderPalette();
    });
  }

  function getOrInitEndTime(forceNew = false) {
    const sessionKey = `rankhub_test_endtime_${pyqParam || examId}`;
    if (forceNew) {
      sessionStorage.removeItem(sessionKey);
    }
    const saved = sessionStorage.getItem(sessionKey);
    let endTime = saved ? parseInt(saved, 10) : null;
    if (!endTime || isNaN(endTime) || endTime <= Date.now()) {
      endTime = Date.now() + (durationSeconds * 1000);
      sessionStorage.setItem(sessionKey, endTime.toString());
    }
    return endTime;
  }

  function updateTimerDisplay() {
    if (!targetEndTime) return;
    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((targetEndTime - now) / 1000));

    if (timerDisplayEl) {
      const hours = Math.floor(remainingSeconds / 3600);
      const mins = Math.floor((remainingSeconds % 3600) / 60);
      const secs = remainingSeconds % 60;

      if (hours > 0) {
        timerDisplayEl.textContent = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        timerDisplayEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    }

    if (remainingSeconds <= 0) {
      stopTimer();
      submitTest();
    }
  }

  function startTimer(forceNew = false) {
    stopTimer();
    targetEndTime = getOrInitEndTime(forceNew);
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      updateTimerDisplay();
    }, 500);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // Synchronize timer display immediately when returning to tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && timerInterval) {
      updateTimerDisplay();
    }
  });

  function renderQuestion(idx) {
    if (MOCK_QUESTIONS.length === 0) {
      if (questionText) questionText.textContent = "No questions available for this test yet.";
      if (optionsContainer) optionsContainer.innerHTML = "";
      if (qNumBadge) qNumBadge.textContent = "0 of 0";
      return;
    }
    const q = MOCK_QUESTIONS[idx];
    if (!q) return;

    if (qNumBadge) qNumBadge.textContent = `Question ${idx + 1} of ${MOCK_QUESTIONS.length}`;
    if (questionText) questionText.textContent = q.question;

    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) {
      const isLast = idx === MOCK_QUESTIONS.length - 1;
      nextBtn.innerHTML = isLast
        ? `<span>Submit Test</span>`
        : `<span>Save & Next</span><svg class="btn-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
    }

    if (markReviewBtn) {
      const isMarked = isMarkedForReview[idx];
      markReviewBtn.style.backgroundColor = '';
      markReviewBtn.style.borderColor = '';
      markReviewBtn.style.color = '';
      markReviewBtn.classList.toggle('is-marked', isMarked);
      markReviewBtn.innerHTML = isMarked
        ? `<svg class="btn-flag-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg><span>Marked for Review</span>`
        : `<svg class="btn-flag-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg><span>Mark for Review</span>`;
    }

    if (optionsContainer) {
      optionsContainer.innerHTML = q.options.map((opt, oIdx) => {
        const isSelected = userAnswers[idx] === oIdx;
        return `
          <label class="option-card ${isSelected ? 'selected' : ''}">
            <input type="radio" name="optChoice" value="${oIdx}" ${isSelected ? 'checked' : ''} style="accent-color: #DC2626;" />
            <span class="opt-label-letter">${String.fromCharCode(65 + oIdx)}.</span>
            <span class="opt-text">${escapeHtml(opt)}</span>
          </label>
        `;
      }).join('');

      const radios = optionsContainer.querySelectorAll('input[name="optChoice"]');
      radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          userAnswers[idx] = parseInt(e.target.value, 10);
          renderQuestion(idx);
          renderPalette();
        });
      });
    }
  }

  function renderPalette() {
    if (!paletteGrid) return;
    paletteGrid.innerHTML = '';

    MOCK_QUESTIONS.forEach((_, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      
      let statusClass = 'dot-unanswered';
      if (idx === currentQIdx) {
        statusClass = 'dot-current';
      } else if (isMarkedForReview[idx]) {
        statusClass = 'dot-marked';
      } else if (userAnswers[idx] !== null) {
        statusClass = 'dot-answered';
      }

      btn.className = `palette-btn ${statusClass}`;
      btn.textContent = idx + 1;

      btn.addEventListener('click', () => {
        currentQIdx = idx;
        renderQuestion(currentQIdx);
        renderPalette();
        closePaletteDrawer();
      });

      paletteGrid.appendChild(btn);
    });
  }

  let isSubmitting = false;
  async function submitTest() {
    if (isSubmitting) return;
    
    // Auth validation
    if (!auth.currentUser) {
      alert("Unable to submit test. You must be logged in.");
      window.location.href = './signin.html';
      return;
    }

    isSubmitting = true;
    closePaletteDrawer();
    stopTimer();
    const sessionKey = `rankhub_test_endtime_${pyqParam || examId}`;
    sessionStorage.removeItem(sessionKey);

    if (confirmSubmitModalBtn) {
      confirmSubmitModalBtn.textContent = 'Submitting...';
      confirmSubmitModalBtn.disabled = true;
    }
    if (submitTopBtn) submitTopBtn.disabled = true;
    if (submitSideBtn) submitSideBtn.disabled = true;

    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    MOCK_QUESTIONS.forEach((q, idx) => {
      const ans = userAnswers[idx];
      if (ans === null) {
        skipped++;
      } else if (ans === q.correct) {
        correct++;
      } else {
        wrong++;
      }
    });

    const marksObtained = (correct * 2) - (wrong * 0.5);
    const maxMarks = MOCK_QUESTIONS.length * 2;
    const accuracy = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;
    
    const now = Date.now();
    let timeTaken = 0;
    if (targetEndTime) {
      timeTaken = Math.max(0, Math.min(durationSeconds, Math.floor((durationSeconds * 1000 - (targetEndTime - now)) / 1000)));
    }


    try {
      const uid = auth.currentUser.uid;
      const testId = urlParams.get('test') || pyqParam || examId || 'unknown_test';
      const testName = pyqPaper ? pyqPaper.title : (exam ? exam.name + ' Mock' : 'Mock Test');
      const examName = exam ? exam.id : 'unknown_exam';

      // 1. Fetch current stats
      const statsRef = doc(db, `users/${uid}/testStats`, testId);
      const statsDoc = await getDoc(statsRef);
      let stats = statsDoc.exists() ? statsDoc.data() : {
        testId: testId,
        attempts: 0,
        bestScore: 0,
        bestPercentage: 0,
        latestScore: 0,
        latestPercentage: 0,
        latestAttemptAt: null
      };

      const attemptNumber = (stats.attempts || 0) + 1;

      // 2. Result Object for Firestore (testAttempts collection)
      const attemptId = `attempt_${Date.now()}_${Math.floor(Math.random()*1000)}`;
      const resultObj = {
        attemptId: attemptId,
        userId: uid,
        testId: testId,
        testName: testName,
        examId: examName,
        attemptNumber: attemptNumber,
        score: marksObtained,
        percentage: accuracy,
        correct: correct,
        wrong: wrong,
        unattempted: skipped,
        totalQuestions: MOCK_QUESTIONS.length,
        timeTaken: timeTaken,
        answers: userAnswers,
        submittedAt: new Date().toISOString()
      };

      // Save Attempt
      await setDoc(doc(db, `users/${uid}/testAttempts`, attemptId), resultObj);

      // 3. Update Stats
      stats.attempts = attemptNumber;
      stats.latestScore = marksObtained;
      stats.latestPercentage = accuracy;
      stats.latestAttemptAt = resultObj.submittedAt;
      
      if (marksObtained > stats.bestScore || stats.attempts === 1) {
        stats.bestScore = marksObtained;
        stats.bestPercentage = accuracy;
      }
      
      await setDoc(statsRef, stats);

      // Navigate to Result Page
      window.location.replace(`./test-result.html?exam=${examId}&test=${testId}&attemptId=${attemptId}`);
    } catch (err) {
      console.error("Submission error", err);
      alert("Unable to submit test. Please try again.");
      isSubmitting = false;
      if (confirmSubmitModalBtn) {
        confirmSubmitModalBtn.textContent = 'Confirm Submit';
        confirmSubmitModalBtn.disabled = false;
      }
      if (submitTopBtn) submitTopBtn.disabled = false;
      if (submitSideBtn) submitSideBtn.disabled = false;
    }
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
