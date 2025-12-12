// Generator Page JavaScript
class LiteratureReviewGenerator {
    constructor() {
        this.apiBase = this.detectApiBase();
        this.initializeAuthGate();
        this.initializeElements();
        this.bindEvents();
        this.currentReview = null;
        // Library management
        this.initializeLibrary();
        this.renderLibrary();
    }

    detectApiBase() {
        const isFastApi = window.location.port === '8000';
        if (isFastApi) return '';
        return 'http://127.0.0.1:8000';
    }

    // Require auth for access to generator dashboard
    initializeAuthGate() {
        try {
            const isAuthenticated = localStorage.getItem('nzeru_is_authenticated') === 'true' || localStorage.getItem('nzeru_is_premium') === 'true';
            const signOutItem = document.getElementById('signOutItem');
            const signOutBtn = document.getElementById('signOutBtn');

            if (isAuthenticated) {
                if (signOutItem) signOutItem.style.display = 'list-item';
                if (signOutBtn) {
                    signOutBtn.addEventListener('click', () => {
                        try {
                            localStorage.removeItem('nzeru_is_authenticated');
                            localStorage.removeItem('nzeru_is_premium');
                            localStorage.removeItem('nzeru_plan');
                            localStorage.removeItem('nzeru_plan_amount');
                            localStorage.removeItem('nzeru_txn_id');
                            localStorage.removeItem('nzeru_plan_activated_at');
                        } catch {}
                        window.location.href = 'index.html';
                    });
                }
            }
        } catch {}
    }

    initializeElements() {
        // Form elements
        this.form = document.getElementById('reviewForm');
        this.topicInput = document.getElementById('researchTopic');
        this.objectivesInput = document.getElementById('researchObjectives');
        this.fieldSelect = document.getElementById('field');
        this.maxSourcesSelect = document.getElementById('maxSources');
        this.reviewLengthSelect = document.getElementById('reviewLength');
        this.generateBtn = document.getElementById('generateBtn');
        this.clearBtn = document.getElementById('clearBtn');

        // State elements
        this.loadingState = document.getElementById('loadingState');
        this.resultsSection = document.getElementById('resultsSection');
        this.errorState = document.getElementById('errorState');

        // Results elements
        this.reviewTopic = document.getElementById('reviewTopic');
        this.reviewSources = document.getElementById('reviewSources');
        this.reviewDate = document.getElementById('reviewDate');
        this.reviewText = document.getElementById('reviewText');
        this.sourcesList = document.getElementById('sourcesList');

        // Action buttons
        this.downloadBtn = document.getElementById('downloadBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.shareBtn = document.getElementById('shareBtn');

        // Trial counter UI
        this.trialCounter = document.getElementById('trialCounter');
        this.updateTrialCounterDisplay();

        // Library elements
        this.libraryList = document.getElementById('libraryList');
        this.librarySearch = document.getElementById('librarySearch');
        this.librarySearchBtn = document.getElementById('librarySearchBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
    }

    bindEvents() {
        if (this.form) this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        if (this.clearBtn) this.clearBtn.addEventListener('click', () => this.clearForm());
        if (this.downloadBtn) this.downloadBtn.addEventListener('click', () => this.downloadReview());
        if (this.saveBtn) this.saveBtn.addEventListener('click', () => this.saveToLibrary());
        if (this.shareBtn) this.shareBtn.addEventListener('click', () => this.shareReview());
        if (this.topicInput) this.topicInput.addEventListener('input', () => this.validateTopic());

        if (this.librarySearchBtn) this.librarySearchBtn.addEventListener('click', () => this.applyLibrarySearch());
        if (this.librarySearch) this.librarySearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.applyLibrarySearch(); });
        if (this.clearAllBtn) this.clearAllBtn.addEventListener('click', () => this.clearAllLibrary());
        if (this.newChatBtn) this.newChatBtn.addEventListener('click', () => this.newChat());
    }

