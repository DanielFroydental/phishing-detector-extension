class PhishGuardContent {
    constructor() {
        this.currentBanner = null;
        this.pageAnalyzed = false;
        this.init();
    }

    init() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });
        this.observePageChanges();
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'showPhishingBanner':
            case 'showPhishingWarning':
                this.showPhishingWarning(request.result);
                sendResponse({ success: true });
                break;
            case 'showSuspiciousWarning':
                this.showSuspiciousWarning(request.result);
                sendResponse({ success: true });
                break;
            case 'showSafeIndicator':
                this.showSafeIndicator(request.result);
                sendResponse({ success: true });
                break;
            case 'removeBanner':
                this.removeBanner();
                sendResponse({ success: true });
                break;
            case 'showNotification':
                this.showNotification(request.message, request.type);
                sendResponse({ success: true });
                break;
            case 'getPageData':
                const pageData = this.extractPageData();
                sendResponse({ pageData });
                break;
            default:
                sendResponse({ error: 'Unknown action' });
        }
    }

    showPhishingWarning(result) {
        this.removeBanner();

        const banner = document.createElement('div');
        banner.id = 'phishguard-warning';
        banner.className = 'phishguard-banner warning';
        banner.setAttribute('dir', 'ltr');
        banner.style.cssText = 'position: fixed !important; top: 0 !important; bottom: auto !important; left: 0 !important; right: 0 !important; z-index: 2147483647 !important; direction: ltr !important; text-align: left !important; unicode-bidi: embed !important;';
        
        // Force inline styles as attributes to ensure they take precedence
        banner.style.setProperty('position', 'fixed', 'important');
        banner.style.setProperty('top', '0', 'important');
        banner.style.setProperty('bottom', 'auto', 'important');
        banner.style.setProperty('left', '0', 'important');
        banner.style.setProperty('right', '0', 'important');
        banner.style.setProperty('z-index', '2147483647', 'important');
        
        banner.innerHTML = `
            <div class="phishing-banner-content" dir="ltr" style="direction: ltr !important; text-align: left !important;">
                <div class="phishing-banner-header" dir="ltr" style="direction: ltr !important; display: flex !important; flex-direction: row !important;">
                    <div class="phishing-banner-icon" style="order: 1 !important;">!</div>
                    <div class="phishing-banner-title" style="order: 2 !important; text-align: left !important;">
                        <strong>PHISHING WEBSITE DETECTED</strong>
                        <div class="phishing-banner-subtitle">
                            This website may be trying to steal your personal information
                        </div>
                    </div>
                    <button class="phishing-banner-close" style="order: 3 !important;" onclick="this.closest('.phishguard-banner').remove()">✕</button>
                </div>
                
                <div class="phishing-banner-details">
                    <div class="phishing-confidence">
                        Phishing Risk Level: <strong>${Math.round(result.confidence)}%</strong>
                    </div>
                    <div class="phishing-reasons">
                        <strong>Warning signs detected:</strong>
                        <ul>
                            ${(result.reasoning || result.reasons || []).map(reason => `<li>${reason}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="phishing-banner-actions" style="direction: ltr !important; display: flex !important; flex-direction: row !important;">
                    <button class="phishing-action-btn danger" onclick="window.history.back()">← Go Back</button>
                    <button class="phishing-action-btn secondary" onclick="this.closest('.phishguard-banner').remove()">Continue Anyway</button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
        this.currentBanner = banner;

        setTimeout(() => {
            // Add the show class to trigger the animation
            banner.classList.add('show');
            
            // Reinforce only positioning, not transform
            banner.style.setProperty('position', 'fixed', 'important');
            banner.style.setProperty('z-index', '2147483647', 'important');
        }, 10); // Use a shorter delay for smoother animation

        // Auto-hide after 15 seconds
        setTimeout(() => {
            if (banner.parentNode && !banner.classList.contains('user-interacted')) {
                // Add the auto-hiding class to trigger the slide-up animation
                banner.classList.add('auto-hiding');
                // Remove after animation completes
                setTimeout(() => {
                    if (banner.parentNode) banner.remove();
                }, 500); // Match the transition duration in CSS
            }
        }, 15000);

        banner.addEventListener('mouseenter', () => banner.classList.add('user-interacted'));
    }

    showSuspiciousWarning(result) {
        this.removeBanner();

        const banner = document.createElement('div');
        banner.id = 'phishguard-suspicious';
        banner.className = 'phishguard-banner suspicious';
        banner.setAttribute('dir', 'ltr');
        banner.style.cssText = 'position: fixed !important; top: 0 !important; bottom: auto !important; left: 0 !important; right: 0 !important; z-index: 2147483647 !important; direction: ltr !important; text-align: left !important; unicode-bidi: embed !important;';
        
        // Force inline styles as attributes to ensure they take precedence
        banner.style.setProperty('position', 'fixed', 'important');
        banner.style.setProperty('top', '0', 'important');
        banner.style.setProperty('bottom', 'auto', 'important');
        banner.style.setProperty('left', '0', 'important');
        banner.style.setProperty('right', '0', 'important');
        banner.style.setProperty('z-index', '2147483647', 'important');
        
        banner.innerHTML = `
            <div class="phishing-banner-content" dir="ltr" style="direction: ltr !important; text-align: left !important;">
                <div class="phishing-banner-header" dir="ltr" style="direction: ltr !important; display: flex !important; flex-direction: row !important;">
                    <div class="phishing-banner-icon" style="order: 1 !important;">⚠</div>
                    <div class="phishing-banner-title" style="order: 2 !important; text-align: left !important;">
                        <strong>Suspicious Website Detected</strong>
                        <div class="phishing-banner-subtitle">
                            Exercise caution - this website appears legitimate but has some suspicious elements
                        </div>
                    </div>
                    <button class="phishing-banner-close" style="order: 3 !important;" onclick="this.closest('.phishguard-banner').remove()">
                        ✕
                    </button>
                </div>
                
                <div class="phishing-banner-details">
                    <div class="phishing-confidence">
                        Confidence in Legitimacy: <strong>${Math.round(result.confidence)}%</strong>
                    </div>
                    <div class="phishing-reasons">
                        <strong>Caution reasons:</strong>
                        <ul>
                            ${(result.reasoning || result.reasons || []).map(reason => `<li>${reason}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="phishing-banner-actions" style="direction: ltr !important; display: flex !important; flex-direction: row !important;">
                    <button class="phishing-action-btn warning" onclick="window.history.back()">
                        ← Go Back
                    </button>
                    <button class="phishing-action-btn secondary" onclick="this.closest('.phishguard-banner').remove()">
                        Continue with Caution
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
        this.currentBanner = banner;

        // Animate in
        setTimeout(() => {
            // Add the show class to trigger the animation
            banner.classList.add('show');
            
            // Reinforce only positioning, not transform
            banner.style.setProperty('position', 'fixed', 'important');
            banner.style.setProperty('z-index', '2147483647', 'important');
        }, 10); // Use a shorter delay for smoother animation

        // Auto-hide after 10 seconds (longer than safe, shorter than phishing)
        setTimeout(() => {
            if (banner.parentNode && !banner.classList.contains('user-interacted')) {
                // Add the auto-hiding class to trigger the slide-up animation
                banner.classList.add('auto-hiding');
                // Remove after animation completes
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.remove();
                    }
                }, 500); // Match the transition duration in CSS
            }
        }, 10000);

        banner.addEventListener('mouseenter', () => {
            banner.classList.add('user-interacted');
        });
    }

    showSafeIndicator(result) {
        this.removeBanner();

        const banner = document.createElement('div');
        banner.id = 'phishguard-safe';
        banner.className = 'phishguard-banner safe';
        banner.setAttribute('dir', 'ltr');
        banner.style.cssText = 'position: fixed !important; top: 0 !important; bottom: auto !important; left: 0 !important; right: 0 !important; z-index: 2147483647 !important; direction: ltr !important; text-align: left !important; unicode-bidi: embed !important;';
        
        // Force inline styles as attributes to ensure they take precedence
        banner.style.setProperty('position', 'fixed', 'important');
        banner.style.setProperty('top', '0', 'important');
        banner.style.setProperty('bottom', 'auto', 'important');
        banner.style.setProperty('left', '0', 'important');
        banner.style.setProperty('right', '0', 'important');
        banner.style.setProperty('z-index', '2147483647', 'important');
        
        banner.innerHTML = `
            <div class="phishing-banner-content safe-content" dir="ltr" style="direction: ltr !important; text-align: left !important;">
                <div class="phishing-banner-header" dir="ltr" style="direction: ltr !important; display: flex !important; flex-direction: row !important;">
                    <div class="phishing-banner-icon" style="order: 1 !important;">✓</div>
                    <div class="phishing-banner-title" style="order: 2 !important; text-align: left !important;">
                        <strong>Website appears legitimate</strong>
                        <div class="phishing-banner-subtitle">
                            Scanned by PhishGuard AI (${Math.round(result.confidence)}% confidence)
                        </div>
                    </div>
                    <button class="phishing-banner-close" style="order: 3 !important;" onclick="this.closest('.phishguard-banner').remove()">
                        ✕
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
        this.currentBanner = banner;

        // Animate in
        setTimeout(() => {
            // Add the show class to trigger the animation
            banner.classList.add('show');
            
            // Reinforce only positioning, not transform
            banner.style.setProperty('position', 'fixed', 'important');
            banner.style.setProperty('z-index', '2147483647', 'important');
        }, 10); // Use a shorter delay for smoother animation
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (banner.parentNode) {
                banner.classList.add('auto-hiding');
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    removeBanner() {
        if (this.currentBanner && this.currentBanner.parentNode) {
            this.currentBanner.remove();
            this.currentBanner = null;
        }

        // Also remove any existing banners by ID
        const existingWarning = document.getElementById('phishguard-warning');
        const existingSafe = document.getElementById('phishguard-safe');
        const existingSuspicious = document.getElementById('phishguard-suspicious');
        
        if (existingWarning) existingWarning.remove();
        if (existingSafe) existingSafe.remove();
        if (existingSuspicious) existingSuspicious.remove();
    }

    extractPageData() {
        try {
            const title = document.title || '';
            const bodyText = document.body ? 
                document.body.innerText.substring(0, 3000) : '';
            const metaDescription = document.querySelector('meta[name="description"]');
            const description = metaDescription ? metaDescription.content : '';
            const lang = document.documentElement.lang || 
                        document.querySelector('meta[http-equiv="content-language"]')?.content || '';

            const suspiciousElements = {
                iframes: document.querySelectorAll('iframe').length,
                externalLinks: this.countExternalLinks(),
                formInputs: document.querySelectorAll('input[type="password"], input[type="email"]').length,
                httpsStatus: window.location.protocol === 'https:',
                hasLoginForm: this.hasLoginForm(),
                popups: document.querySelectorAll('[onclick*="popup"], [onclick*="window.open"]').length,
                redirects: this.checkForRedirects(),
                hiddenElements: document.querySelectorAll('[style*="display:none"], [style*="visibility:hidden"]').length
            };

            const forms = Array.from(document.querySelectorAll('form')).map(form => ({
                action: form.action || '',
                method: form.method || 'get',
                inputs: Array.from(form.querySelectorAll('input')).map(input => ({
                    type: input.type,
                    name: input.name,
                    required: input.required
                }))
            }));

            const urlInfo = {
                protocol: window.location.protocol,
                hostname: window.location.hostname,
                pathname: window.location.pathname,
                search: window.location.search,
                fullUrl: window.location.href,
                port: window.location.port
            };

            const contentFlags = this.analyzeContentFlags(bodyText, title);

            return {
                title,
                description,
                bodyText,
                language: lang,
                suspiciousElements,
                forms,
                urlInfo,
                contentFlags,
                timestamp: Date.now(),
                userAgent: navigator.userAgent
            };

        } catch (error) {
            console.error('Error extracting page data:', error);
            return {
                title: document.title || '',
                description: '',
                bodyText: '',
                suspiciousElements: {},
                urlInfo: { fullUrl: window.location.href },
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    countExternalLinks() {
        return Array.from(document.querySelectorAll('a[href]'))
            .filter(a => {
                try {
                    const linkHost = new URL(a.href).hostname;
                    return linkHost !== window.location.hostname;
                } catch {
                    return false;
                }
            }).length;
    }

    /**
     * Check if page has login form
     */
    hasLoginForm() {
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
            const hasPassword = form.querySelector('input[type="password"]');
            const hasEmail = form.querySelector('input[type="email"]');
            const hasUsernameField = form.querySelector('input[name*="user"], input[name*="login"], input[name*="email"]');
            
            if (hasPassword && (hasEmail || hasUsernameField)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check for redirect indicators
     */
    checkForRedirects() {
        const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
        const jsRedirects = document.body ? 
            document.body.innerHTML.match(/(window\.location|location\.href|location\.replace)/gi) || [] : [];
        
        return {
            metaRefresh: !!metaRefresh,
            jsRedirects: jsRedirects.length,
            refreshContent: metaRefresh ? metaRefresh.content : null
        };
    }

    /**
     * Analyze content for phishing flags
     */
    analyzeContentFlags(bodyText, title) {
        const text = (bodyText + ' ' + title).toLowerCase();
        
        const urgencyWords = [
            'urgent', 'immediate', 'expire', 'suspend', 'verify', 'confirm',
            'update', 'secure', 'alert', 'warning', 'limited time', 'act now'
        ];

        const scamPhrases = [
            'click here', 'verify account', 'confirm identity', 'update payment',
            'suspended account', 'unusual activity', 'security alert',
            'winner', 'congratulations', 'prize', 'lottery'
        ];

        const threats = [
            'close account', 'legal action', 'penalty', 'fine',
            'restricted', 'locked', 'blocked'
        ];

        return {
            urgencyScore: urgencyWords.filter(word => text.includes(word)).length,
            scamScore: scamPhrases.filter(phrase => text.includes(phrase)).length,
            threatScore: threats.filter(threat => text.includes(threat)).length,
            hasExcessiveCaps: (text.match(/[A-Z]/g) || []).length > text.length * 0.1,
            hasExcessiveExclamation: (text.match(/!/g) || []).length > 5,
            hasSpellingErrors: this.detectSpellingErrors(text)
        };
    }

    /**
     * Simple spelling error detection
     */
    detectSpellingErrors(text) {
        const commonMisspellings = [
            'paypal', 'amazom', 'gogle', 'microsooft', 'facbook',
            'bankk', 'securee', 'varify', 'acount', 'recieve'
        ];

        return commonMisspellings.some(error => text.includes(error));
    }

    /**
     * Observe page changes for SPAs
     */
    observePageChanges() {
        let lastUrl = location.href;
        
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                this.pageAnalyzed = false;
                this.removeBanner();
                
                // Notify background script of URL change
                chrome.runtime.sendMessage({
                    action: 'urlChanged',
                    url: url
                });
            }
        }).observe(document, { subtree: true, childList: true });
    }



    showNotification(message, type = 'info') {
        // Remove any existing notification
        const existingNotification = document.querySelector('.phishguard-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'phishguard-notification';
        notification.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 2147483647 !important;
            background: ${type === 'error' ? '#f44336' : '#4CAF50'} !important;
            color: white !important;
            padding: 12px 16px !important;
            border-radius: 8px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 14px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            max-width: 300px !important;
            transform: translateX(100%) !important;
            transition: transform 0.3s ease-out !important;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">${type === 'error' ? '!' : 'ℹ'}</span>
                <span>${message}</span>
                <button onclick="this.closest('.phishguard-notification').remove()" 
                        style="margin-left: auto; background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0;">✕</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PhishGuardContent();
    });
} else {
    new PhishGuardContent();
}
