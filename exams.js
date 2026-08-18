// ============================================================
// RANKHUB - USER WEBSITE
// EXAM DATA STORE
// File: js/exam.js
// FINAL COPY-PASTE VERSION
// ============================================================
//
// FIRESTORE COLLECTION:
//     exams
//
// USER WEBSITE:
//     Only status === "published" exams are returned.
//
// IMPORTANT:
//     This file is for USER WEBSITE.
//     Admin exam management must use a separate exams.js.
//
// FIREBASE FILE EXPECTED:
//     js/firebase.js
//
// firebase.js must export:
//     export { db, auth, ... }
//
// ============================================================

import {
    collection,
    getDocs,
    getDoc,
    doc,
    query,
    where
} from "firebase/firestore";

import { db } from "./firebase.js";


// ============================================================
// CATEGORIES
// ============================================================

export const CATEGORIES = [
    "All",
    "Popular",
    "Banking",
    "SSC",
    "Railway",
    "UPSC",
    "State PSC",
    "Police",
    "Defence",
    "Teaching",
    "Medical",
    "Engineering",
    "Law",
    "Insurance",
    "MBA",
    "CUET",
    "State Government Jobs"
];


// ============================================================
// CACHE
// ============================================================

let examsCache = [];

let examsLoaded = false;

let examsLoadingPromise = null;


// ============================================================
// FIRESTORE CHECK
// ============================================================

function ensureFirestore() {

    if (!db) {
        throw new Error(
            "RankHub: Firestore is not initialized."
        );
    }

    return db;
}


// ============================================================
// SAFE STRING
// ============================================================

function safeString(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();
}


// ============================================================
// SAFE NUMBER
// ============================================================

function safeNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


// ============================================================
// DATE VALUE
// ============================================================

function getDateValue(value) {

    if (!value) {
        return 0;
    }

    try {

        // Firebase Timestamp
        if (
            typeof value.toDate === "function"
        ) {
            return value
                .toDate()
                .getTime();
        }

        // JS Date
        if (
            value instanceof Date
        ) {
            return value.getTime();
        }

        // Number
        if (
            typeof value === "number"
        ) {
            return value;
        }

        // String
        const parsed =
            new Date(value).getTime();

        return Number.isFinite(parsed)
            ? parsed
            : 0;

    } catch {

        return 0;
    }
}


// ============================================================
// NORMALIZE EXAM
// ============================================================

function normalizeExam(
    id,
    data = {}
) {

    return {

        // ----------------------------------------------------
        // BASIC
        // ----------------------------------------------------

        id: safeString(id),

        name:
            safeString(data.name),

        slug:
            safeString(data.slug),


        // ----------------------------------------------------
        // CATEGORY
        // ----------------------------------------------------

        category:
            safeString(data.category),


        // ----------------------------------------------------
        // DESCRIPTION
        // ----------------------------------------------------

        shortDescription:
            safeString(
                data.shortDescription
            ),

        description:
            safeString(
                data.description
            ),


        // ----------------------------------------------------
        // IMAGES
        // ----------------------------------------------------

        logoUrl:
            safeString(
                data.logoUrl
            ),

        bannerUrl:
            safeString(
                data.bannerUrl
            ),


        // ----------------------------------------------------
        // ACCESS
        // ----------------------------------------------------

        accessType:
            data.accessType === "premium"
                ? "premium"
                : "free",


        // ----------------------------------------------------
        // STATUS
        // ----------------------------------------------------

        status:
            safeString(
                data.status
            ).toLowerCase() || "draft",


        // ----------------------------------------------------
        // ORDER
        // ----------------------------------------------------

        displayOrder:
            safeNumber(
                data.displayOrder ??
                data.order,
                999999
            ),


        // ----------------------------------------------------
        // COUNTS
        // ----------------------------------------------------

        subjectCount:
            safeNumber(
                data.subjectCount,
                0
            ),

        questionCount:
            safeNumber(
                data.questionCount,
                0
            ),

        testCount:
            safeNumber(
                data.testCount,
                0
            ),


        // ----------------------------------------------------
        // FLAGS
        // ----------------------------------------------------

        featured:
            data.featured === true,

        isPopular:
            data.isPopular === true,

        isUpcoming:
            data.isUpcoming === true,


        // ----------------------------------------------------
        // DATES
        // ----------------------------------------------------

        createdAt:
            data.createdAt || null,

        updatedAt:
            data.updatedAt || null,


        // ----------------------------------------------------
        // ADMIN INFO
        // ----------------------------------------------------

        createdBy:
            safeString(
                data.createdBy
            ),

        updatedBy:
            safeString(
                data.updatedBy
            )

    };
}


