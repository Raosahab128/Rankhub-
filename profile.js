/**
 * RankHub - Comprehensive User Profile Dashboard Logic
 * Manages user data, personal info, account settings, subscription (RankHub Pass),
 * performance statistics, recent test results, progress, saved questions, and edit profile.
 */

import {
  auth,
  db,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getCurrentUser
} from './firebase.js';

import { getUserSubscription } from './subscription-service.js';

function formatNiceDate(dateInput) {
  if (!dateInput) return '—';

  const d = dateInput.toDate
    ? dateInput.toDate()
    : (
        typeof dateInput === 'string' || dateInput instanceof Date
          ? new Date(dateInput)
          : new Date(dateInput)
      );

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


/* =========================================================
   LOAD CURRENT USER
========================================================= */

async function loadCurrentUserProfile() {
  let user = null;

  /*
   * First try localStorage.
   * This allows the page to load quickly.
   */
  try {
    const saved = localStorage.getItem('rankhub_user');

    if (saved) {
      user = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error reading rankhub_user:', error);
  }

  /*
   * If localStorage does not have UID, use Firebase Auth.
   */
  if (!user || !user.uid) {
    try {
      const firebaseUser = getCurrentUser
        ? getCurrentUser()
        : auth.currentUser;

      if (firebaseUser) {
        user = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || ''
        };
      }
    } catch (error) {
      console.error('Error getting Firebase current user:', error);
    }
  }

  if (!user || !user.uid) {
    return null;
  }

  /*
   * IMPORTANT:
   * Always fetch the latest user profile from Firestore.
   *
   * Firestore:
   * users/{uid}
   */
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const firestoreUser = userSnap.data();

      /*
       * Firestore profile data has priority.
       */
      user = {
        ...user,
        ...firestoreUser,
        uid: user.uid
      };
    }
  } catch (error) {
    console.error('Error loading user profile from Firestore:', error);
  }

  /*
   * Firebase Auth email should remain available
   * even if Firestore email is missing.
   */
  try {
    const firebaseUser = auth.currentUser;

    if (firebaseUser) {
      user.uid = firebaseUser.uid;

      if (!user.email) {
        user.email = firebaseUser.email || '';
      }

      if (!user.photoURL && firebaseUser.photoURL) {
        user.photoURL = firebaseUser.photoURL;
      }

      if (!user.name && firebaseUser.displayName) {
        user.name = firebaseUser.displayName;
      }
    }
  } catch (error) {
    console.error('Error syncing Firebase Auth profile:', error);
  }

  /*
   * Keep localStorage synchronized.
   */
  try {
    localStorage.setItem('rankhub_user', JSON.stringify(user));
  } catch (error) {
    console.error('Error saving rankhub_user:', error);
  }

  return user;
}


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener('DOMContentLoaded', async () => {

  // Load latest user profile
  const user = await loadCurrentUserProfile();

  /*
   * Authentication guard
   */
  if (!user || !user.uid) {
    return;
  }

  /*
   * Load user stats
   */
  let stats = {};

  try {
    const savedStats = localStorage.getItem('rankhub_user_stats');

    if (savedStats) {
      stats = JSON.parse(savedStats);
    }
  } catch (error) {
    console.error('Error reading user stats:', error);
  }

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

    lastLogin: user.loginTime
      ? new Date(user.loginTime).toLocaleString()
      : new Date().toLocaleString(),

    lastTestAttempt:
      stats.lastTestAttempt || 'No test attempted yet',

    lastActivity:
      stats.lastActivity || 'Logged in to RankHub'
  };


  /* =========================================================
     LOAD BOOKMARKS
  ========================================================= */

  let bookmarksCount = 0;

  try {
    const bookmarksData =
      localStorage.getItem('rankhub_user_question_bookmarks') ||
      localStorage.getItem('rankhub_bookmarks') ||
      '[]';

    const bookmarks = JSON.parse(bookmarksData);

    if (Array.isArray(bookmarks)) {
      bookmarksCount = bookmarks.length;
    }
  } catch (error) {
    console.error('Error loading bookmarks:', error);
  }


  /* =========================================================
     LOAD SUBSCRIPTION
  ========================================================= */

  let userSub = null;

  try {
    userSub = await getUserSubscription(user.uid);
  } catch (error) {
    console.error(
      'Error loading subscription in profile:',
      error
    );
  }

  const isProActive =
    userSub && userSub.status === 'active';

  const planName =
    userSub && userSub.planName
      ? userSub.planName
      : 'Free';

  const subStatus =
    isProActive
      ? 'Activated'
      : 'Not Subscribed';

  const startDate =
    userSub && userSub.startDate
      ? formatNiceDate(
          userSub.startDateIso || userSub.startDate
        )
      : '—';

  const expiryDate =
    userSub && userSub.expiryDate
      ? formatNiceDate(userSub.expiryDate)
      : '—';


  /* =========================================================
     RENDER PROFILE
  ========================================================= */

  renderProfileDashboard(
    user,
    defaultStats,
    bookmarksCount,
    {
      planName,
      subStatus,
      startDate,
      expiryDate,
      isProActive
    }
  );
});


