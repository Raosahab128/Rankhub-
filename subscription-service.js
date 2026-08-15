// ============================================================
// RANKHUB - SUBSCRIPTION SERVICE
// subscription-service.js
// FINAL UPDATED VERSION
// ADMIN + USER WEBSITE USE SAME COLLECTION:
// subscriptionPlans
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
// CACHE
// ============================================================

let cachedSystemSettings = null;
let cachedSubscriptionPlans = null;


// ============================================================
// HELPERS
// ============================================================

function nowISOString() {
  return new Date().toISOString();
}


// ============================================================
// CURRENT USER ID
// ============================================================

function getCurrentUserId() {

  if (auth?.currentUser?.uid) {
    return auth.currentUser.uid;
  }

  try {

    const saved =
      localStorage.getItem('rankhub_user');

    if (!saved) {
      return null;
    }

    const user =
      JSON.parse(saved);

    return user?.uid || null;

  } catch (error) {

    console.warn(
      'Unable to read rankhub_user:',
      error
    );

    return null;
  }
}


// ============================================================
// DATE HELPERS
// ============================================================

function convertDate(value) {

  if (!value) {
    return null;
  }

  if (
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === 'object' &&
    typeof value.seconds === 'number'
  ) {

    return new Date(
      value.seconds * 1000
    );
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return null;
  }

  return date;
}


function isDateValidAndFuture(value) {

  if (!value) {
    return true;
  }

  const date =
    convertDate(value);

  if (!date) {
    return false;
  }

  return date.getTime() > Date.now();
}


function calculateDaysRemaining(value) {

  if (!value) {
    return 99999;
  }

  const expiry =
    convertDate(value);

  if (!expiry) {
    return 0;
  }

  const difference =
    expiry.getTime() -
    Date.now();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(
    difference /
    (1000 * 60 * 60 * 24)
  );
}


// ============================================================
// DURATION HELPERS
// ============================================================

function calculateDurationDays(
  duration,
  durationUnit
) {

  const value =
    Number(duration) || 1;

  const unit =
    String(
      durationUnit || 'month'
    ).toLowerCase();

  switch (unit) {

    case 'day':
    case 'days':
      return value;

    case 'week':
    case 'weeks':
      return value * 7;

    case 'month':
    case 'months':
      return value * 30;

    case 'year':
    case 'years':
      return value * 365;

    default:
      return value;
  }
}


// ============================================================
// GET DURATION UNIT
// ============================================================

function getDurationUnit(
  durationDays
) {

  const days =
    Number(durationDays) || 0;

  if (days === 1) {
    return 'day';
  }

  if (
    days > 0 &&
    days % 365 === 0
  ) {
    return 'year';
  }

  if (
    days > 0 &&
    days % 30 === 0
  ) {
    return 'month';
  }

  if (
    days > 0 &&
    days % 7 === 0
  ) {
    return 'week';
  }

  return 'day';
}


// ============================================================
// FREE PLAN
// ============================================================

function getFreePlanObject(
  allSubscriptions = []
) {

  return {

    id: null,

    planId: 'free',

    planName: 'Free',

    name: 'Free',

    price: 0,

    currency: 'INR',

    duration: 99999,

    durationUnit: 'year',

    durationDays: 99999,

    status: 'active',

    startDate: null,

    expiryDate: null,

    validUntil: null,

    daysRemaining: 99999,

    isPremium: false,

    source: 'system',

    allSubscriptions

  };
}


// ============================================================
// CHECK ADMIN
// ============================================================

