// Global state
let watchlist = [];
let searchResults = [];
let currentSearchQuery = '';

// Configuration loaded from config.js
const CONFIG = window.MovieWatchlistConfig || {};



// Authentication
function checkAuth() {
    // Validate configuration is loaded
    if (!CONFIG.ACCESS_CODE || !CONFIG.TMDB_API_KEY) {
        showConfigError();
        return;
    }
    
    const isAuthenticated = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH) === 'true';
    if (isAuthenticated) {
        showApp();
    } else {
        showAuthModal();
    }
}

function showConfigError() {
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    
    // Update the modal to show config error
    const modal = document.querySelector('.modal-content');
    modal.innerHTML = `
        <h2>Configuration Error</h2>
        <p>The application configuration is missing. Please ensure the config.js file is properly set up with your API keys.</p>
        <button onclick="location.reload()">Reload Page</button>
    `;
}

function authenticate() {
    const accessCode = document.getElementById('access-code').value;
    const errorElement = document.getElementById('auth-error');
    
    // Check if configuration is properly loaded
    if (!CONFIG.ACCESS_CODE) {
        errorElement.textContent = 'Configuration not loaded. Please ensure config.js is generated.';
        return;
    }
    
    if (accessCode === CONFIG.ACCESS_CODE) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH, 'true');
        showApp();
    } else {
        errorElement.textContent = 'Invalid access code. Please try again.';
        document.getElementById('access-code').value = '';
    }
}

function logout() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH);
    showAuthModal();
}

function showAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('access-code').focus();
}

function showApp() {
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    loadWatchlist();
    updateWatchlistCount();
    loadRecommendedMovies();
}

// Tab management
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');
    
    if (tabName === 'watchlist') {
        renderWatchlist();
    }
}

