import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, query, where, orderBy, deleteDoc } from "firebase/firestore";

// Default System Configuration
const DEFAULT_SETTINGS = {
  subscriptionSystemEnabled: false, // Free Launch Mode is active by default
  updatedAt: new Date().toISOString()
};

// Default Subscription Plans
export const DEFAULT_PLANS = [
  {
    planId: 'free',
    name: 'Free',
    price: 0,
    durationDays: 99999,
    features: ['Access to Free Mock Tests', 'Basic Practice Bank', 'Previous Year Question papers preview'],
    active: true,
    sortOrder: 1,
    badge: ''
  },
  {
    planId: '1week', name: '1 Week', price: 29, durationDays: 7, features: ['Unlimited Mock Tests for 7 Days', 'Detailed Performance Analysis', 'All Practice Sets'], active: false,
    sortOrder: 2,
    badge: ''
  },
  {
    planId: '6months', name: '6 Months', price: 199, durationDays: 180, features: ['Unlimited Access for 180 Days', 'All Exam Categories', 'Priority Support & Solutions'], active: false,
    sortOrder: 3,
    badge: ''
  },
  {
    planId: '1year', name: '1 Year', price: 299, durationDays: 365, features: ['Full Year Access (365 Days)', 'All Exams & Test Series', 'Best Value for Serious Aspirants'], active: false,
    sortOrder: 4,
    badge: 'Best Value'
  }
];

// Check if current user is admin
export async function checkIsAdmin(user) {
  if (!user) return false;
  if (user.email === 'dk9665676@gmail.com') return true;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists() && (userSnap.data().role === 'admin' || userSnap.data().isAdmin === true)) {
      return true;
    }
  } catch (err) {
    console.error('Error checking admin status:', err);
  }
  return false;
}

let cachedSystemSettings = null;
// Get system settings
export async function getSystemSettings() {
  if (cachedSystemSettings) return cachedSystemSettings;
  try {
    const docRef = doc(db, 'settings', 'system');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      cachedSystemSettings = snap.data();
      return cachedSystemSettings;
    } else {
      // Initialize if missing
      await setDoc(docRef, DEFAULT_SETTINGS);
      cachedSystemSettings = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    }
  } catch (err) {
    console.error('Error getting system settings:', err);
    return DEFAULT_SETTINGS;
  }
}

// Update system settings (Admin only)
export async function updateSystemSettings(newSettings) {
  try {
    const docRef = doc(db, 'settings', 'system');
    await setDoc(docRef, { ...newSettings, updatedAt: new Date().toISOString() }, { merge: true });
    cachedSystemSettings = { ...(cachedSystemSettings || DEFAULT_SETTINGS), ...newSettings };
    return true;
  } catch (err) {
    console.error('Error updating system settings:', err);
    throw err;
  }
}

