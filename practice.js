import { getCurrentUser } from './firebase.js';
import { 
  getQuestionBank, 
  getTopicsForSubject, 
  getUserBookmarks, 
  isQuestionBookmarked, 
  toggleQuestionBookmark, 
  getUserPracticeProgress, 
  recordQuestionAttempt, 
  resetPracticeProgress, 
  submitQuestionReport 
} from './question-bank-store.js';

import { EXAMS_DATA, getExamById } from './exam-store.js';

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
    

  // DOM References
  const tabs = document.querySelectorAll('.practice-tab-btn');
  const searchInput = document.getElementById('practiceSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  
  const examSelect = document.getElementById('practiceExamSelect');
  const subjectSelect = document.getElementById('practiceSubjectSelect');
  const topicSelect = document.getElementById('practiceTopicSelect');
  const difficultySelect = document.getElementById('practiceDifficultySelect');

  const container = document.getElementById('practiceQuestionsContainer');

  // Stats Counters
  const statAttempted = document.getElementById('statAttempted');
  const statCorrect = document.getElementById('statCorrect');
  const statIncorrect = document.getElementById('statIncorrect');
  const statAccuracy = document.getElementById('statAccuracy');
  
  const bookmarkBadgeCount = document.getElementById('bookmarkBadgeCount');

  // Action Buttons
  const viewBookmarksBtn = document.getElementById('viewBookmarksBtn');
  const headerBookmarksBtn = document.getElementById('headerBookmarksBtn');
  const viewHistoryBtn = document.getElementById('viewHistoryBtn');
  const resetStatsBtn = document.getElementById('resetStatsBtn');

  // Modals
  const reportModal = document.getElementById('reportModal');
  const closeReportModalBtn = document.getElementById('closeReportModalBtn');
  const reportForm = document.getElementById('reportQuestionForm');

  const bookmarksModal = document.getElementById('bookmarksModal');
  const closeBookmarksModalBtn = document.getElementById('closeBookmarksModalBtn');
  const bookmarksListContent = document.getElementById('bookmarksListContent');

  const historyModal = document.getElementById('historyModal');
  const closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');
  const historyListContent = document.getElementById('historyListContent');

  // State Management
  let activeTab = 'all'; // all | exam | subject | topic | difficulty | pyq
  let selectedExam = 'all';
  let selectedSubject = 'all';
  let selectedTopic = 'all';
  let selectedDifficulty = 'all';
  let searchQuery = '';
  
  let currentLang = 'Bilingual'; // Bilingual | English | Hindi
  let currentIndex = 0; // Single question index
  
  // Stores user attempts for current session: { [questionId]: { selectedOption: 'optionA', submitted: true, isCorrect: true } }
  let sessionState = {};

  // Check URL parameters for preset exam/subject
  const urlParams = new URLSearchParams(window.location.search);
  const examParam = urlParams.get('exam');
  const subjectParam = urlParams.get('subject');
  const topicParam = urlParams.get('topic');

  if (examParam && examSelect) {
    selectedExam = examParam;
    examSelect.value = examParam;
  }
  if (subjectParam && subjectSelect) {
    selectedSubject = subjectParam;
    subjectSelect.value = subjectParam;
  }

  // Populate initial dynamic topic options
  updateTopicsDropdown();

  if (topicParam && topicSelect) {
    selectedTopic = topicParam;
    topicSelect.value = topicParam;
  }

  // Initial Sync
  updateStatsDisplay();
  renderPracticePage();

  // Tab Handlers
  tabs.forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      tabs.forEach(b => {
        b.classList.remove('active');
        b.style.background = '#FFFFFF';
        b.style.color = '#475569';
        b.style.fontWeight = '600';
      });

      tabBtn.classList.add('active');
      tabBtn.style.background = '#0F172A';
      tabBtn.style.color = '#FFFFFF';
      tabBtn.style.fontWeight = '700';

      activeTab = tabBtn.dataset.tab;
      currentIndex = 0;

      if (activeTab === 'pyq') {
        // Reset topic & difficulty for PYQ view
      }

      renderPracticePage();
    });
  });

  // Filter Event Handlers
  if (examSelect) {
    examSelect.addEventListener('change', (e) => {
      selectedExam = e.target.value;
      updateTopicsDropdown();
      currentIndex = 0;
      renderPracticePage();
    });
  }

  if (subjectSelect) {
    subjectSelect.addEventListener('change', (e) => {
      selectedSubject = e.target.value;
      updateTopicsDropdown();
      currentIndex = 0;
      renderPracticePage();
    });
  }

  if (topicSelect) {
    topicSelect.addEventListener('change', (e) => {
      selectedTopic = e.target.value;
      currentIndex = 0;
      renderPracticePage();
    });
  }

  if (difficultySelect) {
    difficultySelect.addEventListener('change', (e) => {
      selectedDifficulty = e.target.value;
      currentIndex = 0;
      renderPracticePage();
    });
  }

  // Search Handlers
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearSearchBtn) clearSearchBtn.style.display = searchQuery.trim().length > 0 ? 'block' : 'none';
      currentIndex = 0;
      renderPracticePage();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      currentIndex = 0;
      renderPracticePage();
    });
  }

  // Stats & Bookmarks Header Actions
  if (resetStatsBtn) {
    resetStatsBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset your practice stats?')) {
        resetPracticeProgress();
        sessionState = {};
        updateStatsDisplay();
        renderPracticePage();
        showToast('Practice stats reset successfully.');
      }
    });
  }

  if (viewBookmarksBtn) viewBookmarksBtn.addEventListener('click', openBookmarksModal);
  if (headerBookmarksBtn) headerBookmarksBtn.addEventListener('click', openBookmarksModal);
  if (viewHistoryBtn) viewHistoryBtn.addEventListener('click', openHistoryModal);

  if (closeBookmarksModalBtn) closeBookmarksModalBtn.addEventListener('click', () => bookmarksModal.style.display = 'none');
  if (closeHistoryModalBtn) closeHistoryModalBtn.addEventListener('click', () => historyModal.style.display = 'none');
  if (closeReportModalBtn) closeReportModalBtn.addEventListener('click', () => reportModal.style.display = 'none');

  // Report Form Handler
  if (reportForm) {
    reportForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const qId = document.getElementById('reportQuestionId').value;
      const reasonRadio = reportForm.querySelector('input[name="reportReason"]:checked');
      const commentsInput = document.getElementById('reportCommentsInput');

      const reason = reasonRadio ? reasonRadio.value : 'Wrong Answer';
      const comments = commentsInput ? commentsInput.value.trim() : '';

      submitQuestionReport(qId, reason, comments);
      reportModal.style.display = 'none';
      commentsInput.value = '';
      showToast('Thank you! Report submitted successfully.');
    });
  }

  /**
   * Main Render Function
   */
  function renderPracticePage() {
    updateStatsDisplay();

    const filters = {
      examId: selectedExam,
      subjectId: selectedSubject,
      topicId: selectedTopic,
      difficulty: selectedDifficulty,
      source: activeTab === 'pyq' ? 'pyq' : 'all',
      searchQuery: searchQuery
    };

    const questions = getQuestionBank(filters);

    if (!container) return;

    // Requirement 16: "No questions available yet." if empty
    if (questions.length === 0) {
      container.innerHTML = `
        <div style="background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 16px; padding: 48px 24px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="width: 64px; height: 64px; background: #FEF2F2; color: #DC2626; border-radius: 999px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 1.8rem;">
            🔍
          </div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: #0F172A; margin-bottom: 8px;">No questions available yet.</h3>
          <p style="font-size: 0.9rem; color: #64748B; max-width: 420px; margin: 0 auto 20px; line-height: 1.5;">
            There are no questions matching your active filters or search query. Try selecting another exam, subject, or resetting filters.
          </p>
          <button id="resetAllFiltersBtn" type="button" style="padding: 10px 20px; background: #DC2626; color: #FFFFFF; font-weight: 700; border-radius: 8px; font-size: 0.875rem; cursor: pointer; border: none;">
            Reset All Filters
          </button>
        </div>
      `;

      const resetBtn = document.getElementById('resetAllFiltersBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          selectedExam = 'all';
          selectedSubject = 'all';
          selectedTopic = 'all';
          selectedDifficulty = 'all';
          searchQuery = '';
          if (examSelect) examSelect.value = 'all';
          if (subjectSelect) subjectSelect.value = 'all';
          if (topicSelect) topicSelect.value = 'all';
          if (difficultySelect) difficultySelect.value = 'all';
          if (searchInput) searchInput.value = '';
          if (clearSearchBtn) clearSearchBtn.style.display = 'none';
          currentIndex = 0;
          updateTopicsDropdown();
          renderPracticePage();
        });
      }
      return;
    }

    // Ensure valid index
    if (currentIndex >= questions.length) {
      currentIndex = questions.length - 1;
    }
    if (currentIndex < 0) {
      currentIndex = 0;
    }

    const currentQ = questions[currentIndex];
    const qState = sessionState[currentQ.id] || { selectedOption: null, submitted: false, isCorrect: false };
    const bookmarked = isQuestionBookmarked(currentQ.id);

    // Get Exam Title for badge
    const examObj = EXAMS_DATA.find(e => e.id === currentQ.examId);
    const examName = examObj ? examObj.name : (currentQ.examId ? currentQ.examId.toUpperCase() : 'ALL EXAMS');

    // Difficulty badge styling
    let diffBg = '#DCFCE7';
    let diffColor = '#15803D';
    if (currentQ.difficulty === 'Medium') {
      diffBg = '#FEF3C7';
      diffColor = '#B45309';
    } else if (currentQ.difficulty === 'Hard') {
      diffBg = '#FEF2F2';
      diffColor = '#991B1B';
    }

    // Single Question Layout HTML
    container.innerHTML = `
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <!-- Top Metadata & Action Bar -->
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #F1F5F9;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
            <span style="background: #0F172A; color: #FFFFFF; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 6px;">
              Question ${currentIndex + 1} of ${questions.length}
            </span>
            <span style="background: ${diffBg}; color: ${diffColor}; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 6px;">
              ${escapeHtml(currentQ.difficulty || 'Medium')}
            </span>
            <span style="background: #F1F5F9; color: #475569; font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: 6px;">
              ${escapeHtml(examName)} • ${escapeHtml(currentQ.topicId || 'General')}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="toggleBookmarkBtn" type="button" style="padding: 6px 12px; border: 1px solid ${bookmarked ? '#DC2626' : '#CBD5E1'}; background: ${bookmarked ? '#FEF2F2' : '#FFFFFF'}; color: ${bookmarked ? '#DC2626' : '#475569'}; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              ${bookmarked ? '⭐ Bookmarked' : '🔖 Bookmark'}
            </button>
            <button id="triggerReportBtn" type="button" style="padding: 6px 10px; border: 1px solid #CBD5E1; background: #FFFFFF; color: #64748B; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
              🚩 Report
            </button>
          </div>
        </div>

        <!-- Language Selector Buttons -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Language View:</div>
          <div style="display: flex; gap: 4px; background: #F8FAFC; padding: 3px; border-radius: 8px; border: 1px solid #E2E8F0;">
            <button type="button" class="lang-toggle-btn ${currentLang === 'Bilingual' ? 'active' : ''}" data-lang="Bilingual" style="padding: 5px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; border: none; cursor: pointer; background: ${currentLang === 'Bilingual' ? '#0F172A' : 'transparent'}; color: ${currentLang === 'Bilingual' ? '#FFF' : '#64748B'};">
              Bilingual (द्विभाषी)
            </button>
            <button type="button" class="lang-toggle-btn ${currentLang === 'English' ? 'active' : ''}" data-lang="English" style="padding: 5px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; border: none; cursor: pointer; background: ${currentLang === 'English' ? '#0F172A' : 'transparent'}; color: ${currentLang === 'English' ? '#FFF' : '#64748B'};">
              English
            </button>
            <button type="button" class="lang-toggle-btn ${currentLang === 'Hindi' ? 'active' : ''}" data-lang="Hindi" style="padding: 5px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; border: none; cursor: pointer; background: ${currentLang === 'Hindi' ? '#0F172A' : 'transparent'}; color: ${currentLang === 'Hindi' ? '#FFF' : '#64748B'};">
              हिंदी
            </button>
          </div>
        </div>

        <!-- Question Text Display Area -->
        <div style="margin-bottom: 20px;">
          ${renderQuestionText(currentQ)}
        </div>

        <!-- Options List (Touch Friendly Options) -->
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
          ${renderOptionButton('optionA', 'A', currentQ, qState)}
          ${renderOptionButton('optionB', 'B', currentQ, qState)}
          ${renderOptionButton('optionC', 'C', currentQ, qState)}
          ${renderOptionButton('optionD', 'D', currentQ, qState)}
        </div>

        <!-- Instant Solution & Explanation Panel -->
        ${qState.submitted ? `
          <div style="background: ${qState.isCorrect ? '#F0FDF4' : '#FEF2F2'}; border: 1px solid ${qState.isCorrect ? '#BBF7D0' : '#FCA5A5'}; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 1.2rem;">${qState.isCorrect ? '🎉' : '❌'}</span>
              <strong style="font-size: 1rem; color: ${qState.isCorrect ? '#15803D' : '#991B1B'};">
                ${qState.isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
              </strong>
            </div>
            <div style="font-size: 0.875rem; color: #334155; line-height: 1.6; border-top: 1px solid ${qState.isCorrect ? '#DCFCE7' : '#FEE2E2'}; padding-top: 10px;">
              <strong style="display: block; color: #0F172A; margin-bottom: 4px;">Step-by-Step Explanation:</strong>
              ${renderExplanationText(currentQ)}
            </div>
          </div>
        ` : ''}

        <!-- Control Action Bar -->
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; padding-top: 16px; border-top: 1px solid #F1F5F9;">
          <button id="prevQBtn" type="button" ${currentIndex === 0 ? 'disabled' : ''} style="padding: 10px 18px; border: 1px solid #CBD5E1; border-radius: 8px; background: ${currentIndex === 0 ? '#F1F5F9' : '#FFFFFF'}; color: ${currentIndex === 0 ? '#94A3B8' : '#0F172A'}; font-weight: 700; font-size: 0.875rem; cursor: ${currentIndex === 0 ? 'not-allowed' : 'pointer'};">
            ← Previous
          </button>

          <div style="display: flex; gap: 8px;">
            <button id="skipQBtn" type="button" style="padding: 10px 18px; border: 1px solid #CBD5E1; border-radius: 8px; background: #F8FAFC; color: #64748B; font-weight: 700; font-size: 0.875rem; cursor: pointer;">
              Skip
            </button>
            <button id="submitAnswerBtn" type="button" ${qState.submitted || !qState.selectedOption ? 'disabled' : ''} style="padding: 10px 20px; border: none; border-radius: 8px; background: ${qState.submitted || !qState.selectedOption ? '#94A3B8' : '#DC2626'}; color: #FFFFFF; font-weight: 800; font-size: 0.875rem; cursor: ${qState.submitted || !qState.selectedOption ? 'not-allowed' : 'pointer'}; box-shadow: 0 2px 4px rgba(220,38,38,0.2);">
              Submit Answer
            </button>
          </div>

          <button id="nextQBtn" type="button" style="padding: 10px 20px; border: 1px solid #0F172A; border-radius: 8px; background: #0F172A; color: #FFFFFF; font-weight: 700; font-size: 0.875rem; cursor: pointer;">
            ${currentIndex === questions.length - 1 ? 'Finish Practice 🎉' : 'Next Question →'}
          </button>
        </div>
      </div>
    `;

    // Attach Event Listeners to rendered elements
    attachQuestionEvents(currentQ, questions);
  }

  /**
   * Render Question Text based on active language setting
   */
  function renderQuestionText(q) {
    if (currentLang === 'English') {
      return `<p style="font-size: 1.05rem; font-weight: 600; color: #0F172A; line-height: 1.6;">${escapeHtml(q.questionEnglish || q.question)}</p>`;
    } else if (currentLang === 'Hindi') {
      return `<p style="font-size: 1.05rem; font-weight: 600; color: #0F172A; line-height: 1.6;">${escapeHtml(q.questionHindi || q.question)}</p>`;
    } else {
      // Bilingual
      return `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <p style="font-size: 1.05rem; font-weight: 600; color: #0F172A; line-height: 1.5;">${escapeHtml(q.questionEnglish || q.question)}</p>
          ${q.questionHindi && q.questionHindi !== q.questionEnglish ? `
            <p style="font-size: 1rem; font-weight: 500; color: #475569; line-height: 1.5; border-top: 1px dashed #E2E8F0; padding-top: 6px;">${escapeHtml(q.questionHindi)}</p>
          ` : ''}
        </div>
      `;
    }
  }

  /**
   * Render Explanation Text based on active language setting
   */
  function renderExplanationText(q) {
    if (currentLang === 'English') {
      return escapeHtml(q.explanationEnglish || q.explanation);
    } else if (currentLang === 'Hindi') {
      return escapeHtml(q.explanationHindi || q.explanation);
    } else {
      return `
        <div>
          <p style="margin-bottom: 6px;">${escapeHtml(q.explanationEnglish || q.explanation)}</p>
          ${q.explanationHindi ? `<p style="color: #475569; border-top: 1px dashed #CBD5E1; padding-top: 6px;">${escapeHtml(q.explanationHindi)}</p>` : ''}
        </div>
      `;
    }
  }

  /**
   * Render Option Button with touch-friendly styling and submit feedback
   */
  function renderOptionButton(optKey, letter, q, qState) {
    const isSelected = qState.selectedOption === optKey;
    const isCorrectOpt = q.correctAnswer === optKey;

    let borderStyle = '1px solid #CBD5E1';
    let bgStyle = '#F8FAFC';
    let textColor = '#0F172A';
    let badgeBg = '#E2E8F0';
    let badgeColor = '#0F172A';

    if (qState.submitted) {
      if (isCorrectOpt) {
        borderStyle = '2px solid #16A34A';
        bgStyle = '#DCFCE7';
        textColor = '#15803D';
        badgeBg = '#16A34A';
        badgeColor = '#FFFFFF';
      } else if (isSelected && !qState.isCorrect) {
        borderStyle = '2px solid #DC2626';
        bgStyle = '#FEF2F2';
        textColor = '#991B1B';
        badgeBg = '#DC2626';
        badgeColor = '#FFFFFF';
      }
    } else if (isSelected) {
      borderStyle = '2px solid #DC2626';
      bgStyle = '#FEF2F2';
      textColor = '#991B1B';
      badgeBg = '#DC2626';
      badgeColor = '#FFFFFF';
    }

    const optText = q[optKey] || '';

    return `
      <button type="button" class="option-card-btn" data-optkey="${optKey}" ${qState.submitted ? 'disabled' : ''} style="width: 100%; text-align: left; padding: 14px 18px; border: ${borderStyle}; background: ${bgStyle}; color: ${textColor}; border-radius: 10px; font-weight: 600; font-size: 0.95rem; cursor: ${qState.submitted ? 'default' : 'pointer'}; display: flex; align-items: center; gap: 12px; transition: all 0.15s ease;">
        <span style="width: 32px; height: 32px; min-width: 32px; border-radius: 8px; background: ${badgeBg}; color: ${badgeColor}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.875rem;">
          ${letter}
        </span>
        <span style="flex: 1; line-height: 1.4;">
          ${escapeHtml(optText)}
        </span>
      </button>
    `;
  }

  /**
   * Event listeners for active question
   */
  function attachQuestionEvents(currentQ, questions) {
    // Language Toggle Buttons
    const langBtns = container.querySelectorAll('.lang-toggle-btn');
    langBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        renderPracticePage();
      });
    });

    // Bookmark Toggle
    const bookmarkBtn = document.getElementById('toggleBookmarkBtn');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => {
        const isNowBookmarked = toggleQuestionBookmark(currentQ);
        showToast(isNowBookmarked ? 'Question bookmarked! 🔖' : 'Bookmark removed.');
        updateBookmarkBadge();
        renderPracticePage();
      });
    }

    // Report Trigger
    const reportBtn = document.getElementById('triggerReportBtn');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        document.getElementById('reportQuestionId').value = currentQ.id;
        reportModal.style.display = 'flex';
      });
    }

    // Option Buttons Click
    const optBtns = container.querySelectorAll('.option-card-btn');
    optBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const optKey = btn.dataset.optkey;
        if (!sessionState[currentQ.id]) {
          sessionState[currentQ.id] = { selectedOption: null, submitted: false, isCorrect: false };
        }
        sessionState[currentQ.id].selectedOption = optKey;
        renderPracticePage();
      });
    });

    // Action Buttons
    const submitBtn = document.getElementById('submitAnswerBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const qState = sessionState[currentQ.id];
        if (!qState || !qState.selectedOption) return;

        const isCorrect = qState.selectedOption === currentQ.correctAnswer;
        qState.submitted = true;
        qState.isCorrect = isCorrect;

        // Save attempt into user_question_history & stats
        recordQuestionAttempt(currentQ.id, qState.selectedOption, isCorrect, currentQ);

        updateStatsDisplay();
        renderPracticePage();
      });
    }

    const prevBtn = document.getElementById('prevQBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          renderPracticePage();
        }
      });
    }

    const nextBtn = document.getElementById('nextQBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentIndex < questions.length - 1) {
          currentIndex++;
          renderPracticePage();
        } else {
          // Finished all questions in current filter view
          alert(`Great job! You have reached the end of these practice questions.`);
        }
      });
    }

    const skipBtn = document.getElementById('skipQBtn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        if (currentIndex < questions.length - 1) {
          currentIndex++;
          renderPracticePage();
        } else {
          showToast('End of question list.');
        }
      });
    }
  }

  /**
   * Dynamically updates topic dropdown options based on Exam & Subject selection
   */
  function updateTopicsDropdown() {
    if (!topicSelect) return;
    const topics = getTopicsForSubject(selectedExam, selectedSubject);

    topicSelect.innerHTML = '<option value="all">All Topics</option>';
    topics.forEach(top => {
      const opt = document.createElement('option');
      opt.value = top;
      opt.textContent = top;
      if (top === selectedTopic) opt.selected = true;
      topicSelect.appendChild(opt);
    });
  }

  /**
   * Sync and display User Practice Progress Stats
   */
  function updateStatsDisplay() {
    const progress = getUserPracticeProgress();
    if (statAttempted) statAttempted.textContent = progress.attempted || 0;
    if (statCorrect) statCorrect.textContent = progress.correct || 0;
    if (statIncorrect) statIncorrect.textContent = progress.incorrect || 0;

    let acc = 0;
    if (progress.attempted > 0) {
      acc = Math.round((progress.correct / progress.attempted) * 100);
    }
    if (statAccuracy) statAccuracy.textContent = `${acc}%`;

    updateBookmarkBadge();
  }

  /**
   * Update header bookmark count badge
   */
  function updateBookmarkBadge() {
    const bookmarks = getUserBookmarks();
    if (bookmarkBadgeCount) {
      if (bookmarks.length > 0) {
        bookmarkBadgeCount.style.display = 'inline-block';
        bookmarkBadgeCount.textContent = bookmarks.length;
      } else {
        bookmarkBadgeCount.style.display = 'none';
      }
    }
  }

  /**
   * Bookmarks Modal Drawer
   */
  function openBookmarksModal() {
    const bookmarks = getUserBookmarks();
    bookmarksModal.style.display = 'flex';

    if (!bookmarksListContent) return;

    if (bookmarks.length === 0) {
      bookmarksListContent.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; color: #64748B;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔖</div>
          <p style="font-weight: 600;">No bookmarked questions yet.</p>
          <p style="font-size: 0.8rem; margin-top: 4px;">Click the Bookmark button on any question during practice to save it here.</p>
        </div>
      `;
      return;
    }

    bookmarksListContent.innerHTML = bookmarks.map((bm, i) => `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
          <span style="font-size: 0.72rem; font-weight: 800; background: #DC2626; color: #FFF; padding: 2px 8px; border-radius: 4px;">
            Bookmark #${i + 1}
          </span>
          <button class="remove-bm-btn" data-qid="${bm.questionId}" style="font-size: 0.75rem; color: #DC2626; font-weight: 700; cursor: pointer;">
            Remove ✖
          </button>
        </div>
        <p style="font-size: 0.9rem; font-weight: 600; color: #0F172A; margin-bottom: 6px;">
          ${escapeHtml(bm.question?.questionEnglish || bm.question?.question || 'Question')}
        </p>
        <div style="font-size: 0.75rem; color: #64748B;">
          Topic: ${escapeHtml(bm.question?.topicId || 'General')} • Exam: ${escapeHtml(bm.question?.examId || 'ALL')}
        </div>
      </div>
    `).join('');

    // Remove event handlers inside bookmarks list
    const removeBtns = bookmarksListContent.querySelectorAll('.remove-bm-btn');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const qid = btn.dataset.qid;
        toggleQuestionBookmark({ id: qid });
        openBookmarksModal();
        updateBookmarkBadge();
        renderPracticePage();
      });
    });
  }

  /**
   * History Modal Drawer
   */
  function openHistoryModal() {
    const progress = getUserPracticeProgress();
    historyModal.style.display = 'flex';

    if (!historyListContent) return;

    if (!progress.history || progress.history.length === 0) {
      historyListContent.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; color: #64748B;">
          <div style="font-size: 2rem; margin-bottom: 8px;">📜</div>
          <p style="font-weight: 600;">No history recorded yet.</p>
          <p style="font-size: 0.8rem; margin-top: 4px;">Submit answers during practice sessions to view history here.</p>
        </div>
      `;
      return;
    }

    historyListContent.innerHTML = progress.history.map(item => `
      <div style="background: ${item.isCorrect ? '#F0FDF4' : '#FEF2F2'}; border: 1px solid ${item.isCorrect ? '#BBF7D0' : '#FCA5A5'}; border-radius: 10px; padding: 12px 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 0.75rem; font-weight: 800; color: ${item.isCorrect ? '#166534' : '#991B1B'};">
            ${item.isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}
          </span>
          <span style="font-size: 0.7rem; color: #64748B;">
            ${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p style="font-size: 0.875rem; font-weight: 600; color: #0F172A; margin-bottom: 4px;">
          ${escapeHtml(item.questionText || 'Practice Question')}
        </p>
        <div style="font-size: 0.75rem; color: #475569;">
          Topic: ${escapeHtml(item.topicId || 'General')}
        </div>
      </div>
    `).join('');
  }

  /**
   * Toast notification helper
   */
  function showToast(msg) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.style.display = 'none', 300);
    }, 2500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/\'/g, '&#039;');
  }
});
