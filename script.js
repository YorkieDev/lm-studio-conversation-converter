class ConversationConverter {
    constructor() {
        this.init();
        this.conversationData = null;
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const browseBtn = document.getElementById('browseBtn');
        const convertBtn = document.getElementById('convertBtn');
        const copyBtn = document.getElementById('copyBtn');

        // File upload handlers
        browseBtn.addEventListener('click', () => {
            fileInput.value = ''; // Clear previous selection
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Drag and drop handlers
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));

        // Convert button
        convertBtn.addEventListener('click', () => this.convertAndDownload());

        // Copy button
        copyBtn.addEventListener('click', () => this.copyToClipboard());

        // Format change handler
        const formatRadios = document.querySelectorAll('input[name="format"]');
        formatRadios.forEach(radio => {
            radio.addEventListener('change', () => this.updatePreview());
        });

        // Options change handlers
        const optionCheckboxes = document.querySelectorAll('.option-toggle input[type="checkbox"]');
        optionCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updatePreview());
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('drag-over');
    }

    handleFileDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect(files[0]);
        }
    }

    async handleFileSelect(file) {
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            this.showToast('Please select a valid JSON file', 'error');
            return;
        }

        try {
            // Clear previous data first
            this.conversationData = null;
            this.clearPreview();
            
            const text = await this.readFileAsText(file);
            const newData = JSON.parse(text);
            
            // Validate the conversation structure
            if (!this.validateConversationData(newData)) {
                this.conversationData = null;
                this.clearPreview();
                this.hideControls();
                this.showToast('Invalid conversation file format', 'error');
                return;
            }
            
            // Set the new conversation data
            this.conversationData = newData;
            
            this.showToast('File loaded successfully!', 'success');
            this.showControls();
            this.updatePreview();
            
        } catch (error) {
            console.error('Error parsing file:', error);
            this.conversationData = null;
            this.clearPreview();
            this.hideControls();
            this.showToast('Error reading file. Please ensure it\'s a valid LM Studio conversation file.', 'error');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    validateConversationData(data) {
        // Basic validation for LM Studio conversation format
        return data && 
               data.messages && 
               Array.isArray(data.messages) && 
               data.name;
    }

    showControls() {
        document.getElementById('controlsSection').style.display = 'block';
        document.getElementById('previewSection').style.display = 'block';
    }

    hideControls() {
        document.getElementById('controlsSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
    }

    getSelectedFormat() {
        const formatRadio = document.querySelector('input[name="format"]:checked');
        return formatRadio ? formatRadio.value : 'txt';
    }

    getSelectedOptions() {
        return {
            includeMetadata: document.getElementById('includeMetadata').checked,
            includeTimestamps: document.getElementById('includeTimestamps').checked,
            includeSystemPrompts: document.getElementById('includeSystemPrompts').checked,
            includeStats: document.getElementById('includeStats').checked
        };
    }

    convertToText() {
        if (!this.conversationData) return '';

        const options = this.getSelectedOptions();
        const format = this.getSelectedFormat();
        
        // For HTML and PDF, use special converters
        if (format === 'html') {
            return this.convertToHTML();
        }
        
        let output = '';

        // Add metadata header
        if (options.includeMetadata) {
            if (format === 'md') {
                output += `# ${this.conversationData.name || 'Untitled Conversation'}\n\n`;
                output += `**Created:** ${new Date(this.conversationData.createdAt).toLocaleString()}\n`;
                output += `**Model:** ${this.conversationData.lastUsedModel?.identifier || 'Unknown'}\n`;
                output += `**Token Count:** ${this.conversationData.tokenCount || 'Unknown'}\n\n`;
                
                if (this.conversationData.systemPrompt) {
                    output += `**System Prompt:** ${this.conversationData.systemPrompt}\n\n`;
                }
                
                output += '---\n\n';
            } else {
                output += `Conversation: ${this.conversationData.name || 'Untitled Conversation'}\n`;
                output += `Created: ${new Date(this.conversationData.createdAt).toLocaleString()}\n`;
                output += `Model: ${this.conversationData.lastUsedModel?.identifier || 'Unknown'}\n`;
                output += `Token Count: ${this.conversationData.tokenCount || 'Unknown'}\n`;
                
                if (this.conversationData.systemPrompt) {
                    output += `System Prompt: ${this.conversationData.systemPrompt}\n`;
                }
                
                output += '\n' + '='.repeat(80) + '\n\n';
            }
        }

        // Add system prompt from perChatPredictionConfig if available and option is enabled
        if (options.includeSystemPrompts && this.conversationData.perChatPredictionConfig) {
            const systemPromptField = this.conversationData.perChatPredictionConfig.fields?.find(
                field => field.key === 'llm.prediction.systemPrompt'
            );
            
            if (systemPromptField && systemPromptField.value) {
                if (format === 'md') {
                    output += `## System Prompt\n\n${systemPromptField.value}\n\n---\n\n`;
                } else {
                    output += `SYSTEM PROMPT:\n${systemPromptField.value}\n\n${'='.repeat(80)}\n\n`;
                }
            }
        }

        // Process messages
        this.conversationData.messages.forEach((message, index) => {
            const currentVersion = message.versions[message.currentlySelected || 0];
            
            if (currentVersion.role === 'user') {
                output = this.addUserMessage(output, currentVersion, format, options, index);
            } else if (currentVersion.role === 'assistant') {
                output = this.addAssistantMessage(output, currentVersion, format, options, index);
            }
        });

        return output;
    }

    addUserMessage(output, version, format, options, index) {
        const content = this.extractMessageContent(version);
        
        if (format === 'md') {
            return output + `## User\n\n${content}\n\n`;
        } else {
            return output + `USER:\n${content}\n\n`;
        }
    }

    addAssistantMessage(output, version, format, options, index) {
        let result = output;
        
        if (version.type === 'multiStep' && version.steps) {
            version.steps.forEach(step => {
                if (step.type === 'contentBlock' && step.content) {
                    const content = this.extractStepContent(step);
                    
                    if (format === 'md') {
                        result += `## Assistant\n\n${content}\n\n`;
                        
                        if (options.includeStats && step.genInfo) {
                            result += this.formatGenerationStats(step.genInfo, format);
                        }
                    } else {
                        result += `ASSISTANT:\n${content}\n\n`;
                        
                        if (options.includeStats && step.genInfo) {
                            result += this.formatGenerationStats(step.genInfo, format);
                        }
                    }
                }
            });
        } else {
            // Handle single-step assistant messages
            const content = this.extractMessageContent(version);
            
            if (format === 'md') {
                result += `## Assistant\n\n${content}\n\n`;
            } else {
                result += `ASSISTANT:\n${content}\n\n`;
            }
        }
        
        return result;
    }

    extractMessageContent(version) {
        if (version.content) {
            if (Array.isArray(version.content)) {
                return version.content
                    .filter(item => item.type === 'text')
                    .map(item => item.text)
                    .join('\n');
            } else if (typeof version.content === 'string') {
                return version.content;
            }
        }
        return '';
    }

    extractStepContent(step) {
        if (step.content && Array.isArray(step.content)) {
            return step.content
                .filter(item => item.type === 'text')
                .map(item => item.text)
                .join('\n');
        }
        return '';
    }

    formatGenerationStats(genInfo, format) {
        if (!genInfo.stats) return '';
        
        const stats = genInfo.stats;
        let statsText = '';
        
        if (format === 'md') {
            statsText += '\n### Generation Statistics\n\n';
            statsText += `- **Tokens per second:** ${stats.tokensPerSecond?.toFixed(2) || 'N/A'}\n`;
            statsText += `- **Time to first token:** ${stats.timeToFirstTokenSec?.toFixed(3) || 'N/A'}s\n`;
            statsText += `- **Total time:** ${stats.totalTimeSec?.toFixed(3) || 'N/A'}s\n`;
            statsText += `- **Prompt tokens:** ${stats.promptTokensCount || 'N/A'}\n`;
            statsText += `- **Generated tokens:** ${stats.predictedTokensCount || 'N/A'}\n`;
            statsText += `- **Total tokens:** ${stats.totalTokensCount || 'N/A'}\n\n`;
        } else {
            statsText += 'Generation Stats:\n';
            statsText += `  Tokens/sec: ${stats.tokensPerSecond?.toFixed(2) || 'N/A'}\n`;
            statsText += `  Time to first token: ${stats.timeToFirstTokenSec?.toFixed(3) || 'N/A'}s\n`;
            statsText += `  Total time: ${stats.totalTimeSec?.toFixed(3) || 'N/A'}s\n`;
            statsText += `  Prompt tokens: ${stats.promptTokensCount || 'N/A'}\n`;
            statsText += `  Generated tokens: ${stats.predictedTokensCount || 'N/A'}\n`;
            statsText += `  Total tokens: ${stats.totalTokensCount || 'N/A'}\n\n`;
        }
        
        return statsText;
    }

    updatePreview() {
        if (!this.conversationData) {
            this.clearPreview();
            return;
        }

        const format = this.getSelectedFormat();
        const previewContent = document.getElementById('previewContent');
        
        // For PDF, show a message instead of trying to preview
        if (format === 'pdf') {
            previewContent.textContent = 'PDF preview is not available. Click "Convert & Download" to generate the PDF file.';
            return;
        }

        const converted = this.convertToText();
        
        // Truncate preview if too long
        const maxLength = 2000;
        const truncated = converted.length > maxLength ? 
            converted.substring(0, maxLength) + '\n\n... (truncated for preview)' : 
            converted;
            
        previewContent.textContent = truncated;
    }

    clearPreview() {
        const previewContent = document.getElementById('previewContent');
        if (previewContent) {
            previewContent.textContent = 'No conversation loaded. Please select a file to preview.';
        }
    }

    convertAndDownload() {
        if (!this.conversationData) {
            this.showToast('No conversation loaded', 'error');
            return;
        }

        const format = this.getSelectedFormat();
        
        // Handle PDF separately
        if (format === 'pdf') {
            this.convertToPDF();
            return;
        }

        // Ensure we're using the current conversation data by regenerating the conversion
        const converted = this.convertToText();
        const filename = `${this.conversationData.name || 'conversation'}.${format}`;
        
        // Validate that we have content to download
        if (!converted || converted.trim().length === 0) {
            this.showToast('No content to convert', 'error');
            return;
        }
        
        const mimeTypes = {
            'txt': 'text/plain',
            'md': 'text/markdown',
            'html': 'text/html'
        };
        
        this.downloadFile(converted, filename, mimeTypes[format] || 'text/plain');
        this.showToast('Conversion complete! File downloaded.', 'success');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async copyToClipboard() {
        try {
            if (!this.conversationData) {
                this.showToast('No content to copy', 'error');
                return;
            }
            
            // Generate fresh content using current settings
            const fullContent = this.convertToText();
            
            if (!fullContent || fullContent.trim().length === 0) {
                this.showToast('No content to copy', 'error');
                return;
            }
            
            await navigator.clipboard.writeText(fullContent);
            this.showToast('Copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    convertToHTML() {
        if (!this.conversationData) return '';

        const options = this.getSelectedOptions();
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(this.conversationData.name || 'Conversation')}</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1a1a;
            color: #f8fafc;
            line-height: 1.6;
            padding: 40px 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: #242428;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .header {
            border-bottom: 2px solid #35353b;
            padding-bottom: 24px;
            margin-bottom: 32px;
        }
        h1 {
            font-size: 2rem;
            font-weight: 500;
            color: #ffffff;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
        }
        .metadata {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            font-size: 14px;
            color: #cbd5e1;
        }
        .metadata-item {
            display: flex;
            gap: 8px;
        }
        .metadata-label {
            font-weight: 600;
            color: #94a3b8;
        }
        .system-prompt {
            background: #1f1f23;
            border-left: 4px solid #6366f1;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 32px;
        }
        .system-prompt-title {
            font-weight: 600;
            color: #6366f1;
            margin-bottom: 12px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .message {
            margin-bottom: 32px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .message-role {
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .user-role {
            color: #10b981;
        }
        .assistant-role {
            color: #6366f1;
        }
        .message-content {
            background: #1f1f23;
            padding: 20px;
            border-radius: 12px;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 15px;
            line-height: 1.7;
        }
        .stats {
            background: #28282e;
            padding: 16px;
            border-radius: 8px;
            margin-top: 12px;
            font-size: 13px;
            font-family: 'IBM Plex Mono', monospace;
        }
        .stats-title {
            font-weight: 600;
            color: #94a3b8;
            margin-bottom: 8px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 8px;
            color: #cbd5e1;
        }
        code {
            font-family: 'IBM Plex Mono', monospace;
            background: #28282e;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${escapeHtml(this.conversationData.name || 'Untitled Conversation')}</h1>`;

        if (options.includeMetadata) {
            html += `
            <div class="metadata">
                <div class="metadata-item">
                    <span class="metadata-label">Created:</span>
                    <span>${new Date(this.conversationData.createdAt).toLocaleString()}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Model:</span>
                    <span>${escapeHtml(this.conversationData.lastUsedModel?.identifier || 'Unknown')}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Tokens:</span>
                    <span>${this.conversationData.tokenCount || 'Unknown'}</span>
                </div>
            </div>`;
        }

        html += `
        </div>`;

        // Add system prompt if available
        if (options.includeSystemPrompts && this.conversationData.perChatPredictionConfig) {
            const systemPromptField = this.conversationData.perChatPredictionConfig.fields?.find(
                field => field.key === 'llm.prediction.systemPrompt'
            );
            
            if (systemPromptField && systemPromptField.value) {
                html += `
        <div class="system-prompt">
            <div class="system-prompt-title">System Prompt</div>
            <div>${escapeHtml(systemPromptField.value)}</div>
        </div>`;
            }
        }

        // Process messages
        this.conversationData.messages.forEach((message) => {
            const currentVersion = message.versions[message.currentlySelected || 0];
            
            if (currentVersion.role === 'user') {
                const content = this.extractMessageContent(currentVersion);
                html += `
        <div class="message">
            <div class="message-role user-role">User</div>
            <div class="message-content">${escapeHtml(content)}</div>
        </div>`;
            } else if (currentVersion.role === 'assistant') {
                if (currentVersion.type === 'multiStep' && currentVersion.steps) {
                    currentVersion.steps.forEach(step => {
                        if (step.type === 'contentBlock' && step.content) {
                            const content = this.extractStepContent(step);
                            html += `
        <div class="message">
            <div class="message-role assistant-role">Assistant</div>
            <div class="message-content">${escapeHtml(content)}</div>`;
                            
                            if (options.includeStats && step.genInfo && step.genInfo.stats) {
                                const stats = step.genInfo.stats;
                                html += `
            <div class="stats">
                <div class="stats-title">Generation Statistics</div>
                <div class="stats-grid">
                    <div>Tokens/sec: ${stats.tokensPerSecond?.toFixed(2) || 'N/A'}</div>
                    <div>First token: ${stats.timeToFirstTokenSec?.toFixed(3) || 'N/A'}s</div>
                    <div>Total time: ${stats.totalTimeSec?.toFixed(3) || 'N/A'}s</div>
                    <div>Prompt tokens: ${stats.promptTokensCount || 'N/A'}</div>
                    <div>Generated: ${stats.predictedTokensCount || 'N/A'}</div>
                    <div>Total: ${stats.totalTokensCount || 'N/A'}</div>
                </div>
            </div>`;
                            }
                            
                            html += `
        </div>`;
                        }
                    });
                } else {
                    const content = this.extractMessageContent(currentVersion);
                    html += `
        <div class="message">
            <div class="message-role assistant-role">Assistant</div>
            <div class="message-content">${escapeHtml(content)}</div>
        </div>`;
                }
            }
        });

        html += `
    </div>
</body>
</html>`;

        return html;
    }

    convertToPDF() {
        if (!this.conversationData) {
            this.showToast('No conversation loaded', 'error');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const options = this.getSelectedOptions();
            
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const maxWidth = pageWidth - (margin * 2);
            let yPosition = margin;

            // Helper function to check if we need a new page
            const checkPageBreak = (requiredSpace) => {
                if (yPosition + requiredSpace > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin;
                }
            };

            // Helper function to add wrapped text
            const addWrappedText = (text, fontSize, fontStyle = 'normal', color = [0, 0, 0]) => {
                doc.setFontSize(fontSize);
                doc.setFont('helvetica', fontStyle);
                doc.setTextColor(...color);
                
                const lines = doc.splitTextToSize(text, maxWidth);
                const lineHeight = fontSize * 0.5;
                
                lines.forEach((line) => {
                    checkPageBreak(lineHeight);
                    doc.text(line, margin, yPosition);
                    yPosition += lineHeight;
                });
                
                return lines.length * lineHeight;
            };

            // Title
            addWrappedText(this.conversationData.name || 'Untitled Conversation', 18, 'bold', [0, 0, 0]);
            yPosition += 5;

            // Metadata
            if (options.includeMetadata) {
                addWrappedText(`Created: ${new Date(this.conversationData.createdAt).toLocaleString()}`, 10, 'normal', [100, 100, 100]);
                addWrappedText(`Model: ${this.conversationData.lastUsedModel?.identifier || 'Unknown'}`, 10, 'normal', [100, 100, 100]);
                addWrappedText(`Token Count: ${this.conversationData.tokenCount || 'Unknown'}`, 10, 'normal', [100, 100, 100]);
                yPosition += 10;
            }

            // System Prompt
            if (options.includeSystemPrompts && this.conversationData.perChatPredictionConfig) {
                const systemPromptField = this.conversationData.perChatPredictionConfig.fields?.find(
                    field => field.key === 'llm.prediction.systemPrompt'
                );
                
                if (systemPromptField && systemPromptField.value) {
                    checkPageBreak(20);
                    addWrappedText('SYSTEM PROMPT:', 11, 'bold', [99, 102, 241]);
                    yPosition += 2;
                    addWrappedText(systemPromptField.value, 10, 'normal', [50, 50, 50]);
                    yPosition += 10;
                }
            }

            // Messages
            this.conversationData.messages.forEach((message) => {
                const currentVersion = message.versions[message.currentlySelected || 0];
                
                checkPageBreak(30);
                
                if (currentVersion.role === 'user') {
                    const content = this.extractMessageContent(currentVersion);
                    addWrappedText('USER:', 11, 'bold', [16, 185, 129]);
                    yPosition += 2;
                    addWrappedText(content, 10, 'normal', [0, 0, 0]);
                    yPosition += 8;
                } else if (currentVersion.role === 'assistant') {
                    if (currentVersion.type === 'multiStep' && currentVersion.steps) {
                        currentVersion.steps.forEach(step => {
                            if (step.type === 'contentBlock' && step.content) {
                                const content = this.extractStepContent(step);
                                checkPageBreak(30);
                                addWrappedText('ASSISTANT:', 11, 'bold', [99, 102, 241]);
                                yPosition += 2;
                                addWrappedText(content, 10, 'normal', [0, 0, 0]);
                                
                                if (options.includeStats && step.genInfo && step.genInfo.stats) {
                                    const stats = step.genInfo.stats;
                                    yPosition += 3;
                                    addWrappedText('Generation Stats:', 9, 'italic', [100, 100, 100]);
                                    addWrappedText(`Tokens/sec: ${stats.tokensPerSecond?.toFixed(2) || 'N/A'} | Time: ${stats.totalTimeSec?.toFixed(3) || 'N/A'}s | Tokens: ${stats.totalTokensCount || 'N/A'}`, 8, 'normal', [120, 120, 120]);
                                }
                                
                                yPosition += 8;
                            }
                        });
                    } else {
                        const content = this.extractMessageContent(currentVersion);
                        addWrappedText('ASSISTANT:', 11, 'bold', [99, 102, 241]);
                        yPosition += 2;
                        addWrappedText(content, 10, 'normal', [0, 0, 0]);
                        yPosition += 8;
                    }
                }
            });

            // Save the PDF
            const filename = `${this.conversationData.name || 'conversation'}.pdf`;
            doc.save(filename);
            this.showToast('PDF generated successfully!', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showToast('Error generating PDF. Please try another format.', 'error');
        }
    }
}

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ConversationConverter();
});

// Prevent default drag behaviors on the document
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());