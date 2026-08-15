import { auth, db, getCurrentUser } from './firebase.js';

import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

import {
  getUserSubscription,
  getSubscriptionPlans,
  getSystemSettings,
  getActiveSubscription
} from './subscription-service.js';


document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('main.page-content');

  if (!container) {
    console.error('main.page-content not found');
    return;
  }

  await renderPassPage(container);
});


/* =========================================================
   DATE HELPERS
========================================================= */

function formatNiceDate(dateInput) {
  if (!dateInput) return '—';

  let d;

  try {
    if (dateInput?.toDate) {
      d = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      d = dateInput;
    } else {
      d = new Date(dateInput);
    }
  } catch (e) {
    return '—';
  }

  if (isNaN(d.getTime())) {
    return '—';
  }

  const day = d.getDate();

  const month = d.toLocaleString('en-US', {
    month: 'long'
  });

  const year = d.getFullYear();

  let hours = d.getHours();

  const minutes = String(d.getMinutes()).padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;

  if (hours === 0) {
    hours = 12;
  }

  const strHours = String(hours).padStart(2, '0');

  return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
}


/* =========================================================
   GET CURRENT USER
========================================================= */

async function getLoggedInUser() {
  let user = auth.currentUser;

  if (user) {
    return user;
  }

  try {
    const firebaseUser = await getCurrentUser();

    if (firebaseUser) {
      return firebaseUser;
    }
  } catch (e) {
    console.warn('getCurrentUser failed:', e);
  }

  try {
    const saved = localStorage.getItem('rankhub_user');

    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed && parsed.uid) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Local user read failed:', e);
  }

  return null;
}


/* =========================================================
   GET ACTIVE FREE PLAN DIRECTLY FROM FIRESTORE
========================================================= */

async function getFreePlanDirectly(uid) {
  if (!uid) return null;

  try {
    const ref = doc(
      db,
      'users',
      uid,
      'subscriptions',
      'free_active'
    );

    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();

    if (!data) {
      return null;
    }

    /*
      Check status
    */
    if (data.status !== 'active') {
      return null;
    }

    /*
      Check expiry
    */
    const expiryValue =
      data.expiryDate ||
      data.validUntil;

    if (expiryValue) {
      let expiryDate;

      try {
        if (expiryValue?.toDate) {
          expiryDate = expiryValue.toDate();
        } else {
          expiryDate = new Date(expiryValue);
        }
      } catch (e) {
        expiryDate = null;
      }

      if (
        expiryDate &&
        !isNaN(expiryDate.getTime()) &&
        expiryDate.getTime() <= Date.now()
      ) {
        return null;
      }
    }

    return {
      id: snap.id,
      ...data,
      isPremium: true,
      isActive: true
    };

  } catch (error) {
    console.error(
      'Error checking free subscription:',
      error
    );

    return null;
  }
}


/* =========================================================
   CHECK WHETHER PLAN IS REALLY ACTIVE
========================================================= */

function checkPlanIsActive(activeSub, userSub, planId) {
  const normalizedPlanId =
    String(planId || '').trim().toLowerCase();

  /*
    First check activeSub returned by subscription service
  */
  if (activeSub) {
    const activePlanId = String(
      activeSub.planId ||
      activeSub.id ||
      ''
    )
      .trim()
      .toLowerCase();

    if (
      activePlanId === normalizedPlanId &&
      activeSub.status === 'active'
    ) {
      return true;
    }
  }

  /*
    Then check userSub
  */
  if (userSub) {
    const userPlanId = String(
      userSub.planId ||
      userSub.id ||
      ''
    )
      .trim()
      .toLowerCase();

    if (
      userPlanId === normalizedPlanId &&
      userSub.status === 'active'
    ) {
      return true;
    }
  }

  /*
    Finally check allSubscriptions
  */
  if (
    userSub &&
    Array.isArray(userSub.allSubscriptions)
  ) {
    const found = userSub.allSubscriptions.find(sub => {
      if (!sub) return false;

      const subPlanId = String(
        sub.planId ||
        sub.id ||
        ''
      )
        .trim()
        .toLowerCase();

      return (
        subPlanId === normalizedPlanId &&
        sub.status === 'active'
      );
    });

    if (found) {
      return true;
    }
  }

  return false;
}


