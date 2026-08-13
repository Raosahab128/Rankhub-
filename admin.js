import {  auth, db , getCurrentUser } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { checkIsAdmin, getSystemSettings, updateSystemSettings, getSubscriptionPlans, getUserSubscription, adminGrantSubscription, adminRevokeSubscription } from './subscription-service.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('adminAppContainer');
  if (!container) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px;">
          <h2 style="font-size: 1.5rem; font-weight: 800; color: #DC2626; margin-bottom: 12px;">Authentication Required</h2>
          <p style="color: #64748B; margin-bottom: 20px;">Please sign in with your admin account to access the RankHub Admin Portal.</p>
          <a href="./signin.html" class="btn-primary" style="display: inline-block; background: #DC2626; padding: 10px 24px; border-radius: 8px; text-decoration: none; color: #fff; font-weight: 700;">Sign In</a>
        </div>
      `;
      return;
    }

    const isAdmin = await checkIsAdmin(user);
    if (!isAdmin) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px;">
          <h2 style="font-size: 1.5rem; font-weight: 800; color: #DC2626; margin-bottom: 12px;">Access Denied</h2>
          <p style="color: #64748B; margin-bottom: 20px;">You do not have administrator privileges required to view this panel. (Signed in as: ${user.email})</p>
          <a href="./index.html" class="btn-primary" style="display: inline-block; background: #0F172A; padding: 10px 24px; border-radius: 8px; text-decoration: none; color: #fff; font-weight: 700;">Back to Home</a>
        </div>
      `;
      return;
    }

    // Render Admin Dashboard
    await renderAdminDashboard(container, user);
  });
});

