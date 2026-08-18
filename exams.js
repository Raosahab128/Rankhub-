// ============================================================
// RANKHUB - USER WEBSITE EXAM DATA STORE
// exam.js
// FINAL FIRESTORE VERSION
// ============================================================
//
// Firestore collection:
//      exams
//
// Expected document fields:
//
// name
// slug
// category
// shortDescription
// description
// logoUrl
// bannerUrl
// accessType
// status
// displayOrder
// subjectCount
// featured
// isPopular
// isUpcoming
// createdAt
// updatedAt
//
// ============================================================

import {
    collection,
    getDocs,
    getDoc,
    doc,
    query,
    where,
    orderBy
} from "firebase/firestore";

import { db } from "./firebase-init.js";


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
// FIREBASE CHECK
// ============================================================

function ensureFirestore() {

    if (!db) {
        throw new Error(
            "RankHub: Firestore database is not initialized."
        );
    }

    return db;
}


// ============================================================
// DATE HELPER
// ============================================================

function getDateValue(value) {

    if (!value) {
        return 0;
    }

    try {

        // Firebase Timestamp
        if (
            value &&
            typeof value.toDate === "function"
        ) {
            return value.toDate().getTime();
        }

        // JS Date
        if (value instanceof Date) {
            return value.getTime();
        }

        // Number timestamp
        if (typeof value === "number") {
            return value;
        }

        // String date
        const date = new Date(value).getTime();

        return Number.isNaN(date)
            ? 0
            : date;

    } catch (error) {

        return 0;
    }
}


// ============================================================
// NORMALIZE EXAM
// ============================================================

function normalizeExam(id, data = {}) {

    return {

        // Basic
        id: id || "",

        name:
            String(data.name || "").trim(),

        slug:
            String(data.slug || "").trim(),

        // Category
        category:
            String(data.category || "").trim(),

        // Description
        shortDescription:
            data.shortDescription || "",

        description:
            data.description || "",

        // Images
        logoUrl:
            data.logoUrl || "",

        bannerUrl:
            data.bannerUrl || "",

        // Access
        accessType:
            data.accessType === "premium"
                ? "premium"
                : "free",

        // Status
        status:
            data.status || "draft",

        // Ordering
        displayOrder:
            Number(
                data.displayOrder ??
                data.order ??
                999999
            ),

        // Counts
        subjectCount:
            Number(data.subjectCount ?? 0),

        questionCount:
            Number(data.questionCount ?? 0),

        testCount:
            Number(data.testCount ?? 0),

        // Flags
        featured:
            data.featured === true,

        isPopular:
            data.isPopular === true,

        isUpcoming:
            data.isUpcoming === true,

        // Dates
        createdAt:
            data.createdAt || null,

        updatedAt:
            data.updatedAt || null,

        // Admin information
        createdBy:
            data.createdBy || "",

        updatedBy:
            data.updatedBy || ""

    };
}


// ============================================================
// SORT EXAMS
// ============================================================

function sortExams(exams) {

    return [...exams].sort((a, b) => {

        const orderA =
            Number(a.displayOrder ?? 999999);

        const orderB =
            Number(b.displayOrder ?? 999999);

        if (orderA !== orderB) {
            return orderA - orderB;
        }

        return (
            getDateValue(b.createdAt) -
            getDateValue(a.createdAt)
        );

    });
}


