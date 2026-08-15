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
  // false = subscription protection OFF
  // true  = subscription protection ON
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
// BASIC HELPERS
// ============================================================

function nowISO() {
  return new Date().toISOString();
}


/**
 * Converts Firestore Timestamp / Date / ISO string /
 * milliseconds / seconds into a normal JS Date.
 */
function toJSDate(value) {
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
      console.warn('Timestamp conversion failed:', error);
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
    // 10 digit timestamp = seconds
    if (value < 100000000000) {
      const date = new Date(value * 1000);

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

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

    // Numeric string
    if (/^\d+$/.test(trimmed)) {
      const numberValue = Number(trimmed);

      if (numberValue < 100000000000) {
        const date = new Date(numberValue * 1000);

        return Number.isNaN(date.getTime())
          ? null
          : date;
      }

      const date = new Date(numberValue);

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    const date = new Date(trimmed);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  return null;
}


// ============================================================
// EXPIRY HELPERS
// ============================================================

function getExpiryValue(subscription) {
  if (!subscription) {
    return null;
  }

  return (
    subscription.expiryDate ??
    subscription.validUntil ??
    subscription.endDate ??
    subscription.expiresAt ??
    null
  );
}


function getStartValue(subscription) {
  if (!subscription) {
    return null;
  }

  return (
    subscription.startDate ??
    subscription.validFrom ??
    subscription.createdAt ??
    null
  );
}


function isSubscriptionExpired(subscription) {
  const expiryValue =
    getExpiryValue(subscription);

  // No expiry = valid indefinitely
  if (!expiryValue) {
    return false;
  }

  const expiryDate =
    toJSDate(expiryValue);

  // Invalid expiry should NOT silently
  // destroy a paid subscription.
  //
  // We keep it active when the date cannot
  // be parsed. This avoids blocking users
  // because of a format mismatch.
  if (!expiryDate) {
    console.warn(
      'Invalid subscription expiry date:',
      expiryValue
    );

    return false;
  }

  return expiryDate.getTime() <= Date.now();
}


function calculateDaysRemaining(subscription) {
  const expiryValue =
    getExpiryValue(subscription);

  // No expiry = effectively unlimited
  if (!expiryValue) {
    return 99999;
  }

  const expiryDate =
    toJSDate(expiryValue);

  if (!expiryDate) {
    return 99999;
  }

  const difference =
    expiryDate.getTime() - Date.now();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(
    difference /
    (1000 * 60 * 60 * 24)
  );
}


// ============================================================
// STATUS HELPERS
// ============================================================

function normalizeStatus(status) {
  if (!status) {
    return '';
  }

  return String(status)
    .trim()
    .toLowerCase();
}


function isActiveStatus(status) {
  const normalized =
    normalizeStatus(status);

  return (
    normalized === 'active' ||
    normalized === 'activated' ||
    normalized === 'paid' ||
    normalized === 'success' ||
    normalized === 'successful'
  );
}


function isPaidPlan(subscription) {
  if (!subscription) {
    return false;
  }

  const planId =
    String(
      subscription.planId ||
      subscription.plan ||
      ''
    )
      .trim()
      .toLowerCase();

  return (
    planId !== '' &&
    planId !== 'free'
  );
}


// ============================================================
// FREE PLAN OBJECT
// ============================================================

function getFreePlanObject(
  allSubscriptions = []
) {
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

  // Existing admin email
  if (
    user.email === 'dk9665676@gmail.com'
  ) {
    return true;
  }

  try {
    const userRef =
      doc(db, 'users', user.uid);

    const snapshot =
      await getDoc(userRef);

    if (!snapshot.exists()) {
      return false;
    }

    const data =
      snapshot.data();

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
    const settingsRef =
      doc(db, 'settings', 'system');

    const snapshot =
      await getDoc(settingsRef);

    if (snapshot.exists()) {
      cachedSystemSettings = {
        ...DEFAULT_SETTINGS,
        ...snapshot.data()
      };

      return cachedSystemSettings;
    }

    // Create default settings
    await setDoc(
      settingsRef,
      DEFAULT_SETTINGS
    );

    cachedSystemSettings = {
      ...DEFAULT_SETTINGS
    };

    return cachedSystemSettings;

  } catch (error) {
    console.error(
      'getSystemSettings failed:',
      error
    );

    // IMPORTANT:
    // Default is FREE LAUNCH MODE.
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
    const settingsRef =
      doc(db, 'settings', 'system');

    const updated = {
      ...newSettings,
      updatedAt: nowISO()
    };

    await setDoc(
      settingsRef,
      updated,
      {
        merge: true
      }
    );

    cachedSystemSettings = {
      ...(cachedSystemSettings ||
        DEFAULT_SETTINGS),

      ...updated
    };

    return true;

  } catch (error) {
    console.error(
      'updateSystemSettings failed:',
      error
    );

    throw error;
  }
}


// ============================================================
// SUBSCRIPTION PLANS
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
    const plansRef =
      collection(db, 'subscriptionPlans');

    const snapshot =
      await getDocs(plansRef);

    // Seed plans when collection is empty
    if (snapshot.empty) {
      const timestamp =
        nowISO();

      for (
        const plan of DEFAULT_PLANS
      ) {
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

    snapshot.forEach(
      (docSnapshot) => {
        plans.push({
          id: docSnapshot.id,
          ...docSnapshot.data()
        });
      }
    );

    cachedSubscriptionPlans =
      plans.sort(
        (a, b) =>
          (Number(a.sortOrder) || 0) -
          (Number(b.sortOrder) || 0)
      );

    return cachedSubscriptionPlans;

  } catch (error) {
    console.error(
      'getSubscriptionPlans failed:',
      error
    );

    return [
      ...DEFAULT_PLANS
    ];
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

    const snapshot =
      await getDocs(
        subscriptionsRef
      );

    const allSubscriptions = [];

    const activePaidSubscriptions = [];

    for (
      const docSnapshot of snapshot.docs
    ) {
      const rawData =
        docSnapshot.data();

      const subscription = {
        id: docSnapshot.id,
        ...rawData
      };

      const normalizedPlanId =
        String(
          subscription.planId ||
          subscription.plan ||
          ''
        )
          .trim()
          .toLowerCase();

      // Make sure planId is always available
      if (
        !subscription.planId &&
        normalizedPlanId
      ) {
        subscription.planId =
          normalizedPlanId;
      }

      const status =
        normalizeStatus(
          subscription.status
        );

      // --------------------------------------------------------
      // EXPIRED
      // --------------------------------------------------------

      if (
        isActiveStatus(status) &&
        isSubscriptionExpired(
          subscription
        )
      ) {
        subscription.status =
          'expired';

        subscription.isPremium =
          false;

        allSubscriptions.push(
          subscription
        );

        // Update Firestore
        try {
          await updateDoc(
            doc(
              db,
              'users',
              userId,
              'subscriptions',
              docSnapshot.id
            ),
            {
              status: 'expired',
              updatedAt: nowISO()
            }
          );
        } catch (updateError) {
          console.warn(
            'Could not update expired subscription:',
            updateError
          );
        }

        continue;
      }


      // --------------------------------------------------------
      // FREE PLAN
      // --------------------------------------------------------

      if (
        normalizedPlanId === 'free'
      ) {
        allSubscriptions.push({
          ...subscription,

          planId: 'free',

          planName:
            subscription.planName ||
            subscription.name ||
            'Free',

          isPremium: false
        });

        continue;
      }


      // --------------------------------------------------------
      // ACTIVE PAID PLAN
      // --------------------------------------------------------

      if (
        isActiveStatus(status) &&
        isPaidPlan(subscription)
      ) {
        const paidSubscription = {
          ...subscription,

          status: 'active',

          isPremium: true,

          planId:
            subscription.planId ||
            subscription.plan,

          planName:
            subscription.planName ||
            subscription.name ||
            subscription.planId ||
            subscription.plan,

          daysRemaining:
            calculateDaysRemaining(
              subscription
            )
        };

        allSubscriptions.push(
          paidSubscription
        );

        activePaidSubscriptions.push(
          paidSubscription
        );

        continue;
      }


      // --------------------------------------------------------
      // OTHER / INACTIVE SUBSCRIPTION
      // --------------------------------------------------------

      allSubscriptions.push({
        ...subscription,

        isPremium: false
      });
    }


    // ==========================================================
    // SELECT BEST ACTIVE PAID SUBSCRIPTION
    // ==========================================================

    if (
      activePaidSubscriptions.length > 0
    ) {
      activePaidSubscriptions.sort(
        (a, b) => {

          const aExpiry =
            toJSDate(
              getExpiryValue(a)
            );

          const bExpiry =
            toJSDate(
              getExpiryValue(b)
            );

          // Unlimited/no expiry comes first
          if (
            !aExpiry &&
            bExpiry
          ) {
            return -1;
          }

          if (
            aExpiry &&
            !bExpiry
          ) {
            return 1;
          }

          if (
            !aExpiry &&
            !bExpiry
          ) {
            return 0;
          }

          return (
            bExpiry.getTime() -
            aExpiry.getTime()
          );
        }
      );

      const activeSubscription =
        activePaidSubscriptions[0];

      return {
        ...activeSubscription,

        status: 'active',

        isPremium: true,

        daysRemaining:
          calculateDaysRemaining(
            activeSubscription
          ),

        allSubscriptions
      };
    }


    // ==========================================================
    // NO PAID SUBSCRIPTION
    // ==========================================================

    return getFreePlanObject(
      allSubscriptions
    );

  } catch (error) {
    console.error(
      'getUserSubscription failed:',
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

  try {
    const subscription =
      await getUserSubscription(
        userId
      );

    if (
      subscription &&
      subscription.status === 'active' &&
      subscription.isPremium === true &&
      subscription.planId !== 'free'
    ) {
      return subscription;
    }

    return null;

  } catch (error) {
    console.error(
      'getActiveSubscription failed:',
      error
    );

    return null;
  }
}


// ============================================================
// CHECK PLAN
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
    activeSub.isPremium !== true
  ) {
    return false;
  }

  if (
    activeSub.planId !== planId
  ) {
    return false;
  }

  if (
    isSubscriptionExpired(
      activeSub
    )
  ) {
    return false;
  }

  return true;
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

  try {
    const subscriptionId =
      'sub_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .substring(2, 8);

    const timestamp =
      nowISO();

    const subscriptionData = {
      subscriptionId,

      userId:
        targetUserId,

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
        timestamp,

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
        timestamp,

      updatedAt:
        timestamp
    };

    await setDoc(
      doc(
        db,
        'users',
        targetUserId,
        'subscriptions',
        subscriptionId
      ),
      subscriptionData
    );

    return true;

  } catch (error) {
    console.error(
      'adminGrantSubscription failed:',
      error
    );

    throw error;
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
    await updateDoc(
      doc(
        db,
        'users',
        targetUserId,
        'subscriptions',
        subscriptionId
      ),
      {
        status: 'expired',

        updatedAt:
          nowISO(),

        adminNote:
          'Revoked by Admin'
      }
    );

    return true;

  } catch (error) {
    console.error(
      'adminRevokeSubscription failed:',
      error
    );

    throw error;
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
    throw new Error(
      'Plan is required'
    );
  }

  if (!user) {
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
// RESOLVE USER ID
// ============================================================

function resolveUserId(
  userOrUserId
) {
  // Direct UID
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

  // Local saved user
  try {
    const saved =
      localStorage.getItem(
        'rankhub_user'
      );

    if (saved) {
      const user =
        JSON.parse(saved);

      if (user?.uid) {
        return user.uid;
      }
    }
  } catch (error) {
    console.warn(
      'Could not resolve local user:',
      error
    );
  }

  return null;
}


// ============================================================
// CENTRAL CONTENT ACCESS CHECK
// ============================================================

export async function canAccessContent(
  userOrUserId,
  contentType = '',
  itemIndex = 0
) {
  try {

    // --------------------------------------------------------
    // FIRST ITEM ALWAYS FREE
    // --------------------------------------------------------

    if (
      Number(itemIndex) === 0
    ) {
      return true;
    }


    // --------------------------------------------------------
    // GET SYSTEM SETTINGS FIRST
    // --------------------------------------------------------

    const settings =
      await getSystemSettings();


    // --------------------------------------------------------
    // FREE LAUNCH MODE
    // --------------------------------------------------------

    if (
      settings.subscriptionSystemEnabled !== true
    ) {
      return true;
    }


    // --------------------------------------------------------
    // SUBSCRIPTION SYSTEM ON
    // --------------------------------------------------------

    const userId =
      resolveUserId(
        userOrUserId
      );

    if (!userId) {
      return false;
    }


    // --------------------------------------------------------
    // CHECK SUBSCRIPTION
    // --------------------------------------------------------

    const subscription =
      await getUserSubscription(
        userId
      );


    if (
      subscription &&
      subscription.status === 'active' &&
      subscription.isPremium === true &&
      subscription.planId !== 'free'
    ) {
      return true;
    }


    return false;

  } catch (error) {
    console.error(
      'canAccessContent failed:',
      error
    );

    // If subscription system cannot be read,
    // use FREE LAUNCH MODE as fallback.
    try {
      const settings =
        await getSystemSettings(
          true
        );

      if (
        settings.subscriptionSystemEnabled !== true
      ) {
        return true;
      }
    } catch (settingsError) {
      console.error(
        'Could not read subscription settings:',
        settingsError
      );
    }

    return false;
  }
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
      document.createElement(
        'div'
      );

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
          margin:0 0 6px;
        ">
          Unlock this content with RankHub Pass
        </h3>

        <p
          id="rankhubModalContentName"
          style="
            font-size:0.875rem;
            color:#64748B;
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
            gap:8px;
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

    document.body.appendChild(
      modal
    );


    const closeModal =
      () => {
        modal.style.display =
          'none';
      };


    const closeButton =
      modal.querySelector(
        '#closeRankhubModalBtn'
      );

    const continueButton =
      modal.querySelector(
        '#continueFreeModalBtn'
      );


    if (closeButton) {
      closeButton.onclick =
        closeModal;
    }


    if (continueButton) {
      continueButton.onclick =
        closeModal;
    }


    modal.onclick =
      (event) => {
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
// DEBUG SUBSCRIPTION
// ============================================================

export async function debugCurrentSubscription(
  userId = null
) {
  const uid =
    userId ||
    auth?.currentUser?.uid ||
    resolveUserId(null);

  if (!uid) {
    console.log(
      '[RankHub] No logged-in user.'
    );

    return null;
  }

  const settings =
    await getSystemSettings(
      true
    );

  const subscription =
    await getUserSubscription(
      uid
    );

  console.log(
    '[RankHub] Subscription Debug',
    {
      userId: uid,

      subscriptionSystemEnabled:
        settings.subscriptionSystemEnabled,

      subscription,

      allSubscriptions:
        subscription?.allSubscriptions || []
    }
  );

  return {
    userId: uid,

    settings,

    subscription
  };
}


// ============================================================
// CLEAR CACHE
// ============================================================

export function clearSubscriptionCache() {
  cachedSystemSettings = null;
  cachedSubscriptionPlans = null;
}


// ============================================================
// FORCE REFRESH
// ============================================================

export async function refreshSubscriptionState(
  userId = null
) {
  clearSubscriptionCache();

  const uid =
    userId ||
    auth?.currentUser?.uid ||
    resolveUserId(null);

  if (!uid) {
    return getFreePlanObject();
  }

  return await getUserSubscription(
    uid
  );
}