// ============================================================
// SORT
// ============================================================

function sortExams(
    exams
) {

    return [...exams].sort(
        (a, b) => {

            const orderA =
                safeNumber(
                    a.displayOrder,
                    999999
                );

            const orderB =
                safeNumber(
                    b.displayOrder,
                    999999
                );


            // First: display order
            if (
                orderA !== orderB
            ) {
                return (
                    orderA -
                    orderB
                );
            }


            // Second: newest first
            return (
                getDateValue(
                    b.createdAt
                ) -
                getDateValue(
                    a.createdAt
                )
            );

        }
    );
}


// ============================================================
// LOAD EXAMS
// ============================================================
//
// IMPORTANT:
// We intentionally load the collection first and filter
// published exams in JavaScript.
//
// This avoids:
//     - composite index problems
//     - orderBy index problems
//     - "failed-precondition" query issues
//
// ============================================================

export async function loadExams(
    forceRefresh = false
) {

    // --------------------------------------------------------
    // CACHE
    // --------------------------------------------------------

    if (
        examsLoaded &&
        !forceRefresh
    ) {

        return [
            ...examsCache
        ];

    }


    // --------------------------------------------------------
    // PREVENT DUPLICATE REQUEST
    // --------------------------------------------------------

    if (
        examsLoadingPromise &&
        !forceRefresh
    ) {

        return examsLoadingPromise;

    }


    examsLoadingPromise =
        (async () => {

            try {

                ensureFirestore();


                console.log(
                    "RankHub: Loading exams..."
                );


                // ------------------------------------------------
                // FIRESTORE COLLECTION
                // ------------------------------------------------

                const examsRef =
                    collection(
                        db,
                        "exams"
                    );


                // ------------------------------------------------
                // LOAD ALL DOCUMENTS
                // ------------------------------------------------

                const snapshot =
                    await getDocs(
                        examsRef
                    );


                const exams = [];


                // ------------------------------------------------
                // PROCESS DOCUMENTS
                // ------------------------------------------------

                snapshot.forEach(
                    (examDoc) => {

                        const data =
                            examDoc.data() || {};


                        const exam =
                            normalizeExam(
                                examDoc.id,
                                data
                            );


                        // ----------------------------------------
                        // ONLY PUBLISHED
                        // ----------------------------------------

                        if (
                            exam.status ===
                            "published"
                        ) {

                            exams.push(
                                exam
                            );

                        }

                    }
                );


                // ------------------------------------------------
                // SORT
                // ------------------------------------------------

                const sorted =
                    sortExams(
                        exams
                    );


                // ------------------------------------------------
                // CACHE
                // ------------------------------------------------

                examsCache =
                    sorted;

                examsLoaded =
                    true;


                console.log(
                    `RankHub: ${sorted.length} published exams loaded.`
                );


                return [
                    ...sorted
                ];

            } catch (error) {

                console.error(
                    "RankHub: Failed to load exams:",
                    error
                );


                examsCache = [];

                examsLoaded = false;


                throw error;

            } finally {

                examsLoadingPromise =
                    null;

            }

        })();


    return examsLoadingPromise;
}


// ============================================================
// GET ALL PUBLISHED EXAMS
// ============================================================

export async function getAllExams() {

    return await loadExams();

}


// ============================================================
// GET EXAM BY DOCUMENT ID
// ============================================================

export async function getExamById(
    id
) {

    const requestedId =
        safeString(id);


    if (!requestedId) {
        return null;
    }


    // --------------------------------------------------------
    // CACHE FIRST
    // --------------------------------------------------------

    if (examsLoaded) {

        const cached =
            examsCache.find(
                exam =>
                    exam.id ===
                    requestedId
            );


        if (cached) {
            return cached;
        }

    }


    // --------------------------------------------------------
    // FIRESTORE
    // --------------------------------------------------------

    ensureFirestore();


    try {

        const examRef =
            doc(
                db,
                "exams",
                requestedId
            );


        const snapshot =
            await getDoc(
                examRef
            );


        if (
            !snapshot.exists()
        ) {

            return null;

        }


        const exam =
            normalizeExam(
                snapshot.id,
                snapshot.data()
            );


        // NEVER SHOW DRAFT
        if (
            exam.status !==
            "published"
        ) {

            return null;

        }


        return exam;

    } catch (error) {

        console.error(
            "RankHub: Failed to get exam by ID:",
            error
        );

        return null;

    }
}