export async function checkIsAdmin(user) {

  if (!user) {
    return false;
  }

  if (
    user.email ===
    'dk9665676@gmail.com'
  ) {

    return true;
  }

  try {

    const userRef =
      doc(
        db,
        'users',
        user.uid
      );

    const userSnap =
      await getDoc(userRef);

    if (!userSnap.exists()) {
      return false;
    }

    const data =
      userSnap.data();

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
// GET SYSTEM SETTINGS
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
      doc(
        db,
        'settings',
        'system'
      );

    const snap =
      await getDoc(
        settingsRef
      );

    if (snap.exists()) {

      cachedSystemSettings = {
        ...DEFAULT_SETTINGS,
        ...snap.data()
      };

      return cachedSystemSettings;
    }

    await setDoc(
      settingsRef,
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
      doc(
        db,
        'settings',
        'system'
      );

    const updatedData = {

      ...newSettings,

      updatedAt:
        nowISOString()

    };

    await setDoc(
      settingsRef,
      updatedData,
      {
        merge: true
      }
    );

    cachedSystemSettings = {

      ...(cachedSystemSettings ||
        DEFAULT_SETTINGS),

      ...updatedData

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


// ============================================================
// GET SUBSCRIPTION PLANS
// ============================================================
// IMPORTANT:
// ADMIN PANEL + USER WEBSITE
// BOTH USE:
// subscriptionPlans
// ============================================================

export async function getSubscriptionPlans(
  forceRefresh = false
) {

  // ----------------------------------------------------------
  // CACHE
  // ----------------------------------------------------------

  if (
    cachedSubscriptionPlans &&
    !forceRefresh
  ) {

    return cachedSubscriptionPlans;
  }


  try {

    // --------------------------------------------------------
    // SAME COLLECTION FOR ADMIN + USER
    // --------------------------------------------------------

    const plansRef =
      collection(
        db,
        'subscriptionPlans'
      );


    const snapshot =
      await getDocs(
        plansRef
      );


    const plans = [];


    // --------------------------------------------------------
    // READ PLANS
    // --------------------------------------------------------

    snapshot.forEach(
      planDoc => {

        const data =
          planDoc.data() || {};


        // ----------------------------------------------------
        // PLAN ID
        // ----------------------------------------------------

        const planId =
          data.planId ||
          planDoc.id;


        // ----------------------------------------------------
        // NAME
        // ----------------------------------------------------

        const name =
          data.name ||
          data.planName ||
          'Unnamed Plan';


        // ----------------------------------------------------
        // PRICE
        // ----------------------------------------------------

        const price =
          Number(
            data.price ?? 0
          );


        // ----------------------------------------------------
        // CURRENCY
        // ----------------------------------------------------

        const currency =
          data.currency ||
          'INR';


        // ----------------------------------------------------
        // DURATION
        // ----------------------------------------------------

        let durationDays =
          Number(
            data.durationDays ?? 0
          );


        // If Admin has duration + durationUnit
        // instead of durationDays
        if (
          durationDays <= 0 &&
          data.duration
        ) {

          durationDays =
            calculateDurationDays(
              data.duration,
              data.durationUnit
            );
        }


        // ----------------------------------------------------
        // STATUS
        // ----------------------------------------------------

        const active =
          data.active !== false &&
          data.status !== 'inactive' &&
          data.status !== 'archived';


        const status =
          data.status ||
          (
            active
              ? 'active'
              : 'archived'
          );


        // ----------------------------------------------------
        // SORT ORDER
        // ----------------------------------------------------

        const sortOrder =
          Number(
            data.sortOrder ??
            data.displayOrder ??
            999
          );


        // ----------------------------------------------------
        // NORMALIZED PLAN
        // ----------------------------------------------------

        plans.push({

          // Firestore document ID
          id:
            planDoc.id,

          // Actual plan ID
          planId,

          name,

          planName:
            data.planName ||
            name,

          price,

          currency,

          durationDays,

          duration:
            data.duration ??
            durationDays,

          durationUnit:
            data.durationUnit ||
            getDurationUnit(
              durationDays
            ),

          description:
            data.description ||
            '',

          features:
            Array.isArray(
              data.features
            )
              ? data.features
              : [],

          status,

          active,

          displayOrder:
            sortOrder,

          sortOrder,

          badge:
            data.badge ||
            '',

          createdAt:
            data.createdAt ||
            null,

          updatedAt:
            data.updatedAt ||
            null

        });

      }
    );


    // --------------------------------------------------------
    // SORT
    // --------------------------------------------------------

    plans.sort(
      (a, b) =>
        Number(a.sortOrder || 999) -
        Number(b.sortOrder || 999)
    );


    // --------------------------------------------------------
    // CACHE
    // --------------------------------------------------------

    cachedSubscriptionPlans =
      plans;


    console.log(
      'RankHub subscription plans loaded from subscriptionPlans:',
      plans
    );


    return plans;


  } catch (error) {

    console.error(
      'Error fetching subscription plans:',
      error
    );

    return [];
  }
}


// ============================================================
// GET SINGLE PLAN
// ============================================================

export async function getSubscriptionPlanById(
  planId
) {

  if (!planId) {
    return null;
  }

  try {

    const plans =
      await getSubscriptionPlans();

    return (
      plans.find(
        plan =>
          plan.id === planId ||
          plan.planId === planId
      ) ||
      null
    );

  } catch (error) {

    console.error(
      'Error getting plan:',
      error
    );

    return null;
  }
}


// ============================================================
// GET ACTIVE SUBSCRIPTION
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
    !subscription ||
    subscription.isPremium !== true
  ) {

    return null;
  }

  return subscription;
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
    activeSub.status !==
    'active'
  ) {

    return false;
  }

  if (
    activeSub.planId !==
    planId
  ) {

    return false;
  }

  const expiry =
    activeSub.expiryDate ||
    activeSub.validUntil;

  if (
    expiry &&
    !isDateValidAndFuture(expiry)
  ) {

    return false;
  }

  return true;
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

    let activePaidSubscription =
      null;


    const now =
      new Date();


    // --------------------------------------------------------
    // READ ALL SUBSCRIPTIONS
    // --------------------------------------------------------

    for (
      const subscriptionDoc
      of snapshot.docs
    ) {

      const originalData =
        subscriptionDoc.data();


      const subscription = {

        id:
          subscriptionDoc.id,

        ...originalData

      };


      // ------------------------------------------------------
      // EXPIRY
      // ------------------------------------------------------

      const expiryValue =
        subscription.expiryDate ||
        subscription.validUntil ||
        null;


      if (
        subscription.status ===
          'active' &&
        expiryValue
      ) {

        const expiryDate =
          convertDate(
            expiryValue
          );


        if (
          !expiryDate ||
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

                status:
                  'expired',

                updatedAt:
                  nowISOString()

              }
            );

          } catch (updateError) {

            console.warn(
              'Unable to update expired subscription:',
              updateError
            );
          }
        }
      }


      allSubscriptions.push(
        subscription
      );


      // ------------------------------------------------------
      // PAID ACTIVE SUBSCRIPTION
      // ------------------------------------------------------

      if (
        subscription.status ===
          'active' &&
        subscription.planId &&
        subscription.planId !==
          'free'
      ) {

        const expiryDate =
          expiryValue
            ? convertDate(
                expiryValue
              )
            : null;


        const valid =
          !expiryDate ||
          expiryDate > now;


        if (!valid) {
          continue;
        }


        if (
          !activePaidSubscription
        ) {

          activePaidSubscription =
            subscription;

          continue;
        }


        const currentExpiryValue =
          activePaidSubscription.expiryDate ||
          activePaidSubscription.validUntil ||
          null;


        const currentExpiry =
          currentExpiryValue
            ? convertDate(
                currentExpiryValue
              )
            : null;


        if (
          expiryDate &&
          (
            !currentExpiry ||
            expiryDate >
              currentExpiry
          )
        ) {

          activePaidSubscription =
            subscription;
        }
      }
    }


    // --------------------------------------------------------
    // PAID SUBSCRIPTION FOUND
    // --------------------------------------------------------

    if (
      activePaidSubscription
    ) {

      const expiryDate =
        activePaidSubscription.expiryDate ||
        activePaidSubscription.validUntil ||
        null;


      return {

        ...activePaidSubscription,

        planName:
          activePaidSubscription.planName ||
          activePaidSubscription.name ||
          activePaidSubscription.planId,

        isPremium:
          true,

        daysRemaining:
          calculateDaysRemaining(
            expiryDate
          ),

        allSubscriptions

      };
    }


    // --------------------------------------------------------
    // FREE SUBSCRIPTION
    // --------------------------------------------------------

    const freeSubscription =
      allSubscriptions.find(
        subscription =>
          subscription.planId ===
            'free' &&
          subscription.status ===
            'active'
      );


    if (
      freeSubscription
    ) {

      return {

        ...freeSubscription,

        planName:
          freeSubscription.planName ||
          freeSubscription.name ||
          'Free',

        isPremium:
          false,

        daysRemaining:
          99999,

        allSubscriptions

      };
    }


    // --------------------------------------------------------
    // FALLBACK
    // --------------------------------------------------------

    return getFreePlanObject(
      allSubscriptions
    );


  } catch (error) {

    console.error(
      'Error getting user subscription:',
      error
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


    const now =
      nowISOString();


    // --------------------------------------------------------
    // GET LATEST PLAN
    // --------------------------------------------------------

    let latestPlan =
      null;


    try {

      latestPlan =
        await getSubscriptionPlanById(
          planId
        );

    } catch (e) {

      console.warn(
        'Could not load latest plan:',
        e
      );
    }


    const finalPlanName =
      planName ||
      latestPlan?.name ||
      latestPlan?.planName ||
      planId;


    const finalPrice =
      Number(
        price ??
        latestPlan?.price ??
        0
      );


    const finalDurationDays =
      Number(
        durationDays ||
        latestPlan?.durationDays ||
        365
      );


    const subscriptionData = {

      subscriptionId,

      userId:
        targetUserId,

      planId,

      planName:
        finalPlanName,

      price:
        finalPrice,

      durationDays:
        finalDurationDays,

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


    return true;

  } catch (error) {

    console.error(
      'Error granting subscription:',
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

    const subscriptionRef =
      doc(
        db,
        'users',
        targetUserId,
        'subscriptions',
        subscriptionId
      );


    await updateDoc(
      subscriptionRef,
      {

        status:
          'expired',

        updatedAt:
          nowISOString(),

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

    gatewayReady:
      true,

    orderId:
      'order_' +
      Date.now(),

    amount:
      Number(
        plan.price || 0
      ) * 100,

    currency:
      plan.currency ||
      'INR',

    notes: {

      planId:
        plan.id ||
        plan.planId,

      userId:
        user.uid

    }

  };
}


// ============================================================
// CENTRAL CONTENT ACCESS CHECK
// ============================================================

export async function canAccessContent(
  userOrUserId,
  contentType = '',
  itemIndex = 0
) {

  let userId =
    null;


  if (
    typeof userOrUserId ===
    'string'
  ) {

    userId =
      userOrUserId;

  } else if (
    userOrUserId &&
    userOrUserId.uid
  ) {

    userId =
      userOrUserId.uid;

  } else if (
    auth?.currentUser?.uid
  ) {

    userId =
      auth.currentUser.uid;

  } else {

    userId =
      getCurrentUserId();
  }


  // ----------------------------------------------------------
  // SYSTEM MODE
  // ----------------------------------------------------------

  const settings =
    await getSystemSettings();


  if (
    settings.subscriptionSystemEnabled !==
    true
  ) {

    return true;
  }


  // ----------------------------------------------------------
  // SUBSCRIPTION MODE
  // ----------------------------------------------------------

  if (!userId) {
    return false;
  }


  const subscription =
    await getUserSubscription(
      userId
    );


  if (
    subscription &&
    subscription.isPremium ===
      true
  ) {

    return true;
  }


  return false;
}


// ============================================================
// SIMPLE PREMIUM CHECK
// ============================================================

export async function hasActiveSubscription(
  userOrUserId
) {

  let userId =
    null;


  if (
    typeof userOrUserId ===
    'string'
  ) {

    userId =
      userOrUserId;

  } else if (
    userOrUserId?.uid
  ) {

    userId =
      userOrUserId.uid;

  } else {

    userId =
      getCurrentUserId();
  }


  if (!userId) {
    return false;
  }


  const subscription =
    await getUserSubscription(
      userId
    );


  return (
    subscription?.isPremium ===
    true
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


    const closeModal = () => {

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
      event => {

        if (
          event.target ===
          modal
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

  cachedSystemSettings =
    null;

  cachedSubscriptionPlans =
    null;
}


// ============================================================
// REFRESH ALL SUBSCRIPTION DATA
// ============================================================

export async function refreshSubscriptionData() {

  clearSubscriptionCache();


  const [
    settings,
    plans
  ] = await Promise.all([

    getSystemSettings(true),

    getSubscriptionPlans(true)

  ]);


  return {

    settings,

    plans

  };
}


// ============================================================
// DEBUG HELPER
// ============================================================

export async function debugSubscription(
  userId = null
) {

  const resolvedUserId =
    userId ||
    getCurrentUserId();


  const settings =
    await getSystemSettings(
      true
    );


  const plans =
    await getSubscriptionPlans(
      true
    );


  const subscription =
    resolvedUserId
      ? await getUserSubscription(
          resolvedUserId
        )
      : null;


  console.log(
    '========== RANKHUB SUBSCRIPTION DEBUG =========='
  );


  console.log(
    'User ID:',
    resolvedUserId
  );


  console.log(
    'System Settings:',
    settings
  );


  console.log(
    'Plans from subscriptionPlans:',
    plans
  );


  console.log(
    'Subscription:',
    subscription
  );


  console.log(
    '================================================'
  );


  return {

    userId:
      resolvedUserId,

    settings,

    plans,

    subscription

  };
}


// ============================================================
// FORCE REFRESH PLANS
// ============================================================

export async function refreshSubscriptionPlans() {

  cachedSubscriptionPlans =
    null;

  return await getSubscriptionPlans(
    true
  );
}


// ============================================================
// END
// ============================================================
