import { getCurrentUser } from './firebase.js';
import { getPyqPaperById } from './pyq-store.js';

document.addEventListener('DOMContentLoaded', async () => {
  
  const firebaseUser = await getCurrentUser();
  if (!firebaseUser) return; // auth-guard handles redirect
  
  let currentUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
  };
  try {
    const saved = localStorage.getItem('rankhub_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      currentUser = Object.assign(currentUser, parsed);
    }
  } catch(e) {}
    

  const container = document.getElementById('pyqDetailCardContainer');
  const urlParams = new URLSearchParams(window.location.search);
  const paperId = urlParams.get('id') || 'ssc-cgl-2025-s1';

  const paper = getPyqPaperById(paperId);

  if (!container) return;

  if (!paper) {
    container.innerHTML = `
      <div style="background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 16px; padding: 48px 24px; text-align: center;">
        <h3 style="font-size: 1.2rem; font-weight: 800; color: #0F172A; margin-bottom: 8px;">Paper Not Found</h3>
        <p style="font-size: 0.9rem; color: #64748B; margin-bottom: 20px;">The requested previous year paper could not be found.</p>
        <a href="./pyq.html" style="padding: 10px 20px; background: #DC2626; color: #FFFFFF; font-weight: 700; border-radius: 8px; text-decoration: none;">
          Back to PYQ List
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <!-- Main Card -->
    <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); margin-top: 16px;">
      <!-- Category & Badges -->
      <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 16px;">
        <span style="background: #FEF2F2; color: #DC2626; font-size: 0.8rem; font-weight: 800; padding: 4px 12px; border-radius: 6px; border: 1px solid #FCA5A5;">
          ${escapeHtml(paper.examCategory)}
        </span>
        <span style="background: #F1F5F9; color: #0F172A; font-size: 0.8rem; font-weight: 700; padding: 4px 12px; border-radius: 6px;">
          ${escapeHtml(paper.year)} Exam
        </span>
        <span style="background: #EFF6FF; color: #2563EB; font-size: 0.8rem; font-weight: 700; padding: 4px 12px; border-radius: 6px;">
          ${escapeHtml(paper.paperType)}
        </span>
      </div>

      <!-- Paper Title -->
      <h1 style="font-size: 1.5rem; font-weight: 800; color: #0F172A; margin-bottom: 8px; line-height: 1.3;">
        ${escapeHtml(paper.paperTitle)}
      </h1>
      <p style="font-size: 0.95rem; color: #64748B; margin-bottom: 24px; line-height: 1.5;">
        ${escapeHtml(paper.description)}
      </p>

      <!-- Key Details Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
        <div>
          <span style="display: block; font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 2px;">EXAM NAME</span>
          <strong style="font-size: 0.95rem; color: #0F172A;">${escapeHtml(paper.examName)}</strong>
        </div>
        <div>
          <span style="display: block; font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 2px;">YEAR & SHIFT</span>
          <strong style="font-size: 0.95rem; color: #0F172A;">${escapeHtml(paper.year)} (${escapeHtml(paper.shift)})</strong>
        </div>
        <div>
          <span style="display: block; font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 2px;">TOTAL QUESTIONS</span>
          <strong style="font-size: 0.95rem; color: #0F172A;">${paper.questionsCount} Questions</strong>
        </div>
        <div>
          <span style="display: block; font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 2px;">TIME DURATION</span>
          <strong style="font-size: 0.95rem; color: #0F172A;">${escapeHtml(paper.duration)}</strong>
        </div>
        <div>
          <span style="display: block; font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 2px;">LANGUAGE</span>
          <strong style="font-size: 0.95rem; color: #0F172A;">${escapeHtml(paper.language)}</strong>
        </div>
        <div>
          <span style="display: block; font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 2px;">COVERED SUBJECTS</span>
          <strong style="font-size: 0.95rem; color: #0F172A;">${escapeHtml(paper.subject)}</strong>
        </div>
      </div>

      <!-- Actions Bar -->
      <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
        <a href="./test-interface.html?exam=${paper.examId}&pyq=${paper.id}" style="padding: 14px 28px; background: #DC2626; color: #FFFFFF; font-weight: 800; border-radius: 10px; font-size: 1rem; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(220,38,38,0.25);">
          🚀 Start Practice Mode
        </a>

        <button id="viewPdfBtn" type="button" style="padding: 14px 22px; background: #FFFFFF; color: #0F172A; border: 1px solid #CBD5E1; font-weight: 700; border-radius: 10px; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          📄 View PDF
        </button>

        <button id="downloadPdfBtn" type="button" disabled style="padding: 14px 22px; background: #F1F5F9; color: #94A3B8; border: 1px solid #E2E8F0; font-weight: 700; border-radius: 10px; font-size: 0.95rem; cursor: not-allowed; display: inline-flex; align-items: center; gap: 6px;">
          📥 Download PDF <span style="font-size: 0.7rem; background: #CBD5E1; color: #475569; padding: 2px 6px; border-radius: 4px;">Coming Soon</span>
        </button>
      </div>
    </div>
  `;

  // Action event handlers
  const viewPdfBtn = document.getElementById('viewPdfBtn');
  if (viewPdfBtn) {
    viewPdfBtn.addEventListener('click', () => {
      showToast('Official PDF viewer will be active soon. Please start interactive CBT practice mode.');
    });
  }

  function showToast(msg) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.style.display = 'none', 300);
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/\'/g, '&#039;');
  }
});