/* =========================================================
   GET PLAN DURATION LABEL
========================================================= */

function getDurationLabel(plan) {
  const days = Number(plan?.durationDays || 0);

  if (days >= 365) {
    return 'Year';
  }

  if (days >= 180) {
    return '6 Months';
  }

  if (days === 30) {
    return '30 Days';
  }

  if (days === 14) {
    return '14 Days';
  }

  if (days === 7) {
    return '7 Days';
  }

  if (days === 1) {
    return '1 Day';
  }

  if (days > 0) {
    return `${days} Days`;
  }

  return 'Plan';
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/* =========================================================
   RENDER PAGE
========================================================= */

async function renderPassPage(container) {

  container.innerHTML = `
    <div style="
      text-align:center;
      padding:40px;
      color:#64748B;
      font-weight:600;
    ">
      Loading RankHub Pass Pro...
    </div>
  `;


  /* -------------------------------------------------------
     USER
  ------------------------------------------------------- */

  const user = await getLoggedInUser();


  /* -------------------------------------------------------
     LOAD DATA
  ------------------------------------------------------- */

  let settings = {};
  let plans = [];
  let userSub = null;
  let activeSub = null;
  let directFreeSub = null;


  try {
    settings = await getSystemSettings();
  } catch (e) {
    console.warn('System settings failed:', e);
  }


  try {
    plans = await getSubscriptionPlans();
  } catch (e) {
    console.error('Subscription plans failed:', e);
    plans = [];
  }


  if (user?.uid) {

    try {
      userSub = await getUserSubscription(user.uid);
    } catch (e) {
      console.error(
        'getUserSubscription failed:',
        e
      );
    }


    try {
      activeSub = await getActiveSubscription(user.uid);
    } catch (e) {
      console.error(
        'getActiveSubscription failed:',
        e
      );
    }


    /*
      IMPORTANT:
      Directly verify Free Plan from Firestore.
      This fixes the green Activated button issue
      even if subscription-service returns incomplete data.
    */

    directFreeSub =
      await getFreePlanDirectly(user.uid);


    /*
      If direct Free Plan exists, use it as active subscription.
    */

    if (directFreeSub) {
      activeSub = {
        ...(activeSub || {}),
        ...directFreeSub,
        planId: 'free',
        status: 'active',
        isPremium: true
      };
    }
  }


  /* -------------------------------------------------------
     FALLBACK PLANS
  ------------------------------------------------------- */

  if (!Array.isArray(plans)) {
    plans = [];
  }


  /* -------------------------------------------------------
     RENDER HTML
  ------------------------------------------------------- */

  container.innerHTML = `

    <!-- =====================================================
         HERO
    ====================================================== -->

    <div style="
      background:#FFFFFF;
      border:1px solid var(--color-border);
      border-radius:20px;
      padding:32px 24px;
      box-shadow:0 2px 8px rgba(0,0,0,0.02);
      margin-bottom:24px;
      text-align:center;
    ">

      <span style="
        display:inline-block;
        padding:4px 12px;
        background:#FEF2F2;
        color:#DC2626;
        border-radius:999px;
        font-size:0.75rem;
        font-weight:800;
        text-transform:uppercase;
        margin-bottom:12px;
      ">
        RankHub Pro Pass
      </span>

      <h1 style="
        font-size:1.75rem;
        font-weight:800;
        color:#0F172A;
        margin:0 0 8px;
      ">
        Unlimited Access to 500+ Test Series
      </h1>

      <p style="
        font-size:0.9375rem;
        color:#64748B;
        margin:0 0 24px;
      ">
        Unlock all SSC, State Police, Banking, Railway & Teaching
        exam mock papers & practice sets.
      </p>


      ${
        user &&
        userSub &&
        userSub.status === 'active'
          ? `

            <div style="
              background:#F8FAFC;
              border:1px solid #E2E8F0;
              border-radius:16px;
              padding:20px;
              margin-bottom:24px;
              text-align:left;
              display:grid;
              grid-template-columns:
                repeat(auto-fit,minmax(180px,1fr));
              gap:16px;
            ">

              <div>
                <div style="
                  font-size:.75rem;
                  color:#64748B;
                  font-weight:700;
                  text-transform:uppercase;
                ">
                  Plan
                </div>

                <div style="
                  font-size:1.125rem;
                  font-weight:800;
                  color:#0F172A;
                  margin-top:2px;
                ">
                  ${escapeHtml(
                    userSub.planName ||
                    userSub.name ||
                    'Free'
                  )}
                </div>
              </div>


              <div>
                <div style="
                  font-size:.75rem;
                  color:#64748B;
                  font-weight:700;
                  text-transform:uppercase;
                ">
                  Status
                </div>

                <div style="
                  font-size:1.125rem;
                  font-weight:800;
                  color:#16A34A;
                  margin-top:2px;
                  text-transform:capitalize;
                ">
                  Active
                </div>
              </div>


              <div>
                <div style="
                  font-size:.75rem;
                  color:#64748B;
                  font-weight:700;
                  text-transform:uppercase;
                ">
                  Valid From
                </div>

                <div style="
                  font-size:.9375rem;
                  font-weight:700;
                  color:#0F172A;
                  margin-top:2px;
                ">
                  ${
                    userSub.startDate
                      ? formatNiceDate(
                          userSub.startDateIso ||
                          userSub.startDate
                        )
                      : '—'
                  }
                </div>
              </div>


              <div>
                <div style="
                  font-size:.75rem;
                  color:#64748B;
                  font-weight:700;
                  text-transform:uppercase;
                ">
                  Valid Until
                </div>

                <div style="
                  font-size:.9375rem;
                  font-weight:700;
                  color:#0F172A;
                  margin-top:2px;
                ">
                  ${
                    userSub.expiryDate
                      ? formatNiceDate(
                          userSub.expiryDate
                        )
                      : '—'
                  }
                </div>
              </div>


              <div>
                <div style="
                  font-size:.75rem;
                  color:#64748B;
                  font-weight:700;
                  text-transform:uppercase;
                ">
                  Days Remaining
                </div>

                <div style="
                  font-size:1.125rem;
                  font-weight:800;
                  color:#2563EB;
                  margin-top:2px;
                ">
                  ${
                    userSub.daysRemaining ??
                    '—'
                  }
                  ${
                    userSub.daysRemaining !== undefined
                      ? ' Days'
                      : ''
                  }
                </div>
              </div>

            </div>

          `
          : userSub &&
            userSub.status === 'expired'
          ? `

            <div style="
              background:#FFF1F2;
              border:1px solid #FECDD3;
              border-radius:16px;
              padding:16px;
              margin-bottom:24px;
              font-size:.875rem;
              color:#9F1239;
              font-weight:600;
            ">
              Your Free Plan has expired.
              Please activate a plan to continue access.
            </div>

          `
          : `

            <div style="
              background:#FEF2F2;
              border:1px solid #FCA5A5;
              border-radius:16px;
              padding:16px;
              margin-bottom:24px;
              font-size:.875rem;
              color:#991B1B;
              font-weight:600;
            ">
              ${
                user
                  ? 'No active subscription found. Activate the Free Plan below.'
                  : 'Please sign in to view your personalized subscription status.'
              }
            </div>

          `
      }

    </div>


    <!-- =====================================================
         PLANS
    ====================================================== -->

    <div style="margin-bottom:36px;">

      <h2 style="
        font-size:1.25rem;
        font-weight:800;
        color:#0F172A;
        margin:0 0 16px;
      ">
        Choose Your Subscription Plan
      </h2>


      <div
        id="plansGrid"
        style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(240px,1fr));
          gap:20px;
        "
      >

        ${
          plans.length
            ? plans.map(plan => {

                /*
                  IMPORTANT:
                  Multiple checks are used here.
                */

                const normalActive =
                  checkPlanIsActive(
                    activeSub,
                    userSub,
                    plan.planId
                  );


                const freeDirectActive =
                  plan.planId === 'free' &&
                  !!directFreeSub;


                const isActive =
                  normalActive ||
                  freeDirectActive;


                return `

                  <div
                    data-plan-id="${escapeHtml(
                      plan.planId
                    )}"
                    style="
                      background:#FFFFFF;
                      border:${
                        plan.badge
                          ? '2px solid #DC2626'
                          : '1px solid var(--color-border)'
                      };
                      border-radius:16px;
                      padding:24px;
                      position:relative;
                      box-shadow:
                        0 4px 12px rgba(0,0,0,.03);
                      display:flex;
                      flex-direction:column;
                      justify-content:space-between;
                    "
                  >

                    ${
                      plan.badge
                        ? `
                          <span style="
                            position:absolute;
                            top:-12px;
                            right:20px;
                            background:#DC2626;
                            color:#FFFFFF;
                            font-size:.7rem;
                            font-weight:800;
                            padding:3px 10px;
                            border-radius:999px;
                            text-transform:uppercase;
                          ">
                            ${escapeHtml(plan.badge)}
                          </span>
                        `
                        : ''
                    }


                    <div>

                      <div style="
                        font-size:.8125rem;
                        font-weight:800;
                        color:#64748B;
                        text-transform:uppercase;
                        margin-bottom:4px;
                      ">
                        ${escapeHtml(plan.name)}
                      </div>


                      <div style="
                        font-size:2rem;
                        font-weight:800;
                        color:#0F172A;
                        margin-bottom:12px;
                      ">
                        ₹${escapeHtml(plan.price)}

                        <span style="
                          font-size:.875rem;
                          color:#64748B;
                          font-weight:600;
                        ">
                          /
                          ${getDurationLabel(plan)}
                        </span>
                      </div>


                      <ul style="
                        list-style:none;
                        padding:0;
                        margin:0 0 20px;
                        font-size:.875rem;
                        color:#334155;
                        display:flex;
                        flex-direction:column;
                        gap:8px;
                      ">

                        ${
                          Array.isArray(plan.features)
                            ? plan.features
                                .map(
                                  feature => `
                                    <li style="
                                      display:flex;
                                      align-items:center;
                                      gap:8px;
                                    ">
                                      <span style="
                                        color:#16A34A;
                                        font-weight:900;
                                      ">
                                        ✓
                                      </span>

                                      ${escapeHtml(feature)}
                                    </li>
                                  `
                                )
                                .join('')
                            : ''
                        }

                      </ul>

                    </div>


                    <!-- BUTTON -->

                    <div>

                      ${
                        isActive
                          ? `

                            <button
                              type="button"
                              class="plan-activated-btn"
                              disabled
                              style="
                                width:100%;
                                border-radius:10px;
                                font-weight:800;
                                background:#16A34A !important;
                                color:#FFFFFF !important;
                                border:1px solid #16A34A !important;
                                padding:12px;
                                cursor:default;
                                opacity:1 !important;
                              "
                            >
                              ✓ Activated
                            </button>

                          `
                          : plan.price === 0
                          ? `

                            <button
                              type="button"
                              id="activateFreePlanBtn"
                              class="btn-primary"
                              style="
                                width:100%;
                                border-radius:10px;
                                font-weight:700;
                                background:#DC2626;
                                color:#FFFFFF;
                                padding:12px;
                                cursor:pointer;
                                border:none;
                              "
                            >
                              Activate Free Plan
                            </button>

                          `
                          : `

                            <button
                              type="button"
                              class="btn-secondary"
                              data-coming-plan="${escapeHtml(
                                plan.name
                              )}"
                              style="
                                width:100%;
                                border-radius:10px;
                                font-weight:700;
                                background:#F1F5F9;
                                color:#64748B;
                                border:1px solid #CBD5E1;
                                padding:12px;
                                cursor:pointer;
                              "
                            >
                              Coming Soon
                            </button>

                          `
                      }

                    </div>

                  </div>

                `;

              }).join('')
            : `

              <div style="
                background:#FFFFFF;
                border:1px solid #E2E8F0;
                border-radius:16px;
                padding:30px;
                text-align:center;
                color:#64748B;
              ">
                No subscription plans available.
              </div>

            `
        }

      </div>

    </div>


    <!-- =====================================================
         HISTORY
    ====================================================== -->

    ${
      userSub &&
      Array.isArray(userSub.allSubscriptions) &&
      userSub.allSubscriptions.length > 0
        ? `

          <div style="
            background:#FFFFFF;
            border:1px solid var(--color-border);
            border-radius:16px;
            padding:24px;
            box-shadow:0 2px 8px rgba(0,0,0,.02);
            margin-bottom:36px;
          ">

            <h2 style="
              font-size:1.25rem;
              font-weight:800;
              color:#0F172A;
              margin:0 0 16px;
            ">
              Subscription History
            </h2>


            <div style="
              display:flex;
              flex-direction:column;
              gap:12px;
            ">

              ${userSub.allSubscriptions
                .map(sub => `

                  <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    padding:16px;
                    background:#F8FAFC;
                    border:1px solid #E2E8F0;
                    border-radius:12px;
                    flex-wrap:wrap;
                    gap:12px;
                  ">

                    <div>

                      <div style="
                        font-weight:800;
                        color:#0F172A;
                        font-size:1rem;
                      ">
                        ${escapeHtml(
                          sub.planName ||
                          sub.planId ||
                          'Plan'
                        )}
                      </div>


                      <div style="
                        font-size:.8125rem;
                        color:#64748B;
                        margin-top:2px;
                      ">
                        ${
                          formatNiceDate(
                            sub.startDateIso ||
                            sub.startDate ||
                            sub.validFromIso
                          )
                        }

                        →

                        ${
                          formatNiceDate(
                            sub.expiryDate ||
                            sub.validUntil
                          )
                        }
                      </div>

                    </div>


                    <div style="
                      display:flex;
                      align-items:center;
                      gap:12px;
                    ">

                      <span style="
                        font-weight:800;
                        color:#0F172A;
                      ">
                        ₹${escapeHtml(
                          sub.price || 0
                        )}
                      </span>


                      <span style="
                        padding:4px 10px;
                        border-radius:999px;
                        font-size:.75rem;
                        font-weight:800;
                        text-transform:uppercase;

                        background:${
                          sub.status === 'active'
                            ? '#DCFCE7'
                            : '#F1F5F9'
                        };

                        color:${
                          sub.status === 'active'
                            ? '#16A34A'
                            : '#64748B'
                        };
                      ">
                        ${
                          sub.status === 'active'
                            ? 'Active'
                            : 'Expired'
                        }
                      </span>

                    </div>

                  </div>

                `)
                .join('')}

            </div>

          </div>

        `
        : ''
    }

  `;


  /* =======================================================
     COMING SOON BUTTONS
  ======================================================== */

  container
    .querySelectorAll('[data-coming-plan]')
    .forEach(button => {

      button.addEventListener('click', () => {

        const planName =
          button.getAttribute(
            'data-coming-plan'
          ) || 'This';

        alert(
          `${planName} plan is coming soon.`
        );

      });

    });


  /* =======================================================
     FREE PLAN BUTTON
  ======================================================== */

  const activateBtn =
    container.querySelector(
      '#activateFreePlanBtn'
    );


  if (activateBtn) {

    activateBtn.addEventListener(
      'click',
      async () => {

        await activateFreePlan(
          container,
          activateBtn
        );

      }
    );

  }
}


