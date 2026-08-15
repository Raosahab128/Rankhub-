import { getExamById } from './exam-store.js';

import {
  auth,
  db,
  collection,
  getDocs,
  getCurrentUser
} from './firebase.js';

import {
  getUserSubscription,
  showRankHubPassModal
} from './subscription-service.js';


// ============================================================
// EXAM DETAIL PAGE
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {

  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------

  const firebaseUser = await getCurrentUser();

  if (!firebaseUser) {
    return;
  }


  let currentUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    name:
      firebaseUser.displayName ||
      (firebaseUser.email
        ? firebaseUser.email.split('@')[0]
        : 'User')
  };


  // ----------------------------------------------------------
  // LOCAL USER
  // ----------------------------------------------------------

  try {

    const saved =
      localStorage.getItem('rankhub_user');

    if (saved) {

      const parsed =
        JSON.parse(saved);

      if (parsed && typeof parsed === 'object') {
        currentUser = {
          ...currentUser,
          ...parsed,
          uid: firebaseUser.uid
        };
      }
    }

  } catch (error) {

    console.warn(
      'Could not read local user:',
      error
    );
  }


  // ----------------------------------------------------------
  // ELEMENTS
  // ----------------------------------------------------------

  const skeletonEl =
    document.getElementById(
      'examDetailSkeleton'
    );

  const errorEl =
    document.getElementById(
      'examDetailErrorState'
    );

  const contentEl =
    document.getElementById(
      'examDetailContent'
    );

  const retryBtn =
    document.getElementById(
      'retryLoadBtn'
    );


  // ----------------------------------------------------------
  // URL
  // ----------------------------------------------------------

  const urlParams =
    new URLSearchParams(
      window.location.search
    );

  const examId =
    urlParams.get('id') ||
    'ssc-cgl';

  const initialTab =
    urlParams.get('tab') ||
    'overview';


  // ----------------------------------------------------------
  // RETRY
  // ----------------------------------------------------------

  if (retryBtn) {

    retryBtn.addEventListener(
      'click',
      () => loadExamDetail(examId)
    );

  }


  // ----------------------------------------------------------
  // INITIAL LOAD
  // ----------------------------------------------------------

  await loadExamDetail(examId);


  // ==========================================================
  // LOAD EXAM
  // ==========================================================

  async function loadExamDetail(id) {

    showSkeleton();


    let subscription = null;
    let hasPremiumAccess = false;


    // --------------------------------------------------------
    // GET USER SUBSCRIPTION
    // --------------------------------------------------------

    const uid =
      auth.currentUser?.uid ||
      currentUser?.uid ||
      null;


    if (uid) {

      try {

        subscription =
          await getUserSubscription(uid);


        console.log(
          'RankHub subscription:',
          subscription
        );


        hasPremiumAccess =
          checkPremiumAccess(
            subscription
          );


        console.log(
          'Premium access:',
          hasPremiumAccess
        );


      } catch (error) {

        console.error(
          'Subscription check failed:',
          error
        );

        hasPremiumAccess = false;
      }
    }


    // --------------------------------------------------------
    // GET EXAM
    // --------------------------------------------------------

    let exam = null;


    try {

      exam =
        await getExamById(id);

    } catch (error) {

      console.error(
        'Exam loading failed:',
        error
      );

      showError(
        'Unable to load exam',
        'Please try again.'
      );

      return;
    }


    if (!exam) {

      showError(
        'Exam not found',
        `We could not find details for exam "${id}".`
      );

      return;
    }


    // --------------------------------------------------------
    // RENDER
    // --------------------------------------------------------

    await renderExamData(
      exam,
      hasPremiumAccess,
      subscription
    );


    switchTab(
      initialTab,
      false,
      false
    );


    hideSkeleton();
  }


  // ==========================================================
  // PREMIUM ACCESS CHECK
  //
  // IMPORTANT:
  // Kisi bhi valid active paid subscription ko premium access
  // milega.
  // ==========================================================

  function checkPremiumAccess(subscription) {

    if (!subscription) {
      return false;
    }


    // Must be active
    if (
      subscription.status &&
      subscription.status !== 'active'
    ) {
      return false;
    }


    // Free plan = no premium
    const planId =
      String(
        subscription.planId || ''
      ).toLowerCase();


    if (
      planId === 'free' ||
      planId === ''
    ) {
      return false;
    }


    // Price check
    const price =
      Number(
        subscription.price || 0
      );


    // Paid plan
    if (price > 0) {

      // Check expiry
      if (subscription.expiryDate) {

        const expiry =
          new Date(
            subscription.expiryDate
          );


        if (
          !Number.isNaN(
            expiry.getTime()
          )
        ) {

          if (
            expiry.getTime() <=
            Date.now()
          ) {
            return false;
          }
        }
      }


      return true;
    }


    // Some admin-created subscriptions may have price 0
    // but still be intentionally active.
    //
    // If planId is not free and expiry is valid,
    // allow access.

    if (subscription.expiryDate) {

      const expiry =
        new Date(
          subscription.expiryDate
        );


      if (
        !Number.isNaN(
          expiry.getTime()
        )
      ) {

        return (
          expiry.getTime() >
          Date.now()
        );
      }
    }


    return false;
  }


  // ==========================================================
  // SKELETON
  // ==========================================================

  function showSkeleton() {

    if (skeletonEl) {
      skeletonEl.style.display = 'block';
    }

    if (errorEl) {
      errorEl.style.display = 'none';
    }

    if (contentEl) {
      contentEl.style.display = 'none';
    }
  }


  function hideSkeleton() {

    if (skeletonEl) {
      skeletonEl.style.display = 'none';
    }

    if (contentEl) {
      contentEl.style.display = 'block';
    }
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  function showError(
    title,
    message
  ) {

    if (skeletonEl) {
      skeletonEl.style.display = 'none';
    }

    if (contentEl) {
      contentEl.style.display = 'none';
    }

    if (errorEl) {

      errorEl.style.display =
        'flex';


      const titleEl =
        document.getElementById(
          'errorStateTitle'
        );

      const subEl =
        document.getElementById(
          'errorStateSubtitle'
        );


      if (titleEl) {
        titleEl.textContent =
          title;
      }


      if (subEl) {
        subEl.textContent =
          message;
      }
    }
  }


  // ==========================================================
  // RENDER EXAM
  // ==========================================================

  async function renderExamData(
    exam,
    isUserPremium,
    subscription
  ) {

    document.title =
      `${exam.name} - Exam Details | Rankhub`;


    // --------------------------------------------------------
    // HEADER
    // --------------------------------------------------------

    const logoBox =
      document.getElementById(
        'examDetailLogo'
      );

    const logoText =
      document.getElementById(
        'examDetailLogoText'
      );

    const categoryLabel =
      document.getElementById(
        'examDetailCategory'
      );

    const titleEl =
      document.getElementById(
        'examDetailTitle'
      );

    const descEl =
      document.getElementById(
        'examDetailDesc'
      );


    if (logoBox) {

      logoBox.style.backgroundColor =
        exam.logoBg ||
        '#FEF2F2';

      logoBox.style.color =
        exam.logoColor ||
        '#DC2626';
    }


    if (logoText) {

      logoText.textContent =
        exam.logoText ||
        (
          exam.name
            ? exam.name.substring(0, 3)
            : 'EX'
        );
    }


    if (categoryLabel) {

      categoryLabel.textContent =
        (
          exam.category ||
          'EXAM'
        ).toUpperCase();
    }


    if (titleEl) {

      titleEl.textContent =
        exam.fullTitle ||
        exam.name;
    }


    if (descEl) {

      descEl.textContent =
        exam.description ||
        'Complete exam preparation resources in one place.';
    }


    renderHeaderMeta(exam);


    initQuickNavTabs();


    // --------------------------------------------------------
    // OVERVIEW
    // --------------------------------------------------------

    const infoSub =
      document.getElementById(
        'examInfoSub'
      );


    if (infoSub) {

      infoSub.textContent =
        `${exam.name} examination की तैयारी के लिए आवश्यक जानकारी।`;
    }


    setTextContent(
      'infoExamName',
      exam.name
    );

    setTextContent(
      'infoCategory',
      exam.category
    );

    setTextContent(
      'infoTierInfo',
      exam.tierInfo ||
      'Selection Process Details'
    );

    setTextContent(
      'infoEligibility',
      exam.eligibility ||
      'Refer to official recruitment notification'
    );

    setTextContent(
      'infoStatus',
      exam.expectedDate ||
      'Active Cycle'
    );


    // --------------------------------------------------------
    // PATTERN
    // --------------------------------------------------------

    setTextContent(
      'patternQuestions',
      '100'
    );

    setTextContent(
      'patternMarks',
      '100'
    );

    setTextContent(
      'patternDuration',
      '2 Hours'
    );

    setTextContent(
      'patternMode',
      'Computer Based Test (CBT)'
    );


    // --------------------------------------------------------
    // SUBJECTS
    // --------------------------------------------------------

    renderSubjects(exam);


    // --------------------------------------------------------
    // CONTENT
    // --------------------------------------------------------

    await renderMockTestsList(
      exam,
      isUserPremium
    );


    renderPracticeList(
      exam,
      isUserPremium
    );


    renderPyqList(
      exam,
      isUserPremium
    );


    renderNotesList(
      exam,
      isUserPremium
    );
  }


  // ==========================================================
  // EXAM SCOPE
  // ==========================================================

  function getExamScope(exam) {

    const cat =
      (exam.category || '')
        .toLowerCase();

    const id =
      (exam.id || '')
        .toLowerCase();

    const name =
      (exam.name || '')
        .toLowerCase();

    const full =
      (exam.fullTitle || '')
        .toLowerCase();


    if (cat === 'ssc')
      return 'Central Government';

    if (cat === 'banking')
      return 'National Level';

    if (
      cat === 'railway' ||
      cat === 'railways'
    )
      return 'Central Government';

    if (cat === 'upsc')
      return 'Civil Services';

    if (cat === 'state psc') {

      return (
        id.includes('bpsc') ||
        name.includes('bihar') ||
        full.includes('bihar')
      )
        ? 'State Civil Services'
        : 'State Government';
    }


    if (cat === 'police') {

      return (
        id.includes('bihar') ||
        name.includes('bihar')
      )
        ? 'State Government Exam'
        : 'State Government';
    }


    if (cat === 'defence')
      return 'Armed Forces';

    if (cat === 'teaching')
      return 'National Level';

    if (cat === 'medical')
      return 'National Entrance';

    if (cat === 'engineering')
      return 'National Entrance';

    if (
      cat === 'state government jobs'
    )
      return 'State Government Exam';


    return 'Competitive Exam';
  }


  // ==========================================================
  // STATE
  // ==========================================================

  function getExamStateOrRegion(exam) {

    const text =
      `${exam.id || ''} ${exam.name || ''} ${exam.fullTitle || ''}`
        .toLowerCase();


    if (
      text.includes('bihar') ||
      text.includes('bpsc')
    )
      return 'Bihar';


    if (
      text.includes('uttar pradesh') ||
      text.includes('uppsc')
    )
      return 'Uttar Pradesh';


    if (
      text.includes('rajasthan') ||
      text.includes('rpsc')
    )
      return 'Rajasthan';


    if (
      text.includes('madhya pradesh') ||
      text.includes('mppsc')
    )
      return 'Madhya Pradesh';


    if (
      text.includes('delhi') ||
      text.includes('dsssb')
    )
      return 'Delhi';


    if (
      text.includes('maharashtra') ||
      text.includes('mpsc')
    )
      return 'Maharashtra';


    if (
      text.includes('west bengal') ||
      text.includes('wb')
    )
      return 'West Bengal';


    if (text.includes('punjab'))
      return 'Punjab';


    if (text.includes('haryana'))
      return 'Haryana';


    return null;
  }


  // ==========================================================
  // HEADER META
  // ==========================================================

  function renderHeaderMeta(exam) {

    const metaContainer =
      document.getElementById(
        'examDetailMetaRow'
      ) ||
      document.getElementById(
        'examDetailMetaPills'
      );


    if (!metaContainer)
      return;


    const items = [];


    if (exam.category) {

      items.push(
        escapeHtml(
          exam.category
        )
      );
    }


    const state =
      getExamStateOrRegion(
        exam
      );


    if (state) {

      items.push(
        escapeHtml(state)
      );
    }


    const scope =
      getExamScope(exam);


    if (scope) {

      items.push(
        escapeHtml(scope)
      );
    }


    if (!items.length) {

      metaContainer.style.display =
        'none';

      return;
    }


    metaContainer.style.display =
      'flex';


    metaContainer.innerHTML =
      items
        .map(
          item =>
            `<span class="header-meta-item">${item}</span>`
        )
        .join(
          '<span class="header-meta-bullet">•</span>'
        );
  }


  // ==========================================================
  // TABS
  // ==========================================================

  function switchTab(
    tabKey,
    updateUrl = true,
    scrollToTabs = false
  ) {

    const validTabs = [
      'overview',
      'mock-tests',
      'practice',
      'pyqs',
      'notes',
      'syllabus'
    ];


    const targetTab =
      validTabs.includes(tabKey)
        ? tabKey
        : 'overview';


    const navBtns =
      document.querySelectorAll(
        '.quick-tab-btn'
      );


    navBtns.forEach(btn => {

      btn.classList.toggle(
        'active',
        btn.dataset.tab === targetTab
      );

    });


    const tabPanels =
      document.querySelectorAll(
        '.exam-tab-panel'
      );


    tabPanels.forEach(panel => {

      panel.style.display =
        'none';

      panel.classList.remove(
        'active'
      );

    });


    const activePanelId =
      getPanelId(targetTab);


    const activePanel =
      document.getElementById(
        activePanelId
      );


    if (activePanel) {

      activePanel.style.display =
        'block';

      activePanel.classList.add(
        'active'
      );
    }


    if (updateUrl) {

      const newUrl =
        new URL(
          window.location.href
        );


      newUrl.searchParams.set(
        'tab',
        targetTab
      );


      window.history.replaceState(
        {},
        '',
        newUrl
      );
    }


    if (scrollToTabs) {

      const tabsBar =
        document.getElementById(
          'quickNavTabsBar'
        );


      if (tabsBar) {

        const yOffset = -70;


        const y =
          tabsBar.getBoundingClientRect()
            .top +
          window.pageYOffset +
          yOffset;


        window.scrollTo({
          top: y,
          behavior: 'smooth'
        });
      }
    }
  }


  function getPanelId(tabKey) {

    switch (tabKey) {

      case 'mock-tests':
        return 'tabPanelMockTests';

      case 'practice':
        return 'tabPanelPractice';

      case 'pyqs':
        return 'tabPanelPyqs';

      case 'notes':
        return 'tabPanelNotes';

      case 'syllabus':
        return 'tabPanelSyllabus';

      default:
        return 'tabPanelOverview';
    }
  }


  function initQuickNavTabs() {

    const navBtns =
      document.querySelectorAll(
        '.quick-tab-btn'
      );


    navBtns.forEach(btn => {

      // Prevent duplicate listeners
      if (
        btn.dataset.rankhubBound === 'true'
      ) {
        return;
      }


      btn.dataset.rankhubBound =
        'true';


      btn.addEventListener(
        'click',
        () => {

          const targetTab =
            btn.dataset.tab;


          if (targetTab) {

            switchTab(
              targetTab,
              true,
              false
            );
          }
        }
      );
    });
  }


  // ==========================================================
  // TEXT
  // ==========================================================

  function setTextContent(
    id,
    value
  ) {

    const el =
      document.getElementById(id);


    if (el) {

      el.textContent =
        value || '-';
    }
  }


  // ==========================================================
  // SUBJECTS
  // ==========================================================

  function renderSubjects(exam) {

    const subjectsGrid =
      document.getElementById(
        'examSubjectsGrid'
      );


    if (!subjectsGrid)
      return;


    if (
      !Array.isArray(
        exam.subjects
      ) ||
      exam.subjects.length === 0
    ) {

      subjectsGrid.innerHTML =
        `
        <div class="coming-soon-box">
          <p class="coming-soon-text">
            Syllabus topics coming soon for
            ${escapeHtml(exam.name)}
          </p>
        </div>
        `;

      return;
    }


    subjectsGrid.innerHTML =
      exam.subjects
        .map(
          (sub, idx) => `

          <div class="subject-card">

            <div class="subject-card-header">

              <div class="subject-num">
                ${idx + 1}
              </div>

              <h3 class="subject-title">
                ${escapeHtml(sub)}
              </h3>

            </div>


            <p class="subject-desc">
              Comprehensive topic-wise syllabus breakdown & key concepts
            </p>


            <div class="subject-card-footer">

              <a
                href="./practice.html?exam=${encodeURIComponent(exam.id)}&subject=${encodeURIComponent(sub)}"
                class="btn-subject-practice"
              >
                <span>
                  Practice ${escapeHtml(sub)} →
                </span>
              </a>

            </div>

          </div>
        `
        )
        .join('');
  }


  // ==========================================================
  // MOCK TESTS
  //
  // IMPORTANT:
  // Premium user = ALL tests unlocked
  // ==========================================================

  async function renderMockTestsList(
    exam,
    isUserPremium
  ) {

    const container =
      document.getElementById(
        'mockTestsListContainer'
      );


    if (!container)
      return;


    if (
      !Array.isArray(
        exam.mockTestsList
      ) ||
      exam.mockTestsList.length === 0
    ) {

      container.innerHTML =
        createComingSoonState(
          'Mock Tests'
        );

      return;
    }


    let userTestStats = {};


    const uid =
      auth.currentUser?.uid ||
      currentUser?.uid ||
      null;


    if (uid) {

      try {

        const statsSnapshot =
          await getDocs(
            collection(
              db,
              `users/${uid}/testStats`
            )
          );


        statsSnapshot.forEach(
          docSnap => {

            userTestStats[
              docSnap.id
            ] =
              docSnap.data();

          }
        );

      } catch (error) {

        console.warn(
          'Could not load test stats:',
          error
        );
      }
    }


    container.innerHTML =
      exam.mockTestsList
        .map(
          (test, i) => {

            // FIRST TEST FREE
            // PREMIUM = EVERYTHING FREE/UNLOCKED
            const isLocked =
              !isUserPremium &&
              i > 0;


            const stat =
              userTestStats[
                test.id
              ];


            const hasAttempted =
              stat &&
              Number(
                stat.attempts || 0
              ) > 0;


            let statusBadge = '';


            if (isLocked) {

              statusBadge =
                `
                <span
                  class="test-status-pill pill-pro"
                  style="
                    background:#FEF2F2;
                    color:#DC2626;
                    border:1px solid #FCA5A5;
                  "
                >
                  🔒 RankHub Pass
                </span>
                `;

            } else if (isUserPremium) {

              statusBadge =
                `
                <span
                  class="test-status-pill pill-free"
                  style="
                    background:#DC2626;
                    color:#FFF;
                  "
                >
                  🔓 Unlocked
                </span>
                `;

            } else {

              statusBadge =
                `
                <span
                  class="test-status-pill pill-free"
                >
                  🔓 Free
                </span>
                `;
            }


            let actionButtons =
              `
              <button
                type="button"
                class="btn-start-test ${
                  isLocked
                    ? 'locked-btn'
                    : 'open-test-modal-btn'
                }"
                data-test-index="${i}"
                ${
                  isLocked
                    ? `
                      style="
                        background:#FEF2F2;
                        color:#DC2626;
                        border:1px solid #FCA5A5;
                      "
                    `
                    : ''
                }
              >
                ${
                  isLocked
                    ? '🔒 RankHub Pass'
                    : 'View Details & Start →'
                }
              </button>
              `;


            let attemptInfo = '';


            if (
              !isLocked &&
              hasAttempted
            ) {

              attemptInfo =
                `
                <div
                  style="
                    font-size:.85rem;
                    color:#475569;
                    margin-top:8px;
                  "
                >

                  <span style="margin-right:12px;">
                    <strong>Best Score:</strong>
                    ${stat.bestScore || 0}/${test.marks || 100}
                  </span>

                  <span style="margin-right:12px;">
                    <strong>Latest Score:</strong>
                    ${stat.latestScore || 0}/${test.marks || 100}
                  </span>

                  <span>
                    <strong>Attempts:</strong>
                    ${stat.attempts || 0}
                  </span>

                </div>
                `;


              actionButtons =
                `
                <div
                  style="
                    display:flex;
                    gap:8px;
                    flex-wrap:wrap;
                    justify-content:flex-end;
                  "
                >

                  <a
                    href="./test-result.html?exam=${encodeURIComponent(exam.id)}&test=${encodeURIComponent(test.id)}"
                    class="btn-start-test"
                    style="
                      background:#FFF;
                      color:#DC2626;
                      border:1px solid #DC2626;
                      text-decoration:none;
                      padding:6px 12px;
                      font-size:.875rem;
                    "
                  >
                    View Result
                  </a>


                  <a
                    href="./test-interface.html?exam=${encodeURIComponent(exam.id)}&test=${encodeURIComponent(test.id)}&reattempt=true"
                    class="btn-start-test"
                    style="
                      text-decoration:none;
                      padding:6px 12px;
                      font-size:.875rem;
                    "
                  >
                    Re-attempt
                  </a>

                </div>
                `;

            } else if (isLocked) {

              attemptInfo =
                `
                <div
                  style="
                    font-size:.8125rem;
                    color:#DC2626;
                    margin-top:6px;
                    font-weight:700;
                  "
                >
                  🔒 Unlock with RankHub Pass to attempt
                </div>
                `;
            }


            return `

              <div
                class="test-item-card"
                data-test-index="${i}"
                style="cursor:pointer;"
              >

                <div class="test-item-info">

                  <div class="test-item-title-row">

                    <h4 class="test-item-title">
                      ${escapeHtml(
                        test.title ||
                        `${exam.name} Mock Test #${i + 1}`
                      )}
                    </h4>

                    ${statusBadge}

                  </div>


                  <div class="test-meta-pills">

                    <span>
                      ⏱️
                      ${escapeHtml(
                        test.duration ||
                        '60 Mins'
                      )}
                    </span>

                    <span>
                      ❓
                      ${test.questions || 100}
                      Questions
                    </span>

                    <span>
                      🎯
                      ${test.marks || 100}
                      Marks
                    </span>

                  </div>


                  ${attemptInfo}

                </div>


                <div class="test-item-action">
                  ${actionButtons}
                </div>

              </div>
            `;
          }
        )
        .join('');


    // --------------------------------------------------------
    // CLICK
    // --------------------------------------------------------

    container
      .querySelectorAll(
        '.test-item-card'
      )
      .forEach(card => {

        card.addEventListener(
          'click',
          event => {

            if (
              event.target.closest('a')
            ) {
              return;
            }


            const idx =
              parseInt(
                card.dataset.testIndex,
                10
              );


            const testData =
              exam.mockTestsList[idx];


            const isLocked =
              !isUserPremium &&
              idx > 0;


            if (isLocked) {

              showRankHubPassModal(
                testData.title ||
                `${exam.name} Mock Test #${idx + 1}`
              );

              return;
            }


            const stat =
              userTestStats[
                testData.id
              ];


            if (
              !stat ||
              Number(stat.attempts || 0) === 0
            ) {

              openTestDetailsModal(
                exam,
                testData,
                idx
              );
            }
          }
        );
      });
  }


  // ==========================================================
  // TEST MODAL
  // ==========================================================

  function openTestDetailsModal(
    exam,
    test,
    index
  ) {

    const modal =
      document.getElementById(
        'testDetailsModal'
      );


    if (!modal)
      return;


    const titleEl =
      document.getElementById(
        'modalTestTitle'
      );

    const examNameEl =
      document.getElementById(
        'modalExamName'
      );

    const qEl =
      document.getElementById(
        'modalTestQuestions'
      );

    const mEl =
      document.getElementById(
        'modalTestMarks'
      );

    const dEl =
      document.getElementById(
        'modalTestDuration'
      );

    const diffEl =
      document.getElementById(
        'modalTestDifficulty'
      );

    const typeEl =
      document.getElementById(
        'modalTestType'
      );

    const startCbtBtn =
      document.getElementById(
        'btnModalStartTestCbt'
      );


    if (titleEl) {

      titleEl.textContent =
        test.title ||
        `${exam.name} Mock Test #${index + 1}`;
    }


    if (examNameEl) {

      examNameEl.textContent =
        exam.fullTitle ||
        exam.name;
    }


    if (qEl) {

      qEl.textContent =
        `${test.questions || 100} Questions`;
    }


    if (mEl) {

      mEl.textContent =
        `${test.marks || 100} Marks`;
    }


    if (dEl) {

      dEl.textContent =
        test.duration ||
        '60 Mins';
    }


    if (diffEl) {

      diffEl.textContent =
        test.difficulty ||
        'Moderate';
    }


    if (typeEl) {

      typeEl.textContent =
        test.type ||
        'Full Length Mock';
    }


    if (startCbtBtn) {

      startCbtBtn.href =
        `./test-interface.html?exam=${encodeURIComponent(exam.id)}&test=${encodeURIComponent(test.id)}`;
    }


    modal.style.display =
      'flex';

    modal.setAttribute(
      'aria-hidden',
      'false'
    );

    document.body.style.overflow =
      'hidden';
  }


  function closeTestDetailsModal() {

    const modal =
      document.getElementById(
        'testDetailsModal'
      );


    if (modal) {

      modal.style.display =
        'none';

      modal.setAttribute(
        'aria-hidden',
        'true'
      );

      document.body.style.overflow =
        '';
    }
  }


  const closeBtn =
    document.getElementById(
      'btnCloseTestModal'
    );

  const backBtn =
    document.getElementById(
      'btnBackTestModal'
    );

  const testModal =
    document.getElementById(
      'testDetailsModal'
    );


  if (closeBtn) {

    closeBtn.onclick =
      closeTestDetailsModal;
  }


  if (backBtn) {

    backBtn.onclick =
      closeTestDetailsModal;
  }


  if (testModal) {

    testModal.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          testModal
        ) {
          closeTestDetailsModal();
        }

      }
    );
  }


  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key === 'Escape'
      ) {

        closeTestDetailsModal();
      }
    }
  );


  // ==========================================================
  // PRACTICE
  // ==========================================================

  function renderPracticeList(
    exam,
    isUserPremium
  ) {

    const container =
      document.getElementById(
        'practiceSetsListContainer'
      );


    if (!container)
      return;


    if (
      !Array.isArray(
        exam.practiceSets
      ) ||
      exam.practiceSets.length === 0
    ) {

      container.innerHTML =
        createComingSoonState(
          'Practice Sets'
        );

      return;
    }


    container.innerHTML =
      exam.practiceSets
        .map(
          (set, i) => {

            const isLocked =
              !isUserPremium &&
              i > 0;


            let badgeHtml;


            if (isLocked) {

              badgeHtml =
                `
                <span
                  style="
                    font-size:.75rem;
                    padding:2px 8px;
                    background:#FEF2F2;
                    color:#DC2626;
                    border-radius:999px;
                    font-weight:700;
                    border:1px solid #FCA5A5;
                  "
                >
                  🔒 RankHub Pass
                </span>
                `;

            } else if (isUserPremium) {

              badgeHtml =
                `
                <span
                  style="
                    font-size:.75rem;
                    padding:2px 8px;
                    background:#DC262610;
                    color:#DC2626;
                    border-radius:999px;
                    font-weight:700;
                  "
                >
                  🔓 Unlocked
                </span>
                `;

            } else {

              badgeHtml =
                `
                <span
                  style="
                    font-size:.75rem;
                    padding:2px 8px;
                    background:#DC262610;
                    color:#DC2626;
                    border-radius:999px;
                    font-weight:700;
                  "
                >
                  🔓 Free
                </span>
                `;
            }


            return `

              <div
                class="practice-item-card"
                data-practice-index="${i}"
                style="cursor:pointer;"
              >

                <div class="practice-info">

                  <div
                    style="
                      display:flex;
                      align-items:center;
                      flex-wrap:wrap;
                      gap:6px;
                      margin-bottom:4px;
                    "
                  >

                    <span class="practice-subject-tag">
                      ${escapeHtml(
                        set.subject || ''
                      )}
                    </span>

                    ${badgeHtml}

                  </div>


                  <h4 class="practice-title">
                    ${escapeHtml(
                      set.topic || 'Practice Set'
                    )}
                  </h4>


                  <div class="practice-meta">

                    <span>
                      ${set.qCount || 25}
                      Questions
                    </span>

                    &bull;

                    <span>
                      ${escapeHtml(
                        set.duration ||
                        '15 Mins'
                      )}
                    </span>

                  </div>

                </div>


                <div>

                  <button
                    type="button"
                    class="btn-start-practice"
                    ${
                      isLocked
                        ? `
                          style="
                            background:#FEF2F2;
                            color:#DC2626;
                            border:1px solid #FCA5A5;
                          "
                        `
                        : ''
                    }
                  >
                    ${
                      isLocked
                        ? '🔒 RankHub Pass'
                        : 'Practice →'
                    }
                  </button>

                </div>

              </div>
            `;
          }
        )
        .join('');


    container
      .querySelectorAll(
        '.practice-item-card'
      )
      .forEach(card => {

        card.addEventListener(
          'click',
          () => {

            const idx =
              parseInt(
                card.dataset.practiceIndex,
                10
              );


            const set =
              exam.practiceSets[idx];


            const isLocked =
              !isUserPremium &&
              idx > 0;


            if (isLocked) {

              showRankHubPassModal(
                set.topic ||
                `Practice Set #${idx + 1}`
              );

              return;
            }


            window.location.href =
              `./practice.html?exam=${encodeURIComponent(exam.id)}&topic=${encodeURIComponent(set.id)}`;
          }
        );
      });
  }


  // ==========================================================
  // PYQ
  // ==========================================================

  function renderPyqList(
    exam,
    isUserPremium
  ) {

    const container =
      document.getElementById(
        'pyqListContainer'
      );


    if (!container)
      return;


    if (
      !Array.isArray(
        exam.pyqList
      ) ||
      exam.pyqList.length === 0
    ) {

      container.innerHTML =
        createComingSoonState(
          'Previous Year Papers'
        );

      return;
    }


    container.innerHTML =
      exam.pyqList
        .map(
          (paper, i) => {

            const isLocked =
              !isUserPremium &&
              i > 0;


            let badgeHtml;


            if (isLocked) {

              badgeHtml =
                `
                <div
                  class="pyq-badge"
                  style="
                    background:#FEF2F2;
                    color:#DC2626;
                    border:1px solid #FCA5A5;
                  "
                >
                  🔒 Pass
                </div>
                `;

            } else if (isUserPremium) {

              badgeHtml =
                `
                <div
                  class="pyq-badge"
                  style="
                    background:#DC2626;
                    color:#FFF;
                  "
                >
                  ${escapeHtml(
                    paper.year || ''
                  )}
                  (Unlocked)
                </div>
                `;

            } else {

              badgeHtml =
                `
                <div
                  class="pyq-badge"
                  style="
                    background:#DC2626;
                    color:#FFF;
                  "
                >
                  ${escapeHtml(
                    paper.year || ''
                  )}
                  (Free)
                </div>
                `;
            }


            return `

              <div
                class="pyq-item-card"
                data-pyq-index="${i}"
                style="cursor:pointer;"
              >

                ${badgeHtml}


                <div class="pyq-info">

                  <h4 class="pyq-title">
                    ${escapeHtml(
                      paper.title || 'PYQ Paper'
                    )}
                  </h4>


                  <div class="pyq-meta">

                    <span>
                      Duration:
                      ${escapeHtml(
                        paper.duration || ''
                      )}
                    </span>

                    &bull;

                    <span>
                      ${paper.questions || 0}
                      Questions
                    </span>

                  </div>

                </div>


                <div class="pyq-actions">

                  <button
                    type="button"
                    class="btn-primary pyq-attempt-btn"
                    ${
                      isLocked
                        ? `
                          style="
                            background:#FEF2F2;
                            color:#DC2626;
                            border:1px solid #FCA5A5;
                          "
                        `
                        : ''
                    }
                  >
                    ${
                      isLocked
                        ? '🔒 RankHub Pass'
                        : 'View Paper →'
                    }
                  </button>

                </div>

              </div>
            `;
          }
        )
        .join('');


    container
      .querySelectorAll(
        '.pyq-item-card'
      )
      .forEach(card => {

        card.addEventListener(
          'click',
          () => {

            const idx =
              parseInt(
                card.dataset.pyqIndex,
                10
              );


            const paper =
              exam.pyqList[idx];


            const isLocked =
              !isUserPremium &&
              idx > 0;


            if (isLocked) {

              showRankHubPassModal(
                paper.title ||
                `PYQ Paper #${idx + 1}`
              );

              return;
            }


            window.location.href =
              `./test-interface.html?exam=${encodeURIComponent(exam.id)}&pyq=${encodeURIComponent(paper.id)}`;
          }
        );
      });
  }


  // ==========================================================
  // NOTES
  // ==========================================================

  function renderNotesList(
    exam,
    isUserPremium
  ) {

    const container =
      document.getElementById(
        'notesListContainer'
      );


    if (!container)
      return;


    if (
      !Array.isArray(
        exam.studyNotes
      ) ||
      exam.studyNotes.length === 0
    ) {

      container.innerHTML =
        createComingSoonState(
          'Study Notes & Revision Material'
        );

      return;
    }


    container.innerHTML =
      exam.studyNotes
        .map(
          (note, i) => {

            const isLocked =
              !isUserPremium &&
              i > 0;


            let badgeHtml;


            if (isLocked) {

              badgeHtml =
                `
                <span
                  style="
                    font-size:.75rem;
                    padding:2px 8px;
                    background:#FEF2F2;
                    color:#DC2626;
                    border-radius:999px;
                    font-weight:700;
                    border:1px solid #FCA5A5;
                  "
                >
                  🔒 RankHub Pass
                </span>
                `;

            } else if (isUserPremium) {

              badgeHtml =
                `
                <span
                  style="
                    font-size:.75rem;
                    padding:2px 8px;
                    background:#DC262610;
                    color:#DC2626;
                    border-radius:999px;
                    font-weight:700;
                  "
                >
                  🔓 Unlocked
                </span>
                `;

            } else {

              badgeHtml =
                `
                <span
                  style="
                    font-size:.75rem;
                    padding:2px 8px;
                    background:#DC262610;
                    color:#DC2626;
                    border-radius:999px;
                    font-weight:700;
                  "
                >
                  🔓 Free
                </span>
                `;
            }


            return `

              <div
                class="note-item-card"
                data-note-index="${i}"
                style="cursor:pointer;"
              >

                <div class="note-icon">

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >

                    <path
                      d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
                    />

                    <polyline
                      points="14 2 14 8 20 8"
                    />

                  </svg>

                </div>


                <div class="note-info">

                  <div
                    style="
                      display:flex;
                      align-items:center;
                      gap:8px;
                      margin-bottom:2px;
                    "
                  >

                    <h4
                      class="note-title"
                      style="margin:0;"
                    >
                      ${escapeHtml(
                        note.title ||
                        'Study Note'
                      )}
                    </h4>

                    ${badgeHtml}

                  </div>


                  <span class="note-meta">

                    ${escapeHtml(
                      note.pages || ''
                    )}

                    &bull;

                    ${escapeHtml(
                      note.format || ''
                    )}

                    Format

                  </span>

                </div>


                <div>

                  <button
                    type="button"
                    class="btn-download-note"
                    ${
                      isLocked
                        ? `
                          style="
                            background:#FEF2F2;
                            color:#DC2626;
                            border:1px solid #FCA5A5;
                          "
                        `
                        : ''
                    }
                  >
                    ${
                      isLocked
                        ? '🔒 Pass'
                        : 'View →'
                    }
                  </button>

                </div>

              </div>
            `;
          }
        )
        .join('');


    container
      .querySelectorAll(
        '.note-item-card'
      )
      .forEach(card => {

        card.addEventListener(
          'click',
          () => {

            const idx =
              parseInt(
                card.dataset.noteIndex,
                10
              );


            const note =
              exam.studyNotes[idx];


            const isLocked =
              !isUserPremium &&
              idx > 0;


            if (isLocked) {

              showRankHubPassModal(
                note.title ||
                `Study Note #${idx + 1}`
              );

              return;
            }


            window.location.href =
              `./notes.html?exam=${encodeURIComponent(exam.id)}&note=${encodeURIComponent(note.id)}`;
          }
        );
      });
  }


  // ==========================================================
  // COMING SOON
  // ==========================================================

  function createComingSoonState(
    featureName
  ) {

    return `
      <div class="coming-soon-box">

        <div class="coming-soon-icon">

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >

            <circle
              cx="12"
              cy="12"
              r="10"
            />

            <polyline
              points="12 6 12 12 16 14"
            />

          </svg>

        </div>


        <h4 class="coming-soon-title">
          ${escapeHtml(featureName)}
          - Coming Soon
        </h4>


        <p class="coming-soon-sub">
          We are adding quality
          ${escapeHtml(
            featureName.toLowerCase()
          )}
          for this exam soon.
        </p>

      </div>
    `;
  }


  // ==========================================================
  // ESCAPE HTML
  // ==========================================================

  function escapeHtml(str) {

    if (
      str === null ||
      str === undefined
    ) {
      return '';
    }


    return String(str)
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

});
