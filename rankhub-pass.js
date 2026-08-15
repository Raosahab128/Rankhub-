import { auth, db, getCurrentUser } from './firebase.js';

import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

import {
  getUserSubscription,
  getSubscriptionPlans,
  getSystemSettings,
  isPlanActive,
  clearSubscriptionCache
} from './subscription-service.js';


// ============================================================
// PAGE START
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {

  const container =
    document.querySelector('main.page-content');

  if (!container) {
    console.error(
      'Pass page container not found.'
    );
    return;
  }

  await renderPassPage(container);
});


// ============================================================
// DATE FORMAT
// ============================================================

function formatNiceDate(dateInput) {

  if (!dateInput) {
    return '—';
  }

  let d;

  try {

    if (
      dateInput &&
      typeof dateInput.toDate === 'function'
    ) {
      d = dateInput.toDate();

    } else if (
      dateInput instanceof Date
    ) {
      d = dateInput;

    } else {
      d = new Date(dateInput);
    }

  } catch {
    return '—';
  }

  if (
    !d ||
    Number.isNaN(d.getTime())
  ) {
    return '—';
  }

  return d.toLocaleString(
    'en-IN',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }
  );
}


// ============================================================
// GET CURRENT USER
// ============================================================

async function getLoggedInUser() {

  let user = null;

  // ----------------------------------------------------------
  // Firebase Auth
  // ----------------------------------------------------------

  try {

    user =
      auth.currentUser;

  } catch {
    user = null;
  }


  // ----------------------------------------------------------
  // Firebase getCurrentUser fallback
  // ----------------------------------------------------------

  if (!user) {

    try {

      user =
        await getCurrentUser();

    } catch {
      user = null;
    }
  }


  // ----------------------------------------------------------
  // LocalStorage fallback
  // ----------------------------------------------------------

  if (!user) {

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
          user = parsed;
        }
      }

    } catch (error) {

      console.warn(
        'Could not read saved user:',
        error
      );
    }
  }


  return user;
}


// ============================================================
// CHECK SUBSCRIPTION EXPIRY
// ============================================================

function isSubscriptionReallyActive(
  subscription
) {

  if (!subscription) {
    return false;
  }

  if (
    subscription.status !== 'active'
  ) {
    return false;
  }


  const expiryValue =
    subscription.expiryDate ||
    subscription.validUntil;


  if (!expiryValue) {
    return true;
  }


  let expiry;

  try {

    if (
      typeof expiryValue.toDate ===
      'function'
    ) {
      expiry =
        expiryValue.toDate();

    } else {
      expiry =
        new Date(expiryValue);
    }

  } catch {
    return false;
  }


  if (
    Number.isNaN(
      expiry.getTime()
    )
  ) {
    return false;
  }


  return (
    expiry.getTime() >
    Date.now()
  );
}


// ============================================================
// RENDER PASS PAGE
// ============================================================

