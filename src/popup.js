class PopupManager {
    constructor() {
        this.apiKey = null;
        this.isScanning = false;
        this.scanHistory = [];
        this.init();
    }

    async init() {
        await this.loadStoredData();
        this.setupEventListeners();
        this.updateUI();
        this.loadScanHistory();
    }

    async loadStoredData() {
        try {
            const result = await chrome.storage.sync.get(['geminiApiKey', 'autoScanEnabled', 'scanHistory']);
            this.apiKey = result.geminiApiKey || null;
            
            document.getElementById('auto-scan-toggle').checked = result.autoScanEnabled || false;
            this.scanHistory = result.scanHistory || [];
        } catch (error) {
            console.error('Error loading stored data:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('scan-button').addEventListener('click', () => this.scanCurrentPage());
        document.getElementById('auto-scan-toggle').addEventListener('change', (e) => this.toggleAutoScan(e.target.checked));
        
        // Footer button event listeners
        document.getElementById('settings-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSettings();
        });
        document.getElementById('help-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showHelp();
        });
        document.getElementById('about-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAbout();
        });
    }

    async saveApiKey() {
        const apiKeyInput = document.getElementById('api-key');
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey || apiKey === '••••••••••••••••') {
            this.showNotification('Please enter a valid API key', 'error', 4000);
            return;
        }

        const validation = this.validateApiKey(apiKey);
        if (!validation.valid) {
            this.showNotification(validation.error, 'error', 4000);
            return;
        }

        try {
            const testResult = await this.testApiKey(apiKey);
            if (!testResult.valid) {
                this.showNotification(testResult.error, 'error', 4000);
                return;
            }

            await chrome.storage.sync.set({ geminiApiKey: apiKey });
            this.apiKey = apiKey;
            apiKeyInput.value = '••••••••••••••••';
            this.updateUI();
            this.showNotification('API key saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving API key:', error);
            this.showNotification('Failed to save API key', 'error', 4000);
        }
    }

    async toggleAutoScan(enabled) {
        try {
            await chrome.storage.sync.set({ autoScanEnabled: enabled });
            chrome.runtime.sendMessage({ action: 'toggleAutoScan', enabled: enabled });
            this.showNotification(enabled ? 'Auto-scan enabled' : 'Auto-scan disabled', 'success');
        } catch (error) {
            console.error('Error toggling auto-scan:', error);
            this.showNotification('Failed to update auto-scan setting', 'error', 4000);
        }
    }

    async scanCurrentPage() {
        if (this.isScanning) return;

        if (!this.apiKey) {
            this.showNotification('Please set your Gemini API key first', 'error', 4000);
            return;
        }

        this.isScanning = true;
        this.showLoading(true);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            if (!this.isScannableUrl(tab.url)) {
                throw new Error('Cannot scan this type of page');
            }

            const response = await chrome.runtime.sendMessage({
                action: 'scanPage',
                tabId: tab.id,
                url: tab.url,
                scanSource: 'popup'
            });

            if (response.error) {
                throw new Error(response.error);
            }

            this.displayResults(response.result);
            this.saveToHistory(response.result);

        } catch (error) {
            console.error('Error scanning page:', error);
            
            let errorMessage = 'Scan failed';
            if (error.message.includes('Cannot access')) {
                errorMessage = 'Cannot scan this type of page (chrome://, extensions, etc.)';
            } else if (error.message.includes('Failed to extract')) {
                errorMessage = 'Unable to read page content. Try refreshing the page.';
            } else if (error.message.includes('API')) {
                errorMessage = 'API error. Please check your API key.';
            } else {
                errorMessage = `Scan failed: ${error.message}`;
            }
            
            this.showNotification(errorMessage, 'error', 5000);
        } finally {
            this.isScanning = false;
            this.showLoading(false);
        }
    }

    displayResults(result) {
        const resultsSection = document.getElementById('results-section');
        const resultCard = document.getElementById('result-card');
        const verdict = document.getElementById('verdict');
        const confidence = document.getElementById('confidence');
        const analyzedUrl = document.getElementById('analyzed-url');
        const reasoningList = document.getElementById('reasoning-list');
        const warningIndicator = document.getElementById('warning-indicator');
        const logoIcon = document.getElementById('logo-icon');

        let resultClass = result.verdict.toLowerCase();
        
        if (result.verdict.toLowerCase() === 'legitimate' && result.confidence < 70) {
            resultClass = 'uncertain';
        }

        verdict.textContent = result.verdict;
        verdict.className = `verdict ${resultClass}`;
        resultCard.className = `result-card ${resultClass}`;
        
        const confidenceElement = confidence;
        confidenceElement.textContent = `${Math.round(result.confidence)}%`;
        
        if (result.confidence >= 80) {
            confidenceElement.style.color = '#4CAF50';
        } else if (result.confidence >= 60) {
            confidenceElement.style.color = '#ff9800';
        } else {
            confidenceElement.style.color = '#f44336';
        }
        
        this.updateLogoBackground(logoIcon, result);
        this.updateToolbarIcon(result);
        
        if (result.verdict.toLowerCase() === 'phishing' && result.confidence >= 80) {
            this.showNotification('High-confidence phishing detected! Check the banner on the webpage for details.', 'error', 3000);
        }
        
        if (result.verdict.toLowerCase() === 'legitimate' && result.confidence < 70) {
            warningIndicator.classList.remove('hidden');
        } else {
            warningIndicator.classList.add('hidden');
        }
        
        analyzedUrl.textContent = result.url;
        
        reasoningList.innerHTML = '';
        result.reasoning.forEach(reason => {
            const li = document.createElement('li');
            li.textContent = reason;
            reasoningList.appendChild(li);
        });

        resultsSection.style.display = 'block';
    }

    async saveToHistory(result) {
        const historyItem = {
            url: result.url,
            domain: new URL(result.url).hostname,
            verdict: result.verdict,
            confidence: result.confidence,
            timestamp: Date.now()
        };

        this.scanHistory.unshift(historyItem);
        this.scanHistory = this.scanHistory.slice(0, 10);

        try {
            await chrome.storage.sync.set({ scanHistory: this.scanHistory });
            this.updateHistoryUI();
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }

    loadScanHistory() {
        this.updateHistoryUI();
    }

    updateHistoryUI() {
        const historyContainer = document.getElementById('scan-history');
        
        if (this.scanHistory.length === 0) {
            historyContainer.innerHTML = '<p class="empty-state">No recent scans</p>';
            return;
        }

        historyContainer.innerHTML = '';
        
        this.scanHistory.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const domain = document.createElement('span');
            domain.className = 'domain';
            domain.textContent = item.domain;
            
            const result = document.createElement('span');
            result.className = `result ${item.verdict.toLowerCase()}`;
            result.textContent = item.verdict;
            
            historyItem.appendChild(domain);
            historyItem.appendChild(result);
            historyContainer.appendChild(historyItem);
        });
    }

    updateUI() {
        const scanButton = document.getElementById('scan-button');
        const statusText = document.getElementById('status-text');
        const statusDot = document.getElementById('status-dot');

        this.resetLogoBackground();

        if (this.apiKey) {
            scanButton.disabled = false;
            statusText.textContent = 'Ready to scan';
            statusDot.style.backgroundColor = '#4CAF50';
        } else {
            scanButton.disabled = true;
            statusText.textContent = 'API key required - Configure in Settings';
            statusDot.style.backgroundColor = '#ff9800';
        }
    }

    resetLogoBackground() {
        const logoIcon = document.getElementById('logo-icon');
        if (logoIcon) {
            logoIcon.classList.remove('logo-safe', 'logo-warning', 'logo-danger', 'logo-neutral');
            logoIcon.classList.add('logo-neutral');
        }
        this.resetToolbarIcon();
    }

    resetToolbarIcon() {
        try {
            chrome.action.setBadgeText({ text: '' });
            chrome.action.setTitle({ title: 'PhishGuard AI - Click to scan current page' });
        } catch (error) {
            console.error('Error resetting toolbar icon:', error);
        }
    }

    showLoading(show) {
        const loadingSection = document.getElementById('loading-section');
        const scanButton = document.getElementById('scan-button');
        
        if (show) {
            loadingSection.style.display = 'block';
            scanButton.disabled = true;
            scanButton.textContent = 'Analyzing...';
        } else {
            loadingSection.style.display = 'none';
            scanButton.disabled = !this.apiKey;
            scanButton.innerHTML = '<span class="button-icon">⚡</span>Analyze Page';
        }
    }

    updateLogoBackground(logoIcon, result) {
        logoIcon.classList.remove('logo-safe', 'logo-warning', 'logo-danger', 'logo-neutral');
        
        const verdict = result.verdict.toLowerCase();
        const confidence = result.confidence;
        
        if (verdict === 'phishing') {
            logoIcon.classList.add('logo-danger');
        } else if (verdict === 'legitimate') {
            if (confidence > 70) {
                logoIcon.classList.add('logo-safe');
            } else {
                logoIcon.classList.add('logo-warning');
            }
        } else {
            logoIcon.classList.add('logo-neutral');
        }
    }

    updateToolbarIcon(result) {
        const verdict = result.verdict.toLowerCase();
        const confidence = result.confidence;

        let badgeText = '';
        let badgeColor = '';
        let title = '';

        if (verdict === 'phishing') {
            if (confidence > 80) {
                badgeText = '!';
                title = `⚠ HIGH RISK: Phishing detected (${Math.round(confidence)}% confidence)`;
            } else {
                badgeText = '⚠';
                title = `⚠ RISK: Potential phishing (${Math.round(confidence)}% confidence)`;
            }
        } else if (verdict === 'legitimate') {
            if (confidence > 70) {
                badgeText = '✓';
                title = `✓ SAFE: Website is legitimate (${Math.round(confidence)}% confidence)`;
            } else {
                badgeText = '⚠';
                title = `⚠ CAUTION: Legitimate but low confidence (${Math.round(confidence)}%)`;
            }
        } else {
            badgeText = '?';
            badgeColor = '#757575';
            title = 'PhishGuard AI - Scan result unknown';
        }

        try {
            chrome.action.setBadgeText({ text: badgeText });
            chrome.action.setBadgeBackgroundColor({ color: badgeColor });
            chrome.action.setTitle({ title: title });
        } catch (error) {
            console.error('Error updating toolbar icon:', error);
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        const existingNotification = document.querySelector('.popup-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `popup-notification ${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close">✕</button>
        `;

        // Add close button event listener
        const closeButton = notification.querySelector('.notification-close');
        const closeNotification = () => {
            if (notification.parentElement) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        };
        closeButton.addEventListener('click', closeNotification);

        // Append to document body to avoid z-index stacking context issues
        document.body.appendChild(notification);

        // Trigger slide-in animation
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Auto-hide after duration
        setTimeout(() => {
            closeNotification();
        }, duration);
    }

    getNotificationIcon(type) {
        const icons = {
            'info': 'ℹ',
            'success': '✓',
            'warning': '⚠',
            'error': '!'
        };
        return icons[type] || icons['info'];
    }

    validateApiKey(apiKey) {
        if (!apiKey || apiKey.length < 30) {
            return { valid: false, error: 'API key too short' };
        }
        
        if (!apiKey.startsWith('AIza')) {
            return { valid: false, error: 'Invalid API key format' };
        }
        
        if (apiKey.includes(' ') || apiKey.includes('\n')) {
            return { valid: false, error: 'API key contains invalid characters' };
        }
        
        return { valid: true };
    }

    async testApiKey(apiKey) {
        const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        
        for (const model of models) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: 'Say "API test successful" if you can read this.' }]
                        }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 50
                        }
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    console.log(`✅ API key works with model: ${model}`);
                    return { valid: true, model: model, response: content };
                } else {
                    const errorData = await response.json();
                    console.log(`❌ Model ${model} failed:`, errorData.error?.message);
                    continue;
                }
            } catch (error) {
                console.log(`❌ Model ${model} error:`, error.message);
                continue;
            }
        }
        
        return { 
            valid: false, 
            error: 'API key failed with all available models' 
        };
    }

    isScannableUrl(url) {
        if (!url || typeof url !== 'string') return false;

        const unscannable = [
            'chrome://', 'chrome-extension://', 'moz-extension://', 'safari-extension://',
            'edge-extension://', 'about:', 'file://', 'data:', 'javascript:', 'mailto:',
            'tel:', 'ftp://', 'chrome-search://', 'chrome-devtools://'
        ];

        const urlLower = url.toLowerCase();
        return !unscannable.some(scheme => urlLower.startsWith(scheme));
    }

    showSettings() {
        // Create settings modal
        this.createModal('Settings', `
            <div class="settings-content">
                <h4>API Configuration</h4>
                <div class="setting-item">
                    <label for="modal-api-key">Gemini API Key:</label>
                    <div class="input-group">
                        <input type="password" id="modal-api-key" placeholder="Enter your API key" value="${this.apiKey ? '••••••••••••••••' : ''}">
                        <button id="save-api-key-btn" class="primary-button">Save</button>
                    </div>
                    <div id="api-status" class="api-status">${this.apiKey ? '<span class="status-success">✓ API key configured</span>' : '<span class="status-error">⚠ API key not configured</span>'}</div>
                    <p class="help-text">Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></p>
                </div>

                <h4>Scanning Preferences</h4>
                <div class="setting-item toggle-row">
                    <label class="toggle-switch">
                        <input type="checkbox" id="modal-auto-scan" ${document.getElementById('auto-scan-toggle').checked ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                    <span>Auto-scan suspicious pages</span>
                </div>
                
                <div class="setting-item">
                    <label for="confidence-threshold">Minimum confidence threshold:</label>
                    <select id="confidence-threshold">
                        <option value="60">60% - More alerts</option>
                        <option value="70" selected>70% - Balanced</option>
                        <option value="80">80% - Fewer alerts</option>
                    </select>
                </div>

                <h4>Data & Privacy</h4>
                <div class="setting-item">
                    <button id="clear-history-btn" class="secondary-button">Clear Scan History</button>
                    <p class="help-text">Remove all stored scan results</p>
                </div>
            </div>
        `, () => {
            // Modal close callback - save settings only if changed
            const modalAutoScan = document.getElementById('modal-auto-scan').checked;
            const currentAutoScan = document.getElementById('auto-scan-toggle').checked;
            
            if (modalAutoScan !== currentAutoScan) {
                document.getElementById('auto-scan-toggle').checked = modalAutoScan;
                this.toggleAutoScan(modalAutoScan);
            }
        });

        // Add settings-specific event listeners
        document.getElementById('clear-history-btn').addEventListener('click', () => {
            this.clearScanHistory();
        });

        // Add API key save functionality
        document.getElementById('save-api-key-btn').addEventListener('click', async () => {
            const apiKeyInput = document.getElementById('modal-api-key');
            const apiKey = apiKeyInput.value.trim();

            if (!apiKey || apiKey === '••••••••••••••••') {
                this.showNotification('Please enter a valid API key', 'error', 4000);
                return;
            }

            const validation = this.validateApiKey(apiKey);
            if (!validation.valid) {
                this.showNotification(validation.error, 'error', 4000);
                return;
            }

            try {
                const testResult = await this.testApiKey(apiKey);
                if (!testResult.valid) {
                    this.showNotification(testResult.error, 'error', 4000);
                    return;
                }

                await chrome.storage.sync.set({ geminiApiKey: apiKey });
                this.apiKey = apiKey;
                apiKeyInput.value = '••••••••••••••••';
                
                // Update API status indicator
                document.getElementById('api-status').innerHTML = '<span class="status-success">✓ API key configured and validated</span>';
                
                this.updateUI();
                this.showNotification('API key saved successfully!', 'success');
            } catch (error) {
                console.error('Error saving API key:', error);
                this.showNotification('Failed to save API key', 'error', 4000);
            }
        });

        // Allow Enter key to save API key
        document.getElementById('modal-api-key').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('save-api-key-btn').click();
            }
        });
    }

    showHelp() {
        this.createModal('Help & Support', `
            <div class="help-content">
                <h4>Getting Started</h4>
                <ol>
                    <li><strong>API Setup:</strong> Get your free API key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></li>
                    <li><strong>Manual Scan:</strong> Click "Analyze Page" to scan the current webpage</li>
                    <li><strong>Auto-Scan:</strong> Enable to automatically scan suspicious pages</li>
                    <li><strong>Context Menu:</strong> Right-click on any page and select "Scan page for phishing"</li>
                </ol>

                <h4>Understanding Results</h4>
                <div class="result-explanation">
                    <div class="verdict-example safe">✅ LEGITIMATE</div>
                    <p>Website appears safe with high confidence</p>
                    
                    <div class="verdict-example suspicious">⚠️ SUSPICIOUS</div>
                    <p>Website has some concerning elements - proceed with caution</p>
                    
                    <div class="verdict-example danger">🚨 PHISHING</div>
                    <p>High likelihood of phishing - avoid entering personal information</p>
                </div>

                <h4>Tips for Safe Browsing</h4>
                <ul>
                    <li>Always verify URLs before entering sensitive information</li>
                    <li>Look for HTTPS (secure) connections</li>
                    <li>Be cautious of urgent or threatening messages</li>
                    <li>When in doubt, navigate to the official website directly</li>
                </ul>

                <h4>Troubleshooting</h4>
                <p><strong>Scan not working?</strong> Check your API key and internet connection</p>
                <p><strong>False positives?</strong> AI analysis isn't perfect - use your judgment</p>
                <p><strong>Slow scans?</strong> Large pages may take longer to analyze</p>

                <h4>Contact Support</h4>
                <p>Found a bug or have suggestions? <a href="mailto:support@phishguard.ai">Contact us</a></p>
            </div>
        `);
    }

    showAbout() {
        this.createModal('About PhishGuard AI', `
            <div class="about-content">
                <div class="logo-section">
                    <img src="icons/icon48.png" alt="PhishGuard AI" class="about-logo">
                    <h3>PhishGuard AI</h3>
                    <p class="version">Version 1.0.0</p>
                </div>

                <div class="description">
                    <p>PhishGuard AI is a Chrome extension that uses Google's Gemini AI to detect phishing websites in real-time, helping protect you from online scams and malicious websites.</p>
                </div>

                <div class="features">
                    <h4>Key Features</h4>
                    <ul>
                        <li>🔍 Real-time phishing detection</li>
                        <li>🤖 Powered by Google Gemini AI</li>
                        <li>⚡ Instant analysis results</li>
                        <li>🛡️ Context menu scanning</li>
                        <li>📱 Auto-scan capabilities</li>
                        <li>📊 Detailed threat analysis</li>
                    </ul>
                </div>

                <div class="privacy">
                    <h4>Privacy & Security</h4>
                    <p>Your privacy matters. PhishGuard AI:</p>
                    <ul>
                        <li>Only sends page content to Google's Gemini API for analysis</li>
                        <li>Does not store or transmit personal data</li>
                        <li>Your API key is stored locally in Chrome</li>
                        <li>No tracking or analytics</li>
                    </ul>
                </div>

                <div class="credits">
                    <h4>Credits</h4>
                    <p>Built with ❤️ using:</p>
                    <ul>
                        <li>Google Gemini AI</li>
                        <li>Chrome Extensions API</li>
                        <li>Modern web technologies</li>
                    </ul>
                </div>

                <div class="legal">
                    <p class="copyright">© 2025 PhishGuard AI. All rights reserved.</p>
                    <p class="disclaimer">This tool is provided as-is. Always use your best judgment when browsing the web.</p>
                </div>
            </div>
        `);
    }

    createModal(title, content, onClose = null) {
        // Remove existing modal if any
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close">✕</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        const modal = document.querySelector('.modal-overlay');
        const closeBtn = document.querySelector('.modal-close');

        const closeModal = () => {
            if (onClose) onClose();
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Close with Escape key
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);
    }

    async clearScanHistory() {
        try {
            // Show loading state on button
            const clearButton = document.getElementById('clear-history-btn');
            const originalText = clearButton.textContent;
            clearButton.textContent = 'Clearing...';
            clearButton.disabled = true;
            
            await chrome.storage.sync.set({ scanHistory: [] });
            this.scanHistory = [];
            this.loadScanHistory();
            
            // Show success feedback
            clearButton.textContent = '✓ Cleared';
            clearButton.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            clearButton.style.color = 'white';
            
            this.showNotification('Scan history cleared successfully', 'success');
            
            // Reset button after 2 seconds
            setTimeout(() => {
                clearButton.textContent = originalText;
                clearButton.disabled = false;
                clearButton.style.background = '';
                clearButton.style.color = '';
            }, 2000);
            
        } catch (error) {
            console.error('Error clearing history:', error);
            this.showNotification('Failed to clear history', 'error', 4000);
            
            // Reset button on error
            const clearButton = document.getElementById('clear-history-btn');
            clearButton.textContent = 'Clear Scan History';
            clearButton.disabled = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});
