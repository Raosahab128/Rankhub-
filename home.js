import { auth, db, doc, getDoc, setDoc, collection, getDocs, onAuthStateChanged, getCurrentUser } from './firebase.js';
// Rankhub Home Page & Welcome Board Logic
import { EXAMS_DATA } from './exam-store.js';

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
    


  try {
    const statsRef = doc(db, 'users', firebaseUser.uid, 'stats', 'practice');
    const docSnap = await getDoc(statsRef);
    if (docSnap.exists()) {
      const firestoreStats = docSnap.data();
      const local = localStorage.getItem('rankhub_user_stats');
      let localStats = local ? JSON.parse(local) : null;
      if (!localStats || (firestoreStats.attempted > (localStats.attempted || 0))) {
        localStorage.setItem('rankhub_user_stats', JSON.stringify(firestoreStats));
      } else if (localStats && localStats.attempted > (firestoreStats.attempted || 0)) {
         await setDoc(statsRef, localStats);
      }
    } else {
      const local = localStorage.getItem('rankhub_user_stats');
      if (local) await setDoc(statsRef, JSON.parse(local));
    }
  } catch(e) { console.error(e); }

  initWelcomeBoard();
  initQuickActions();
  initLiveTestsSection();
  initPopularExamsSection();
  initDailyPracticeSection();
  initCurrentAffairsSection();
  initNotesSection();
  initPerformanceSection();
  initPassProSection();
  initSupportSection();
});

function initWelcomeBoard() {
  const greetingEl = document.getElementById('welcomeGreeting');
  const currentDateEl = document.getElementById('currentDateText');
  const streakEl = document.getElementById('userStreak');
  const accuracyEl = document.getElementById('userAccuracy');
  const solvedEl = document.getElementById('userSolved');

  // Get user profile or fallback
  let userName = null;
  try {
    const savedUser = localStorage.getItem('rankhub_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.name) {
        userName = parsed.name;
      }
    }
  } catch (e) {
    console.error('Error reading rankhub_user from localStorage', e);
  }

  // Dynamic Greeting based on Local Time
  if (greetingEl) {
    const hour = new Date().getHours();
    let timeGreeting = 'Good Morning';
    
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good Afternoon';
    } else if (hour >= 17 || hour < 5) {
      timeGreeting = 'Good Evening';
    }

    if (userName) {
      greetingEl.innerHTML = `${timeGreeting}, ${escapeHtml(userName)} <span class="wave-hand">👋</span>`;
    } else {
      greetingEl.innerHTML = `Welcome to RankHub <span class="wave-hand">👋</span>`;
    }
  }

  // Listen for storage changes to update welcome board dynamically on login/logout
  window.addEventListener('storage', (e) => {
    if (e.key === 'rankhub_user') {
      initWelcomeBoard();
    }
  });

  // Dynamic Date Formatting
  if (currentDateEl) {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    currentDateEl.textContent = now.toLocaleDateString('en-US', options);
  }


  
  // Get user progress stats or fallback
  const isLoggedIn = !!localStorage.getItem('rankhub_user');
  let userStats = { streak: '0', accuracy: '0%', solved: '0', attempted: 0, correct: 0, incorrect: 0 };
  try {
    const savedStats = localStorage.getItem('rankhub_user_stats');
    if (savedStats) {
      const parsed = JSON.parse(savedStats);
      if (parsed) {
        userStats = { ...userStats, ...parsed };
      }
    } else if (isLoggedIn) {
      const zeroStats = { streak: '0', accuracy: '0%', solved: '0', attempted: 0, correct: 0, incorrect: 0, history: [] };
      localStorage.setItem('rankhub_user_stats', JSON.stringify(zeroStats));
      userStats = zeroStats;
    } else {
      // Safe fallback migration check for legacy keys
      const legacyKeys = ['rankhub_user_practice_progress', 'user_progress', 'user_stats'];
      for (const k of legacyKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const p = JSON.parse(raw);
            if (p) {
              userStats = {
                streak: p.streak || userStats.streak,
                accuracy: p.accuracy || userStats.accuracy,
                solved: p.solved || userStats.solved
              };
              localStorage.setItem('rankhub_user_stats', JSON.stringify({
                ...userStats,
                attempted: p.attempted || 0,
                correct: p.correct || 0,
                incorrect: p.incorrect || 0,
                history: p.history || []
              }));
              break;
            }
          } catch (err) {}
        }
      }
    }
  } catch (e) {
    console.error('Error reading rankhub_user_stats from localStorage', e);
  }

  if (streakEl) streakEl.textContent = userStats.streak;
  if (accuracyEl) accuracyEl.textContent = userStats.accuracy;
  if (solvedEl) solvedEl.textContent = userStats.solved;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initQuickActions() {
  const actionCards = document.querySelectorAll('.quick-action-card');
  actionCards.forEach(card => {
    card.addEventListener('click', () => {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(10);
        } catch (e) {
          // Ignore vibration errors
        }
      }
    });
  });
}

// Live Tests & Free Quizzes Section Logic
const liveTestsData = [
  {
    id: 'test-ssc-cgl-12',
    exam: 'SSC CGL Tier 1',
    title: 'All India Live Mock Test #12',
    category: 'live',
    statusBadgeText: 'LIVE NOW',
    badgeClass: 'badge-live',
    questions: '100 Qs',
    duration: '60 Mins',
    marks: '200 Marks',
    language: 'Eng & Hindi',
    ctaText: 'Start Now',
    ctaClass: 'btn-live',
    ctaLink: './live-tests.html?id=test-ssc-cgl-12',
    isFree: false
  },
  {
    id: 'test-ibps-reasoning-04',
    exam: 'IBPS PO Prelims',
    title: 'Free Speed Quiz - Reasoning Ability',
    category: 'free',
    statusBadgeText: 'FREE QUIZ',
    badgeClass: 'badge-free',
    questions: '20 Qs',
    duration: '15 Mins',
    marks: '20 Marks',
    language: 'Eng & Hindi',
    ctaText: 'Start Quiz',
    ctaClass: 'btn-free',
    ctaLink: './practice.html?id=test-ibps-reasoning-04',
    isFree: true
  },
  {
    id: 'test-rrb-ntpc-scholarship',
    exam: 'RRB NTPC CBT 1',
    title: 'Grand Scholarship Live Mock Test',
    category: 'upcoming',
    statusBadgeText: 'UPCOMING',
    badgeClass: 'badge-upcoming',
    questions: '100 Qs',
    duration: '90 Mins',
    marks: '100 Marks',
    language: 'Eng & Hindi',
    startTime: 'Starts Today, 7:00 PM',
    ctaText: 'View Details',
    ctaClass: 'btn-details',
    ctaLink: './live-tests.html?id=test-rrb-ntpc-scholarship',
    isFree: false
  },
  {
    id: 'test-ssc-chsl-pyq',
    exam: 'SSC CHSL 2025',
    title: 'Previous Year Official Paper Mock',
    category: 'free',
    statusBadgeText: 'FREE TEST',
    badgeClass: 'badge-free',
    questions: '100 Qs',
    duration: '60 Mins',
    marks: '200 Marks',
    language: 'Eng & Hindi',
    ctaText: 'Start Quiz',
    ctaClass: 'btn-free',
    ctaLink: './practice.html?id=test-ssc-chsl-pyq',
    isFree: true
  },
  {
    id: 'test-upsc-current-affairs',
    exam: 'UPSC / State PCS',
    title: 'Monthly Current Affairs Live Challenge',
    category: 'live',
    statusBadgeText: 'LIVE NOW',
    badgeClass: 'badge-live',
    questions: '50 Qs',
    duration: '45 Mins',
    marks: '100 Marks',
    language: 'Eng & Hindi',
    ctaText: 'Start Now',
    ctaClass: 'btn-live',
    ctaLink: './live-tests.html?id=test-upsc-current-affairs',
    isFree: false
  }
];

