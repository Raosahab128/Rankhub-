import { getCurrentUser } from './firebase.js';
import { getPyqPapers } from './pyq-store.js';

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
    

  // DOM References
  const searchInput = document.getElementById('pyqSearchInput');
  const clearSearchBtn = document.getElementById('clearPyqSearchBtn');
  const categoryBtns = document.querySelectorAll('.pyq-cat-btn');
  const yearSelect = document.getElementById('pyqYearSelect');
  const subjectSelect = document.getElementById('pyqSubjectSelect');
  const gridContainer = document.getElementById('pyqGridContainer');

  // Active State
  let searchQuery = '';
  let activeCategory = 'All';
  let activeYear = 'All';
  let activeSubject = 'All';

  // Initial Render
  renderPyqList();

  // Category Buttons Handlers
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = '#FFFFFF';
        b.style.color = '#475569';
        b.style.fontWeight = '600';
      });

      btn.classList.add('active');
      btn.style.background = '#0F172A';
      btn.style.color = '#FFFFFF';
      btn.style.fontWeight = '700';

      activeCategory = btn.dataset.category;
      renderPyqList();
    });
  });

  // Search Input Handlers
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearSearchBtn) clearSearchBtn.style.display = searchQuery.trim().length > 0 ? 'block' : 'none';
      renderPyqList();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderPyqList();
    });
  }

  // Select Dropdown Handlers
  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      activeYear = e.target.value;
      renderPyqList();
    });
  }

  if (subjectSelect) {
    subjectSelect.addEventListener('change', (e) => {
      activeSubject = e.target.value;
      renderPyqList();
    });
  }

  /**
   * Main Render Function
   */
  function renderPyqList() {
    if (!gridContainer) return;

    const filters = {
      searchQuery,
      category: activeCategory,
      year: activeYear,
      subject: activeSubject
    };

    const papers = getPyqPapers(filters);

    if (papers.length === 0) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 16px; padding: 48px 24px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="width: 64px; height: 64px; background: #FEF2F2; color: #DC2626; border-radius: 999px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 1.8rem;">
            📜
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: #0F172A; margin-bottom: 6px;">No Previous Year Papers Available</h3>
          <p style="font-size: 0.9rem; color: #64748B; max-width: 440px; margin: 0 auto 20px; line-height: 1.5;">
            PYQ papers will appear here once they are added. Try resetting search parameters or selecting another category filter.
          </p>
          <button id="resetPyqFiltersBtn" type="button" style="padding: 10px 20px; background: #DC2626; color: #FFFFFF; font-weight: 700; border-radius: 8px; font-size: 0.875rem; cursor: pointer; border: none; box-shadow: 0 2px 4px rgba(220,38,38,0.2);">
            Reset All Filters
          </button>
        </div>
      `;

      const resetBtn = document.getElementById('resetPyqFiltersBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          searchQuery = '';
          activeCategory = 'All';
          activeYear = 'All';
          activeSubject = 'All';

          if (searchInput) searchInput.value = '';
          if (clearSearchBtn) clearSearchBtn.style.display = 'none';
          if (yearSelect) yearSelect.value = 'All';
          if (subjectSelect) subjectSelect.value = 'All';

          categoryBtns.forEach(b => {
            b.classList.remove('active');
            b.style.background = '#FFFFFF';
            b.style.color = '#475569';
            b.style.fontWeight = '600';
            if (b.dataset.category === 'All') {
              b.classList.add('active');
              b.style.background = '#0F172A';
              b.style.color = '#FFFFFF';
              b.style.fontWeight = '700';
            }
          });

          renderPyqList();
        });
      }
      return;
    }

    gridContainer.innerHTML = papers.map(paper => `
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 6px rgba(0,0,0,0.02); transition: transform 0.15s, box-shadow 0.15s;">
        <div>
          <!-- Header Badges -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="background: #FEF2F2; color: #DC2626; font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 4px; border: 1px solid #FCA5A5;">
              ${escapeHtml(paper.examCategory)} • ${escapeHtml(paper.year)}
            </span>
            <span style="font-size: 0.72rem; font-weight: 700; color: #64748B; background: #F1F5F9; padding: 3px 8px; border-radius: 4px;">
              ${escapeHtml(paper.language)}
            </span>
          </div>

          <!-- Paper Title -->
          <h3 style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin-bottom: 6px; line-height: 1.35;">
            ${escapeHtml(paper.paperTitle)}
          </h3>

          <!-- Details Subtitle -->
          <p style="font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 12px;">
            ${escapeHtml(paper.shift)}
          </p>

          <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.8rem; color: #64748B; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #F1F5F9;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span>📝</span>
              <strong>${paper.questionsCount} Questions</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span>⏱️</span>
              <strong>${escapeHtml(paper.duration)}</strong>
            </div>
          </div>
        </div>

        <!-- Action Buttons (View Paper, Practice, Download) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
          <a href="./pyq-detail.html?id=${paper.id}" style="padding: 9px 12px; background: #F8FAFC; color: #0F172A; border: 1px solid #CBD5E1; border-radius: 8px; font-weight: 700; font-size: 0.8rem; text-decoration: none; text-align: center; display: block;">
            View Paper
          </a>
          <a href="./test-interface.html?exam=${paper.examId}&pyq=${paper.id}" style="padding: 9px 12px; background: #DC2626; color: #FFFFFF; border-radius: 8px; font-weight: 800; font-size: 0.8rem; text-decoration: none; text-align: center; display: block; box-shadow: 0 2px 4px rgba(220,38,38,0.2);">
            Practice
          </a>
        </div>

        <button type="button" class="download-pdf-btn" disabled style="width: 100%; padding: 8px; background: #F1F5F9; color: #94A3B8; border: 1px solid #E2E8F0; border-radius: 8px; font-weight: 600; font-size: 0.78rem; cursor: not-allowed; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span>📥 Download PDF</span>
          <span style="font-size: 0.65rem; background: #CBD5E1; color: #475569; padding: 2px 5px; border-radius: 4px; font-weight: 700;">Coming Soon</span>
        </button>
      </div>
    `).join('');
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
