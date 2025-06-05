# PhishGuard AI Chrome Extension

A comprehensive Chrome extension that uses Google Gemini AI to detect phishing websites in real-time, providing users with intelligent protection against online threats.

## 🚀 Features

### Core Functionality
- **Real-time Phishing Detection**: Analyze webpages using Google Gemini AI
- **Multiple Scanning Options**:
  - **Push-Scan**: Manual analysis via extension popup
  - **Right-Click Scan**: Quick analysis via context menu
  - **Smart-Scan**: Automatic detection of suspicious domains
- **Intelligent Analysis**: Examines URL structure, page content, and behavioral patterns
- **Visual Warnings**: Clear red/green banners for phishing/legitimate sites
- **Scan History**: Track recent scans and results

### Security & Privacy
- **Client-side Only**: No backend servers required
- **Privacy-First**: No personal data transmitted to APIs
- **Secure Storage**: API keys stored locally using Chrome's secure storage
- **Content Filtering**: Only page titles, URLs, and visible text analyzed

### User Experience
- **Modern UI**: Beautiful, responsive popup interface
- **Real-time Feedback**: Instant analysis results with confidence scores
- **Detailed Reasoning**: Clear explanations for each detection
- **Auto-hide Banners**: Non-intrusive warning system
- **Scan History**: Quick access to recent analysis results

## 📋 Requirements

### API Setup
1. **Google Gemini API Key**: Required for AI analysis
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key for extension setup

### Browser Compatibility
- Google Chrome (Manifest v3 compatible)
- Chromium-based browsers (Edge, Brave, etc.)

## 🛠️ Installation

### Option 1: Developer Mode Installation

1. **Download Extension**:
   ```bash
   # Clone or download the extension files
   # Ensure all files are in the phishguard-ai-extension folder
   ```

2. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)

3. **Load Extension**:
   - Click "Load unpacked"
   - Select the `phishguard-ai-extension` folder
   - Extension should appear in your extensions list

4. **Setup API Key**:
   - Click the extension icon in the toolbar
   - Enter your Gemini API key in the configuration section
   - Click "Save" to store the key securely

### Option 2: Packaged Installation

1. **Create Extension Package**:
   ```bash
   # Zip the entire phishguard-ai-extension folder
   zip -r phishguard-ai-extension.zip phishguard-ai-extension/
   ```

2. **Install Package**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the folder

## 🔧 Configuration

### Initial Setup

1. **API Key Configuration**:
   - Open extension popup
   - Navigate to "API Configuration" section
   - Enter your Gemini API key
   - Click "Save" to store securely

2. **Enable Auto-Scan** (Optional):
   - Toggle "Auto-scan suspicious pages"
   - Extension will automatically analyze suspicious domains

### Settings Explained

- **API Key**: Your Google Gemini API key for AI analysis
- **Auto-Scan**: Automatically scan pages that match suspicious patterns
- **Scan History**: View and track recent analysis results

## 🎯 Usage

### Manual Scanning (Push-Scan)

1. **Navigate to Website**: Visit any website you want to analyze
2. **Open Extension**: Click the PhishGuard AI icon in toolbar
3. **Start Scan**: Click "Analyze Page" button
4. **View Results**: Analysis results appear with:
   - Verdict (Phishing/Legitimate)
   - Confidence score (0-100%)
   - Detailed reasoning points

### Quick Scanning (Right-Click)

1. **Navigate to Website**: Visit any website you want to analyze
2. **Right-Click**: Right-click anywhere on the page
3. **Select Option**: Choose "Scan page for phishing" from context menu
4. **View Results**: Results appear instantly as a banner on the page

### Automatic Scanning (Smart-Scan)

1. **Enable Feature**: Toggle "Auto-scan suspicious pages" in popup
2. **Browse Normally**: Extension monitors page loads automatically
3. **Instant Alerts**: Warning banners appear for detected phishing sites
4. **Review Results**: Check scan history in extension popup

### Understanding Results

#### Verdict Types
- **🟢 Legitimate**: Website appears safe to use
- **🔴 Phishing**: Potential phishing attempt detected
- **⚪ Unknown**: Analysis inconclusive or error occurred

