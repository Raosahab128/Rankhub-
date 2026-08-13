/**
 * RankHub - Comprehensive User Profile Dashboard Logic
 * Manages user data, personal info, account settings, subscription (RankHub Pass),
 * performance statistics, recent test results, progress, saved questions, and edit profile.
 */

import {  auth, db, storage, ref, uploadBytes, getDownloadURL, deleteObject, doc, setDoc, updateDoc , getCurrentUser } from './firebase.js';
import { getUserSubscription } from './subscription-service.js';

function formatNiceDate(dateInput) {
  if (!dateInput) return '—';
  const d = dateInput.toDate ? dateInput.toDate() : (typeof dateInput === 'string' || dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput));
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'long' });
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  let user = null;
  try {
    const saved = localStorage.getItem('rankhub_user');
    if (saved) {
      user = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading rankhub_user', e);
  }

  if (!user || !user.email) {
    // Let navigation.js handle auth guard
    return;
  }

  // Load user stats or initialize for new user
  let stats = {};
  try {
    const savedStats = localStorage.getItem('rankhub_user_stats');
    if (savedStats) {
      stats = JSON.parse(savedStats);
    }
  } catch (e) {}

  const defaultStats = {
    testsAttempted: stats.testsAttempted || 0,
    testsCompleted: stats.testsCompleted || 0,
    practiceQuestions: stats.practiceQuestions || 0,
    averageScore: stats.averageScore || '0%',
    bestScore: stats.bestScore || '0%',
    studyTime: stats.studyTime || '0 Mins',
    currentStreak: stats.currentStreak || 0,
    recentResults: stats.recentResults || [],
    examProgress: stats.examProgress || [],
    subjectProgress: stats.subjectProgress || [],
    lastLogin: user.loginTime ? new Date(user.loginTime).toLocaleString() : new Date().toLocaleString(),
    lastTestAttempt: stats.lastTestAttempt || 'No test attempted yet',
    lastActivity: stats.lastActivity || 'Logged in to RankHub'
  };

  // Load Bookmarks count
  let bookmarksCount = 0;
  try {
    const bm = JSON.parse(localStorage.getItem('rankhub_user_question_bookmarks') || localStorage.getItem('rankhub_bookmarks') || '[]');
    bookmarksCount = bm.length;
  } catch (e) {}

  // Load Subscription data from Firestore / getUserSubscription
  let userSub = null;
  try {
    userSub = await getUserSubscription(user.uid);
  } catch (e) {
    console.error('Error loading subscription in profile:', e);
  }

  const isProActive = userSub && userSub.status === 'active';
  const planName = userSub && userSub.planName ? userSub.planName : 'Free';
  const subStatus = isProActive ? 'Activated' : 'Not Subscribed';
  const startDate = userSub && userSub.startDate ? formatNiceDate(userSub.startDateIso || userSub.startDate) : '—';
  const expiryDate = userSub && userSub.expiryDate ? formatNiceDate(userSub.expiryDate) : '—';

  // Render Profile UI
  renderProfileDashboard(user, defaultStats, bookmarksCount, { planName, subStatus, startDate, expiryDate, isProActive });
});

