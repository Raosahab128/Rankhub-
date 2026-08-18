// ============================================================
// RANKHUB - USER WEBSITE
// EXAMS PAGE UI
// File: js/exams.js
// FINAL FIXED VERSION
// ============================================================
//
// IMPORTANT:
// - ./exam.js dependency REMOVED
// - Direct Firestore se exams load honge
// - Collection: exams
// - Only status === "published" displayed
// ============================================================

import {
    db,
    collection,
    getDocs,
    query,
    where
} from "./firebase.js";


// ============================================================
// STATE
// ============================================================

let allExams = [];
let currentExams = [];
let currentCategory = "All";
let currentSearch = "";
let initialized = false;


// ============================================================
// DOM HELPER
// ============================================================

const $ = (id) => document.getElementById(id);


// ============================================================
// ELEMENTS
// ============================================================

let popularGrid;
let categoryContainer;
let allGrid;

let searchInput;
let clearSearchBtn;
let searchCountLabel;

let emptyState;
let emptyResetBtn;

let popularSection;
let categoriesSection;
let allSection;

let modalBackdrop;
let detailModal;
let modalCloseBtn;
let modalBody;


// ============================================================
// INIT DOM
// ============================================================

function initDOM() {

    popularGrid = $("popularExamsGrid");

    categoryContainer =
        $("examCategoryChipsContainer");

    allGrid =
        $("allExamsGrid");

    searchInput =
        $("examSearchInput");

    clearSearchBtn =
        $("clearSearchInputBtn");

    searchCountLabel =
        $("searchResultsCountLabel");

    emptyState =
        $("examEmptyStateContainer");

    emptyResetBtn =
        $("emptyStateResetBtn");

    popularSection =
        $("popularExamsSection");

    categoriesSection =
        $("examCategoriesSection");

    allSection =
        $("allExamsSection");

    modalBackdrop =
        $("examModalBackdrop");

    detailModal =
        $("examDetailModal");

    modalCloseBtn =
        $("examModalCloseBtn");

    modalBody =
        $("examModalBody");
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// SAFE TEXT
// ============================================================

function safeText(
    value,
    fallback = ""
) {

    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    const text =
        String(value).trim();

    return text || fallback;
}


// ============================================================
// SLUG
// ============================================================

function makeSlug(exam) {

    const slug =
        safeText(exam?.slug);

    if (slug) {
        return slug;
    }

    return safeText(exam?.id);
}


// ============================================================
// CATEGORY
// ============================================================

function normalizeCategory(category) {

    return safeText(
        category,
        "Other"
    );
}


function categoryKey(category) {

    return safeText(category)
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}


// ============================================================
// ACCESS BADGE
// ============================================================

function getAccessBadge(exam) {

    const premium =
        exam?.accessType === "premium";

    return premium
        ? `
            <span class="exam-access-badge premium">
                PRO
            </span>
        `
        : `
            <span class="exam-access-badge free">
                FREE
            </span>
        `;
}


// ============================================================
// EXAM LOGO
// ============================================================

function getExamLogo(exam) {

    const logo =
        safeText(exam?.logoUrl);

    const name =
        safeText(
            exam?.name,
            "Exam"
        );

    const firstLetter =
        escapeHTML(
            name.charAt(0).toUpperCase()
        );

    if (!logo) {

        return `
            <div class="exam-card-logo-fallback">
                ${firstLetter}
            </div>
        `;
    }

    return `
        <img
            class="exam-card-logo"
            src="${escapeHTML(logo)}"
            alt="${escapeHTML(name)}"
            loading="lazy"
            onerror="
                this.style.display='none';
                if(this.nextElementSibling){
                    this.nextElementSibling.style.display='flex';
                }
            "
        >

        <div
            class="exam-card-logo-fallback"
            style="display:none;"
        >
            ${firstLetter}
        </div>
    `;
}


// ============================================================
// CREATE EXAM CARD
// ============================================================

function createExamCard(exam) {

    const id =
        safeText(exam?.id);

    const slug =
        makeSlug(exam);

    const name =
        safeText(
            exam?.name,
            "Untitled Exam"
        );

    const category =
        normalizeCategory(
            exam?.category
        );

    const description =
        safeText(
            exam?.shortDescription ||
            exam?.description,
            "Start preparing for this exam with RankHub."
        );

    const questionCount =
        Number(
            exam?.questionCount
        ) || 0;

    const subjectCount =
        Number(
            exam?.subjectCount
        ) || 0;

    const testCount =
        Number(
            exam?.testCount
        ) || 0;

    return `
        <article
            class="exam-card"
            data-exam-id="${escapeHTML(id)}"
            data-exam-slug="${escapeHTML(slug)}"
            tabindex="0"
            role="button"
            aria-label="Open ${escapeHTML(name)}"
        >

            <div class="exam-card-top">

                <div class="exam-card-logo-wrap">
                    ${getExamLogo(exam)}
                </div>

                ${getAccessBadge(exam)}

            </div>


            <div class="exam-card-content">

                <div class="exam-card-category">
                    ${escapeHTML(category)}
                </div>

                <h3 class="exam-card-title">
                    ${escapeHTML(name)}
                </h3>

                <p class="exam-card-description">
                    ${escapeHTML(description)}
                </p>

            </div>


            <div class="exam-card-stats">

                <span class="exam-stat">
                    ${subjectCount}
                    <small>Subjects</small>
                </span>

                <span class="exam-stat">
                    ${questionCount}
                    <small>Questions</small>
                </span>

                <span class="exam-stat">
                    ${testCount}
                    <small>Tests</small>
                </span>

            </div>


            <div class="exam-card-footer">

                <span class="exam-card-view">
                    View Exam
                </span>

                <span class="exam-card-arrow">
                    →
                </span>

            </div>

        </article>
    `;
}


// ============================================================
// LOADING CARDS
// ============================================================

function loadingCards(count = 6) {

    let html = "";

    for (
        let i = 0;
        i < count;
        i++
    ) {

        html += `
            <div class="exam-card exam-loading-card">

                <div class="exam-card-top">
                    <div class="exam-skeleton logo"></div>
                </div>

                <div class="exam-card-content">

                    <div class="exam-skeleton line small"></div>

                    <div class="exam-skeleton line"></div>

                    <div class="exam-skeleton line"></div>

                </div>

                <div class="exam-card-stats">

                    <div class="exam-skeleton stat"></div>

                    <div class="exam-skeleton stat"></div>

                    <div class="exam-skeleton stat"></div>

                </div>

            </div>
        `;
    }

    return html;
}


// ============================================================
// LOAD EXAMS FROM FIRESTORE
// ============================================================

async function getAllExams() {

    console.log(
        "RankHub: Loading published exams from Firestore..."
    );

    if (!db) {

        throw new Error(
            "Firebase Firestore database is not initialized."
        );
    }


    const examsRef =
        collection(
            db,
            "exams"
        );


    let snapshot;


    // --------------------------------------------------------
    // First try published query
    // --------------------------------------------------------

    try {

        const publishedQuery =
            query(
                examsRef,
                where(
                    "status",
                    "==",
                    "published"
                )
            );

        snapshot =
            await getDocs(
                publishedQuery
            );

    } catch (error) {

        console.warn(
            "RankHub: Published query failed. Loading exams and filtering locally.",
            error
        );

        snapshot =
            await getDocs(
                examsRef
            );
    }


    const exams = [];


    snapshot.forEach(
        docSnap => {

            const data =
                docSnap.data() || {};

            const exam = {

                id:
                    safeText(
                        data.id,
                        docSnap.id
                    ),

                ...data,

                id:
                    safeText(
                        data.id,
                        docSnap.id
                    )

            };


            // ------------------------------------------------
            // ONLY PUBLISHED
            // ------------------------------------------------

            const status =
                safeText(
                    exam.status
                ).toLowerCase();


            if (
                status === "published"
            ) {

                exams.push(
                    exam
                );

            }

        }
    );


    // --------------------------------------------------------
    // SORT
    // --------------------------------------------------------

    exams.sort(
        (a, b) => {

            const aPopular =
                a.isPopular === true
                    ? 1
                    : 0;

            const bPopular =
                b.isPopular === true
                    ? 1
                    : 0;

            if (
                aPopular !== bPopular
            ) {

                return (
                    bPopular -
                    aPopular
                );

            }


            return safeText(
                a.name
            ).localeCompare(
                safeText(b.name)
            );

        }
    );


    console.log(
        `RankHub: ${exams.length} published exams found.`
    );


    return exams;
}


// ============================================================
// REFRESH EXAMS
// ============================================================

async function refreshExams() {

    allExams =
        await getAllExams();

    renderInitial();

    return [
        ...allExams
    ];
}


// ============================================================
// ERROR UI
// ============================================================

function showLoadError(error) {

    console.error(
        "RankHub: Failed to load exams:",
        error
    );


    if (popularGrid) {

        popularGrid.innerHTML = `
            <div class="exam-load-error">

                <div class="exam-load-error-icon">
                    ⚠️
                </div>

                <h3>
                    Unable to load exams
                </h3>

                <p>
                    Exams could not be loaded right now.
                    Please refresh the page.
                </p>

                <button
                    type="button"
                    class="exam-retry-btn"
                    id="examRetryBtn"
                >
                    Retry
                </button>

            </div>
        `;
    }


    if (allGrid) {
        allGrid.innerHTML = "";
    }


    const retry =
        $("examRetryBtn");


    if (retry) {

        retry.addEventListener(
            "click",
            () => {

                loadPageData(
                    true
                );

            }
        );

    }
}


// ============================================================
// POPULAR EXAMS
// ============================================================

function renderPopularExams(exams) {

    if (!popularGrid) {
        return;
    }


    if (!exams.length) {

        popularGrid.innerHTML = `
            <div class="exam-no-popular">
                No popular exams available yet.
            </div>
        `;

        return;
    }


    popularGrid.innerHTML =
        exams
            .map(createExamCard)
            .join("");
}


// ============================================================
// ALL EXAMS
// ============================================================

function renderAllExams(exams) {

    if (!allGrid) {
        return;
    }


    if (!exams.length) {

        allGrid.innerHTML = "";

        return;
    }


    allGrid.innerHTML =
        exams
            .map(createExamCard)
            .join("");
}


// ============================================================
// CATEGORIES
// ============================================================

function getAvailableCategories(exams) {

    const map =
        new Map();


    map.set(
        "all",
        "All"
    );


    for (
        const exam of exams
    ) {

        const category =
            normalizeCategory(
                exam.category
            );

        const key =
            categoryKey(
                category
            );


        if (!key) {
            continue;
        }


        if (
            key === "popular"
        ) {
            continue;
        }


        if (
            !map.has(key)
        ) {

            map.set(
                key,
                category
            );

        }

    }


    return Array.from(
        map.values()
    );
}


// ============================================================
// RENDER CATEGORIES
// ============================================================

function renderCategories(exams) {

    if (!categoryContainer) {
        return;
    }


    const categories =
        getAvailableCategories(
            exams
        );


    categoryContainer.innerHTML =
        categories
            .map(
                category => {

                    const active =
                        categoryKey(
                            currentCategory
                        ) ===
                        categoryKey(
                            category
                        );


                    return `
                        <button
                            type="button"
                            class="exam-category-chip ${
                                active
                                    ? "active"
                                    : ""
                            }"
                            data-category="${escapeHTML(category)}"
                        >
                            ${escapeHTML(category)}
                        </button>
                    `;
                }
            )
            .join("");


    categoryContainer
        .querySelectorAll(
            ".exam-category-chip"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        setCategory(
                            button.dataset.category ||
                            "All"
                        );

                    }
                );

            }
        );
}


