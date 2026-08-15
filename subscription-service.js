import { db, auth } from './firebase.js';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs
} from 'firebase/firestore';


// ============================================================
// DEFAULT SYSTEM CONFIGURATION
// ============================================================

const DEFAULT_SETTINGS = {
  // false = Launch Mode → content remains free
  // true  = Subscription protection is enabled
  subscriptionSystemEnabled: false,
  updatedAt: new Date().toISOString()
};


// ============================================================
// DEFAULT SUBSCRIPTION PLANS
// ============================================================

export const DEFAULT_PLANS = [
  {
    planId: 'free',
    name: 'Free',
    price: 0,
    durationDays: 99999,
    features: [
      'Access to Free Mock Tests',
      'Basic Practice Bank',
      'Previous Year Question papers preview'
    ],
    active: true,
    sortOrder: 1,
    badge: ''
  },

  {
    planId: '1week',
    name: '1 Week',
    price: 29,
    durationDays: 7,
    features: [
      'Unlimited Mock Tests for 7 Days',
      'Detailed Performance Analysis',
      'All Practice Sets'
    ],
    active: false,
    sortOrder: 2,
    badge: ''
  },

  {
    planId: '6months',
    name: '6 Months',
    price: 199,
    durationDays: 180,
    features: [
      'Unlimited Access for 180 Days',
      'All Exam Categories',
      'Priority Support & Solutions'
    ],
    active: false,
    sortOrder: 3,
    badge: ''
  },

  {
    planId: '1year',
    name: '1 Year',
    price: 299,
    durationDays: 365,
    features: [
      'Full Year Access (365 Days)',
      'All Exams & Test Series',
      'Best Value for Serious Aspirants'
    ],
    active: false,
    sortOrder: 4,
    badge: 'Best Value'
  }
];


// ============================================================
// CACHE
// ============================================================

let cachedSystemSettings = null;
let cachedSubscriptionPlans = null;


// ============================================================
// HELPERS
// ============================================================

function getNowISOString() {
  return new Date().toISOString();
}


function getFreePlanObject(allSubscriptions = []) {
  return {
    planId: 'free',
    planName: 'Free',
    name: 'Free',
    price: 0,
    durationDays: 99999,
    status: 'active',
    startDate: null,
    expiryDate: null,
    daysRemaining: 99999,
    isPremium: false,
    source: 'system',
    allSubscriptions
  };
}


function isValidFutureDate(dateValue) {
  if (!dateValue) return true;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date > new Date();
}


function calculateDaysRemaining(expiryDate) {
  if (!expiryDate) return 99999;

  const expiry = new Date(expiryDate);

  if (Number.isNaN(expiry.getTime())) {
    return 0;
  }

  const diff = expiry.getTime() - Date.now();

  if (diff <= 0) {
    return 0;
  }

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}


// ============================================================
// CHECK ADMIN
// ============================================================

export async function checkIsAdmin(user) {
  if (!user) return false;

  // Existing admin account
  if (user.email === 'dk9665676@gmail.com') {
    return true;
  }

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return false;
    }

    const userData = userSnap.data();

    return (
      userData.role === 'admin' ||
      userData.isAdmin === true
    );

  } catch (err) {
    console.error('Error checking admin status:', err);
    return false;
  }
}


// ============================================================
// GET SYSTEM SETTINGS
// ============================================================

export async function getSystemSettings(forceRefresh = false) {

  if (cachedSystemSettings && !forceRefresh) {
    return cachedSystemSettings;
  }

  try {
    const docRef = doc(db, 'settings', 'system');
    const snap = await getDoc(docRef);

    if (snap.exists()) {

      cachedSystemSettings = {
        ...DEFAULT_SETTINGS,
        ...snap.data()
      };

      return cachedSystemSettings;
    }

    // Initialize missing system settings
    await setDoc(docRef, DEFAULT_SETTINGS);

    cachedSystemSettings = {
      ...DEFAULT_SETTINGS
    };

    return cachedSystemSettings;

  } catch (err) {
    console.error('Error getting system settings:', err);

    return {
      ...DEFAULT_SETTINGS
    };
  }
}


// ============================================================
// UPDATE SYSTEM SETTINGS
// ============================================================