#### Confidence Scores
- **90-100%**: Very high confidence in verdict
- **70-89%**: High confidence in analysis
- **50-69%**: Moderate confidence
- **Below 50%**: Low confidence, manual review recommended

## 🔍 How It Works

### Analysis Process

1. **Data Collection**:
   - Page title and URL
   - Visible body text (first 5000 characters)
   - Meta descriptions and tags
   - Form elements and input fields
   - External links and iframes

2. **AI Analysis**:
   - Send data to Google Gemini API
   - Advanced prompt engineering for phishing detection
   - Pattern recognition and behavioral analysis
   - Context-aware threat assessment

3. **Result Processing**:
   - Parse AI response for structured results
   - Validate confidence scores and reasoning
   - Apply fallback heuristics if needed
   - Store results for history tracking

### Detection Criteria

The extension analyzes multiple factors:

#### URL Analysis
- Domain spelling and structure
- Suspicious TLDs (.tk, .ml, .ga, .cf)
- Subdomain patterns
- URL shorteners and redirects

#### Content Analysis
- Urgency language and threats
- Grammar and spelling errors
- Brand impersonation attempts
- Social engineering tactics

#### Technical Analysis
- HTTPS usage and certificates
- Form security and destinations
- Hidden iframes and redirects
- JavaScript obfuscation

## 🛡️ Security & Privacy

### Data Protection
- **No Personal Data**: Only page titles, URLs, and visible text analyzed
- **Local Storage**: API keys stored securely in Chrome's sync storage
- **No Tracking**: Extension doesn't track user behavior or browsing history
- **Encrypted Communication**: All API calls use HTTPS encryption

### Permissions Explained
- **activeTab**: Access current tab for analysis
- **storage**: Store API keys and preferences securely
- **tabs**: Monitor tab changes for auto-scan
- **scripting**: Inject warning banners and collect page data
- **host_permissions**: Communicate with Gemini API

## 🚨 Troubleshooting

### Common Issues

#### Extension Not Working
1. **Check API Key**: Ensure valid Gemini API key is saved
2. **Verify Permissions**: Confirm all required permissions granted
3. **Reload Extension**: Disable and re-enable in Chrome extensions
4. **Check Console**: Open DevTools and check for error messages

#### API Errors
1. **Invalid Key**: Verify API key is correct and active
2. **Rate Limits**: Wait a few minutes if hitting rate limits
3. **Network Issues**: Check internet connection and firewall settings

#### False Positives/Negatives
1. **Report Issues**: Document false results for improvement
2. **Manual Override**: Use your judgment alongside extension results
3. **Update Patterns**: Extension learns from usage patterns

### Getting Help

1. **Check Documentation**: Review this README thoroughly
2. **Browser Console**: Check for error messages in DevTools
3. **Extension Logs**: Review background script logs
4. **Community Support**: Report issues and get community help

## 🔧 Development

### Project Structure
```
phishguard-ai-extension/
├── 📄 manifest.json          # Chrome extension manifest
├── 🎨 popup.html/.css/.js    # Extension popup interface & functionality
├── 🔧 background.js          # Background service worker
├── 📱 content.js             # Content script for page interaction
├── 🎨 styles.css             # Content script styles
├── 📁 icons/                 # Extension icons (SVG + PNG)
├── 📖 docs/                  # Documentation
│   ├── INSTALL.md           # Quick installation guide
│   ├── SETUP-GUIDE.md       # Complete user manual
│   └── STATUS.md            # Development status
├── 🧪 tests/                 # Testing utilities & demo scripts
│   ├── test-extension.js    # Comprehensive test suite
│   ├── test-utils.js        # Testing utilities
│   ├── test-api.js          # API testing
│   └── demo.js              # Interactive demo
├── 🛠️ tools/                 # Build tools & utilities
│   ├── icons-generators/    # Icon generation scripts
│   └── gemini-config.js     # API configuration
└── 📖 README.md             # This file
```

### Technical Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **API Integration**: Google Gemini AI via REST API
- **Storage**: Chrome Storage API
- **Architecture**: Chrome Extension Manifest v3

### Key Components