// ============================================================
// SEARCH COUNT
// ============================================================

function renderSearchCount(
    count,
    searchActive
) {

    if (!searchCountLabel) {
        return;
    }


    if (!searchActive) {

        searchCountLabel.style.display =
            "none";

        searchCountLabel.textContent =
            "";

        return;
    }


    searchCountLabel.style.display =
        "block";

    searchCountLabel.textContent =
        `${count} exam${
            count === 1
                ? ""
                : "s"
        } found`;
}


// ============================================================
// EMPTY STATE
// ============================================================

function showEmptyState(show) {

    if (!emptyState) {
        return;
    }


    emptyState.style.display =
        show
            ? "block"
            : "none";
}


// ============================================================
// SECTION VISIBILITY
// ============================================================

function updateSections() {

    const hasSearch =
        !!safeText(
            currentSearch
        );


    if (popularSection) {

        popularSection.style.display =
            hasSearch
                ? "none"
                : "";
    }


    if (categoriesSection) {

        categoriesSection.style.display =
            "";
    }


    if (allSection) {

        allSection.style.display =
            "";
    }
}


// ============================================================
// APPLY FILTERS
// ============================================================

function applyFilters() {

    const search =
        safeText(
            currentSearch
        ).toLowerCase();


    const selectedCategory =
        safeText(
            currentCategory,
            "All"
        );


    let filtered =
        [...allExams];


    // CATEGORY

    if (
        categoryKey(
            selectedCategory
        ) !== "all"
    ) {

        const selectedKey =
            categoryKey(
                selectedCategory
            );


        filtered =
            filtered.filter(
                exam =>
                    categoryKey(
                        exam.category
                    ) ===
                    selectedKey
            );
    }


    // SEARCH

    if (search) {

        filtered =
            filtered.filter(
                exam => {

                    const searchable =
                        [
                            exam.name,
                            exam.slug,
                            exam.category,
                            exam.shortDescription,
                            exam.description
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();


                    return searchable.includes(
                        search
                    );
                }
            );
    }


    currentExams =
        filtered;


    renderAllExams(
        filtered
    );


    renderSearchCount(
        filtered.length,
        !!search
    );


    updateSections();


    showEmptyState(
        filtered.length === 0
    );


    if (clearSearchBtn) {

        clearSearchBtn.style.display =
            search
                ? "flex"
                : "none";
    }
}


// ============================================================
// SET CATEGORY
// ============================================================

function setCategory(category) {

    currentCategory =
        safeText(
            category,
            "All"
        );


    renderCategories(
        allExams
    );


    applyFilters();


    try {

        window.dispatchEvent(
            new CustomEvent(
                "rankhub:exam-category-changed",
                {
                    detail: {
                        category:
                            currentCategory
                    }
                }
            )
        );

    } catch {
        // Ignore
    }
}


// ============================================================
// SEARCH
// ============================================================

function handleSearchInput() {

    currentSearch =
        searchInput
            ? searchInput.value
            : "";


    if (
        safeText(
            currentSearch
        )
    ) {

        currentCategory =
            "All";

        renderCategories(
            allExams
        );
    }


    applyFilters();
}


// ============================================================
// CLEAR SEARCH
// ============================================================

function clearSearch() {

    currentSearch =
        "";

    currentCategory =
        "All";


    if (searchInput) {
        searchInput.value = "";
    }


    if (clearSearchBtn) {
        clearSearchBtn.style.display =
            "none";
    }


    renderCategories(
        allExams
    );


    applyFilters();


    if (searchInput) {
        searchInput.focus();
    }
}


// ============================================================
// OPEN EXAM
// ============================================================

function openExam(exam) {

    if (!exam) {
        return;
    }


    const slug =
        makeSlug(exam);


    try {

        window.dispatchEvent(
            new CustomEvent(
                "rankhub:exam-selected",
                {
                    detail: {
                        exam
                    }
                }
            )
        );

    } catch {
        // Ignore
    }


    openExamModal(
        exam
    );


    try {

        const url =
            new URL(
                window.location.href
            );


        if (slug) {

            url.searchParams.set(
                "exam",
                slug
            );


            window.history.replaceState(
                {
                    exam: slug
                },
                "",
                url
            );
        }

    } catch {
        // Ignore
    }
}


// ============================================================
// OPEN EXAM MODAL
// ============================================================

function openExamModal(exam) {

    if (
        !detailModal ||
        !modalBackdrop ||
        !modalBody
    ) {

        navigateToExam(
            exam
        );

        return;
    }


    const name =
        safeText(
            exam.name,
            "Exam"
        );


    const category =
        safeText(
            exam.category,
            "General"
        );


    const description =
        safeText(
            exam.description ||
            exam.shortDescription,
            "Prepare smarter with RankHub."
        );


    const access =
        exam.accessType === "premium"
            ? "RankHub Pass"
            : "Free";


    const questionCount =
        Number(
            exam.questionCount
        ) || 0;


    const subjectCount =
        Number(
            exam.subjectCount
        ) || 0;


    const testCount =
        Number(
            exam.testCount
        ) || 0;


    modalBody.innerHTML = `

        <div class="exam-detail">

            <div class="exam-detail-logo">
                ${getExamLogo(exam)}
            </div>

            <span class="exam-detail-category">
                ${escapeHTML(category)}
            </span>

            <h2
                id="examModalTitle"
                class="exam-detail-title"
            >
                ${escapeHTML(name)}
            </h2>

            <p class="exam-detail-description">
                ${escapeHTML(description)}
            </p>

            <div class="exam-detail-stats">

                <div class="exam-detail-stat">
                    <strong>
                        ${subjectCount}
                    </strong>
                    <span>
                        Subjects
                    </span>
                </div>

                <div class="exam-detail-stat">
                    <strong>
                        ${questionCount}
                    </strong>
                    <span>
                        Questions
                    </span>
                </div>

                <div class="exam-detail-stat">
                    <strong>
                        ${testCount}
                    </strong>
                    <span>
                        Tests
                    </span>
                </div>

            </div>

            <div class="exam-detail-access">

                Access:
                <strong>
                    ${escapeHTML(access)}
                </strong>

            </div>

            <div class="exam-detail-actions">

                <button
                    type="button"
                    class="exam-detail-primary-btn"
                    id="startExamBtn"
                >
                    Start Preparation
                </button>

                <button
                    type="button"
                    class="exam-detail-secondary-btn"
                    id="viewExamPageBtn"
                >
                    View Exam
                </button>

            </div>

        </div>
    `;


    detailModal.classList.add(
        "active"
    );


    modalBackdrop.classList.add(
        "active"
    );


    document.body.classList.add(
        "exam-modal-open"
    );


    const startButton =
        $("startExamBtn");


    if (startButton) {

        startButton.addEventListener(
            "click",
            () => {

                navigateToExam(
                    exam
                );

            }
        );
    }


    const viewButton =
        $("viewExamPageBtn");


    if (viewButton) {

        viewButton.addEventListener(
            "click",
            () => {

                navigateToExam(
                    exam
                );

            }
        );
    }
}


// ============================================================
// NAVIGATE TO EXAM
// ============================================================

function navigateToExam(exam) {

    const slug =
        makeSlug(exam);


    if (!slug) {

        console.warn(
            "RankHub: Exam has no slug/id.",
            exam
        );

        return;
    }


    window.location.href =
        `./exam.html?exam=${encodeURIComponent(slug)}`;
}


// ============================================================
// CLOSE MODAL
// ============================================================

function closeExamModal() {

    if (detailModal) {

        detailModal.classList.remove(
            "active"
        );
    }


    if (modalBackdrop) {

        modalBackdrop.classList.remove(
            "active"
        );
    }


    document.body.classList.remove(
        "exam-modal-open"
    );


    try {

        const url =
            new URL(
                window.location.href
            );


        url.searchParams.delete(
            "exam"
        );


        window.history.replaceState(
            {},
            "",
            url
        );

    } catch {
        // Ignore
    }
}


// ============================================================
// CARD CLICK
// ============================================================

function handleCardInteraction(event) {

    const card =
        event.target.closest(
            ".exam-card"
        );


    if (!card) {
        return;
    }


    const id =
        card.dataset.examId;


    const slug =
        card.dataset.examSlug;


    const exam =
        allExams.find(
            item =>
                safeText(item.id) ===
                    safeText(id) ||
                makeSlug(item) ===
                    safeText(slug)
        );


    if (!exam) {

        console.warn(
            "RankHub: Exam not found.",
            {
                id,
                slug
            }
        );

        return;
    }


    openExam(
        exam
    );
}


// ============================================================
// KEYBOARD
// ============================================================

function handleCardKeyboard(event) {

    if (
        event.key !== "Enter" &&
        event.key !== " "
    ) {
        return;
    }


    const card =
        event.target.closest(
            ".exam-card"
        );


    if (!card) {
        return;
    }


    event.preventDefault();


    handleCardInteraction(
        event
    );
}


// ============================================================
// CARD EVENTS
// ============================================================

function bindCardEvents() {

    if (popularGrid) {

        popularGrid.addEventListener(
            "click",
            handleCardInteraction
        );

        popularGrid.addEventListener(
            "keydown",
            handleCardKeyboard
        );
    }


    if (allGrid) {

        allGrid.addEventListener(
            "click",
            handleCardInteraction
        );

        allGrid.addEventListener(
            "keydown",
            handleCardKeyboard
        );
    }
}


// ============================================================
// SEARCH EVENTS
// ============================================================

function bindSearchEvents() {

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            handleSearchInput
        );


        searchInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    clearSearch();

                }

            }
        );
    }


    if (clearSearchBtn) {

        clearSearchBtn.addEventListener(
            "click",
            clearSearch
        );
    }


    if (emptyResetBtn) {

        emptyResetBtn.addEventListener(
            "click",
            clearSearch
        );
    }
}