function initLiveTestsSection() {
  const container = document.getElementById('testsContainer');
  const filterChips = document.querySelectorAll('.filter-chip');

  if (!container) return;

  // Render initial All filter
  renderTestCards(liveTestsData, container);

  // Add event listeners to filter chips
  filterChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      const selectedFilter = chip.getAttribute('data-filter');

      // Update active state
      filterChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');

      // Haptic feedback
      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (err) {}
      }

      // Filter data
      let filtered = liveTestsData;
      if (selectedFilter === 'live') {
        filtered = liveTestsData.filter(item => item.category === 'live');
      } else if (selectedFilter === 'upcoming') {
        filtered = liveTestsData.filter(item => item.category === 'upcoming');
      } else if (selectedFilter === 'free') {
        filtered = liveTestsData.filter(item => item.category === 'free' || item.isFree);
      }

      renderTestCards(filtered, container);
    });
  });
}

function renderTestCards(tests, container) {
  if (!container) return;

  if (!tests || tests.length === 0) {
    container.innerHTML = `
      <div class="empty-tests-state">
        <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4"/>
          <path d="M12 16h.01"/>
        </svg>
        <div class="empty-title">No tests available right now</div>
        <div class="empty-subtitle">Check back later or try another category.</div>
      </div>
    `;
    return;
  }

  const cardsHtml = tests.map(test => {
    const isLive = test.category === 'live';
    const liveDotHtml = isLive ? `<span class="chip-dot dot-live"></span>` : '';

    const scheduleHtml = test.startTime ? `
      <div class="test-schedule-info">
        <svg class="schedule-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>${escapeHtml(test.startTime)}</span>
      </div>
    ` : '';

    return `
      <article class="test-card" id="card-${escapeHtml(test.id)}">
        <div>
          <!-- Top Tag & Status Row -->
          <div class="test-card-top">
            <span class="exam-tag">${escapeHtml(test.exam)}</span>
            <span class="status-badge ${escapeHtml(test.badgeClass)}">
              ${liveDotHtml}
              <span>${escapeHtml(test.statusBadgeText)}</span>
            </span>
          </div>

          <!-- Title -->
          <h4 class="test-card-title">${escapeHtml(test.title)}</h4>

          <!-- Metadata Grid -->
          <div class="test-meta-grid">
            <div class="meta-item">
              <div class="meta-icon-text">
                <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 17v-5"/><path d="M12 8h.01"/></svg>
                <span>${escapeHtml(test.questions)}</span>
              </div>
              <span class="meta-label">Questions</span>
            </div>

            <div class="meta-item">
              <div class="meta-icon-text">
                <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>${escapeHtml(test.duration)}</span>
              </div>
              <span class="meta-label">Duration</span>
            </div>

            <div class="meta-item">
              <div class="meta-icon-text">
                <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 15 2 2 4-4"/><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
                <span>${escapeHtml(test.marks)}</span>
              </div>
              <span class="meta-label">Total Marks</span>
            </div>
          </div>

          ${scheduleHtml}
        </div>

        <!-- Card Footer & Action CTA -->
        <div class="test-card-footer">
          <div class="test-languages">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            <span>${escapeHtml(test.language)}</span>
          </div>

          <a href="${escapeHtml(test.ctaLink)}" class="test-cta-btn ${escapeHtml(test.ctaClass)}" aria-label="${escapeHtml(test.ctaText)} for ${escapeHtml(test.title)}">
            <span>${escapeHtml(test.ctaText)}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </a>
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = cardsHtml;

  // Add click haptics to test card buttons
  const ctaBtns = container.querySelectorAll('.test-cta-btn');
  ctaBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (e) {}
      }
    });
  });
}

// Popular Exams Section Logic
function getExamScopeLabel(exam) {
  const cat = (exam.category || '').toLowerCase();
  const id = (exam.id || '').toLowerCase();

  if (cat === 'ssc') return 'Central Government';
  if (cat === 'banking') return 'National Level';
  if (cat === 'railway' || cat === 'railways') return 'Central Government';
  if (cat === 'upsc') return 'Civil Services';
  if (cat === 'state psc') return id.includes('bpsc') ? 'Bihar Government' : 'State Government';
  if (cat === 'police') return id.includes('bihar') ? 'State Government' : (id.includes('up') ? 'State Government' : 'State Government');
  if (cat === 'defence') return 'Armed Forces';
  if (cat === 'teaching') return 'National Level';
  if (cat === 'medical') return 'National Entrance';
  if (cat === 'engineering') return 'National Entrance';
  if (cat === 'state government jobs') return 'State Government';
  return 'Competitive Exam';
}

function getFilteredExamsForCategory(selectedCategory) {
  if (!selectedCategory || selectedCategory === 'all') {
    return EXAMS_DATA.filter(e => e.isPopular || e.isFeatured);
  }

  const catKey = selectedCategory.toLowerCase().trim();
  return EXAMS_DATA.filter(exam => {
    const c = (exam.category || '').toLowerCase();
    const id = (exam.id || '').toLowerCase();

    if (catKey === 'ssc') return c === 'ssc';
    if (catKey === 'banking') return c === 'banking';
    if (catKey === 'railways') return c === 'railway' || c === 'railways';
    if (catKey === 'upsc') return c === 'upsc';
    if (catKey === 'bpsc') return c === 'state psc' || id.includes('bpsc') || c === 'bpsc';
    if (catKey === 'police') return c === 'police';
    if (catKey === 'defence') return c === 'defence';
    if (catKey === 'teaching') return c === 'teaching';
    if (catKey === 'engineering') return c === 'engineering';
    if (catKey === 'medical') return c === 'medical';
    return c.includes(catKey) || id.includes(catKey);
  });
}

function initPopularExamsSection() {
  const container = document.getElementById('examsContainer');
  const examChips = document.querySelectorAll('.exam-chip');

  if (!container) return;

  // Initial render with popular/featured exams
  renderExamCards(getFilteredExamsForCategory('all'), container);

  // Category chip filter listeners
  examChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const selectedCategory = chip.getAttribute('data-category');

      // Update active state
      examChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');

      // Haptic feedback
      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (e) {}
      }

      // Filter data from EXAMS_DATA
      const filtered = getFilteredExamsForCategory(selectedCategory);
      renderExamCards(filtered, container);
    });
  });
}

function renderExamCards(exams, container) {
  if (!container) return;

  if (!exams || exams.length === 0) {
    container.innerHTML = `
      <div class="empty-tests-state" style="grid-column: 1 / -1;">
        <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4"/>
          <path d="M12 16h.01"/>
        </svg>
        <div class="empty-title">No exams available in this category</div>
        <div class="empty-subtitle">Explore other categories or check back soon.</div>
      </div>
    `;
    return;
  }

  const cardsHtml = exams.map(exam => {
    const popularBadgeHtml = exam.isPopular === true ? `<span class="badge-popular">POPULAR</span>` : '';
    const scopeLabel = getExamScopeLabel(exam);
    const mockCount = exam.mockTestCount || (exam.testsCount ? `${exam.testsCount}` : null);
    const pyqYears = exam.pyqYears || (exam.questionsCount ? `${exam.questionsCount}` : null);
    const logoBg = exam.logoBg || '#FEF2F2';
    const logoColor = exam.logoColor || '#DC2626';
    const logoText = exam.logoText || (exam.name ? exam.name.substring(0, 3) : 'EX');
    const examUrl = exam.link || `./exam-detail.html?id=${exam.id}`;

    return `
      <a href="${escapeHtml(examUrl)}" class="exam-card" id="exam-card-${escapeHtml(exam.id)}" aria-label="Explore ${escapeHtml(exam.name)} Exam">
        <div class="exam-card-content">
          <!-- Top Row: Icon & Popular Badge -->
          <div class="exam-card-top">
            <div class="exam-icon-wrapper" style="background-color: ${escapeHtml(logoBg)}; color: ${escapeHtml(logoColor)};">
              <span class="exam-logo-text">${escapeHtml(logoText)}</span>
            </div>
            ${popularBadgeHtml}
          </div>

          <!-- Exam Info -->
          <div class="exam-card-main-info">
            <h4 class="exam-card-title">${escapeHtml(exam.name)}</h4>
            <div class="exam-card-category">${escapeHtml(exam.category)} • ${escapeHtml(scopeLabel)}</div>
          </div>

          <!-- Resource Indicators -->
          <div class="exam-resource-pills">
            ${mockCount ? `<span class="resource-pill">📝 ${escapeHtml(mockCount)}</span>` : ''}
            ${pyqYears ? `<span class="resource-pill">📄 ${escapeHtml(pyqYears)}</span>` : ''}
          </div>
        </div>

        <!-- Footer Action Button -->
        <div class="exam-card-footer">
          <span class="btn-view-exam">
            <span>View Exam</span>
            <svg class="cta-arrow-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </span>
        </div>
      </a>
    `;
  }).join('');

  container.innerHTML = cardsHtml;

  // Haptics on click
  const examCards = container.querySelectorAll('.exam-card');
  examCards.forEach(card => {
    card.addEventListener('click', () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (e) {}
      }
    });
  });
}

// Daily Practice Section Logic
function initDailyPracticeSection() {
  const goalTargetEl = document.getElementById('dailyGoalTarget');
  const goalProgressTextEl = document.getElementById('dailyGoalProgressText');
  const goalPercentageEl = document.getElementById('dailyGoalPercentage');
  const goalProgressBarEl = document.getElementById('dailyGoalProgressBar');
  const streakTextEl = document.getElementById('dailyStreakText');

  // Load existing user stats or daily practice data from localStorage if available
  let goalData = { target: 30, completed: 18, streak: 12 };

  try {
    const savedStats = localStorage.getItem('rankhub_user_stats');
    if (savedStats) {
      const parsed = JSON.parse(savedStats);
      if (parsed.streak) goalData.streak = parseInt(parsed.streak, 10) || 12;
      if (parsed.dailyCompleted !== undefined) goalData.completed = parseInt(parsed.dailyCompleted, 10);
      if (parsed.dailyTarget !== undefined) goalData.target = parseInt(parsed.dailyTarget, 10);
    }
    const savedGoal = localStorage.getItem('rankhub_daily_goal');
    if (savedGoal) {
      const parsedGoal = JSON.parse(savedGoal);
      if (parsedGoal.target) goalData.target = parseInt(parsedGoal.target, 10);
      if (parsedGoal.completed !== undefined) goalData.completed = parseInt(parsedGoal.completed, 10);
    }
  } catch (e) {
    console.error('Error reading daily practice data from localStorage', e);
  }

  const pct = Math.min(100, Math.round((goalData.completed / goalData.target) * 100));

  if (goalTargetEl) goalTargetEl.textContent = `${goalData.target} Questions`;
  if (goalProgressTextEl) goalProgressTextEl.textContent = `${goalData.completed} / ${goalData.target} Completed`;
  if (goalPercentageEl) goalPercentageEl.textContent = `${pct}%`;
  if (goalProgressBarEl) goalProgressBarEl.style.width = `${pct}%`;
  if (streakTextEl) streakTextEl.textContent = `${goalData.streak} day streak — Keep going!`;

  // Add click vibration feedback for practice cards
  const practiceCards = document.querySelectorAll('.practice-card');
  practiceCards.forEach(card => {
    card.addEventListener('click', () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (e) {}
      }
    });
  });
}

// Current Affairs & GK Section Logic
const currentAffairsData = [
  {
    id: 'ca-isro-gaganyaan-update',
    categoryLabel: 'Science & Tech',
    categoryKey: 'science-tech',
    title: 'ISRO Successfully Conducts High-Thrust Vikas Engine Qualification Test for Gaganyaan',
    summary: 'The Indian Space Research Organisation completed a key long-duration qualification test for human spaceflight at the Propulsion Complex in Mahendragiri.',
    date: '10 Aug 2026',
    isImportant: true,
    isFeatured: true,
    link: './current-affairs.html?id=ca-isro-gaganyaan-update'
  },
  {
    id: 'ca-rbi-repo-rate',
    categoryLabel: 'Economy',
    categoryKey: 'economy',
    title: 'RBI Monetary Policy Committee Maintains Repo Rate at 6.5% with Focus on Inflation Alignment',
    summary: 'The central bank reaffirmed its stance to ensure inflation progressively aligns with target while sustaining robust domestic growth momentum.',
    date: '09 Aug 2026',
    isImportant: false,
    isFeatured: false,
    link: './current-affairs.html?id=ca-rbi-repo-rate'
  },
  {
    id: 'ca-national-semiconductor-mission',
    categoryLabel: 'National',
    categoryKey: 'national',
    title: 'Union Cabinet Approves Next-Gen Semiconductor Assembly Unit under India Semiconductor Mission',
    summary: 'The strategic initiative aims to strengthen indigenous chip packaging technology and foster resilient electronic supply chains.',
    date: '08 Aug 2026',
    isImportant: true,
    isFeatured: false,
    link: './current-affairs.html?id=ca-national-semiconductor-mission'
  },
  {
    id: 'ca-paris-climate-summit-pledge',
    categoryLabel: 'International',
    categoryKey: 'international',
    title: 'India Highlights Renewable Power Target Milestone at International Energy Agency Conference',
    summary: 'India showcased achieving over 45% non-fossil installed power capacity milestone well ahead of the original 2030 target deadline.',
    date: '07 Aug 2026',
    isImportant: false,
    isFeatured: false,
    link: './current-affairs.html?id=ca-paris-climate-summit-pledge'
  },
  {
    id: 'ca-national-sports-awards',
    categoryLabel: 'Sports',
    categoryKey: 'sports',
    title: 'Ministry of Youth Affairs Announces Nominations for Khel Ratna & Arjuna Awards 2026',
    summary: 'Top performers in shooting, archery, and badminton nominated following outstanding international championship campaigns.',
    date: '06 Aug 2026',
    isImportant: false,
    isFeatured: false,
    link: './current-affairs.html?id=ca-national-sports-awards'
  },
  {
    id: 'ca-govt-pm-kisan-update',
    categoryLabel: 'Government Schemes',
    categoryKey: 'government-schemes',
    title: 'Government Releases 19th Installment under PM-KISAN Direct Benefit Scheme',
    summary: 'Financial support transferred directly into bank accounts of over 9.5 crore beneficiary landholding farming families across India.',
    date: '05 Aug 2026',
    isImportant: false,
    isFeatured: false,
    link: './current-affairs.html?id=ca-govt-pm-kisan-update'
  },
  {
    id: 'ca-awards-saraswati-samman',
    categoryLabel: 'Awards',
    categoryKey: 'awards',
    title: '34th Saraswati Samman Conferred for Outstanding Contribution to Indian Literature',
    summary: 'Prestigious literary award presented by KK Birla Foundation honoring distinguished prose and poetry achievements.',
    date: '04 Aug 2026',
    isImportant: false,
    isFeatured: false,
    link: './current-affairs.html?id=ca-awards-saraswati-samman'
  },
  {
    id: 'ca-new-chief-justice-appointment',
    categoryLabel: 'Appointments',
    categoryKey: 'appointments',
    title: 'New Chief Executive Appointed to Lead National Highway Authority of India',
    summary: 'Senior administrator takes charge to oversee expressways expansion and smart tolling system implementations nationwide.',
    date: '03 Aug 2026',
    isImportant: false,
    isFeatured: false,
    link: './current-affairs.html?id=ca-new-chief-justice-appointment'
  }
];

function initCurrentAffairsSection() {
  const container = document.getElementById('caMainContainer');
  const caChips = document.querySelectorAll('.ca-chip');

  if (!container) return;

  // Initial render with All items
  renderCurrentAffairs(currentAffairsData, container);

  // Category chip listeners
  caChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const selectedCategory = chip.getAttribute('data-category');

      // Update active tab state
      caChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');

      // Haptic feedback
      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (e) {}
      }

      // Filter articles
      let filtered = currentAffairsData;
      if (selectedCategory !== 'all') {
        filtered = currentAffairsData.filter(item => item.categoryKey === selectedCategory);
      }

      renderCurrentAffairs(filtered, container);
    });
  });
}

function renderCurrentAffairs(articles, container) {
  if (!container) return;

  if (!articles || articles.length === 0) {
    container.innerHTML = `
      <div class="empty-tests-state" style="grid-column: 1 / -1;">
        <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4"/>
          <path d="M12 16h.01"/>
        </svg>
        <div class="empty-title">No current affairs available in this category</div>
        <div class="empty-subtitle">Select another category or view all latest news updates.</div>
      </div>
    `;
    return;
  }

  // Identify featured story vs secondary stories
  const featuredItem = articles.find(item => item.isFeatured) || articles[0];
  const secondaryItems = articles.filter(item => item.id !== featuredItem.id);

  // Featured Story HTML
  const featuredBadgeHtml = featuredItem.isImportant ? `<span class="badge-important">IMPORTANT</span>` : '';
  const featuredHtml = `
    <article class="ca-featured-card" id="ca-featured-${escapeHtml(featuredItem.id)}">
      <div>
        <div class="ca-card-top-tags">
          <span class="ca-category-badge">${escapeHtml(featuredItem.categoryLabel)}</span>
          ${featuredBadgeHtml}
        </div>
        <h4 class="ca-featured-title">${escapeHtml(featuredItem.title)}</h4>
        <p class="ca-featured-summary">${escapeHtml(featuredItem.summary)}</p>
      </div>
      <div class="ca-featured-footer">
        <span class="ca-date-text">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>${escapeHtml(featuredItem.date)}</span>
        </span>
        <a href="${escapeHtml(featuredItem.link)}" class="ca-read-link" aria-label="Read story about ${escapeHtml(featuredItem.title)}">
          <span>Read More</span>
          <svg class="cta-arrow-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </a>
      </div>
    </article>
  `;

  // Daily GK Quick Practice Card HTML
  const dailyGkHtml = `
    <a href="./practice.html?type=gk" class="daily-gk-card" aria-label="Start Daily GK Quiz">
      <div class="daily-gk-header">
        <div class="daily-gk-icon-title">
          <div class="daily-gk-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          </div>
          <div>
            <h4 class="daily-gk-title">Daily GK Quiz</h4>
            <span class="daily-gk-desc" style="margin: 0; display: block;">Test today's general knowledge</span>
          </div>
        </div>
        <span class="daily-gk-meta-tag">10 Qs • 5 Mins</span>
      </div>
      <div class="daily-gk-footer">
        <span class="daily-gk-cta">
          <span>Practice GK</span>
          <svg class="cta-arrow-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </span>
      </div>
    </a>
  `;

  // Secondary News Cards HTML
  const secondaryCardsHtml = secondaryItems.map(item => {
    const importantBadgeHtml = item.isImportant ? `<span class="badge-important">IMPORTANT</span>` : '';
    return `
      <article class="ca-news-card" id="ca-card-${escapeHtml(item.id)}">
        <div>
          <div class="ca-card-top-tags">
            <span class="ca-category-badge">${escapeHtml(item.categoryLabel)}</span>
            ${importantBadgeHtml}
          </div>
          <h4 class="ca-news-title">${escapeHtml(item.title)}</h4>
          <p class="ca-news-summary">${escapeHtml(item.summary)}</p>
        </div>
        <div class="ca-news-footer">
          <span class="ca-date-text">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${escapeHtml(item.date)}</span>
          </span>
          <a href="${escapeHtml(item.link)}" class="ca-read-link" aria-label="Read story about ${escapeHtml(item.title)}">
            <span>Read More</span>
            <svg class="cta-arrow-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </a>
        </div>
      </article>
    `;
  }).join('');

  // Assemble main layout
  container.innerHTML = `
    <div class="ca-primary-column">
      ${featuredHtml}
      ${dailyGkHtml}
    </div>
    <div class="ca-secondary-column">
      ${secondaryCardsHtml}
    </div>
  `;

  // Add click vibration haptics
  const caLinks = container.querySelectorAll('.ca-read-link, .daily-gk-card');
  caLinks.forEach(link => {
    link.addEventListener('click', () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (e) {}
      }
    });
  });
}

// Notes & Study Materials Section Logic
const notesData = [
  {
    id: 'notes-polity-fundamental-rights',
    title: 'Indian Polity & Constitution — Fundamental Rights & Directive Principles',
    typeKey: 'notes',
    typeLabel: 'NOTES',
    badgeClass: 'type-badge-notes',
    iconClass: 'icon-wrapper-blue',
    subjectKey: 'polity',
    subjectLabel: 'Polity',
    exam: 'SSC / UPSC',
    language: 'Hindi + English',
    pages: 18,
    date: '08 Aug 2026',
    downloadable: true,
    link: './notes.html?id=polity-fundamental-rights'
  },
  {
    id: 'notes-history-freedom-struggle',
    title: 'Modern Indian History — Freedom Struggle Timeline & Landmark Movements',
    typeKey: 'pdf',
    typeLabel: 'PDF',
    badgeClass: 'type-badge-pdf',
    iconClass: 'icon-wrapper-red',
    subjectKey: 'history',
    subjectLabel: 'History',
    exam: 'UPSC / State PSC',
    language: 'English',
    pages: 24,
    date: '07 Aug 2026',
    downloadable: true,
    link: './notes.html?id=history-freedom-struggle'
  },
  {
    id: 'notes-maths-formula-sheet',
    title: 'Quantitative Aptitude Formula Sheet & Speed Calculation Shortcuts',
    typeKey: 'short-notes',
    typeLabel: 'SHORT NOTES',
    badgeClass: 'type-badge-short-notes',
    iconClass: 'icon-wrapper-amber',
    subjectKey: 'maths',
    subjectLabel: 'Maths',
    exam: 'Bank PO / SSC CGL',
    language: 'Hindi + English',
    pages: 12,
    date: '06 Aug 2026',
    downloadable: false,
    link: './notes.html?id=maths-formula-sheet'
  },
  {
    id: 'notes-science-core-concepts',
    title: 'General Science — Physics & Chemistry Core Concepts for Competitive Exams',
    typeKey: 'study-material',
    typeLabel: 'STUDY MATERIAL',
    badgeClass: 'type-badge-study-material',
    iconClass: 'icon-wrapper-green',
    subjectKey: 'science',
    subjectLabel: 'Science',
    exam: 'RRB NTPC / SSC',
    language: 'English',
    pages: 32,
    date: '05 Aug 2026',
    downloadable: true,
    link: './notes.html?id=science-core-concepts'
  },
  {
    id: 'notes-geography-river-systems',
    title: 'Indian Geography — River Systems, Dams & Agro-Climate Zones',
    typeKey: 'notes',
    typeLabel: 'NOTES',
    badgeClass: 'type-badge-notes',
    iconClass: 'icon-wrapper-blue',
    subjectKey: 'geography',
    subjectLabel: 'Geography',
    exam: 'UPSC / State PSC',
    language: 'Hindi + English',
    pages: 20,
    date: '04 Aug 2026',
    downloadable: true,
    link: './notes.html?id=geography-river-systems'
  },
  {
    id: 'notes-reasoning-puzzles-guide',
    title: 'Logical Reasoning — Syllogism & High-Level Puzzles Master Guide',
    typeKey: 'important-topics',
    typeLabel: 'IMPORTANT TOPICS',
    badgeClass: 'type-badge-important-topics',
    iconClass: 'icon-wrapper-amber',
    subjectKey: 'reasoning',
    subjectLabel: 'Reasoning',
    exam: 'Bank / Railway',
    language: 'Hindi + English',
    pages: 15,
    date: '03 Aug 2026',
    downloadable: false,
    link: './notes.html?id=reasoning-puzzles-guide'
  },
  {
    id: 'notes-english-vocab-grammar',
    title: 'English Grammar Rules, Spotting Errors & High-Frequency Vocabulary',
    typeKey: 'short-notes',
    typeLabel: 'SHORT NOTES',
    badgeClass: 'type-badge-short-notes',
    iconClass: 'icon-wrapper-blue',
    subjectKey: 'english',
    subjectLabel: 'English',
    exam: 'SSC / Bank',
    language: 'English',
    pages: 14,
    date: '02 Aug 2026',
    downloadable: false,
    link: './notes.html?id=english-vocab-grammar'
  },
  {
    id: 'notes-ca-july-2026-digest',
    title: 'Monthly Current Affairs Digest & GK One-Liners — July 2026 Edition',
    typeKey: 'pdf',
    typeLabel: 'PDF',
    badgeClass: 'type-badge-pdf',
    iconClass: 'icon-wrapper-red',
    subjectKey: 'current-affairs',
    subjectLabel: 'Current Affairs',
    exam: 'All Competitive Exams',
    language: 'Hindi + English',
    pages: 45,
    date: '01 Aug 2026',
    downloadable: true,
    link: './notes.html?id=ca-july-2026-digest'
  }
];

let selectedTypeFilter = 'all';
let selectedSubjectFilter = 'all';

function initNotesSection() {
  const container = document.getElementById('notesMainContainer');
  const typeChips = document.querySelectorAll('.notes-chip');
  const subjectBtns = document.querySelectorAll('.subject-shortcut-btn');

  if (!container) return;

  // Initial render
  renderNotesCards(container);

  // Type Filter Chip listeners
  typeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      selectedTypeFilter = chip.getAttribute('data-type') || 'all';

      typeChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');

      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (e) {}
      }

      renderNotesCards(container);
    });
  });

  // Subject Shortcut Button listeners
  subjectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSubjectFilter = btn.getAttribute('data-subject') || 'all';

      subjectBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (e) {}
      }

      renderNotesCards(container);
    });
  });
}

function renderNotesCards(container) {
  if (!container) return;

  // Filter notes based on both selected type and subject
  let filtered = notesData.filter(item => {
    const matchType = (selectedTypeFilter === 'all') || (item.typeKey === selectedTypeFilter);
    const matchSubject = (selectedSubjectFilter === 'all') || (item.subjectKey === selectedSubjectFilter);
    return matchType && matchSubject;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-tests-state" style="grid-column: 1 / -1;">
        <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
          <path d="M6 6h10"/>
          <path d="M6 10h10"/>
        </svg>
        <div class="empty-title">No study materials available in this category</div>
        <div class="empty-subtitle">Select another subject or type filter to view available study notes.</div>
      </div>
    `;
    return;
  }

  const cardsHtml = filtered.map(item => {
    const ctaText = item.downloadable ? 'Download' : (item.typeKey === 'notes' ? 'Read Notes' : 'View Material');
    const ctaIcon = item.downloadable
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`
      : `<svg class="cta-arrow-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;

    const langBadgeHtml = item.language
      ? `<span class="resource-lang-badge">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
          <span>${escapeHtml(item.language)}</span>
         </span>`
      : '';

    const pagesHtml = item.pages ? `<span class="meta-item"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>${item.pages} Pages</span>` : '';

    return `
      <article class="resource-card" id="resource-${escapeHtml(item.id)}">
        <div>
          <div class="resource-card-header">
            <div class="resource-icon-wrapper ${escapeHtml(item.iconClass)}">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
            </div>
            <div class="resource-badges-row">
              <span class="resource-type-badge ${escapeHtml(item.badgeClass)}">${escapeHtml(item.typeLabel)}</span>
              ${langBadgeHtml}
            </div>
          </div>
          <div class="resource-card-body">
            <h4 class="resource-card-title">${escapeHtml(item.title)}</h4>
            <div class="resource-tags-row">
              <span class="subject-tag">${escapeHtml(item.subjectLabel)}</span>
              <span class="exam-tag">${escapeHtml(item.exam)}</span>
            </div>
            <div class="resource-metadata-row">
              ${pagesHtml}
              <span class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>${escapeHtml(item.date)}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="resource-card-footer">
          <a href="${escapeHtml(item.link)}" class="resource-cta-btn ${item.downloadable ? 'download-cta' : ''}" aria-label="${ctaText} for ${escapeHtml(item.title)}">
            <span>${ctaText}</span>
            ${ctaIcon}
          </a>
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = cardsHtml;

  // Add click vibration haptics
  const resourceLinks = container.querySelectorAll('.resource-cta-btn');
  resourceLinks.forEach(link => {
    link.addEventListener('click', () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (e) {}
      }
    });
  });
}

// Performance & Analytics Section Logic
function initPerformanceSection() {
  const container = document.getElementById('performanceMainContainer');
  if (!container) return;

  // Load existing performance data from localStorage if available
  const isLoggedInPerf = !!localStorage.getItem('rankhub_user');
  let perfData = {
    accuracy: '0%',
    solved: '0',
    rank: '—',
    percentile: '—',
    improvement: '0%',
    isImprovementPositive: true,
    weeklyTrend: [
      { day: 'Mon', accuracy: 0 },
      { day: 'Tue', accuracy: 0 },
      { day: 'Wed', accuracy: 0 },
      { day: 'Thu', accuracy: 0 },
      { day: 'Fri', accuracy: 0 },
      { day: 'Sat', accuracy: 0 },
      { day: 'Sun', accuracy: 0 }
    ],
    strongAreas: [],
    weakAreas: [],
    subjectPerformance: []
  };

  try {
    const savedUserStats = localStorage.getItem('rankhub_user_stats');
    if (savedUserStats) {
      const parsed = JSON.parse(savedUserStats);
      if (parsed.accuracy) perfData.accuracy = parsed.accuracy;
      if (parsed.solved) perfData.solved = parsed.solved;
      if (parsed.rank) perfData.rank = parsed.rank;
      if (parsed.percentile) perfData.percentile = parsed.percentile;
    }

    const savedPerf = localStorage.getItem('rankhub_performance_data');
    if (savedPerf) {
      const parsedPerf = JSON.parse(savedPerf);
      if (parsedPerf.accuracy) perfData.accuracy = parsedPerf.accuracy;
      if (parsedPerf.solved) perfData.solved = parsedPerf.solved;
      if (parsedPerf.rank) perfData.rank = parsedPerf.rank;
      if (parsedPerf.percentile) perfData.percentile = parsedPerf.percentile;
      if (parsedPerf.improvement) perfData.improvement = parsedPerf.improvement;
      if (parsedPerf.weeklyTrend && Array.isArray(parsedPerf.weeklyTrend)) perfData.weeklyTrend = parsedPerf.weeklyTrend;
      if (parsedPerf.strongAreas && Array.isArray(parsedPerf.strongAreas)) perfData.strongAreas = parsedPerf.strongAreas;
      if (parsedPerf.weakAreas && Array.isArray(parsedPerf.weakAreas)) perfData.weakAreas = parsedPerf.weakAreas;
      if (parsedPerf.subjectPerformance && Array.isArray(parsedPerf.subjectPerformance)) perfData.subjectPerformance = parsedPerf.subjectPerformance;
    }
  } catch (e) {
    console.error('Error reading rankhub_performance_data from localStorage', e);
  }

  renderPerformanceOverview(perfData, container);
}

function renderPerformanceOverview(data, container) {
  if (!container) return;

  // 1. Primary Metrics Card HTML
  const rankHtml = data.rank ? `
    <div class="perf-metric-item">
      <span class="perf-metric-label">Current Rank</span>
      <div class="perf-metric-value-row">
        <span class="perf-metric-value">${escapeHtml(data.rank)}</span>
        ${data.percentile ? `<span class="perf-metric-subtag">${escapeHtml(data.percentile)}</span>` : ''}
      </div>
    </div>
  ` : '';

  const improvementBadgeHtml = data.improvement ? `
    <span class="perf-improvement-badge ${data.isImprovementPositive !== false ? 'positive' : 'negative'}">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
      <span>${escapeHtml(data.improvement)} vs last week</span>
    </span>
  ` : '';

  const primaryCardHtml = `
    <article class="primary-perf-card">
      <div class="perf-card-header">
        <span class="perf-header-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          <span>Preparation Overview</span>
        </span>
        ${improvementBadgeHtml}
      </div>
      <div class="perf-metrics-grid">
        <div class="perf-metric-item">
          <span class="perf-metric-label">Overall Accuracy</span>
          <div class="perf-metric-value-row">
            <span class="perf-metric-value">${escapeHtml(data.accuracy)}</span>
          </div>
        </div>
        <div class="perf-metric-item">
          <span class="perf-metric-label">Questions Solved</span>
          <div class="perf-metric-value-row">
            <span class="perf-metric-value">${escapeHtml(data.solved)}</span>
          </div>
        </div>
        ${rankHtml}
      </div>
    </article>
  `;

  // 2. Performance Trend SVG Chart HTML
  let trendChartHtml = '';
  if (data.weeklyTrend && data.weeklyTrend.length > 0) {
    const pts = data.weeklyTrend;
    const width = 320;
    const height = 110;
    const padX = 24;
    const padTop = 16;
    const padBottom = 24;
    const chartW = width - (padX * 2);
    const chartH = height - padTop - padBottom;
    const step = pts.length > 1 ? chartW / (pts.length - 1) : chartW;

    const coords = pts.map((pt, i) => {
      const x = padX + (i * step);
      const val = parseFloat(pt.accuracy) || 50;
      // Map 50% - 100% to Y coordinates
      const clampedVal = Math.max(50, Math.min(100, val));
      const y = (padTop + chartH) - ((clampedVal - 50) / 50) * chartH;
      return { x, y, val: pt.accuracy, day: pt.day };
    });

    const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const areaD = `${pathD} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`;

    const circlesHtml = coords.map((c, i) => {
      const isLast = i === coords.length - 1;
      const labelY = c.y - 7;
      const topLabel = isLast ? `<text x="${c.x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="10" font-weight="800" fill="#2563EB">${c.val}%</text>` : '';
      return `
        <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.5" fill="#FFFFFF" stroke="#2563EB" stroke-width="2"/>
        <text x="${c.x.toFixed(1)}" y="${(height - 6).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="600" fill="#64748B">${escapeHtml(c.day)}</text>
        ${topLabel}
      `;
    }).join('');

    trendChartHtml = `
      <article class="trend-card">
        <div class="trend-card-header">
          <h4 class="trend-card-title">7-Day Accuracy Trend</h4>
          <span class="trend-card-sub">Last 7 Days</span>
        </div>
        <div class="trend-chart-container">
          <svg class="trend-chart-svg" viewBox="0 0 ${width} ${height}" aria-label="Seven day accuracy performance trend">
            <defs>
              <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2563EB" stop-opacity="0.18"/>
                <stop offset="100%" stop-color="#2563EB" stop-opacity="0.0"/>
              </linearGradient>
            </defs>
            <!-- Grid lines -->
            <line x1="${padX}" y1="${padTop}" x2="${width - padX}" y2="${padTop}" stroke="#E2E8F0" stroke-dasharray="3,3" stroke-width="1"/>
            <line x1="${padX}" y1="${padTop + (chartH/2)}" x2="${width - padX}" y2="${padTop + (chartH/2)}" stroke="#E2E8F0" stroke-dasharray="3,3" stroke-width="1"/>
            <line x1="${padX}" y1="${padTop + chartH}" x2="${width - padX}" y2="${padTop + chartH}" stroke="#E2E8F0" stroke-width="1"/>
            
            <!-- Area & Line -->
            <path d="${areaD}" fill="url(#trendAreaGrad)"/>
            <path d="${pathD}" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- Data Circles & Labels -->
            ${circlesHtml}
          </svg>
        </div>
      </article>
    `;
  } else {
    trendChartHtml = `
      <article class="trend-card">
        <div class="trend-card-header">
          <h4 class="trend-card-title">7-Day Accuracy Trend</h4>
        </div>
        <div class="empty-tests-state" style="padding: 20px 10px;">
          <div class="empty-subtitle">Your performance trend will appear after you complete more tests.</div>
        </div>
      </article>
    `;
  }

  // 3. Strong & Weak Areas HTML
  const strongTagsHtml = (data.strongAreas && data.strongAreas.length > 0)
    ? data.strongAreas.map(item => `<span class="area-tag">${escapeHtml(item)}</span>`).join('')
    : `<span style="font-size: 0.75rem; color: #64748B;">Complete more practice to discover your strong areas.</span>`;

  const weakTagsHtml = (data.weakAreas && data.weakAreas.length > 0)
    ? data.weakAreas.map(item => `<span class="area-tag">${escapeHtml(item)}</span>`).join('')
    : `<span style="font-size: 0.75rem; color: #64748B;">Complete more practice to discover your weak areas.</span>`;

  const strongWeakHtml = `
    <div class="strong-weak-grid">
      <div class="area-box strong-box">
        <div class="area-box-header">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>Strong Areas</span>
        </div>
        <div class="area-tags-list">
          ${strongTagsHtml}
        </div>
      </div>
      <div class="area-box weak-box">
        <div class="area-box-header">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Weak Areas</span>
        </div>
        <div class="area-tags-list">
          ${weakTagsHtml}
        </div>
      </div>
    </div>
  `;

  // 4. Subject Performance HTML
  let subjectListHtml = '';
  if (data.subjectPerformance && data.subjectPerformance.length > 0) {
    subjectListHtml = data.subjectPerformance.map(subj => {
      const scoreNum = Math.min(100, Math.max(0, parseInt(subj.score, 10) || 0));
      return `
        <div class="subject-perf-item">
          <div class="subject-perf-row">
            <span class="subject-perf-name">${escapeHtml(subj.name)}</span>
            <span class="subject-perf-score">${scoreNum}%</span>
          </div>
          <div class="subject-progress-bg">
            <div class="subject-progress-fill" style="width: ${scoreNum}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    subjectListHtml = `<div style="font-size: 0.8125rem; color: #64748B;">No subject performance data available yet.</div>`;
  }

  const subjectPerfHtml = `
    <article class="subject-perf-card">
      <div class="subject-perf-header">
        <h4 class="subject-perf-title">Subject Performance</h4>
      </div>
      <div class="subject-perf-list">
        ${subjectListHtml}
      </div>
    </article>
  `;

  const motivationHtml = `
    <div class="perf-motivation-text">
      <span>You're improving every day. Keep your daily streak alive! 🔥</span>
    </div>
  `;

  // Assemble into 2 columns
  container.innerHTML = `
    <div class="perf-column-left">
      ${primaryCardHtml}
      ${trendChartHtml}
    </div>
    <div class="perf-column-right">
      ${strongWeakHtml}
      ${subjectPerfHtml}
      ${motivationHtml}
    </div>
  `;
}

// Rankhub Pass Pro Section Logic
function initPassProSection() {
  const container = document.getElementById('passProMainContainer');
  if (!container) return;

  let passData = {
    name: 'Rankhub Pass Pro',
    heading: 'Prepare Without Limits.',
    description: 'Unlock premium tests, advanced performance analytics, study materials and an ad-free learning experience.',
    price: '₹299',
    billingPeriod: 'month',
    discount: null,
    isActive: false,
    benefits: [
      'Unlimited Mock Tests for 100+ Competitive Exams',
      'Premium Test Series & Real Exam Interface',
      'Advanced AI Performance & Rank Analytics',
      'Complete Notes & PDF Study Materials',
      '100% Ad-Free Preparation Experience'
    ],
    route: './rankhub-pass.html'
  };

  try {
    const savedUserPass = localStorage.getItem('rankhub_pass_data') || localStorage.getItem('rankhub_user_subscription');
    if (savedUserPass) {
      const parsed = JSON.parse(savedUserPass);
      if (parsed.price) passData.price = parsed.price;
      if (parsed.billingPeriod) passData.billingPeriod = parsed.billingPeriod;
      if (parsed.benefits && Array.isArray(parsed.benefits)) passData.benefits = parsed.benefits;
      if (typeof parsed.isActive === 'boolean') passData.isActive = parsed.isActive;
      if (parsed.status === 'active') passData.isActive = true;
      if (parsed.discount) passData.discount = parsed.discount;
      if (parsed.route) passData.route = parsed.route;
      if (parsed.heading) passData.heading = parsed.heading;
      if (parsed.description) passData.description = parsed.description;
    }
  } catch (e) {
    console.error('Error loading pass data from localStorage', e);
  }

  renderPassProCard(passData, container);
}

function renderPassProCard(data, container) {
  if (!container) return;

  const isActive = !!data.isActive;

  const chipHtml = isActive
    ? `<span class="pass-pro-active-chip">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>PASS PRO ACTIVE</span>
       </span>`
    : `<span class="pass-pro-chip">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
        <span>RANKHUB PASS PRO</span>
       </span>`;

  const benefitsHtml = data.benefits.map(benefit => `
    <div class="pass-pro-benefit-item">
      <svg class="pass-pro-benefit-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>${escapeHtml(benefit)}</span>
    </div>
  `).join('');

  const discountHtml = data.discount
    ? `<span class="pass-pro-discount-tag">${escapeHtml(data.discount)}</span>`
    : '';

  const ctaText = isActive ? 'Pass Pro Active ✓' : 'Get Pass Pro';
  const ctaClass = isActive ? 'pass-pro-cta-btn pass-pro-active-btn' : 'pass-pro-cta-btn';
  const secondaryText = isActive ? 'Manage Plan →' : 'View Plans →';

  container.innerHTML = `
    <article class="pass-pro-card">
      <div class="pass-pro-card-layout">
        <div class="pass-pro-content-left">
          <div class="pass-pro-badge-row">
            ${chipHtml}
          </div>
          <h3 class="pass-pro-title">${escapeHtml(data.heading)}</h3>
          <p class="pass-pro-desc">${escapeHtml(data.description)}</p>
          <div class="pass-pro-benefits-list">
            ${benefitsHtml}
          </div>
        </div>

        <div class="pass-pro-action-box">
          <div class="pass-pro-price-block">
            ${discountHtml}
            <div class="pass-pro-price-row">
              <span class="pass-pro-price-amount">${escapeHtml(data.price)}</span>
              <span class="pass-pro-price-period">/ ${escapeHtml(data.billingPeriod)}</span>
            </div>
          </div>

          <a href="${escapeHtml(data.route)}" class="${ctaClass}" id="passProCtaBtn" aria-label="${ctaText}">
            <span>${ctaText}</span>
            <svg class="cta-arrow-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>

          <a href="${escapeHtml(data.route)}" class="pass-pro-secondary-link">
            <span>${secondaryText}</span>
          </a>

          <div class="pass-pro-trust-footer">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            <span>Cancel Anytime • 100% Secure Payment</span>
          </div>
        </div>
      </div>
    </article>
  `;

  // Haptic feedback on click
  const ctaBtn = container.querySelector('#passProCtaBtn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (e) {}
      }
    });
  }
}

// Help, Community & Support Section Logic
function initSupportSection() {
  const container = document.getElementById('supportCardsContainer');
  
  // Set dynamic copyright year
  const yearEl = document.getElementById('copyrightYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  if (!container) return;

  const supportItems = [
    {
      id: 'support-help-center',
      title: 'Help Center',
      description: 'Find answers to common questions and guides.',
      iconClass: 'support-icon-blue',
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
      ctaText: 'Open Help',
      route: './help.html'
    },
    {
      id: 'support-ask-doubt',
      title: 'Ask a Doubt',
      description: 'Get step-by-step help when you get stuck.',
      iconClass: 'support-icon-purple',
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
      ctaText: 'Ask Doubt',
      route: './doubts.html'
    },
    {
      id: 'support-give-feedback',
      title: 'Give Feedback',
      description: 'Share ideas to help us improve Rankhub.',
      iconClass: 'support-icon-amber',
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" x2="12" y1="8" y2="14"/><line x1="9" x2="15" y1="11" y2="11"/></svg>`,
      ctaText: 'Give Feedback',
      route: './feedback.html'
    },
    {
      id: 'support-join-community',
      title: 'Join Community',
      description: 'Learn and grow with thousands of aspirants.',
      iconClass: 'support-icon-green',
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      ctaText: 'Join Community',
      route: './community.html'
    }
  ];

  const cardsHtml = supportItems.map(item => `
    <a href="${escapeHtml(item.route)}" class="support-card" id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)}">
      <div>
        <div class="support-icon-box ${escapeHtml(item.iconClass)}">
          ${item.iconSvg}
        </div>
        <h4 class="support-card-title">${escapeHtml(item.title)}</h4>
        <p class="support-card-desc">${escapeHtml(item.description)}</p>
      </div>
      <div class="support-card-cta">
        <span>${escapeHtml(item.ctaText)}</span>
        <svg class="cta-arrow-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </a>
  `).join('');

  container.innerHTML = cardsHtml;

  // Add haptic feedback
  const cards = container.querySelectorAll('.support-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (e) {}
      }
    });
  });
}