export async function updateSystemSettings(newSettings) {

  if (!newSettings || typeof newSettings !== 'object') {
    throw new Error('Invalid system settings');
  }

  try {

    const docRef = doc(db, 'settings', 'system');

    const updatedSettings = {
      ...newSettings,
      updatedAt: getNowISOString()
    };

    await setDoc(
      docRef,
      updatedSettings,
      { merge: true }
    );

    cachedSystemSettings = {
      ...(cachedSystemSettings || DEFAULT_SETTINGS),
      ...updatedSettings
    };

    return true;

  } catch (err) {

    console.error('Error updating system settings:', err);

    throw err;
  }
}


// ============================================================
// GET SUBSCRIPTION PLANS
// ============================================================

export async function getSubscriptionPlans(forceRefresh = false) {

  if (cachedSubscriptionPlans && !forceRefresh) {
    return cachedSubscriptionPlans;
  }

  try {

    const colRef = collection(db, 'subscriptionPlans');
    const snap = await getDocs(colRef);

    // Seed default plans if collection is empty
    if (snap.empty) {

      const now = getNowISOString();

      for (const plan of DEFAULT_PLANS) {

        await setDoc(
          doc(db, 'subscriptionPlans', plan.planId),
          {
            ...plan,
            createdAt: now,
            updatedAt: now
          }
        );
      }

      cachedSubscriptionPlans = [...DEFAULT_PLANS];

      return cachedSubscriptionPlans;
    }

    const plans = [];

    snap.forEach(docSnap => {

      plans.push({
        id: docSnap.id,
        ...docSnap.data()
      });

    });

    cachedSubscriptionPlans = plans.sort(
      (a, b) =>
        (Number(a.sortOrder) || 0) -
        (Number(b.sortOrder) || 0)
    );

    return cachedSubscriptionPlans;

  } catch (err) {

    console.error('Error fetching subscription plans:', err);

    return [...DEFAULT_PLANS];
  }
}


// ============================================================
// GET ACTIVE SUBSCRIPTION
// ============================================================

export async function getActiveSubscription(userId) {

  if (!userId) {
    return null;
  }

  const sub = await getUserSubscription(userId);

  if (!sub) {
    return null;
  }

  if (sub.status !== 'active') {
    return null;
  }

  // FREE plan is not considered premium
  if (sub.planId === 'free') {
    return null;
  }

  const expiryDate = sub.expiryDate || sub.validUntil;

  if (expiryDate && !isValidFutureDate(expiryDate)) {
    return null;
  }

  return sub;
}


// ============================================================
// CHECK SPECIFIC PLAN
// ============================================================

export function isPlanActive(activeSub, planId) {

  if (!activeSub) {
    return false;
  }

  if (activeSub.status !== 'active') {
    return false;
  }

  if (activeSub.planId !== planId) {
    return false;
  }

  const expiryDate =
    activeSub.expiryDate ||
    activeSub.validUntil;

  if (expiryDate && !isValidFutureDate(expiryDate)) {
    return false;
  }

  return true;
}


// ============================================================
// CENTRAL SUBSCRIPTION FUNCTION
// ============================================================

