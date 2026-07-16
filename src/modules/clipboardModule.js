const BaseModule = require('../core/BaseModule');

const embeddedTemplatesRegistry = {
    victimDm: `# <:SI:1169019875814023178> Greetings,\n\nI am here to inform you about the scam report you have opened on [DATE]\n**Ticket Copy: [attached below]**\n\nTo continue with your case, we would require the following:-\n- **A video recording of your DMs with the suspect**\n\nYou have 24 hours to provide the requirements. Failure to provide it under the timeframe would result in closing ticket and you have to open a new ticket to report again,\n\nWith regards,\n**Baizhi**\n**Scam Investigator <:SI:1169019875814023178> **\n**HiddenDevs <:HiddenDevs:929518256782450749> **`,
    
    suspectDm: `# <:SI:1169019875814023178> Greetings,\n\nI am here to inform you that you're being reported by [VICTIM_USERNAME] for [REASON].\n**Ticket Copy: [attached below]**\n**Evidence: [EVIDENCE]**\n\nYou have 24 hours to defend yourself regarding this case. Failure to co-operate or respond within the given timeframe will result in a ban.\n\nSincerely,\n**Baizhi**\n**Scam Investigator <:SI:1169019875814023178> **\n**HiddenDevs <:HiddenDevs:929518256782450749> **`,
    
    verdict: `# <:SI:1169019875814023178> Greetings,\n\nOn reviewing this case in depth, I have reached out with a final verdict:-\n\n**Suspect (SUSPECT_USERNAME): [INNOCENT/REASON]**\n**Victim (VICTIM_USERNAME): [INNOCENT/REASON]**\n**Evidence: [EVIDENCE]**\n\n[MESSAGE]\n\nWith regards,\n**Baizhi**\n**Scam Investigator <:SI:1169019875814023178> **\n**HiddenDevs <:HiddenDevs:929518256782450749> **`
};

class ClipboardModule extends BaseModule {
    constructor() {
        super('ClipboardManager', 'clipboardTab', 'clipboardTab');
    }

    onInit() {
        this.dropdownSelector = document.getElementById('templateSelectorDropdown');
        this.livePreviewArea = document.getElementById('discordOutputLivePreview');
        this.copyMessageBtn = document.getElementById('copyCompiledMessageBtn');
        this.addEvidenceBtn = document.getElementById('addEvidenceBtn');
        this.evidenceListContainer = document.getElementById('evidenceListContainer');

        this.tokenInputs = {
            date: document.getElementById('tokenDate'),
            suspectUser: document.getElementById('tokenSuspectUser'),
            victimUser: document.getElementById('tokenVictimUser'),
            sReason: document.getElementById('tokenSReason'),
            reason: document.getElementById('tokenReason'),
            vReason: document.getElementById('tokenVReason'),
            evidence: document.getElementById('evidenceFormGroup'),
            message: document.getElementById('tokenMessage')
        };

        this.setupListeners();
        this.triggerLivePreviewRender();
    }

