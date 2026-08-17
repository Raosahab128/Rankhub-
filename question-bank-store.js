/**
 * ============================================================
 * RANKHUB - QUESTION BANK & PRACTICE SYSTEM
 * ============================================================
 *
 * FIRESTORE ONLY QUESTION BANK
 *
 * Questions:
 *   Firestore collection:
 *   /questions/{questionId}
 *
 * User data:
 *   localStorage
 *   - bookmarks
 *   - practice history
 *   - stats
 *   - reports
 *
 * IMPORTANT:
 * - NO DEFAULT QUESTIONS
 * - NO INITIAL QUESTION BANK
 * - NO AUTOMATIC QUESTION CREATION
 * - NO LOCALSTORAGE QUESTION DATABASE
 * - ALL QUESTIONS COME FROM FIRESTORE
 * ============================================================
 */

import { db, auth } from './firebase.js';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';


// ============================================================
// FIRESTORE COLLECTION
// ============================================================

const QUESTIONS_COLLECTION = 'questions';


// ============================================================
// LOCAL STORAGE KEYS
// ============================================================

const BOOKMARKS_KEY =
  'rankhub_user_question_bookmarks';

const HISTORY_KEY =
  'rankhub_user_question_history';

const STATS_KEY =
  'rankhub_user_stats';

const REPORTS_KEY =
  'rankhub_question_reports';


// ============================================================
// QUESTION CACHE
// ============================================================

let questionCache = null;

let questionCacheTime = 0;

const QUESTION_CACHE_DURATION =
  30 * 1000;


// ============================================================
// UTILITY
// ============================================================

function normalizeQuestion(data, id = null) {

  return {

    id:
      id ||
      data.id ||
      '',

    examId:
      data.examId ||
      '',

    subjectId:
      data.subjectId ||
      '',

    topicId:
      data.topicId ||
      '',

    question:
      data.question ||
      '',

    questionHindi:
      data.questionHindi ||
      '',

    questionEnglish:
      data.questionEnglish ||
      data.question ||
      '',

    optionA:
      data.optionA ||
      '',

    optionB:
      data.optionB ||
      '',

    optionC:
      data.optionC ||
      '',

    optionD:
      data.optionD ||
      '',

    correctAnswer:
      data.correctAnswer ||
      'optionA',

    explanation:
      data.explanation ||
      '',

    explanationHindi:
      data.explanationHindi ||
      data.explanation ||
      '',

    explanationEnglish:
      data.explanationEnglish ||
      data.explanation ||
      '',

    difficulty:
      data.difficulty ||
      'Medium',

    language:
      data.language ||
      'Bilingual',

    year:
      data.year ||
      '',

    source:
      data.source ||
      'Practice',

    status:
      data.status ||
      'active',

    createdAt:
      data.createdAt ||
      null,

    updatedAt:
      data.updatedAt ||
      null
  };
}


// ============================================================
// GET ALL QUESTIONS FROM FIRESTORE
// ============================================================

export async function getQuestionsFromFirestore(
  options = {}
) {

  const forceRefresh =
    options.forceRefresh === true;

  const now =
    Date.now();

  if (
    !forceRefresh &&
    questionCache &&
    now - questionCacheTime <
      QUESTION_CACHE_DURATION
  ) {

    return [...questionCache];
  }


  try {

    const questionsRef =
      collection(
        db,
        QUESTIONS_COLLECTION
      );

    const snapshot =
      await getDocs(
        questionsRef
      );

    const questions = [];

    snapshot.forEach((docSnap) => {

      const data =
        docSnap.data();

      questions.push(
        normalizeQuestion(
          data,
          docSnap.id
        )
      );

    });


    questions.sort(
      (a, b) => {

        const aTime =
          getTimestampValue(
            a.createdAt
          );

        const bTime =
          getTimestampValue(
            b.createdAt
          );

        return bTime - aTime;
      }
    );


    questionCache =
      questions;

    questionCacheTime =
      now;


    return [...questions];

  } catch (error) {

    console.error(
      'RankHub: Error loading questions from Firestore:',
      error
    );

    throw error;
  }
}


// ============================================================
// GET SINGLE QUESTION
// ============================================================