export async function getUserSubscription(userId) {

  if (!userId) {
    return getFreePlanObject();
  }

  try {

    const subsRef = collection(
      db,
      'users',
      userId,
      'subscriptions'
    );

    const snap = await getDocs(subsRef);

    const now = new Date();

    const allSubs = [];
    let activeSub = null;

    for (const docSnap of snap.docs) {

      const originalData = docSnap.data();

      const subData = {
        id: docSnap.id,
        ...originalData
      };

      const expiryDateStr =
        subData.expiryDate ||
        subData.validUntil ||
        null;


      // --------------------------------------------------------
      // CHECK EXPIRY
      // --------------------------------------------------------

      if (
        subData.status === 'active' &&
        expiryDateStr
      ) {

        const expiry = new Date(expiryDateStr);

        if (
          Number.isNaN(expiry.getTime()) ||
          expiry <= now
        ) {

          subData.status = 'expired';

          // Update Firestore status
          try {

            await updateDoc(
              doc(
                db,
                'users',
                userId,
                'subscriptions',
                docSnap.id
              ),
              {
                status: 'expired',
                updatedAt: now.toISOString()
              }
            );

          } catch (updateError) {

            console.warn(
              'Could not update expired subscription:',
              updateError
            );
          }
        }
      }


      allSubs.push(subData);


      // --------------------------------------------------------
      // FIND ACTIVE PAID SUBSCRIPTION
      // --------------------------------------------------------

      if (
        subData.status === 'active' &&
        subData.planId !== 'free'
      ) {

        const expiry = expiryDateStr
          ? new Date(expiryDateStr)
          : null;

        const isUnexpired =
          !expiry ||
          (
            !Number.isNaN(expiry.getTime()) &&
            expiry > now
          );

        if (isUnexpired) {

          if (!activeSub) {

            activeSub = subData;

          } else {

            const currentExpiry =
              activeSub.expiryDate ||
              activeSub.validUntil;

            const currentExpiryDate =
              currentExpiry
                ? new Date(currentExpiry)
                : null;

            // Prefer subscription with later expiry
            if (
              expiry &&
              (
                !currentExpiryDate ||
                expiry > currentExpiryDate
              )
            ) {

              activeSub = subData;
            }
          }
        }
      }
    }


    // ========================================================
    // PAID SUBSCRIPTION FOUND
    // ========================================================

    if (activeSub) {

      const expiryDate =
        activeSub.expiryDate ||
        activeSub.validUntil ||
        null;

      return {
        ...activeSub,

        planName:
          activeSub.planName ||
          activeSub.name ||
          activeSub.planId,

        isPremium: true,

        daysRemaining:
          calculateDaysRemaining(expiryDate),

        allSubscriptions: allSubs
      };
    }


    // ========================================================
    // NO ACTIVE PAID SUBSCRIPTION
    // ========================================================

    const freeSubscription =
      allSubs.find(
        sub =>
          sub.planId === 'free' &&
          sub.status === 'active'
      );

    if (freeSubscription) {

      return {
        ...freeSubscription,

        planName:
          freeSubscription.planName ||
          freeSubscription.name ||
          'Free',

        isPremium: false,

        daysRemaining: 99999,

        allSubscriptions: allSubs
      };
    }


    // ========================================================
    // FALLBACK FREE USER
    // ========================================================

    return getFreePlanObject(allSubs);

  } catch (err) {

    console.error(
      'Error getting user subscription:',
      err
    );

    return getFreePlanObject();
  }
}


// ============================================================
// ADMIN GRANT SUBSCRIPTION
// ============================================================

export async function adminGrantSubscription(
  targetUserId,
  planId,
  startDateStr,
  expiryDateStr,
  adminNote = '',
  planName = '',
  price = 0,
  durationDays = 365
) {

  if (!targetUserId) {
    throw new Error('Target user ID is required');
  }

  if (!planId) {
    throw new Error('Plan ID is required');
  }

  try {

    const subId =
      'sub_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .substring(2, 8);

    const now = getNowISOString();

    const subData = {

      subscriptionId: subId,

      userId: targetUserId,

      planId,

      planName:
        planName ||
        planId,

      price:
        Number(price) || 0,

      durationDays:
        Number(durationDays) || 0,

      startDate:
        startDateStr ||
        now,

      expiryDate:
        expiryDateStr ||
        null,

      status: 'active',

      source: 'admin',

      paymentId: null,

      adminNote:
        adminNote ||
        'Granted by Admin',

      createdAt: now,

      updatedAt: now
    };


    const subRef = doc(
      db,
      'users',
      targetUserId,
      'subscriptions',
      subId
    );

    await setDoc(
      subRef,
      subData
    );

    return true;

  } catch (err) {

    console.error(
      'Error granting subscription:',
      err
    );

    throw err;
  }
}


// ============================================================
// ADMIN REVOKE SUBSCRIPTION
// ============================================================