// ============================================================
// GET EXAM BY SLUG
// ============================================================

export async function getExamBySlug(
    slug
) {

    const requestedSlug =
        safeString(slug);


    if (!requestedSlug) {
        return null;
    }


    // --------------------------------------------------------
    // CACHE FIRST
    // --------------------------------------------------------

    if (examsLoaded) {

        const cached =
            examsCache.find(
                exam =>
                    exam.slug
                        .toLowerCase() ===
                    requestedSlug
                        .toLowerCase()
            );


        if (cached) {
            return cached;
        }

    }


    // --------------------------------------------------------
    // FIRESTORE
    // --------------------------------------------------------

    ensureFirestore();


    try {

        const examsRef =
            collection(
                db,
                "exams"
            );


        const slugQuery =
            query(
                examsRef,
                where(
                    "slug",
                    "==",
                    requestedSlug
                )
            );


        const snapshot =
            await getDocs(
                slugQuery
            );


        if (
            snapshot.empty
        ) {

            return null;

        }


        const examDoc =
            snapshot.docs[0];


        const exam =
            normalizeExam(
                examDoc.id,
                examDoc.data()
            );


        // NEVER SHOW DRAFT
        if (
            exam.status !==
            "published"
        ) {

            return null;

        }


        return exam;

    } catch (error) {

        console.error(
            "RankHub: Failed to get exam by slug:",
            error
        );

        return null;

    }
}


// ============================================================
// GET EXAM BY ID OR SLUG
// ============================================================

export async function findExam(
    value
) {

    const search =
        safeString(value)
            .toLowerCase();


    if (!search) {
        return null;
    }


    // --------------------------------------------------------
    // CACHE
    // --------------------------------------------------------

    if (examsLoaded) {

        const cached =
            examsCache.find(
                exam =>

                    exam.id
                        .toLowerCase() ===
                    search ||

                    exam.slug
                        .toLowerCase() ===
                    search ||

                    exam.name
                        .toLowerCase() ===
                    search
            );


        if (cached) {
            return cached;
        }

    }


    // --------------------------------------------------------
    // TRY ID
    // --------------------------------------------------------

    const byId =
        await getExamById(
            value
        );


    if (byId) {
        return byId;
    }


    // --------------------------------------------------------
    // TRY SLUG
    // --------------------------------------------------------

    const bySlug =
        await getExamBySlug(
            value
        );


    if (bySlug) {
        return bySlug;
    }


    return null;
}


// ============================================================
// GET EXAM BY ID OR SLUG
// Alias
// ============================================================

export async function getExam(
    value
) {

    return await findExam(
        value
    );

}


// ============================================================
// FILTER EXAMS
// ============================================================

export async function filterExams(
    category = "All",
    searchQuery = ""
) {

    const exams =
        await getAllExams();


    const selectedCategory =
        safeString(
            category || "All"
        ).toLowerCase();


    const search =
        safeString(
            searchQuery
        ).toLowerCase();


    return exams.filter(
        exam => {

            // ----------------------------------------------
            // CATEGORY
            // ----------------------------------------------

            const matchesCategory =
                !selectedCategory ||

                selectedCategory ===
                    "all" ||

                exam.category
                    .toLowerCase() ===
                    selectedCategory;


            // ----------------------------------------------
            // SEARCH
            // ----------------------------------------------

            const searchable =
                [
                    exam.name,
                    exam.slug,
                    exam.category,
                    exam.shortDescription,
                    exam.description
                ]
                    .join(" ")
                    .toLowerCase();


            const matchesSearch =
                !search ||
                searchable.includes(
                    search
                );


            return (
                matchesCategory &&
                matchesSearch
            );

        }
    );

}


// ============================================================
// SEARCH
// ============================================================

export async function searchExams(
    searchQuery = ""
) {

    return await filterExams(
        "All",
        searchQuery
    );

}


// ============================================================
// CATEGORY
// ============================================================

export async function getExamsByCategory(
    category
) {

    return await filterExams(
        category,
        ""
    );

}


// ============================================================
// FEATURED
// ============================================================

