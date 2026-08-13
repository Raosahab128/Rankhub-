const fs = require('fs');
let code = fs.readFileSync('home.js', 'utf8');

const targetStr = `  // Get user progress stats and sync with Firestore
  if (firebaseUser) {
    try {
      const statsRef = doc(db, 'users', firebaseUser.uid, 'stats', 'practice');
      const docSnap = await getDoc(statsRef);
      if (docSnap.exists()) {
        const firestoreStats = docSnap.data();
        const local = localStorage.getItem('rankhub_user_stats');
        let localStats = local ? JSON.parse(local) : null;
        if (!localStats || (firestoreStats.attempted > (localStats.attempted || 0))) {
          localStorage.setItem('rankhub_user_stats', JSON.stringify(firestoreStats));
        } else if (localStats && localStats.attempted > (firestoreStats.attempted || 0)) {
           await setDoc(statsRef, localStats);
        }
      } else {
        const local = localStorage.getItem('rankhub_user_stats');
        if (local) await setDoc(statsRef, JSON.parse(local));
      }
    } catch(e) { console.error(e); }
  }`;

code = code.replace(targetStr, ""); // Remove it from initWelcomeBoard

const insertTarget = `  initWelcomeBoard();
  initQuickActions();`;

const syncCode = `
  try {
    const statsRef = doc(db, 'users', firebaseUser.uid, 'stats', 'practice');
    const docSnap = await getDoc(statsRef);
    if (docSnap.exists()) {
      const firestoreStats = docSnap.data();
      const local = localStorage.getItem('rankhub_user_stats');
      let localStats = local ? JSON.parse(local) : null;
      if (!localStats || (firestoreStats.attempted > (localStats.attempted || 0))) {
        localStorage.setItem('rankhub_user_stats', JSON.stringify(firestoreStats));
      } else if (localStats && localStats.attempted > (firestoreStats.attempted || 0)) {
         await setDoc(statsRef, localStats);
      }
    } else {
      const local = localStorage.getItem('rankhub_user_stats');
      if (local) await setDoc(statsRef, JSON.parse(local));
    }
  } catch(e) { console.error(e); }

  initWelcomeBoard();
  initQuickActions();`;

code = code.replace(insertTarget, syncCode);

// Also need to ensure db, doc, getDoc, setDoc are imported in home.js
const importStatement = `import { auth, db, doc, getDoc, setDoc, collection, getDocs, onAuthStateChanged, getCurrentUser } from './firebase.js';`;
const oldImport = `import { getCurrentUser } from './firebase.js';`;
if (code.includes(oldImport)) {
    code = code.replace(oldImport, importStatement);
} else if (!code.includes('import { auth, db')) {
    code = importStatement + '\n' + code;
}

fs.writeFileSync('home.js', code);
console.log("Fixed home.js");