    updateTrialCounterDisplay() {
        if (!this.trialCounter) return;
        try {
            const isPremium = localStorage.getItem('nzeru_is_premium') === 'true';
            if (isPremium) {
                this.trialCounter.innerHTML = '<i class="fas fa-crown"></i> <span>Premium</span>';
                this.trialCounter.style.color = '#f59e0b';
                return;
            }
        } catch {}
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        if (!this.validateForm()) return;

        const formData = new FormData(this.form);
        const requestData = {
            topic: formData.get('topic'),
            objectives: (formData.get('objectives') || '').trim(),
            field: formData.get('field'),
            max_sources: parseInt(formData.get('max_sources')),
            review_length: formData.get('review_length')
        };

        this.showLoadingState();
        this.disableForm();

        try {
            const response = await this.generateReview(requestData);
            this.handleSuccess(response);
        } catch (error) {
            this.handleError(error);
        }
    }

    async generateReview(data) {
        const response = await fetch(`${this.apiBase}/api/generate-review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP error! status: ${response.status}${text ? ` - ${text}` : ''}`);
        }
        return await response.json();
    }

    handleSuccess(data) {
        this.currentReview = data;
        this.hideLoadingState();
        this.displayResults(data);
        this.enableForm();

        // Auto-save conversation to library after generation for quick access
        this.saveToLibrary(false);
    }

    handleError(error) {
        console.error('Error generating review:', error);
        this.hideLoadingState();
        this.showError(error.message || 'An error occurred while generating the literature review.');
        this.enableForm();
    }

    displayResults(data) {
        this.reviewTopic.textContent = data.topic || 'Research Topic';
        this.reviewSources.textContent = `${data.total_sources || data.sources?.length || 0} sources`;
        this.reviewDate.textContent = new Date().toLocaleDateString();

        this.reviewText.textContent = data.review;
        this.displaySources(data.sources || []);

        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    displaySources(sources) {
        this.sourcesList.innerHTML = '';
        if (!sources || sources.length === 0) {
            this.sourcesList.innerHTML = '<p>No sources available.</p>';
            return;
        }
        sources.forEach(source => {
            const sourceElement = this.createSourceElement(source);
            this.sourcesList.appendChild(sourceElement);
        });
    }

    createSourceElement(source) {
        const sourceDiv = document.createElement('div');
        sourceDiv.className = 'source-item';
        const authors = Array.isArray(source.authors) ? source.authors.join(', ') : source.authors;
        const year = source.year || 'N/A';
        sourceDiv.innerHTML = `
            <div class="source-title">${source.title}</div>
            <div class="source-authors">${authors} (${year})</div>
            <div class="source-abstract">${source.abstract}</div>
            <div class="source-meta">
                <span>Source: ${source.source || '—'}</span>
                <a href="${source.url}" target="_blank" class="source-link">View Paper</a>
            </div>
        `;
        return sourceDiv;
    }

    validateForm() {
        const topic = this.topicInput.value.trim();
        if (!topic) { this.showFieldError(this.topicInput, 'Research topic is required'); return false; }
        if (topic.length < 5) { this.showFieldError(this.topicInput, 'Research topic must be at least 5 characters'); return false; }
        this.clearFieldError(this.topicInput);
        return true;
    }

    validateTopic() {
        const topic = this.topicInput.value.trim();
        if (topic.length > 0 && topic.length < 5) this.showFieldError(this.topicInput, 'Research topic must be at least 5 characters');
        else this.clearFieldError(this.topicInput);
    }

    showFieldError(field, message) {
        field.classList.add('error');
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) existingError.remove();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorMessage = field.parentNode.querySelector('.error-message');
        if (errorMessage) errorMessage.remove();
    }

    showLoadingState() {
        this.loadingState.style.display = 'block';
        this.loadingState.scrollIntoView({ behavior: 'smooth' });
    }

    hideLoadingState() { this.loadingState.style.display = 'none'; }

    showError(message) {
        this.errorState.style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
        this.errorState.scrollIntoView({ behavior: 'smooth' });
    }

    hideError() { this.errorState.style.display = 'none'; }

    disableForm() {
        this.generateBtn.disabled = true;
        this.generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        this.topicInput.disabled = true;
        this.fieldSelect.disabled = true;
        this.maxSourcesSelect.disabled = true;
        this.reviewLengthSelect.disabled = true;
    }

    enableForm() {
        this.generateBtn.disabled = false;
        this.generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Literature Review';
        this.topicInput.disabled = false;
        this.fieldSelect.disabled = false;
        this.maxSourcesSelect.disabled = false;
        this.reviewLengthSelect.disabled = false;
    }

    clearForm() {
        this.form.reset();
        this.clearFieldError(this.topicInput);
        this.hideError();
        this.resultsSection.style.display = 'none';
        this.currentReview = null;
    }

    downloadReview() {
        if (!this.currentReview) { alert('No review to download'); return; }
        const content = this.formatReviewForDownload();
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `literature_review_${(this.currentReview.topic || 'topic').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    formatReviewForDownload() {
        const review = this.currentReview;
        let content = `LITERATURE REVIEW\n`;
        content += `Topic: ${review.topic}\n`;
        content += `Generated: ${new Date().toLocaleString()}\n`;
        content += `Sources: ${review.total_sources || review.sources?.length || 0}\n`;
        content += `\n${'='.repeat(50)}\n\n`;
        content += review.review;
        content += `\n\n${'='.repeat(50)}\n\n`;
        content += `SOURCES:\n\n`;
        if (review.sources && review.sources.length > 0) {
            review.sources.forEach((source, index) => {
                const authors = Array.isArray(source.authors) ? source.authors.join(', ') : source.authors;
                content += `${index + 1}. ${source.title}\n`;
                content += `   Authors: ${authors} (${source.year})\n`;
                content += `   URL: ${source.url}\n\n`;
            });
        }
        return content;
    }

    // ===== Library Management =====
    initializeLibrary() {
        if (!localStorage.getItem('literatureReviews')) {
            localStorage.setItem('literatureReviews', '[]');
        }
    }

    getSavedReviews() {
        try {
            return JSON.parse(localStorage.getItem('literatureReviews') || '[]');
        } catch { return []; }
    }

    setSavedReviews(reviews) {
        try { localStorage.setItem('literatureReviews', JSON.stringify(reviews)); } catch {}
    }

    renderLibrary(filtered = null) {
        if (!this.libraryList) return;
        const reviews = filtered ?? this.getSavedReviews().sort((a,b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
        this.libraryList.innerHTML = '';
        if (reviews.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'library-item';
            empty.innerHTML = '<span class="title">No conversations yet</span>';
            this.libraryList.appendChild(empty);
            return;
        }
        reviews.forEach(r => {
            const li = document.createElement('li');
            li.className = 'library-item';
            li.setAttribute('data-id', r.id);
            const title = this.safeTitle(r.topic || (r.review || '').split('\n')[0] || 'Untitled');
            const time = new Date(r.savedAt || Date.now()).toLocaleString();
            li.innerHTML = `
                <i class="far fa-comment icon"></i>
                <span class="title">${title}</span>
                <span class="time">${time}</span>
                <button class="link delete" title="Delete" aria-label="Delete" style="margin-left:auto;border:none;background:none;color:#ef4444;"><i class="fas fa-trash"></i></button>
            `;
            li.addEventListener('click', (e) => {
                if ((e.target.closest && e.target.closest('.delete'))) return; // ignore if delete pressed
                this.loadFromLibrary(r.id);
            });
            li.querySelector('.delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFromLibrary(r.id);
            });
            this.libraryList.appendChild(li);
        });
    }

    applyLibrarySearch() {
        const q = (this.librarySearch?.value || '').toLowerCase().trim();
        const all = this.getSavedReviews();
        if (!q) { this.renderLibrary(all); return; }
        const filtered = all.filter(r => (r.topic || '').toLowerCase().includes(q) || (r.review || '').toLowerCase().includes(q));
        this.renderLibrary(filtered);
    }

    newChat() {
        // Reset form and UI state for a fresh conversation
        try {
            this.currentReview = null;
            if (this.form) this.form.reset();
            if (this.reviewText) this.reviewText.textContent = '';
            if (this.sourcesList) this.sourcesList.innerHTML = '';
            if (this.resultsSection) this.resultsSection.style.display = 'none';
            if (this.errorState) this.hideError();
            if (this.topicInput) this.topicInput.focus();
            // Clear search filter to show full history
            if (this.librarySearch) this.librarySearch.value = '';
            this.renderLibrary();
            this.showNotification('Started a new chat', 'info');
            // Smooth scroll to the form
            this.form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
            // fallback
        }
    }

    saveToLibrary(showToast = true) {
        if (!this.currentReview) { if (showToast) this.showNotification('Nothing to save', 'info'); return; }
        const savedReviews = this.getSavedReviews();
        const reviewToSave = {
            id: Date.now(),
            savedAt: new Date().toISOString(),
            topic: this.currentReview.topic,
            review: this.currentReview.review,
            sources: this.currentReview.sources || [],
            total_sources: this.currentReview.total_sources || (this.currentReview.sources?.length || 0)
        };
        savedReviews.unshift(reviewToSave);
        this.setSavedReviews(savedReviews);
        this.renderLibrary();
        if (showToast) this.showNotification('Saved to library', 'success');
    }

    loadFromLibrary(id) {
        const reviews = this.getSavedReviews();
        const item = reviews.find(r => String(r.id) === String(id));
        if (!item) return;
        this.currentReview = { topic: item.topic, review: item.review, sources: item.sources, total_sources: item.total_sources };
        this.displayResults(this.currentReview);
    }

    deleteFromLibrary(id) {
        const reviews = this.getSavedReviews();
        const next = reviews.filter(r => String(r.id) !== String(id));
        this.setSavedReviews(next);
        this.renderLibrary();
        this.showNotification('Deleted from library', 'success');
    }

    clearAllLibrary() {
        if (!confirm('Clear all saved conversations?')) return;
        this.setSavedReviews([]);
        this.renderLibrary();
        this.showNotification('Library cleared', 'success');
    }

    safeTitle(s) {
        const t = (s || '').trim();
        return t.length > 40 ? t.slice(0, 37) + '...' : t || 'Untitled';
    }

    shareReview() {
        if (!this.currentReview) { alert('No review to share'); return; }
        if (navigator.share) {
            navigator.share({ title: `Literature Review: ${this.currentReview.topic}`, text: `Check out this AI-generated literature review on ${this.currentReview.topic}`, url: window.location.href });
        } else {
            const shareText = `Literature Review: ${this.currentReview.topic}\n\n${this.currentReview.review.substring(0, 200)}...\n\nGenerated by Nzeru AI`;
            navigator.clipboard.writeText(shareText).then(() => { this.showNotification('Review copied to clipboard!', 'success'); });
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 1rem 1.5rem; border-radius: 10px; color: white; font-weight: 500; z-index: 10000; animation: slideIn 0.3s ease-out; background: ${type === 'success' ? '#10b981' : type === 'info' ? '#3b82f6' : '#ef4444'};`;
        document.body.appendChild(notification);
        setTimeout(() => { notification.style.animation = 'slideOut 0.3s ease-in'; setTimeout(() => { if (notification.parentNode) notification.parentNode.removeChild(notification); }, 300); }, 3000);
    }
}

// Initialize the generator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const generator = new LiteratureReviewGenerator();

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0); } }
    `;
    document.head.appendChild(style);

    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }));
    }
});