    setupListeners() {
        const renderTrigger = () => this.triggerLivePreviewRender();

        if (this.dropdownSelector) {
            this.dropdownSelector.addEventListener('change', renderTrigger);
        }

        Object.keys(this.tokenInputs).forEach(key => {
            const el = this.tokenInputs[key];
            if (!el) return;

            if (key === 'evidence') {
                el.querySelectorAll('input').forEach(inp => {
                    inp.addEventListener('input', renderTrigger);
                    inp.addEventListener('change', renderTrigger);
                });
            } else {
                el.addEventListener('input', renderTrigger);
                el.addEventListener('change', renderTrigger);
            }
        });

        if (this.addEvidenceBtn && this.evidenceListContainer) {
            this.addEvidenceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                const currentRows = this.evidenceListContainer.querySelectorAll('.evidence-row').length;
                if (currentRows >= 9) {
                    alert("Discord embed limits prevent adding more than 9 markdown links!");
                    return;
                }

                const row = document.createElement('div');
                row.className = 'evidence-row';
                row.style.cssText = 'display: flex; gap: 8px; align-items: center;';
                row.innerHTML = `
                    <input type="text" class="evidence-name" placeholder="Eg: Screenshot" style="flex: 1; min-width: 0;">
                    <input type="text" class="evidence-url" placeholder="Eg: https://..." style="flex: 2; min-width: 0;">
                    <span class="remove-evidence-btn" style="color: #ff4757; font-size: 16px; font-weight: bold; cursor: pointer; line-height: 1; padding: 0 4px;">&times;</span>
                `;

                row.querySelectorAll('input').forEach(inp => {
                    inp.addEventListener('input', renderTrigger);
                    inp.addEventListener('change', renderTrigger);
                });

                row.querySelector('.remove-evidence-btn').addEventListener('click', (ev) => {
                    ev.preventDefault();
                    row.remove();
                    this.triggerLivePreviewRender();
                });

                this.evidenceListContainer.appendChild(row);
                this.triggerLivePreviewRender();
            });
        }

        if (this.copyMessageBtn) {
            this.copyMessageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.livePreviewArea) return;

                navigator.clipboard.writeText(this.livePreviewArea.value);
                const nativeLabelText = this.copyMessageBtn.textContent;
                this.copyMessageBtn.textContent = "✅ Message Dispatched!";
                this.copyMessageBtn.style.background = "#2ed573";
                
                setTimeout(() => {
                    this.copyMessageBtn.textContent = nativeLabelText;
                    this.copyMessageBtn.style.background = "#341f97";
                }, 1200);
            });
        }

        document.querySelectorAll('.quick-rule-node').forEach(node => {
            node.addEventListener('click', (e) => {
                e.preventDefault();
                const textToCopy = node.getAttribute('data-rule');
                if (textToCopy) {
                    navigator.clipboard.writeText(textToCopy);
                    const originalText = node.textContent;
                    node.textContent = "Copied!";
                    node.style.color = "#2ed573";
                    setTimeout(() => {
                        node.textContent = originalText;
                        node.style.color = "var(--text-muted)";
                    }, 1000);
                }
            });
        });
    }

    onActivate() {
        if (typeof window.syncInvestigatorProfileUI === 'function') {
            window.syncInvestigatorProfileUI();
        }
        this.triggerLivePreviewRender();
    }

    triggerLivePreviewRender() {
        if (!this.dropdownSelector || !this.livePreviewArea) return;
        const activeTemplateKey = this.dropdownSelector.value;

        const activeTemplateText = (this.app && this.app.db && this.app.db.customTemplates)
        ? this.app.db.customTemplates[activeTemplateKey] || ''
        : (embeddedTemplatesRegistry[activeTemplateKey] || '');

        const tokenScanMap = {
            date: '[DATE]',
            suspectUser: '[SUSPECT_USERNAME]',
            victimUser: '[VICTIM_USERNAME]',
            sReason: '[S_REASON]',
            reason: '[REASON]',
            vReason: '[V_REASON]',
            evidence: '[EVIDENCE]',
            message: '[MESSAGE]'
        };

        Object.keys(this.tokenInputs).forEach(key => {
            const inputElement = this.tokenInputs[key];
            if (inputElement) {
                const wrapper = inputElement.closest('.form-group');
                if (wrapper) {
                    const targetToken = tokenScanMap[key];
                    
                    if (activeTemplateText.includes(targetToken)) {
                        wrapper.style.display = 'flex';
                    } else {
                        wrapper.style.display = 'none';
                    }
                }
            }
        });

        this.livePreviewArea.value = this.compileTemplate(activeTemplateKey);    
    }

    getValueOrDefault(element, defaultPlaceholderValue) {
        if (element && element.value.trim() !== "") {
            return element.value.trim();
        }
        return defaultPlaceholderValue;
    }

    compileTemplate(templateType) {
        let output = (this.app && this.app.db && this.app.db.customTemplates)
        ? this.app.db.customTemplates[templateType] || ''
        : (embeddedTemplatesRegistry[templateType] || '');
        
        let compiledEvidenceMarkdown = '[EVIDENCE]';
        if (this.evidenceListContainer) {
            const rows = this.evidenceListContainer.querySelectorAll('.evidence-row');
            const validLinks = [];
            
            rows.forEach((row, idx) => {
                const rawUrl = row.querySelector('.evidence-url').value.trim();
                if (rawUrl) {
                    const linkName = row.querySelector('.evidence-name').value.trim() || `Evidence ${idx + 1}`;
                    validLinks.push(`[${linkName}](${rawUrl})`);
                }
            });

            if (validLinks.length > 0) {
                compiledEvidenceMarkdown = validLinks.join(' | ');
            }
        }

        const vals = {
            date: this.getValueOrDefault(this.tokenInputs.date, '[DATE]'),
            suspectUser: this.getValueOrDefault(this.tokenInputs.suspectUser, '[SUSPECT_USERNAME]'), //This is a test comment
            victimUser: this.getValueOrDefault(this.tokenInputs.victimUser, '[VICTIM_USERNAME]'),
            sReason: this.getValueOrDefault(this.tokenInputs.sReason, '[S_REASON]'),
            reason: this.getValueOrDefault(this.tokenInputs.reason, '[REASON]'),
            vReason: this.getValueOrDefault(this.tokenInputs.vReason, '[V_REASON]'),
            evidence: compiledEvidenceMarkdown,
            message: this.getValueOrDefault(this.tokenInputs.message, '[MESSAGE]')
        };

        if (templateType === 'verdict') {
            output = output.replace(`**Victim (VICTIM_USERNAME): [INNOCENT/REASON]**`, `**Victim (VICTIM_USERNAME): [V_REASON]**`);
            output = output.replace(/\[INNOCENT\/REASON\]/g, vals.sReason);
            output = output.replace(/\[V_REASON\]/g, vals.vReason);
        }

        output = output.replace(/\[DATE\]/g, vals.date);
        output = output.replace(/\[VICTIM_USERNAME\]/g, vals.victimUser);
        output = output.replace(/\[REASON\]/g, vals.reason);
        output = output.replace(/\[SUSPECT_USERNAME\]/g, vals.suspectUser);
        
        output = output.replace(/\(SUSPECT_USERNAME\)/g, vals.suspectUser);
        output = output.replace(/\(VICTIM_USERNAME\)/g, vals.victimUser);
        
        output = output.replace(/\[EVIDENCE\]/g, vals.evidence);
        output = output.replace(/\[MESSAGE\]/g, vals.message);

        return output;
    }
}

module.exports = ClipboardModule;