// ============================================================
// LOAD PUBLISHED EXAMS
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
        return [...examsCache];
    }


    // --------------------------------------------------------
    // PREVENT DUPLICATE REQUESTS
    // --------------------------------------------------------

    if (
        examsLoadingPromise &&
        !forceRefresh
    ) {
        return examsLoadingPromise;
    }


    // --------------------------------------------------------
    // LOAD
    // --------------------------------------------------------

    examsLoadingPromise = (async () => {

        try {

            ensureFirestore();

            console.log(
                "RankHub: Loading published exams from Firestore..."
            );


            const examsRef =
                collection(db, "exams");


            let snapshot;


            // =================================================
            // FIRST TRY:
            // status + displayOrder
            // =================================================

            try {

                const examsQuery =
                    query(
                        examsRef,
                        where(
                            "status",
                            "==",
                            "published"
                        ),
                        orderBy(
                            "displayOrder",
                            "asc"
                        )
                    );


                snapshot =
                    await getDocs(
                        examsQuery
                    );


            } catch (queryError) {

                console.warn(
                    "RankHub: Ordered exam query failed.",
                    queryError
                );


                // =================================================
                // FALLBACK:
                // ONLY STATUS FILTER
                // =================================================

                try {

                    const fallbackQuery =
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
                            fallbackQuery
                        );


                } catch (fallbackError) {

                    console.warn(
                        "RankHub: Status query failed. Loading all exams.",
                        fallbackError
                    );


                    // =================================================
                    // FINAL FALLBACK:
                    // LOAD ALL DOCUMENTS
                    // =================================================

                    snapshot =
                        await getDocs(
                            examsRef
                        );

                }

            }


            const exams = [];


            // =================================================
            // CONVERT FIRESTORE DOCUMENTS
            // =================================================

            snapshot.forEach(
                (examDoc) => {

                    const data =
                        examDoc.data() || {};


                    const exam =
                        normalizeExam(
                            examDoc.id,
                            data
                        );


                    // ------------------------------------------------
                    // IMPORTANT
                    // Final fallback may contain drafts.
                    // User website must NEVER show drafts.
                    // ------------------------------------------------

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


            // =================================================
            // SORT
            // =================================================

            const sortedExams =
                sortExams(exams);


            // =================================================
            // CACHE
            // =================================================

            examsCache =
                sortedExams;

            examsLoaded =
                true;


            console.log(
                `RankHub: ${sortedExams.length} published exams loaded.`
            );


            return [
                ...sortedExams
            ];


        } catch (error) {

            console.error(
                "RankHub: Failed to load exams:",
                error
            );


            examsCache =
                [];

            examsLoaded =
                false;


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
// GET ALL EXAMS INCLUDING DRAFTS
// ============================================================
//
// Useful only for admin/debug purposes.
// User website should normally use getAllExams().
// ============================================================

export async function getAllExamsIncludingDrafts() {

    ensureFirestore();

    try {

        const examsRef =
            collection(
                db,
                "exams"
            );


        const snapshot =
            await getDocs(
                examsRef
            );


        const exams = [];


        snapshot.forEach(
            (examDoc) => {

                exams.push(
                    normalizeExam(
                        examDoc.id,
                        examDoc.data()
                    )
                );

            }
        );


        return sortExams(
            exams
        );


    } catch (error) {

        console.error(
            "RankHub: Failed to load all exams:",
            error
        );


        return [];

    }
}


// ============================================================
// GET EXAM BY ID OR SLUG
// ============================================================

export async function getExamById(
    id
) {

    if (!id) {
        return null;
    }


    const requestedId =
        String(id).trim();


    if (!requestedId) {
        return null;
    }


    // =========================================================
    // CHECK CACHE FIRST
    // =========================================================

    if (examsLoaded) {

        const cachedExam =
            examsCache.find(
                exam =>
                    exam.id ===
                        requestedId ||

                    exam.slug ===
                        requestedId
            );


        if (cachedExam) {

            return cachedExam;

        }

    }


    ensureFirestore();


    // =========================================================
    // DIRECT DOCUMENT ID LOOKUP
    // =========================================================

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
            snapshot.exists()
        ) {

            const exam =
                normalizeExam(
                    snapshot.id,
                    snapshot.data()
                );


            // Never return draft
            if (
                exam.status !==
                "published"
            ) {

                return null;

            }


            return exam;

        }

    } catch (error) {

        console.warn(
            "RankHub: Direct exam lookup failed:",
            error
        );

    }


    // =========================================================
    // SLUG LOOKUP
    // =========================================================

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
                    requestedId
                )
            );


        const snapshot =
            await getDocs(
                slugQuery
            );


        if (
            !snapshot.empty
        ) {

            const examDoc =
                snapshot.docs[0];


            const exam =
                normalizeExam(
                    examDoc.id,
                    examDoc.data()
                );


            if (
                exam.status !==
                "published"
            ) {

                return null;

            }


            return exam;

        }

    } catch (error) {

        console.warn(
            "RankHub: Slug exam lookup failed:",
            error
        );

    }


    return null;
}


// ============================================================
// GET EXAM BY SLUG
// ============================================================

