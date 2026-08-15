import { auth, db } from './firebase.js';

import {
  onAuthStateChanged
} from 'firebase/auth';

import {
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

import {
  getUserSubscription,
  getSubscriptionPlans,
  getSystemSettings
} from './subscription-service.js';


// ======================================================
// RANKHUB PASS
// FREE PLAN ACTIVATION - FINAL FIXED VERSION
// ======================================================


// ------------------------------------------------------
// Date Formatter
// ------------------------------------------------------

function formatNiceDate(dateInput) {
  if (!dateInput) return '—';

  let d;

  try {
    if (dateInput && typeof dateInput.toDate === 'function') {
      d = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      d = dateInput;
    } else {
      d = new Date(dateInput);
    }
  } catch (error) {
    return '—';
  }

  if (!d || isNaN(d.getTime())) {
    return '—';
  }

  const day = d.getDate();

  const month = d.toLocaleString('en-US', {
    month: 'long'
  });

  const year = d.getFullYear();

  let hours = d.getHours();

  const minutes = String(
    d.getMinutes()
  ).padStart(2, '0');

  const ampm = hours >= 12
    ? 'PM'
    : 'AM';

  hours = hours % 12;

  if (hours === 0) {
    hours = 12;
  }

  const strHours = String(hours).padStart(2, '0');

  return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
}


// ------------------------------------------------------
// Get Current User
// ------------------------------------------------------

function getSavedUser() {
  try {
    const saved = localStorage.getItem('rankhub_user');

    if (!saved) {
      return null;
    }

    const user = JSON.parse(saved);

    if (user && user.uid) {
      return user;
    }
  } catch (error) {
    console.warn(
      'Unable to read saved RankHub user:',
      error
    );
  }

  return null;
}


async function getCurrentRankHubUser() {

  // Firebase authenticated user
  if (auth.currentUser && auth.currentUser.uid) {
    return auth.currentUser;
  }

  // Local saved user fallback
  const savedUser = getSavedUser();

  if (savedUser && savedUser.uid) {
    return savedUser;
  }

  return null;
}


// ------------------------------------------------------
// Check Subscription Active
// ------------------------------------------------------

function checkFreePlanActive(userSub) {

  if (!userSub) {
    return false;
  }

  if (
    userSub.planId !== 'free' &&
    userSub.planName !== 'Free'
  ) {
    return false;
  }

  if (userSub.status !== 'active') {
    return false;
  }

  const expiryValue =
    userSub.expiryDate ||
    userSub.validUntil;

  if (expiryValue) {

    let expiry;

    try {

      if (
        expiryValue &&
        typeof expiryValue.toDate === 'function'
      ) {
        expiry = expiryValue.toDate();
      } else {
        expiry = new Date(expiryValue);
      }

    } catch (error) {
      return false;
    }

    if (
      !expiry ||
      isNaN(expiry.getTime())
    ) {
      return false;
    }

    if (expiry <= new Date()) {
      return false;
    }
  }

  return true;
}


// ------------------------------------------------------
// Main DOM Ready
// ------------------------------------------------------

document.addEventListener(
  'DOMContentLoaded',
  () => {

    const container =
      document.querySelector(
        'main.page-content'
      );

    if (!container) {
      return;
    }


    // --------------------------------------------------
    // Wait for Firebase Auth
    // --------------------------------------------------

    let rendered = false;

    const renderOnce = async () => {

      if (rendered) {
        return;
      }

      rendered = true;

      await renderPassPage(container);
    };


    // Firebase auth state
    onAuthStateChanged(
      auth,
      async () => {
        await renderOnce();
      }
    );


    // Safety fallback
    setTimeout(
      async () => {
        await renderOnce();
      },
      1200
    );

  }
);


// ======================================================
// RENDER PASS PAGE
// ======================================================

async function renderPassPage(container) {

  container.innerHTML = `
    <div style="
      text-align:center;
      padding:40px;
      color:#64748B;
      font-weight:600;
    ">
      Loading RankHub Pass...
    </div>
  `;


  // ----------------------------------------------------
  // Get user
  // ----------------------------------------------------

  const user =
    await getCurrentRankHubUser();


  // ----------------------------------------------------
  // Get plans/settings
  // ----------------------------------------------------

  let plans = [];

  try {
    plans = await getSubscriptionPlans();
  } catch (error) {

    console.error(
      'Unable to load subscription plans:',
      error
    );

    plans = [];
  }


  try {
    await getSystemSettings();
  } catch (error) {
    console.warn(
      'Unable to load system settings:',
      error
    );
  }


  // ----------------------------------------------------
  // Get User Subscription
  // ----------------------------------------------------

  let userSub = null;

  if (user && user.uid) {

    try {

      userSub =
        await getUserSubscription(
          user.uid
        );

    } catch (error) {

      console.error(
        'Unable to load user subscription:',
        error
      );

      userSub = null;
    }
  }


  // ----------------------------------------------------
  // IMPORTANT:
  // Determine active status directly from subscription
  // ----------------------------------------------------

  const freePlanActive =
    checkFreePlanActive(userSub);


  // ----------------------------------------------------
  // Active Free Subscription
  // ----------------------------------------------------

  const activeFreeSub =
    freePlanActive
      ? userSub
      : null;


  // ====================================================
  // PAGE UI
  // ====================================================

  container.innerHTML = `

    <!-- ============================================= -->
    <!-- HEADER -->
    <!-- ============================================= -->

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
        background:${freePlanActive ? '#DCFCE7' : '#FEF2F2'};
        color:${freePlanActive ? '#15803D' : '#DC2626'};
        border-radius:999px;
        font-size:0.75rem;
        font-weight:800;
        text-transform:uppercase;
        margin-bottom:12px;
      ">
        ${freePlanActive
          ? '✓ RankHub Pass Active'
          : 'RankHub Pro Pass'}
      </span>


      <h1 style="
        font-size:1.75rem;
        font-weight:800;
        color:#0F172A;
        margin-bottom:8px;
      ">
        Unlimited Access to 500+ Test Series
      </h1>


      <p style="
        font-size:0.9375rem;
        color:#64748B;
        margin-bottom:24px;
      ">
        Unlock all SSC, State Police, Banking, Railway & Teaching exam mock papers & practice sets.
      </p>


      ${
        activeFreeSub
          ? `

            <!-- ===================================== -->
            <!-- ACTIVE SUBSCRIPTION -->
            <!-- ===================================== -->

            <div style="
              background:#F0FDF4;
              border:2px solid #16A34A;
              border-radius:16px;
              padding:20px;
              margin-bottom:24px;
              text-align:left;
              display:grid;
              grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
              gap:16px;
            ">

              <div>

                <div style="
                  font-size:0.75rem;
                  color:#15803D;
                  font-weight:700;
                  text-transform:uppercase;
                ">
                  Plan
                </div>

                <div style="
                  font-size:1.125rem;
                  font-weight:800;
                  color:#166534;
                  margin-top:2px;
                ">
                  ${activeFreeSub.planName || 'Free'}
                </div>

              </div>


              <div>

                <div style="
                  font-size:0.75rem;
                  color:#15803D;
                  font-weight:700;
                  text-transform:uppercase;
                ">
                  Status
                </div>

                <div style="
                  display:inline-flex;
                  align-items:center;
                  gap:5px;
                  font-size:1.125rem;
                  font-weight:800;
                  color:#16A34A;
                  margin-top:2px;
                ">
                  ✓ Activated
                </div>

              </div>


              <div>

                <div style="
                  font-size:0.75rem;
                  color:#15803D;
                  font-weight:700;
                  text-transform:uppercase;
                ">
                  Valid From
                </div>

                <div style="
                  font-size:0.9375rem;
                  font-weight:700;
                  color:#166534;
                  margin-top:2px;
                ">
                  ${
                    activeFreeSub.startDate
                      ? formatNiceDate(
                          activeFreeSub.startDateIso ||
                          activeFreeSub.startDate
                        )
                      : '—'
                  }
                </div>

              </div>


              <div>

                <div style="
                  font-size:0.75rem;
                  color:#15803D;
                  font-weight:700;
                  text-transform:uppercase;
                ">
                  Valid Until
                </div>

                <div style="
                  font-size:0.9375rem;
                  font-weight:700;
                  color:#166534;
                  margin-top:2px;
                ">
                  ${
                    activeFreeSub.expiryDate
                      ? formatNiceDate(
                          activeFreeSub.expiryDate
                        )
                      : '—'
                  }
                </div>

              </div>


              <div>

                <div style="
                  font-size:0.75rem;
                  color:#15803D;
                  font-weight:700;
                  text-transform:uppercase;
                ">
                  Days Remaining
                </div>

                <div style="
                  font-size:1.125rem;
                  font-weight:800;
                  color:#16A34A;
                  margin-top:2px;
                ">
                  ${
                    Number.isFinite(
                      activeFreeSub.daysRemaining
                    )
                      ? activeFreeSub.daysRemaining
                      : '—'
                  }
                  ${
                    Number.isFinite(
                      activeFreeSub.daysRemaining
                    )
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
              background:#FFF7ED;
              border:1px solid #FDBA74;
              border-radius:16px;
              padding:16px;
              margin-bottom:24px;
              font-size:0.875rem;
              color:#9A3412;
              font-weight:600;
            ">
              Your Free Plan has expired.
              Activate the Free Plan again below.
            </div>

          `
          : `

            <div style="
              background:#FEF2F2;
              border:1px solid #FCA5A5;
              border-radius:16px;
              padding:16px;
              margin-bottom:24px;
              font-size:0.875rem;
              color:#991B1B;
              font-weight:600;
            ">
              ${
                user
                  ? 'No active subscription found. Activate the Free Plan below.'
                  : 'Please sign in to activate the Free Plan.'
              }
            </div>

          `
      }

    </div>


    <!-- ============================================= -->
    <!-- PLANS -->
    <!-- ============================================= -->

    <div style="
      margin-bottom:36px;
    ">

      <h2 style="
        font-size:1.25rem;
        font-weight:800;
        color:#0F172A;
        margin-bottom:16px;
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
          plans.map(
            plan => {

              const isFree =
                plan.planId === 'free' ||
                Number(plan.price) === 0;


              const isActive =
                isFree &&
                freePlanActive;


              const cardBorder =
                isActive
                  ? '2px solid #16A34A'
                  : plan.badge
                    ? '2px solid #DC2626'
                    : '1px solid var(--color-border)';


              const cardBackground =
                isActive
                  ? '#F0FDF4'
                  : '#FFFFFF';


              return `

                <div
                  style="
                    background:${cardBackground};
                    border:${cardBorder};
                    border-radius:16px;
                    padding:24px;
                    position:relative;
                    box-shadow:
                      ${
                        isActive
                          ? '0 0 0 3px rgba(22,163,74,0.10), 0 6px 20px rgba(22,163,74,0.10)'
                          : '0 4px 12px rgba(0,0,0,0.03)'
                      };
                    display:flex;
                    flex-direction:column;
                    justify-content:space-between;
                    transition:all .2s ease;
                  "
                >

                  ${
                    isActive
                      ? `
                        <span style="
                          position:absolute;
                          top:-12px;
                          right:20px;
                          background:#16A34A;
                          color:#FFFFFF;
                          font-size:0.7rem;
                          font-weight:800;
                          padding:4px 12px;
                          border-radius:999px;
                          text-transform:uppercase;
                        ">
                          ✓ ACTIVE
                        </span>
                      `
                      : plan.badge
                        ? `
                          <span style="
                            position:absolute;
                            top:-12px;
                            right:20px;
                            background:#DC2626;
                            color:#FFFFFF;
                            font-size:0.7rem;
                            font-weight:800;
                            padding:3px 10px;
                            border-radius:999px;
                            text-transform:uppercase;
                          ">
                            ${plan.badge}
                          </span>
                        `
                        : ''
                  }


                  <div>

                    <div style="
                      font-size:0.8125rem;
                      font-weight:800;
                      color:${isActive ? '#15803D' : '#64748B'};
                      text-transform:uppercase;
                      margin-bottom:4px;
                    ">
                      ${plan.name}
                    </div>


                    ${
                      isActive
                        ? `
                          <div style="
                            display:inline-flex;
                            align-items:center;
                            gap:5px;
                            background:#DCFCE7;
                            color:#15803D;
                            padding:5px 10px;
                            border-radius:999px;
                            font-size:0.75rem;
                            font-weight:800;
                            margin-bottom:10px;
                          ">
                            ✓ Currently Active
                          </div>
                        `
                        : ''
                    }


                    <div style="
                      font-size:2rem;
                      font-weight:800;
                      color:#0F172A;
                      margin-bottom:12px;
                    ">
                      ₹${plan.price}

                      <span style="
                        font-size:0.875rem;
                        color:#64748B;
                        font-weight:600;
                      ">
                        /
                        ${
                          plan.durationDays >= 365
                            ? 'Year'
                            : plan.durationDays >= 180
                              ? '6 Months'
                              : plan.durationDays > 7
                                ? 'Days'
                                : '7 Days'
                        }
                      </span>
                    </div>


                    <ul style="
                      list-style:none;
                      padding:0;
                      margin:0 0 20px 0;
                      font-size:0.875rem;
                      color:#334155;
                      display:flex;
                      flex-direction:column;
                      gap:8px;
                    ">

                      ${
                        (plan.features || [])
                          .map(
                            feature => `

                              <li style="
                                display:flex;
                                align-items:center;
                                gap:8px;
                              ">

                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#16A34A"
                                  stroke-width="2.5"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>

                                ${feature}

                              </li>

                            `
                          )
                          .join('')
                      }

                    </ul>

                  </div>


                  <!-- PLAN BUTTON -->

                  <div>

                    ${
                      isActive

                        ? `

                          <button
                            type="button"
                            class="free-plan-activated-btn"
                            disabled
                            style="
                              width:100%;
                              border:none;
                              border-radius:10px;
                              font-weight:800;
                              background:#16A34A;
                              color:#FFFFFF;
                              padding:13px;
                              cursor:default;
                              font-size:0.95rem;
                              box-shadow:
                                0 4px 10px
                                rgba(22,163,74,0.20);
                            "
                          >
                            ✓ Activated
                          </button>

                        `

                        : isFree

                          ? `

                            <button
                              type="button"
                              id="activateFreePlanBtn"
                              style="
                                width:100%;
                                border:none;
                                border-radius:10px;
                                font-weight:800;
                                background:#DC2626;
                                color:#FFFFFF;
                                padding:13px;
                                cursor:pointer;
                                font-size:0.95rem;
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
                              class="coming-soon-plan"
                              data-plan-name="${plan.name}"
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

            }
          ).join('')
        }

      </div>

    </div>


    <!-- ============================================= -->
    <!-- HISTORY -->
    <!-- ============================================= -->

    ${
      userSub &&
      userSub.allSubscriptions &&
      userSub.allSubscriptions.length > 0

        ? `

          <div style="
            background:#FFFFFF;
            border:1px solid var(--color-border);
            border-radius:16px;
            padding:24px;
            box-shadow:0 2px 8px rgba(0,0,0,0.02);
            margin-bottom:36px;
          ">

            <h2 style="
              font-size:1.25rem;
              font-weight:800;
              color:#0F172A;
              margin-bottom:16px;
            ">
              Subscription History
            </h2>


            <div style="
              display:flex;
              flex-direction:column;
              gap:12px;
            ">

              ${
                userSub.allSubscriptions
                  .map(
                    sub => {

                      const active =
                        sub.status === 'active';

                      return `

                        <div style="
                          display:flex;
                          justify-content:space-between;
                          align-items:center;
                          padding:16px;
                          background:${
                            active
                              ? '#F0FDF4'
                              : '#F8FAFC'
                          };
                          border:1px solid ${
                            active
                              ? '#86EFAC'
                              : '#E2E8F0'
                          };
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
                              ${
                                sub.planName ||
                                sub.planId
                              }
                            </div>

                            <div style="
                              font-size:0.8125rem;
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

                              ${
                                sub.source
                                  ? `(Source: ${sub.source})`
                                  : ''
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
                              ₹${sub.price || 0}
                            </span>


                            <span style="
                              padding:4px 10px;
                              border-radius:999px;
                              font-size:0.75rem;
                              font-weight:800;
                              text-transform:uppercase;
                              background:${
                                active
                                  ? '#DCFCE7'
                                  : '#F1F5F9'
                              };
                              color:${
                                active
                                  ? '#16A34A'
                                  : '#64748B'
                              };
                            ">
                              ${
                                active
                                  ? '✓ ACTIVE'
                                  : 'EXPIRED'
                              }
                            </span>

                          </div>

                        </div>

                      `;

                    }
                  )
                  .join('')
              }

            </div>

          </div>

        `
        : ''
    }

  `;


  // ====================================================
  // FREE PLAN BUTTON
  // ====================================================

  const activateBtn =
    container.querySelector(
      '#activateFreePlanBtn'
    );


  if (activateBtn) {

    activateBtn.onclick =
      async () => {

        const currentUser =
          await getCurrentRankHubUser();


        // ----------------------------------------------
        // User check
        // ----------------------------------------------

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


        // ----------------------------------------------
        // Disable button while activating
        // ----------------------------------------------

        activateBtn.disabled = true;

        activateBtn.style.cursor =
          'wait';

        activateBtn.style.background =
          '#94A3B8';

        activateBtn.textContent =
          'Activating...';


        try {

          const now =
            new Date();


          // ------------------------------------------
          // Free plan = 7 days
          // ------------------------------------------

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
              currentUser.uid,
              'subscriptions',
              'free_active'
            );


          const subscriptionData = {

            subscriptionId:
              'free_active',

            userId:
              currentUser.uid,

            planId:
              'free',

            planName:
              'Free',

            name:
              'Free',

            price:
              0,

            durationDays:
              7,

            status:
              'active',

            source:
              'free_launch',

            validFrom:
              serverTimestamp(),

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


          // ------------------------------------------
          // IMPORTANT:
          // Firestore write must succeed
          // ------------------------------------------

          await setDoc(
            subscriptionRef,
            subscriptionData,
            {
              merge: true
            }
          );


          // ------------------------------------------
          // Save local marker
          // ------------------------------------------

          localStorage.setItem(
            'rankhub_free_plan_activated_' +
            currentUser.uid,
            'true'
          );


          // ------------------------------------------
          // Verify Firestore write
          // ------------------------------------------

          const verify =
            await getUserSubscription(
              currentUser.uid
            );


          const verified =
            checkFreePlanActive(
              verify
            );


          if (!verified) {

            throw new Error(
              'Free Plan was saved, but active subscription verification failed.'
            );
          }


          // ------------------------------------------
          // SUCCESS
          // ------------------------------------------

          alert(
            '✓ Free Plan Activated Successfully!\n\n' +
            'Your RankHub Free Plan is now active for 7 days.'
          );


          // ------------------------------------------
          // Re-render
          // ------------------------------------------

          await renderPassPage(
            container
          );


        } catch (error) {

          console.error(
            'FREE PLAN ACTIVATION ERROR:',
            error
          );


          // ------------------------------------------
          // Restore button
          // ------------------------------------------

          activateBtn.disabled =
            false;

          activateBtn.style.cursor =
            'pointer';

          activateBtn.style.background =
            '#DC2626';

          activateBtn.textContent =
            userSub &&
            userSub.status === 'expired'
              ? 'Re-activate Free Plan'
              : 'Activate Free Plan';


          // ------------------------------------------
          // Real error
          // ------------------------------------------

          let message =
            'Free Plan activate nahi ho paya.';


          if (
            error &&
            error.code ===
            'permission-denied'
          ) {

            message +=
              '\n\nFirestore permission denied. ' +
              'firestore.rules check karo.';

          } else if (
            error &&
            error.message
          ) {

            message +=
              '\n\n' +
              error.message;
          }


          alert(message);

        }

      };

  }


  // ====================================================
  // COMING SOON BUTTONS
  // ====================================================

  const comingSoonButtons =
    container.querySelectorAll(
      '.coming-soon-plan'
    );


  comingSoonButtons.forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          const planName =
            button.dataset.planName ||
            'This';

          alert(
            `${planName} plan is coming soon for future launch!`
          );

        }
      );

    }
  );

}
