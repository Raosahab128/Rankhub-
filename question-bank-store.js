/**
 * RankHub - Question Bank & Practice System Store
 * Handles Firestore "questions", "user_question_bookmarks", "user_question_history", "question_reports" collections
 * with hybrid local persistence sync.
 */

// Initial high-quality question bank dataset representing Firestore "questions" collection
export const INITIAL_QUESTION_BANK = [
  // ==================== QUANTITATIVE APTITUDE ====================
  {
    id: 'q-quant-001',
    examId: 'ssc-cgl',
    subjectId: 'Quantitative Aptitude',
    topicId: 'Percentage',
    question: 'If the price of petrol increases by 25%, by what percentage must a driver reduce petrol consumption so that expenditure remains unchanged?',
    questionHindi: 'यदि पेट्रोल की कीमत में 25% की वृद्धि होती है, तो एक चालक को पेट्रोल की खपत में कितने प्रतिशत की कमी करनी चाहिए ताकि खर्च अपरिवर्तित रहे?',
    questionEnglish: 'If the price of petrol increases by 25%, by what percentage must a driver reduce petrol consumption so that expenditure remains unchanged?',
    optionA: '20%',
    optionB: '25%',
    optionC: '15%',
    optionD: '18.5%',
    correctAnswer: 'optionA',
    explanation: 'Required percentage reduction = [r / (100 + r)] × 100% = [25 / 125] × 100 = 20%.',
    explanationHindi: 'आवश्यक प्रतिशत कमी = [r / (100 + r)] × 100% = [25 / 125] × 100 = 20%।',
    explanationEnglish: 'Required percentage reduction = [r / (100 + r)] × 100% = [25 / 125] × 100 = 20%.',
    difficulty: 'Easy',
    language: 'Bilingual',
    year: '2024',
    source: 'PYQ',
    status: 'active',
    createdAt: '2026-01-15'
  },
  {
    id: 'q-quant-002',
    examId: 'ssc-cgl',
    subjectId: 'Quantitative Aptitude',
    topicId: 'Profit & Loss',
    question: 'A shopkeeper sells an article at a loss of 10%. Had he sold it for ₹180 more, he would have gained 8%. Find the cost price of the article.',
    questionHindi: 'एक दुकानदार एक वस्तु को 10% की हानि पर बेचता है। यदि उसने इसे ₹180 अधिक में बेचा होता, तो उसे 8% का लाभ होता। वस्तु का क्रय मूल्य ज्ञात कीजिए।',
    questionEnglish: 'A shopkeeper sells an article at a loss of 10%. Had he sold it for ₹180 more, he would have gained 8%. Find the cost price of the article.',
    optionA: '₹1000',
    optionB: '₹1200',
    optionC: '₹1500',
    optionD: '₹900',
    correctAnswer: 'optionA',
    explanation: 'Difference in percentages = 8% - (-10%) = 18%. 18% of Cost Price = ₹180 ⇒ Cost Price = ₹180 / 0.18 = ₹1000.',
    explanationHindi: 'प्रतिशत का अंतर = 8% - (-10%) = 18%। क्रय मूल्य का 18% = ₹180 ⇒ क्रय मूल्य = ₹180 / 0.18 = ₹1000।',
    explanationEnglish: 'Difference in percentages = 8% - (-10%) = 18%. 18% of Cost Price = ₹180 ⇒ Cost Price = ₹180 / 0.18 = ₹1000.',
    difficulty: 'Medium',
    language: 'Bilingual',
    year: '2025',
    source: 'PYQ',
    status: 'active',
    createdAt: '2026-01-20'
  },
  {
    id: 'q-quant-003',
    examId: 'ssc-chsl',
    subjectId: 'Quantitative Aptitude',
    topicId: 'Ratio & Proportion',
    question: 'Two numbers are in the ratio 3 : 5. If 9 is subtracted from each, the new ratio becomes 12 : 23. Find the smaller number.',
    questionHindi: 'दो संख्याएँ 3 : 5 के अनुपात में हैं। यदि प्रत्येक में से 9 घटा दिया जाए, तो नया अनुपात 12 : 23 हो जाता है। छोटी संख्या ज्ञात कीजिए।',
    questionEnglish: 'Two numbers are in the ratio 3 : 5. If 9 is subtracted from each, the new ratio becomes 12 : 23. Find the smaller number.',
    optionA: '33',
    optionB: '55',
    optionC: '27',
    optionD: '45',
    correctAnswer: 'optionA',
    explanation: 'Let numbers be 3x and 5x. (3x - 9)/(5x - 9) = 12/23. 23(3x - 9) = 12(5x - 9) ⇒ 69x - 207 = 60x - 108 ⇒ 9x = 99 ⇒ x = 11. Smaller number = 3(11) = 33.',
    explanationHindi: 'मान लीजिए संख्याएँ 3x और 5x हैं। (3x - 9)/(5x - 9) = 12/23 ⇒ 69x - 207 = 60x - 108 ⇒ 9x = 99 ⇒ x = 11। छोटी संख्या = 3(11) = 33।',
    explanationEnglish: 'Let numbers be 3x and 5x. (3x - 9)/(5x - 9) = 12/23. 23(3x - 9) = 12(5x - 9) ⇒ 69x - 207 = 60x - 108 ⇒ 9x = 99 ⇒ x = 11. Smaller number = 3(11) = 33.',
    difficulty: 'Medium',
    language: 'Bilingual',
    year: '2024',
    source: 'Practice',
    status: 'active',
    createdAt: '2026-02-01'
  },
  {
    id: 'q-quant-004',
    examId: 'sbi-po',
    subjectId: 'Quantitative Aptitude',
    topicId: 'Simple Interest & Compound Interest',
    question: 'The difference between Compound Interest and Simple Interest on a sum of money for 2 years at 10% per annum is ₹250. Find the principal sum.',
    questionHindi: '10% वार्षिक दर पर 2 वर्षों के लिए किसी राशि पर चक्रवृद्धि ब्याज और साधारण ब्याज के बीच का अंतर ₹250 है। मूलधन ज्ञात कीजिए।',
    questionEnglish: 'The difference between Compound Interest and Simple Interest on a sum of money for 2 years at 10% per annum is ₹250. Find the principal sum.',
    optionA: '₹25,000',
    optionB: '₹20,000',
    optionC: '₹30,000',
    optionD: '₹15,000',
    correctAnswer: 'optionA',
    explanation: 'Difference for 2 years = P × (r/100)². 250 = P × (10/100)² ⇒ 250 = P × (1/100) ⇒ P = ₹25,000.',
    explanationHindi: '2 वर्षों का अंतर = P × (r/100)²। 250 = P × (1/100) ⇒ P = ₹25,000।',
    explanationEnglish: 'Difference for 2 years = P × (r/100)². 250 = P × (10/100)² ⇒ 250 = P × (1/100) ⇒ P = ₹25,000.',
    difficulty: 'Hard',
    language: 'Bilingual',
    year: '2025',
    source: 'PYQ',
    status: 'active',
    createdAt: '2026-02-02'
  },
  {
    id: 'q-quant-005',
    examId: 'rrb-ntpc',
    subjectId: 'Quantitative Aptitude',
    topicId: 'Time & Work',
    question: 'A can complete a work in 12 days and B can do it in 18 days. They worked together for 4 days. What fraction of work remains left?',
    questionHindi: 'A किसी कार्य को 12 दिनों में और B उसे 18 दिनों में पूरा कर सकता है। उन्होंने 4 दिनों तक एक साथ काम किया। कार्य का कितना भाग शेष रह गया?',
    questionEnglish: 'A can complete a work in 12 days and B can do it in 18 days. They worked together for 4 days. What fraction of work remains left?',
    optionA: '4/9',
    optionB: '5/9',
    optionC: '1/3',
    optionD: '2/5',
    correctAnswer: 'optionA',
    explanation: "1 day work = (1/12) + (1/18) = 5/36. 4 days work = 4 × (5/36) = 5/9. Remaining work = 1 - 5/9 = 4/9.",
    explanationHindi: '1 दिन का काम = (1/12) + (1/18) = 5/36। 4 दिनों का काम = 4 × (5/36) = 5/9। शेष काम = 1 - 5/9 = 4/9।',
    explanationEnglish: '1 day work = (1/12) + (1/18) = 5/36. 4 days work = 4 × (5/36) = 5/9. Remaining work = 1 - 5/9 = 4/9.',
    difficulty: 'Easy',
    language: 'Bilingual',
    year: '2024',
    source: 'PYQ',
    status: 'active',
    createdAt: '2026-02-03'
  },

  // ==================== REASONING ABILITY ====================
  {
    id: 'q-reas-001',
    examId: 'ssc-cgl',
    subjectId: 'Reasoning Ability',
    topicId: 'Coding-Decoding',
    question: "In a certain code language, 'STATION' is coded as 'URCVKPI'. How will 'JOURNEY' be coded in that language?",
    questionHindi: "एक निश्चित कूट भाषा में, 'STATION' को 'URCVKPI' के रूप में लिखा जाता है। उसी भाषा में 'JOURNEY' को कैसे लिखा जाएगा?",
    questionEnglish: "In a certain code language, 'STATION' is coded as 'URCVKPI'. How will 'JOURNEY' be coded in that language?",
    optionA: 'LQWTPEA',
    optionB: 'LQWVTGA',
    optionC: 'MQWTPEA',
    optionD: 'LQWTPAE',
    correctAnswer: 'optionA',
    explanation: 'Pattern: Each letter is shifted forward by +2. J(+2)=L, O(+2)=Q, U(+2)=W, R(+2)=T, N(+2)=P, E(+2)=G, Y(+2)=A.',
    explanationHindi: 'पैटर्न: प्रत्येक अक्षर में +2 जोड़ा गया है। J(+2)=L, O(+2)=Q, U(+2)=W, R(+2)=T, N(+2)=P, E(+2)=G, Y(+2)=A।',
    explanationEnglish: 'Pattern: Each letter is shifted forward by +2. J(+2)=L, O(+2)=Q, U(+2)=W, R(+2)=T, N(+2)=P, E(+2)=G, Y(+2)=A.',
    difficulty: 'Easy',
    language: 'Bilingual',
    year: '2025',
    source: 'PYQ',
    status: 'active',
    createdAt: '2026-01-28'
  },
  {
    id: 'q-reas-002',
    examId: 'ibps-po',
    subjectId: 'Reasoning Ability',
    topicId: 'Syllogism',
    question: 'Statements: All pens are pencils. Some pencils are erasers. Conclusions: I. Some pens are erasers. II. Some erasers are pencils.',
    questionHindi: 'कथन: सभी पेन पेंसिल हैं। कुछ पेंसिल इरेज़र हैं। निष्कर्ष: I. कुछ पेन इरेज़र हैं। II. कुछ इरेज़र पेंसिल हैं।',
    questionEnglish: 'Statements: All pens are pencils. Some pencils are erasers. Conclusions: I. Some pens are erasers. II. Some erasers are pencils.',
    optionA: 'Only Conclusion II follows',
    optionB: 'Only Conclusion I follows',
    optionC: 'Both I and II follow',
    optionD: 'Neither I nor II follows',
    correctAnswer: 'optionA',
    explanation: 'Some pencils are erasers directly implies Some erasers are pencils (Conclusion II follows). Connection between pens and erasers is uncertain (Conclusion I does not necessarily follow).',
    explanationHindi: 'कुछ पेंसिल इरेज़र हैं का सीधा अर्थ है कुछ इरेज़र पेंसिल हैं (निष्कर्ष II पालन करता है)। पेन और इरेज़र के बीच संबंध अनिश्चित है।',
    explanationEnglish: 'Some pencils are erasers directly implies Some erasers are pencils (Conclusion II follows). Connection between pens and erasers is uncertain.',
    difficulty: 'Medium',
    language: 'Bilingual',
    year: '2024',
    source: 'Practice',
    status: 'active',
    createdAt: '2026-02-04'
  },

  // ==================== ENGLISH LANGUAGE ====================
  {
    id: 'q-eng-001',
    examId: 'ssc-cgl',
    subjectId: 'English Language',
    topicId: 'Error Spotting',
    question: "Identify the segment containing a grammatical error: 'Neither the manager nor the employees was present at the meeting.'",
    questionHindi: "व्याकरणिक त्रुटि वाले भाग की पहचान करें: 'Neither the manager nor the employees was present at the meeting.'",
    questionEnglish: "Identify the segment containing a grammatical error: 'Neither the manager nor the employees was present at the meeting.'",
    optionA: 'was present at',
    optionB: 'Neither the manager',
    optionC: 'nor the employees',
    optionD: 'the meeting',
    correctAnswer: 'optionA',
    explanation: "When two subjects are joined by 'neither... nor', the verb agrees with the subject closest to it. Since 'employees' is plural, it should be 'were present' instead of 'was present'.",
    explanationHindi: "जब दो विषयों को 'neither... nor' से जोड़ा जाता है, तो क्रिया निकटतम विषय के अनुसार होती है। 'employees' बहुवचन है, इसलिए 'were present' होगा।",
    explanationEnglish: "When two subjects are joined by 'neither... nor', the verb agrees with the subject closest to it. Plural subject 'employees' requires 'were present'.",
    difficulty: 'Medium',
    language: 'English',
    year: '2025',
    source: 'PYQ',
    status: 'active',
    createdAt: '2026-02-05'
  },
  {
    id: 'q-eng-002',
    examId: 'sbi-po',
    subjectId: 'English Language',
    topicId: 'Vocabulary & Idioms',
    question: "Select the most appropriate synonym for the word 'METICULOUS':",
    questionHindi: "शब्द 'METICULOUS' के लिए सबसे उपयुक्त पर्यायवाची चुनें:",
    questionEnglish: "Select the most appropriate synonym for the word 'METICULOUS':",
    optionA: 'Fastidious / Careful',
    optionB: 'Careless',
    optionC: 'Hastily done',
    optionD: 'Indifferent',
    correctAnswer: 'optionA',
    explanation: "'Meticulous' means showing great attention to detail or being extremely careful and precise.",
    explanationHindi: "'Meticulous' का अर्थ है अत्यंत सतर्क, सूक्ष्म और विवरणों पर ध्यान देने वाला।",
    explanationEnglish: "'Meticulous' means showing great attention to detail or being extremely careful and precise.",
    difficulty: 'Easy',
    language: 'English',
    year: '2024',
    source: 'Practice',
    status: 'active',
    createdAt: '2026-02-06'
  },

  // ==================== GENERAL AWARENESS / BIHAR GK / POLITY ====================
  {
    id: 'q-ga-001',
    examId: 'bpsc-cce',
    subjectId: 'General Awareness',
    topicId: 'Bihar Special GK',
    question: 'Who led the 1857 Freedom Revolt in Bihar from Jagdishpur (Bhojpur)?',
    questionHindi: 'जगदीशपुर (भोजपुर) से बिहार में 1857 के स्वतंत्रता संग्राम का नेतृत्व किसने किया था?',
    questionEnglish: 'Who led the 1857 Freedom Revolt in Bihar from Jagdishpur (Bhojpur)?',
    optionA: 'Veer Kunwar Singh',
    optionB: 'Birsa Munda',
    optionC: 'Piramali',
    optionD: 'Maulvi Ahmadullah',
    correctAnswer: 'optionA',
    explanation: 'Veer Kunwar Singh (80-year-old Rajput chieftain of Jagdishpur) valiantly led the revolt of 1857 against the British in Bihar.',
    explanationHindi: 'वीर कुंवर सिंह (जगदीशपुर के 80 वर्षीय राजपूत ज़मींदार) ने बिहार में अंग्रेजों के खिलाफ 1857 के विद्रोह का वीरतापूर्वक नेतृत्व किया था।',
    explanationEnglish: 'Veer Kunwar Singh valiantly led the 1857 revolt against British forces in Bihar.',
    difficulty: 'Easy',
    language: 'Bilingual',
    year: '2024',
    source: 'PYQ',
    status: 'active',
    createdAt: '2026-02-07'
  },
  {
    id: 'q-ga-002',
    examId: 'upsc-cse',
    subjectId: 'General Awareness',
    topicId: 'Indian Polity',
    question: 'Under which Article of the Indian Constitution can the President proclaim a Financial Emergency?',
    questionHindi: 'भारतीय संविधान के किस अनुच्छेद के तहत राष्ट्रपति वित्तीय आपातकाल की घोषणा कर सकते हैं?',
    questionEnglish: 'Under which Article of the Indian Constitution can the President proclaim a Financial Emergency?',
    optionA: 'Article 360',
    optionB: 'Article 352',
    optionC: 'Article 356',
    optionD: 'Article 370',
    correctAnswer: 'optionA',
    explanation: 'Article 360 empowers the President to invoke Financial Emergency if the financial stability or credit of India is threatened. (Note: Financial Emergency has never been declared in India).',
    explanationHindi: 'अनुच्छेद 360 राष्ट्रपति को वित्तीय आपातकाल लागू करने का अधिकार देता है यदि भारत की वित्तीय स्थिरता खतरे में हो। (भारत में अब तक कभी वित्तीय आपातकाल नहीं लगा है)।',
    explanationEnglish: 'Article 360 empowers the President to invoke Financial Emergency. It has never been invoked in India.',
    difficulty: 'Medium',
    language: 'Bilingual',
    year: '2025',
    source: 'PYQ',
    status: 'active',
    createdAt: '2026-02-08'
  },
  {
    id: 'q-ga-003',
    examId: 'bihar-police-si',
    subjectId: 'General Awareness',
    topicId: 'General Science',
    question: 'Which element is present in chlorophyll that gives plants their green color?',
    questionHindi: 'क्लोरोफिल में कौन सा तत्व मौजूद होता है जो पौधों को उनका हरा रंग प्रदान करता है?',
    questionEnglish: 'Which element is present in chlorophyll that gives plants their green color?',
    optionA: 'Magnesium (Mg)',
    optionB: 'Iron (Fe)',
    optionC: 'Calcium (Ca)',
    optionD: 'Sodium (Na)',
    correctAnswer: 'optionA',
    explanation: 'Magnesium (Mg) is the central atom in the chlorophyll pigment ring responsible for light absorption during photosynthesis.',
    explanationHindi: 'मैग्नीशियम (Mg) क्लोरोफिल वर्णक के केंद्र में स्थित धातु आयन है जो प्रकाश संश्लेषण के दौरान प्रकाश को अवशोषित करता है।',
    explanationEnglish: 'Magnesium is the central atom in chlorophyll pigment molecules.',
    difficulty: 'Easy',
    language: 'Bilingual',
    year: '2024',
    source: 'PYQ',
    status: 'active',
    createdAt: '2026-02-09'
  },
  {
    id: 'q-ga-004',
    examId: 'rrb-group-d',
    subjectId: 'General Awareness',
    topicId: 'Physics & Chemistry',
    question: 'What is the SI unit of Electric Resistance?',
    questionHindi: 'विद्युत प्रतिरोध (Electric Resistance) का SI मात्रक क्या है?',
    questionEnglish: 'What is the SI unit of Electric Resistance?',
    optionA: 'Ohm (Ω)',
    optionB: 'Ampere (A)',
    optionC: 'Volt (V)',
    optionD: 'Watt (W)',
    correctAnswer: 'optionA',
    explanation: 'The SI unit of electrical resistance is Ohm (Ω), named after Georg Simon Ohm.',
    explanationHindi: 'विद्युत प्रतिरोध का SI मात्रक ओम (Ohm - Ω) है, जिसका नाम जॉर्ज साइमन ओम के नाम पर रखा गया है।',
    explanationEnglish: 'The SI unit of electrical resistance is Ohm (Ω).',
    difficulty: 'Easy',
    language: 'Bilingual',
    year: '2024',
    source: 'PYQ',
    status: 'active',
    createdAt: '2026-02-10'
  }
];

