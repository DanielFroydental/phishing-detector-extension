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
            
            if (this.apiKey) {
                document.getElementById('api-key').value = '••••••••••••••••';
            }
            
            document.getElementById('auto-scan-toggle').checked = result.autoScanEnabled || false;
            this.scanHistory = result.scanHistory || [];
        } catch (error) {
            console.error('Error loading stored data:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('save-key').addEventListener('click', () => this.saveApiKey());
        document.getElementById('api-key').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveApiKey();
        });
        document.getElementById('scan-button').addEventListener('click', () => this.scanCurrentPage());
        document.getElementById('auto-scan-toggle').addEventListener('change', (e) => this.toggleAutoScan(e.target.checked));
    }

    async saveApiKey() {
        const apiKeyInput = document.getElementById('api-key');
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey || apiKey === '••••••••••••••••') {
            this.showNotification('Please enter a valid API key', 'error');
            return;
        }

        const validation = this.validateApiKey(apiKey);
        if (!validation.valid) {
            this.showNotification(validation.error, 'error');
            return;
        }

        try {
            const testResult = await this.testApiKey(apiKey);
            if (!testResult.valid) {
                this.showNotification(testResult.error, 'error');
                return;
            }

            await chrome.storage.sync.set({ geminiApiKey: apiKey });
            this.apiKey = apiKey;
            apiKeyInput.value = '••••••••••••••••';
            this.updateUI();
            this.showNotification('API key saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving API key:', error);
            this.showNotification('Failed to save API key', 'error');
        }
    }

    async toggleAutoScan(enabled) {
        try {
            await chrome.storage.sync.set({ autoScanEnabled: enabled });
            chrome.runtime.sendMessage({ action: 'toggleAutoScan', enabled: enabled });
            this.showNotification(enabled ? 'Auto-scan enabled' : 'Auto-scan disabled', 'success');
        } catch (error) {
            console.error('Error toggling auto-scan:', error);
            this.showNotification('Failed to update auto-scan setting', 'error');
        }
    }

    async scanCurrentPage() {
        if (this.isScanning) return;

        if (!this.apiKey) {
            this.showNotification('Please set your Gemini API key first', 'error');
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
                throw new Error('Cannot scan this type of page (chrome://, extensions, etc.)');
            }

            const response = await chrome.runtime.sendMessage({
                action: 'scanPage',
                tabId: tab.id,
                url: tab.url
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
            
            this.showNotification(errorMessage, 'error');
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
            statusText.textContent = 'API key required';
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
            scanButton.innerHTML = '<span class="button-icon">🔍</span>Analyze Page';
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
                badgeText = '🚨';
                title = `⚠️ HIGH RISK: Phishing detected (${Math.round(confidence)}% confidence)`;
            } else {
                badgeText = '⚠️';
                title = `⚠️ RISK: Potential phishing (${Math.round(confidence)}% confidence)`;
            }
        } else if (verdict === 'legitimate') {
            if (confidence > 70) {
                badgeText = '✅';
                title = `✅ SAFE: Website is legitimate (${Math.round(confidence)}% confidence)`;
            } else {
                badgeText = '⚠️';
                title = `⚠️ CAUTION: Legitimate but low confidence (${Math.round(confidence)}%)`;
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
            <button class="notification-close" onclick="this.parentElement.remove()">✕</button>
        `;

        const container = document.querySelector('.container');
        container.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    getNotificationIcon(type) {
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '🚨'
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
}

document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});
