const BaseModule = require('../core/BaseModule');

class ClipboardModule extends BaseModule {
    constructor() {
        super('Clipboard', 'clipboardTab', 'clipboardTab');
        
        // Strict mapping linking tokens directly to explicit HTML Input Element IDs
        this.tokenConfig = [
            { token: '[DATE]', id: 'tokenDate' },
            { token: '[SUSPECT_USERNAME]', id: 'tokenSuspectUser' },
            { token: '[VICTIM_USERNAME]', id: 'tokenVictimUser' },
            { token: '[S_REASON]', id: 'tokenSReason' },
            { token: '[REASON]', id: 'tokenReason' },
            { token: '[V_REASON]', id: 'tokenVReason' },
            { token: '[EVIDENCE]', id: 'evidenceFormGroup' }, // Handles the parent wrapper block
            { token: '[MESSAGE]', id: 'tokenMessage' }
        ];
    }

    onInit() {
        this.clipboardContainer = document.getElementById('clipboardTab');
        if (!this.clipboardContainer) return;

        // Strict Element Selection based on your exact Frontend IDs
        this.templateSelector = document.getElementById('templateSelectorDropdown');
        this.livePreviewDisplay = document.getElementById('discordOutputLivePreview');
        this.copyBtn = document.getElementById('copyCompiledMessageBtn');
        this.addEvidenceBtn = document.getElementById('addEvidenceBtn');
        this.evidenceContainer = document.getElementById('evidenceListContainer');

        this.setupClipboardListeners();
        this.renderClipboardContent();
    }

    onActivate() {
        this.renderClipboardContent();
    }

    setupClipboardListeners() {
        // 1. Dropdown template switcher handler
        if (this.templateSelector) {
            this.templateSelector.addEventListener('change', () => this.renderClipboardContent());
        }

        // 2. Real-time token substitution stream typing listener
        if (this.clipboardContainer) {
            this.clipboardContainer.addEventListener('input', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    this.updatePreviewTextOnly();
                }
            });
        }

        // 3. Bulletproof Copy Message Execution Action
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.livePreviewDisplay) return;
                
                const content = this.livePreviewDisplay.value;
                navigator.clipboard.writeText(content).then(() => {
                    const prevLabel = this.copyBtn.textContent;
                    this.copyBtn.textContent = '✅ Copied to Clipboard!';
                    this.copyBtn.style.background = '#2ed573';
                    setTimeout(() => {
                        this.copyBtn.textContent = prevLabel;
                        this.copyBtn.style.background = '';
                    }, 1200);
                });
            });
        }

        // 4. Dynamic Evidence Row Append Engine
        if (this.addEvidenceBtn && this.evidenceContainer) {
            this.addEvidenceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                const newRow = document.createElement('div');
                newRow.className = 'evidence-row';
                newRow.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-top: 8px;';
                newRow.innerHTML = `
                    <input type="text" class="evidence-name" placeholder="Eg: Video" style="flex: 1; min-width: 0;">
                    <input type="text" class="evidence-url" placeholder="Eg: https://youtube.com/..." style="flex: 2; min-width: 0;">
                    <span class="remove-evidence-row-btn" style="color: var(--accent); cursor: pointer; font-weight: bold; font-size: 14px; padding: 0 4px;">×</span>
                `;
                
                this.evidenceContainer.appendChild(newRow);
                this.updatePreviewTextOnly();
            });

            // Inline delegator to handle dynamic row deletions safely
            this.evidenceContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-evidence-row-btn')) {
                    e.target.parentElement.remove();
                    this.updatePreviewTextOnly();
                }
            });
        }

        // 5. Scam Rules Node Copy Injection Interface
        const quickRuleNodes = this.clipboardContainer.querySelectorAll('.quick-rule-node');
        quickRuleNodes.forEach(node => {
            node.addEventListener('click', (e) => {
                const rulePayload = node.getAttribute('data-rule');
                if (!rulePayload) return;

                navigator.clipboard.writeText(rulePayload).then(() => {
                    const nativeLabel = node.textContent;
                    node.textContent = 'Copied!';
                    node.style.color = '#2ed573';
                    setTimeout(() => {
                        node.textContent = nativeLabel;
                        node.style.color = '';
                    }, 1200);
                });
            });
        });
    }

    getRawActiveTemplate() {
        if (!this.app || !this.app.db) return '';
        const templates = this.app.db.customTemplates || {};
        const activeKey = this.templateSelector ? this.templateSelector.value : 'victimDm';
        return templates[activeKey] || '';
    }

    renderClipboardContent() {
        const rawTemplateText = this.getRawActiveTemplate();

        // Formal Show/Hide Token Toggle Processing Loop
        this.tokenConfig.forEach(config => {
            const inputEl = document.getElementById(config.id);
            if (inputEl) {
                // Climb up tree structure to hit the parent field row container safely
                const fieldGroupWrapper = inputEl.closest('.form-group') || inputEl.parentElement;
                if (fieldGroupWrapper) {
                    const tokenIsPresent = rawTemplateText.includes(config.token);
                    fieldGroupWrapper.style.display = tokenIsPresent ? 'flex' : 'none';
                    if (tokenIsPresent && fieldGroupWrapper.classList.contains('form-group')) {
                        fieldGroupWrapper.style.flexDirection = 'column';
                    }
                }
            }
        });

        this.updatePreviewTextOnly();
    }

    updatePreviewTextOnly() {
        if (!this.livePreviewDisplay) return;

        let compiledOutput = this.getRawActiveTemplate();
        const currentCase = this.app.getCurrentCase();

        this.tokenConfig.forEach(config => {
            let value = '';

            if (config.token === '[EVIDENCE]') {
                const evidenceLinks = [];
                const rows = this.clipboardContainer.querySelectorAll('.evidence-row');
                
                rows.forEach(row => {
                    const nameInput = row.querySelector('.evidence-name');
                    const urlInput = row.querySelector('.evidence-url');
                    const nameVal = nameInput ? nameInput.value.trim() : '';
                    const urlVal = urlInput ? urlInput.value.trim() : '';
                    
                    if (nameVal && urlVal) evidenceLinks.push(`[${nameVal}](${urlVal})`);
                    else if (nameVal) evidenceLinks.push(nameVal);
                    else if (urlVal) evidenceLinks.push(urlVal);
                });
                
                value = evidenceLinks.length > 0 ? evidenceLinks.join(' | ') : '';
            } else {
                const inputEl = document.getElementById(config.id);
                value = inputEl ? inputEl.value.trim() : '';
            }

            // Fall back to showing raw bracket tokens if fields are left entirely blank
            if (value === '') {
                value = config.token;
            }

            const safeTokenRegex = new RegExp(config.token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
            compiledOutput = compiledOutput.replace(safeTokenRegex, value);
        });

        this.livePreviewDisplay.value = compiledOutput;
    }
}

module.exports = ClipboardModule;