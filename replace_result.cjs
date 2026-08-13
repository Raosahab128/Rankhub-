const fs = require('fs');
let code = fs.readFileSync('js/test-result.js', 'utf8');

const replacement = `
    const result = snapshot.docs[0].data();
    const examData = getExamById(examId) || { name: 'Mock Test' };
    
    // Fetch stats for best score
    const { getDoc, doc } = await import('./firebase.js');
    const statsDoc = await getDoc(doc(db, \`users/\${uid}/testStats\`, testId));
    const stats = statsDoc.exists() ? statsDoc.data() : { bestScore: result.score };

    renderResultUI(result, examData, stats);
  } catch (err) {
`;

const startIndex = code.indexOf('    const result = snapshot.docs[0].data();');
const endIndex = code.indexOf('  } catch (err) {');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('js/test-result.js', code);
  console.log("Successfully replaced block.");
} else {
  console.log("Could not find block boundaries.");
}
