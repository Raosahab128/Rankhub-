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
// DEFAULT SYSTEM SETTINGS
// ============================================================

const DEFAULT_SETTINGS = {
  subscriptionSystemEnabled: true,
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
    duration: 7,
    durationUnit: 'day',
    durationDays: 7,
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
    } catch {
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

  const diff =
    expiry.getTime() -
    now.getTime();

  return Math.max(
    0,
    Math.ceil(
      diff / (1000 * 60 * 60 * 24)
    )
  );
}


// ============================================================
// ADMIN CHECK
// ============================================================

export async function checkIsAdmin(user) {
  if (!user) return false;

  if (user.email === 'dk9665676@gmail.com') {
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

export async function getSystemSettings() {
  if (cachedSystemSettings) {
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
      {
        ...DEFAULT_SETTINGS,
        createdAt: serverTimestamp()
      },
      {
        merge: true
      }
    );

    cachedSystemSettings =
      DEFAULT_SETTINGS;

    return cachedSystemSettings;

  } catch (error) {
    console.error(
      'System settings error:',
      error
    );

    return DEFAULT_SETTINGS;
  }
}


// ============================================================
// UPDATE SYSTEM SETTINGS
// ============================================================

export async function updateSystemSettings(
  newSettings
) {
  try {
    const ref =
      doc(db, 'settings', 'system');

    await setDoc(
      ref,
      {
        ...newSettings,
        updatedAt: serverTimestamp()
      },
      {
        merge: true
      }
    );

    cachedSystemSettings = {
      ...(cachedSystemSettings || DEFAULT_SETTINGS),
      ...newSettings
    };

    return true;

  } catch (error) {
    console.error(
      'Update system settings failed:',
      error
    );

    throw error;
  }
}


// ============================================================
// GET SUBSCRIPTION PLANS
// ============================================================

export async function getSubscriptionPlans() {
  if (cachedSubscriptionPlans) {
    return cachedSubscriptionPlans;
  }

  try {
    const plansRef =
      collection(db, 'plans');

    let snapshot;

    try {
      const q =
        query(
          plansRef,
          orderBy('displayOrder', 'asc')
        );

      snapshot =
        await getDocs(q);

    } catch {
      snapshot =
        await getDocs(plansRef);
    }


    if (!snapshot.empty) {
      const plans = [];

      snapshot.forEach(planDoc => {
        const data =
          planDoc.data();

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
    // FALLBACK OLD COLLECTION
    // --------------------------------------------------------

    const oldRef =
      collection(
        db,
        'subscriptionPlans'
      );

    const oldSnapshot =
      await getDocs(oldRef);

    if (!oldSnapshot.empty) {
      const plans = [];

      oldSnapshot.forEach(planDoc => {
        const data =
          planDoc.data();

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
    // CREATE DEFAULT PLANS
    // --------------------------------------------------------

    for (const plan of DEFAULT_PLANS) {
      await setDoc(
        doc(
          db,
          'plans',
          plan.planId
        ),
        {
          ...plan,
          currency: 'INR',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          merge: true
        }
      );
    }

    cachedSubscriptionPlans =
      DEFAULT_PLANS;

    return DEFAULT_PLANS;

  } catch (error) {
    console.error(
      'Subscription plans error:',
      error
    );

    return DEFAULT_PLANS;
  }
}


// ============================================================
// GET ONE PLAN
// ============================================================

export async function getSubscriptionPlan(
  planId
) {
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
// FREE PLAN OBJECT
// ============================================================

function getFreePlanObject() {
  return {
    subscriptionId: null,

    planId: 'free',

    planName: 'Free',

    name: 'Free',

    price: 0,

    durationDays: 0,

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
// SUBSCRIPTION PRIORITY
//
// IMPORTANT FIX
//
// Premium subscription ALWAYS gets priority over Free.
// ============================================================

function getSubscriptionPriority(sub) {
  if (!sub) return -1;

  const planId =
    String(
      sub.planId || ''
    ).toLowerCase();

  const price =
    Number(sub.price || 0);

  if (
    planId !== 'free' &&
    price > 0
  ) {
    return 100;
  }

  if (planId !== 'free') {
    return 50;
  }

  return 10;
}


// ============================================================
// GET SUBSCRIPTION CREATED DATE
// ============================================================

function getSubscriptionCreatedDate(sub) {
  return (
    parseFirebaseDate(
      sub.createdAt
    ) ||
    parseFirebaseDate(
      sub.startDate
    ) ||
    new Date(0)
  );
}


// ============================================================
// FIND BEST ACTIVE SUBSCRIPTION
//
// Premium > Free
// Then latest subscription
// Then longest expiry
// ============================================================

function selectBestActiveSubscription(
  subscriptions
) {
  if (
    !Array.isArray(subscriptions) ||
    subscriptions.length === 0
  ) {
    return null;
  }

  const sorted =
    [...subscriptions].sort(
      (a, b) => {

        const priorityA =
          getSubscriptionPriority(a);

        const priorityB =
          getSubscriptionPriority(b);

        if (
          priorityA !== priorityB
        ) {
          return (
            priorityB -
            priorityA
          );
        }

        const createdA =
          getSubscriptionCreatedDate(a)
            .getTime();

        const createdB =
          getSubscriptionCreatedDate(b)
            .getTime();

        if (
          createdA !== createdB
        ) {
          return (
            createdB -
            createdA
          );
        }

        const expiryA =
          parseFirebaseDate(
            a.expiryDate ||
            a.validUntil
          )?.getTime() || 0;

        const expiryB =
          parseFirebaseDate(
            b.expiryDate ||
            b.validUntil
          )?.getTime() || 0;

        return (
          expiryB -
          expiryA
        );
      }
    );

  return sorted[0] || null;
}


// ============================================================
// GET USER SUBSCRIPTION
//
// MAIN:
// users/{uid}/subscriptions
//
// FALLBACK:
// users/{uid}
// ============================================================

export async function getUserSubscription(
  userId
) {
  if (!userId) {
    return getFreePlanObject();
  }

  try {
    const now =
      new Date();

    const subscriptionsRef =
      collection(
        db,
        'users',
        userId,
        'subscriptions'
      );

    let snapshot;

    try {
      const q =
        query(
          subscriptionsRef,
          orderBy(
            'createdAt',
            'desc'
          )
        );

      snapshot =
        await getDocs(q);

    } catch (error) {
      console.warn(
        'Ordered subscription query failed:',
        error
      );

      snapshot =
        await getDocs(
          subscriptionsRef
        );
    }


    const allSubs = [];

    const activeSubscriptions = [];


    // ========================================================
    // READ ALL SUBSCRIPTIONS
    // ========================================================

    for (
      const subscriptionDoc
      of snapshot.docs
    ) {

      const raw =
        subscriptionDoc.data();

      const sub = {
        id:
          subscriptionDoc.id,

        ...raw
      };


      const expiry =
        parseFirebaseDate(
          sub.expiryDate ||
          sub.validUntil
        );


      // ======================================================
      // EXPIRE OLD SUBSCRIPTION
      // ======================================================

      if (
        sub.status === 'active' &&
        expiry &&
        expiry <= now
      ) {

        sub.status =
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
              updatedAt:
                serverTimestamp()
            }
          );
        } catch (error) {
          console.warn(
            'Could not mark subscription expired:',
            error
          );
        }
      }


      allSubs.push(sub);


      // ======================================================
      // ACTIVE SUBSCRIPTION
      // ======================================================

      if (
        sub.status === 'active' &&
        (
          !expiry ||
          expiry > now
        )
      ) {
        activeSubscriptions.push(
          sub
        );
      }
    }


    // ========================================================
    // SELECT BEST SUBSCRIPTION
    //
    // THIS IS THE IMPORTANT FIX
    // ========================================================

    const activeSub =
      selectBestActiveSubscription(
        activeSubscriptions
      );


    if (activeSub) {

      const expiry =
        parseFirebaseDate(
          activeSub.expiryDate ||
          activeSub.validUntil
        );

      const planId =
        activeSub.planId ||
        'free';

      const isPremium =
        planId !== 'free' &&
        Number(
          activeSub.price || 0
        ) > 0;


      return {

        ...activeSub,

        subscriptionId:
          activeSub.subscriptionId ||
          activeSub.id ||
          null,

        planId,

        planName:
          activeSub.planName ||
          activeSub.name ||
          planId,

        name:
          activeSub.planName ||
          activeSub.name ||
          planId,

        price:
          Number(
            activeSub.price || 0
          ),

        status: 'active',

        isPremium,

        daysRemaining:
          expiry
            ? calculateDaysRemaining(
                expiry
              )
            : 0,

        allSubscriptions:
          allSubs
      };
    }


    // ========================================================
    // USER DOCUMENT FALLBACK
    // ========================================================

    const userRef =
      doc(
        db,
        'users',
        userId
      );

    const userSnap =
      await getDoc(
        userRef
      );


    if (userSnap.exists()) {

      const userData =
        userSnap.data();

      const userExpiry =
        parseFirebaseDate(
          userData.subscriptionExpiryDate
        );


      if (
        userData.subscriptionStatus ===
          'active' &&
        userData.planId &&
        (
          !userExpiry ||
          userExpiry > now
        )
      ) {

        const planId =
          userData.planId;

        const price =
          Number(
            userData.subscriptionPrice ||
            0
          );

        return {

          subscriptionId:
            userData.subscriptionId ||
            null,

          planId,

          planName:
            userData.planName ||
            planId,

          name:
            userData.planName ||
            planId,

          price,

          status:
            'active',

          startDate:
            userData.subscriptionStartDate ||
            null,

          expiryDate:
            userData.subscriptionExpiryDate ||
            null,

          isPremium:
            planId !== 'free' &&
            price > 0,

          daysRemaining:
            userExpiry
              ? calculateDaysRemaining(
                  userExpiry
                )
              : 0,

          source:
            userData.subscriptionSource ||
            'user',

          allSubscriptions:
            allSubs
        };
      }
    }


    // ========================================================
    // NO ACTIVE SUBSCRIPTION
    // ========================================================

    const free =
      getFreePlanObject();

    free.allSubscriptions =
      allSubs;

    return free;

  } catch (error) {

    console.error(
      'Error getting user subscription:',
      error
    );

    return getFreePlanObject();
  }
}


// ============================================================
// GET ACTIVE SUBSCRIPTION
// ============================================================

export async function getActiveSubscription(
  userId
) {
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
    activeSub.planId ===
    planId
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
      'User ID is required.'
    );
  }

  if (!planId) {
    throw new Error(
      'Plan ID is required.'
    );
  }


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

    planId,

    planName:
      finalPlanName,

    price:
      finalPrice,

    currency:
      'INR',

    durationDays:
      finalDuration,

    startDate:
      startDateStr,

    expiryDate:
      expiryDateStr,

    validFrom:
      startDateStr,

    validUntil:
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


  // ==========================================================
  // SAVE SUBSCRIPTION
  // ==========================================================

  const subscriptionRef =
    doc(
      db,
      'users',
      targetUserId,
      'subscriptions',
      subId
    );

  await setDoc(
    subscriptionRef,
    subData
  );


  // ==========================================================
  // UPDATE USER SUMMARY
  // ==========================================================

  await setDoc(
    doc(
      db,
      'users',
      targetUserId
    ),
    {

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


  await createAdminLog(
    'SUBSCRIPTION_GRANTED',
    targetUserId,
    {
      subscriptionId:
        subId,

      planId,

      planName:
        finalPlanName,

      price:
        finalPrice
    }
  );


  return {

    success: true,

    subscriptionId:
      subId,

    subscription:
      subData
  };
}


// ============================================================
// ADMIN REVOKE SUBSCRIPTION
// ============================================================

export async function adminRevokeSubscription(
  targetUserId,
  subscriptionId
) {

  if (
    !targetUserId ||
    !subscriptionId
  ) {
    throw new Error(
      'User ID and Subscription ID are required.'
    );
  }


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


  // ==========================================================
  // IMPORTANT:
  // User summary ko bhi expired karo
  // ==========================================================

  await setDoc(
    doc(
      db,
      'users',
      targetUserId
    ),
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


    const expiryDate =
      calculateExpiryDate(
        now,
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
      planName ||
      planId;


    const price =
      Number(
        plan.price || 0
      );


    // ========================================================
    // SUBSCRIPTION DATA
    // ========================================================

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
        now.toISOString(),

      expiryDate:
        expiryDate.toISOString(),

      // Compatibility fields
      validFrom:
        now.toISOString(),

      validUntil:
        expiryDate.toISOString(),

      startDateIso:
        now.toISOString(),

      expiryDateIso:
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


    // ========================================================
    // SAVE SUBSCRIPTION
    // ========================================================

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


    // ========================================================
    // UPDATE USER DOCUMENT
    // ========================================================

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
          now.toISOString(),

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


    // ========================================================
    // GET USER DETAILS
    // ========================================================

    const userSnap =
      await getDoc(
        userRef
      );

    const userData =
      userSnap.exists()
        ? userSnap.data()
        : {};


    // ========================================================
    // CREATE TRANSACTION
    // ========================================================

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


    // ========================================================
    // ADMIN LOG
    // ========================================================

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


    // ========================================================
    // IMPORTANT:
    // Clear local subscription cache
    // ========================================================

    clearSubscriptionCache();


    return {

      success:
        true,

      subscriptionId,

      transactionId:
        transactionRef.id,

      planId,

      planName,

      price,

      startDate:
        now.toISOString(),

      expiryDate:
        expiryDate.toISOString(),

      daysRemaining:
        calculateDaysRemaining(
          expiryDate
        )

    };

  } catch (error) {

    console.error(
      'Subscription activation failed:',
      error
    );

    throw error;
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
      'Admin log failed:',
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

  // First item is always free
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

        userId =
          user?.uid || null;
      }

    } catch {
      userId = null;
    }
  }


  if (!userId) {
    return false;
  }


  const subscription =
    await getActiveSubscription(
      userId
    );


  return Boolean(
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
          🔒
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

          <strong>
            What you get with RankHub Pass Pro:
          </strong>

          <ul style="
            list-style:none;
            padding:0;
            margin:10px 0 0;
            color:#334155;
            line-height:1.8;
          ">
            <li>✓ Unlimited Mock Tests & Re-attempts</li>
            <li>✓ All Practice Sets & PYQ Papers</li>
            <li>✓ Study Notes & Revision PDFs</li>
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
      ?.addEventListener(
        'click',
        closeModal
      );


    modal
      .querySelector(
        '#continueFreeModalBtn'
      )
      ?.addEventListener(
        'click',
        closeModal
      );


    modal.addEventListener(
      'click',
      event => {

        if (
          event.target === modal
        ) {
          closeModal();
        }

      }
    );

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
// CACHE RESET
// ============================================================

export function clearSubscriptionCache() {

  cachedSubscriptionPlans =
    null;

  cachedSystemSettings =
    null;
}


// ============================================================
// REFRESH USER SUBSCRIPTION
// ============================================================

export async function refreshUserSubscription(
  userId =
    auth.currentUser?.uid
) {

  if (!userId) {
    return getFreePlanObject();
  }

  // Always read fresh data
  return await getUserSubscription(
    userId
  );
}
