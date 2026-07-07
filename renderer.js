const { ipcRenderer } = require('electron');
const { ScamCase, StorageController } = require('./src/models');
const UI = require('./src/ui');

const ClipboardModule = require('./src/modules/clipboardModule');
const IdTrackerModule = require('./src/modules/idTrackerModule');
const EvidenceModule = require('./src/modules/evidenceModule');
const BanLogModule = require('./src/modules/banLogModule');
const NotesChecklistModule = require('./src/modules/notesChecklistModule');
const SettingsModule = require('./src/modules/settingsModule');

class InvestigationPortal {
    constructor() {
        this.db = null; 
        this.currentCase = null;
        this.modules = [];
    }

    getCurrentCase() { return this.currentCase; }
    setCurrentCase(newCase) { this.currentCase = newCase; }
    
    getModule(moduleName) {
        return this.modules.find(m => m.moduleName === moduleName);
    }

    registerModules(moduleInstances) {
        this.modules = moduleInstances;
        this.modules.forEach(mod => mod.mount(this));
        this.setupTabNavigation();
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.sidebar-nav li');
        tabs.forEach(tab => {
            if (tab.closest('#settingsScreen')) return;
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.sidebar-nav li').forEach(li => {
                    if (!li.closest('#settingsScreen')) li.classList.remove('active');
                });
                e.currentTarget.classList.add('active');

                app.modules.forEach(mod => {
                    const isTarget = mod.tabElement === e.currentTarget;
                    mod.toggleVisibility(isTarget);
                    if (isTarget) mod.onActivate();
                    else mod.onDeactivate();
                });
            });
        });
    }

    init() {
        this.db = StorageController.load();

        this.registerModules([
            new ClipboardModule(),
            new IdTrackerModule(),
            new EvidenceModule(),
            new BanLogModule(),
            new NotesChecklistModule(),
            new SettingsModule()
        ]);
    }
}

const app = new InvestigationPortal();

