// API Configuration
const API_BASE_URL = 'https://urlshortnerr-8rh4.onrender.com/api';

// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('authToken');
        this.loadCurrentSession();
    }

    async register(email, password) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            this.currentUser = data.user;
            this.token = data.token;
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('userEmail', data.user.email);
            return data.user;
        } catch (error) {
            throw error;
        }
    }

    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            this.currentUser = data.user;
            this.token = data.token;
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('userEmail', data.user.email);
            return data.user;
        } catch (error) {
            throw error;
        }
    }

    async loadCurrentSession() {
        if (this.token) {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/verify`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                    }
                });

                const data = await response.json();

                if (data.valid && data.user) {
                    this.currentUser = data.user;
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Failed to verify session:', error);
                this.logout();
            }
        }
    }

    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userEmail');
    }

    isLoggedIn() {
        return this.currentUser !== null && this.token !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getToken() {
        return this.token;
    }
}

// URL Shortener Class
class URLShortener {
    constructor() {
        this.base62Alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        this.urlValidationRegex = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;
        
        // Authentication
        this.auth = new AuthManager();
        
        // Storage
        this.urlDatabase = new Map(); // shortCode -> {originalUrl, clickCount, createdAt, id}
        this.nextId = 1;
        this.currentFilter = '';
        
        // Initialize
        this.initializeElements();
        this.attachEventListeners();
        this.attachAuthEventListeners();
        this.updateUIBasedOnAuth();
        this.handleInitialRoute();
    }

    async initialize() {
        // Load user URLs after auth is checked
        await this.loadUserUrls();
    }

    initializeElements() {
        // Auth elements
        this.authModal = document.getElementById('authModal');
        this.authForm = document.getElementById('authForm');
        this.authEmail = document.getElementById('authEmail');
        this.authPassword = document.getElementById('authPassword');
        this.authError = document.getElementById('authError');
        this.authErrorText = this.authError?.querySelector('.error-text');
        this.authTitle = document.getElementById('authTitle');
        this.authSubmitBtn = document.getElementById('authSubmitBtn');
        this.toggleAuthMode = document.getElementById('toggleAuthMode');
        this.closeAuthModal = document.getElementById('closeAuthModal');
        this.loginBtn = document.getElementById('loginBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.headerAuth = document.getElementById('headerAuth');
        this.headerUser = document.getElementById('headerUser');
        this.userEmailDisplay = document.getElementById('userEmailDisplay');
        this.mainSection = document.getElementById('mainSection');
        
        // Form elements
        this.urlForm = document.getElementById('urlForm');
        this.urlInput = document.getElementById('urlInput');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorText = document.querySelector('.error-text');
        
        // Result elements
        this.resultSection = document.getElementById('resultSection');
        this.shortenedUrlDisplay = document.getElementById('shortenedUrlDisplay');
        this.copyButton = document.getElementById('copyButton');
        this.testButton = document.getElementById('testButton');
        this.copySuccess = document.getElementById('copySuccess');
        
        // History elements
        this.historyEmpty = document.getElementById('historyEmpty');
        this.historyTable = document.getElementById('historyTable');
        this.historyList = document.getElementById('historyList');
        this.searchInput = document.getElementById('searchInput');
        
        // Stats elements
        this.totalUrls = document.getElementById('totalUrls');
        this.totalClicks = document.getElementById('totalClicks');
    }

    attachAuthEventListeners() {
        // Login button
        this.loginBtn.addEventListener('click', () => {
            this.isRegisterMode = false;
            this.updateAuthModalUI();
            this.authModal.classList.remove('hidden');
        });

        // Logout button
        this.logoutBtn.addEventListener('click', () => {
            this.auth.logout();
            this.urlDatabase.clear();
            this.nextId = 1;
            this.updateUIBasedOnAuth();
            this.renderHistory();
            this.updateStats();
            this.authEmail.value = '';
            this.authPassword.value = '';
        });

        // Close modal button
        this.closeAuthModal.addEventListener('click', () => {
            this.authModal.classList.add('hidden');
            this.authEmail.value = '';
            this.authPassword.value = '';
            this.authError.classList.add('hidden');
        });

        // Close modal on background click
        this.authModal.addEventListener('click', (e) => {
            if (e.target === this.authModal) {
                this.authModal.classList.add('hidden');
                this.authEmail.value = '';
                this.authPassword.value = '';
                this.authError.classList.add('hidden');
            }
        });

        // Toggle between login and register
        this.toggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault();
            this.isRegisterMode = !this.isRegisterMode;
            this.updateAuthModalUI();
        });

        // Auth form submission
        this.authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAuthSubmit();
        });
    }

    updateAuthModalUI() {
        const isRegister = this.isRegisterMode;
        this.authTitle.textContent = isRegister ? 'Register' : 'Login';
        this.authSubmitBtn.textContent = isRegister ? 'Register' : 'Login';
        
        const toggleText = isRegister 
            ? 'Already have an account? <button type="button" id="toggleAuthMode" class="btn-link">Login</button>'
            : 'Don\'t have an account? <button type="button" id="toggleAuthMode" class="btn-link">Register</button>';
        
        document.querySelector('.auth-toggle p').innerHTML = toggleText;
        this.toggleAuthMode = document.getElementById('toggleAuthMode');
        this.toggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault();
            this.isRegisterMode = !this.isRegisterMode;
            this.updateAuthModalUI();
        });
    }

    handleAuthSubmit() {
        const email = this.authEmail.value.trim();
        const password = this.authPassword.value;

        try {
            this.authError.classList.add('hidden');

            if (this.isRegisterMode) {
                this.registerUser(email, password);
            } else {
                this.loginUser(email, password);
            }

        } catch (error) {
            this.showAuthError(error.message);
        }
    }

    async registerUser(email, password) {
        try {
            await this.auth.register(email, password);

            // Success
            this.authModal.classList.add('hidden');
            this.authEmail.value = '';
            this.authPassword.value = '';
            this.updateUIBasedOnAuth();
            this.loadUserUrls();
            this.renderHistory();
            this.updateStats();

        } catch (error) {
            this.showAuthError(error.message);
        }
    }

    async loginUser(email, password) {
        try {
            await this.auth.login(email, password);

            // Success
            this.authModal.classList.add('hidden');
            this.authEmail.value = '';
            this.authPassword.value = '';
            this.updateUIBasedOnAuth();
            this.loadUserUrls();
            this.renderHistory();
            this.updateStats();

        } catch (error) {
            this.showAuthError(error.message);
        }
    }

    showAuthError(message) {
        this.authErrorText.textContent = message;
        this.authError.classList.remove('hidden');
    }

    updateUIBasedOnAuth() {
        if (this.auth.isLoggedIn()) {
            const user = this.auth.getCurrentUser();
            this.headerAuth.style.display = 'none';
            this.headerUser.style.display = 'flex';
            this.userEmailDisplay.textContent = user.email;
            this.mainSection.style.display = '';
            this.isRegisterMode = false;
        } else {
            this.headerAuth.style.display = 'flex';
            this.headerUser.style.display = 'none';
            this.mainSection.style.display = 'none';
            this.urlDatabase.clear();
            this.errorMessage.classList.add('hidden');
        }
    }

    async loadUserUrls() {
        if (this.auth.isLoggedIn()) {
            try {
                const response = await fetch(`${API_BASE_URL}/urls`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.auth.getToken()}`,
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to load URLs');
                }

                const urls = await response.json();
                this.urlDatabase.clear();
                
                // Reconstruct the database from API response
                let maxId = 0;
                for (const urlData of urls) {
                    this.urlDatabase.set(urlData.short_code, {
                        originalUrl: urlData.original_url,
                        clickCount: urlData.click_count,
                        createdAt: new Date(urlData.created_at),
                        id: urlData.id
                    });
                    if (urlData.id > maxId) {
                        maxId = urlData.id;
                    }
                }
                this.nextId = maxId + 1;
            } catch (error) {
                console.error('Error loading URLs:', error);
            }
        }
    }

    attachEventListeners() {
        // Form submission
        this.urlForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.auth.isLoggedIn()) {
                this.shortenURL();
            } else {
                this.showError('Please login first to shorten URLs');
            }
        });

        // Copy button in results section
        this.copyButton.addEventListener('click', () => {
            this.copyToClipboard(this.shortenedUrlDisplay.value);
        });

        // Test button in results section
        this.testButton.addEventListener('click', () => {
            const shortUrl = this.shortenedUrlDisplay.value;
            const shortCode = this.extractShortCode(shortUrl);
            this.redirectToOriginal(shortCode, true);
        });

        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            this.currentFilter = e.target.value.toLowerCase();
            this.renderHistory();
        });

        // Handle hash changes for direct short URL access
        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
    }

    // Base62 encoding
    encodeBase62(num) {
        if (num === 0) return this.base62Alphabet[0];
        
        let encoded = '';
        while (num > 0) {
            encoded = this.base62Alphabet[num % 62] + encoded;
            num = Math.floor(num / 62);
        }
        return encoded;
    }

    // URL validation
    isValidURL(url) {
        try {
            new URL(url);
            return this.urlValidationRegex.test(url);
        } catch {
            return false;
        }
    }

    normalizeURL(url) {
        // Auto-prepend https:// if protocol is missing
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        return url;
    }

    validateAndNormalizeURL(url) {
        if (!url.trim()) {
            throw new Error('Please enter a URL to shorten');
        }

        const normalizedUrl = this.normalizeURL(url.trim());
        
        if (!this.isValidURL(normalizedUrl)) {
            throw new Error('Please enter a valid URL (e.g., https://example.com)');
        }

        return normalizedUrl;
    }

    // URL shortening
    async shortenURL() {
        const submitButton = this.urlForm.querySelector('button[type="submit"]');
        
        try {
            // Check if user is logged in
            if (!this.auth.isLoggedIn()) {
                this.showError('Please login first to shorten URLs');
                return;
            }

            // Clear previous errors
            this.hideError();
            
            // Get and validate URL
            const inputValue = this.urlInput.value;
            const originalUrl = this.validateAndNormalizeURL(inputValue);
            
            // Show loading state
            submitButton.classList.add('loading');
            submitButton.disabled = true;
            
            // Generate short code
            const id = this.nextId++;
            const shortCode = this.encodeBase62(id);
            
            // Send to API
            const response = await fetch(`${API_BASE_URL}/urls/shorten`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.auth.getToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ originalUrl, shortCode })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to shorten URL');
            }

            const shortUrl = `${window.location.origin}/#${shortCode}`;
            
            // Store in local database
            this.urlDatabase.set(shortCode, {
                originalUrl,
                clickCount: 0,
                createdAt: new Date(),
                id: data.id
            });
            
            // Update UI with a small delay for better UX
            setTimeout(() => {
                this.displayResult(shortUrl, originalUrl);
                this.updateStats();
                this.renderHistory();
                this.urlInput.value = ''; // Clear input
                submitButton.classList.remove('loading');
                submitButton.disabled = false;
            }, 300);
            
        } catch (error) {
            this.showError(error.message);
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
        }
    }

    // Error handling
    showError(message) {
        this.errorText.textContent = message;
        this.errorMessage.classList.remove('hidden');
        this.resultSection.classList.add('hidden');
    }

    hideError() {
        this.errorMessage.classList.add('hidden');
    }

    // Result display
    displayResult(shortUrl, originalUrl) {
        this.shortenedUrlDisplay.value = shortUrl;
        this.resultSection.classList.remove('hidden');
        
        // Scroll to results
        this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Copy functionality
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            
            this.showCopySuccess();
            return true;
        } catch (error) {
            console.error('Copy failed:', error);
            this.showCopySuccess('Failed to copy');
            return false;
        }
    }

    showCopySuccess(message = '✓ Copied to clipboard!') {
        const successElement = this.copySuccess;
        const statusSpan = successElement.querySelector('.status');
        statusSpan.textContent = message;
        
        successElement.classList.remove('hidden');
        successElement.classList.add('show');
        
        setTimeout(() => {
            successElement.classList.remove('show');
            setTimeout(() => {
                successElement.classList.add('hidden');
            }, 300);
        }, 2000);
    }

    // URL redirection
    extractShortCode(url) {
        if (url.includes('#')) {
            return url.split('#')[1];
        }
        return url.split('/').pop();
    }

    async redirectToOriginal(shortCode, isTest = false) {
        const urlData = this.urlDatabase.get(shortCode);
        
        if (urlData) {
            // Increment click count
            urlData.clickCount++;
            
            // Update click count on server
            try {
                await fetch(`${API_BASE_URL}/urls/${shortCode}/click`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
            } catch (error) {
                console.error('Failed to update click count:', error);
            }
            
            this.updateStats();
            this.renderHistory();
            
            // Open URL in new tab
            try {
                const newWindow = window.open(urlData.originalUrl, '_blank', 'noopener,noreferrer');
                if (!newWindow) {
                    // Fallback if popup blocker prevents opening
                    alert(`Redirecting to: ${urlData.originalUrl}`);
                    window.location.href = urlData.originalUrl;
                }
            } catch (error) {
                console.error('Failed to open URL:', error);
                alert(`Please visit: ${urlData.originalUrl}`);
            }
        } else {
            alert('Short URL not found. It may have been created in a different session.');
        }
    }

    // Handle hash changes for direct short URL access
    handleHashChange() {
        const hash = window.location.hash;
        if (hash && hash.length > 1) {
            const shortCode = hash.substring(1);
            // Only redirect if the short code exists in our database
            if (this.urlDatabase.has(shortCode)) {
                this.redirectToOriginal(shortCode);
            }
        }
    }

    // Handle initial route (if someone visits a short URL directly)
    handleInitialRoute() {
        const hash = window.location.hash;
        if (hash && hash.length > 1) {
            const shortCode = hash.substring(1);
            // Wait a moment for the app to fully initialize
            setTimeout(() => {
                if (this.urlDatabase.has(shortCode)) {
                    this.redirectToOriginal(shortCode);
                }
            }, 100);
        }
    }

    // Statistics
    updateStats() {
        const totalUrls = this.urlDatabase.size;
        const totalClicks = Array.from(this.urlDatabase.values())
            .reduce((sum, data) => sum + data.clickCount, 0);
        
        this.totalUrls.textContent = totalUrls;
        this.totalClicks.textContent = totalClicks;
    }

    // History management
    renderHistory() {
        const urls = Array.from(this.urlDatabase.entries());
        
        if (urls.length === 0) {
            this.historyEmpty.classList.remove('hidden');
            this.historyTable.classList.add('hidden');
            return;
        }
        
        this.historyEmpty.classList.add('hidden');
        this.historyTable.classList.remove('hidden');
        
        // Filter URLs based on search
        const filteredUrls = urls.filter(([shortCode, data]) => {
            if (!this.currentFilter) return true;
            
            const searchTerm = this.currentFilter;
            return (
                data.originalUrl.toLowerCase().includes(searchTerm) ||
                shortCode.toLowerCase().includes(searchTerm)
            );
        });
        
        // Sort by creation date (newest first)
        filteredUrls.sort(([, a], [, b]) => b.createdAt - a.createdAt);
        
        // Render rows
        this.historyList.innerHTML = filteredUrls
            .map(([shortCode, data]) => this.createHistoryRow(shortCode, data))
            .join('');
    }

    createHistoryRow(shortCode, data) {
        const shortUrl = `${window.location.origin}/#${shortCode}`;
        const truncatedUrl = this.truncateUrl(data.originalUrl, 50);
        
        return `
            <div class="table-row">
                <div class="table-col table-col--original" data-label="Original URL">
                    <a href="${data.originalUrl}" 
                       class="original-url" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       title="${data.originalUrl}">
                        ${truncatedUrl}
                    </a>
                </div>
                <div class="table-col table-col--short" data-label="Short Code">
                    <span class="short-code">${shortCode}</span>
                </div>
                <div class="table-col table-col--clicks" data-label="Clicks">
                    <span class="click-count">${data.clickCount}</span>
                </div>
                <div class="table-col table-col--actions" data-label="Actions">
                    <div class="table-actions">
                        <button class="btn-icon btn-icon--copy" 
                                data-action="copy" 
                                data-url="${shortUrl}"
                                title="Copy shortened URL">
                            📋
                        </button>
                        <button class="btn-icon btn-icon--test" 
                                data-action="test" 
                                data-short-code="${shortCode}"
                                title="Test link">
                            🔗
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    truncateUrl(url, maxLength) {
        if (url.length <= maxLength) return url;
        
        // Try to keep the domain visible
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const path = urlObj.pathname + urlObj.search;
            
            if (domain.length + 10 >= maxLength) {
                return domain.substring(0, maxLength - 3) + '...';
            }
            
            const availableLength = maxLength - domain.length - 6; // 6 for "https://"
            if (path.length > availableLength) {
                return `https://${domain}${path.substring(0, availableLength)}...`;
            }
            
            return url;
        } catch {
            return url.substring(0, maxLength - 3) + '...';
        }
    }

    // Handle button clicks in history table
    handleHistoryAction(button) {
        const action = button.getAttribute('data-action');
        
        if (action === 'copy') {
            const url = button.getAttribute('data-url');
            this.copyToClipboard(url);
        } else if (action === 'test') {
            const shortCode = button.getAttribute('data-short-code');
            this.redirectToOriginal(shortCode, true);
        }
    }
}

// Initialize the application
let app;

document.addEventListener('DOMContentLoaded', async () => {
    app = new URLShortener();
    app.isRegisterMode = false;
    
    // Initialize async operations
    await app.initialize();
    
    // Handle history table button clicks using event delegation
    document.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action]');
        if (button) {
            e.preventDefault();
            app.handleHistoryAction(button);
        }
    });
});

// Prevent form submission when pressing Enter in search
document.addEventListener('keydown', (e) => {
    if (e.target.matches('#searchInput') && e.key === 'Enter') {
        e.preventDefault();
    }
});

// Add some sample URLs for testing (for development purposes)
window.addSampleUrls = async function() {
    const sampleUrls = [
        'https://www.google.com',
        'https://github.com/microsoft/vscode',
        'https://stackoverflow.com/questions/742013/how-do-i-create-a-url-shortener',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    ];
    
    if (!app) return;
    
    for (const url of sampleUrls) {
        app.urlInput.value = url;
        await app.shortenURL();
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 600));
    }
};

// Export for global access
window.app = app;