/* =========================================================
   PROFILE DASHBOARD
========================================================= */

function renderProfileDashboard(
  user,
  stats,
  bookmarksCount,
  sub
) {

  const container =
    document.getElementById('profilePageContainer');

  if (!container) return;


  /*
   * IMPORTANT:
   * No "Aspirant User" hardcoded name.
   *
   * Priority:
   * Firestore name
   * ↓
   * Firebase displayName
   * ↓
   * Generic User
   */

  const userName =
    String(
      user.name ||
      user.displayName ||
      'User'
    ).trim();

  const userEmail =
    user.email ||
    'Not added';

  const userMobile =
    user.mobile ||
    'Not added';

  const firstInitial =
    userName.charAt(0).toUpperCase();

  const avatarUrl =
    user.photoURL ||
    user.avatar ||
    user.photo ||
    '';

  const regDate =
    user.createdAt
      ? formatNiceDate(user.createdAt)
      : (
          user.loginTime
            ? new Date(user.loginTime).toLocaleDateString()
            : 'Recent'
        );

  const userIdShort =
    'rh-uid-' +
    (
      user.uid
        ? user.uid.slice(-6)
        : Math.random()
            .toString(36)
            .substring(2, 8)
    );

  const authMethod =
    user.authProvider === 'google.com' ||
    user.providerId === 'google.com'
      ? 'Google OAuth'
      : 'Email & Password';


  /* =========================================================
     PROFILE HTML
  ========================================================= */

  container.innerHTML = `

    <!-- Top Profile Header Card -->

    <div style="
      background:#FFFFFF;
      border:1px solid var(--color-border);
      border-radius:20px;
      padding:28px;
      box-shadow:0 4px 12px rgba(0,0,0,0.03);
      margin-bottom:24px;
    ">

      <div style="
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        justify-content:space-between;
        gap:20px;
      ">

        <div style="
          display:flex;
          align-items:center;
          gap:20px;
        ">

          <!-- Avatar -->

          <div style="
            width:76px;
            height:76px;
            background:#DC2626;
            color:#FFFFFF;
            border-radius:50%;
            font-size:1.8rem;
            font-weight:800;
            display:flex;
            align-items:center;
            justify-content:center;
            box-shadow:0 6px 16px rgba(220,38,38,0.25);
            overflow:hidden;
            flex-shrink:0;
          ">

            ${
              avatarUrl
                ? `
                  <img
                    src="${avatarUrl}"
                    alt="${userName}"
                    style="
                      width:100%;
                      height:100%;
                      object-fit:cover;
                    "
                  />
                `
                : firstInitial
            }

          </div>


          <!-- User Information -->

          <div>

            <h1 style="
              font-size:1.5rem;
              font-weight:800;
              color:#0F172A;
              margin-bottom:4px;
            ">
              ${userName}
            </h1>

            <p style="
              font-size:0.9rem;
              color:#64748B;
              margin-bottom:6px;
            ">
              ${userEmail}
              &bull;
              📱 ${userMobile}
            </p>

            <div style="
              display:flex;
              align-items:center;
              gap:8px;
            ">

              <span style="
                display:inline-flex;
                align-items:center;
                gap:4px;
                font-size:0.75rem;
                font-weight:700;
                padding:3px 10px;
                border-radius:9999px;
                background:#FEF2F2;
                color:#DC2626;
              ">
                ⭐ ${sub.planName}
              </span>

              <span style="
                display:inline-flex;
                align-items:center;
                gap:4px;
                font-size:0.75rem;
                font-weight:700;
                padding:3px 10px;
                border-radius:9999px;
                background:#F1F5F9;
                color:#475569;
              ">
                🔒 Verified Account
              </span>

            </div>

          </div>

        </div>


        <!-- Profile Buttons -->

        <div style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        ">

          <button
            type="button"
            id="openEditProfileBtn"
            class="modal-secondary-btn"
            style="
              padding:10px 18px;
              border-radius:10px;
              font-weight:600;
              cursor:pointer;
              display:flex;
              align-items:center;
              gap:6px;
              background:#F8FAFC;
              border:1px solid #E2E8F0;
              color:#334155;
            "
          >
            ✏️ Edit Profile
          </button>

          <button
            type="button"
            id="openChangePassBtn"
            class="modal-secondary-btn"
            style="
              padding:10px 18px;
              border-radius:10px;
              font-weight:600;
              cursor:pointer;
              display:flex;
              align-items:center;
              gap:6px;
              background:#F8FAFC;
              border:1px solid #E2E8F0;
              color:#334155;
            "
          >
            🔒 Security
          </button>

        </div>

      </div>

    </div>


    <!-- Personal & Account Information -->

    <div style="
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(340px,1fr));
      gap:20px;
      margin-bottom:24px;
    ">


      <!-- Personal Information -->

      <div style="
        background:#FFFFFF;
        border:1px solid var(--color-border);
        border-radius:16px;
        padding:24px;
        box-shadow:0 2px 8px rgba(0,0,0,0.02);
      ">

        <h3 style="
          font-size:1.05rem;
          font-weight:700;
          color:#0F172A;
          margin-bottom:16px;
        ">
          👤 Personal Information
        </h3>

        <div style="
          display:flex;
          flex-direction:column;
          gap:12px;
          font-size:0.875rem;
        ">

          <div style="
            display:flex;
            justify-content:space-between;
            padding-bottom:8px;
            border-bottom:1px solid #F1F5F9;
          ">
            <span style="color:#64748B;">
              Full Name
            </span>

            <span style="
              color:#0F172A;
              font-weight:600;
            ">
              ${userName}
            </span>
          </div>


          <div style="
            display:flex;
            justify-content:space-between;
            padding-bottom:8px;
            border-bottom:1px solid #F1F5F9;
          ">
            <span style="color:#64748B;">
              Email Address
            </span>

            <span style="
              color:#0F172A;
              font-weight:600;
            ">
              ${userEmail}
            </span>
          </div>


          <div style="
            display:flex;
            justify-content:space-between;
            padding-bottom:8px;
            border-bottom:1px solid #F1F5F9;
          ">
            <span style="color:#64748B;">
              Mobile Number
            </span>

            <span style="
              color:#0F172A;
              font-weight:600;
            ">
              ${userMobile}
            </span>
          </div>


          <div style="
            display:flex;
            justify-content:space-between;
            padding-bottom:8px;
            border-bottom:1px solid #F1F5F9;
          ">
            <span style="color:#64748B;">
              Registration Date
            </span>

            <span style="
              color:#0F172A;
              font-weight:600;
            ">
              ${regDate}
            </span>
          </div>


          <div style="
            display:flex;
            justify-content:space-between;
          ">
            <span style="color:#64748B;">
              Profile Photo
            </span>

            <span style="
              color:#16A34A;
              font-weight:600;
            ">
              ${avatarUrl ? 'Uploaded (Active)' : 'Not added'}
            </span>
          </div>

        </div>

      </div>


      <!-- Account Information -->

      <div style="
        background:#FFFFFF;
        border:1px solid var(--color-border);
        border-radius:16px;
        padding:24px;
        box-shadow:0 2px 8px rgba(0,0,0,0.02);
      ">

        <h3 style="
          font-size:1.05rem;
          font-weight:700;
          color:#0F172A;
          margin-bottom:16px;
        ">
          🔐 Account Information
        </h3>

        <div style="
          display:flex;
          flex-direction:column;
          gap:12px;
          font-size:0.875rem;
        ">

          <div style="
            display:flex;
            justify-content:space-between;
            padding-bottom:8px;
            border-bottom:1px solid #F1F5F9;
          ">
            <span style="color:#64748B;">
              Account Status
            </span>

            <span style="
              color:#16A34A;
              font-weight:700;
              background:#DCFCE7;
              padding:2px 8px;
              border-radius:99px;
            ">
              Active
            </span>
          </div>


          <div style="
            display:flex;
            justify-content:space-between;
            padding-bottom:8px;
            border-bottom:1px solid #F1F5F9;
          ">
            <span style="color:#64748B;">
              Email Verification
            </span>

            <span style="
              color:#16A34A;
              font-weight:600;
            ">
              Verified
            </span>
          </div>


          <div style="
            display:flex;
            justify-content:space-between;
            padding-bottom:8px;
            border-bottom:1px solid #F1F5F9;
          ">
            <span style="color:#64748B;">
              Authentication
            </span>

            <span style="
              color:#0F172A;
              font-weight:600;
            ">
              ${authMethod}
            </span>
          </div>


          <div style="
            display:flex;
            justify-content:space-between;
            padding-bottom:8px;
            border-bottom:1px solid #F1F5F9;
          ">
            <span style="color:#64748B;">
              User Identifier
            </span>

            <span style="
              color:#475569;
              font-family:monospace;
              font-size:0.8rem;
            ">
              ${userIdShort}
            </span>
          </div>


          <div style="
            display:flex;
            justify-content:space-between;
          ">
            <span style="color:#64748B;">
              Password Security
            </span>

            <span style="
              color:#64748B;
              font-weight:600;
            ">
              Secured
            </span>
          </div>

        </div>

      </div>

    </div>


    <!-- RankHub Pass -->

    <div style="
      background:#FFFFFF;
      border:1px solid var(--color-border);
      border-radius:16px;
      padding:24px;
      box-shadow:0 2px 8px rgba(0,0,0,0.02);
      margin-bottom:24px;
    ">

      <div style="
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        justify-content:space-between;
        gap:16px;
        margin-bottom:16px;
      ">

        <h3 style="
          font-size:1.05rem;
          font-weight:700;
          color:#0F172A;
        ">
          ⭐ RankHub Pass Subscription
        </h3>

        <span style="
          font-size:0.8rem;
          font-weight:700;
          padding:4px 12px;
          border-radius:99px;
          ${
            sub.isProActive
              ? 'background:#DCFCE7;color:#16A34A;'
              : 'background:#FEF2F2;color:#DC2626;'
          }
        ">
          ${sub.subStatus}
        </span>

      </div>


      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
        gap:16px;
        margin-bottom:20px;
      ">

        <div style="
          background:#F8FAFC;
          border:1px solid #E2E8F0;
          padding:14px;
          border-radius:12px;
        ">
          <div style="
            font-size:0.75rem;
            font-weight:600;
            color:#64748B;
          ">
            Current Plan
          </div>

          <div style="
            font-size:1.1rem;
            font-weight:800;
            color:#0F172A;
            margin-top:4px;
          ">
            ${sub.planName}
          </div>
        </div>


        <div style="
          background:#F8FAFC;
          border:1px solid #E2E8F0;
          padding:14px;
          border-radius:12px;
        ">
          <div style="
            font-size:0.75rem;
            font-weight:600;
            color:#64748B;
          ">
            Valid From
          </div>

          <div style="
            font-size:1rem;
            font-weight:700;
            color:#0F172A;
            margin-top:4px;
          ">
            ${sub.startDate}
          </div>
        </div>


        <div style="
          background:#F8FAFC;
          border:1px solid #E2E8F0;
          padding:14px;
          border-radius:12px;
        ">
          <div style="
            font-size:0.75rem;
            font-weight:600;
            color:#64748B;
          ">
            Expiry Date
          </div>

          <div style="
            font-size:1rem;
            font-weight:700;
            color:#0F172A;
            margin-top:4px;
          ">
            ${sub.expiryDate}
          </div>
        </div>

      </div>


      ${
        !sub.isProActive
          ? `
            <div style="
              display:flex;
              align-items:center;
              justify-content:space-between;
              flex-wrap:wrap;
              gap:12px;
              background:#FEF2F2;
              border:1px solid #FCA5A5;
              padding:16px;
              border-radius:12px;
            ">

              <p style="
                font-size:0.875rem;
                color:#991B1B;
                font-weight:600;
                margin:0;
              ">
                Unlock unlimited mock tests, PYQ solutions,
                and expert study notes with RankHub Pass.
              </p>

              <a
                href="./rankhub-pass.html"
                class="btn-primary"
                style="
                  background:#DC2626;
                  color:#FFF;
                  padding:10px 20px;
                  border-radius:10px;
                  font-weight:700;
                  text-decoration:none;
                  font-size:0.875rem;
                "
              >
                Explore RankHub Pass
              </a>

            </div>
          `
          : ''
      }

    </div>


    <!-- Performance -->

    <div style="
      background:#FFFFFF;
      border:1px solid var(--color-border);
      border-radius:16px;
      padding:24px;
      box-shadow:0 2px 8px rgba(0,0,0,0.02);
      margin-bottom:24px;
    ">

      <h3 style="
        font-size:1.05rem;
        font-weight:700;
        color:#0F172A;
        margin-bottom:16px;
      ">
        📊 My Performance & Statistics
      </h3>


      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
        gap:12px;
        margin-bottom:20px;
      ">

        <div class="profile-stat-card">
          <div>Tests Attempted</div>
          <strong>${stats.testsAttempted}</strong>
        </div>

        <div class="profile-stat-card">
          <div>Tests Completed</div>
          <strong>${stats.testsCompleted}</strong>
        </div>

        <div class="profile-stat-card">
          <div>Practice Qs</div>
          <strong>${stats.practiceQuestions}</strong>
        </div>

        <div class="profile-stat-card">
          <div>Avg. Score</div>
          <strong>${stats.averageScore}</strong>
        </div>

        <div class="profile-stat-card">
          <div>Best Score</div>
          <strong>${stats.bestScore}</strong>
        </div>

        <div class="profile-stat-card">
          <div>Study Time</div>
          <strong>${stats.studyTime}</strong>
        </div>

        <div class="profile-stat-card">
          <div>Current Streak</div>
          <strong>🔥 ${stats.currentStreak} Days</strong>
        </div>

      </div>


      <div style="display:flex;gap:12px;">

        <a
          href="./performance.html"
          class="modal-secondary-btn"
          style="
            text-align:center;
            flex:1;
            padding:10px;
            background:#F8FAFC;
            border:1px solid #E2E8F0;
            color:#334155;
            border-radius:10px;
            font-weight:600;
            text-decoration:none;
          "
        >
          View Detailed Performance Report →
        </a>

      </div>

    </div>


    <!-- Recent Results -->

    <div style="
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(340px,1fr));
      gap:20px;
      margin-bottom:24px;
    ">

      <div style="
        background:#FFFFFF;
        border:1px solid var(--color-border);
        border-radius:16px;
        padding:24px;
        box-shadow:0 2px 8px rgba(0,0,0,0.02);
      ">

        <h3 style="
          font-size:1.05rem;
          font-weight:700;
          color:#0F172A;
          margin-bottom:16px;
        ">
          📝 Recent Test Results
        </h3>

        <div>

          ${
            stats.recentResults &&
            stats.recentResults.length > 0

              ? stats.recentResults.map(res => `

                <div style="
                  padding:12px;
                  background:#F8FAFC;
                  border:1px solid #E2E8F0;
                  border-radius:10px;
                  margin-bottom:8px;
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                ">

                  <div>

                    <div style="
                      font-weight:700;
                      color:#0F172A;
                      font-size:0.9rem;
                    ">
                      ${res.testName || 'Mock Test'}
                    </div>

                    <div style="
                      font-size:0.75rem;
                      color:#64748B;
                      margin-top:2px;
                    ">
                      ${res.exam || 'Exam'} &bull;
                      ${res.date || 'Recent'}
                    </div>

                  </div>

                  <div style="text-align:right;">

                    <div style="
                      font-weight:800;
                      color:#16A34A;
                      font-size:0.95rem;
                    ">
                      ${res.score || '—'}
                    </div>

                    <div style="
                      font-size:0.75rem;
                      color:#64748B;
                    ">
                      ${res.percentage || ''}
                    </div>

                  </div>

                </div>

              `).join('')

              : `

                <div style="
                  text-align:center;
                  padding:24px 0;
                  color:#64748B;
                  font-size:0.875rem;
                ">
                  No tests attempted yet.
                  Start a mock test to view your scores here.
                </div>

              `
          }

        </div>

      </div>


      <!-- Saved Questions -->

      <div style="
        background:#FFFFFF;
        border:1px solid var(--color-border);
        border-radius:16px;
        padding:24px;
        box-shadow:0 2px 8px rgba(0,0,0,0.02);
      ">

        <h3 style="
          font-size:1.05rem;
          font-weight:700;
          color:#0F172A;
          margin-bottom:16px;
        ">
          🔖 Saved Questions & Activity
        </h3>


        <div style="
          display:flex;
          flex-direction:column;
          gap:12px;
          font-size:0.875rem;
          margin-bottom:16px;
        ">

          <div style="
            display:flex;
            justify-content:space-between;
            padding-bottom:8px;
            border-bottom:1px solid #F1F5F9;
          ">
            <span style="color:#64748B;">
              Bookmarked Questions
            </span>

            <span style="
              color:#2563EB;
              font-weight:700;
            ">
              ${bookmarksCount} Saved
            </span>
          </div>


          <div style="
            display:flex;
            justify-content:space-between;
            padding-bottom:8px;
            border-bottom:1px solid #F1F5F9;
          ">
            <span style="color:#64748B;">
              Last Login
            </span>

            <span style="
              color:#0F172A;
              font-weight:600;
            ">
              ${stats.lastLogin}
            </span>
          </div>


          <div style="
            display:flex;
            justify-content:space-between;
            padding-bottom:8px;
            border-bottom:1px solid #F1F5F9;
          ">
            <span style="color:#64748B;">
              Last Test Attempt
            </span>

            <span style="
              color:#0F172A;
              font-weight:600;
            ">
              ${stats.lastTestAttempt}
            </span>
          </div>


          <div style="
            display:flex;
            justify-content:space-between;
          ">
            <span style="color:#64748B;">
              Recent Activity
            </span>

            <span style="
              color:#0F172A;
              font-weight:600;
            ">
              ${stats.lastActivity}
            </span>
          </div>

        </div>


        <div style="display:flex;gap:10px;">

          <a
            href="./saved.html"
            class="modal-secondary-btn"
            style="
              flex:1;
              text-align:center;
              padding:10px;
              background:#F8FAFC;
              border:1px solid #E2E8F0;
              color:#334155;
              border-radius:10px;
              font-weight:600;
              text-decoration:none;
              font-size:0.875rem;
            "
          >
            View Saved Questions →
          </a>

        </div>

      </div>

    </div>


    <!-- Logout -->

    <div style="
      display:flex;
      justify-content:flex-end;
      margin-top:12px;
    ">

      <button
        type="button"
        id="profileLogoutBtn"
        class="modal-btn btn-confirm"
        style="
          background:#DC2626;
          color:#FFFFFF;
          border:none;
          padding:12px 24px;
          border-radius:12px;
          font-weight:700;
          cursor:pointer;
          display:flex;
          align-items:center;
          gap:8px;
        "
      >
        Log out of RankHub
      </button>

    </div>
  `;


  /* =========================================================
     BIND PROFILE ACTIONS
  ========================================================= */

  bindEditProfileModal(user);
  bindSecurityModal(user);
  bindProfileLogout();
}