function main() {
    app.init(); 

    let autoSaveTimeout = null;

    window.syncInvestigatorProfileUI = () => {
        const profile = app.db.investigatorProfile || {};
        const nameText = document.getElementById('badgeNameText');
        const posText = document.getElementById('badgePositionText');
        const badgePfpPreview = document.getElementById('badgePfpPreview');
        
        if (nameText) {
            nameText.textContent = (profile.name && profile.name.trim() !== '') ? profile.name : 'Setup Profile';
        }
        if (posText) {
            posText.textContent = (profile.name && profile.name.trim() !== '') ? profile.position : 'Click to configuration';
        }
        
        if (badgePfpPreview) {
            if (profile.pfpBase64 && profile.pfpBase64.trim() !== '') {
                badgePfpPreview.style.backgroundImage = `url(${profile.pfpBase64})`;
                badgePfpPreview.style.backgroundSize = "cover";
                badgePfpPreview.style.backgroundPosition = "center";
                badgePfpPreview.textContent = "";
            } else {
                badgePfpPreview.style.backgroundImage = "none";
                badgePfpPreview.style.background = "#333";
                badgePfpPreview.textContent = "🕵️‍♂️";
            }
        }
    };

    function updateSyncUIIndicator(state, message = "") {
        const dot = document.getElementById('syncStatusDot');
        const text = document.getElementById('syncStatusText');
        const timeLabel = document.getElementById('syncStatusTimestamp');
        
        if (!dot || !text) return;

        dot.style.animation = "none";

        switch (state) {
            case 'syncing':
                dot.style.background = "#ffa502";
                text.textContent = "Syncing...";
                text.style.color = "#ffa502";
                break;
            case 'success':
                dot.style.background = "#2ed573";
                text.style.color = "#2ed573";
                
                const activeCase = app.getCurrentCase();
                const activeTicketId = activeCase ? activeCase.ticketId : 'Case';
                text.textContent = `Saved to ${activeTicketId}`;
                
                if (timeLabel) {
                    const now = new Date();
                    timeLabel.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                }
                break;
            case 'error':
                dot.style.background = "#ff4757";
                text.textContent = message || "Sync Error";
                text.style.color = "#ff4757";
                
                dot.style.animation = "pulse-error 1s infinite alternate";
                if (!document.getElementById('sync-error-style')) {
                    const style = document.createElement('style');
                    style.id = 'sync-error-style';
                    style.textContent = "@keyframes pulse-error { from { opacity: 0.4; } to { opacity: 1; } }";
                    document.head.appendChild(style);
                }
                break;
            default:
                dot.style.background = "#a4b0be";
                text.textContent = "System Idle";
                text.style.color = "var(--text-muted)";
                if (timeLabel) timeLabel.textContent = "";
        }
    }

    window.triggerSilentWorkspaceAutoSave = () => {
        const currentCase = app.getCurrentCase();
        if (!currentCase || currentCase.isFinalized) return;

        updateSyncUIIndicator('syncing');

        const ticketInput = document.getElementById('ticketIdInput');
        if (ticketInput && ticketInput.value.trim()) {
            currentCase.ticketId = ticketInput.value.trim();
        }

        const lengthInput = document.getElementById('banLogLength');
        const evidenceInput = document.getElementById('banLogEvidence');
        const notesTextArea = document.getElementById('caseNotesTextArea');
        const selectedRadio = document.querySelector('input[name="todoStepGroup"]:checked');

        if (lengthInput) currentCase.banLength = lengthInput.value;
        if (evidenceInput) currentCase.evidenceLink = evidenceInput.value;
        if (notesTextArea) currentCase.notes = notesTextArea.value;
        if (selectedRadio) currentCase.currentStep = parseInt(selectedRadio.value);
        
        const activelyCheckedReasons = [];
        document.querySelectorAll('.ban-reason-check:checked').forEach(box => {
            activelyCheckedReasons.push(box.value);
        });
        currentCase.selectedRules = activelyCheckedReasons;

        const lookupId = UI.sidebarCaseId ? UI.sidebarCaseId.textContent : currentCase.ticketId;
        const idx = app.db.activeCases.findIndex(c => c.ticketId === currentCase.ticketId || c.ticketId === lookupId);
        
        if (idx !== -1) {
            app.db.activeCases[idx] = currentCase;
            StorageController.save(app.db);
            updateSyncUIIndicator('success');
        } else {
            updateSyncUIIndicator('error', "Case Unlinked");
        }
    };

    const handleWorkspaceInputQueue = () => {
        const currentCase = app.getCurrentCase();
        if (!currentCase || currentCase.isFinalized) return;
        updateSyncUIIndicator('syncing');
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => { window.triggerSilentWorkspaceAutoSave(); }, 500); 
    };

    window.addEventListener('input', handleWorkspaceInputQueue);
    window.addEventListener('change', handleWorkspaceInputQueue);

    document.getElementById('navHomeBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (app.getCurrentCase() && !app.getCurrentCase().isFinalized) {
            window.triggerSilentWorkspaceAutoSave();
        }
        app.setCurrentCase(null);
        renderPortalDashboardHub();
        UI.welcomeScreen.style.display = 'flex';
    });

    document.getElementById('destructiveDeleteCaseBtn').addEventListener('click', (e) => {
        e.preventDefault();
        const activeCase = app.getCurrentCase();
        if (!activeCase) return;

        if (confirm(`⚠️ CRITICAL WARNING:\nAre you absolutely certain you want to permanently delete Case Workspace [ ${activeCase.ticketId} ]?`)) {
            app.db.activeCases = app.db.activeCases.filter(c => c.ticketId !== activeCase.ticketId);
            app.db.finalizedCases = app.db.finalizedCases.filter(c => c.ticketId !== activeCase.ticketId);
            StorageController.save(app.db);
            app.setCurrentCase(null);
            renderPortalDashboardHub();
            UI.welcomeScreen.style.display = 'flex';
        }
    });

    document.getElementById('manualSaveBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (!app.getCurrentCase() || app.getCurrentCase().isFinalized) return;
        window.triggerSilentWorkspaceAutoSave();
        const saveBtn = document.getElementById('manualSaveBtn');
        const nativeLabelText = saveBtn.innerHTML;
        saveBtn.innerHTML = "✅ Case Payload Synchronized!";
        saveBtn.style.background = "#2ed573";
        saveBtn.style.color = "#fff";
        setTimeout(() => {
            saveBtn.innerHTML = nativeLabelText;
            saveBtn.style.background = "#ffa502";
            saveBtn.style.color = "#141419";
        }, 1200);
    });

    document.getElementById('closeCaseBtn').addEventListener('click', (e) => {
        e.preventDefault();
        const activeCase = app.getCurrentCase();
        if (!activeCase || activeCase.isFinalized) return;

        if (confirm(`Are you ready to finalize Case ${activeCase.ticketId}?`)) {
            window.triggerSilentWorkspaceAutoSave();
            app.db.activeCases = app.db.activeCases.filter(c => c.ticketId !== activeCase.ticketId);
            activeCase.isFinalized = true;
            app.db.finalizedCases.push(activeCase);
            StorageController.save(app.db);
            app.setCurrentCase(null);
            renderPortalDashboardHub();
            UI.welcomeScreen.style.display = 'flex';
        }
    });

    document.getElementById('newCaseBtn').addEventListener('click', () => {
        const freshWorkspace = new ScamCase();
        app.db.activeCases.push(freshWorkspace);
        StorageController.save(app.db);
        launchTargetInvestigationWorkspace(freshWorkspace);
    });

    function launchTargetInvestigationWorkspace(targetCaseRecord) {
        if (!targetCaseRecord) return;
        app.setCurrentCase(Object.assign(new ScamCase(), targetCaseRecord));
        const currentCase = app.getCurrentCase();
        if (UI.sidebarCaseId) UI.sidebarCaseId.textContent = currentCase.ticketId;
        
        const ticketInput = document.getElementById('ticketIdInput');
        if (ticketInput) ticketInput.value = currentCase.ticketId || '';
        
        const navTabs = document.querySelectorAll('.sidebar-nav li');
        navTabs.forEach(tab => {
            if (tab.closest('#settingsScreen')) return;
            if (tab.getAttribute('data-target') === 'idTrackerTab') tab.classList.add('active');
            else tab.classList.remove('active');
        });

        app.modules.forEach(mod => {
            const isDefaultTab = mod.moduleName === 'IdTracker';
            mod.toggleVisibility(isDefaultTab);
        });

        app.getModule('IdTracker')?.renderUI();
        const evidenceApp = app.getModule('EvidenceManager');
        if (evidenceApp) {
            evidenceApp.resetGalleryTimeline();
            if (currentCase.evidenceVideoPath) evidenceApp.loadAndMountVideoSourcePath(currentCase.evidenceVideoPath);
            if (currentCase.evidenceFrames?.length > 0) evidenceApp.renderGalleryTimeline();
        }
        app.getModule('BanLogManager')?.syncUI(currentCase);
        app.getModule('NotesChecklistManager')?.syncUI(currentCase);

        const isLocked = !!currentCase.isFinalized;
        if (ticketInput) ticketInput.disabled = isLocked;
        if (document.getElementById('addNewSuspectProfileBtn')) document.getElementById('addNewSuspectProfileBtn').disabled = isLocked;
        if (UI.closeCaseBtn) UI.closeCaseBtn.style.display = isLocked ? 'none' : 'block';
        if (UI.welcomeScreen) UI.welcomeScreen.style.display = 'none';
    }

    function renderPortalDashboardHub() {
        app.db = StorageController.load(); 
        const pContainer = document.getElementById('pendingCasesContainer');
        const fContainer = document.getElementById('finalizedCasesContainer');
        if (!pContainer || !fContainer) return;
        
        pContainer.innerHTML = ''; 
        fContainer.innerHTML = '';
        
        if (app.db.activeCases.length === 0) {
            pContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; font-style: italic; background: #15151a; padding: 15px; border-radius: 6px; border: 1px dashed var(--border);">No active investigations found.</div>`;
        } else {
            app.db.activeCases.forEach(item => pContainer.appendChild(buildDynamicPortalCaseCardElement(item, false)));
        }

        if (app.db.finalizedCases.length === 0) {
            fContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; font-style: italic; background: #15151a; padding: 15px; border-radius: 6px; border: 1px dashed var(--border);">No finalized logs discovered.</div>`;
        } else {
            app.db.finalizedCases.forEach(item => fContainer.appendChild(buildDynamicPortalCaseCardElement(item, true)));
        }
        window.syncInvestigatorProfileUI();
    }

    function buildDynamicPortalCaseCardElement(c, isArchive = false) {
        const card = document.createElement('div');
        card.style.cssText = `background: var(--bg-panel); border: 1px solid ${isArchive ? '#2ed573' : '#ffa502'}; padding: 15px; border-radius: 8px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; gap: 8px; position: relative;`;
        
        card.onmouseenter = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = `0 5px 15px rgba(0,0,0,0.4)`; };
        card.onmouseleave = () => { card.style.transform = 'none'; card.style.boxShadow = 'none'; };

        const suspectsArray = Array.isArray(c.suspects) ? c.suspects : [];
        const previewSuspect = suspectsArray[0] || { discordIds: [], robloxIds: [] };
        const discList = Array.isArray(previewSuspect.discordIds) ? previewSuspect.discordIds : [];
        const robList = Array.isArray(previewSuspect.robloxIds) ? previewSuspect.robloxIds : [];
        const dStr = discList.length > 0 ? discList.slice(0, 5).join(', ') : 'NULL';
        const rStr = robList.length > 0 ? robList.slice(0, 5).join(', ') : 'NULL';

        const isSyndicate = suspectsArray.length > 1;
        const badgeHTML = isSyndicate
            ? `<span style="font-size: 10px; background: rgba(255, 71, 87, 0.2); color: #ff4757; padding: 3px 8px; border-radius: 4px; font-weight: 900; border: 1px solid rgba(255, 71, 87, 0.3);">SYNDICATE</span>`
            : `<span style="font-size: 11px; background: ${isArchive ? 'rgba(46,213,115,0.15)' : 'rgba(255,165,2,0.15)'}; color: ${isArchive ? '#2ed573' : '#ffa502'}; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${isArchive ? 'ARCHIVE' : 'EDITABLE'}</span>`;

        const stepTagHTML = `<span style="font-size: 11px; background: rgba(52, 31, 151, 0.3); color: #9c88ff; border: 1px solid #6c5ce7; padding: 3px 8px; border-radius: 4px; font-weight: 800; font-family: monospace;">STEP ${c.currentStep || 1}</span>`;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2a2a35; padding-bottom: 6px;">
                <strong style="color: #fff; font-family: monospace; font-size: 14px;">📂 ${c.ticketId}</strong>
                <div style="display: flex; gap: 6px; align-items: center;">${stepTagHTML}${badgeHTML}</div>
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; font-size: 12px; line-height: 1.4;">
                <span style="color: var(--text-muted);">Users (S1):</span> <span style="color: #cbd5e1; font-family: monospace;">${dStr}</span>
                <span style="color: var(--text-muted);">Roblox (S1):</span> <span style="color: #cbd5e1; font-family: monospace;">${rStr}</span>
                <span style="color: var(--text-muted);">Length:</span> <span style="color: #cbd5e1;">${c.banLength || 'NULL'}</span>
                <span style="color: var(--text-muted);">Reason:</span> <span style="color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;">${c.selectedRules?.join(' | ') || 'NULL'}</span>
            </div>
        `;

        card.onclick = () => launchTargetInvestigationWorkspace(c);
        return card;
    }

    renderPortalDashboardHub();
}

window.addEventListener('DOMContentLoaded', main);