export async function getQuestionById(
  questionId
) {

  if (!questionId) {
    return null;
  }


  try {

    const ref =
      doc(
        db,
        QUESTIONS_COLLECTION,
        questionId
      );

    const snap =
      await getDoc(ref);


    if (!snap.exists()) {

      return null;
    }


    return normalizeQuestion(
      snap.data(),
      snap.id
    );

  } catch (error) {

    console.error(
      'RankHub: Error getting question:',
      error
    );

    return null;
  }
}


// ============================================================
// FILTER QUESTIONS
// ============================================================

export async function getQuestionBank(
  filters = {}
) {

  let questions =
    await getQuestionsFromFirestore(
      {
        forceRefresh:
          filters.forceRefresh === true
      }
    );


  // ----------------------------------------------------------
  // SEARCH
  // ----------------------------------------------------------

  if (
    filters.searchQuery &&
    filters.searchQuery.trim()
  ) {

    const search =
      filters.searchQuery
        .trim()
        .toLowerCase();


    questions =
      questions.filter(
        (q) => {

          return (

            String(q.question || '')
              .toLowerCase()
              .includes(search)

            ||

            String(q.questionHindi || '')
              .toLowerCase()
              .includes(search)

            ||

            String(q.questionEnglish || '')
              .toLowerCase()
              .includes(search)

            ||

            String(q.topicId || '')
              .toLowerCase()
              .includes(search)

            ||

            String(q.subjectId || '')
              .toLowerCase()
              .includes(search)

            ||

            String(q.examId || '')
              .toLowerCase()
              .includes(search)

            ||

            String(q.year || '')
              .toLowerCase()
              .includes(search)

          );

        }
      );
  }


  // ----------------------------------------------------------
  // EXAM
  // ----------------------------------------------------------

  if (
    filters.examId &&
    filters.examId !== 'all'
  ) {

    questions =
      questions.filter(
        q =>
          q.examId ===
          filters.examId
      );
  }


  // ----------------------------------------------------------
  // SUBJECT
  // ----------------------------------------------------------

  if (
    filters.subjectId &&
    filters.subjectId !== 'all'
  ) {

    const subject =
      String(
        filters.subjectId
      ).toLowerCase();


    questions =
      questions.filter(
        q =>
          String(
            q.subjectId || ''
          ).toLowerCase() === subject
      );
  }


  // ----------------------------------------------------------
  // TOPIC
  // ----------------------------------------------------------

  if (
    filters.topicId &&
    filters.topicId !== 'all'
  ) {

    const topic =
      String(
        filters.topicId
      ).toLowerCase();


    questions =
      questions.filter(
        q =>
          String(
            q.topicId || ''
          ).toLowerCase() === topic
      );
  }


  // ----------------------------------------------------------
  // DIFFICULTY
  // ----------------------------------------------------------

  if (
    filters.difficulty &&
    filters.difficulty !== 'all'
  ) {

    const difficulty =
      String(
        filters.difficulty
      ).toLowerCase();


    questions =
      questions.filter(
        q =>
          String(
            q.difficulty || ''
          ).toLowerCase() ===
          difficulty
      );
  }


  // ----------------------------------------------------------
  // SOURCE
  // ----------------------------------------------------------

  if (
    filters.source &&
    filters.source !== 'all'
  ) {

    const source =
      String(
        filters.source
      ).toLowerCase();


    questions =
      questions.filter(
        q =>
          String(
            q.source || ''
          ).toLowerCase() === source
      );
  }


  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  if (
    filters.status &&
    filters.status !== 'all'
  ) {

    const status =
      String(
        filters.status
      ).toLowerCase();


    questions =
      questions.filter(
        q =>
          String(
            q.status || ''
          ).toLowerCase() === status
      );
  }


  return questions;
}


// ============================================================
// BACKWARD COMPATIBILITY
// ============================================================
//
// Old code may call getStoredQuestions().
// Since questions are now Firestore-only, this function
// returns a Promise.
//
// IMPORTANT:
// It does NOT write anything to localStorage.
// ============================================================

export async function getStoredQuestions(
  options = {}
) {

  return await getQuestionsFromFirestore(
    options
  );
}


// ============================================================
// ADD QUESTION
// ============================================================
//
// Admin Panel should use this function.
//
// Example:
//
// await addQuestionToBank({
//   examId: 'bihar-police',
//   subjectId: 'General Knowledge',
//   topicId: 'Bihar GK',
//   question: '...',
//   optionA: '...',
//   optionB: '...',
//   optionC: '...',
//   optionD: '...',
//   correctAnswer: 'optionA'
// });
//
// ============================================================

