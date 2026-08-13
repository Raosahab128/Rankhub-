/**
 * RankHub - Question Bank & Practice System Store
 *
 * IMPORTANT:
 * - Demo question bank removed.
 * - No fake/demo questions are created automatically.
 * - No question data is seeded into LocalStorage.
 * - Real Questions will be connected to Firestore in the next phase.
 *
 * Current responsibilities:
 * - User bookmarks
 * - Practice progress
 * - Question attempts
 * - Question reports
 *
 * Future:
 * - Firestore questions collection
 * - Firestore bookmarks/history/reports
 */

// ============================================================
// STORAGE KEYS
// ============================================================

const BOOKMARKS_KEY = 'rankhub_user_question_bookmarks';
const HISTORY_KEY = 'rankhub_user_question_history';
const STATS_KEY = 'rankhub_user_stats';
const REPORTS_KEY = 'rankhub_question_reports';

// ============================================================
// QUESTION BANK
// ============================================================

/**
 * Questions are intentionally empty right now.
 *
 * IMPORTANT:
 * Do NOT add demo questions here.
 * The real question bank will come from Firestore.
 */
export function getQuestionBank(filters = {}) {
  // No local/demo questions.
  // Firestore integration will be added in the content phase.
  return [];
}

/**
 * Returns the locally stored question collection.
 *
 * Demo question initialization has been removed.
 */
export function getStoredQuestions() {
  return [];
}

/**
 * Question creation is disabled until Firestore
 * question management is implemented.
 */
export function addQuestionToBank() {
  console.warn(
    'Question creation is disabled. Questions will be managed through Firebase.'
  );

  return {
    success: false,
    error: 'Question management is not available yet.'
  };
}

// ============================================================
// BOOKMARKS
// ============================================================

export function getUserBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading question bookmarks:', error);
    return [];
  }
}

export function isQuestionBookmarked(questionId) {
  if (!questionId) {
    return false;
  }

  const bookmarks = getUserBookmarks();

  return bookmarks.some(
    bookmark => bookmark.questionId === questionId
  );
}

export function toggleQuestionBookmark(question) {
  if (!question || !question.id) {
    return false;
  }

  const bookmarks = getUserBookmarks();

  const index = bookmarks.findIndex(
    bookmark => bookmark.questionId === question.id
  );

  // Remove bookmark
  if (index > -1) {
    bookmarks.splice(index, 1);

    localStorage.setItem(
      BOOKMARKS_KEY,
      JSON.stringify(bookmarks)
    );

    return false;
  }

  // Add bookmark
  bookmarks.push({
    questionId: question.id,
    question,
    bookmarkedAt: new Date().toISOString()
  });

  localStorage.setItem(
    BOOKMARKS_KEY,
    JSON.stringify(bookmarks)
  );

  return true;
}

// ============================================================
// PRACTICE PROGRESS
// ============================================================

export function getUserPracticeProgress() {
  try {
    let stats = null;

    const raw = localStorage.getItem(STATS_KEY);

    if (raw) {
      try {
        stats = JSON.parse(raw);
      } catch {
        stats = null;
      }
    }

    // --------------------------------------------------------
    // Legacy progress migration
    // --------------------------------------------------------

    const legacyKeys = [
      'rankhub_user_practice_progress',
      'user_progress',
      'user_stats'
    ];

    legacyKeys.forEach(oldKey => {
      const legacyRaw = localStorage.getItem(oldKey);

      if (!legacyRaw) {
        return;
      }

      try {
        const legacy = JSON.parse(legacyRaw);

        if (!legacy || typeof legacy !== 'object') {
          return;
        }

        if (!stats) {
          stats = {};
        }

        if (
          legacy.streak !== undefined &&
          stats.streak === undefined
        ) {
          stats.streak = legacy.streak;
        }

        if (
          legacy.accuracy !== undefined &&
          stats.accuracy === undefined
        ) {
          stats.accuracy = legacy.accuracy;
        }

        if (
          legacy.solved !== undefined &&
          stats.solved === undefined
        ) {
          stats.solved = legacy.solved;
        }

        if (
          typeof legacy.attempted === 'number' &&
          typeof stats.attempted !== 'number'
        ) {
          stats.attempted = legacy.attempted;
        }

        if (
          typeof legacy.correct === 'number' &&
          typeof stats.correct !== 'number'
        ) {
          stats.correct = legacy.correct;
        }

        if (
          typeof legacy.incorrect === 'number' &&
          typeof stats.incorrect !== 'number'
        ) {
          stats.incorrect = legacy.incorrect;
        }

        if (
          Array.isArray(legacy.history) &&
          (!stats.history || stats.history.length === 0)
        ) {
          stats.history = legacy.history;
        }
      } catch {
        // Ignore invalid legacy data.
      }
    });

    // --------------------------------------------------------
    // Default empty progress
    // --------------------------------------------------------

    if (!stats) {
      stats = {};
    }

    stats.streak =
      stats.streak !== undefined
        ? stats.streak
        : '0';

    stats.attempted =
      typeof stats.attempted === 'number'
        ? stats.attempted
        : 0;

    stats.correct =
      typeof stats.correct === 'number'
        ? stats.correct
        : 0;

    stats.incorrect =
      typeof stats.incorrect === 'number'
        ? stats.incorrect
        : 0;

    stats.history =
      Array.isArray(stats.history)
        ? stats.history
        : [];

    // --------------------------------------------------------
    // Calculate accuracy
    // --------------------------------------------------------

    if (stats.attempted > 0) {
      stats.accuracy =
        ((stats.correct / stats.attempted) * 100).toFixed(1) + '%';

      stats.solved =
        stats.attempted.toLocaleString();
    } else {
      stats.accuracy =
        stats.accuracy || '0%';

      stats.solved =
        stats.solved || '0';
    }

    localStorage.setItem(
      STATS_KEY,
      JSON.stringify(stats)
    );

    return stats;
  } catch (error) {
    console.error(
      'Error reading practice progress:',
      error
    );

    return {
      streak: '0',
      accuracy: '0%',
      solved: '0',
      attempted: 0,
      correct: 0,
      incorrect: 0,
      history: []
    };
  }
}