export async function adminRevokeSubscription(
  targetUserId,
  subscriptionId
) {

  if (!targetUserId) {
    throw new Error('Target user ID is required');
  }

  if (!subscriptionId) {
    throw new Error('Subscription ID is required');
  }

  try {

    const subRef = doc(
      db,
      'users',
      targetUserId,
      'subscriptions',
      subscriptionId
    );

    await updateDoc(
      subRef,
      {
        status: 'expired',
        updatedAt: getNowISOString(),
        adminNote: 'Revoked by Admin'
      }
    );

    return true;

  } catch (err) {

    console.error(
      'Error revoking subscription:',
      err
    );

    throw err;
  }
}


// ============================================================
// PAYMENT GATEWAY PREPARATION
// ============================================================

export function preparePaymentGatewayCheckout(
  plan,
  user
) {

  if (!plan) {
    throw new Error('Plan is required');
  }

  if (!user) {
    throw new Error('User is required');
  }

  console.log(
    'Payment gateway checkout prepared:',
    plan,
    user
  );

  return {

    gatewayReady: true,

    orderId:
      'order_' +
      Date.now(),

    amount:
      Number(plan.price || 0) * 100,

    currency: 'INR',

    notes: {
      planId: plan.planId,
      userId: user.uid
    }
  };
}


// ============================================================
// CENTRAL CONTENT ACCESS CHECK
// ============================================================

export async function canAccessContent(
  userOrUserId,
  contentType,
  itemIndex
) {

  // ----------------------------------------------------------
  // Always allow first item
  // ----------------------------------------------------------

  if (Number(itemIndex) === 0) {
    return true;
  }


  // ----------------------------------------------------------
  // Resolve user ID
  // ----------------------------------------------------------

  let userId = null;

  if (typeof userOrUserId === 'string') {

    userId = userOrUserId;

  } else if (
    userOrUserId &&
    userOrUserId.uid
  ) {

    userId = userOrUserId.uid;

  } else if (auth.currentUser) {

    userId = auth.currentUser.uid;

  } else {

    try {

      const saved =
        localStorage.getItem('rankhub_user');

      if (saved) {

        const savedUser =
          JSON.parse(saved);

        if (
          savedUser &&
          savedUser.uid
        ) {

          userId = savedUser.uid;
        }
      }

    } catch (e) {
      // Ignore localStorage errors
    }
  }


  // ----------------------------------------------------------
  // No logged-in user
  // ----------------------------------------------------------

  if (!userId) {

    // First item already handled above
    return false;
  }


  // ----------------------------------------------------------
  // CHECK SYSTEM MODE
  // ----------------------------------------------------------

  const settings =
    await getSystemSettings();

  /*
   * FREE LAUNCH MODE
   *
   * When subscriptionSystemEnabled === false,
   * all content is accessible.
   */

  if (
    settings.subscriptionSystemEnabled !== true
  ) {

    return true;
  }


  // ----------------------------------------------------------
  // SUBSCRIPTION MODE ENABLED
  // ----------------------------------------------------------

  const subscription =
    await getUserSubscription(userId);


  /*
   * Only a valid paid subscription
   * unlocks protected content.
   */

  return (
    subscription &&
    subscription.isPremium === true
  );
}


// ============================================================
// GLOBAL RANKHUB PASS MODAL
// ============================================================

