// Application State
const state = {
    updates: [],
    filteredUpdates: [],
    searchQuery: '',
    activeTypeFilter: 'all',
    selectedUpdate: null,
    activeHashtags: new Set(['#BigQuery', '#GoogleCloud'])
};

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshSpinner: document.getElementById('refresh-spinner'),
    lastUpdatedTime: document.getElementById('last-updated-time'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search'),
    typePills: document.getElementById('type-pills'),
    resultsCount: document.getElementById('results-count'),
    updatesGrid: document.getElementById('updates-grid'),
    feedLoader: document.getElementById('feed-loader'),
    feedError: document.getElementById('feed-error'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    feedEmpty: document.getElementById('feed-empty'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    
    // Modal elements
    tweetModal: document.getElementById('tweet-modal'),
    closeModalBtn: document.getElementById('close-modal'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    tweetSubmitBtn: document.getElementById('tweet-submit-btn'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCounter: document.getElementById('char-counter'),
    limitWarning: document.getElementById('limit-warning'),
    previewTypeBadge: document.getElementById('preview-type-badge'),
    previewDate: document.getElementById('preview-date'),
    previewSnippet: document.getElementById('preview-snippet'),
    hashtagPills: document.getElementById('hashtag-pills'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// Setup Event Listeners
function setupEventListeners() {
    // Refresh & Retry
    elements.refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    elements.retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Theme Switcher
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Export CSV
    elements.exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Search
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.clearSearchBtn.addEventListener('click', clearSearch);
    
    // Filter Pills
    elements.typePills.addEventListener('click', handleFilterClick);
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Modal controls
    elements.closeModalBtn.addEventListener('click', closeTweetModal);
    elements.modalCancelBtn.addEventListener('click', closeTweetModal);
    elements.tweetSubmitBtn.addEventListener('click', submitTweet);
    elements.tweetTextarea.addEventListener('input', updateCharCount);
    
    // Close modal on overlay click
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetModal();
        }
    });

    // Hashtag Pills click delegation
    elements.hashtagPills.addEventListener('click', handleHashtagClick);
}

// Fetch Release Notes from API
async function fetchReleaseNotes(forceRefresh = false) {
    toggleLoading(true);
    
    if (forceRefresh) {
        elements.refreshSpinner.classList.add('spinning');
        showToast("Fetching latest release notes from Google Cloud...");
    }
    
    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            state.updates = result.data;
            
            // Format Last Updated display
            const updatedDate = new Date(result.last_updated);
            elements.lastUpdatedTime.textContent = updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            applyFiltersAndSearch();
            
            if (forceRefresh) {
                showToast("Updates successfully synced!");
            }
        } else {
            throw new Error(result.error || "Unknown error occurred");
        }
        
    } catch (error) {
        console.error("Error fetching release notes:", error);
        elements.errorMessage.textContent = error.message || "A network error occurred while communicating with the server.";
        toggleLoading(false, true);
    } finally {
        toggleLoading(false);
        elements.refreshSpinner.classList.remove('spinning');
    }
}

// UI State Toggles
function toggleLoading(isLoading, isError = false) {
    if (isLoading) {
        elements.feedLoader.style.display = 'flex';
        elements.updatesGrid.style.display = 'none';
        elements.feedError.style.display = 'none';
        elements.feedEmpty.style.display = 'none';
    } else if (isError) {
        elements.feedLoader.style.display = 'none';
        elements.updatesGrid.style.display = 'none';
        elements.feedError.style.display = 'flex';
        elements.feedEmpty.style.display = 'none';
    } else {
        elements.feedLoader.style.display = 'none';
        elements.feedError.style.display = 'none';
    }
}

// Filter and Search Logic
function handleSearchInput(e) {
    state.searchQuery = e.target.value.toLowerCase().trim();
    
    // Toggle clear search button visibility
    if (state.searchQuery) {
        elements.clearSearchBtn.style.display = 'flex';
    } else {
        elements.clearSearchBtn.style.display = 'none';
    }
    
    applyFiltersAndSearch();
}

function clearSearch() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    applyFiltersAndSearch();
}