async function renderAdminDashboard(container, adminUser) {
  container.innerHTML = ``;

  const settings = await getSystemSettings();
  const plans = await getSubscriptionPlans();

  // Fetch users & subscriptions stats
  let usersList = [];
  let stats = {
    totalFree: 0,
    activePremium: 0,
    expiredSubs: 0,
    oneWeek: 0,
    sixMonth: 0,
    oneYear: 0
  };

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const userDoc of usersSnap.docs) {
      const userData = { uid: userDoc.id, ...userDoc.data() };
      const subInfo = await getUserSubscription(userData.uid);
      userData.subscription = subInfo;
      usersList.push(userData);

      if (!subInfo.isPremium) {
        stats.totalFree++;
      } else if (subInfo.status === 'active') {
        stats.activePremium++;
        if (subInfo.planId === '1week') stats.oneWeek++;
        if (subInfo.planId === '6months') stats.sixMonth++;
        if (subInfo.planId === '1year') stats.oneYear++;
      } else {
        stats.expiredSubs++;
      }
    }
  } catch (err) {
    console.error('Error fetching users for stats:', err);
  }

  container.innerHTML = `
    <div style="margin-bottom: 32px;">
      <h1 style="font-size: 1.75rem; font-weight: 800; color: #0F172A; margin-bottom: 6px;">Subscription Admin Dashboard</h1>
      <p style="font-size: 0.9375rem; color: #64748B;">Manage subscription plans, free launch mode, and user premium assignments.</p>
    </div>

    <!-- Free Launch Mode Banner / Toggle -->
    <div style="background: ${settings.subscriptionSystemEnabled ? '#FEF2F2' : '#F0FDF4'}; border: 1px solid ${settings.subscriptionSystemEnabled ? '#FCA5A5' : '#86EFAC'}; border-radius: 16px; padding: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
      <div>
        <div style="font-size: 1rem; font-weight: 800; color: ${settings.subscriptionSystemEnabled ? '#991B1B' : '#166534'}; margin-bottom: 4px;">
          System Mode: ${settings.subscriptionSystemEnabled ? 'Paid Mode Active' : 'Free Launch Mode Active (subscriptionSystemEnabled: false)'}
        </div>
        <p style="font-size: 0.875rem; color: #475569; margin: 0;">
          ${settings.subscriptionSystemEnabled ? 'Paid subscription checkout is enabled for users.' : 'All users get Free plan active. Paid plans show "Coming Soon". No automated payment required.'}
        </p>
      </div>
      <button type="button" id="toggleLaunchModeBtn" class="btn-primary" style="background: ${settings.subscriptionSystemEnabled ? '#16A34A' : '#DC2626'}; font-weight: 700; padding: 10px 20px; border-radius: 10px;">
        ${settings.subscriptionSystemEnabled ? 'Switch to Free Launch Mode' : 'Enable Paid Mode'}
      </button>
    </div>

    <!-- Statistics Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 36px;">
      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 14px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
        <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Total Free Users</div>
        <div style="font-size: 1.75rem; font-weight: 800; color: #0F172A; margin-top: 6px;">${stats.totalFree}</div>
      </div>
      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 14px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
        <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Active Premium</div>
        <div style="font-size: 1.75rem; font-weight: 800; color: #16A34A; margin-top: 6px;">${stats.activePremium}</div>
      </div>
      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 14px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
        <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">1 Week Subs</div>
        <div style="font-size: 1.75rem; font-weight: 800; color: #2563EB; margin-top: 6px;">${stats.oneWeek}</div>
      </div>
      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 14px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
        <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">6 Month Subs</div>
        <div style="font-size: 1.75rem; font-weight: 800; color: #9333EA; margin-top: 6px;">${stats.sixMonth}</div>
      </div>
      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 14px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
        <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">1 Year Subs</div>
        <div style="font-size: 1.75rem; font-weight: 800; color: #DC2626; margin-top: 6px;">${stats.oneYear}</div>
      </div>
      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 14px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
        <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Expired Subs</div>
        <div style="font-size: 1.75rem; font-weight: 800; color: #64748B; margin-top: 6px;">${stats.expiredSubs}</div>
      </div>
    </div>

    <!-- Section 1: Subscription Plans Management -->
    <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 16px; padding: 24px; margin-bottom: 36px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <h2 style="font-size: 1.25rem; font-weight: 800; color: #0F172A; margin: 0;">Subscription Plans Management</h2>
        <button type="button" id="addNewPlanBtn" class="btn-primary" style="background: #0F172A; font-weight: 700; padding: 8px 16px; border-radius: 8px; font-size: 0.875rem;">+ Add New Plan</button>
      </div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
          <thead>
            <tr style="border-bottom: 2px solid #E2E8F0; color: #64748B;">
              <th style="padding: 12px;">Plan ID</th>
              <th style="padding: 12px;">Name</th>
              <th style="padding: 12px;">Price (₹)</th>
              <th style="padding: 12px;">Duration (Days)</th>
              <th style="padding: 12px;">Status</th>
              <th style="padding: 12px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${plans.map(p => `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 12px; font-weight: 700; color: #0F172A;">${p.planId}</td>
                <td style="padding: 12px; font-weight: 600;">${p.name} ${p.badge ? `<span style="font-size: 0.7rem; background: #FEF2F2; color: #DC2626; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">${p.badge}</span>` : ''}</td>
                <td style="padding: 12px; font-weight: 700;">₹${p.price}</td>
                <td style="padding: 12px;">${p.durationDays >= 99999 ? 'Unlimited' : p.durationDays + ' Days'}</td>
                <td style="padding: 12px;">
                  <span style="padding: 3px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; background: ${p.active !== false ? '#DCFCE7' : '#FEE2E2'}; color: ${p.active !== false ? '#16A34A' : '#DC2626'};">
                    ${p.active !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style="padding: 12px; text-align: right;">
                  <button type="button" class="edit-plan-btn" data-id="${p.planId}" style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #0F172A; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-right: 6px;">Edit</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 2: User Subscription Management & Manual Grant -->
    <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <h2 style="font-size: 1.25rem; font-weight: 800; color: #0F172A; margin: 0;">User Subscription Management</h2>
        <input type="text" id="userSearchInput" placeholder="Search user by email or name..." style="padding: 8px 14px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.875rem; width: 280px;" />
      </div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;" id="usersTable">
          <thead>
            <tr style="border-bottom: 2px solid #E2E8F0; color: #64748B;">
              <th style="padding: 12px;">User Name & Email</th>
              <th style="padding: 12px;">User ID</th>
              <th style="padding: 12px;">Current Plan</th>
              <th style="padding: 12px;">Status</th>
              <th style="padding: 12px;">Expiry Date</th>
              <th style="padding: 12px;">Source</th>
              <th style="padding: 12px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${usersList.map(u => `
              <tr style="border-bottom: 1px solid #F1F5F9;" class="user-row" data-search="${(u.displayName || u.email || '').toLowerCase()}">
                <td style="padding: 12px;">
                  <div style="font-weight: 700; color: #0F172A;">${u.displayName || 'User'}</div>
                  <div style="font-size: 0.75rem; color: #64748B;">${u.email || 'No email'}</div>
                </td>
                <td style="padding: 12px; font-family: monospace; font-size: 0.75rem; color: #475569;">${u.uid.substring(0, 10)}...</td>
                <td style="padding: 12px; font-weight: 700; color: ${u.subscription.isPremium ? '#DC2626' : '#0F172A'};">${u.subscription.planName || u.subscription.name}</td>
                <td style="padding: 12px;">
                  <span style="padding: 3px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; background: ${u.subscription.status === 'active' ? '#DCFCE7' : '#F1F5F9'}; color: ${u.subscription.status === 'active' ? '#16A34A' : '#64748B'};">
                    ${u.subscription.status}
                  </span>
                </td>
                <td style="padding: 12px; font-size: 0.8125rem;">${u.subscription.isPremium ? new Date(u.subscription.expiryDate).toLocaleDateString() : 'Unlimited'}</td>
                <td style="padding: 12px; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #475569;">${u.subscription.source || 'free'}</td>
                <td style="padding: 12px; text-align: right;">
                  <button type="button" class="grant-sub-btn" data-uid="${u.uid}" data-name="${u.displayName || u.email}" style="background: #DC2626; border: none; color: #fff; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; margin-right: 6px;">Grant Premium</button>
                  ${u.subscription.isPremium && u.subscription.id ? `<button type="button" class="revoke-sub-btn" data-uid="${u.uid}" data-subid="${u.subscription.id}" style="background: #F1F5F9; border: 1px solid #FCA5A5; color: #DC2626; padding: 6px 10px; border-radius: 6px; font-weight: 700; cursor: pointer;">Revoke</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Grant Premium Modal -->
    <div id="grantModal" style="position: fixed; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 2000; padding: 16px;">
      <div style="background: #fff; width: 100%; max-width: 440px; border-radius: 16px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
        <h3 style="font-size: 1.25rem; font-weight: 800; color: #0F172A; margin-bottom: 4px;" id="grantModalTitle">Grant Premium Subscription</h3>
        <p style="font-size: 0.875rem; color: #64748B; margin-bottom: 20px;" id="grantModalSubtitle">Select plan and validity for user.</p>
        
        <form id="grantSubForm" style="display: flex; flex-direction: column; gap: 16px;">
          <input type="hidden" id="grantTargetUid" />
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; color: #334155; margin-bottom: 6px;">Select Plan</label>
            <select id="grantPlanSelect" style="width: 100%; padding: 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.875rem;">
              <option value="1week" data-days="7" data-name="1 Week" data-price="29">1 Week (₹29 - 7 Days)</option>
              <option value="6months" data-days="180" data-name="6 Months" data-price="199">6 Months (₹199 - 180 Days)</option>
              <option value="1year" data-days="365" data-name="1 Year" data-price="299" selected>1 Year (₹299 - 365 Days)</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; color: #334155; margin-bottom: 6px;">Start Date</label>
            <input type="date" id="grantStartDate" style="width: 100%; padding: 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.875rem;" required />
          </div>
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; color: #334155; margin-bottom: 6px;">Expiry Date</label>
            <input type="date" id="grantExpiryDate" style="width: 100%; padding: 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.875rem;" required />
          </div>
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; color: #334155; margin-bottom: 6px;">Admin Note</label>
            <input type="text" id="grantAdminNote" value="Granted by Admin (Source: Admin)" style="width: 100%; padding: 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.875rem;" />
          </div>
          <div style="display: flex; gap: 12px; margin-top: 8px;">
            <button type="button" id="cancelGrantBtn" style="flex: 1; padding: 10px; border: 1px solid #CBD5E1; background: #F1F5F9; border-radius: 8px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button type="submit" style="flex: 1; padding: 10px; background: #DC2626; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Save & Grant</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Event Listeners
  const toggleLaunchBtn = document.getElementById('toggleLaunchModeBtn');
  if (toggleLaunchBtn) {
    toggleLaunchBtn.addEventListener('click', async () => {
      const newState = !settings.subscriptionSystemEnabled;
      await updateSystemSettings({ subscriptionSystemEnabled: newState });
      alert(`System mode updated to: ${newState ? 'Paid Mode Enabled' : 'Free Launch Mode'}`);
      renderAdminDashboard(container, adminUser);
    });
  }

  // Search filter
  const searchInput = document.getElementById('userSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase();
      document.querySelectorAll('.user-row').forEach(row => {
        const text = row.getAttribute('data-search') || '';
        row.style.display = text.includes(val) ? '' : 'none';
      });
    });
  }

  // Grant modal triggers
  const grantModal = document.getElementById('grantModal');
  const cancelGrantBtn = document.getElementById('cancelGrantBtn');
  const grantSubForm = document.getElementById('grantSubForm');

  if (cancelGrantBtn) {
    cancelGrantBtn.addEventListener('click', () => {
      grantModal.style.display = 'none';
    });
  }

  document.querySelectorAll('.grant-sub-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.getAttribute('data-uid');
      const name = btn.getAttribute('data-name');
      document.getElementById('grantTargetUid').value = uid;
      document.getElementById('grantModalTitle').textContent = `Grant Premium to ${name}`;
      
      // Default dates: today to 365 days later
      const today = new Date().toISOString().split('T')[0];
      const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      document.getElementById('grantStartDate').value = today;
      document.getElementById('grantExpiryDate').value = expiry;
      
      grantModal.style.display = 'flex';
    });
  });

  // Plan select auto-adjust expiry
  const planSelect = document.getElementById('grantPlanSelect');
  if (planSelect) {
    planSelect.addEventListener('change', (e) => {
      const selectedOpt = e.target.selectedOptions[0];
      const days = parseInt(selectedOpt.getAttribute('data-days') || '365');
      const startStr = document.getElementById('grantStartDate').value || new Date().toISOString().split('T')[0];
      const startDate = new Date(startStr);
      const expiryDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
      document.getElementById('grantExpiryDate').value = expiryDate.toISOString().split('T')[0];
    });
  }

  if (grantSubForm) {
    grantSubForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const uid = document.getElementById('grantTargetUid').value;
      const planOpt = planSelect.selectedOptions[0];
      const planId = planSelect.value;
      const planName = planOpt.getAttribute('data-name');
      const price = parseFloat(planOpt.getAttribute('data-price'));
      const durationDays = parseInt(planOpt.getAttribute('data-days'));
      const startDate = document.getElementById('grantStartDate').value;
      const expiryDate = document.getElementById('grantExpiryDate').value;
      const adminNote = document.getElementById('grantAdminNote').value;

      try {
        await adminGrantSubscription(uid, planId, new Date(startDate).toISOString(), new Date(expiryDate).toISOString(), adminNote, planName, price, durationDays);
        alert('Subscription successfully granted!');
        grantModal.style.display = 'none';
        renderAdminDashboard(container, adminUser);
      } catch (err) {
        alert('Failed to grant subscription: ' + err.message);
      }
    });
  }

  // Revoke buttons
  document.querySelectorAll('.revoke-sub-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.getAttribute('data-uid');
      const subId = btn.getAttribute('data-subid');
      if (confirm('Are you sure you want to revoke this user\'s active subscription?')) {
        try {
          await adminRevokeSubscription(uid, subId);
          alert('Subscription successfully revoked.');
          renderAdminDashboard(container, adminUser);
        } catch (err) {
          alert('Failed to revoke subscription: ' + err.message);
        }
      }
    });
  });
}