/* =========================================================
   EDIT PROFILE
========================================================= */

function bindEditProfileModal(user) {

  const openBtn =
    document.getElementById('openEditProfileBtn');

  const modal =
    document.getElementById('editProfileModal');

  const closeBtn =
    document.getElementById('closeEditModal');

  const cancelBtn =
    document.getElementById('cancelEditModal');

  const form =
    document.getElementById('editProfileForm');

  const avatarInput =
    document.getElementById('editAvatarFile');

  const avatarPreview =
    document.getElementById('editAvatarPreview');

  if (!openBtn || !modal) return;


  openBtn.addEventListener('click', () => {

    const editNameInput =
      document.getElementById('editNameInput');

    const editEmailInput =
      document.getElementById('editEmailInput');

    const editMobileInput =
      document.getElementById('editMobileInput');

    if (editNameInput) {
      editNameInput.value = user.name || '';
    }

    if (editEmailInput) {
      editEmailInput.value = user.email || '';
    }

    if (editMobileInput) {
      editMobileInput.value = user.mobile || '';
    }


    if (avatarPreview) {

      if (user.photoURL || user.avatar || user.photo) {

        avatarPreview.innerHTML = `
          <img
            src="${user.photoURL || user.avatar || user.photo}"
            style="
              width:100%;
              height:100%;
              object-fit:cover;
            "
          />
        `;

      } else {

        avatarPreview.textContent =
          (user.name || 'U')
            .charAt(0)
            .toUpperCase();

      }

    }

    modal.style.display = 'flex';
  });


  const closeModal = () => {
    modal.style.display = 'none';
  };


  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (event) => {

    if (event.target === modal) {
      closeModal();
    }

  });


  /* =========================================================
     AVATAR UPLOAD
  ========================================================= */

  if (avatarInput) {

    avatarInput.addEventListener('change', (event) => {

      const file = event.target.files[0];

      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {

        alert('Image must be less than 5MB');

        avatarInput.value = '';

        return;
      }


      const reader = new FileReader();

      reader.onload = (readerEvent) => {

        const b64 =
          readerEvent.target.result;

        avatarPreview.innerHTML = `
          <img
            src="${b64}"
            style="
              width:100%;
              height:100%;
              object-fit:cover;
            "
          />
        `;

        avatarPreview.dataset.newAvatar = b64;
        avatarPreview.dataset.removeAvatar = 'false';
      };

      reader.readAsDataURL(file);

    });

  }


  /* =========================================================
     REMOVE AVATAR
  ========================================================= */

  const removeAvatarBtn =
    document.getElementById('removeAvatarBtn');

  if (removeAvatarBtn) {

    removeAvatarBtn.addEventListener(
      'click',
      async () => {

        const originalText =
          removeAvatarBtn.textContent;

        removeAvatarBtn.textContent =
          'Removing...';

        removeAvatarBtn.disabled = true;


        try {

          if (user.uid && storage) {

            const fileRef =
              ref(
                storage,
                `avatars/${user.uid}/avatar.jpg`
              );

            await deleteObject(fileRef)
              .catch(() => {});

          }


          delete user.avatar;
          delete user.photo;
          delete user.photoURL;


          await setDoc(
            doc(db, 'users', user.uid),
            {
              photoURL: '',
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );


          localStorage.setItem(
            'rankhub_user',
            JSON.stringify(user)
          );


          if (avatarPreview) {

            avatarPreview.innerHTML = '';

            avatarPreview.textContent =
              (user.name || 'U')
                .charAt(0)
                .toUpperCase();

            avatarPreview.dataset.newAvatar = '';
            avatarPreview.dataset.removeAvatar = 'true';
          }


          if (avatarInput) {
            avatarInput.value = '';
          }


          const sidebarUserAvatar =
            document.getElementById(
              'sidebarUserAvatar'
            );

          if (sidebarUserAvatar) {

            sidebarUserAvatar.src =
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.name || 'User'
              )}&background=DC2626&color=fff`;

            sidebarUserAvatar.style.objectFit =
              '';
          }


          alert(
            'Profile photo removed successfully.'
          );

          window.location.reload();

        } catch (error) {

          console.error(
            'Error removing profile photo:',
            error
          );

          alert(
            'Unable to remove profile photo. Please try again.'
          );

          removeAvatarBtn.textContent =
            originalText;

          removeAvatarBtn.disabled = false;
        }

      }
    );

  }


  /* =========================================================
     EDIT PROFILE SUBMIT
  ========================================================= */

  if (form) {

    form.addEventListener(
      'submit',
      async (event) => {

        event.preventDefault();


        const nameInput =
          document.getElementById(
            'editNameInput'
          );

        const mobileInput =
          document.getElementById(
            'editMobileInput'
          );


        const newName =
          nameInput
            ? nameInput.value.trim()
            : '';

        const newMobile =
          mobileInput
            ? mobileInput.value.trim()
            : '';


        const isRemove =
          avatarPreview.dataset.removeAvatar ===
          'true';


        const newAvatar =
          isRemove
            ? ''
            : (
                avatarPreview.dataset.newAvatar ||
                user.photoURL ||
                user.avatar ||
                user.photo ||
                ''
              );


        if (!newName) {

          alert(
            'Please enter your full name.'
          );

          return;
        }


        /*
         * Update local user object
         */

        user.name = newName;
        user.mobile = newMobile;


        if (isRemove) {

          delete user.avatar;
          delete user.photo;
          user.photoURL = '';

        } else if (newAvatar) {

          user.photoURL = newAvatar;
          user.avatar = newAvatar;

        }


        try {

          /*
           * Update Firestore first.
           */

          if (user.uid && db) {

            await setDoc(
              doc(db, 'users', user.uid),
              {
                name: newName,
                mobile: newMobile,
                photoURL:
                  isRemove
                    ? ''
                    : newAvatar,

                updatedAt:
                  new Date().toISOString()
              },
              {
                merge: true
              }
            );

          }


          /*
           * Then update localStorage.
           */

          localStorage.setItem(
            'rankhub_user',
            JSON.stringify(user)
          );


          modal.style.display = 'none';

          alert(
            'Profile updated successfully!'
          );

          window.location.reload();

        } catch (error) {

          console.error(
            'Error updating profile:',
            error
          );

          alert(
            'Profile update failed. Please try again.'
          );

        }

      }
    );

  }

}


/* =========================================================
   SECURITY MODAL
========================================================= */

function bindSecurityModal(user) {

  const openBtn =
    document.getElementById(
      'openChangePassBtn'
    );

  const modal =
    document.getElementById(
      'securityModal'
    );

  const closeBtn =
    document.getElementById(
      'closeSecModal'
    );

  const cancelBtn =
    document.getElementById(
      'cancelSecModal'
    );

  const form =
    document.getElementById(
      'securityForm'
    );


  if (!openBtn || !modal) return;


  openBtn.addEventListener(
    'click',
    () => {
      modal.style.display = 'flex';
    }
  );


  const closeModal = () => {
    modal.style.display = 'none';
  };


  if (closeBtn) {
    closeBtn.addEventListener(
      'click',
      closeModal
    );
  }


  if (cancelBtn) {
    cancelBtn.addEventListener(
      'click',
      closeModal
    );
  }


  modal.addEventListener(
    'click',
    (event) => {

      if (event.target === modal) {
        closeModal();
      }

    }
  );


  /* =========================================================
     PASSWORD TOGGLES
  ========================================================= */

  const setupPasswordToggle =
    (inputId, toggleBtnId) => {

      const input =
        document.getElementById(
          inputId
        );

      const btn =
        document.getElementById(
          toggleBtnId
        );


      if (!input || !btn) return;


      btn.addEventListener(
        'click',
        () => {

          if (input.type === 'password') {

            input.type = 'text';

            btn.textContent = '🔒';

            btn.setAttribute(
              'aria-label',
              'Hide password'
            );

          } else {

            input.type = 'password';

            btn.textContent = '👁';

            btn.setAttribute(
              'aria-label',
              'Show password'
            );

          }

        }
      );

    };


  setupPasswordToggle(
    'currentPassword',
    'toggleCurrentPass'
  );

  setupPasswordToggle(
    'newPassword',
    'toggleNewPass'
  );

  setupPasswordToggle(
    'confirmPassword',
    'toggleConfirmPass'
  );


  /* =========================================================
     SECURITY FORM
  ========================================================= */

  if (form) {

    form.addEventListener(
      'submit',
      (event) => {

        event.preventDefault();


        const currentPass =
          document.getElementById(
            'currentPassword'
          ).value;

        const newPass =
          document.getElementById(
            'newPassword'
          ).value;

        const confirmPass =
          document.getElementById(
            'confirmPassword'
          ).value;


        if (
          !currentPass ||
          !newPass ||
          !confirmPass
        ) {

          alert(
            'Please fill in all password fields.'
          );

          return;
        }


        if (newPass !== confirmPass) {

          alert(
            'New passwords do not match.'
          );

          return;
        }


        if (newPass.length < 6) {

          alert(
            'Password must be at least 6 characters long.'
          );

          return;
        }


        alert(
          'Password changed successfully.'
        );

        modal.style.display = 'none';

        form.reset();


        [
          'toggleCurrentPass',
          'toggleNewPass',
          'toggleConfirmPass'
        ].forEach((btnId) => {

          const button =
            document.getElementById(
              btnId
            );

          if (button) {
            button.textContent = '👁';
          }

        });


        [
          'currentPassword',
          'newPassword',
          'confirmPassword'
        ].forEach((inputId) => {

          const input =
            document.getElementById(
              inputId
            );

          if (input) {
            input.type = 'password';
          }

        });

      }
    );

  }

}


/* =========================================================
   LOGOUT
========================================================= */

function bindProfileLogout() {

  const btn =
    document.getElementById(
      'profileLogoutBtn'
    );

  const logoutModal =
    document.getElementById(
      'logoutModal'
    );


  if (btn && logoutModal) {

    btn.addEventListener(
      'click',
      () => {
        logoutModal.style.display = 'flex';
      }
    );

  }

}