// Local Storage Keys
const BOOKMARKS_KEY = 'rankhub_user_question_bookmarks';
const HISTORY_KEY = 'rankhub_user_question_history';
const STATS_KEY = 'rankhub_user_stats';
const REPORTS_KEY = 'rankhub_question_reports';

/**
 * Fetch Questions from Firestore / Bank with Filtering
 */
export function getQuestionBank(filters = {}) {
  let questions = getStoredQuestions();

  // 1. Search Query filter
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const query = filters.searchQuery.trim().toLowerCase();
    questions = questions.filter(q => 
      (q.question && q.question.toLowerCase().includes(query)) ||
      (q.questionHindi && q.questionHindi.toLowerCase().includes(query)) ||
      (q.questionEnglish && q.questionEnglish.toLowerCase().includes(query)) ||
      (q.topicId && q.topicId.toLowerCase().includes(query)) ||
      (q.subjectId && q.subjectId.toLowerCase().includes(query)) ||
      (q.examId && q.examId.toLowerCase().includes(query))
    );
  }

  // 2. Exam filter
  if (filters.examId && filters.examId !== 'all') {
    questions = questions.filter(q => q.examId === filters.examId || q.examId === 'all');
  }

  // 3. Subject filter
  if (filters.subjectId && filters.subjectId !== 'all') {
    questions = questions.filter(q => q.subjectId.toLowerCase() === filters.subjectId.toLowerCase());
  }

  // 4. Topic filter
  if (filters.topicId && filters.topicId !== 'all') {
    questions = questions.filter(q => q.topicId.toLowerCase() === filters.topicId.toLowerCase());
  }

  // 5. Difficulty filter
  if (filters.difficulty && filters.difficulty !== 'all') {
    questions = questions.filter(q => q.difficulty.toLowerCase() === filters.difficulty.toLowerCase());
  }

  // 6. Source / PYQ filter
  if (filters.source && filters.source !== 'all') {
    if (filters.source === 'pyq') {
      questions = questions.filter(q => q.source === 'PYQ');
    } else {
      questions = questions.filter(q => q.source.toLowerCase() === filters.source.toLowerCase());
    }
  }

  return questions;
}

