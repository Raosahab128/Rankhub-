import { db, auth } from './firebase.js';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';


// ============================================================
// DEFAULT SYSTEM CONFIGURATION
// ============================================================

const DEFAULT_SETTINGS = {
  subscriptionSystemEnabled: true,
  updatedAt: new Date().toISOString()
};


// ============================================================
// DEFAULT SUBSCRIPTION PLANS
// IMPORTANT:
// Admin Panel ke "plans" collection ke saath compatible.
// ============================================================

export const DEFAULT_PLANS = [
  {
    planId: 'free',
    name: 'Free',
    price: 0,
    duration: 99999,
    durationUnit: 'day',
    durationDays: 99999,
    features: [
      'Access to Free Mock Tests',
      'Basic Practice Bank',
      'Previous Year Question Papers Preview'
    ],
    active: true,
    status: 'active',
    sortOrder: 0,
    displayOrder: 0,
    badge: ''
  },
  {
    planId: '1week',
    name: '1 Week',
    price: 29,
    duration: 7,
    durationUnit: 'day',
    durationDays: 7,
    features: [
      'Unlimited Mock Tests for 7 Days',
      'Detailed Performance Analysis',
      'All Practice Sets'
    ],
    active: true,
    status: 'active',
    sortOrder: 1,
    displayOrder: 1,
    badge: ''
  },
  {
    planId: '6months',
    name: '6 Months',
    price: 199,
    duration: 6,
    durationUnit: 'month',
    durationDays: 180,
    features: [
      'Unlimited Access for 180 Days',
      'All Exam Categories',
      'Priority Support & Solutions'
    ],
    active: true,
    status: 'active',
    sortOrder: 2,
    displayOrder: 2,
    badge: ''
  },
  {
    planId: '1year',
    name: '1 Year',
    price: 299,
    duration: 1,
    durationUnit: 'year',
    durationDays: 365,
    features: [
      'Full Year Access',
      'All Exams & Test Series',
      'Best Value for Serious Aspirants'
    ],
    active: true,
    status: 'active',
    sortOrder: 3,
    displayOrder: 3,
    badge: 'Best Value'
  }
];


// ============================================================
// CACHE
// ============================================================

let cachedSystemSettings = null;
let cachedSubscriptionPlans = null;


// ============================================================
// DATE HELPERS
// ============================================================

function parseFirebaseDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate();
    } catch (e) {
      return null;
    }
  }

  if (typeof value === 'string') {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  if (typeof value === 'number') {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}


function toISOStringSafe(value) {
  const date = parseFirebaseDate(value);

  if (!date) return null;

  return date.toISOString();
}


function calculateExpiryDate(startDate, duration, durationUnit) {
  const date = new Date(startDate);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid subscription start date.');
  }

  const amount = Number(duration) || 0;

  switch (durationUnit) {
    case 'day':
    case 'days':
      date.setDate(date.getDate() + amount);
      break;

    case 'month':
    case 'months':
      date.setMonth(date.getMonth() + amount);
      break;

    case 'year':
    case 'years':
      date.setFullYear(date.getFullYear() + amount);
      break;

    default:
      date.setDate(date.getDate() + amount);
  }

  return date;
}


function calculateDaysRemaining(expiryDate) {
  const expiry = parseFirebaseDate(expiryDate);

  if (!expiry) return 0;

  const now = new Date();
  const diff = expiry.getTime() - now.getTime();

  return Math.max(
    0,
    Math.ceil(diff / (1000 * 60 * 60 * 24))
  );
}


// ============================================================
// ADMIN CHECK
// ============================================================

export async function checkIsAdmin(user) {
  if (!user) return false;

  // Existing admin email
  if (user.email === 'dk9665676@gmail.com') {
    return true;
  }

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return false;
    }

    const data = userSnap.data();

    return (
      data.role === 'admin' ||
      data.isAdmin === true
    );

  } catch (err) {
    console.error('Error checking admin status:', err);
    return false;
  }
}


// ============================================================
// SYSTEM SETTINGS
// ============================================================

export async function getSystemSettings() {
  if (cachedSystemSettings) {
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

    await setDoc(docRef, {
      ...DEFAULT_SETTINGS,
      createdAt: serverTimestamp()
    });

    cachedSystemSettings = DEFAULT_SETTINGS;

    return cachedSystemSettings;

  } catch (err) {
    console.error('Error getting system settings:', err);

    return DEFAULT_SETTINGS;
  }
}


