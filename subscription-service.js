// ======================================================
// RANKHUB - SUBSCRIPTION SERVICE
// FINAL FIXED VERSION
// ======================================================

import { db, auth } from './firebase.js';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs
} from 'firebase/firestore';


// ======================================================
// DEFAULT SYSTEM SETTINGS
// ======================================================

const DEFAULT_SETTINGS = {
  subscriptionSystemEnabled: false,
  updatedAt: new Date().toISOString()
};


// ======================================================
// DEFAULT PLANS
// ======================================================

export const DEFAULT_PLANS = [
  {
    planId: 'free',
    name: 'Free',
    price: 0,
    durationDays: 7,
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


let cachedSystemSettings = null;
let cachedSubscriptionPlans = null;


// ======================================================
// ADMIN CHECK
// ======================================================

export async function checkIsAdmin(user) {

  if (!user) return false;

  if (user.email === 'dk9665676@gmail.com') {
    return true;
  }

  try {

    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

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
      'Error checking admin status:',
      error
    );

    return false;
  }
}


// ======================================================
// SYSTEM SETTINGS
// ======================================================

export async function getSystemSettings() {

  if (cachedSystemSettings) {
    return cachedSystemSettings;
  }

  try {

    const ref = doc(
      db,
      'settings',
      'system'
    );

    const snap = await getDoc(ref);

    if (snap.exists()) {

      cachedSystemSettings = snap.data();

      return cachedSystemSettings;
    }

    await setDoc(
      ref,
      DEFAULT_SETTINGS,
      { merge: true }
    );

    cachedSystemSettings = {
      ...DEFAULT_SETTINGS
    };

    return cachedSystemSettings;

  } catch (error) {

    console.error(
      'Error getting system settings:',
      error
    );

    return DEFAULT_SETTINGS;
  }
}


// ======================================================
// UPDATE SYSTEM SETTINGS
// ======================================================

export async function updateSystemSettings(
  newSettings
) {

  try {

    const ref = doc(
      db,
      'settings',
      'system'
    );

    const data = {
      ...newSettings,
      updatedAt: new Date().toISOString()
    };

    await setDoc(
      ref,
      data,
      { merge: true }
    );

    cachedSystemSettings = {
      ...(cachedSystemSettings || DEFAULT_SETTINGS),
      ...newSettings
    };

    return true;

  } catch (error) {

    console.error(
      'Error updating system settings:',
      error
    );

    throw error;
  }
}


// ======================================================
// GET SUBSCRIPTION PLANS
// ======================================================

export async function getSubscriptionPlans() {

  if (cachedSubscriptionPlans) {
    return cachedSubscriptionPlans;
  }

  try {

    const ref = collection(
      db,
      'subscriptionPlans'
    );

    const snap = await getDocs(ref);

    if (snap.empty) {

      for (const plan of DEFAULT_PLANS) {

        await setDoc(
          doc(
            db,
            'subscriptionPlans',
            plan.planId
          ),
          {
            ...plan,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        );
      }

      cachedSubscriptionPlans = [
        ...DEFAULT_PLANS
      ];

      return cachedSubscriptionPlans;
    }

    const plans = [];

    snap.forEach((item) => {

      plans.push({
        id: item.id,
        ...item.data()
      });

    });

    plans.sort(
      (a, b) =>
        (a.sortOrder || 0) -
        (b.sortOrder || 0)
    );

    cachedSubscriptionPlans = plans;

    return plans;

  } catch (error) {

    console.error(
      'Error fetching subscription plans:',
      error
    );

    return DEFAULT_PLANS;
  }
}


// ======================================================
// ACTIVE SUBSCRIPTION
// ======================================================

export async function getActiveSubscription(
  userId
) {

  if (!userId) {
    return null;
  }

  const subscription =
    await getUserSubscription(userId);

  if (
    subscription &&
    subscription.status === 'active'
  ) {

    return subscription;
  }

  return null;
}


// ======================================================
// PLAN ACTIVE CHECK
// ======================================================

export function isPlanActive(
  activeSub,
  planId
) {

  if (!activeSub) {
    return false;
  }

  if (activeSub.status !== 'active') {
    return false;
  }

  const expiry =
    activeSub.expiryDate ||
    activeSub.validUntil;

  if (expiry) {

    const expiryDate =
      expiry?.toDate
        ? expiry.toDate()
        : new Date(expiry);

    if (
      !isNaN(expiryDate.getTime()) &&
      expiryDate <= new Date()
    ) {
      return false;
    }
  }

  return activeSub.planId === planId;
}


// ======================================================
// GET USER SUBSCRIPTION
// ======================================================

export async function getUserSubscription(
  userId
) {

  if (!userId) {

    return getFreePlanObject();
  }

  try {

    const ref = collection(
      db,
      'users',
      userId,
      'subscriptions'
    );

    const snap = await getDocs(ref);

    const now = new Date();

    const allSubscriptions = [];

    let activeSubscription = null;

    // --------------------------------------------------
    // READ ALL SUBSCRIPTIONS
    // --------------------------------------------------

    for (const item of snap.docs) {

      const data = {
        id: item.id,
        ...item.data()
      };

      let status = data.status || 'inactive';

      const expiryValue =
        data.expiryDate ||
        data.validUntil;

      let expiryDate = null;

      if (expiryValue) {

        expiryDate =
          expiryValue?.toDate
            ? expiryValue.toDate()
            : new Date(expiryValue);

        if (isNaN(expiryDate.getTime())) {
          expiryDate = null;
        }
      }

      // ------------------------------------------------
      // EXPIRED CHECK
      // ------------------------------------------------

      if (
        status === 'active' &&
        expiryDate &&
        expiryDate <= now
      ) {

        status = 'expired';

        try {

          await updateDoc(
            doc(
              db,
              'users',
              userId,
              'subscriptions',
              item.id
            ),
            {
              status: 'expired',
              updatedAt: new Date().toISOString()
            }
          );

        } catch (error) {

          console.warn(
            'Unable to update expired subscription:',
            error
          );
        }
      }

      data.status = status;

      allSubscriptions.push(data);

      // ------------------------------------------------
      // ACTIVE SUBSCRIPTION
      // ------------------------------------------------

      if (status === 'active') {

        if (
          !expiryDate ||
          expiryDate > now
        ) {

          if (!activeSubscription) {

            activeSubscription = data;

          } else {

            const currentExpiry =
              activeSubscription.expiryDate ||
              activeSubscription.validUntil;

            const currentDate =
              currentExpiry
                ? new Date(currentExpiry)
                : null;

            if (
              expiryDate &&
              (!currentDate ||
                expiryDate > currentDate)
            ) {

              activeSubscription = data;
            }
          }
        }
      }
    }


    // ==================================================
    // ACTIVE SUBSCRIPTION FOUND
    // ==================================================

    if (activeSubscription) {

      const expiryValue =
        activeSubscription.expiryDate ||
        activeSubscription.validUntil;

      let expiryDate = null;

      if (expiryValue) {

        expiryDate =
          expiryValue?.toDate
            ? expiryValue.toDate()
            : new Date(expiryValue);

        if (isNaN(expiryDate.getTime())) {
          expiryDate = null;
        }
      }

      let daysRemaining = 0;

      if (expiryDate) {

        const diff =
          expiryDate.getTime() -
          now.getTime();

        daysRemaining =
          Math.max(
            0,
            Math.ceil(
              diff /
              (1000 * 60 * 60 * 24)
            )
          );
      }

      return {

        ...activeSubscription,

        status: 'active',

        isPremium: true,

        isActive: true,

        daysRemaining,

        allSubscriptions
      };
    }


    // ==================================================
    // NO ACTIVE SUBSCRIPTION
    // ==================================================

    return {
      ...getFreePlanObject(),
      allSubscriptions
    };


  } catch (error) {

    console.error(
      'Error getting user subscription:',
      error
    );

    return getFreePlanObject();
  }
}


// ======================================================
// FREE PLAN OBJECT
// ======================================================

function getFreePlanObject() {

  return {

    planId: 'free',

    planName: 'Free',

    name: 'Free',

    price: 0,

    durationDays: 7,

    status: 'inactive',

    isActive: false,

    isPremium: false,

    startDate: null,

    expiryDate: null,

    validFrom: null,

    validUntil: null,

    daysRemaining: 0,

    source: 'system',

    allSubscriptions: []
  };
}


// ======================================================
// ADMIN GRANT
// ======================================================

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

  try {

    const subId =
      'sub_' + Date.now();

    const subData = {

      subscriptionId: subId,

      userId: targetUserId,

      planId,

      planName:
        planName || planId,

      price: Number(price),

      durationDays:
        Number(durationDays),

      startDate:
        startDateStr,

      expiryDate:
        expiryDateStr,

      validFromIso:
        startDateStr,

      validUntil:
        expiryDateStr,

      status: 'active',

      isActive: true,

      source: 'admin',

      paymentId: null,

      adminNote:
        adminNote || 'Granted by Admin',

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    };

    await setDoc(
      doc(
        db,
        'users',
        targetUserId,
        'subscriptions',
        subId
      ),
      subData
    );

    return true;

  } catch (error) {

    console.error(
      'Error granting subscription:',
      error
    );

    throw error;
  }
}


// ======================================================
// ADMIN REVOKE
// ======================================================

export async function adminRevokeSubscription(
  targetUserId,
  subscriptionId
) {

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
        isActive: false,
        updatedAt:
          new Date().toISOString(),
        adminNote:
          'Revoked by Admin'
      }
    );

    return true;

  } catch (error) {

    console.error(
      'Error revoking subscription:',
      error
    );

    throw error;
  }
}