export function showRankHubPassModal(
  contentTitle = 'Locked Content'
) {

  let modal =
    document.getElementById(
      'rankhubPassGlobalModal'
    );


  // ----------------------------------------------------------
  // CREATE MODAL
  // ----------------------------------------------------------

  if (!modal) {

    modal =
      document.createElement('div');

    modal.id =
      'rankhubPassGlobalModal';

    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(15,23,42,0.6);
      backdrop-filter:blur(6px);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:99999;
      padding:16px;
    `;


    modal.innerHTML = `

      <div style="
        background:#FFFFFF;
        width:100%;
        max-width:460px;
        border-radius:20px;
        padding:32px;
        box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);
        position:relative;
        text-align:center;
      ">

        <button
          type="button"
          id="closeRankhubModalBtn"
          style="
            position:absolute;
            top:16px;
            right:16px;
            background:#F1F5F9;
            border:none;
            width:32px;
            height:32px;
            border-radius:50%;
            font-weight:800;
            cursor:pointer;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#64748B;
          "
        >
          &times;
        </button>


        <div style="
          width:56px;
          height:56px;
          background:#FEF2F2;
          color:#DC2626;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          margin:0 auto 16px;
        ">

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="3"
              y="11"
              width="18"
              height="11"
              rx="2"
              ry="2"
            />

            <path
              d="M7 11V7a5 5 0 0 1 10 0v4"
            />
          </svg>

        </div>


        <span style="
          display:inline-block;
          padding:4px 12px;
          background:#FEF2F2;
          color:#DC2626;
          border-radius:999px;
          font-size:0.75rem;
          font-weight:800;
          text-transform:uppercase;
          margin-bottom:8px;
        ">
          RankHub Pass Protected
        </span>


        <h3 style="
          font-size:1.375rem;
          font-weight:800;
          color:#0F172A;
          margin-bottom:6px;
        ">
          Unlock this content with RankHub Pass
        </h3>


        <p
          style="
            font-size:0.875rem;
            color:#64748B;
            margin-bottom:20px;
          "
          id="rankhubModalContentName"
        >
          Accessing: ${contentTitle}
        </p>


        <div style="
          background:#F8FAFC;
          border:1px solid #E2E8F0;
          border-radius:14px;
          padding:16px;
          margin-bottom:24px;
          text-align:left;
        ">

          <div style="
            font-size:0.8125rem;
            font-weight:800;
            color:#0F172A;
            margin-bottom:8px;
          ">
            What you get with RankHub Pass Pro:
          </div>


          <ul style="
            list-style:none;
            padding:0;
            margin:0;
            font-size:0.8125rem;
            color:#334155;
            display:flex;
            flex-direction:column;
            gap:6px;
          ">

            <li>
              ✓ Unlimited Mock Tests & Re-attempts
            </li>

            <li>
              ✓ All Practice Sets & PYQ Papers
            </li>

            <li>
              ✓ Study Notes & Revision PDFs
            </li>

          </ul>


          <div style="
            margin-top:12px;
            padding-top:10px;
            border-top:1px solid #E2E8F0;
            display:flex;
            justify-content:space-around;
            font-size:0.75rem;
            font-weight:700;
            color:#64748B;
          ">

            <span>1 Week — ₹29</span>

            <span>6 Months — ₹199</span>

            <span style="color:#DC2626;">
              1 Year — ₹299
            </span>

          </div>

        </div>


        <div style="
          display:flex;
          flex-direction:column;
          gap:10px;
        ">

          <a
            href="./rankhub-pass.html"
            style="
              background:#DC2626;
              color:#FFFFFF;
              padding:12px;
              border-radius:10px;
              font-weight:800;
              text-decoration:none;
              display:block;
              text-align:center;
            "
          >
            Get RankHub Pass
          </a>


          <button
            type="button"
            id="continueFreeModalBtn"
            style="
              background:#F1F5F9;
              color:#0F172A;
              border:none;
              padding:12px;
              border-radius:10px;
              font-weight:700;
              cursor:pointer;
            "
          >
            Continue with Free Content
          </button>

        </div>

      </div>
    `;


    document.body.appendChild(modal);


    // --------------------------------------------------------
    // CLOSE MODAL
    // --------------------------------------------------------

    const closeModal = () => {

      modal.style.display =
        'none';

    };


    const closeBtn =
      modal.querySelector(
        '#closeRankhubModalBtn'
      );

    const continueBtn =
      modal.querySelector(
        '#continueFreeModalBtn'
      );


    if (closeBtn) {
      closeBtn.onclick =
        closeModal;
    }


    if (continueBtn) {
      continueBtn.onclick =
        closeModal;
    }


    modal.onclick = (event) => {

      if (
        event.target === modal
      ) {

        closeModal();
      }

    };


  } else {

    // --------------------------------------------------------
    // UPDATE EXISTING MODAL
    // --------------------------------------------------------

    const nameEl =
      modal.querySelector(
        '#rankhubModalContentName'
      );

    if (nameEl) {

      nameEl.textContent =
        `Accessing: ${contentTitle}`;

    }


    modal.style.display =
      'flex';
  }
}


// ============================================================
// CLEAR LOCAL CACHE
// ============================================================

export function clearSubscriptionCache() {

  cachedSystemSettings = null;
  cachedSubscriptionPlans = null;
}