/**
 * Get stored questions, initializing from INITIAL_QUESTION_BANK
 */
export function getStoredQuestions() {
  try {
    const raw = localStorage.getItem('rankhub_questions_collection');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading questions collection from storage:', e);
  }
  // Fallback to initial
  localStorage.setItem('rankhub_questions_collection', JSON.stringify(INITIAL_QUESTION_BANK));
  return INITIAL_QUESTION_BANK;
}

/**
 * Add a new question to the Question Bank (Firestore "questions")
 */
export function addQuestionToBank(newQ) {
  const all = getStoredQuestions();
  const qObj = {
    id: newQ.id || `q-custom-${Date.now()}`,
    examId: newQ.examId || 'ssc-cgl',
    subjectId: newQ.subjectId || 'Quantitative Aptitude',
    topicId: newQ.topicId || 'General',
    question: newQ.question || '',
    questionHindi: newQ.questionHindi || newQ.question || '',
    questionEnglish: newQ.questionEnglish || newQ.question || '',
    optionA: newQ.optionA || '',
    optionB: newQ.optionB || '',
    optionC: newQ.optionC || '',
    optionD: newQ.optionD || '',
    correctAnswer: newQ.correctAnswer || 'optionA',
    explanation: newQ.explanation || '',
    explanationHindi: newQ.explanationHindi || newQ.explanation || '',
    explanationEnglish: newQ.explanationEnglish || newQ.explanation || '',
    difficulty: newQ.difficulty || 'Medium',
    language: newQ.language || 'Bilingual',
    year: newQ.year || '2026',
    source: newQ.source || 'Practice',
    status: 'active',
    createdAt: new Date().toISOString()
  };
  all.unshift(qObj);
  localStorage.setItem('rankhub_questions_collection', JSON.stringify(all));
  return qObj;
}