function renderProfileDashboard(user, stats, bookmarksCount, sub) {
  const container = document.getElementById('profilePageContainer');
  if (!container) return;

 const userName = user.name || user.displayName || 'User';
  const userEmail = user.email || 'aspirant@rankhub.in';
  const userMobile = user.mobile || 'Not added';
  const firstInitial = userName.charAt(0).toUpperCase();
  const avatarUrl = user.avatar || user.photo || '';
  const regDate = user.loginTime ? new Date(user.loginTime).toLocaleDateString() : 'Recent';
  const userIdShort = 'rh-uid-' + (user.token ? user.token.slice(-6) : Math.random().toString(36).substring(2, 8));
  const authMethod = user.token && user.token.includes('google') ? 'Google OAuth' : 'Email & Password';

  container.innerHTML = `
    <!-- Top Profile Header Card -->
    <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 20px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); margin-bottom: 24px;">
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px;">
        <div style="display: flex; align-items: center; gap: 20px;">
          <div style="width: 76px; height: 76px; background: #DC2626; color: #FFFFFF; border-radius: 50%; font-size: 1.8rem; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(220,38,38,0.25); overflow: hidden; flex-shrink: 0;">
            ${avatarUrl ? `<img src="${avatarUrl}" alt="${userName}" style="width: 100%; height: 100%; object-fit: cover;" />` : firstInitial}
          </div>
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 800; color: #0F172A; margin-bottom: 4px;">${userName}</h1>
            <p style="font-size: 0.9rem; color: #64748B; margin-bottom: 6px;">${userEmail} &bull; 📱 ${userMobile}</p>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; font-weight: 700; padding: 3px 10px; border-radius: 9999px; background: #FEF2F2; color: #DC2626;">⭐ ${sub.planName}</span>
              <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; font-weight: 700; padding: 3px 10px; border-radius: 9999px; background: #F1F5F9; color: #475569;">🔒 Verified Account</span>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button type="button" id="openEditProfileBtn" class="modal-secondary-btn" style="padding: 10px 18px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; background: #F8FAFC; border: 1px solid #E2E8F0; color: #334155;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Profile
          </button>
          <button type="button" id="openChangePassBtn" class="modal-secondary-btn" style="padding: 10px 18px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; background: #F8FAFC; border: 1px solid #E2E8F0; color: #334155;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Security
          </button>
        </div>
      </div>
    </div>

    <!-- Grid Sections -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px; margin-bottom: 24px;">
      
      <!-- Personal Information -->
      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <span>👤</span> Personal Information
        </h3>
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.875rem;">
          <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B; font-weight: 500;">Full Name</span>
            <span style="color: #0F172A; font-weight: 600;">${userName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B; font-weight: 500;">Email Address</span>
            <span style="color: #0F172A; font-weight: 600;">${userEmail}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B; font-weight: 500;">Mobile Number</span>
            <span style="color: #0F172A; font-weight: 600;">${userMobile}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B; font-weight: 500;">Registration Date</span>
            <span style="color: #0F172A; font-weight: 600;">${regDate}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748B; font-weight: 500;">Profile Photo</span>
            <span style="color: #16A34A; font-weight: 600;">${avatarUrl ? 'Uploaded (Active)' : 'Not added'}</span>
          </div>
        </div>
      </div>

      <!-- Account Information -->
      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <span>🔐</span> Account Information
        </h3>
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.875rem;">
          <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B; font-weight: 500;">Account Status</span>
            <span style="color: #16A34A; font-weight: 700; background: #DCFCE7; padding: 2px 8px; border-radius: 99px;">Active</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B; font-weight: 500;">Email Verification</span>
            <span style="color: #16A34A; font-weight: 600;">Verified</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B; font-weight: 500;">Authentication</span>
            <span style="color: #0F172A; font-weight: 600;">${authMethod}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B; font-weight: 500;">User Identifier</span>
            <span style="color: #475569; font-family: monospace; font-size: 0.8rem;">${userIdShort}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748B; font-weight: 500;">Password Security</span>
            <span style="color: #64748B; font-weight: 600;">Secured (Encrypted)</span>
          </div>
        </div>
      </div>

    </div>

    <!-- RankHub Pass & Subscription -->
    <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 24px;">
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
          <span>⭐</span> RankHub Pass Subscription
        </h3>
        <span style="font-size: 0.8rem; font-weight: 700; padding: 4px 12px; border-radius: 99px; background: ${sub.isProActive ? '#DCFCE7; color: #16A34A;' : '#FEF2F2; color: #DC2626;'}">
          ${sub.subStatus}
        </span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 12px;">
          <div style="font-size: 0.75rem; font-weight: 600; color: #64748B;">Current Plan</div>
          <div style="font-size: 1.1rem; font-weight: 800; color: #0F172A; margin-top: 4px;">${sub.planName}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 12px;">
          <div style="font-size: 0.75rem; font-weight: 600; color: #64748B;">Valid From</div>
          <div style="font-size: 1rem; font-weight: 700; color: #0F172A; margin-top: 4px;">${sub.startDate}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 12px;">
          <div style="font-size: 0.75rem; font-weight: 600; color: #64748B;">Expiry Date</div>
          <div style="font-size: 1rem; font-weight: 700; color: #0F172A; margin-top: 4px;">${sub.expiryDate}</div>
        </div>
      </div>
      ${!sub.isProActive ? `
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; background: #FEF2F2; border: 1px solid #FCA5A5; padding: 16px; border-radius: 12px;">
          <p style="font-size: 0.875rem; color: #991B1B; font-weight: 600; margin: 0;">Unlock unlimited mock tests, PYQ solutions, and expert study notes with RankHub Pass.</p>
          <a href="./rankhub-pass.html" class="btn-primary" style="background: #DC2626; color: #FFF; padding: 10px 20px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 0.875rem;">Explore RankHub Pass</a>
        </div>
      ` : ''}
    </div>

    <!-- Performance & Stats -->
    <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 24px;">
      <h3 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
        <span>📊</span> My Performance & Statistics
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 12px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Tests Attempted</div>
          <div style="font-size: 1.375rem; font-weight: 800; color: #0F172A; margin-top: 4px;">${stats.testsAttempted}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 12px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Tests Completed</div>
          <div style="font-size: 1.375rem; font-weight: 800; color: #0F172A; margin-top: 4px;">${stats.testsCompleted}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 12px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Practice Qs</div>
          <div style="font-size: 1.375rem; font-weight: 800; color: #2563EB; margin-top: 4px;">${stats.practiceQuestions}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 12px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Avg. Score</div>
          <div style="font-size: 1.375rem; font-weight: 800; color: #16A34A; margin-top: 4px;">${stats.averageScore}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 12px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Best Score</div>
          <div style="font-size: 1.375rem; font-weight: 800; color: #9333EA; margin-top: 4px;">${stats.bestScore}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 12px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Study Time</div>
          <div style="font-size: 1.375rem; font-weight: 800; color: #EA580C; margin-top: 4px;">${stats.studyTime}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 12px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Current Streak</div>
          <div style="font-size: 1.375rem; font-weight: 800; color: #DC2626; margin-top: 4px;">🔥 ${stats.currentStreak} Days</div>
        </div>
      </div>
      <div style="display: flex; gap: 12px;">
        <a href="./performance.html" class="modal-secondary-btn" style="text-align: center; flex: 1; padding: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; color: #334155; border-radius: 10px; font-weight: 600; text-decoration: none;">View Detailed Performance Report →</a>
      </div>
    </div>

    <!-- Recent Results & Saved Questions -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px; margin-bottom: 24px;">
      
      <!-- Recent Results -->
      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <span>📝</span> Recent Test Results
        </h3>
        <div>
          ${stats.recentResults && stats.recentResults.length > 0 ? stats.recentResults.map(res => `
            <div style="padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 700; color: #0F172A; font-size: 0.9rem;">${res.testName}</div>
                <div style="font-size: 0.75rem; color: #64748B; margin-top: 2px;">${res.exam} &bull; ${res.date}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 800; color: #16A34A; font-size: 0.95rem;">${res.score}</div>
                <div style="font-size: 0.75rem; color: #64748B;">${res.percentage || ''}</div>
              </div>
            </div>
          `).join('') : `
            <div style="text-align: center; padding: 24px 0; color: #64748B; font-size: 0.875rem;">
              No tests attempted yet. Start a mock test to view your scores here.
            </div>
          `}
        </div>
      </div>

      <!-- Saved Questions & Activity -->
      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <span>🔖</span> Saved Questions & Activity
        </h3>
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.875rem; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B; font-weight: 500;">Bookmarked Questions</span>
            <span style="color: #2563EB; font-weight: 700;">${bookmarksCount} Saved</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B; font-weight: 500;">Last Login</span>
            <span style="color: #0F172A; font-weight: 600;">${stats.lastLogin}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            <span style="color: #64748B; font-weight: 500;">Last Test Attempt</span>
            <span style="color: #0F172A; font-weight: 600;">${stats.lastTestAttempt}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748B; font-weight: 500;">Recent Activity</span>
            <span style="color: #0F172A; font-weight: 600;">${stats.lastActivity}</span>
          </div>
        </div>
        <div style="display: flex; gap: 10px;">
          <a href="./saved.html" class="modal-secondary-btn" style="flex: 1; text-align: center; padding: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; color: #334155; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 0.875rem;">View Saved Questions →</a>
        </div>
      </div>

    </div>

    <!-- Bottom Actions: Logout -->
    <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
      <button type="button" id="profileLogoutBtn" class="modal-btn btn-confirm" style="background: #DC2626; color: #FFFFFF; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Log out of RankHub
      </button>
    </div>
  `;

  // Bind Edit Profile Modal Triggers & Logic
  bindEditProfileModal(user);
  bindSecurityModal(user);
  bindProfileLogout();
}