export async function getFeaturedExams() {

    const exams =
        await getAllExams();


    return exams.filter(
        exam =>
            exam.featured === true
    );

}


// ============================================================
// POPULAR
// ============================================================

export async function getPopularExams() {

    const exams =
        await getAllExams();


    return exams.filter(
        exam =>

            exam.isPopular === true ||

            exam.category
                .toLowerCase() ===
                "popular"
    );

}


// ============================================================
// UPCOMING
// ============================================================

export async function getUpcomingExams() {

    const exams =
        await getAllExams();


    return exams.filter(
        exam =>
            exam.isUpcoming === true
    );

}


// ============================================================
// FREE
// ============================================================

export async function getFreeExams() {

    const exams =
        await getAllExams();


    return exams.filter(
        exam =>
            exam.accessType ===
            "free"
    );

}


// ============================================================
// PREMIUM
// ============================================================

export async function getPremiumExams() {

    const exams =
        await getAllExams();


    return exams.filter(
        exam =>
            exam.accessType ===
            "premium"
    );

}


// ============================================================
// CHECK EXAM EXISTS
// ============================================================

export async function examExists(
    value
) {

    const exam =
        await findExam(
            value
        );


    return !!exam;

}


// ============================================================
// REFRESH
// ============================================================

export async function refreshExams() {

    console.log(
        "RankHub: Refreshing exam cache..."
    );


    examsCache = [];

    examsLoaded = false;

    examsLoadingPromise = null;


    return await loadExams(
        true
    );

}


// ============================================================
// CLEAR CACHE
// ============================================================

export function clearExamCache() {

    examsCache = [];

    examsLoaded = false;

    examsLoadingPromise = null;


    console.log(
        "RankHub: Exam cache cleared."
    );

}


// ============================================================
// STORE STATUS
// ============================================================

export function getExamStoreStatus() {

    return {

        loaded:
            examsLoaded,

        loading:
            !!examsLoadingPromise,

        count:
            examsCache.length,

        exams:
            [
                ...examsCache
            ]

    };

}


// ============================================================
// DEBUG
// ============================================================

export async function debugExams() {

    try {

        ensureFirestore();


        console.log(
            "======================================"
        );

        console.log(
            "RANKHUB USER EXAM DEBUG"
        );

        console.log(
            "======================================"
        );

        console.log(
            "Firestore:",
            db
        );


        const examsRef =
            collection(
                db,
                "exams"
            );


        const snapshot =
            await getDocs(
                examsRef
            );


        console.log(
            "Total Firestore documents:",
            snapshot.size
        );


        snapshot.forEach(
            examDoc => {

                console.log(
                    "----------------------------------"
                );

                console.log(
                    "ID:",
                    examDoc.id
                );

                console.log(
                    "DATA:",
                    examDoc.data()
                );

            }
        );


        console.log(
            "======================================"
        );


        return snapshot.size;

    } catch (error) {

        console.error(
            "RankHub: Exam debug failed:",
            error
        );


        return 0;

    }

}


// ============================================================
// INITIALIZATION
// ============================================================
//
// NO automatic Firestore request here.
// The page can call:
//
//     getAllExams()
//
// This prevents unnecessary requests on pages that don't
// actually use exams.
// ============================================================


// ============================================================
// GLOBAL DEBUG API
// ============================================================

if (
    typeof window !==
    "undefined"
) {

    window.RankHubExams = {

        getAll:
            getAllExams,

        get:
            getExam,

        getById:
            getExamById,

        getBySlug:
            getExamBySlug,

        find:
            findExam,

        search:
            searchExams,

        filter:
            filterExams,

        byCategory:
            getExamsByCategory,

        featured:
            getFeaturedExams,

        popular:
            getPopularExams,

        upcoming:
            getUpcomingExams,

        free:
            getFreeExams,

        premium:
            getPremiumExams,

        exists:
            examExists,

        refresh:
            refreshExams,

        clearCache:
            clearExamCache,

        status:
            getExamStoreStatus,

        debug:
            debugExams

    };

}


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {

    loadExams,

    getAllExams,

    getExam,

    getExamById,

    getExamBySlug,

    findExam,

    filterExams,

    searchExams,

    getExamsByCategory,

    getFeaturedExams,

    getPopularExams,

    getUpcomingExams,

    getFreeExams,

    getPremiumExams,

    examExists,

    refreshExams,

    clearExamCache,

    getExamStoreStatus,

    debugExams

};