function handleFilterClick(e) {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    
    // Update active pill styling
    const pills = elements.typePills.querySelectorAll('.pill');
    pills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    
    state.activeTypeFilter = pill.dataset.type;
    applyFiltersAndSearch();
}

function resetFilters() {
    clearSearch();
    const allPill = elements.typePills.querySelector('[data-type="all"]');
    if (allPill) allPill.click();
}

function applyFiltersAndSearch() {
    state.filteredUpdates = state.updates.filter(update => {
        // 1. Filter by category type
        const matchesType = state.activeTypeFilter === 'all' || 
                            update.type.toLowerCase() === state.activeTypeFilter;
        
        // 2. Filter by search query
        const textToSearch = `${update.date} ${update.type} ${update.content_text}`.toLowerCase();
        const matchesSearch = textToSearch.includes(state.searchQuery);
        
        return matchesType && matchesSearch;
    });
    
    renderUpdates();
}

// Card Renderer helper (Category styling config)
function getCategoryConfig(type) {
    const normType = type.toLowerCase();
    switch (normType) {
        case 'feature':
            return {
                accentColor: 'var(--color-feature)',
                borderHoverColor: 'rgba(16, 185, 129, 0.4)',
                shadowColor: 'rgba(16, 185, 129, 0.15)',
                badgeBg: 'rgba(16, 185, 129, 0.12)',
                badgeColor: '#34d399',
                badgeBorder: 'rgba(16, 185, 129, 0.25)'
            };
        case 'change':
            return {
                accentColor: 'var(--color-change)',
                borderHoverColor: 'rgba(6, 182, 212, 0.4)',
                shadowColor: 'rgba(6, 182, 212, 0.15)',
                badgeBg: 'rgba(6, 182, 212, 0.12)',
                badgeColor: '#22d3ee',
                badgeBorder: 'rgba(6, 182, 212, 0.25)'
            };
        case 'deprecated':
            return {
                accentColor: 'var(--color-deprecated)',
                borderHoverColor: 'rgba(244, 63, 94, 0.4)',
                shadowColor: 'rgba(244, 63, 94, 0.15)',
                badgeBg: 'rgba(244, 63, 94, 0.12)',
                badgeColor: '#fb7185',
                badgeBorder: 'rgba(244, 63, 94, 0.25)'
            };
        case 'bug fix':
            return {
                accentColor: 'var(--color-bug)',
                borderHoverColor: 'rgba(139, 92, 246, 0.4)',
                shadowColor: 'rgba(139, 92, 246, 0.15)',
                badgeBg: 'rgba(139, 92, 246, 0.12)',
                badgeColor: '#c084fc',
                badgeBorder: 'rgba(139, 92, 246, 0.25)'
            };
        default:
            return {
                accentColor: 'var(--color-general)',
                borderHoverColor: 'var(--border-hover)',
                shadowColor: 'rgba(0, 0, 0, 0.35)',
                badgeBg: 'rgba(100, 116, 139, 0.12)',
                badgeColor: '#cbd5e1',
                badgeBorder: 'rgba(100, 116, 139, 0.25)'
            };
    }
}