// ============================================================
// MODAL EVENTS
// ============================================================

function bindModalEvents() {

    if (modalCloseBtn) {

        modalCloseBtn.addEventListener(
            "click",
            closeExamModal
        );
    }


    if (modalBackdrop) {

        modalBackdrop.addEventListener(
            "click",
            closeExamModal
        );
    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                detailModal &&
                detailModal.classList.contains(
                    "active"
                )
            ) {

                closeExamModal();

            }

        }
    );
}


// ============================================================
// INITIAL RENDER
// ============================================================

function renderInitial() {

    currentCategory =
        "All";

    currentSearch =
        "";


    renderCategories(
        allExams
    );


    const popular =
        allExams.filter(
            exam =>
                exam.isPopular === true ||
                categoryKey(
                    exam.category
                ) === "popular"
        );


    renderPopularExams(
        popular
    );


    currentExams =
        [...allExams];


    renderAllExams(
        allExams
    );


    renderSearchCount(
        allExams.length,
        false
    );


    showEmptyState(
        allExams.length === 0
    );


    updateSections();
}


// ============================================================
// LOAD PAGE DATA
// ============================================================

async function loadPageData(
    forceRefresh = false
) {

    try {

        if (popularGrid) {

            popularGrid.innerHTML =
                loadingCards(4);
        }


        if (allGrid) {

            allGrid.innerHTML =
                loadingCards(8);
        }


        showEmptyState(
            false
        );


        if (forceRefresh) {

            console.log(
                "RankHub: Refreshing exams..."
            );
        }


        allExams =
            await getAllExams();


        if (
            !Array.isArray(
                allExams
            )
        ) {

            allExams = [];

        }


        renderInitial();


        console.log(
            `RankHub: ${allExams.length} exams rendered on user website.`
        );


        initialized =
            true;


        openExamFromURL();

    } catch (error) {

        showLoadError(
            error
        );
    }
}


