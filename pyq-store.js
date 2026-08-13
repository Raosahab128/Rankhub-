/**
 * RankHub - PYQ Store
 * Provides structured Previous Year Question Papers data, filters, and retrieval functions.
 */

export const PYQ_PAPERS_DATA = [
  {
    id: 'ssc-cgl-2025-s1',
    examId: 'ssc-cgl',
    examCategory: 'SSC',
    examName: 'SSC CGL',
    year: '2025',
    shift: 'Tier 1 — Shift 1',
    paperTitle: 'SSC CGL Tier-1 Official Paper 2025 (Shift 1)',
    subject: 'Maths, Reasoning, English, General Awareness',
    language: 'Hindi + English',
    questionsCount: 100,
    duration: '60 Minutes',
    paperType: 'Official Shift Paper',
    pdfAvailable: false,
    description: 'Official Tier-1 examination paper conducted by Staff Selection Commission in 2025. Includes all 100 questions across 4 sections with complete bilingual solutions.'
  },
  {
    id: 'ssc-chsl-2024-s2',
    examId: 'ssc-chsl',
    examCategory: 'SSC',
    examName: 'SSC CHSL',
    year: '2024',
    shift: 'Tier 1 — Shift 2',
    paperTitle: 'SSC CHSL Tier-1 Official Paper 2024 (Shift 2)',
    subject: 'Maths, Reasoning, English, General Awareness',
    language: 'Hindi + English',
    questionsCount: 100,
    duration: '60 Minutes',
    paperType: 'Official Shift Paper',
    pdfAvailable: false,
    description: 'Official Staff Selection Commission CHSL Tier-1 paper with detailed step-by-step solution keys.'
  },
  {
    id: 'rrb-ntpc-2024-cbt1',
    examId: 'rrb-ntpc',
    examCategory: 'Railway',
    examName: 'RRB NTPC',
    year: '2024',
    shift: 'CBT 1 — Stage 1',
    paperTitle: 'RRB NTPC CBT-1 Official Paper 2024',
    subject: 'Maths, Reasoning, General Science, General Awareness',
    language: 'Hindi + English',
    questionsCount: 100,
    duration: '90 Minutes',
    paperType: 'Official Shift Paper',
    pdfAvailable: false,
    description: 'Railway Recruitment Board Non-Technical Popular Categories Stage-1 exam paper with authentic memory-backed and official questions.'
  },
  {
    id: 'rrb-group-d-2024-s1',
    examId: 'rrb-group-d',
    examCategory: 'Railway',
    examName: 'RRB Group D',
    year: '2024',
    shift: 'CBT — Shift 1',
    paperTitle: 'RRB Group D CBT Official Paper 2024',
    subject: 'General Science, Maths, Reasoning, General Awareness',
    language: 'Hindi + English',
    questionsCount: 100,
    duration: '90 Minutes',
    paperType: 'Official Shift Paper',
    pdfAvailable: false,
    description: 'Official Railway Group D CBT test paper covering high-yield physics, chemistry, basic maths, and reasoning questions.'
  },
  {
    id: 'sbi-po-2025-pre',
    examId: 'sbi-po',
    examCategory: 'Banking',
    examName: 'SBI PO',
    year: '2025',
    shift: 'Prelims — Shift 1',
    paperTitle: 'SBI PO Prelims Official Paper 2025',
    subject: 'Quantitative Aptitude, Reasoning, English',
    language: 'English',
    questionsCount: 100,
    duration: '60 Minutes',
    paperType: 'Memory Based Paper',
    pdfAvailable: false,
    description: 'State Bank of India Probationary Officer Prelims paper with section-wise sectional timing simulation.'
  },
  {
    id: 'ibps-po-2025-pre',
    examId: 'ibps-po',
    examCategory: 'Banking',
    examName: 'IBPS PO',
    year: '2025',
    shift: 'Prelims — Shift 2',
    paperTitle: 'IBPS PO Prelims Official Paper 2025',
    subject: 'Quantitative Aptitude, Reasoning, English',
    language: 'Hindi + English',
    questionsCount: 100,
    duration: '60 Minutes',
    paperType: 'Official Shift Paper',
    pdfAvailable: false,
    description: 'Institute of Banking Personnel Selection PO prelims official question set with accurate answers.'
  },
  {
    id: 'bpsc-cce-2024-pre',
    examId: 'bpsc-cce',
    examCategory: 'BPSC',
    examName: '70th BPSC CCE',
    year: '2024',
    shift: 'Prelims',
    paperTitle: '70th BPSC CCE Prelims Official Paper 2024',
    subject: 'General Studies, Bihar Special GK, Current Affairs',
    language: 'Hindi + English',
    questionsCount: 150,
    duration: '120 Minutes',
    paperType: 'Official Question Paper',
    pdfAvailable: false,
    description: '70th Bihar Public Service Commission Combined Competitive Exam General Studies Prelims official paper with Bihar Special GK explanations.'
  },
  {
    id: 'bihar-police-si-2024-pre',
    examId: 'bihar-police-si',
    examCategory: 'Police',
    examName: 'Bihar Police SI',
    year: '2024',
    shift: 'Prelims — Shift 1',
    paperTitle: 'Bihar Police Sub-Inspector Prelims Official Paper 2024',
    subject: 'General Awareness, General Science, Current Affairs',
    language: 'Hindi + English',
    questionsCount: 100,
    duration: '120 Minutes',
    paperType: 'Official Question Paper',
    pdfAvailable: false,
    description: 'Bihar Police SI Sergeant Prelims examination paper with comprehensive solution keys and cut-off insights.'
  },
  {
    id: 'upsc-cse-2024-gs1',
    examId: 'upsc-cse',
    examCategory: 'UPSC',
    examName: 'UPSC CSE',
    year: '2024',
    shift: 'Prelims — GS Paper 1',
    paperTitle: 'UPSC CSE Prelims Official Paper 2024 (GS 1)',
    subject: 'General Studies, Polity, History, Environment',
    language: 'Hindi + English',
    questionsCount: 100,
    duration: '120 Minutes',
    paperType: 'Official Question Paper',
    pdfAvailable: false,
    description: 'Union Public Service Commission Civil Services Prelims General Studies Paper-1 with standard reference explanations.'
  },
  {
    id: 'ctet-2025-p1',
    examId: 'ctet',
    examCategory: 'Teaching',
    examName: 'CTET',
    year: '2025',
    shift: 'Paper 1 — Primary',
    paperTitle: 'CTET Paper-1 Official Paper 2025',
    subject: 'Child Development, Language 1 & 2, EVS, Maths',
    language: 'Hindi + English',
    questionsCount: 150,
    duration: '150 Minutes',
    paperType: 'Official Question Paper',
    pdfAvailable: false,
    description: 'Central Teacher Eligibility Test Primary Stage official question paper.'
  },
  {
    id: 'nda-2024-gat',
    examId: 'nda',
    examCategory: 'Defence',
    examName: 'NDA',
    year: '2024',
    shift: 'GAT Paper',
    paperTitle: 'NDA 2024 General Ability Test (GAT) Paper',
    subject: 'English, Physics, Chemistry, General Studies',
    language: 'English',
    questionsCount: 150,
    duration: '150 Minutes',
    paperType: 'Official Question Paper',
    pdfAvailable: false,
    description: 'National Defence Academy GAT Paper covering English and General Knowledge sections.'
  }
];

