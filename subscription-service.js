// ======================================================
// RANKHUB - SUBSCRIPTION SERVICE
// WEBSITE SIDE
// FINAL UPDATED VERSION
//
// IMPORTANT:
// This file NEVER automatically creates subscription plans.
// Plans must be created/managed from the Admin Panel.
//
// New users do NOT automatically receive:
// - launch_offer
// - 1 Week
// - 6 Months
// - 1 Year
//
// If user has no active subscription:
// => User is treated as FREE
// => No subscription document is created
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
// DEFAULT PLAN DEFINITIONS
//
// IMPORTANT:
// These are ONLY definitions/reference data.
// They are NOT automatically written to Firestore.
//
// DO NOT use these to automatically assign plans
// to users.
// ======================================================

export const DEFAULT_PLANS = [
  {
    planId: 'launch_offer',
    name: 'launch offer',
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


// ======================================================
// CACHE
// ======================================================

let cachedSystemSettings = null;

let cachedSubscriptionPlans = null;


// ======================================================
// ADMIN CHECK
// ======================================================

export async function checkIsAdmin(user) {

  if (!user) {
    return false;
  }


  // ----------------------------------------------------
  // ADMIN EMAIL
  // ----------------------------------------------------

  if (
    user.email &&
    user.email.toLowerCase() ===
      'dk9665676@gmail.com'
  ) {

    return true;
  }


  // ----------------------------------------------------
  // FIRESTORE ADMIN CHECK
  // ----------------------------------------------------

  try {

    const userRef =
      doc(
        db,
        'users',
        user.uid
      );

    const snap =
      await getDoc(userRef);


    if (!snap.exists()) {
      return false;
    }


    const data =
      snap.data();


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

    const ref =
      doc(
        db,
        'settings',
        'system'
      );


    const snap =
      await getDoc(ref);


    if (snap.exists()) {

      cachedSystemSettings =
        snap.data();

      return cachedSystemSettings;
    }


    // --------------------------------------------------
    // IMPORTANT:
    // We can create system settings.
    // This does NOT create a subscription.
    // --------------------------------------------------

    await setDoc(
      ref,
      DEFAULT_SETTINGS,
      {
        merge: true
      }
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

    return {
      ...DEFAULT_SETTINGS
    };
  }
}


// ======================================================
// UPDATE SYSTEM SETTINGS
// ======================================================

export async function updateSystemSettings(
  newSettings
) {

  try {

    const ref =
      doc(
        db,
        'settings',
        'system'
      );


    const data = {

      ...newSettings,

      updatedAt:
        new Date().toISOString()

    };


    await setDoc(
      ref,
      data,
      {
        merge: true
      }
    );


    cachedSystemSettings = {

      ...(cachedSystemSettings ||
        DEFAULT_SETTINGS),

      ...newSettings,

      updatedAt:
        data.updatedAt

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
//
// IMPORTANT:
// This function ONLY READS plans.
//
// It DOES NOT create DEFAULT_PLANS.
// It DOES NOT assign any plan to users.
//
// Admin Panel should create/update plans in:
//
// subscriptionPlans/{planId}
// ======================================================

export async function getSubscriptionPlans() {

  // ----------------------------------------------------
  // CACHE
  // ----------------------------------------------------

  if (
    cachedSubscriptionPlans !== null
  ) {

    return cachedSubscriptionPlans;
  }


  try {

    const ref =
      collection(
        db,
        'subscriptionPlans'
      );


    const snap =
      await getDocs(ref);


    // --------------------------------------------------
    // NO PLANS
    //
    // IMPORTANT:
    // Do NOT create DEFAULT_PLANS here.
    // --------------------------------------------------

    if (snap.empty) {

      console.log(
        'No subscription plans found in Firestore.'
      );


      cachedSubscriptionPlans = [];


      return [];
    }


    // --------------------------------------------------
    // READ FIRESTORE PLANS
    // --------------------------------------------------

    const plans = [];


    snap.forEach(
      (item) => {

        const data =
          item.data();


        plans.push({

          id:
            item.id,

          ...data

        });

      }
    );


    // --------------------------------------------------
    // ONLY ACTIVE PLANS FOR WEBSITE
    // --------------------------------------------------

    const activePlans =
      plans.filter(
        plan =>
          plan.active !== false
      );


    // --------------------------------------------------
    // SORT
    // --------------------------------------------------

    activePlans.sort(
      (a, b) =>
        Number(
          a.sortOrder || 0
        ) -
        Number(
          b.sortOrder || 0
        )
    );


    cachedSubscriptionPlans =
      activePlans;


    return activePlans;

  } catch (error) {

    console.error(
      'Error fetching subscription plans:',
      error
    );


    // IMPORTANT:
    // Never return DEFAULT_PLANS here.
    //
    // Otherwise website could show default plans
    // even when Firestore does not have them.
    // --------------------------------------------------

    cachedSubscriptionPlans =
      [];


    return [];
  }
}


// ======================================================
// CLEAR SUBSCRIPTION PLAN CACHE
//
// Useful after admin changes plans.
// ======================================================

export function clearSubscriptionPlanCache() {

  cachedSubscriptionPlans = null;
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
    await getUserSubscription(
      userId
    );


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


  if (
    activeSub.status !== 'active'
  ) {

    return false;
  }


  const expiry =
    activeSub.expiryDate ||
    activeSub.validUntil;


  if (expiry) {

    const expiryDate =
      convertDateValue(
        expiry
      );


    if (
      expiryDate &&
      expiryDate <= new Date()
    ) {

      return false;
    }
  }


  return (
    activeSub.planId === planId
  );
}


// ======================================================
// GET USER SUBSCRIPTION
//
// IMPORTANT:
// If user has NO subscription:
//
// => Returns FREE OBJECT
// => Does NOT create Firestore document
// => Does NOT assign launch_offer
// => Does NOT assign paid plan
// ======================================================

export async function getUserSubscription(
  userId
) {

  if (!userId) {

    return getFreePlanObject();
  }


  try {

    const ref =
      collection(
        db,
        'users',
        userId,
        'subscriptions'
      );


    const snap =
      await getDocs(ref);


    const now =
      new Date();


    const allSubscriptions = [];


    let activeSubscription =
      null;


    // ==================================================
    // READ ALL SUBSCRIPTIONS
    // ==================================================

    for (
      const item of snap.docs
    ) {

      const data = {

        id:
          item.id,

        ...item.data()

      };


      let status =
        data.status ||
        'inactive';


      const expiryValue =
        data.expiryDate ||
        data.validUntil;


      let expiryDate =
        convertDateValue(
          expiryValue
        );


      // =================================================
      // EXPIRED CHECK
      // =================================================

      if (
        status === 'active' &&
        expiryDate &&
        expiryDate <= now
      ) {

        status =
          'expired';


        // -----------------------------------------------
        // Try to update Firestore.
        // If rules deny update, app still continues.
        // -----------------------------------------------

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

              status:
                'expired',

              isActive:
                false,

              updatedAt:
                new Date().toISOString()

            }
          );

        } catch (error) {

          console.warn(
            'Unable to update expired subscription:',
            error
          );
        }
      }


      data.status =
        status;


      data.isActive =
        status === 'active';


      allSubscriptions.push(
        data
      );


      // =================================================
      // ACTIVE SUBSCRIPTION
      // =================================================

      if (
        status !== 'active'
      ) {

        continue;
      }


      // If expiry exists and already expired
      if (
        expiryDate &&
        expiryDate <= now
      ) {

        continue;
      }


      // -----------------------------------------------
      // FIRST ACTIVE SUBSCRIPTION
      // -----------------------------------------------

      if (
        !activeSubscription
      ) {

        activeSubscription =
          data;

        continue;
      }


      // -----------------------------------------------
      // MULTIPLE ACTIVE SUBSCRIPTIONS
      //
      // Choose subscription with latest expiry.
      // -----------------------------------------------

      const currentExpiry =
        activeSubscription.expiryDate ||
        activeSubscription.validUntil;


      const currentDate =
        convertDateValue(
          currentExpiry
        );


      if (
        expiryDate &&
        (
          !currentDate ||
          expiryDate > currentDate
        )
      ) {

        activeSubscription =
          data;
      }
    }


    // ==================================================
    // ACTIVE SUBSCRIPTION FOUND
    // ==================================================

    if (
      activeSubscription
    ) {

      const expiryValue =
        activeSubscription.expiryDate ||
        activeSubscription.validUntil;


      const expiryDate =
        convertDateValue(
          expiryValue
        );


      let daysRemaining =
        0;


      if (
        expiryDate
      ) {

        const diff =
          expiryDate.getTime() -
          now.getTime();


        daysRemaining =
          Math.max(
            0,
            Math.ceil(
              diff /
              (
                1000 *
                60 *
                60 *
                24
              )
            )
          );
      }


      return {

        ...activeSubscription,

        status:
          'active',

        isPremium:
          true,

        isActive:
          true,

        daysRemaining,

        allSubscriptions

      };
    }


    // ==================================================
    // NO ACTIVE SUBSCRIPTION
    //
    // IMPORTANT:
    // NO FIRESTORE WRITE HERE.
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


    // --------------------------------------------------
    // Error fallback = FREE
    // --------------------------------------------------

    return getFreePlanObject();
  }
}


// ======================================================
// DATE CONVERTER
// ======================================================

function convertDateValue(
  value
) {

  if (!value) {
    return null;
  }


  // Firestore Timestamp
  if (
    typeof value.toDate ===
    'function'
  ) {

    const date =
      value.toDate();


    return isNaN(
      date.getTime()
    )
      ? null
      : date;
  }


  // Firestore timestamp-like object
  if (
    typeof value === 'object' &&
    typeof value.seconds ===
      'number'
  ) {

    const date =
      new Date(
        value.seconds * 1000
      );


    return isNaN(
      date.getTime()
    )
      ? null
      : date;
  }


  // Date object
  if (
    value instanceof Date
  ) {

    return isNaN(
      value.getTime()
    )
      ? null
      : value;
  }


  // String / number
  const date =
    new Date(value);


  return isNaN(
    date.getTime()
  )
    ? null
    : date;
}


// ======================================================
// FREE PLAN OBJECT
//
// IMPORTANT:
// This is ONLY an in-memory object.
//
// It is NOT written to Firestore.
// ======================================================

function getFreePlanObject() {

  return {

    planId:
      'free',

    planName:
      'Free',

    name:
      'Free',

    price:
      0,

    durationDays:
      0,

    status:
      'inactive',

    isActive:
      false,

    isPremium:
      false,

    startDate:
      null,

    expiryDate:
      null,

    validFrom:
      null,

    validUntil:
      null,

    daysRemaining:
      0,

    source:
      'system',

    allSubscriptions:
      []

  };
}


// ======================================================
// ADMIN GRANT SUBSCRIPTION
//
// This function intentionally creates a REAL subscription.
// It should only be called by Admin Panel logic.
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

  if (!targetUserId) {
    throw new Error(
      'Target user ID is required.'
    );
  }


  if (!planId) {
    throw new Error(
      'Plan ID is required.'
    );
  }


  try {

    const subId =
      'sub_' +
      Date.now();


    const now =
      new Date().toISOString();


    const subData = {

      subscriptionId:
        subId,

      userId:
        targetUserId,

      planId:
        planId,

      planName:
        planName || planId,

      price:
        Number(price || 0),

      durationDays:
        Number(durationDays || 0),

      startDate:
        startDateStr,

      expiryDate:
        expiryDateStr,

      validFromIso:
        startDateStr,

      validUntil:
        expiryDateStr,

      status:
        'active',

      isActive:
        true,

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
// ADMIN REVOKE SUBSCRIPTION
// ======================================================

export async function adminRevokeSubscription(
  targetUserId,
  subscriptionId
) {

  if (!targetUserId) {

    throw new Error(
      'Target user ID is required.'
    );
  }


  if (!subscriptionId) {

    throw new Error(
      'Subscription ID is required.'
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

        status:
          'expired',

        isActive:
          false,

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

  if (!plan) {

    throw new Error(
      'Subscription plan is required.'
    );
  }


  return {

    gatewayReady:
      true,

    orderId:
      'order_' +
      Date.now(),

    amount:
      Number(plan.price || 0) *
      100,

    currency:
      'INR',

    notes: {

      planId:
        plan.planId ||
        plan.id ||
        '',

      userId:
        user?.uid ||
        ''

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

  // ----------------------------------------------------
  // First item remains free.
  // ----------------------------------------------------

  if (
    itemIndex === 0
  ) {

    return true;
  }


  let userId =
    null;


  // ----------------------------------------------------
  // USER ID STRING
  // ----------------------------------------------------

  if (
    typeof userOrUserId ===
    'string'
  ) {

    userId =
      userOrUserId;
  }


  // ----------------------------------------------------
  // USER OBJECT
  // ----------------------------------------------------

  else if (
    userOrUserId?.uid
  ) {

    userId =
      userOrUserId.uid;
  }


  // ----------------------------------------------------
  // FIREBASE CURRENT USER
  // ----------------------------------------------------

  else if (
    auth.currentUser
  ) {

    userId =
      auth.currentUser.uid;
  }


  // ----------------------------------------------------
  // LOCAL STORAGE FALLBACK
  // ----------------------------------------------------

  else {

    try {

      const saved =
        localStorage.getItem(
          'rankhub_user'
        );


      if (saved) {

        const user =
          JSON.parse(saved);


        userId =
          user?.uid ||
          null;
      }

    } catch (error) {

      console.warn(
        'Unable to read saved user:',
        error
      );
    }
  }


  // ----------------------------------------------------
  // NO USER
  // ----------------------------------------------------

  if (!userId) {

    return false;
  }


  // ----------------------------------------------------
  // GET REAL SUBSCRIPTION
  // ----------------------------------------------------

  const subscription =
    await getUserSubscription(
      userId
    );


  // ----------------------------------------------------
  // PREMIUM ACCESS ONLY FOR REAL ACTIVE SUB
  // ----------------------------------------------------

  return (

    subscription?.status ===
      'active' &&

    subscription?.isPremium ===
      true

  );
}


// ======================================================
// GLOBAL PASS MODAL
// ======================================================

export function showRankHubPassModal(
  contentTitle =
    'Locked Content'
) {

  let modal =
    document.getElementById(
      'rankhubPassGlobalModal'
    );


  // ====================================================
  // CREATE MODAL
  // ====================================================

  if (!modal) {

    modal =
      document.createElement(
        'div'
      );


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


    document.body.appendChild(
      modal
    );


    // ==================================================
    // CLOSE BUTTON
    // ==================================================

    const closeModal =
      () => {

        modal.style.display =
          'none';

      };


    const closeButton =
      modal.querySelector(
        '#closeRankhubModalBtn'
      );


    if (closeButton) {

      closeButton.onclick =
        closeModal;
    }


    // ==================================================
    // OUTSIDE CLICK
    // ==================================================

    modal.onclick =
      (event) => {

        if (
          event.target ===
          modal
        ) {

          closeModal();
        }

      };

  }


  // ====================================================
  // UPDATE CONTENT TITLE
  // ====================================================

  else {

    const name =
      modal.querySelector(
        '#rankhubModalContentName'
      );


    if (name) {

      name.textContent =
        `Accessing: ${contentTitle}`;
    }


    modal.style.display =
      'flex';
  }
}