export async function addQuestionToBank(
  newQ
) {

  if (!newQ) {

    throw new Error(
      'Question data is required.'
    );
  }


  if (
    !newQ.question &&
    !newQ.questionEnglish &&
    !newQ.questionHindi
  ) {

    throw new Error(
      'Question text is required.'
    );
  }


  if (!newQ.examId) {

    throw new Error(
      'Exam ID is required.'
    );
  }


  const now =
    new Date().toISOString();


  const questionData = {

    examId:
      newQ.examId,

    subjectId:
      newQ.subjectId ||
      'General',

    topicId:
      newQ.topicId ||
      'General',

    question:
      newQ.question ||
      newQ.questionEnglish ||
      newQ.questionHindi ||
      '',

    questionHindi:
      newQ.questionHindi ||
      newQ.question ||
      '',

    questionEnglish:
      newQ.questionEnglish ||
      newQ.question ||
      '',

    optionA:
      newQ.optionA ||
      '',

    optionB:
      newQ.optionB ||
      '',

    optionC:
      newQ.optionC ||
      '',

    optionD:
      newQ.optionD ||
      '',

    correctAnswer:
      newQ.correctAnswer ||
      'optionA',

    explanation:
      newQ.explanation ||
      '',

    explanationHindi:
      newQ.explanationHindi ||
      newQ.explanation ||
      '',

    explanationEnglish:
      newQ.explanationEnglish ||
      newQ.explanation ||
      '',

    difficulty:
      newQ.difficulty ||
      'Medium',

    language:
      newQ.language ||
      'Bilingual',

    year:
      newQ.year ||
      '',

    source:
      newQ.source ||
      'Practice',

    status:
      newQ.status ||
      'active',

    createdAt:
      newQ.createdAt ||
      now,

    updatedAt:
      now
  };


  try {

    let questionRef;


    // --------------------------------------------------------
    // CUSTOM ID
    // --------------------------------------------------------

    if (newQ.id) {

      questionRef =
        doc(
          db,
          QUESTIONS_COLLECTION,
          newQ.id
        );

      await setDoc(
        questionRef,
        questionData
      );

    }

    // --------------------------------------------------------
    // AUTO ID
    // --------------------------------------------------------

    else {

      questionRef =
        await addDoc(
          collection(
            db,
            QUESTIONS_COLLECTION
          ),
          questionData
        );

    }


    clearQuestionCache();


    return {

      id:
        questionRef.id,

      ...questionData
    };


  } catch (error) {

    console.error(
      'RankHub: Error adding question:',
      error
    );

    throw error;
  }
}


// ============================================================
// UPDATE QUESTION
// ============================================================

export async function updateQuestion(
  questionId,
  updatedData
) {

  if (!questionId) {

    throw new Error(
      'Question ID is required.'
    );
  }


  if (!updatedData) {

    throw new Error(
      'Updated question data is required.'
    );
  }


  try {

    const ref =
      doc(
        db,
        QUESTIONS_COLLECTION,
        questionId
      );


    await updateDoc(
      ref,
      {
        ...updatedData,
        updatedAt:
          new Date().toISOString()
      }
    );


    clearQuestionCache();


    return true;

  } catch (error) {

    console.error(
      'RankHub: Error updating question:',
      error
    );

    throw error;
  }
}


// ============================================================
// DELETE QUESTION
// ============================================================

export async function deleteQuestion(
  questionId
) {

  if (!questionId) {

    throw new Error(
      'Question ID is required.'
    );
  }


  try {

    const ref =
      doc(
        db,
        QUESTIONS_COLLECTION,
        questionId
      );


    await deleteDoc(
      ref
    );


    clearQuestionCache();


    return true;

  } catch (error) {

    console.error(
      'RankHub: Error deleting question:',
      error
    );

    throw error;
  }
}


// ============================================================
// CHANGE QUESTION STATUS
// ============================================================

export async function setQuestionStatus(
  questionId,
  status
) {

  if (!questionId) {

    throw new Error(
      'Question ID is required.'
    );
  }


  if (!status) {

    throw new Error(
      'Status is required.'
    );
  }


  return await updateQuestion(
    questionId,
    {
      status
    }
  );
}


// ============================================================
// CLEAR CACHE
// ============================================================

export function clearQuestionCache() {

  questionCache =
    null;

  questionCacheTime =
    0;
}