/**
 * Get all PYQ Papers filtered by category, year, subject, and search query
 */
export function getPyqPapers(filters = {}) {
  let list = [...PYQ_PAPERS_DATA];

  // 1. Search Query Filter
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const q = filters.searchQuery.trim().toLowerCase();
    list = list.filter(p =>
      p.paperTitle.toLowerCase().includes(q) ||
      p.examName.toLowerCase().includes(q) ||
      p.examCategory.toLowerCase().includes(q) ||
      p.subject.toLowerCase().includes(q) ||
      p.year.includes(q) ||
      p.shift.toLowerCase().includes(q)
    );
  }

  // 2. Exam Category Filter (All, SSC, Banking, Railway, UPSC, BPSC, Police, Defence, Teaching, State Exams)
  if (filters.category && filters.category !== 'All') {
    const cat = filters.category.toLowerCase();
    list = list.filter(p => {
      if (cat === 'state exams') {
        return p.examCategory.toLowerCase() === 'bpsc' || p.examCategory.toLowerCase() === 'police' || p.examCategory.toLowerCase() === 'state';
      }
      return p.examCategory.toLowerCase() === cat;
    });
  }

  // 3. Year Filter (All, 2026, 2025, 2024, 2023, 2022, 2021, 2020, Older)
  if (filters.year && filters.year !== 'All') {
    if (filters.year === 'Older') {
      list = list.filter(p => parseInt(p.year, 10) < 2020);
    } else {
      list = list.filter(p => p.year === filters.year);
    }
  }

  // 4. Subject Filter (All, Maths, Reasoning, English, General Awareness, General Science, General Studies)
  if (filters.subject && filters.subject !== 'All') {
    const subj = filters.subject.toLowerCase();
    list = list.filter(p => p.subject.toLowerCase().includes(subj));
  }

  return list;
}

/**
 * Get a single PYQ Paper by ID
 */
export function getPyqPaperById(id) {
  return PYQ_PAPERS_DATA.find(p => p.id === id) || PYQ_PAPERS_DATA[0];
}