// ============================================================
// UPDATE SYSTEM SETTINGS
// ============================================================

export async function updateSystemSettings(newSettings) {
  try {
    const docRef = doc(db, 'settings', 'system');

    const data = {
      ...newSettings,
      updatedAt: serverTimestamp()
    };

    await setDoc(
      docRef,
      data,
      { merge: true }
    );

    cachedSystemSettings = {
      ...(cachedSystemSettings || DEFAULT_SETTINGS),
      ...newSettings
    };

    return true;

  } catch (err) {
    console.error('Error updating system settings:', err);
    throw err;
  }
}


// ============================================================
// GET SUBSCRIPTION PLANS
//
// PRIMARY COLLECTION:
// plans
//
// FALLBACK:
// subscriptionPlans
// ============================================================

export async function getSubscriptionPlans() {
  if (cachedSubscriptionPlans) {
    return cachedSubscriptionPlans;
  }

  try {

    // --------------------------------------------------------
    // First try Admin Panel's "plans" collection
    // --------------------------------------------------------

    const plansRef = collection(db, 'plans');

    let snapshot;

    try {
      const q = query(
        plansRef,
        orderBy('displayOrder', 'asc')
      );

      snapshot = await getDocs(q);

    } catch (indexError) {

      console.warn(
        'Ordered plans query failed. Loading without order:',
        indexError
      );

      snapshot = await getDocs(plansRef);
    }


    if (!snapshot.empty) {

      const plans = [];

      snapshot.forEach(planDoc => {

        const data = planDoc.data();

        // Only active plans on user website
        if (
          data.status === 'archived' ||
          data.status === 'inactive'
        ) {
          return;
        }

        plans.push({
          id: planDoc.id,

          planId:
            data.planId ||
            planDoc.id,

          name:
            data.name ||
            'Unnamed Plan',

          price:
            Number(data.price || 0),

          duration:
            Number(
              data.duration ||
              data.durationDays ||
              0
            ),

          durationUnit:
            data.durationUnit ||
            'day',

          durationDays:
            Number(
              data.durationDays ||
              data.duration ||
              0
            ),

          features:
            Array.isArray(data.features)
              ? data.features
              : [],

          active:
            data.status
              ? data.status === 'active'
              : data.active !== false,

          status:
            data.status || 'active',

          sortOrder:
            Number(
              data.displayOrder ??
              data.sortOrder ??
              0
            ),

          displayOrder:
            Number(
              data.displayOrder ??
              data.sortOrder ??
              0
            ),

          badge:
            data.badge || ''
        });
      });


      if (plans.length > 0) {

        cachedSubscriptionPlans =
          plans.sort(
            (a, b) =>
              a.displayOrder -
              b.displayOrder
          );

        return cachedSubscriptionPlans;
      }
    }


    // --------------------------------------------------------
    // Fallback to old collection
    // --------------------------------------------------------

    const oldRef =
      collection(db, 'subscriptionPlans');

    const oldSnapshot =
      await getDocs(oldRef);

    if (!oldSnapshot.empty) {

      const plans = [];

      oldSnapshot.forEach(planDoc => {

        const data = planDoc.data();

        if (data.active === false) {
          return;
        }

        plans.push({
          id: planDoc.id,
          ...data,

          planId:
            data.planId ||
            planDoc.id,

          price:
            Number(data.price || 0),

          durationDays:
            Number(
              data.durationDays ||
              data.duration ||
              0
            )
        });
      });

      cachedSubscriptionPlans =
        plans.sort(
          (a, b) =>
            (a.sortOrder || 0) -
            (b.sortOrder || 0)
        );

      return cachedSubscriptionPlans;
    }


    // --------------------------------------------------------
    // No plans found → create defaults
    // --------------------------------------------------------

    for (const plan of DEFAULT_PLANS) {

      await setDoc(
        doc(db, 'plans', plan.planId),
        {
          ...plan,
          currency: 'INR',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }

    cachedSubscriptionPlans =
      DEFAULT_PLANS;

    return DEFAULT_PLANS;

  } catch (err) {

    console.error(
      'Error fetching subscription plans:',
      err
    );

    return DEFAULT_PLANS;
  }
}


// ============================================================
// GET ONE PLAN
// ============================================================

export async function getSubscriptionPlan(planId) {
  if (!planId) return null;

  const plans =
    await getSubscriptionPlans();

  return (
    plans.find(
      plan =>
        plan.planId === planId ||
        plan.id === planId
    ) || null
  );
}


// ============================================================
// FREE PLAN
// ============================================================

function getFreePlanObject() {
  return {
    subscriptionId: null,

    planId: 'free',

    planName: 'Free',

    name: 'Free',

    price: 0,

    durationDays: 99999,

    status: 'inactive',

    startDate: null,

    expiryDate: null,

    daysRemaining: 0,

    isPremium: false,

    source: 'system',

    allSubscriptions: []
  };
}


// ============================================================
// GET USER SUBSCRIPTION
//
// MAIN SOURCE:
// users/{uid}/subscriptions
//
// FALLBACK:
// users/{uid}
// ============================================================

export async function getUserSubscription(userId) {

  if (!userId) {
    return getFreePlanObject();
  }

  try {

    const now = new Date();

    const subsRef =
      collection(
        db,
        'users',
        userId,
        'subscriptions'
      );

    let snapshot;

    try {

      const q = query(
        subsRef,
        orderBy('createdAt', 'desc')
      );

      snapshot = await getDocs(q);

    } catch (e) {

      console.warn(
        'Subscription ordered query failed. Loading normally:',
        e
      );

      snapshot = await getDocs(subsRef);
    }


    const allSubs = [];

    let activeSub = null;


    // --------------------------------------------------------
    // Read all subscriptions
    // --------------------------------------------------------

    for (const subscriptionDoc of snapshot.docs) {

      const rawData =
        subscriptionDoc.data();

      const subData = {
        id: subscriptionDoc.id,
        ...rawData
      };


      const expiryValue =
        subData.expiryDate ||
        subData.validUntil ||
        null;

      const expiry =
        parseFirebaseDate(expiryValue);


      // ------------------------------------------------------
      // Expire old subscription
      // ------------------------------------------------------

      if (
        subData.status === 'active' &&
        expiry &&
        expiry <= now
      ) {

        subData.status = 'expired';

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
              updatedAt: serverTimestamp()
            }
          );

        } catch (expireError) {

          console.warn(
            'Could not update expired subscription:',
            expireError
          );
        }
      }


      allSubs.push(subData);


      // ------------------------------------------------------
      // Find active subscription
      // ------------------------------------------------------

      if (
        subData.status === 'active' &&
        (!expiry || expiry > now)
      ) {

        if (!activeSub) {

          activeSub = subData;

        } else {

          const currentExpiry =
            parseFirebaseDate(
              activeSub.expiryDate ||
              activeSub.validUntil
            );

          if (
            expiry &&
            currentExpiry &&
            expiry > currentExpiry
          ) {
            activeSub = subData;
          }
        }
      }
    }


    // --------------------------------------------------------
    // Active subscription found
    // --------------------------------------------------------

    if (activeSub) {

      const expiry =
        parseFirebaseDate(
          activeSub.expiryDate ||
          activeSub.validUntil
        );

      const daysRemaining =
        expiry
          ? calculateDaysRemaining(expiry)
          : 0;

      const planId =
        activeSub.planId || 'free';


      return {

        ...activeSub,

        planId,

        planName:
          activeSub.planName ||
          activeSub.name ||
          planId,

        name:
          activeSub.planName ||
          activeSub.name ||
          planId,

        status: 'active',

        isPremium:
          planId !== 'free',

        daysRemaining,

        allSubscriptions: allSubs
      };
    }


    // --------------------------------------------------------
    // FALLBACK:
    // Check main user document
    // --------------------------------------------------------

    const userRef =
      doc(db, 'users', userId);

    const userSnap =
      await getDoc(userRef);


    if (userSnap.exists()) {

      const userData =
        userSnap.data();


      if (
        userData.subscriptionStatus === 'active' &&
        userData.planId
      ) {

        const expiry =
          parseFirebaseDate(
            userData.subscriptionExpiryDate
          );


        if (
          !expiry ||
          expiry > now
        ) {

          return {

            subscriptionId:
              userData.subscriptionId ||
              null,

            planId:
              userData.planId,

            planName:
              userData.planName ||
              userData.planId,

            name:
              userData.planName ||
              userData.planId,

            price:
              Number(
                userData.subscriptionPrice ||
                0
              ),

            status: 'active',

            startDate:
              userData.subscriptionStartDate ||
              null,

            expiryDate:
              userData.subscriptionExpiryDate ||
              null,

            isPremium:
              userData.planId !== 'free',

            daysRemaining:
              calculateDaysRemaining(expiry),

            source:
              userData.subscriptionSource ||
              'user',

            allSubscriptions: allSubs
          };
        }
      }
    }


    // --------------------------------------------------------
    // No active subscription
    // --------------------------------------------------------

    const free =
      getFreePlanObject();

    free.allSubscriptions =
      allSubs;

    return free;

  } catch (err) {

    console.error(
      'Error getting user subscription:',
      err
    );

    return getFreePlanObject();
  }
}


