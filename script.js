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

        const converted = this.convertToText();
        const previewContent = document.getElementById('previewContent');
        
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

        // Ensure we're using the current conversation data by regenerating the conversion
        const converted = this.convertToText();
        const format = this.getSelectedFormat();
        const filename = `${this.conversationData.name || 'conversation'}.${format}`;
        
        // Validate that we have content to download
        if (!converted || converted.trim().length === 0) {
            this.showToast('No content to convert', 'error');
            return;
        }
        
        this.downloadFile(converted, filename, format === 'md' ? 'text/markdown' : 'text/plain');
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
}

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ConversationConverter();
});

// Prevent default drag behaviors on the document
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());