/*
 * RankHub Navigation
 * यह file website के header, footer, mobile menu 
 * और page navigation को manage करती है।
 */

import { auth, signOut, onAuthStateChanged, db, doc, getDoc } from './firebase.js';

const path = window.location.pathname.toLowerCase();
const isAuthPage = path.endsWith('signin.html') || path.endsWith('signup.html') || path.endsWith('/signin') || path.endsWith('/signup');


// Global Auth State Observer (Non-blocking)

// वर्तमान user की authentication स्थिति को check करता है।
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const local = localStorage.getItem('rankhub_user');
      if (!local) {
        let profileName = user.displayName || user.email.split('@')[0];
        let mobile = '9876543210';
        let photoURL = user.photoURL || '';
        
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.name) profileName = data.name;
            if (data.mobile) mobile = data.mobile;
            if (data.photoURL) photoURL = data.photoURL;
          }
        } catch (e) {}

        const userData = {
          uid: user.uid,
          name: profileName,
          email: user.email,
          mobile: mobile,
          avatar: photoURL,
          token: await user.getIdToken(),
          loginTime: new Date().toISOString()
        };
        localStorage.setItem('rankhub_user', JSON.stringify(userData));
      }
    } catch (e) {}
  } else {
    localStorage.removeItem("rankhub_user");
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Dynamic Back Button Injection for Subpages
  const currentPathForBack = window.location.pathname.toLowerCase();
  const isHomePage = currentPathForBack === '/' || currentPathForBack.endsWith('/index.html') || currentPathForBack === '';
  const isAuthPage = currentPathForBack.includes('/signin') || currentPathForBack.includes('/signup');

  if (!isHomePage && !isAuthPage) {
    function handleBackRouting(e) {
      e.preventDefault();
      const isInternalReferrer = document.referrer && document.referrer.includes(window.location.host);
      if (isInternalReferrer && window.history.length > 1) {
        window.history.back();
      } else {
        const path = window.location.pathname.toLowerCase();
        const params = new URLSearchParams(window.location.search);
        const examId = params.get('exam') || params.get('id');
        
        if (path.includes('exam-detail.html')) {
          window.location.href = './exams.html';
        } else if (path.includes('test-interface.html') || 
                   path.includes('practice.html') || 
                   path.includes('pyq.html') || 
                   path.includes('pyq-detail.html') || 
                   path.includes('notes.html') || 
                   path.includes('test-result.html')) {
          window.location.href = examId ? `./exam-detail.html?id=${examId}` : './exams.html';
        } else {
          window.location.href = './index.html';
        }
      }
    }

    // Inject above main content but below header
    const mainContainer = document.querySelector('main.page-content') || document.querySelector('main');
    if (mainContainer) {
      const backBar = document.createElement('div');
      backBar.className = 'content-back-bar';
      backBar.innerHTML = `
        <button type="button" class="inline-back-btn" aria-label="Go Back">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span>Back</span>
        </button>
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        .content-back-bar {
          width: 100%;
          margin: 16px 0 8px 0;
          display: flex;
          justify-content: flex-start;
          box-sizing: border-box;
        }
        .inline-back-btn {
          background: transparent;
          border: 1px solid #E2E8F0;
          padding: 6px 12px 6px 8px;
          cursor: pointer;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s ease;
          border-radius: 8px;
        }
        .inline-back-btn:hover {
          background: #F1F5F9;
          color: #0F172A;
          border-color: #CBD5E1;
        }
      `;
      document.head.appendChild(style);

      backBar.querySelector('.inline-back-btn').addEventListener('click', handleBackRouting);
      mainContainer.insertBefore(backBar, mainContainer.firstChild);
    }
  }

  // Elements
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const appSidebar = document.getElementById('appSidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

  // Set copyright years across all components
  const currentYear = new Date().getFullYear();
  document.querySelectorAll('#copyrightYear, .sidebar-copyright-year').forEach(el => {
    el.textContent = currentYear;
  });

  // User Profile Population
  const sidebarWelcomeLabel = document.getElementById('sidebarWelcomeLabel');
  const sidebarUserName = document.getElementById('sidebarUserName');
  const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');

  try {
    const savedUser = localStorage.getItem('rankhub_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.name) {
        if (sidebarWelcomeLabel) sidebarWelcomeLabel.textContent = 'Welcome back 👋';
        if (sidebarUserName) sidebarUserName.textContent = parsed.name;
        if (sidebarUserAvatar) {
          if (parsed.avatar || parsed.photo) {
            sidebarUserAvatar.src = parsed.avatar || parsed.photo;
            sidebarUserAvatar.style.objectFit = 'cover';
          } else {
            sidebarUserAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(parsed.name)}&background=DC2626&color=fff`;
          }
        }
      }
    } else {
      if (sidebarWelcomeLabel) sidebarWelcomeLabel.textContent = 'Welcome to RankHub 👋';
      if (sidebarUserName) sidebarUserName.textContent = 'Prepare smarter. Score better.';
    }
  } catch (e) {
    console.error('Error loading user profile for sidebar:', e);
  }

  // Active State Routing Logic for Sidebar and Header/Bottom Nav
  const currentPath = window.location.pathname.toLowerCase();

  // Helper function to match path
function isRouteActive(targetRoute) {
    if (!targetRoute) return false;
    let cleanTarget = targetRoute.toLowerCase();
    
    // Normalize targetRoute
    cleanTarget = cleanTarget.replace(/^\.\//, '/'); // ./index.html -> /index.html
    if (!cleanTarget.startsWith('/')) {
        cleanTarget = '/' + cleanTarget;
    }
    // Remove .html for clean comparison
    cleanTarget = cleanTarget.replace('\.html', '');

    if (cleanTarget === '/index' || cleanTarget === '/') {
      return currentPath === '/' || currentPath === '/index.html' || currentPath === '';
    }

    if (cleanTarget.includes('/exams')) {
      return currentPath.includes('/exams') || currentPath.includes('/exam-detail') || currentPath.includes('/test-interface') || currentPath.includes('/test-result');
    }
    if (cleanTarget.includes('/pyq')) {
      return currentPath.includes('/pyq');
    }
    if (cleanTarget.includes('/practice')) {
      return currentPath.includes('/practice');
    }
    if (cleanTarget.includes('/notes')) {
      return currentPath.includes('/notes');
    }
    if (cleanTarget.includes('/current-affairs')) {
      return currentPath.includes('/current-affairs');
    }
    if (cleanTarget.includes('/live-tests')) {
      return currentPath.includes('/live-tests');
    }
    if (cleanTarget.includes('/rankhub-pass')) {
      return currentPath.includes('/rankhub-pass');
    }
    if (cleanTarget.includes('/performance')) {
      return currentPath.includes('/performance');
    }
    if (cleanTarget.includes('/profile')) {
      return currentPath.includes('/profile');
    }

    return currentPath.includes(cleanTarget);
  }

  // Highlight Sidebar Items
  const sidebarItems = document.querySelectorAll('.sidebar-nav-item');
  sidebarItems.forEach(item => {
    item.classList.remove('active');
    item.removeAttribute('aria-current');

    const route = item.getAttribute('data-route') || item.getAttribute('href');
    if (isRouteActive(route)) {
      item.classList.add('active');
      item.setAttribute('aria-current', 'page');
    }
  });

  // Highlight Bottom Navigation Items
  const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
  bottomNavItems.forEach(item => {
    item.classList.remove('active');
    item.removeAttribute('aria-current');

    const href = item.getAttribute('href');
    if (isRouteActive(href)) {
      item.classList.add('active');
      item.setAttribute('aria-current', 'page');
    }
  });

  // Sidebar Controls (Open / Close)
  function openSidebar() {
    if (!appSidebar || !sidebarOverlay) return;
    appSidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
    document.body.classList.add('sidebar-open');
    document.documentElement.classList.add('sidebar-open');
    if (menuToggleBtn) menuToggleBtn.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    if (!appSidebar || !sidebarOverlay) return;
    appSidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
    document.documentElement.classList.remove('sidebar-open');
    if (menuToggleBtn) menuToggleBtn.setAttribute('aria-expanded', 'false');
  }

  // Close sidebar on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && appSidebar && appSidebar.classList.contains('open')) {
      closeSidebar();
    }
  });

  // Header Profile Button & Dropdown Panel Initialization
  const profileAvatarEls = document.querySelectorAll('.header-profile-avatar');
  profileAvatarEls.forEach(el => {
    const parent = el.parentElement;
    if (!parent || parent.classList.contains('header-profile-container')) return;

    const container = document.createElement('div');
    container.className = 'header-profile-container';
    parent.replaceChild(container, el);

    let user = null;
    try {
      const saved = localStorage.getItem('rankhub_user');
      if (saved) user = JSON.parse(saved);
    } catch(err) {}

    const isLoggedIn = !!(user && user.name);
    
    if (!isLoggedIn) {
      container.innerHTML = `<a href="./signin.html" style="display: inline-flex; align-items: center; justify-content: center; background: #DC2626; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 0.875rem; transition: background 0.2s; white-space: nowrap;">Sign In</a>`;
      return;
    }
    const userName = isLoggedIn ? user.name : '';
    const userEmail = isLoggedIn ? (user.email || 'aspirant@rankhub.in') : 'Please sign in';
    const userMobile = isLoggedIn && user.mobile ? user.mobile : '';
    const firstInitial = userName.charAt(0).toUpperCase();

    let subText = 'RankHub Pass: Free';
    try {
      const passData = JSON.parse(localStorage.getItem('rankhub_pass_data') || localStorage.getItem('rankhub_user_subscription') || '{}');
      if (passData && (passData.isActive || passData.status === 'active')) {
        subText = 'RankHub Pass: Active Pro';
      }
    } catch(e) {}

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'header-profile-avatar';
    btn.setAttribute('aria-label', 'User Profile Menu');
    btn.setAttribute('aria-expanded', 'false');

    if (isLoggedIn) {
      if (user.avatar || user.photo) {
        btn.innerHTML = `<img src="${user.avatar || user.photo}" alt="${userName}" />`;
      } else {
        btn.textContent = firstInitial;
      }
    } else {
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'header-profile-dropdown';

    if (isLoggedIn) {
      dropdown.innerHTML = `
        <div class="profile-dropdown-header">
          <div class="profile-dropdown-avatar">
            ${user.avatar || user.photo ? `<img src="${user.avatar || user.photo}" alt="${userName}" />` : firstInitial}
          </div>
          <div class="profile-dropdown-info">
            <h4 class="profile-dropdown-name">${userName}</h4>
            <p class="profile-dropdown-email">${userEmail}</p>
            ${userMobile ? `<p class="profile-dropdown-email" style="margin-top:0;">📱 ${userMobile}</p>` : ''}
            <div class="profile-dropdown-sub-badge">
              ⭐ ${subText}
            </div>
          </div>
        </div>
        <ul class="profile-dropdown-links">
          <li>
            <a href="./profile.html" class="profile-dropdown-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>My Profile</span>
            </a>
          </li>
          <li>
            <a href="./performance.html" class="profile-dropdown-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span>My Progress & Stats</span>
            </a>
          </li>
          <li>
            <a href="./rankhub-pass.html" class="profile-dropdown-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>RankHub Pass</span>
            </a>
          </li>
          <li>
            <a href="./profile.html#settings" class="profile-dropdown-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>Settings</span>
            </a>
          </li>
        </ul>
        <div class="profile-dropdown-divider"></div>
        <button type="button" class="profile-dropdown-link profile-dropdown-logout" id="dropdownLogoutBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Logout</span>
        </button>
      `;
    } else {
      dropdown.innerHTML = `
        <div style="padding: 12px 0; text-align: center;">
          <h4 style="font-size: 1rem; font-weight: 700; color: #0F172A; margin-bottom: 6px;">Welcome to RankHub</h4>
          <p style="font-size: 0.825rem; color: #64748B; margin-bottom: 16px;">Sign in to access your profile, tests, and progress.</p>
          <a href="./signin.html" class="modal-btn btn-confirm" style="display: block; width: 100%; padding: 10px; background: #DC2626; color: #FFF; border-radius: 10px; font-weight: 600; text-decoration: none; text-align: center; box-sizing: border-box;">Sign In</a>
        </div>
      `;
    }

    container.appendChild(btn);
    container.appendChild(dropdown);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isLoggedIn) {
        window.location.href = './signin.html';
        return;
      }
      const isOpen = dropdown.style.display === 'block';
      document.querySelectorAll('.header-profile-dropdown').forEach(d => d.style.display = 'none');
      dropdown.style.display = isOpen ? 'none' : 'block';
      btn.setAttribute('aria-expanded', !isOpen);
    });

    const ddLogoutBtn = dropdown.querySelector('#dropdownLogoutBtn');
    if (ddLogoutBtn) {
      ddLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        dropdown.style.display = 'none';
        const logoutModal = document.getElementById('logoutModal');
        if (logoutModal) {
          logoutModal.style.display = 'flex';
        } else {
          try {
            localStorage.removeItem('rankhub_user');
          } catch(err) {}
          window.location.href = './signin.html';
        }
      });
    }
  });

  // --- Event Delegation ---
  document.addEventListener('click', (e) => {
    // Sidebar Toggle
    if (e.target.closest('#menuToggleBtn') || e.target.closest('.premium-menu-btn')) {
      e.preventDefault();
      e.stopPropagation();
      openSidebar();
      return;
    }
    // Sidebar Close
    if (e.target.closest('#sidebarCloseBtn') || e.target.id === 'sidebarOverlay') {
      e.preventDefault();
      e.stopPropagation();
      closeSidebar();
      return;
    }
    // Sidebar Item click
    if (e.target.closest('.sidebar-nav-item')) {
      closeSidebar();
    }
    
    if (!e.target.closest('.header-profile-container')) {
      document.querySelectorAll('.header-profile-dropdown').forEach(d => {
        d.style.display = 'none';
      });
      document.querySelectorAll('.header-profile-avatar').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
      });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.header-profile-dropdown').forEach(d => {
        d.style.display = 'none';
      });
    }
  });

  // Global Logout Confirmation Handler
  document.addEventListener('click', async (e) => {
    const confirmBtn = e.target.closest('#modalConfirmLogout, #confirmLogoutBtn');
    if (confirmBtn) {
      e.preventDefault();
      confirmBtn.textContent = 'Logging out...';
      confirmBtn.disabled = true;
      try {
        await signOut(auth);
      } catch (err) {
        console.error("SignOut error:", err);
      }
      try {
        localStorage.removeItem('rankhub_user');
        localStorage.removeItem('rankhub_user_stats');
        localStorage.removeItem('rankhub_pass_data');
        localStorage.removeItem('rankhub_free_plan_activated_' + (auth.currentUser ? auth.currentUser.uid : ''));
        sessionStorage.clear();
      } catch (err) {}
      setTimeout(() => { window.location.href = './signin.html'; }, 300);
    }
  });
});
