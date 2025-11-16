# LM Studio Conversation Converter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/YorkieDev/lm-studio-conversation-converter.svg)](https://github.com/YorkieDev/lm-studio-conversation-converter/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/YorkieDev/lm-studio-conversation-converter.svg)](https://github.com/YorkieDev/lm-studio-conversation-converter/issues)

⚠️ Affiliation Disclaimer: This project is an independent initiative developed and maintained by the community. It has not been authorized, sponsored, or otherwise approved by LM Studio. The name "LM Studio" and any related names, marks, and logos are the trademarks of their respective owners. The use of these trademarks is for identification and reference purposes only and does not imply any association with the trademark holder.

A clean, modern web interface for converting LM Studio conversation files (`.json`) into readable text formats (`.txt`, `.md`, `.html` and `.pdf`).

<img width="2559" height="1228" alt="image" src="https://github.com/user-attachments/assets/4e7fe159-3bd1-4be0-9f0d-8364a8556ff6" />



## 🚀 Quick Start

1. **[Try it live](https://yorkiedev.github.io/lm-studio-conversation-converter/)** - No installation required!
2. Or download and open `index.html` in your browser
3. Drop your LM Studio conversation file and convert!

## Features

- 🎨 **Modern Dark Theme** - Sleek, professional interface with smooth animations
- 📁 **Drag & Drop Support** - Simply drag conversation files onto the upload area
- 📝 **Multiple Export Formats** - Convert to plain text (.txt), Markdown (.md), HTML (.html) and PDF (.pdf)
- ⚙️ **Customizable Options** - Include/exclude metadata, timestamps, system prompts, and generation statistics
- 👀 **Live Preview** - See your converted text before downloading
- 📋 **Copy to Clipboard** - Quick copy functionality for easy sharing
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile devices

## How to Use

### Finding Your Conversations

**Method 1 (Recommended):**
1. Open LM Studio
2. Right-click on any chat in the sidebar
3. Select "Reveal in File Explorer"
4. This will open the conversations folder

**Method 2 (Direct Path):**
Navigate to your conversations folder:

**Windows:**
```
%USERPROFILE%\.lmstudio\conversations
```

**Mac/Linux:**
```
~/.lmstudio/conversations/
```

### Converting Conversations

1. **Load a File:**
   - Drag and drop a `.json` conversation file onto the upload area, OR
   - Click "Browse Files" to select a file

2. **Choose Format:**
   - **Plain Text (.txt)** - Simple, readable text format
   - **Markdown (.md)** - Formatted text with headers and styling

3. **Select Options:**
   - **Include metadata** - Conversation name, creation date, model info
   - **Include timestamps** - When messages were sent
   - **Include system prompts** - System instructions used
   - **Include stats** - Token counts, generation speed, etc.

4. **Preview & Download:**
   - Review the conversion in the preview panel
   - Click "Convert & Download" to save the file
   - Or use "Copy to Clipboard" to copy the text

## File Structure

```
lmschatconverter/
├── index.html          # Main application interface
├── style.css           # Modern dark theme styling
├── script.js           # Conversion logic and UI interactions
└── README.md          # This documentation
```

## Technical Details

### Supported Conversation Format

This tool is designed specifically for LM Studio conversation files, which have the following structure:
- `name` - Conversation title
- `createdAt` - Timestamp of creation
- `messages` - Array of conversation messages
- `lastUsedModel` - Model information
- `tokenCount` - Total tokens used
- `systemPrompt` - System instructions (if any)

### Browser Compatibility

- Chrome/Edge 80+
- Firefox 80+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

### Privacy & Security

- **100% Client-Side** - All processing happens in your browser
- **No Data Upload** - Your conversations never leave your device
- **No Analytics** - No tracking or data collection
- **Offline Capable** - Works without internet connection

## Development

### Local Setup

1. Clone or download this repository
2. Open `index.html` in your web browser
3. No build process or dependencies required!

### Customization

The application uses CSS custom properties for theming. You can easily customize colors by modifying the `:root` variables in `style.css`:

```css
:root {
    --primary-bg: #0d1117;
    --accent-primary: #238636;
    --accent-secondary: #1f6feb;
    /* ... more variables */
}
```
## Support

If you encounter any issues or have suggestions for improvements, please:
1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Include your browser version and OS

---

**Note:** This tool is designed specifically for LM Studio conversation files. Other chat export formats may not be compatible. No Pull requests or contributions are accepted as this is a personal project. If you would like to suggest an issue or report a bug, please open an issue. 