// ============================================================
// OPEN EXAM FROM URL
// ============================================================

function openExamFromURL() {

    try {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const examValue =
            params.get("exam");


        if (!examValue) {
            return;
        }


        const decoded =
            decodeURIComponent(
                examValue
            );


        const exam =
            allExams.find(
                item =>
                    safeText(item.id)
                        .toLowerCase() ===
                        decoded.toLowerCase() ||

                    safeText(item.slug)
                        .toLowerCase() ===
                        decoded.toLowerCase()
            );


        if (exam) {

            setTimeout(
                () => {

                    openExamModal(
                        exam
                    );

                },
                100
            );
        }

    } catch (error) {

        console.warn(
            "RankHub: Could not open exam from URL.",
            error
        );
    }
}


// ============================================================
// PUBLIC REFRESH
// ============================================================

export async function refreshExamPage() {

    try {

        allExams =
            await refreshExams();


        return allExams;

    } catch (error) {

        console.error(
            "RankHub: Exam refresh failed:",
            error
        );

        throw error;
    }
}


// ============================================================
// GET CURRENT EXAMS
// ============================================================

export function getCurrentExams() {

    return [
        ...currentExams
    ];
}


// ============================================================
// GET LOADED EXAMS
// ============================================================

export function getLoadedExams() {

    return [
        ...allExams
    ];
}


