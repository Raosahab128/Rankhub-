import { getCurrentUser } from './firebase.js';
/**
 * RankHub - Exams Section Logic
 * Full implementation supporting 15+ categories, real-time search, category filters,
 * skeleton loading, empty state, and direct navigation to Exam Detail Page.
 */

import { CATEGORIES, getAllExams, filterExams } from './exam-store.js';

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
    

  const examsAppContainer = document.getElementById('examsAppContainer');
  if (!examsAppContainer) return;

  let currentCategory = 'All';
  let searchQuery = '';

  const searchInput = document.getElementById('examSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchInputBtn');
  const categoryChipsContainer = document.getElementById('examCategoryChipsContainer');
  
  const popularSection = document.getElementById('popularExamsSection');
  const popularSectionTitle = document.getElementById('popularSectionTitle');
  const popularSectionSub = document.getElementById('popularSectionSub');
  const popularGrid = document.getElementById('popularExamsGrid');

  const allExamsSection = document.getElementById('allExamsSection');
  const allExamsGrid = document.getElementById('allExamsGrid');

  const emptyStateContainer = document.getElementById('examEmptyStateContainer');
  const resetSearchBtn = document.getElementById('emptyStateResetBtn');
  const searchResultsCountLabel = document.getElementById('searchResultsCountLabel');

  // Initialize Category Filter Chips
  renderCategoryChips();

  // Initial Render
  applyFiltersAndRender();

  // Search Bar Handlers
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      toggleClearButtonVisibility();
      applyFiltersAndRender();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      searchQuery = '';
      toggleClearButtonVisibility();
      applyFiltersAndRender();
    });
  }

  if (resetSearchBtn) {
    resetSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      currentCategory = 'All';
      toggleClearButtonVisibility();
      renderCategoryChips();
      applyFiltersAndRender();
    });
  }

  function toggleClearButtonVisibility() {
    if (clearSearchBtn) {
      clearSearchBtn.style.display = searchQuery.trim().length > 0 ? 'inline-flex' : 'none';
    }
  }

  function renderCategoryChips() {
    if (!categoryChipsContainer) return;
    categoryChipsContainer.innerHTML = '';

    CATEGORIES.forEach(cat => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `exam-cat-chip ${cat === currentCategory ? 'active' : ''}`;
      chip.textContent = cat;
      chip.setAttribute('aria-pressed', cat === currentCategory ? 'true' : 'false');

      chip.addEventListener('click', () => {
        currentCategory = cat;
        
        const allChips = categoryChipsContainer.querySelectorAll('.exam-cat-chip');
        allChips.forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');

        applyFiltersAndRender();
      });

      categoryChipsContainer.appendChild(chip);
    });
  }

  async function applyFiltersAndRender() {
    const filteredExams = await filterExams(currentCategory, searchQuery);
    const isFilteringActive = searchQuery.trim().length > 0 || currentCategory !== 'All';

    // If no results match search/filter
    if (filteredExams.length === 0) {
      if (popularSection) popularSection.style.display = 'none';
      if (allExamsSection) allExamsSection.style.display = 'none';
      if (searchResultsCountLabel) searchResultsCountLabel.style.display = 'none';
      if (emptyStateContainer) emptyStateContainer.style.display = 'flex';
      return;
    }

    if (emptyStateContainer) emptyStateContainer.style.display = 'none';

    if (searchResultsCountLabel) {
      if (isFilteringActive) {
        searchResultsCountLabel.style.display = 'block';
        searchResultsCountLabel.textContent = `Showing ${filteredExams.length} exam${filteredExams.length === 1 ? '' : 's'} ${currentCategory !== 'All' ? `in ${currentCategory}` : ''} ${searchQuery ? `for "${searchQuery}"` : ''}`;
      } else {
        searchResultsCountLabel.style.display = 'none';
      }
    }

    if (isFilteringActive) {
      // Filter Active: Display single grid in Popular Section with dynamic title
      if (allExamsSection) allExamsSection.style.display = 'none';
      if (popularSection) {
        popularSection.style.display = 'block';
        if (popularSectionTitle) {
          popularSectionTitle.textContent = currentCategory !== 'All' ? `${currentCategory} Exams` : 'Matching Exams';
        }
        if (popularSectionSub) {
          popularSectionSub.textContent = `Showing ${filteredExams.length} available examination${filteredExams.length === 1 ? '' : 's'}`;
        }
      }
      renderExamsGrid(popularGrid, filteredExams);
    } else {
      // Default View: Popular Exams top row/grid + All Exams grid
      const allExams = await getAllExams();
      const popularList = allExams.filter(e => e.isPopular || e.isFeatured).slice(0, 6);

      if (popularSection) {
        popularSection.style.display = 'block';
        if (popularSectionTitle) popularSectionTitle.textContent = 'POPULAR EXAMS';
        if (popularSectionSub) popularSectionSub.textContent = 'सबसे ज्यादा पसंद किए जाने वाले exams';
        renderExamsGrid(popularGrid, popularList);
      }

      if (allExamsSection) {
        allExamsSection.style.display = 'block';
        renderExamsGrid(allExamsGrid, allExams);
      }
    }

    attachExamCardListeners();
  }

  function renderExamsGrid(container, exams) {
    if (!container) return;
    container.innerHTML = '';

    exams.forEach(exam => {
      const card = document.createElement('article');
      card.className = 'exam-discovery-card';
      card.dataset.id = exam.id;

      const mockCount = exam.mockTestCount || '10+ Mock Tests';
      const qCount = exam.questionCount || '500+ Practice';
      const pyqYears = exam.pyqYears || '5+ Years PYQ';

      card.innerHTML = `
        <div class="exam-card-inner">
          <div class="exam-card-top">
            <div class="exam-logo-box" style="background-color: ${exam.logoBg || '#FEF2F2'}; color: ${exam.logoColor || '#DC2626'};">
              <span>${escapeHtml(exam.logoText || exam.name.substring(0, 3))}</span>
            </div>
            <span class="exam-cat-badge">${escapeHtml(exam.category)}</span>
          </div>

          <h3 class="exam-card-title">${escapeHtml(exam.name)}</h3>
          <p class="exam-card-desc">${escapeHtml(exam.description || exam.fullTitle)}</p>

          <div class="exam-card-meta-list">
            <span class="meta-item">📝 ${escapeHtml(mockCount)}</span>
            <span class="meta-item">📚 ${escapeHtml(qCount)}</span>
            <span class="meta-item">📄 ${escapeHtml(pyqYears)}</span>
            <span class="meta-item">📖 Notes Available</span>
          </div>

          <div class="exam-card-footer">
            <span class="btn-explore-link">
              <span>View Exam</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  function attachExamCardListeners() {
    const cards = document.querySelectorAll('.exam-discovery-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        const id = card.dataset.id;
        if (id) {
          window.location.href = `./exam-detail.html?id=${id}`;
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
