// ============================================================
// RankHub - Subscription Service
// ============================================================

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
// DEFAULT SYSTEM SETTINGS
// ============================================================

const DEFAULT_SETTINGS = {
  subscriptionSystemEnabled: false,
  updatedAt: new Date().toISOString()
};


// ============================================================
// DEFAULT PLANS
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
    active: true,
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
    active: true,
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
    active: true,
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
// BASIC HELPERS
// ============================================================

function nowISO() {
  return new Date().toISOString();
}


// ============================================================
// FIRESTORE DATE NORMALIZER
// Handles:
// - Firestore Timestamp
// - Date
// - ISO String
// - Number
// ============================================================

function normalizeDate(value) {

  if (!value) {
    return null;
  }

  // Native JS Date
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  // Firestore Timestamp
  if (
    typeof value === 'object' &&
    typeof value.toDate === 'function'
  ) {
    try {
      const date = value.toDate();

      return Number.isNaN(date.getTime())
        ? null
        : date;
    } catch (error) {
      console.warn('Could not convert Firestore Timestamp:', error);
      return null;
    }
  }

  // Firestore Timestamp-like object
  if (
    typeof value === 'object' &&
    typeof value.seconds === 'number'
  ) {
    const milliseconds =
      value.seconds * 1000 +
      Math.floor((value.nanoseconds || 0) / 1000000);

    const date = new Date(milliseconds);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  // Number
  if (typeof value === 'number') {

    // seconds timestamp
    if (value < 100000000000) {
      const date = new Date(value * 1000);

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    // milliseconds timestamp
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  // String
  if (typeof value === 'string') {

    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const date = new Date(trimmed);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  return null;
}


// ============================================================
// EXPIRY DATE
// ============================================================

function getSubscriptionExpiry(subscription) {

  if (!subscription) {
    return null;
  }

  return (
    normalizeDate(subscription.expiryDate) ||
    normalizeDate(subscription.validUntil) ||
    normalizeDate(subscription.expiresAt) ||
    null
  );
}


// ============================================================
// START DATE
// ============================================================

function getSubscriptionStart(subscription) {

  if (!subscription) {
    return null;
  }

  return (
    normalizeDate(subscription.startDate) ||
    normalizeDate(subscription.startedAt) ||
    normalizeDate(subscription.createdAt) ||
    null
  );
}


// ============================================================
// CHECK VALID ACTIVE SUBSCRIPTION
// ============================================================

function isSubscriptionCurrentlyActive(subscription) {

  if (!subscription) {
    return false;
  }

  if (String(subscription.status || '').toLowerCase() !== 'active') {
    return false;
  }

  // Free is never premium
  if (subscription.planId === 'free') {
    return false;
  }

  const now = new Date();

  const startDate = getSubscriptionStart(subscription);

  if (startDate && startDate > now) {
    return false;
  }

  const expiryDate = getSubscriptionExpiry(subscription);

  // No expiry = valid lifetime subscription
  if (!expiryDate) {
    return true;
  }

  return expiryDate > now;
}


// ============================================================
// DAYS REMAINING
// ============================================================

function calculateDaysRemaining(subscription) {

  const expiryDate = getSubscriptionExpiry(subscription);

  if (!expiryDate) {
    return 99999;
  }

  const difference =
    expiryDate.getTime() - Date.now();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );
}


// ============================================================
// FREE USER OBJECT
// ============================================================

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


// ============================================================
// ADMIN CHECK
// ============================================================

export async function checkIsAdmin(user) {

  if (!user) {
    return false;
  }

  // Existing admin account
  if (
    user.email &&
    user.email.toLowerCase() === 'dk9665676@gmail.com'
  ) {
    return true;
  }

  try {

    const userRef =
      doc(db, 'users', user.uid);

    const snap =
      await getDoc(userRef);

    if (!snap.exists()) {
      return false;
    }

    const data = snap.data();

    return (
      data.role === 'admin' ||
      data.isAdmin === true
    );

  } catch (error) {

    console.error(
      'Admin check failed:',
      error
    );

    return false;
  }
}


// ============================================================
// SYSTEM SETTINGS
// ============================================================

export async function getSystemSettings(
  forceRefresh = false
) {

  if (
    cachedSystemSettings &&
    !forceRefresh
  ) {
    return cachedSystemSettings;
  }

  try {

    const ref =
      doc(db, 'settings', 'system');

    const snap =
      await getDoc(ref);

    if (snap.exists()) {

      cachedSystemSettings = {
        ...DEFAULT_SETTINGS,
        ...snap.data()
      };

      return cachedSystemSettings;
    }

    await setDoc(
      ref,
      DEFAULT_SETTINGS
    );

    cachedSystemSettings = {
      ...DEFAULT_SETTINGS
    };

    return cachedSystemSettings;

  } catch (error) {

    console.error(
      'getSystemSettings error:',
      error
    );

    return {
      ...DEFAULT_SETTINGS
    };
  }
}


// ============================================================
// UPDATE SYSTEM SETTINGS
// ============================================================

export async function updateSystemSettings(
  newSettings
) {

  if (
    !newSettings ||
    typeof newSettings !== 'object'
  ) {
    throw new Error(
      'Invalid system settings'
    );
  }

  try {

    const ref =
      doc(db, 'settings', 'system');

    const data = {
      ...newSettings,
      updatedAt: nowISO()
    };

    await setDoc(
      ref,
      data,
      { merge: true }
    );

    cachedSystemSettings = {
      ...(cachedSystemSettings || DEFAULT_SETTINGS),
      ...data
    };

    return true;

  } catch (error) {

    console.error(
      'updateSystemSettings error:',
      error
    );

    throw error;
  }
}


// ============================================================
// GET SUBSCRIPTION PLANS
// ============================================================

export async function getSubscriptionPlans(
  forceRefresh = false
) {

  if (
    cachedSubscriptionPlans &&
    !forceRefresh
  ) {
    return cachedSubscriptionPlans;
  }

  try {

    const ref =
      collection(db, 'subscriptionPlans');

    const snap =
      await getDocs(ref);

    // Seed defaults
    if (snap.empty) {

      const timestamp =
        nowISO();

      for (const plan of DEFAULT_PLANS) {

        await setDoc(
          doc(
            db,
            'subscriptionPlans',
            plan.planId
          ),
          {
            ...plan,
            createdAt: timestamp,
            updatedAt: timestamp
          }
        );
      }

      cachedSubscriptionPlans =
        [...DEFAULT_PLANS];

      return cachedSubscriptionPlans;
    }

    const plans = [];

    snap.forEach(
      planSnap => {

        plans.push({
          id: planSnap.id,
          ...planSnap.data()
        });

      }
    );

    cachedSubscriptionPlans =
      plans.sort(
        (a, b) =>
          Number(a.sortOrder || 0) -
          Number(b.sortOrder || 0)
      );

    return cachedSubscriptionPlans;

  } catch (error) {

    console.error(
      'getSubscriptionPlans error:',
      error
    );

    return [...DEFAULT_PLANS];
  }
}


// ============================================================
// GET USER SUBSCRIPTION
// ============================================================

export async function getUserSubscription(
  userId
) {

  if (!userId) {
    return getFreePlanObject();
  }

  try {

    const subscriptionsRef =
      collection(
        db,
        'users',
        userId,
        'subscriptions'
      );

    const snap =
      await getDocs(
        subscriptionsRef
      );

    const allSubscriptions = [];

    const now = new Date();

    let bestPaidSubscription = null;

    // ========================================================
    // LOOP ALL SUBSCRIPTIONS
    // ========================================================

    for (
      const subscriptionDoc of snap.docs
    ) {

      const originalData =
        subscriptionDoc.data();

      const subscription = {
        id: subscriptionDoc.id,
        ...originalData
      };

      const expiryDate =
        getSubscriptionExpiry(
          subscription
        );

      // ------------------------------------------------------
      // EXPIRED SUBSCRIPTION
      // ------------------------------------------------------

      if (
        subscription.status === 'active' &&
        expiryDate &&
        expiryDate <= now
      ) {

        subscription.status =
          'expired';

        try {

          await updateDoc(
            doc(
              db,
              'users',
              userId,
              'subscriptions',
              subscriptionDoc.id
            ),
            {
              status: 'expired',
              updatedAt: nowISO()
            }
          );

        } catch (updateError) {

          console.warn(
            'Unable to update expired subscription:',
            updateError
          );
        }
      }


      allSubscriptions.push(
        subscription
      );


      // ------------------------------------------------------
      // FIND VALID PAID SUBSCRIPTION
      // ------------------------------------------------------

      if (
        isSubscriptionCurrentlyActive(
          subscription
        )
      ) {

        if (
          !bestPaidSubscription
        ) {

          bestPaidSubscription =
            subscription;

        } else {

          const currentExpiry =
            getSubscriptionExpiry(
              bestPaidSubscription
            );

          const newExpiry =
            getSubscriptionExpiry(
              subscription
            );

          // Lifetime subscription wins
          if (
            !currentExpiry &&
            newExpiry
          ) {
            continue;
          }

          if (
            currentExpiry &&
            !newExpiry
          ) {
            bestPaidSubscription =
              subscription;
            continue;
          }

          // Later expiry wins
          if (
            newExpiry &&
            currentExpiry &&
            newExpiry > currentExpiry
          ) {
            bestPaidSubscription =
              subscription;
          }
        }
      }
    }


    // ========================================================
    // PAID SUBSCRIPTION FOUND
    // ========================================================

    if (bestPaidSubscription) {

      const expiryDate =
        getSubscriptionExpiry(
          bestPaidSubscription
        );

      return {

        ...bestPaidSubscription,

        planName:
          bestPaidSubscription.planName ||
          bestPaidSubscription.name ||
          bestPaidSubscription.planId,

        name:
          bestPaidSubscription.planName ||
          bestPaidSubscription.name ||
          bestPaidSubscription.planId,

        isPremium: true,

        daysRemaining:
          calculateDaysRemaining(
            bestPaidSubscription
          ),

        allSubscriptions
      };
    }


    // ========================================================
    // FREE SUBSCRIPTION
    // ========================================================

    const freeSubscription =
      allSubscriptions.find(
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

        name:
          freeSubscription.planName ||
          freeSubscription.name ||
          'Free',

        isPremium: false,

        daysRemaining: 99999,

        allSubscriptions
      };
    }


    // ========================================================
    // DEFAULT FREE
    // ========================================================

    return getFreePlanObject(
      allSubscriptions
    );

  } catch (error) {

    console.error(
      'getUserSubscription error:',
      error
    );

    return getFreePlanObject();
  }
}


// ============================================================
// GET ACTIVE PAID SUBSCRIPTION
// ============================================================

export async function getActiveSubscription(
  userId
) {

  if (!userId) {
    return null;
  }

  const subscription =
    await getUserSubscription(
      userId
    );

  if (
    subscription &&
    subscription.isPremium === true
  ) {
    return subscription;
  }

  return null;
}


// ============================================================
// CHECK SPECIFIC PLAN
// ============================================================

export function isPlanActive(
  activeSub,
  planId
) {

  if (!activeSub) {
    return false;
  }

  if (
    activeSub.status !== 'active'
  ) {
    return false;
  }

  if (
    activeSub.planId !== planId
  ) {
    return false;
  }

  if (
    planId === 'free'
  ) {
    return true;
  }

  return isSubscriptionCurrentlyActive(
    activeSub
  );
}


// ============================================================
// RESOLVE USER ID
// ============================================================

function resolveUserId(
  userOrUserId
) {

  // UID string
  if (
    typeof userOrUserId === 'string' &&
    userOrUserId.trim()
  ) {
    return userOrUserId.trim();
  }

  // Firebase user
  if (
    userOrUserId &&
    userOrUserId.uid
  ) {
    return userOrUserId.uid;
  }

  // Current Firebase user
  if (
    auth &&
    auth.currentUser &&
    auth.currentUser.uid
  ) {
    return auth.currentUser.uid;
  }

  // Local fallback
  try {

    const saved =
      localStorage.getItem(
        'rankhub_user'
      );

    if (saved) {

      const parsed =
        JSON.parse(saved);

      if (
        parsed &&
        parsed.uid
      ) {
        return parsed.uid;
      }
    }

  } catch (error) {
    console.warn(
      'Could not read rankhub_user:',
      error
    );
  }

  return null;
}


// ============================================================
// CENTRAL CONTENT ACCESS
// ============================================================

export async function canAccessContent(
  userOrUserId,
  contentType = '',
  itemIndex = 0
) {

  console.log(
    '[RankHub Access]',
    {
      contentType,
      itemIndex
    }
  );


  // ==========================================================
  // FIRST CONTENT ALWAYS FREE
  // ==========================================================

  if (
    Number(itemIndex) === 0
  ) {
    return true;
  }


  // ==========================================================
  // GET USER
  // ==========================================================

  const userId =
    resolveUserId(
      userOrUserId
    );


  // ==========================================================
  // SYSTEM SETTINGS
  // ==========================================================

  const settings =
    await getSystemSettings();


  // ==========================================================
  // LAUNCH MODE
  //
  // subscriptionSystemEnabled = false
  //
  // EVERYTHING IS OPEN
  // ==========================================================

  if (
    settings.subscriptionSystemEnabled !== true
  ) {

    console.log(
      '[RankHub Access] Launch mode: ACCESS GRANTED'
    );

    return true;
  }


  // ==========================================================
  // SUBSCRIPTION MODE
  // ==========================================================

  if (!userId) {

    console.log(
      '[RankHub Access] No user: ACCESS DENIED'
    );

    return false;
  }


  // ==========================================================
  // GET SUBSCRIPTION
  // ==========================================================

  const subscription =
    await getUserSubscription(
      userId
    );


  console.log(
    '[RankHub Access] Subscription:',
    subscription
  );


  // ==========================================================
  // PAID SUBSCRIPTION
  // ==========================================================

  if (
    subscription &&
    subscription.isPremium === true &&
    subscription.status === 'active'
  ) {

    console.log(
      '[RankHub Access] PREMIUM ACCESS GRANTED'
    );

    return true;
  }


  // ==========================================================
  // NO PAID SUBSCRIPTION
  // ==========================================================

  console.log(
    '[RankHub Access] ACCESS DENIED'
  );

  return false;
}


// ============================================================
// SIMPLE PREMIUM CHECK
// ============================================================

export async function hasActiveSubscription(
  userId
) {

  if (!userId) {
    return false;
  }

  const subscription =
    await getUserSubscription(
      userId
    );

  return (
    subscription &&
    subscription.isPremium === true &&
    subscription.status === 'active'
  );
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
    throw new Error(
      'Target user ID is required'
    );
  }

  if (!planId) {
    throw new Error(
      'Plan ID is required'
    );
  }


  const now =
    nowISO();


  const subscriptionId =
    'sub_' +
    Date.now() +
    '_' +
    Math.random()
      .toString(36)
      .substring(2, 8);


  const subscriptionData = {

    subscriptionId,

    userId:
      targetUserId,

    planId,

    planName:
      planName ||
      planId,

    name:
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

    status:
      'active',

    source:
      'admin',

    paymentId:
      null,

    adminNote:
      adminNote ||
      'Granted by Admin',

    createdAt:
      now,

    updatedAt:
      now
  };


  try {

    const subscriptionRef =
      doc(
        db,
        'users',
        targetUserId,
        'subscriptions',
        subscriptionId
      );

    await setDoc(
      subscriptionRef,
      subscriptionData
    );


    // Clear cache
    clearSubscriptionCache();


    console.log(
      '[RankHub] Subscription granted:',
      subscriptionData
    );


    return true;

  } catch (error) {

    console.error(
      'adminGrantSubscription error:',
      error
    );

    throw error;
  }
}


// ============================================================
// ADMIN REVOKE
// ============================================================

export async function adminRevokeSubscription(
  targetUserId,
  subscriptionId
) {

  if (!targetUserId) {
    throw new Error(
      'Target user ID is required'
    );
  }

  if (!subscriptionId) {
    throw new Error(
      'Subscription ID is required'
    );
  }


  try {

    const ref =
      doc(
        db,
        'users',
        targetUserId,
        'subscriptions',
        subscriptionId
      );

    await updateDoc(
      ref,
      {
        status: 'expired',
        updatedAt: nowISO(),
        adminNote: 'Revoked by Admin'
      }
    );


    clearSubscriptionCache();


    return true;

  } catch (error) {

    console.error(
      'adminRevokeSubscription error:',
      error
    );

    throw error;
  }
}


// ============================================================
// PAYMENT CHECKOUT PREPARATION
// ============================================================

export function preparePaymentGatewayCheckout(
  plan,
  user
) {

  if (!plan) {
    throw new Error(
      'Plan is required'
    );
  }

  if (!user || !user.uid) {
    throw new Error(
      'User is required'
    );
  }


  return {

    gatewayReady: true,

    orderId:
      'order_' +
      Date.now(),

    amount:
      Number(plan.price || 0) * 100,

    currency:
      'INR',

    notes: {

      planId:
        plan.planId,

      userId:
        user.uid
    }
  };
}


// ============================================================
// RANKHUB PASS MODAL
// ============================================================

export function showRankHubPassModal(
  contentTitle = 'Locked Content'
) {

  let modal =
    document.getElementById(
      'rankhubPassGlobalModal'
    );


  if (!modal) {

    modal =
      document.createElement('div');

    modal.id =
      'rankhubPassGlobalModal';

    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(15,23,42,.65);
      backdrop-filter:blur(6px);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:99999;
      padding:16px;
    `;


    modal.innerHTML = `

      <div style="
        background:#fff;
        width:100%;
        max-width:460px;
        border-radius:20px;
        padding:30px;
        box-shadow:0 25px 50px -12px rgba(0,0,0,.25);
        position:relative;
        text-align:center;
      ">

        <button
          id="closeRankhubModalBtn"
          type="button"
          style="
            position:absolute;
            right:14px;
            top:14px;
            border:0;
            width:32px;
            height:32px;
            border-radius:50%;
            cursor:pointer;
            font-size:20px;
          "
        >
          ×
        </button>


        <div style="
          font-size:42px;
          margin-bottom:10px;
        ">
          🔒
        </div>


        <div style="
          display:inline-block;
          background:#FEF2F2;
          color:#DC2626;
          padding:5px 12px;
          border-radius:999px;
          font-size:12px;
          font-weight:800;
          margin-bottom:10px;
        ">
          RANKHUB PASS PROTECTED
        </div>


        <h3 style="
          margin:8px 0;
          color:#0F172A;
          font-size:22px;
        ">
          Unlock this content
        </h3>


        <p
          id="rankhubModalContentName"
          style="
            color:#64748B;
            font-size:14px;
            margin-bottom:20px;
          "
        >
          Accessing: ${contentTitle}
        </p>


        <div style="
          background:#F8FAFC;
          border:1px solid #E2E8F0;
          border-radius:14px;
          padding:16px;
          text-align:left;
          margin-bottom:20px;
        ">

          <strong>
            RankHub Pass Pro includes:
          </strong>

          <div style="
            margin-top:10px;
            line-height:1.8;
            font-size:14px;
            color:#334155;
          ">
            ✓ Unlimited Mock Tests<br>
            ✓ All Practice Sets<br>
            ✓ All PYQ Papers<br>
            ✓ Study Notes & PDFs<br>
            ✓ Detailed Performance Analysis
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
              display:block;
              text-decoration:none;
              background:#DC2626;
              color:white;
              padding:13px;
              border-radius:10px;
              font-weight:800;
            "
          >
            Get RankHub Pass
          </a>


          <button
            id="continueFreeModalBtn"
            type="button"
            style="
              border:0;
              background:#F1F5F9;
              color:#0F172A;
              padding:13px;
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


    document.body.appendChild(
      modal
    );


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


    modal.onclick =
      event => {

        if (
          event.target === modal
        ) {
          closeModal();
        }

      };

  } else {

    const nameElement =
      modal.querySelector(
        '#rankhubModalContentName'
      );

    if (nameElement) {

      nameElement.textContent =
        `Accessing: ${contentTitle}`;
    }


    modal.style.display =
      'flex';
  }
}


// ============================================================
// CLEAR CACHE
// ============================================================

export function clearSubscriptionCache() {

  cachedSystemSettings = null;

  cachedSubscriptionPlans = null;

  console.log(
    '[RankHub] Subscription cache cleared'
  );
}


// ============================================================
// FORCE REFRESH
// ============================================================

export async function refreshSubscriptionData() {

  clearSubscriptionCache();

  await getSystemSettings(true);

  await getSubscriptionPlans(true);

  return true;
}