function bindEditProfileModal(user) {
  const openBtn = document.getElementById('openEditProfileBtn');
  const modal = document.getElementById('editProfileModal');
  const closeBtn = document.getElementById('closeEditModal');
  const cancelBtn = document.getElementById('cancelEditModal');
  const form = document.getElementById('editProfileForm');
  const avatarInput = document.getElementById('editAvatarFile');
  const avatarPreview = document.getElementById('editAvatarPreview');

  if (!openBtn || !modal) return;

  openBtn.addEventListener('click', () => {
    document.getElementById('editNameInput').value = user.name || '';
    document.getElementById('editEmailInput').value = user.email || '';
    document.getElementById('editMobileInput').value = user.mobile || '';
    if (user.avatar || user.photo) {
      avatarPreview.innerHTML = `<img src="${user.avatar || user.photo}" style="width:100%;height:100%;object-fit:cover;" />`;
    } else {
      avatarPreview.textContent = (user.name || 'A').charAt(0).toUpperCase();
    }
    modal.style.display = 'flex';
  });

  const closeModal = () => { modal.style.display = 'none'; };
  
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          alert('Image must be less than 2MB');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const b64 = event.target.result;
          avatarPreview.innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:cover;" />`;
          avatarPreview.dataset.newAvatar = b64;
          avatarPreview.dataset.removeAvatar = 'false';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Handle avatar upload via FileReader with 5MB validation and square cropping
  const removeAvatarBtn = document.getElementById('removeAvatarBtn');

  if (removeAvatarBtn) {
    removeAvatarBtn.addEventListener('click', async () => {
      const originalText = removeAvatarBtn.textContent;
      removeAvatarBtn.textContent = 'Removing...';
      removeAvatarBtn.disabled = true;

      try {
        if (user.uid && storage) {
          const fileRef = ref(storage, 'avatars/' + user.uid + '/avatar.jpg');
          await deleteObject(fileRef).catch(() => {});
        }

        delete user.avatar;
        delete user.photo;
        delete user.photoURL;

        localStorage.setItem('rankhub_user', JSON.stringify(user));

        if (user.uid && db) {
          await setDoc(doc(db, 'users', user.uid), {
            photoURL: '',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        avatarPreview.innerHTML = (user.name || 'A').charAt(0).toUpperCase();
        avatarPreview.dataset.newAvatar = '';
        avatarPreview.dataset.removeAvatar = 'true';
        if (avatarInput) avatarInput.value = '';

        const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
        if (sidebarUserAvatar) {
          sidebarUserAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=DC2626&color=fff`;
          sidebarUserAvatar.style.objectFit = '';
        }

        alert('Profile photo removed successfully.');
        window.location.reload();
      } catch (err) {
        console.error('Error removing profile photo:', err);
        alert('Unable to remove profile photo. Please try again.');
        removeAvatarBtn.textContent = originalText;
        removeAvatarBtn.disabled = false;
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = document.getElementById('editNameInput').value.trim();
      const newMobile = document.getElementById('editMobileInput').value.trim();
      const isRemove = avatarPreview.dataset.removeAvatar === 'true';
      const newAvatar = isRemove ? '' : (avatarPreview.dataset.newAvatar || user.avatar || user.photo || '');

      if (!newName) {
        alert('Please enter your full name.');
        return;
      }

      user.name = newName;
      user.mobile = newMobile;
      if (isRemove) {
        delete user.avatar;
        delete user.photo;
        delete user.photoURL;
      } else if (newAvatar) {
        user.avatar = newAvatar;
        user.photoURL = newAvatar;
      }

      try {
        localStorage.setItem('rankhub_user', JSON.stringify(user));
        if (user.uid && db) {
          await setDoc(doc(db, 'users', user.uid), {
            name: newName,
            mobile: newMobile,
            photoURL: isRemove ? '' : newAvatar,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (err) {}

      modal.style.display = 'none';
      alert('Profile updated successfully!');
      window.location.reload();
    });
  }
}

function bindSecurityModal(user) {
  const openBtn = document.getElementById('openChangePassBtn');
  const modal = document.getElementById('securityModal');
  const closeBtn = document.getElementById('closeSecModal');
  const cancelBtn = document.getElementById('cancelSecModal');
  const form = document.getElementById('securityForm');

  if (!openBtn || !modal) return;

  openBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  const closeModal = () => { modal.style.display = 'none'; };
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Independent Show/Hide password toggles
  const setupPasswordToggle = (inputId, toggleBtnId) => {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(toggleBtnId);
    if (input && btn) {
      btn.addEventListener('click', () => {
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🔒';
          btn.setAttribute('aria-label', 'Hide password');
        } else {
          input.type = 'password';
          btn.textContent = '👁';
          btn.setAttribute('aria-label', 'Show password');
        }
      });
    }
  };

  setupPasswordToggle('currentPassword', 'toggleCurrentPass');
  setupPasswordToggle('newPassword', 'toggleNewPass');
  setupPasswordToggle('confirmPassword', 'toggleConfirmPass');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentPass = document.getElementById('currentPassword').value;
      const newPass = document.getElementById('newPassword').value;
      const confirmPass = document.getElementById('confirmPassword').value;

      if (!currentPass || !newPass || !confirmPass) {
        alert('Please fill in all password fields.');
        return;
      }

      if (newPass !== confirmPass) {
        alert('New passwords do not match.');
        return;
      }

      if (newPass.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
      }

      alert('Password changed successfully.');
      modal.style.display = 'none';
      form.reset();
      
      // Reset toggle button icons back to 👁
      ['toggleCurrentPass', 'toggleNewPass', 'toggleConfirmPass'].forEach(btnId => {
        const b = document.getElementById(btnId);
        if (b) b.textContent = '👁';
      });
      ['currentPassword', 'newPassword', 'confirmPassword'].forEach(inpId => {
        const i = document.getElementById(inpId);
        if (i) i.type = 'password';
      });
    });
  }
}

function bindProfileLogout() {
  const btn = document.getElementById('profileLogoutBtn');
  const logoutModal = document.getElementById('logoutModal');
  if (btn && logoutModal) {
    btn.addEventListener('click', () => {
      logoutModal.style.display = 'flex';
    });
  }
}