/**
 * BOOKMARKS: Manage "user_question_bookmarks"
 */
export function getUserBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function isQuestionBookmarked(qId) {
  const bookmarks = getUserBookmarks();
  return bookmarks.some(b => b.questionId === qId);
}

export function toggleQuestionBookmark(question) {
  const bookmarks = getUserBookmarks();
  const idx = bookmarks.findIndex(b => b.questionId === question.id);
  
  if (idx > -1) {
    bookmarks.splice(idx, 1);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return false; // Now unbookmarked
  } else {
    bookmarks.push({
      questionId: question.id,
      question: question,
      bookmarkedAt: new Date().toISOString()
    });
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return true; // Now bookmarked
  }
}

/**
 * HISTORY & PROGRESS TRACKING: Manage "user_question_history" & stats
 */
export function getUserPracticeProgress() {
  try {
    let stats = null;
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      try { stats = JSON.parse(raw); } catch (e) {}
    }

    // Migration check for legacy keys
    const legacyKeys = ['rankhub_user_practice_progress', 'user_progress', 'user_stats'];
    legacyKeys.forEach(oldKey => {
      const legacyRaw = localStorage.getItem(oldKey);
      if (legacyRaw) {
        try {
          const parsedLegacy = JSON.parse(legacyRaw);
          if (parsedLegacy && typeof parsedLegacy === 'object') {
            if (!stats) stats = {};
            if (parsedLegacy.streak && !stats.streak) stats.streak = parsedLegacy.streak;
            if (parsedLegacy.accuracy && !stats.accuracy) stats.accuracy = parsedLegacy.accuracy;
            if (parsedLegacy.solved && !stats.solved) stats.solved = parsedLegacy.solved;
            if (typeof parsedLegacy.attempted === 'number' && typeof stats.attempted !== 'number') {
              stats.attempted = parsedLegacy.attempted;
            }
            if (typeof parsedLegacy.correct === 'number' && typeof stats.correct !== 'number') {
              stats.correct = parsedLegacy.correct;
            }
            if (typeof parsedLegacy.incorrect === 'number' && typeof stats.incorrect !== 'number') {
              stats.incorrect = parsedLegacy.incorrect;
            }
            if (Array.isArray(parsedLegacy.history) && (!stats.history || stats.history.length === 0)) {
              stats.history = parsedLegacy.history;
            }
          }
        } catch (e) {}
      }
    });

    const isLoggedInQbs = !!localStorage.getItem('rankhub_user');
    if (!stats) {
      stats = { streak: '0', accuracy: '0%', solved: '0', attempted: 0, correct: 0, incorrect: 0, history: [] };
    }

    stats.streak = stats.streak !== undefined ? stats.streak : '0';
    stats.attempted = typeof stats.attempted === 'number' ? stats.attempted : 0;
    stats.correct = typeof stats.correct === 'number' ? stats.correct : 0;
    stats.incorrect = typeof stats.incorrect === 'number' ? stats.incorrect : 0;
    stats.history = Array.isArray(stats.history) ? stats.history : [];

    if (stats.attempted > 0) {
      stats.accuracy = ((stats.correct / stats.attempted) * 100).toFixed(1) + '%';
      stats.solved = stats.attempted.toLocaleString();
    } else {
      stats.accuracy = stats.accuracy || '0%';
      stats.solved = stats.solved || '0';
    }

    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    return stats;
  } catch (e) {
    return { streak: '0', accuracy: '0%', solved: '0', attempted: 0, correct: 0, incorrect: 0, history: [] };
  }
}