async function renderPassPage(
  container
) {

  container.innerHTML = `
    <div
      style="
        text-align:center;
        padding:40px;
        color:#64748B;
      "
    >
      Loading RankHub Pass...
    </div>
  `;


  // ==========================================================
  // USER
  // ==========================================================

  const user =
    await getLoggedInUser();


  // ==========================================================
  // SYSTEM SETTINGS
  // ==========================================================

  let settings;

  try {

    settings =
      await getSystemSettings();

  } catch (error) {

    console.error(
      'Settings loading failed:',
      error
    );

    settings = {
      subscriptionSystemEnabled: true
    };
  }


  // ==========================================================
  // PLANS
  // ==========================================================

  let plans = [];

  try {

    plans =
      await getSubscriptionPlans();

  } catch (error) {

    console.error(
      'Plans loading failed:',
      error
    );

    plans = [];
  }


  // ==========================================================
  // SUBSCRIPTION
  // ==========================================================

  let userSub = null;

  if (
    user &&
    user.uid
  ) {

    try {

      userSub =
        await getUserSubscription(
          user.uid
        );

    } catch (error) {

      console.error(
        'Subscription loading failed:',
        error
      );

      userSub = null;
    }
  }


  // ==========================================================
  // FINAL ACTIVE CHECK
  // ==========================================================

  const hasActiveSubscription =
    isSubscriptionReallyActive(
      userSub
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  container.innerHTML = `

    <!-- ======================================================
         HERO
    ======================================================= -->

    <div
      style="
        background:#FFFFFF;
        border:1px solid var(--color-border,#E2E8F0);
        border-radius:20px;
        padding:32px 24px;
        box-shadow:0 2px 8px rgba(0,0,0,0.02);
        margin-bottom:24px;
        text-align:center;
      "
    >

      <span
        style="
          display:inline-block;
          padding:4px 12px;
          background:#FEF2F2;
          color:#DC2626;
          border-radius:999px;
          font-size:.75rem;
          font-weight:800;
          text-transform:uppercase;
          margin-bottom:12px;
        "
      >
        RankHub Pass
      </span>

      <h1
        style="
          font-size:1.75rem;
          font-weight:800;
          color:#0F172A;
          margin-bottom:8px;
        "
      >
        Unlimited RankHub Access
      </h1>

      <p
        style="
          font-size:.9375rem;
          color:#64748B;
          margin-bottom:24px;
        "
      >
        Unlock Mock Tests, Practice Sets, PYQs and Study Notes.
      </p>


      ${
        hasActiveSubscription
          ? `

        <!-- ACTIVE SUBSCRIPTION -->

        <div
          style="
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
          "
        >

          <div>

            <div
              style="
                font-size:.75rem;
                color:#64748B;
                font-weight:700;
                text-transform:uppercase;
              "
            >
              Plan
            </div>

            <div
              style="
                font-size:1.125rem;
                font-weight:800;
                color:#0F172A;
                margin-top:2px;
              "
            >
              ${escapeHtml(
                userSub.planName ||
                userSub.name ||
                userSub.planId ||
                'Active Plan'
              )}
            </div>

          </div>


          <div>

            <div
              style="
                font-size:.75rem;
                color:#64748B;
                font-weight:700;
                text-transform:uppercase;
              "
            >
              Status
            </div>

            <div
              style="
                font-size:1.125rem;
                font-weight:800;
                color:#16A34A;
                margin-top:2px;
              "
            >
              ✓ Active
            </div>

          </div>


          <div>

            <div
              style="
                font-size:.75rem;
                color:#64748B;
                font-weight:700;
                text-transform:uppercase;
              "
            >
              Valid From
            </div>

            <div
              style="
                font-size:.9375rem;
                font-weight:700;
                color:#0F172A;
                margin-top:2px;
              "
            >
              ${formatNiceDate(
                userSub.startDateIso ||
                userSub.startDate ||
                userSub.validFrom
              )}
            </div>

          </div>


          <div>

            <div
              style="
                font-size:.75rem;
                color:#64748B;
                font-weight:700;
                text-transform:uppercase;
              "
            >
              Valid Until
            </div>

            <div
              style="
                font-size:.9375rem;
                font-weight:700;
                color:#0F172A;
                margin-top:2px;
              "
            >
              ${formatNiceDate(
                userSub.expiryDate ||
                userSub.validUntil
              )}
            </div>

          </div>


          <div>

            <div
              style="
                font-size:.75rem;
                color:#64748B;
                font-weight:700;
                text-transform:uppercase;
              "
            >
              Days Remaining
            </div>

            <div
              style="
                font-size:1.125rem;
                font-weight:800;
                color:#2563EB;
                margin-top:2px;
              "
            >
              ${Number(
                userSub.daysRemaining || 0
              )} Days
            </div>

          </div>

        </div>

        <div
          style="
            background:#ECFDF5;
            border:1px solid #BBF7D0;
            color:#166534;
            border-radius:12px;
            padding:14px;
            font-weight:700;
            margin-bottom:24px;
          "
        >
          🔓 Your RankHub content is unlocked.
        </div>

      `
          : userSub &&
            userSub.status === 'expired'
          ? `

        <div
          style="
            background:#FFF1F2;
            border:1px solid #FECDD3;
            border-radius:16px;
            padding:16px;
            margin-bottom:24px;
            color:#9F1239;
            font-weight:600;
          "
        >
          Your subscription has expired.
          Please activate a new plan to continue.
        </div>

      `
          : `

        <div
          style="
            background:#FEF2F2;
            border:1px solid #FCA5A5;
            border-radius:16px;
            padding:16px;
            margin-bottom:24px;
            color:#991B1B;
            font-weight:600;
          "
        >
          ${
            user
              ? 'No active subscription found.'
              : 'Please sign in to activate a subscription.'
          }
        </div>

      `
      }

    </div>


    <!-- ======================================================
         PLANS
    ======================================================= -->

    <div
      style="
        margin-bottom:36px;
      "
    >

      <h2
        style="
          font-size:1.25rem;
          font-weight:800;
          color:#0F172A;
          margin-bottom:16px;
        "
      >
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
          plans.length > 0
            ? plans.map(
                plan =>
                  createPlanCard(
                    plan,
                    userSub,
                    hasActiveSubscription,
                    user
                  )
              ).join('')
            : `
              <div
                style="
                  background:#FFFFFF;
                  border:1px solid #E2E8F0;
                  border-radius:16px;
                  padding:24px;
                  text-align:center;
                  color:#64748B;
                "
              >
                No subscription plans available.
              </div>
            `
        }

      </div>

    </div>


    <!-- ======================================================
         HISTORY
    ======================================================= -->

    ${
      userSub &&
      Array.isArray(
        userSub.allSubscriptions
      ) &&
      userSub.allSubscriptions.length > 0
        ? createSubscriptionHistory(
            userSub.allSubscriptions
          )
        : ''
    }

  `;


  // ==========================================================
  // FREE PLAN BUTTON
  // ==========================================================

  const activateBtn =
    container.querySelector(
      '#activateFreePlanBtn'
    );


  if (activateBtn) {

    activateBtn.addEventListener(
      'click',
      async () => {

        await activateFreePlan(
          container
        );

      }
    );
  }
}


// ============================================================
// CREATE PLAN CARD
// ============================================================

function createPlanCard(
  plan,
  userSub,
  hasActiveSubscription,
  user
) {

  const planId =
    plan.planId ||
    plan.id;


  const price =
    Number(
      plan.price || 0
    );


  const isCurrentPlan =
    hasActiveSubscription &&
    userSub &&
    String(
      userSub.planId || ''
    ) === String(planId);


  return `

    <div
      style="
        background:#FFFFFF;
        border:
          ${
            plan.badge
              ? '2px solid #DC2626'
              : '1px solid #E2E8F0'
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
            <span
              style="
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
              "
            >
              ${escapeHtml(plan.badge)}
            </span>
          `
          : ''
      }


      <div>

        <div
          style="
            font-size:.8125rem;
            font-weight:800;
            color:#64748B;
            text-transform:uppercase;
            margin-bottom:4px;
          "
        >
          ${escapeHtml(
            plan.name || planId
          )}
        </div>


        <div
          style="
            font-size:2rem;
            font-weight:800;
            color:#0F172A;
            margin-bottom:12px;
          "
        >
          ₹${price}

          <span
            style="
              font-size:.875rem;
              color:#64748B;
              font-weight:600;
            "
          >
            / ${getPlanDurationText(plan)}
          </span>

        </div>


        <ul
          style="
            list-style:none;
            padding:0;
            margin:0 0 20px;
            font-size:.875rem;
            color:#334155;
            display:flex;
            flex-direction:column;
            gap:8px;
          "
        >

          ${
            Array.isArray(plan.features)
              ? plan.features
                  .map(
                    feature => `
                      <li
                        style="
                          display:flex;
                          align-items:center;
                          gap:8px;
                        "
                      >
                        ✓
                        <span>
                          ${escapeHtml(feature)}
                        </span>
                      </li>
                    `
                  )
                  .join('')
              : ''
          }

        </ul>

      </div>


      <div>

        ${
          isCurrentPlan
            ? `
              <button
                type="button"
                disabled
                style="
                  width:100%;
                  border:0;
                  border-radius:10px;
                  font-weight:700;
                  background:#16A34A;
                  color:#FFFFFF;
                  padding:12px;
                  cursor:default;
                "
              >
                ✓ Activated
              </button>
            `
            : price === 0
            ? `
              <button
                type="button"
                id="activateFreePlanBtn"
                style="
                  width:100%;
                  border:0;
                  border-radius:10px;
                  font-weight:700;
                  background:#DC2626;
                  color:#FFFFFF;
                  padding:12px;
                  cursor:pointer;
                "
              >
                ${
                  userSub &&
                  userSub.status === 'expired'
                    ? 'Re-activate Free Plan'
                    : 'Activate Free Plan'
                }
              </button>
            `
            : `
              <button
                type="button"
                class="paid-plan-btn"
                data-plan-id="${escapeHtml(
                  planId
                )}"
                style="
                  width:100%;
                  border-radius:10px;
                  font-weight:700;
                  background:#DC2626;
                  color:#FFFFFF;
                  border:0;
                  padding:12px;
                  cursor:pointer;
                "
              >
                Get ${escapeHtml(
                  plan.name || 'Plan'
                )}
              </button>
            `
        }

      </div>

    </div>

  `;
}


// ============================================================
// PLAN DURATION TEXT
// ============================================================

function getPlanDurationText(
  plan
) {

  const days =
    Number(
      plan.durationDays ||
      plan.duration ||
      0
    );


  if (days >= 365) {
    return 'Year';
  }

  if (days >= 180) {
    return '6 Months';
  }

  if (days >= 30) {
    return `${days} Days`;
  }

  if (days > 0) {
    return `${days} Days`;
  }

  return 'Plan';
}


// ============================================================
// SUBSCRIPTION HISTORY
// ============================================================

function createSubscriptionHistory(
  subscriptions
) {

  return `

    <div
      style="
        background:#FFFFFF;
        border:1px solid #E2E8F0;
        border-radius:16px;
        padding:24px;
        margin-bottom:36px;
      "
    >

      <h2
        style="
          font-size:1.25rem;
          font-weight:800;
          color:#0F172A;
          margin-bottom:16px;
        "
      >
        Subscription History
      </h2>


      <div
        style="
          display:flex;
          flex-direction:column;
          gap:12px;
        "
      >

        ${subscriptions
          .map(
            sub => {

              const active =
                isSubscriptionReallyActive(
                  sub
                );

              return `

                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    padding:16px;
                    background:#F8FAFC;
                    border:1px solid #E2E8F0;
                    border-radius:12px;
                    flex-wrap:wrap;
                    gap:12px;
                  "
                >

                  <div>

                    <div
                      style="
                        font-weight:800;
                        color:#0F172A;
                      "
                    >
                      ${escapeHtml(
                        sub.planName ||
                        sub.planId ||
                        'Plan'
                      )}
                    </div>

                    <div
                      style="
                        font-size:.8125rem;
                        color:#64748B;
                        margin-top:3px;
                      "
                    >
                      ${
                        formatNiceDate(
                          sub.startDateIso ||
                          sub.startDate ||
                          sub.validFrom
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


                  <div
                    style="
                      display:flex;
                      align-items:center;
                      gap:12px;
                    "
                  >

                    <span
                      style="
                        font-weight:800;
                        color:#0F172A;
                      "
                    >
                      ₹${Number(
                        sub.price || 0
                      )}
                    </span>


                    <span
                      style="
                        padding:4px 10px;
                        border-radius:999px;
                        font-size:.75rem;
                        font-weight:800;
                        text-transform:uppercase;
                        background:
                          ${
                            active
                              ? '#DCFCE7'
                              : '#F1F5F9'
                          };
                        color:
                          ${
                            active
                              ? '#16A34A'
                              : '#64748B'
                          };
                      "
                    >
                      ${
                        active
                          ? 'Active'
                          : 'Expired'
                      }
                    </span>

                  </div>

                </div>

              `;
            }
          )
          .join('')}

      </div>

    </div>

  `;
}


// ============================================================
// ACTIVATE FREE PLAN
// ============================================================

async function activateFreePlan(
  container
) {

  let user =
    await getLoggedInUser();


  if (
    !user ||
    !user.uid
  ) {

    alert(
      'Please sign in to activate the Free Plan.'
    );

    window.location.href =
      './signin.html';

    return;
  }


  const button =
    container.querySelector(
      '#activateFreePlanBtn'
    );


  if (button) {

    button.disabled = true;

    button.textContent =
      'Activating...';
  }


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


    const subscriptionRef =
      doc(
        db,
        'users',
        user.uid,
        'subscriptions',
        'free_active'
      );


    const existingSnap =
      await getDoc(
        subscriptionRef
      );


    const subData = {

      subscriptionId:
        'free_active',

      userId:
        user.uid,

      planId:
        'free',

      planName:
        'Free',

      name:
        'Free',

      price:
        0,

      currency:
        'INR',

      duration:
        7,

      durationUnit:
        'day',

      durationDays:
        7,

      status:
        'active',

      source:
        'free_launch',

      startDate:
        now.toISOString(),

      startDateIso:
        now.toISOString(),

      validFrom:
        now.toISOString(),

      validFromIso:
        now.toISOString(),

      expiryDate:
        expiry.toISOString(),

      expiryDateIso:
        expiry.toISOString(),

      validUntil:
        expiry.toISOString(),

      updatedAt:
        serverTimestamp()

    };


    if (
      !existingSnap.exists()
    ) {

      subData.createdAt =
        serverTimestamp();
    }


    await setDoc(
      subscriptionRef,
      subData,
      {
        merge: true
      }
    );


    // ========================================================
    // UPDATE USER SUMMARY
    // ========================================================

    await setDoc(
      doc(
        db,
        'users',
        user.uid
      ),
      {

        planId:
          'free',

        planName:
          'Free',

        subscriptionStatus:
          'active',

        subscriptionPrice:
          0,

        subscriptionStartDate:
          now.toISOString(),

        subscriptionExpiryDate:
          expiry.toISOString(),

        subscriptionId:
          'free_active',

        subscriptionSource:
          'free_launch',

        updatedAt:
          serverTimestamp()

      },
      {
        merge: true
      }
    );


    // ========================================================
    // CACHE CLEAR
    // ========================================================

    clearSubscriptionCache();


    localStorage.setItem(
      'rankhub_free_plan_activated_' +
      user.uid,
      'true'
    );


    alert(
      'Free Plan activated successfully! Access is available for 7 days.'
    );


    await renderPassPage(
      container
    );

  } catch (error) {

    console.error(
      'Free Plan activation failed:',
      error
    );


    alert(
      'Free Plan activate nahi ho paya.\n\n' +
      (error?.message ||
        'Unknown error')
    );


    if (button) {

      button.disabled =
        false;

      button.textContent =
        'Activate Free Plan';
    }
  }
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }


  return String(value)
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}