export async function getExamBySlug(
    slug
) {

    if (!slug) {
        return null;
    }

    return await getExamById(
        slug
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
        String(
            category || "All"
        )
            .trim();


    const search =
        String(
            searchQuery || ""
        )
            .toLowerCase()
            .trim();


    return exams.filter(
        (exam) => {

            const matchesCategory =
                !selectedCategory ||
                selectedCategory
                    .toLowerCase() ===
                    "all" ||

                exam.category
                    .toLowerCase() ===
                    selectedCategory
                        .toLowerCase();


            const searchableText =
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
                searchableText.includes(
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
// SEARCH EXAMS
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
// GET EXAMS BY CATEGORY
// ============================================================

export async function getExamsByCategory(
    category
) {

    if (
        !category ||
        String(category)
            .toLowerCase() ===
            "all"
    ) {

        return await getAllExams();

    }


    const exams =
        await getAllExams();


    return exams.filter(
        exam =>
            String(
                exam.category
            )
                .toLowerCase() ===
            String(category)
                .toLowerCase()
    );
}


// ============================================================
// FEATURED EXAMS
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
// POPULAR EXAMS
// ============================================================

export async function getPopularExams() {

    const exams =
        await getAllExams();


    return exams.filter(
        exam =>
            exam.isPopular === true ||

            String(
                exam.category
            )
                .toLowerCase() ===
            "popular"
    );
}


// ============================================================
// UPCOMING EXAMS
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
// FREE EXAMS
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
// PREMIUM EXAMS
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
// FIND EXAM
// ============================================================

export async function findExam(
    value
) {

    if (!value) {
        return null;
    }


    const exams =
        await getAllExams();


    const search =
        String(value)
            .toLowerCase()
            .trim();


    return (
        exams.find(
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
        ) || null
    );
}


// ============================================================
// REFRESH EXAMS
// ============================================================

export async function refreshExams() {

    console.log(
        "RankHub: Refreshing exams..."
    );


    examsCache =
        [];

    examsLoaded =
        false;

    examsLoadingPromise =
        null;


    return await loadExams(
        true
    );
}


// ============================================================
// CLEAR CACHE
// ============================================================

export function clearExamCache() {

    console.log(
        "RankHub: Clearing exam cache..."
    );


    examsCache =
        [];

    examsLoaded =
        false;

    examsLoadingPromise =
        null;
}


// ============================================================
// CHECK IF EXAM EXISTS
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
// GET EXAM STORE STATUS
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
            [...examsCache]

    };
}


// ============================================================
// DEBUG FIRESTORE
// ============================================================

export async function debugExams() {

    try {

        ensureFirestore();


        console.log(
            "===================================="
        );

        console.log(
            "RANKHUB EXAM DEBUG"
        );

        console.log(
            "===================================="
        );

        console.log(
            "Firestore DB:",
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
            "Total Firestore exam documents:",
            snapshot.size
        );


        snapshot.forEach(
            (examDoc) => {

                console.log(
                    "Exam:",
                    examDoc.id,
                    examDoc.data()
                );

            }
        );


        console.log(
            "===================================="
        );


        return snapshot.size;


    } catch (error) {

        console.error(
            "RankHub exam debug failed:",
            error
        );


        return 0;

    }
}


// ============================================================
// INITIAL LOAD
// ============================================================
//
// This loads exams automatically when this module is imported.
// If the page needs a custom loading flow, simply ignore this
// and call getAllExams() manually.
// ============================================================

loadExams()
    .then(
        (exams) => {

            console.log(
                `RankHub: Exam store ready. ${exams.length} exams available.`
            );

        }
    )
    .catch(
        (error) => {

            console.warn(
                "RankHub: Initial exam store load failed:",
                error
            );

        }
    );


// ============================================================
// GLOBAL DEBUG HELPERS
// ============================================================
//
// Browser console:
//   await window.RankHubExams.refresh()
//   await window.RankHubExams.debug()
//   window.RankHubExams.status()
// ============================================================

if (
    typeof window !==
    "undefined"
) {

    window.RankHubExams = {

        getAll:
            getAllExams,

        getById:
            getExamById,

        getBySlug:
            getExamBySlug,

        search:
            searchExams,

        filter:
            filterExams,

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