// ============================================================
// GET ACTIVE SUBSCRIPTION
// ============================================================

export async function getActiveSubscription(userId) {

  const sub =
    await getUserSubscription(userId);

  if (
    sub &&
    sub.status === 'active'
  ) {
    return sub;
  }

  return null;
}


// ============================================================
// CHECK PLAN
// ============================================================

export function isPlanActive(
  activeSub,
  planId
) {

  if (
    !activeSub ||
    activeSub.status !== 'active'
  ) {
    return false;
  }

  if (
    activeSub.expiryDate
  ) {

    const expiry =
      parseFirebaseDate(
        activeSub.expiryDate
      );

    if (
      expiry &&
      expiry <= new Date()
    ) {
      return false;
    }
  }

  return (
    activeSub.planId === planId
  );
}


// ============================================================
// ADMIN GRANT SUBSCRIPTION
//
// IMPORTANT:
// Admin Panel se subscription dene par:
// 1. users/{uid}/subscriptions/{id}
// 2. users/{uid} summary
//
// dono update honge.
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

  try {

    if (!targetUserId) {
      throw new Error(
        'User ID is required.'
      );
    }

    if (!planId) {
      throw new Error(
        'Plan ID is required.'
      );
    }


    const now =
      new Date();


    const subId =
      'sub_' +
      Date.now();


    const finalPlanName =
      planName ||
      planId;


    const finalPrice =
      Number(price) || 0;


    const finalDuration =
      Number(durationDays) || 0;


    const subData = {

      subscriptionId:
        subId,

      userId:
        targetUserId,

      planId:
        planId,

      planName:
        finalPlanName,

      price:
        finalPrice,

      durationDays:
        finalDuration,

      startDate:
        startDateStr,

      expiryDate:
        expiryDateStr,

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
        serverTimestamp(),

      updatedAt:
        serverTimestamp()
    };


    // --------------------------------------------------------
    // 1. Create subscription
    // --------------------------------------------------------

    const subRef =
      doc(
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


    // --------------------------------------------------------
    // 2. Update main user document
    // --------------------------------------------------------

    const userRef =
      doc(
        db,
        'users',
        targetUserId
      );


    await setDoc(
      userRef,
      {

        planId:
          planId,

        planName:
          finalPlanName,

        subscriptionStatus:
          'active',

        subscriptionPrice:
          finalPrice,

        subscriptionStartDate:
          startDateStr,

        subscriptionExpiryDate:
          expiryDateStr,

        subscriptionId:
          subId,

        subscriptionSource:
          'admin',

        updatedAt:
          serverTimestamp()

      },
      {
        merge: true
      }
    );


    // --------------------------------------------------------
    // 3. Admin log
    // --------------------------------------------------------

    await createAdminLog(
      'SUBSCRIPTION_GRANTED',
      targetUserId,
      {
        subscriptionId:
          subId,

        planId:
          planId,

        planName:
          finalPlanName,

        price:
          finalPrice
      }
    );


    return {
      success: true,
      subscriptionId: subId,
      subscription: subData
    };


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

  try {

    const subRef =
      doc(
        db,
        'users',
        targetUserId,
        'subscriptions',
        subscriptionId
      );


    await updateDoc(
      subRef,
      {

        status:
          'expired',

        updatedAt:
          serverTimestamp(),

        adminNote:
          'Revoked by Admin'
      }
    );


    // Update user summary
    const userRef =
      doc(
        db,
        'users',
        targetUserId
      );


    await setDoc(
      userRef,
      {

        subscriptionStatus:
          'expired',

        updatedAt:
          serverTimestamp()

      },
      {
        merge: true
      }
    );


    await createAdminLog(
      'SUBSCRIPTION_REVOKED',
      targetUserId,
      {
        subscriptionId
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
// PAYMENT CHECKOUT PREPARATION
// ============================================================

export function preparePaymentGatewayCheckout(
  plan,
  user
) {

  if (!plan) {
    throw new Error(
      'Subscription plan is required.'
    );
  }

  if (!user?.uid) {
    throw new Error(
      'User must be logged in.'
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
        plan.id,

      userId:
        user.uid
    }
  };
}


// ============================================================
// ACTIVATE SUBSCRIPTION AFTER VERIFIED PAYMENT
//
// IMPORTANT:
// Is function ko payment verification ke baad call karo.
// Frontend se fake payment success ke liye call mat karna.
// ============================================================

export async function activateSubscriptionAfterPayment({

  userId,

  plan,

  paymentId = '',

  orderId = '',

  paymentMethod = 'UPI',

  verified = false

}) {

  try {

    if (!userId) {
      throw new Error(
        'User ID is required.'
      );
    }

    if (!plan) {
      throw new Error(
        'Plan is required.'
      );
    }

    if (!verified) {
      throw new Error(
        'Payment is not verified.'
      );
    }


    const now =
      new Date();


    const duration =
      Number(
        plan.duration ||
        plan.durationDays ||
        0
      );


    const durationUnit =
      plan.durationUnit ||
      'day';


    const startDate =
      now;


    const expiryDate =
      calculateExpiryDate(
        startDate,
        duration,
        durationUnit
      );


    const subscriptionId =
      'sub_' +
      Date.now();


    const planId =
      plan.planId ||
      plan.id;


    const planName =
      plan.name ||
      planId;


    const price =
      Number(plan.price || 0);


    const subscriptionData = {

      subscriptionId,

      userId,

      planId,

      planName,

      price,

      currency:
        'INR',

      duration,

      durationUnit,

      durationDays:
        Number(
          plan.durationDays ||
          duration
        ),

      startDate:
        startDate.toISOString(),

      expiryDate:
        expiryDate.toISOString(),

      status:
        'active',

      source:
        'purchase',

      paymentId:
        paymentId || null,

      orderId:
        orderId || null,

      paymentMethod,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()
    };


    // --------------------------------------------------------
    // 1. Save subscription
    // --------------------------------------------------------

    const subscriptionRef =
      doc(
        db,
        'users',
        userId,
        'subscriptions',
        subscriptionId
      );


    await setDoc(
      subscriptionRef,
      subscriptionData
    );


    // --------------------------------------------------------
    // 2. Update users/{uid}
    //
    // This fixes "Subscription Details not updating".
    // --------------------------------------------------------

    const userRef =
      doc(
        db,
        'users',
        userId
      );


    await setDoc(
      userRef,
      {

        planId,

        planName,

        subscriptionStatus:
          'active',

        subscriptionPrice:
          price,

        subscriptionStartDate:
          startDate.toISOString(),

        subscriptionExpiryDate:
          expiryDate.toISOString(),

        subscriptionId,

        subscriptionSource:
          'purchase',

        updatedAt:
          serverTimestamp()

      },
      {
        merge: true
      }
    );


    // --------------------------------------------------------
    // 3. Create transaction
    //
    // This fixes Admin Transactions page.
    // --------------------------------------------------------

    const userSnap =
      await getDoc(userRef);


    const userData =
      userSnap.exists()
        ? userSnap.data()
        : {};


    const transactionData = {

      userId,

      userName:
        userData.name ||
        userData.displayName ||
        '',

      userEmail:
        userData.email ||
        auth.currentUser?.email ||
        '',

      planId,

      planName,

      amount:
        price,

      currency:
        'INR',

      paymentMethod,

      paymentId:
        paymentId || '',

      orderId:
        orderId || '',

      subscriptionId,

      status:
        'SUCCESS',

      createdAt:
        serverTimestamp(),

      verifiedAt:
        serverTimestamp(),

      source:
        'purchase'
    };


    const transactionRef =
      await addDoc(
        collection(
          db,
          'transactions'
        ),
        transactionData
      );


    // --------------------------------------------------------
    // 4. Admin log
    // --------------------------------------------------------

    await createAdminLog(
      'SUBSCRIPTION_PURCHASED',
      userId,
      {
        transactionId:
          transactionRef.id,

        subscriptionId,

        planId,

        amount:
          price
      }
    );


    return {

      success:
        true,

      subscriptionId,

      transactionId:
        transactionRef.id,

      startDate:
        startDate.toISOString(),

      expiryDate:
        expiryDate.toISOString()
    };


  } catch (err) {

    console.error(
      'Subscription activation failed:',
      err
    );

    throw err;
  }
}


// ============================================================
// CREATE ADMIN LOG
// ============================================================

async function createAdminLog(
  action,
  targetId,
  details = {}
) {

  try {

    await addDoc(
      collection(
        db,
        'admin_logs'
      ),
      {

        adminId:
          auth.currentUser?.uid ||
          'SYSTEM',

        adminEmail:
          auth.currentUser?.email ||
          'SYSTEM',

        action,

        targetId,

        module:
          'subscription',

        details,

        timestamp:
          serverTimestamp(),

        status:
          'Success'
      }
    );

  } catch (error) {

    console.warn(
      'Failed to create admin log:',
      error
    );
  }
}


// ============================================================
// CONTENT ACCESS
// ============================================================

export async function canAccessContent(
  userOrUserId,
  contentType,
  itemIndex
) {

  // First item is free
  if (itemIndex === 0) {
    return true;
  }


  let userId = null;


  if (
    typeof userOrUserId === 'string'
  ) {

    userId =
      userOrUserId;

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

        if (user?.uid) {
          userId =
            user.uid;
        }
      }

    } catch (e) {
      // Ignore localStorage errors
    }
  }


  if (!userId) {
    return false;
  }


  const subscription =
    await getActiveSubscription(
      userId
    );


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

      <div
        style="
          background:#FFFFFF;
          width:100%;
          max-width:460px;
          border-radius:20px;
          padding:32px;
          box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);
          position:relative;
          text-align:center;
        "
      >

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
            color:#64748B;
          "
        >
          &times;
        </button>


        <div
          style="
            width:56px;
            height:56px;
            background:#FEF2F2;
            color:#DC2626;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            margin:0 auto 16px;
          "
        >

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <rect
              x="3"
              y="11"
              width="18"
              height="11"
              rx="2"
            />

            <path
              d="M7 11V7a5 5 0 0 1 10 0v4"
            />
          </svg>

        </div>


        <span
          style="
            display:inline-block;
            padding:4px 12px;
            background:#FEF2F2;
            color:#DC2626;
            border-radius:999px;
            font-size:0.75rem;
            font-weight:800;
            text-transform:uppercase;
            margin-bottom:8px;
          "
        >
          RankHub Pass Protected
        </span>


        <h3
          style="
            font-size:1.375rem;
            font-weight:800;
            color:#0F172A;
            margin-bottom:6px;
          "
        >
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


        <div
          style="
            background:#F8FAFC;
            border:1px solid #E2E8F0;
            border-radius:14px;
            padding:16px;
            margin-bottom:24px;
            text-align:left;
          "
        >

          <div
            style="
              font-size:0.8125rem;
              font-weight:800;
              color:#0F172A;
              margin-bottom:8px;
            "
          >
            What you get with RankHub Pass Pro:
          </div>


          <ul
            style="
              list-style:none;
              padding:0;
              margin:0;
              font-size:0.8125rem;
              color:#334155;
              display:flex;
              flex-direction:column;
              gap:6px;
            "
          >

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


        <div
          style="
            display:flex;
            flex-direction:column;
            gap:10px;
          "
        >

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


    modal
      .querySelector(
        '#closeRankhubModalBtn'
      )
      .onclick =
      closeModal;


    modal
      .querySelector(
        '#continueFreeModalBtn'
      )
      .onclick =
      closeModal;


    modal.onclick =
      event => {

        if (
          event.target === modal
        ) {
          closeModal();
        }

      };

  } else {

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
// CACHE RESET
// ============================================================

export function clearSubscriptionCache() {

  cachedSubscriptionPlans =
    null;

  cachedSystemSettings =
    null;
}


// ============================================================
// AUTO REFRESH HELPER
// ============================================================

export async function refreshUserSubscription(
  userId = auth.currentUser?.uid
) {

  if (!userId) {
    return getFreePlanObject();
  }

  return await getUserSubscription(
    userId
  );
}