#### Background Service Worker (`background.js`)
- Handles API communication
- Manages auto-scan functionality
- Processes tab events and URL changes
- Stores scan results and history

#### Content Script (`content.js`)
- Injects warning banners into pages
- Extracts page data for analysis
- Handles user interactions with warnings
- Monitors page changes in SPAs

#### Popup Interface (`popup.js`)
- Manages user interface interactions
- Handles API key configuration
- Displays scan results and history
- Controls extension settings

### API Integration

The extension uses Google's Gemini Pro model with specialized prompts for phishing detection:

```javascript
// Example API call structure
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ parts: [{ text: analysisPrompt }] }],
        generationConfig: {
            temperature: 0.1,  // Low temperature for consistent analysis
            topP: 0.8,
            maxOutputTokens: 1024
        }
    })
});
```

## 📈 Future Enhancements

### Planned Features
- **Machine Learning**: Local ML models for offline detection
- **Threat Intelligence**: Integration with threat feeds
- **User Reporting**: Community-driven threat reporting
- **Advanced Analytics**: Detailed threat analysis and statistics
- **Multi-language**: Support for international phishing attempts

### Performance Optimizations
- **Caching**: Cache analysis results for faster repeat visits
- **Background Analysis**: Pre-analyze suspicious patterns
- **Lightweight Detection**: Quick heuristic checks before AI analysis

## 📊 Testing

### Unit Testing
```bash
# Run extension tests (when implemented)
npm test
```

### Manual Testing Checklist
- [ ] API key configuration and storage
- [ ] Manual scan functionality
- [ ] Auto-scan on suspicious domains
- [ ] Warning banner display and interaction
- [ ] Scan history storage and display
- [ ] Settings persistence across browser sessions

### Test Cases
1. **Legitimate Sites**: Ensure low false-positive rate
2. **Known Phishing**: Test against known phishing samples
3. **Edge Cases**: Test with unusual domains and content
4. **Performance**: Verify low resource usage

## 🛠️ Development

### Running Tests

The project includes comprehensive testing utilities in the `tests/` directory:

```bash
# Run all extension tests
npm test

# Run API testing
npm run test-api

# Run interactive demo
npm run demo

# Test specific utilities
npm run test-utils
```

### Development Scripts

```bash
# Generate icons from SVG source
npm run icons

# Validate extension files
npm run validate

# Package extension for distribution
npm run package

# Clean build artifacts
npm run clean
```

### Development Structure

- **`tests/`**: All testing and demo scripts
  - `test-extension.js` - Main extension validation
  - `test-api.js` - API connectivity testing
  - `demo.js` - Interactive testing demo
  - `test-utils.js` - Testing utilities
  - `debug-extraction.js` - Content extraction debugging

- **`tools/`**: Build tools and utilities
  - `icons-generators/` - Icon generation scripts
  - `gemini-config.js` - API configuration

- **`docs/`**: Complete documentation
  - `INSTALL.md` - Quick installation guide
  - `SETUP-GUIDE.md` - Detailed user manual
  - `STATUS.md` - Development status

### Testing Workflow

1. **Extension Validation**: `npm test`
2. **API Testing**: `npm run test-api` 
3. **Interactive Demo**: `npm run demo`
4. **Manual Testing**: Load extension in Chrome Developer Mode

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Make changes in feature branches
3. Test thoroughly with various websites
4. Submit pull requests with detailed descriptions

### Code Style
- Use consistent indentation (2 spaces)
- Comment complex logic thoroughly
- Follow Chrome extension best practices
- Maintain security-first mindset

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This extension is a security tool designed to help users identify potential phishing websites. However:

- **Not 100% Accurate**: AI analysis may produce false positives/negatives
- **Use Judgment**: Always use your best judgment when evaluating websites
- **Stay Updated**: Keep the extension updated for latest threat patterns
- **Report Issues**: Help improve accuracy by reporting false results

The developers are not responsible for any damage or loss resulting from the use of this extension. Users should always exercise caution when providing personal information online.

## 📞 Support

For support, bug reports, or feature requests:
1. Check this README for common solutions
2. Review browser console for error messages  
3. Document steps to reproduce issues
4. Consider contributing improvements back to the project

---

**Stay Safe Online! 🛡️**