// Load recommended movies on initial load
async function loadRecommendedMovies() {
    const loadingElement = document.getElementById('search-loading');
    const resultsElement = document.getElementById('search-results');
    
    loadingElement.classList.remove('hidden');
    resultsElement.innerHTML = '';
    
    try {
        // Get trending movies for the week
        const response = await fetch(
            `${CONFIG.TMDB_BASE_URL}/trending/movie/week?api_key=${CONFIG.TMDB_API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('Failed to load recommended movies');
        }
        
        const data = await response.json();
        searchResults = data.results || [];
        currentSearchQuery = 'trending'; // Set a flag to show we have initial results
        
        loadingElement.classList.add('hidden');
        renderSearchResults();
        
    } catch (error) {
        console.error('Failed to load recommendations:', error);
        loadingElement.classList.add('hidden');
        resultsElement.innerHTML = '<p class="empty-state">Failed to load recommended movies.</p>';
    }
}

// Movie search functionality
async function searchMovies() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
        // If search is cleared, show recommended movies again
        loadRecommendedMovies();
        return;
    }
    
    if (!CONFIG.TMDB_API_KEY || CONFIG.TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
        alert('API configuration not found. Please check your deployment setup.');
        return;
    }
    
    currentSearchQuery = query;
    const loadingElement = document.getElementById('search-loading');
    const resultsElement = document.getElementById('search-results');
    
    loadingElement.classList.remove('hidden');
    resultsElement.innerHTML = '';
    
    try {
        const response = await fetch(
            `${CONFIG.TMDB_BASE_URL}/search/movie?api_key=${CONFIG.TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`
        );
        
        if (!response.ok) {
            throw new Error('Failed to search movies');
        }
        
        const data = await response.json();
        searchResults = data.results || [];
        
        loadingElement.classList.add('hidden');
        renderSearchResults();
        
    } catch (error) {
        console.error('Search error:', error);
        loadingElement.classList.add('hidden');
        resultsElement.innerHTML = '<p class="error-message">Failed to search movies. Please check your API key and try again.</p>';
    }
}



// Render functions
function renderSearchResults() {
    const container = document.getElementById('search-results');
    
    if (searchResults.length === 0) {
        container.innerHTML = '<p class="empty-state">No movies found. Try a different search term.</p>';
        return;
    }
    
    container.innerHTML = '';
    searchResults.forEach(movie => {
        container.appendChild(createMovieCard(movie));
    });
}

function renderWatchlist() {
    const container = document.getElementById('watchlist-results');
    const emptyState = document.getElementById('watchlist-empty');
    
    if (watchlist.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    container.innerHTML = '';
    watchlist.forEach(movie => {
        container.appendChild(createMovieCard(movie));
    });
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    
    const posterUrl = movie.poster_path 
        ? `${CONFIG.TMDB_IMAGE_BASE}${movie.poster_path}`
        : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><rect width="500" height="750" fill="%232a2a2a"/><text x="250" y="375" text-anchor="middle" fill="%23666" font-size="24">No Poster</text></svg>';
    
    const isInWatchlist = watchlist.some(w => w.id === movie.id);
    const buttonText = isInWatchlist ? '✓' : '+';
    const buttonClass = isInWatchlist ? 'add-btn added' : 'add-btn';
    const buttonTitle = isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist';
    
    card.innerHTML = `
        <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" loading="lazy">
        <div class="movie-card-overlay">
            <div class="movie-title-overlay">${movie.title}</div>
        </div>
        <button class="${buttonClass}" title="${buttonTitle}">${buttonText}</button>
    `;
    
    // Add event listeners
    const addBtn = card.querySelector('.add-btn');
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isInWatchlist) {
            removeFromWatchlist(movie.id);
        } else {
            addToWatchlist(movie);
        }
    });
    
    card.addEventListener('click', () => openMovieOverlay(movie));
    
    return card;
}

// Watchlist management
function loadWatchlist() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.WATCHLIST);
    watchlist = saved ? JSON.parse(saved) : [];
}

function saveWatchlist() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
    updateWatchlistCount();
}

function addToWatchlist(movie) {
    if (watchlist.some(w => w.id === movie.id)) {
        return; // Already in watchlist
    }
    
    watchlist.unshift(movie); // Add to beginning
    saveWatchlist();
    
    // Always refresh both views to update button states
    renderWatchlist();
    if (currentSearchQuery) {
        renderSearchResults();
    }
    
    // Show success message
    showNotification(`"${movie.title}" added to our watchlist!`);
}

function removeFromWatchlist(movieId) {
    const removedMovie = watchlist.find(movie => movie.id === movieId);
    watchlist = watchlist.filter(movie => movie.id !== movieId);
    saveWatchlist();
    
    // Always refresh both views to update button states
    renderWatchlist();
    if (currentSearchQuery) {
        renderSearchResults();
    }
    
    // Show notification
    if (removedMovie) {
        showNotification(`"${removedMovie.title}" removed from watchlist`);
    }
}

function clearWatchlist() {
    if (watchlist.length === 0) return;
    
    if (confirm('Are you sure you want to clear our entire watchlist? This cannot be undone.')) {
        watchlist = [];
        saveWatchlist();
        renderWatchlist();
        
        // Refresh search results if visible to update button states
        if (currentSearchQuery) {
            renderSearchResults();
        }
        
        showNotification('Our watchlist cleared!');
    }
}

function updateWatchlistCount() {
    document.getElementById('watchlist-count').textContent = watchlist.length;
}

// Movie overlay functions
function openMovieOverlay(movie) {
    const overlay = document.getElementById('movie-overlay');
    const poster = document.getElementById('overlay-poster');
    const title = document.getElementById('overlay-title');
    const year = document.getElementById('overlay-year');
    const overview = document.getElementById('overlay-overview');
    const addBtn = document.getElementById('overlay-add-btn');
    
    const posterUrl = movie.poster_path 
        ? `${CONFIG.TMDB_IMAGE_BASE}${movie.poster_path}`
        : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><rect width="500" height="750" fill="%232a2a2a"/><text x="250" y="375" text-anchor="middle" fill="%23666" font-size="24">No Poster</text></svg>';
    
    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
    const isInWatchlist = watchlist.some(w => w.id === movie.id);
    
    poster.src = posterUrl;
    poster.alt = movie.title;
    title.textContent = movie.title;
    year.textContent = releaseYear;
    overview.textContent = movie.overview || 'No description available.';
    
    if (isInWatchlist) {
        addBtn.innerHTML = '<span>✓</span> In Our Watchlist';
        addBtn.style.background = '#46d369';
        addBtn.onclick = () => {
            removeFromWatchlist(movie.id);
            closeMovieOverlay();
        };
    } else {
        addBtn.innerHTML = '<span>+</span> Add to Our Watchlist';
        addBtn.style.background = '#e50914';
        addBtn.onclick = () => {
            addToWatchlist(movie);
            closeMovieOverlay();
        };
    }
    
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeMovieOverlay() {
    const overlay = document.getElementById('movie-overlay');
    overlay.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Utility functions
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1001;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Handle real-time search with debounce
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchMovies();
        }, 300);
    });
    
    // Handle Enter key in search input
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            searchMovies();
        }
    });
    
    // Handle Enter key in access code input
    document.getElementById('access-code').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            authenticate();
        }
    });
    
    // Handle escape key to close overlay
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMovieOverlay();
        }
    });
});

// Prevent global functions from being overwritten
window.authenticate = authenticate;
window.logout = logout;
window.showTab = showTab;
window.searchMovies = searchMovies;
window.addToWatchlist = addToWatchlist;
window.removeFromWatchlist = removeFromWatchlist;
window.clearWatchlist = clearWatchlist;
window.openMovieOverlay = openMovieOverlay;
window.closeMovieOverlay = closeMovieOverlay;