// Render the grid elements
function renderUpdates() {
    elements.updatesGrid.innerHTML = '';
    
    // Update Stats Display
    if (state.updates.length === 0) {
        elements.resultsCount.textContent = 'No updates loaded.';
        return;
    }
    
    elements.resultsCount.textContent = `Showing ${state.filteredUpdates.length} of ${state.updates.length} updates`;
    
    // Empty state check
    if (state.filteredUpdates.length === 0) {
        elements.updatesGrid.style.display = 'none';
        elements.feedEmpty.style.display = 'flex';
        return;
    }
    
    elements.feedEmpty.style.display = 'none';
    elements.updatesGrid.style.display = 'grid';
    
    state.filteredUpdates.forEach(update => {
        const config = getCategoryConfig(update.type);
        const card = document.createElement('article');
        card.className = 'release-card glass-card';
        
        // Inline styles for category accents on hover
        card.style.setProperty('--card-accent-color', config.accentColor);
        card.style.setProperty('--card-border-hover-color', config.borderHoverColor);
        card.style.setProperty('--card-shadow-color', config.shadowColor);
        
        // Define styles for badge components
        const badgeStyle = `
            --badge-bg: ${config.badgeBg};
            --badge-color: ${config.badgeColor};
            --badge-border: ${config.badgeBorder};
        `;
        
        card.innerHTML = `
            <div class="card-header">
                <span class="card-date">${update.date}</span>
                <span class="badge" style="${badgeStyle}">${update.type}</span>
            </div>
            
            <div class="card-body">
                ${update.content_html}
            </div>
            
            <div class="card-footer">
                <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="card-action-link" title="Open official documentation in a new tab">
                    <span>Official Release Notes</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
                
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="btn btn-secondary copy-btn" data-id="${update.id}" title="Copy to clipboard">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>Copy</span>
                    </button>
                    
                    <button class="btn btn-twitter tweet-btn" data-id="${update.id}">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet</span>
                    </button>
                </div>
            </div>
        `;
        
        // Setup listener on Copy Button
        card.querySelector('.copy-btn').addEventListener('click', (e) => {
            copyToClipboard(update, e.currentTarget);
        });
        
        // Setup listener on Tweet Button
        card.querySelector('.tweet-btn').addEventListener('click', () => {
            openTweetComposer(update);
        });
        
        elements.updatesGrid.appendChild(card);
    });
}