// ======================================================
// PAYMENT PREPARATION
// ======================================================

export function preparePaymentGatewayCheckout(
  plan,
  user
) {

  return {

    gatewayReady: true,

    orderId:
      'order_' + Date.now(),

    amount:
      Number(plan.price) * 100,

    currency: 'INR',

    notes: {

      planId:
        plan.planId,

      userId:
        user?.uid || ''
    }
  };
}


// ======================================================
// CONTENT ACCESS
// ======================================================

export async function canAccessContent(
  userOrUserId,
  contentType,
  itemIndex
) {

  // First item is always free
  if (itemIndex === 0) {
    return true;
  }

  let userId = null;

  if (
    typeof userOrUserId === 'string'
  ) {

    userId = userOrUserId;

  } else if (
    userOrUserId?.uid
  ) {

    userId =
      userOrUserId.uid;

  } else if (
    auth.currentUser
  ) {

    userId =
      auth.currentUser.uid;

  } else {

    try {

      const saved =
        localStorage.getItem(
          'rankhub_user'
        );

      if (saved) {

        const user =
          JSON.parse(saved);

        userId =
          user?.uid || null;
      }

    } catch (error) {}
  }


  if (!userId) {
    return false;
  }


  const subscription =
    await getUserSubscription(
      userId
    );


  return (
    subscription?.status === 'active' &&
    subscription?.isPremium === true
  );
}


// ======================================================
// GLOBAL PASS MODAL
// ======================================================

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

    modal.style.cssText =
      `
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
        box-shadow:0 25px 50px -12px rgba(0,0,0,.25);
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
          "
        >
          ×
        </button>

        <h3 style="
          font-size:1.375rem;
          font-weight:800;
          color:#0F172A;
          margin-bottom:6px;
        ">
          Unlock this content with RankHub Pass
        </h3>

        <p
          id="rankhubModalContentName"
          style="
            font-size:.875rem;
            color:#64748B;
            margin-bottom:20px;
          "
        >
          Accessing: ${contentTitle}
        </p>

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
          "
        >
          Get RankHub Pass
        </a>

      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      modal.style.display = 'none';
    };

    modal.querySelector(
      '#closeRankhubModalBtn'
    ).onclick = closeModal;

    modal.onclick = (event) => {

      if (event.target === modal) {
        closeModal();
      }

    };

  } else {

    const name =
      modal.querySelector(
        '#rankhubModalContentName'
      );

    if (name) {

      name.textContent =
        `Accessing: ${contentTitle}`;
    }

    modal.style.display = 'flex';
  }
}