/* =========================================================
   ACTIVATE FREE PLAN
========================================================= */

async function activateFreePlan(
  container,
  button
) {

  let currentUser =
    await getLoggedInUser();


  /* -------------------------------------------------------
     LOGIN CHECK
  ------------------------------------------------------- */

  if (
    !currentUser ||
    !currentUser.uid
  ) {

    alert(
      'Please sign in to activate the Free Plan.'
    );

    window.location.href =
      './signin.html';

    return;
  }


  /* -------------------------------------------------------
     PREVENT DOUBLE CLICK
  ------------------------------------------------------- */

  if (button.dataset.loading === 'true') {
    return;
  }

  button.dataset.loading = 'true';

  button.disabled = true;

  button.textContent =
    'Activating...';

  button.style.opacity = '0.7';


  try {

    const now = new Date();


    /*
      FREE PLAN = 7 DAYS
    */

    const expiry =
      new Date(
        now.getTime() +
        7 *
        24 *
        60 *
        60 *
        1000
      );


    const uid =
      currentUser.uid;


    const subscriptionData = {

      userId: uid,

      planId: 'free',

      planName: 'Free',

      name: 'Free',

      price: 0,

      durationDays: 7,

      status: 'active',

      source: 'free_launch',

      isPremium: true,

      isActive: true,

      validFrom: serverTimestamp(),

      validFromIso:
        now.toISOString(),

      startDate:
        serverTimestamp(),

      startDateIso:
        now.toISOString(),

      validUntil:
        expiry.toISOString(),

      expiryDate:
        expiry.toISOString(),

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()

    };


    /* -----------------------------------------------------
       SAVE ACTIVE FREE SUBSCRIPTION
    ----------------------------------------------------- */

    await setDoc(
      doc(
        db,
        'users',
        uid,
        'subscriptions',
        'free_active'
      ),
      subscriptionData,
      {
        merge: true
      }
    );


    /* -----------------------------------------------------
       LOCAL CACHE
    ----------------------------------------------------- */

    localStorage.setItem(
      'rankhub_free_plan_activated_' + uid,
      'true'
    );


    localStorage.setItem(
      'rankhub_free_plan_expiry_' + uid,
      expiry.toISOString()
    );


    /* -----------------------------------------------------
       IMPORTANT:
       Change button immediately.
    ----------------------------------------------------- */

    button.textContent =
      '✓ Activated';

    button.style.background =
      '#16A34A';

    button.style.color =
      '#FFFFFF';

    button.style.border =
      '1px solid #16A34A';

    button.style.opacity =
      '1';

    button.style.cursor =
      'default';

    button.disabled =
      true;


    /*
      Small delay, then reload page data.
      This makes sure Firestore + subscription service
      are both synchronized.
    */

    await new Promise(resolve =>
      setTimeout(resolve, 300)
    );


    alert(
      'Free Plan activated successfully! Full RankHub access is now unlocked for 7 days.'
    );


    /*
      Re-render page.
      Direct Firestore check will detect
      free_active and keep button green.
    */

    await renderPassPage(container);


  } catch (error) {

    console.error(
      'Free Plan activation error:',
      error
    );


    /*
      Try again with plain ISO strings.
      This is a fallback for environments where
      serverTimestamp causes an issue.
    */

    try {

      const now =
        new Date();

      const expiry =
        new Date(
          now.getTime() +
          7 *
          24 *
          60 *
          60 *
          1000
        );


      const uid =
        currentUser.uid;


      await setDoc(
        doc(
          db,
          'users',
          uid,
          'subscriptions',
          'free_active'
        ),
        {
          userId: uid,
          planId: 'free',
          planName: 'Free',
          name: 'Free',
          price: 0,
          durationDays: 7,
          status: 'active',
          source: 'free_launch',
          isPremium: true,
          isActive: true,

          validFromIso:
            now.toISOString(),

          startDateIso:
            now.toISOString(),

          validUntil:
            expiry.toISOString(),

          expiryDate:
            expiry.toISOString(),

          updatedAt:
            now.toISOString(),

          createdAt:
            now.toISOString()
        },
        {
          merge: true
        }
      );


      localStorage.setItem(
        'rankhub_free_plan_activated_' + uid,
        'true'
      );


      localStorage.setItem(
        'rankhub_free_plan_expiry_' + uid,
        expiry.toISOString()
      );


      /*
        Immediate green state.
      */

      button.textContent =
        '✓ Activated';

      button.style.background =
        '#16A34A';

      button.style.color =
        '#FFFFFF';

      button.style.border =
        '1px solid #16A34A';

      button.style.opacity =
        '1';

      button.disabled =
        true;


      alert(
        'Free Plan activated successfully! Full RankHub access is now unlocked for 7 days.'
      );


      await renderPassPage(container);


    } catch (fallbackError) {

      console.error(
        'Free Plan fallback failed:',
        fallbackError
      );


      button.disabled =
        false;

      button.dataset.loading =
        'false';

      button.textContent =
        'Activate Free Plan';

      button.style.background =
        '#DC2626';

      button.style.opacity =
        '1';


      alert(
        'Free Plan activate nahi ho paya. Please check your Firebase Firestore rules.'
      );

    }

  }

}
