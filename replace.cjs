const fs = require('fs');
let code = fs.readFileSync('js/test-interface.js', 'utf8');

const replacement = `
    try {
      const uid = auth.currentUser.uid;
      const testId = urlParams.get('test') || pyqParam || examId || 'unknown_test';
      const testName = pyqPaper ? pyqPaper.title : (exam ? exam.name + ' Mock' : 'Mock Test');
      const examName = exam ? exam.id : 'unknown_exam';

      // 1. Fetch current stats
      const statsRef = doc(db, \`users/\${uid}/testStats\`, testId);
      const statsDoc = await getDoc(statsRef);
      let stats = statsDoc.exists() ? statsDoc.data() : {
        testId: testId,
        attempts: 0,
        bestScore: 0,
        bestPercentage: 0,
        latestScore: 0,
        latestPercentage: 0,
        latestAttemptAt: null
      };

      const attemptNumber = (stats.attempts || 0) + 1;

      // 2. Result Object for Firestore (testAttempts collection)
      const attemptId = \`attempt_\${Date.now()}_\${Math.floor(Math.random()*1000)}\`;
      const resultObj = {
        attemptId: attemptId,
        userId: uid,
        testId: testId,
        testName: testName,
        examId: examName,
        attemptNumber: attemptNumber,
        score: marksObtained,
        percentage: accuracy,
        correct: correct,
        wrong: wrong,
        unattempted: skipped,
        totalQuestions: MOCK_QUESTIONS.length,
        timeTaken: timeTaken,
        answers: userAnswers,
        submittedAt: new Date().toISOString()
      };

      // Save Attempt
      await setDoc(doc(db, \`users/\${uid}/testAttempts\`, attemptId), resultObj);

      // 3. Update Stats
      stats.attempts = attemptNumber;
      stats.latestScore = marksObtained;
      stats.latestPercentage = accuracy;
      stats.latestAttemptAt = resultObj.submittedAt;
      
      if (marksObtained > stats.bestScore || stats.attempts === 1) {
        stats.bestScore = marksObtained;
        stats.bestPercentage = accuracy;
      }
      
      await setDoc(statsRef, stats);

      // Navigate to Result Page
      window.location.href = \`/pages/test-result.html?exam=\${examId}&test=\${testId}\`;
`;

const startIndex = code.indexOf('    try {\n      // Result Object for Firestore');
const endIndex = code.indexOf('    } catch (err) {\n      console.error("Submission error", err);');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('js/test-interface.js', code);
  console.log("Successfully replaced block.");
} else {
  console.log("Could not find block boundaries.", startIndex, endIndex);
}