// Tweet Composer Modal Operations
function openTweetComposer(update) {
    state.selectedUpdate = update;
    
    // Set Preview Content
    const config = getCategoryConfig(update.type);
    elements.previewTypeBadge.textContent = update.type;
    elements.previewTypeBadge.style.backgroundColor = config.badgeBg;
    elements.previewTypeBadge.style.color = config.badgeColor;
    elements.previewTypeBadge.style.borderColor = config.badgeBorder;
    
    elements.previewDate.textContent = update.date;
    elements.previewSnippet.textContent = update.content_text;
    elements.tweetModal.style.setProperty('--preview-border-color', config.accentColor);
    
    // Generate Default Tweet Text
    // Target length is under 280:
    // "📢 BigQuery Feature (July 01, 2026):\n[snippet]\n\nMore: [link]\n\n#BigQuery #GoogleCloud"
    const staticTextLength = `📢 BigQuery ${update.type} (${update.date}):\n""\n\nMore: ${update.link}\n\n`.length;
    
    // Find active hashtags
    const hashtagsString = Array.from(state.activeHashtags).join(' ');
    const maxSnippetLength = 280 - staticTextLength - hashtagsString.length - 5; // offset buffer
    
    let snippet = update.content_text;
    if (snippet.length > maxSnippetLength) {
        snippet = snippet.substring(0, maxSnippetLength).trim() + "...";
    }
    
    const defaultTweet = `📢 BigQuery ${update.type} (${update.date}):\n"${snippet}"\n\nMore: ${update.link}\n\n${hashtagsString}`;
    
    elements.tweetTextarea.value = defaultTweet;
    
    // Update Hashtag Pills visual states
    const pills = elements.hashtagPills.querySelectorAll('.hashtag-pill');
    pills.forEach(pill => {
        const tag = pill.dataset.hashtag;
        if (state.activeHashtags.has(tag)) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
    
    updateCharCount();
    
    // Show Modal
    elements.tweetModal.classList.add('active');
    elements.tweetTextarea.focus();
}

function closeTweetModal() {
    elements.tweetModal.classList.remove('active');
    state.selectedUpdate = null;
}

function updateCharCount() {
    const text = elements.tweetTextarea.value;
    const len = text.length;
    elements.charCounter.textContent = len;
    
    const countWrapper = elements.charCounter.parentElement;
    
    if (len > 280) {
        countWrapper.classList.add('warning');
        elements.tweetSubmitBtn.disabled = true;
        elements.tweetSubmitBtn.style.opacity = '0.5';
        elements.tweetSubmitBtn.style.cursor = 'not-allowed';
    } else {
        countWrapper.classList.remove('warning');
        elements.tweetSubmitBtn.disabled = false;
        elements.tweetSubmitBtn.style.opacity = '1';
        elements.tweetSubmitBtn.style.cursor = 'pointer';
    }
}

// Handle toggling of hashtag pills
function handleHashtagClick(e) {
    const pill = e.target.closest('.hashtag-pill');
    if (!pill) return;
    
    const hashtag = pill.dataset.hashtag;
    let currentText = elements.tweetTextarea.value;
    
    if (state.activeHashtags.has(hashtag)) {
        // Remove hashtag from state
        state.activeHashtags.delete(hashtag);
        pill.classList.remove('active');
        
        // Remove from textarea
        // Match tag preceded or followed by spaces or newlines
        const regex = new RegExp(`\\s*${hashtag}\\s*`, 'g');
        currentText = currentText.replace(regex, ' ').trim();
        elements.tweetTextarea.value = currentText;
    } else {
        // Add hashtag to state
        state.activeHashtags.add(hashtag);
        pill.classList.add('active');
        
        // Append to textarea (before or after links, at the end is standard)
        elements.tweetTextarea.value = currentText + " " + hashtag;
    }
    
    // Normalize spaces and update counter
    elements.tweetTextarea.value = elements.tweetTextarea.value.replace(/\s+/g, ' ').trim();
    updateCharCount();
}

// Share Intent to Twitter/X
function submitTweet() {
    const tweetText = elements.tweetTextarea.value;
    if (tweetText.length > 280) {
        showToast("Error: Tweet exceeds the 280-character limit!");
        return;
    }
    
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(shareUrl, '_blank', 'width=550,height=420,toolbar=0,menubar=0,location=0,status=0,scrollbars=yes');
    
    closeTweetModal();
    showToast("Opened sharing intent for X / Twitter!");
}

// Copy to Clipboard Utility
function copyToClipboard(update, button) {
    const formatText = `📢 BigQuery Release Note (${update.date}) - ${update.type}:\n\n${update.content_text}\n\nDocumentation Link: ${update.link}`;
    
    navigator.clipboard.writeText(formatText).then(() => {
        const originalHtml = button.innerHTML;
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span style="color: #10b981;">Copied!</span>
        `;
        showToast("Copied release note to clipboard!");
        
        setTimeout(() => {
            button.innerHTML = originalHtml;
        }, 2000);
    }).catch(err => {
        console.error("Failed to copy text: ", err);
        showToast("Failed to copy update to clipboard.");
    });
}

// Export Filtered Updates to CSV
function exportToCSV() {
    if (state.filteredUpdates.length === 0) {
        showToast("No updates available to export.");
        return;
    }
    
    const headers = ["ID", "Date", "ISO Date", "Type", "Content (Plain Text)", "Link"];
    
    const escapeCsvValue = (val) => {
        if (val === null || val === undefined) return '';
        let formatted = String(val);
        formatted = formatted.replace(/"/g, '""');
        if (formatted.includes(',') || formatted.includes('"') || formatted.includes('\n') || formatted.includes('\r')) {
            formatted = `"${formatted}"`;
        }
        return formatted;
    };
    
    const rows = state.filteredUpdates.map(update => [
        update.id,
        update.date,
        update.iso_date,
        update.type,
        update.content_text,
        update.link
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsvValue).join(','))
    ].join('\r\n');
    
    try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        const dateStamp = new Date().toISOString().split('T')[0];
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes_${dateStamp}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Successfully exported ${state.filteredUpdates.length} updates to CSV!`);
    } catch (error) {
        console.error("CSV Export error:", error);
        showToast("Failed to export updates to CSV.");
    }
}

// Toast Notifications
let toastTimeout;
function showToast(message) {
    clearTimeout(toastTimeout);
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('active');
    
    toastTimeout = setTimeout(() => {
        elements.toast.classList.remove('active');
    }, 3500);
}

// Theme Toggle Utilities
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const moonIcon = elements.themeToggleBtn.querySelector('.moon-icon');
    const sunIcon = elements.themeToggleBtn.querySelector('.sun-icon');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    } else {
        document.body.classList.remove('light-theme');
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    const moonIcon = elements.themeToggleBtn.querySelector('.moon-icon');
    const sunIcon = elements.themeToggleBtn.querySelector('.sun-icon');
    
    if (isLight) {
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
        showToast("Switched to Light Theme");
    } else {
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
        showToast("Switched to Dark Theme");
    }
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchReleaseNotes(false); // Initial load uses cache
});