// ============================================================
// GET TIMESTAMP VALUE
// ============================================================

function getTimestampValue(
  value
) {

  if (!value) {
    return 0;
  }


  try {

    if (
      typeof value.toMillis ===
      'function'
    ) {

      return value.toMillis();
    }


    if (
      typeof value.toDate ===
      'function'
    ) {

      return value
        .toDate()
        .getTime();
    }


    const date =
      new Date(value);


    const time =
      date.getTime();


    return isNaN(time)
      ? 0
      : time;

  } catch (error) {

    return 0;
  }
}


// ============================================================
// BOOKMARKS
// ============================================================

export function getUserBookmarks() {

  try {

    const raw =
      localStorage.getItem(
        BOOKMARKS_KEY
      );


    if (!raw) {
      return [];
    }


    const parsed =
      JSON.parse(raw);


    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch (error) {

    console.error(
      'Error reading bookmarks:',
      error
    );

    return [];
  }
}


// ============================================================
// IS BOOKMARKED
// ============================================================

export function isQuestionBookmarked(
  questionId
) {

  const bookmarks =
    getUserBookmarks();


  return bookmarks.some(
    bookmark =>
      bookmark.questionId ===
      questionId
  );
}


// ============================================================
// TOGGLE BOOKMARK
// ============================================================

export function toggleQuestionBookmark(
  question
) {

  if (!question?.id) {

    return false;
  }


  const bookmarks =
    getUserBookmarks();


  const index =
    bookmarks.findIndex(
      bookmark =>
        bookmark.questionId ===
        question.id
    );


  // ----------------------------------------------------------
  // REMOVE
  // ----------------------------------------------------------

  if (index !== -1) {

    bookmarks.splice(
      index,
      1
    );


    localStorage.setItem(
      BOOKMARKS_KEY,
      JSON.stringify(bookmarks)
    );


    return false;
  }


  // ----------------------------------------------------------
  // ADD
  // ----------------------------------------------------------

  bookmarks.push({

    questionId:
      question.id,

    question:
      question,

    bookmarkedAt:
      new Date().toISOString()
  });


  localStorage.setItem(
    BOOKMARKS_KEY,
    JSON.stringify(bookmarks)
  );


  return true;
}


// ============================================================
// REMOVE BOOKMARK
// ============================================================

export function removeQuestionBookmark(
  questionId
) {

  const bookmarks =
    getUserBookmarks();


  const filtered =
    bookmarks.filter(
      bookmark =>
        bookmark.questionId !==
        questionId
    );


  localStorage.setItem(
    BOOKMARKS_KEY,
    JSON.stringify(filtered)
  );


  return true;
}


// ============================================================
// PRACTICE PROGRESS
// ============================================================

export function getUserPracticeProgress() {

  try {

    let stats =
      null;


    const raw =
      localStorage.getItem(
        STATS_KEY
      );


    if (raw) {

      try {

        stats =
          JSON.parse(raw);

      } catch (error) {

        stats =
          null;
      }
    }


    // --------------------------------------------------------
    // LEGACY MIGRATION
    // --------------------------------------------------------

    const legacyKeys = [

      'rankhub_user_practice_progress',

      'user_progress',

      'user_stats'

    ];


    legacyKeys.forEach(
      oldKey => {

        const legacyRaw =
          localStorage.getItem(
            oldKey
          );


        if (!legacyRaw) {
          return;
        }


        try {

          const parsedLegacy =
            JSON.parse(
              legacyRaw
            );


          if (
            parsedLegacy &&
            typeof parsedLegacy ===
            'object'
          ) {

            if (!stats) {
              stats = {};
            }


            if (
              parsedLegacy.streak &&
              !stats.streak
            ) {

              stats.streak =
                parsedLegacy.streak;
            }


            if (
              parsedLegacy.accuracy &&
              !stats.accuracy
            ) {

              stats.accuracy =
                parsedLegacy.accuracy;
            }


            if (
              parsedLegacy.solved &&
              !stats.solved
            ) {

              stats.solved =
                parsedLegacy.solved;
            }


            if (
              typeof parsedLegacy.attempted ===
              'number' &&
              typeof stats.attempted !==
              'number'
            ) {

              stats.attempted =
                parsedLegacy.attempted;
            }


            if (
              typeof parsedLegacy.correct ===
              'number' &&
              typeof stats.correct !==
              'number'
            ) {

              stats.correct =
                parsedLegacy.correct;
            }


            if (
              typeof parsedLegacy.incorrect ===
              'number' &&
              typeof stats.incorrect !==
              'number'
            ) {

              stats.incorrect =
                parsedLegacy.incorrect;
            }


            if (
              Array.isArray(
                parsedLegacy.history
              ) &&
              (
                !stats.history ||
                stats.history.length === 0
              )
            ) {

              stats.history =
                parsedLegacy.history;
            }

          }

        } catch (error) {

          // Ignore invalid legacy data
        }

      }
    );


    if (!stats) {

      stats = {

        streak:
          '0',

        accuracy:
          '0%',

        solved:
          '0',

        attempted:
          0,

        correct:
          0,

        incorrect:
          0,

        history:
          []
      };
    }


    stats.streak =
      stats.streak !== undefined
        ? stats.streak
        : '0';


    stats.attempted =
      typeof stats.attempted ===
      'number'
        ? stats.attempted
        : 0;


    stats.correct =
      typeof stats.correct ===
      'number'
        ? stats.correct
        : 0;


    stats.incorrect =
      typeof stats.incorrect ===
      'number'
        ? stats.incorrect
        : 0;


    stats.history =
      Array.isArray(
        stats.history
      )
        ? stats.history
        : [];


    // --------------------------------------------------------
    // ACCURACY
    // --------------------------------------------------------

    if (
      stats.attempted > 0
    ) {

      stats.accuracy =
        (
          (
            stats.correct /
            stats.attempted
          ) *
          100
        ).toFixed(1) + '%';


      stats.solved =
        stats.attempted
          .toLocaleString();

    } else {

      stats.accuracy =
        stats.accuracy ||
        '0%';


      stats.solved =
        stats.solved ||
        '0';
    }


    localStorage.setItem(
      STATS_KEY,
      JSON.stringify(stats)
    );


    return stats;

  } catch (error) {

    console.error(
      'Error loading practice progress:',
      error
    );


    return {

      streak:
        '0',

      accuracy:
        '0%',

      solved:
        '0',

      attempted:
        0,

      correct:
        0,

      incorrect:
        0,

      history:
        []
    };
  }
}


// ============================================================
// RECORD QUESTION ATTEMPT
// ============================================================

export function recordQuestionAttempt(
  qId,
  selectedOptKey,
  isCorrect,
  questionData
) {

  const progress =
    getUserPracticeProgress();


  progress.attempted +=
    1;


  if (isCorrect) {

    progress.correct +=
      1;

  } else {

    progress.incorrect +=
      1;
  }


  progress.accuracy =
    (
      (
        progress.correct /
        progress.attempted
      ) *
      100
    ).toFixed(1) + '%';


  progress.solved =
    progress.attempted
      .toLocaleString();


  const attemptEntry = {

    questionId:
      qId,

    examId:
      questionData?.examId ||
      '',

    subjectId:
      questionData?.subjectId ||
      '',

    topicId:
      questionData?.topicId ||
      '',

    questionText:
      questionData?.question ||
      questionData?.questionEnglish ||
      questionData?.questionHindi ||
      '',

    selectedOption:
      selectedOptKey,

    correctOption:
      questionData?.correctAnswer ||
      '',

    isCorrect:
      !!isCorrect,

    timestamp:
      new Date().toISOString()
  };


  if (
    !Array.isArray(
      progress.history
    )
  ) {

    progress.history =
      [];
  }


  progress.history.unshift(
    attemptEntry
  );


  if (
    progress.history.length >
    100
  ) {

    progress.history.pop();
  }


  localStorage.setItem(
    STATS_KEY,
    JSON.stringify(progress)
  );


  return progress;
}


// ============================================================
// RESET PRACTICE PROGRESS
// ============================================================

export function resetPracticeProgress() {

  const fresh = {

    streak:
      '0',

    accuracy:
      '0%',

    solved:
      '0',

    attempted:
      0,

    correct:
      0,

    incorrect:
      0,

    history:
      []
  };


  localStorage.setItem(
    STATS_KEY,
    JSON.stringify(fresh)
  );


  return fresh;
}


// ============================================================
// QUESTION REPORT
// ============================================================

export function submitQuestionReport(
  qId,
  reason,
  comments = ''
) {

  try {

    const raw =
      localStorage.getItem(
        REPORTS_KEY
      );


    const reports =
      raw
        ? JSON.parse(raw)
        : [];


    const reportObj = {

      id:
        `rep-${Date.now()}`,

      questionId:
        qId,

      reason:
        reason || '',

      comments:
        comments || '',

      createdAt:
        new Date().toISOString(),

      status:
        'pending'
    };


    reports.push(
      reportObj
    );


    localStorage.setItem(
      REPORTS_KEY,
      JSON.stringify(reports)
    );


    return {

      success:
        true,

      report:
        reportObj
    };

  } catch (error) {

    console.error(
      'Error submitting report:',
      error
    );


    return {

      success:
        false,

      error:
        error.message
    };
  }
}


// ============================================================
// GET REPORTS
// ============================================================

export function getQuestionReports() {

  try {

    const raw =
      localStorage.getItem(
        REPORTS_KEY
      );


    if (!raw) {
      return [];
    }


    const reports =
      JSON.parse(raw);


    return Array.isArray(reports)
      ? reports
      : [];

  } catch (error) {

    return [];
  }
}


// ============================================================
// TOPICS FOR EXAM + SUBJECT
// ============================================================

export async function getTopicsForSubject(
  examId,
  subjectId
) {

  const questions =
    await getQuestionsFromFirestore();


  const topics =
    new Set();


  questions.forEach(
    q => {

      const examMatch =
        examId === 'all' ||
        q.examId === examId;


      const subjectMatch =
        subjectId === 'all' ||
        String(
          q.subjectId || ''
        ).toLowerCase() ===
        String(
          subjectId || ''
        ).toLowerCase();


      if (
        examMatch &&
        subjectMatch &&
        q.topicId
      ) {

        topics.add(
          q.topicId
        );
      }

    }
  );


  return Array.from(
    topics
  ).sort(
    (a, b) =>
      a.localeCompare(
        b
      )
  );
}


// ============================================================
// GET EXAMS
// ============================================================

export async function getAvailableExams() {

  const questions =
    await getQuestionsFromFirestore();


  const exams =
    new Set();


  questions.forEach(
    q => {

      if (q.examId) {

        exams.add(
          q.examId
        );
      }

    }
  );


  return Array.from(
    exams
  ).sort(
    (a, b) =>
      a.localeCompare(
        b
      )
  );
}


// ============================================================
// GET SUBJECTS
// ============================================================

export async function getAvailableSubjects(
  examId = 'all'
) {

  const questions =
    await getQuestionsFromFirestore();


  const subjects =
    new Set();


  questions.forEach(
    q => {

      if (
        examId === 'all' ||
        q.examId === examId
      ) {

        if (q.subjectId) {

          subjects.add(
            q.subjectId
          );
        }
      }

    }
  );


  return Array.from(
    subjects
  ).sort(
    (a, b) =>
      a.localeCompare(
        b
      )
  );
}


// ============================================================
// GET QUESTION COUNT
// ============================================================

export async function getQuestionCount(
  filters = {}
) {

  const questions =
    await getQuestionBank(
      filters
    );


  return questions.length;
}


// ============================================================
// ADMIN BULK ADD
// ============================================================
//
// Useful for Bulk Paste / Excel / CSV.
//
// Takes an array:
//
// await addQuestionsBulk([
//   {...},
//   {...},
//   {...}
// ]);
//
// ============================================================

export async function addQuestionsBulk(
  questions
) {

  if (
    !Array.isArray(
      questions
    )
  ) {

    throw new Error(
      'Questions must be an array.'
    );
  }


  if (
    questions.length === 0
  ) {

    return [];
  }


  const results = [];


  for (
    const question of questions
  ) {

    try {

      const saved =
        await addQuestionToBank(
          question
        );


      results.push({

        success:
          true,

        question:
          saved
      });

    } catch (error) {

      results.push({

        success:
          false,

        question,

        error:
          error.message
      });
    }
  }


  clearQuestionCache();


  return results;
}


// ============================================================
// ADMIN BULK DELETE
// ============================================================
//
// Deletes supplied question IDs.
//
// ============================================================

export async function deleteQuestionsBulk(
  questionIds
) {

  if (
    !Array.isArray(
      questionIds
    )
  ) {

    throw new Error(
      'Question IDs must be an array.'
    );
  }


  const results = [];


  for (
    const questionId of
    questionIds
  ) {

    try {

      await deleteQuestion(
        questionId
      );


      results.push({

        success:
          true,

        questionId
      });

    } catch (error) {

      results.push({

        success:
          false,

        questionId,

        error:
          error.message
      });
    }
  }


  clearQuestionCache();


  return results;
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
  if (
    itemIndex === 0
  ) {

    return true;
  }


  let userId =
    null;


  if (
    typeof userOrUserId ===
    'string'
  ) {

    userId =
      userOrUserId;

  }

  else if (
    userOrUserId?.uid
  ) {

    userId =
      userOrUserId.uid;

  }

  else if (
    auth.currentUser
  ) {

    userId =
      auth.currentUser.uid;

  }

  else {

    try {

      const saved =
        localStorage.getItem(
          'rankhub_user'
        );


      if (saved) {

        const user =
          JSON.parse(
            saved
          );


        userId =
          user?.uid ||
          null;
      }

    } catch (error) {

      userId =
        null;
    }
  }


  if (!userId) {

    return false;
  }


  try {

    const subscription =
      await getUserSubscriptionSafe(
        userId
      );


    return (

      subscription?.status ===
      'active'

      &&

      subscription?.isPremium ===
      true
    );

  } catch (error) {

    return false;
  }
}


// ============================================================
// USER SUBSCRIPTION SAFE CHECK
// ============================================================
//
// This avoids making question-bank dependent on a specific
// subscription-service implementation.
//
// ============================================================

async function getUserSubscriptionSafe(
  userId
) {

  try {

    const subscriptionRef =
      collection(
        db,
        'users',
        userId,
        'subscriptions'
      );


    const snapshot =
      await getDocs(
        subscriptionRef
      );


    let active =
      null;


    const now =
      new Date();


    snapshot.forEach(
      item => {

        const data =
          item.data();


        if (
          data.status !==
          'active'
        ) {

          return;
        }


        let expiry =
          data.expiryDate ||
          data.validUntil ||
          null;


        if (
          expiry?.toDate
        ) {

          expiry =
            expiry.toDate();

        } else if (
          expiry
        ) {

          expiry =
            new Date(
              expiry
            );
        }


        if (
          expiry &&
          !isNaN(
            expiry.getTime()
          ) &&
          expiry <= now
        ) {

          return;
        }


        active = {

          id:
            item.id,

          ...data,

          status:
            'active',

          isPremium:
            true,

          isActive:
            true
        };

      }
    );


    return active;

  } catch (error) {

    console.error(
      'Error checking subscription:',
      error
    );


    return null;
  }
}


// ============================================================
// GLOBAL PASS MODAL
// ============================================================

export function showRankHubPassModal(
  contentTitle =
    'Locked Content'
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

      background:
        rgba(15,23,42,0.6);

      backdrop-filter:
        blur(6px);

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
        box-shadow:
          0 25px 50px -12px
          rgba(0,0,0,.25);
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
            font-size:20px;
          "
        >
          ×
        </button>


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
            font-size:.875rem;
            color:#64748B;
            margin-bottom:20px;
          "
        >
          Accessing: ${escapeHtml(
            contentTitle
          )}
        </p>


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

      </div>

    `;


    document.body.appendChild(
      modal
    );


    const closeModal =
      () => {

        modal.style.display =
          'none';
      };


    const closeButton =
      modal.querySelector(
        '#closeRankhubModalBtn'
      );


    if (closeButton) {

      closeButton.onclick =
        closeModal;
    }


    modal.onclick =
      (event) => {

        if (
          event.target ===
          modal
        ) {

          closeModal();
        }

      };

  }

  else {

    const name =
      modal.querySelector(
        '#rankhubModalContentName'
      );


    if (name) {

      name.textContent =
        `Accessing: ${contentTitle}`;
    }


    modal.style.display =
      'flex';
  }
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(
  value
) {

  return String(
    value ?? ''
  )

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


// ============================================================
// DEBUG HELPERS
// ============================================================

export function getQuestionBankStatus() {

  return {

    source:
      'Firestore',

    collection:
      QUESTIONS_COLLECTION,

    defaultQuestions:
      false,

    localStorageQuestions:
      false,

    cacheEnabled:
      true,

    cachedQuestions:
      questionCache
        ? questionCache.length
        : 0
  };
}


// ============================================================
// STARTUP LOG
// ============================================================

console.log(
  'RankHub Question Bank loaded - Firestore ONLY'
);