// ============================================================
// QUESTION ATTEMPTS
// ============================================================

export function recordQuestionAttempt(
  questionId,
  selectedOption,
  isCorrect,
  questionData
) {
  const progress = getUserPracticeProgress();

  progress.attempted += 1;

  if (isCorrect) {
    progress.correct += 1;
  } else {
    progress.incorrect += 1;
  }

  progress.accuracy =
    ((progress.correct / progress.attempted) * 100).toFixed(1) + '%';

  progress.solved =
    progress.attempted.toLocaleString();

  const attemptEntry = {
    questionId,
    examId: questionData?.examId || null,
    subjectId: questionData?.subjectId || null,
    topicId: questionData?.topicId || null,

    questionText:
      questionData?.question ||
      questionData?.questionEnglish ||
      '',

    selectedOption: selectedOption || null,

    correctOption:
      questionData?.correctAnswer || null,

    isCorrect: Boolean(isCorrect),

    timestamp: new Date().toISOString()
  };

  if (!Array.isArray(progress.history)) {
    progress.history = [];
  }

  progress.history.unshift(attemptEntry);

  // Keep recent 100 local attempts
  if (progress.history.length > 100) {
    progress.history = progress.history.slice(0, 100);
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
    streak: '0',
    accuracy: '0%',
    solved: '0',
    attempted: 0,
    correct: 0,
    incorrect: 0,
    history: []
  };

  localStorage.setItem(
    STATS_KEY,
    JSON.stringify(fresh)
  );

  return fresh;
}

// ============================================================
// QUESTION REPORTS
// ============================================================

export function submitQuestionReport(
  questionId,
  reason,
  comments = ''
) {
  try {
    if (!questionId) {
      return {
        success: false,
        error: 'Question ID is required.'
      };
    }

    const raw =
      localStorage.getItem(REPORTS_KEY);

    const reports =
      raw
        ? JSON.parse(raw)
        : [];

    const reportList =
      Array.isArray(reports)
        ? reports
        : [];

    const report = {
      id: `rep-${Date.now()}`,
      questionId,
      reason: reason || 'Other',
      comments: comments || '',
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    reportList.push(report);

    localStorage.setItem(
      REPORTS_KEY,
      JSON.stringify(reportList)
    );

    return {
      success: true,
      report
    };
  } catch (error) {
    console.error(
      'Error submitting question report:',
      error
    );

    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================
// TOPICS
// ============================================================

/**
 * No local/demo topics are returned.
 *
 * Topics will come from the Firestore content system.
 */
export function getTopicsForSubject() {
  return [];
}

// ============================================================
// FIRESTORE CONTENT PLACEHOLDERS
// ============================================================

/**
 * Future Firestore question service.
 *
 * This function is intentionally not connected yet.
 * The next phase will connect it to:
 *
 * Firestore
 *   └── questions
 */
export async function getQuestionsFromFirestore() {
  return [];
}