export function recordQuestionAttempt(qId, selectedOptKey, isCorrect, questionData) {
  const progress = getUserPracticeProgress();
  progress.attempted += 1;
  if (isCorrect) {
    progress.correct += 1;
  } else {
    progress.incorrect += 1;
  }

  progress.accuracy = ((progress.correct / progress.attempted) * 100).toFixed(1) + '%';
  progress.solved = progress.attempted.toLocaleString();

  const attemptEntry = {
    questionId: qId,
    examId: questionData?.examId,
    subjectId: questionData?.subjectId,
    topicId: questionData?.topicId,
    questionText: questionData?.question || questionData?.questionEnglish,
    selectedOption: selectedOptKey,
    correctOption: questionData?.correctAnswer,
    isCorrect,
    timestamp: new Date().toISOString()
  };

  if (!progress.history) progress.history = [];
  progress.history.unshift(attemptEntry);
  if (progress.history.length > 100) progress.history.pop(); // Keep recent 100

  localStorage.setItem(STATS_KEY, JSON.stringify(progress));
  return progress;
}

export function resetPracticeProgress() {
  const fresh = { streak: '12', accuracy: '0%', solved: '0', attempted: 0, correct: 0, incorrect: 0, history: [] };
  localStorage.setItem(STATS_KEY, JSON.stringify(fresh));
  return fresh;
}