let cachedSubscriptionPlans = null;
// Get all subscription plans
export async function getSubscriptionPlans() {
  if (cachedSubscriptionPlans) return cachedSubscriptionPlans;
  try {
    const colRef = collection(db, 'subscriptionPlans');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      // Seed default plans if none exist
      for (const plan of DEFAULT_PLANS) {
        await setDoc(doc(db, 'subscriptionPlans', plan.planId), {
          ...plan,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      cachedSubscriptionPlans = DEFAULT_PLANS;
      return DEFAULT_PLANS;
    }
    const plans = [];
    snap.forEach(docSnap => {
      plans.push({ id: docSnap.id, ...docSnap.data() });
    });
    cachedSubscriptionPlans = plans.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return cachedSubscriptionPlans;
  } catch (err) {
    console.error('Error fetching subscription plans:', err);
    return DEFAULT_PLANS;
  }
}

export async function getActiveSubscription(userId) {
  const sub = await getUserSubscription(userId);
  if (sub && sub.status === 'active') {
    const now = new Date();
    const expiryDateStr = sub.expiryDate || sub.validUntil;
    if (expiryDateStr) {
      const expiry = new Date(expiryDateStr);
      if (expiry > now) return sub;
    } else {
      return sub;
    }
  }
  return null;
}

export function isPlanActive(activeSub, planId) {
  if (!activeSub || activeSub.status !== 'active') return false;
  const now = new Date();
  const expiryDateStr = activeSub.expiryDate || activeSub.validUntil;
  if (expiryDateStr) {
    const expiry = new Date(expiryDateStr);
    if (expiry <= now) return false;
  }
  if (activeSub.planId === planId) return true;
  if (planId === 'free' && activeSub.planId === 'free') {
    return true;
  }
  return false;
}

// Central subscription check: getUserSubscription(userId)
export async function getUserSubscription(userId) {
  if (!userId) {
    return getFreePlanObject();
  }
  try {
    const subsRef = collection(db, 'users', userId, 'subscriptions');
    const snap = await getDocs(subsRef);
    
    const now = new Date();
    let activeSub = null;
    let allSubs = [];
    let hasExpired = false;

    for (const docSnap of snap.docs) {
      const subData = { id: docSnap.id, ...docSnap.data() };
      
      const expiryDateStr = subData.expiryDate || subData.validUntil;
      if (subData.status === 'active' && expiryDateStr) {
        const expiry = new Date(expiryDateStr);
        if (expiry <= now) {
          subData.status = 'expired';
          hasExpired = true;
          try {
            await updateDoc(doc(db, 'users', userId, 'subscriptions', docSnap.id), {
              status: 'expired',
              updatedAt: now.toISOString()
            });
          } catch (e) {}
        }
      } else if (subData.status === 'expired') {
        hasExpired = true;
      }

      allSubs.push(subData);

      if (subData.status === 'active') {
        const expiry = expiryDateStr ? new Date(expiryDateStr) : null;
        if (!expiry || expiry > now) {
          if (!activeSub || (expiry && activeSub.expiryDate && expiry > new Date(activeSub.expiryDate))) {
            activeSub = subData;
          }
        }
      }
    }

    if (activeSub) {
      const expiryDateStr = activeSub.expiryDate || activeSub.validUntil;
      const expiry = expiryDateStr ? new Date(expiryDateStr) : null;
      const diffTime = expiry ? expiry - now : 0;
      const daysRemaining = expiry ? Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))) : 0;
      
      return {
        ...activeSub,
        isPremium: true,
        daysRemaining,
        allSubscriptions: allSubs
      };
    }

    // No active unexpired subscription found
    const freeObj = getFreePlanObject();
    if (hasExpired || allSubs.length > 0) {
      const freeSub = allSubs.find(s => s.planId === 'free');
      if (freeSub) {
        freeObj.status = 'expired';
      }
    }
    freeObj.allSubscriptions = allSubs;
    return freeObj;
  } catch (err) {
    console.error('Error getting user subscription:', err);
    return getFreePlanObject();
  }
}

function getFreePlanObject() {
  return {
    planId: 'free',
    planName: 'Free',
    name: 'Free',
    price: 0,
    durationDays: 7,
    status: 'inactive',
    startDate: null,
    expiryDate: null,
    daysRemaining: 0,
    isPremium: false,
    source: 'system',
    allSubscriptions: []
  };
}

