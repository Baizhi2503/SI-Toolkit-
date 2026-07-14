const BaseModule = require('../core/BaseModule');

class IdTrackerModule extends BaseModule {
    constructor() {
        super('IdTracker', 'idTrackerTab', 'idTrackerTab');
    }

    onInit() {
        this.idInput = document.getElementById('idInput');
        this.ticketInput = document.getElementById('ticketIdInput');
        this.addSuspectBtn = document.getElementById('addNewSuspectProfileBtn');
        this.sidebarCaseId = document.getElementById('sidebarCaseId');
        this.discordChips = document.getElementById('discordChipsContainer') || document.querySelector('.chip-container.discord');
        this.robloxChips = document.getElementById('robloxChipsContainer') || document.querySelector('.chip-container.roblox');

        this.setupListeners();
    }

    setupListeners() {
        if (this.idInput) {
            this.idInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const inputVal = e.target.value.trim();
                    const currentCase = this.app.getCurrentCase();
                    
                    if (inputVal && currentCase && !currentCase.isFinalized) {
                        currentCase.addIdentity(inputVal);
                        e.target.value = '';
                        this.renderChips(currentCase);
                        
                        if (typeof window.triggerSilentWorkspaceAutoSave === 'function') {
                            window.triggerSilentWorkspaceAutoSave();
                        }
                    }
                }
            });
        }

        if (this.ticketInput) {
            this.ticketInput.addEventListener('input', (e) => {
                const currentCase = this.app.getCurrentCase();
                if (!currentCase || currentCase.isFinalized) return;
                
                currentCase.ticketId = e.target.value || 'unnamed-ticket';
                if (this.sidebarCaseId) this.sidebarCaseId.textContent = currentCase.ticketId;
            });
        }

        if (this.addSuspectBtn) {
            this.addSuspectBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const currentCase = this.app.getCurrentCase();
                if (!currentCase || currentCase.isFinalized) return;

                currentCase.addNewSuspect();
                this.renderSuspectDossierTabs(currentCase);
                this.renderChips(currentCase);

                if (typeof window.triggerSilentWorkspaceAutoSave === 'function') {
                    window.triggerSilentWorkspaceAutoSave();
                }
            });
        }
    }

    onActivate() {
        this.renderUI();
    }

    renderUI() {
        const currentCase = this.app.getCurrentCase();
        if (!currentCase) return;

        this.renderSuspectDossierTabs(currentCase);
        this.renderChips(currentCase);
    }

    renderSuspectDossierTabs(currentCase) {
        const tabsContainer = document.getElementById('suspectProfileTabsContainer');
        if (!tabsContainer || !currentCase) return;

        tabsContainer.innerHTML = '';

        currentCase.suspects.forEach((suspect) => {
            const isActive = currentCase.activeSuspectId === suspect.id;
            
            const tabWrapper = document.createElement('div');
            tabWrapper.style.cssText = `
                display: flex; align-items: center; 
                background: ${isActive ? 'var(--theme-glow)' : '#1e1e28'};
                border: 1px solid ${isActive ? 'var(--theme-accent)' : '#2a2a38'}; 
                border-radius: 4px; overflow: hidden;
                box-shadow: ${isActive ? '0 2px 6px var(--theme-glow)' : 'none'};
            `;

            const selectorBtn = document.createElement('button');
            selectorBtn.textContent = suspect.name;
            selectorBtn.style.cssText = `
                background: none; border: none; color: ${isActive ? '#fff' : 'var(--text-muted)'};
                padding: 6px 12px; font-size: 12px; font-weight: bold; cursor: pointer;
            `;
            selectorBtn.onclick = (e) => {
                e.preventDefault();
                currentCase.activeSuspectId = suspect.id;
                this.renderSuspectDossierTabs(currentCase);
                this.renderChips(currentCase);
            };
            tabWrapper.appendChild(selectorBtn);

            if (currentCase.suspects.length > 1 && !currentCase.isFinalized) {
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '&times;';
                deleteBtn.style.cssText = `
                    background: none; border: none; border-left: 1px solid ${isActive ? 'var(--theme-accent)' : '#2a2a38'};
                    color: var(--theme-accent); padding: 6px 8px; font-size: 14px; font-weight: bold; cursor: pointer;
                `;
                deleteBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    currentCase.removeSuspect(suspect.id);
                    this.renderSuspectDossierTabs(currentCase);
                    this.renderChips(currentCase);
                    if (typeof window.triggerSilentWorkspaceAutoSave === 'function') {
                        window.triggerSilentWorkspaceAutoSave();
                    }
                };
                tabWrapper.appendChild(deleteBtn);
            }

            tabsContainer.appendChild(tabWrapper);
        });
        
        const label = document.getElementById('activeSuspectInputLabel');
        const currentSuspect = currentCase.suspects.find(s => s.id === currentCase.activeSuspectId);
        if (label && currentSuspect) {
            label.textContent = `Paste IDs for Active Target Dossier Container: [ ${currentSuspect.name} ]`;
        }
    }

    renderChips(currentCase) {
        if (!this.discordChips || !this.robloxChips) return;

        if (document.getElementById('suspectProfileTabsContainer')?.children.length === 0) {
            this.renderSuspectDossierTabs(currentCase);
        }

        this.discordChips.innerHTML = '';
        this.robloxChips.innerHTML = '';
        
        const currentSuspect = currentCase.suspects.find(s => s.id === currentCase.activeSuspectId);
        if (!currentSuspect) return;

        currentSuspect.discordIds.forEach(id => this.discordChips.appendChild(this.createChipElement(currentCase, 'discord', id)));
        currentSuspect.robloxIds.forEach(id => this.robloxChips.appendChild(this.createChipElement(currentCase, 'roblox', id)));
    }

    createChipElement(currentCase, type, id) {
        const chip = document.createElement('div');
        chip.className = `chip ${type}`;
        
        const prefixIcon = (type === 'discord') ? '💬' : '🎮';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = `${prefixIcon} ${id}`;
        chip.appendChild(textSpan);

        const copyBtn = document.createElement('span');
        copyBtn.className = 'copy-btn-node';
        copyBtn.innerHTML = ' 📋';
        copyBtn.style.cssText = "font-size: 11px; margin-left: 4px; display: inline-block; cursor: pointer;";
        
        copyBtn.onclick = (e) => {
            e.stopPropagation(); 
            navigator.clipboard.writeText(id);
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = ' ✅';
            setTimeout(() => copyBtn.innerHTML = originalText, 800);
        };
        chip.appendChild(copyBtn);

        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-x';
        removeBtn.innerHTML = ' &times;';
        removeBtn.style.cursor = 'pointer';

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentCase.isFinalized) return;

            currentCase.removeIdentity(type, id);
            this.renderChips(currentCase);

            if (typeof window.triggerSilentWorkspaceAutoSave === 'function') {
                window.triggerSilentWorkspaceAutoSave();
            }
        });
        chip.appendChild(removeBtn);

        return chip;
    }
}

module.exports = IdTrackerModule;