/**
 * REPORT QUESTION: Manage "question_reports"
 */
export function submitQuestionReport(qId, reason, comments = '') {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    const reports = raw ? JSON.parse(raw) : [];
    
    const reportObj = {
      id: `rep-${Date.now()}`,
      questionId: qId,
      reason,
      comments,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    reports.push(reportObj);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
    return { success: true, report: reportObj };
  } catch (e) {
    console.error('Error submitting report:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Helper to retrieve unique Topics available for an Exam + Subject
 */
export function getTopicsForSubject(examId, subjectId) {
  const questions = getStoredQuestions();
  const topics = new Set();

  questions.forEach(q => {
    if ((examId === 'all' || q.examId === examId) &&
        (subjectId === 'all' || q.subjectId.toLowerCase() === subjectId.toLowerCase())) {
      if (q.topicId) topics.add(q.topicId);
    }
  });

  // Default topic fallbacks if questions dataset is expanding
  if (topics.size === 0) {
    if (subjectId.includes('Quant') || subjectId.includes('Math')) {
      return ['Percentage', 'Profit & Loss', 'Ratio & Proportion', 'Average', 'Time & Work', 'Simple Interest', 'Compound Interest', 'Algebra', 'Geometry', 'Mensuration'];
    } else if (subjectId.includes('Reasoning') || subjectId.includes('Intelligence')) {
      return ['Coding-Decoding', 'Syllogism', 'Blood Relations', 'Seating Arrangement', 'Series', 'Analogy', 'Venn Diagrams'];
    } else if (subjectId.includes('English') || subjectId.includes('Language')) {
      return ['Error Spotting', 'Vocabulary & Idioms', 'Reading Comprehension', 'Cloze Test', 'Para Jumbles'];
    } else {
      return ['Indian Polity', 'Bihar Special GK', 'General Science', 'Indian History', 'Geography', 'Current Affairs'];
    }
  }

  return Array.from(topics);
}