// ============================================================
// GET CURRENT CATEGORY
// ============================================================

export function getCurrentCategory() {

    return currentCategory;
}


// ============================================================
// GET CURRENT SEARCH
// ============================================================

export function getCurrentSearch() {

    return currentSearch;
}


// ============================================================
// INITIALIZATION
// ============================================================

async function init() {

    if (initialized) {
        return;
    }


    initDOM();


    bindSearchEvents();

    bindCardEvents();

    bindModalEvents();


    await loadPageData();
}


// ============================================================
// DOM READY
// ============================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        init,
        {
            once: true
        }
    );

} else {

    init();
}


// ============================================================
// GLOBAL DEBUG API
// ============================================================

if (
    typeof window !==
    "undefined"
) {

    window.RankHubExamsPage = {

        init,

        refresh:
            refreshExamPage,

        getCurrent:
            getCurrentExams,

        getLoaded:
            getLoadedExams,

        getCategory:
            getCurrentCategory,

        getSearch:
            getCurrentSearch,

        setCategory,

        clearSearch,

        openExam,

        closeModal:
            closeExamModal

    };
}


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {

    init,

    refreshExamPage,

    getCurrentExams,

    getLoadedExams,

    getCurrentCategory,

    getCurrentSearch,

    setCategory,

    clearSearch,

    openExam,

    closeExamModal

};