// Admin manual grant subscription
export async function adminGrantSubscription(targetUserId, planId, startDateStr, expiryDateStr, adminNote = '', planName = '', price = 0, durationDays = 365) {
  try {
    const subId = 'sub_' + Date.now();
    const subData = {
      subscriptionId: subId,
      userId: targetUserId,
      planId,
      planName: planName || planId,
      price: Number(price),
      durationDays: Number(durationDays),
      startDate: startDateStr,
      expiryDate: expiryDateStr,
      status: 'active',
      source: 'admin',
      paymentId: null,
      adminNote: adminNote || 'Granted by Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const subRef = doc(db, 'users', targetUserId, 'subscriptions', subId);
    await setDoc(subRef, subData);
    return true;
  } catch (err) {
    console.error('Error granting subscription:', err);
    throw err;
  }
}

// Admin revoke subscription
export async function adminRevokeSubscription(targetUserId, subscriptionId) {
  try {
    const subRef = doc(db, 'users', targetUserId, 'subscriptions', subscriptionId);
    await updateDoc(subRef, {
      status: 'expired',
      updatedAt: new Date().toISOString(),
      adminNote: 'Revoked by Admin'
    });
    return true;
  } catch (err) {
    console.error('Error revoking subscription:', err);
    throw err;
  }
}

// Payment gateway preparation (future integration)
export function preparePaymentGatewayCheckout(plan, user) {
  // Architecture placeholder for Razorpay / Stripe / Paytm gateway integration
  console.log('Payment gateway checkout prepared for plan:', plan, 'user:', user);
  return {
    gatewayReady: true,
    orderId: 'order_' + Date.now(),
    amount: plan.price * 100,
    currency: 'INR',
    notes: { planId: plan.planId, userId: user ? user.uid : '' }
  };
}

// Centralized access check function: canAccessContent(userOrUserId, contentType, itemIndex)
export async function canAccessContent(userOrUserId, contentType, itemIndex) {
  if (itemIndex === 0) {
    return true; // #1 item is always free
  }

  let userId = null;
  if (typeof userOrUserId === 'string') {
    userId = userOrUserId;
  } else if (userOrUserId && userOrUserId.uid) {
    userId = userOrUserId.uid;
  } else if (auth.currentUser) {
    userId = auth.currentUser.uid;
  } else {
    try {
      const saved = localStorage.getItem('rankhub_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u && u.uid) userId = u.uid;
      }
    } catch (e) {}
  }

  if (!userId) {
    return false;
  }

  const sub = await getUserSubscription(userId);
  return sub && sub.isPremium === true;
}

// Global RankHub Pass Prompt Modal helper
export function showRankHubPassModal(contentTitle = 'Locked Content') {
  let modal = document.getElementById('rankhubPassGlobalModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'rankhubPassGlobalModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;';
    modal.innerHTML = `
      <div style="background:#FFFFFF;width:100%;max-width:460px;border-radius:20px;padding:32px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);position:relative;text-align:center;">
        <button type="button" id="closeRankhubModalBtn" style="position:absolute;top:16px;right:16px;background:#F1F5F9;border:none;width:32px;height:32px;border-radius:50%;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#64748B;">&times;</button>
        <div style="width:56px;height:56px;background:#FEF2F2;color:#DC2626;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <span style="display:inline-block;padding:4px 12px;background:#FEF2F2;color:#DC2626;border-radius:999px;font-size:0.75rem;font-weight:800;text-transform:uppercase;margin-bottom:8px;">RankHub Pass Protected</span>
        <h3 style="font-size:1.375rem;font-weight:800;color:#0F172A;margin-bottom:6px;">Unlock this content with RankHub Pass</h3>
        <p style="font-size:0.875rem;color:#64748B;margin-bottom:20px;" id="rankhubModalContentName">Accessing: ${contentTitle}</p>
        
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:16px;margin-bottom:24px;text-align:left;">
          <div style="font-size:0.8125rem;font-weight:800;color:#0F172A;margin-bottom:8px;">What you get with RankHub Pass Pro:</div>
          <ul style="list-style:none;padding:0;margin:0;font-size:0.8125rem;color:#334155;display:flex;flex-direction:column;gap:6px;">
            <li style="display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Unlimited Mock Tests & Re-attempts</li>
            <li style="display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>All Practice Sets & PYQ Papers</li>
            <li style="display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Study Notes & Revision PDFs</li>
          </ul>
          <div style="margin-top:12px;padding-top:10px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-around;font-size:0.75rem;font-weight:700;color:#64748B;">
            <span>1 Week — ₹29</span>
            <span>6 Months — ₹199</span>
            <span style="color:#DC2626;">1 Year — ₹299</span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <a href="./rankhub-pass.html" style="background:#DC2626;color:#FFFFFF;padding:12px;border-radius:10px;font-weight:800;text-decoration:none;display:block;text-align:center;">Get RankHub Pass</a>
          <button type="button" id="continueFreeModalBtn" style="background:#F1F5F9;color:#0F172A;border:none;padding:12px;border-radius:10px;font-weight:700;cursor:pointer;">Continue with Free Content</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => {
      modal.style.display = 'none';
    };

    modal.querySelector('#closeRankhubModalBtn').onclick = closeModal;
    modal.querySelector('#continueFreeModalBtn').onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  } else {
    const nameEl = modal.querySelector('#rankhubModalContentName');
    if (nameEl) nameEl.textContent = `Accessing: ${contentTitle}`;
    modal.style.display = 'flex';
  }
}

