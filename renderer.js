const { ipcRenderer } = require('electron');
const { ScamCase, StorageController } = require('./src/models');
const UI = require('./src/ui');

const ClipboardModule = require('./src/modules/clipboardModule');
const IdTrackerModule = require('./src/modules/idTrackerModule');
const EvidenceModule = require('./src/modules/evidenceModule');
const BanLogModule = require('./src/modules/banLogModule');
const NotesChecklistModule = require('./src/modules/notesChecklistModule');
const SettingsModule = require('./src/modules/settingsModule');

const { buildDynamicGroupContainerCard, attachCardGroupingDragListeners, checkAndDissolveGroup } = require('./src/components/DashboardHubComponent');
const ThemeEngine = require('./src/engines/themeEngine');

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
window.app = app;

function main() {
    app.init();

    const savedThemeId = (app.db.investigatorProfile && app.db.investigatorProfile.activeTheme) ? app.db.investigatorProfile.activeTheme : 'red';
    ThemeEngine.applyTheme(savedThemeId);

    let autoSaveTimeout = null;
    const globalLoader = document.getElementById('portalGlobalLoadingScreen');

    window.executeWithLoadingOverlay = (taskCallback) => {
        if (!globalLoader) {
            taskCallback();
            return;
        }
        
        globalLoader.style.display = 'flex';
        globalLoader.style.opacity = '1';
        
        setTimeout(() => {
            try {
                taskCallback();
            } catch (err) {
                console.error("Navigation Runtime Error:", err);
            } finally {
                globalLoader.style.opacity = '0';
                setTimeout(() => {
                    globalLoader.style.display = 'none';
                }, 200);
            }
        }, 50);
    };

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
                dot.style.background = "var(--theme-accent)";
                text.textContent = message || "Sync Error";
                text.style.color = "var(--theme-accent)";
                
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
        if (!currentCase || currentCase.isFinalized) return; //This is a test comment

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
        
        let savedSuccessfully = false;
        for (let i = 0; i < app.db.activeCases.length; i++) {
            let item = app.db.activeCases[i];
            if (item.type === 'group') {
                let innerIdx = item.cases.findIndex(c => c.ticketId === currentCase.ticketId || c.ticketId === lookupId);
                if (innerIdx !== -1) {
                    item.cases[innerIdx] = currentCase;
                    savedSuccessfully = true;
                    break;
                }
            } else if (item.ticketId === currentCase.ticketId || item.ticketId === lookupId) {
                app.db.activeCases[i] = currentCase;
                savedSuccessfully = true;
                break;
            }
        }

        if (savedSuccessfully) {
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
        
        window.executeWithLoadingOverlay(() => {
            if (app.getCurrentCase() && !app.getCurrentCase().isFinalized) {
                window.triggerSilentWorkspaceAutoSave();
            }
            app.setCurrentCase(null);
            renderPortalDashboardHub();
            UI.welcomeScreen.style.display = 'flex';
        });
    });

    document.getElementById('destructiveDeleteCaseBtn').addEventListener('click', (e) => {
        e.preventDefault();
        const activeCase = app.getCurrentCase();
        if (!activeCase) return;

        if (confirm(`⚠️ CRITICAL WARNING:\nAre you absolutely certain you want to permanently delete Case Workspace [ ${activeCase.ticketId} ]?`)) {

            window.executeWithLoadingOverlay(() => {
                for (let i = app.db.activeCases.length - 1; i >= 0; i--) {
                    let item = app.db.activeCases[i];
                    if (item.type === 'group') {
                        item.cases = item.cases.filter(child => child.ticketId !== activeCase.ticketId); //This is a test comment
                        checkAndDissolveGroup(app, i, false); 
                    } else if (item.ticketId === activeCase.ticketId) {
                        app.db.activeCases.splice(i, 1);
                    }
                }

                for (let i = app.db.finalizedCases.length - 1; i >= 0; i--) {
                    let item = app.db.finalizedCases[i];
                    if (item.type === 'group') {
                        item.cases = item.cases.filter(child => child.ticketId !== activeCase.ticketId);
                        checkAndDissolveGroup(app, i, true);
                    } else if (item.ticketId === activeCase.ticketId) {
                        app.db.finalizedCases.splice(i, 1);
                    }
                }

                StorageController.save(app.db);
                app.setCurrentCase(null);
                renderPortalDashboardHub();
                UI.welcomeScreen.style.display = 'flex';
            });
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
            saveBtn.style.background = "var(--theme-glow)";
            saveBtn.style.color = "var(--theme-accent)";
        }, 1200);
    });

    document.getElementById('closeCaseBtn').addEventListener('click', (e) => {
        e.preventDefault();
        const activeCase = app.getCurrentCase();
        if (!activeCase || activeCase.isFinalized) return;

        if (confirm(`Are you ready to finalize Case ${activeCase.ticketId}?`)) {

            window.executeWithLoadingOverlay(() => {
                window.triggerSilentWorkspaceAutoSave();

                let parentGroupIdx = app.db.activeCases.findIndex(item => 
                    item.type === 'group' && item.cases.some(c => c.ticketId === activeCase.ticketId)
                );

                if (parentGroupIdx !== -1) {
                    const group = app.db.activeCases[parentGroupIdx];
                    const targetCaseInGroup = group.cases.find(c => c.ticketId === activeCase.ticketId);

                    if (targetCaseInGroup) targetCaseInGroup.isFinalized = true;
                    const allCasesDone = group.cases.every(c => c.isFinalized);

                    if (allCasesDone) {
                        app.db.activeCases.splice(parentGroupIdx, 1);
                        group.isFinalized = true;
                        app.db.finalizedCases.push(group);
                        setTimeout(() => alert(`🔥 Serial suspects sweep complete! Entire group [ ${group.title} ] migrated to Finalized logs.`), 50);
                    } else {
                        setTimeout(() => alert(`🏁 Card marked [DONE]! Sibling tickets are still pending under this group stack.`), 50);
                    }
                } else {
                    app.db.activeCases = app.db.activeCases.filter(c => c.ticketId !== activeCase.ticketId);
                    activeCase.isFinalized = true;
                    app.db.finalizedCases.push(activeCase);
                }

                StorageController.save(app.db);
                app.setCurrentCase(null);
                renderPortalDashboardHub();
                UI.welcomeScreen.style.display = 'flex';
            });
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

        window.executeWithLoadingOverlay(() => {

            updateSyncUIIndicator('default');

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
        });
    }

    window.renderPortalDashboardHub = function() {
        app.db = StorageController.load();
        const pContainer = document.getElementById('pendingCasesContainer');
        const fContainer = document.getElementById('finalizedCasesContainer');
        const dashboardLayout = document.getElementById('portalDashboardLayout');
        const newCaseBtn = document.getElementById('newCaseBtn');
        
        const profileBadge = document.getElementById('investigatorProfileBadge');
        const onboardingCard = document.getElementById('onboardingCardView');
        const coreDashboardWrapper = document.getElementById('dashboardCoreLayoutWrapper');

        if (!pContainer || !fContainer) return;
        
        fContainer.innerHTML = '';
        pContainer.innerHTML = '';
        
        pContainer.style.backgroundColor = "transparent";
        fContainer.style.backgroundColor = "transparent";
        
        const isNewUser = !app.db.investigatorProfile.name || app.db.investigatorProfile.name.trim() === '';
        
        if (isNewUser) {
            if (coreDashboardWrapper) coreDashboardWrapper.style.display = 'none';
            if (profileBadge) profileBadge.style.display = 'none';

            if (onboardingCard) {
                onboardingCard.style.display = 'flex';

                const proceedBtn = document.getElementById('onboardingProceedBtn');
                if (proceedBtn) {
                    proceedBtn.onclick = (e) => {
                        e.preventDefault();
                        const settingsMod = app.getModule('SettingsManager');
                        if (settingsMod && typeof settingsMod.launchSettingsOverlay === 'function') {
                            settingsMod.launchSettingsOverlay();
                        }
                    };
                }
            }
        } else {
            if (onboardingCard) onboardingCard.style.display = 'none';
            if (coreDashboardWrapper) coreDashboardWrapper.style.display = 'flex';
            if (profileBadge) profileBadge.style.display = 'flex';

            if (dashboardLayout) dashboardLayout.style.display = 'grid';
            if (newCaseBtn) newCaseBtn.style.display = 'block';

            if (app.db.activeCases.length === 0) {
                pContainer.innerHTML = `
                    <div style="color: var(--text-muted); font-size: 13px; font-style: italic; background: var(--theme-panel-tint); padding: 15px; border-radius: 6px; border: 1px dashed var(--border);">
                        No active investigations found.
                    </div>
                `;

                let emptyStateBanner = document.getElementById('dashboardEmptyStateBanner');
                if (!emptyStateBanner) {
                    emptyStateBanner = document.createElement('div');
                    emptyStateBanner.id = 'dashboardEmptyStateBanner';
                    emptyStateBanner.style.cssText = `
                        grid-column: 1 / -1;
                        text-align: center;
                        padding: 60px 20px;
                        margin-top: 40px;
                        background: var(--theme-panel-tint);
                        border: 1px solid var(--border);
                        border-radius: 12px;
                        font-family: monospace;
                    `;
                    emptyStateBanner.innerHTML = `
                        <h2 style="color: var(--theme-accent); font-size: 20px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 8px;">
                            Ready to begin the hunt?
                        </h2>
                        <p style="color: var(--theme-text-tint); font-size: 14px; font-weight: 600;">
                            Click <span style="background: var(--theme-gradient); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; font-size: 12px; font-weight: bold;">New Case</span> to start hunting!!!
                        </p>
                    `;
                    dashboardLayout.appendChild(emptyStateBanner);
                } else {
                    emptyStateBanner.style.display = 'block';
                }
            } else {
                const emptyStateBanner = document.getElementById('dashboardEmptyStateBanner');
                if (emptyStateBanner) emptyStateBanner.remove();

                app.db.activeCases.forEach((item, index) => {
                    if (item.type === 'group') {
                        const groupCard = buildDynamicGroupContainerCard(item, index, buildDynamicPortalCaseCardElement);
                        pContainer.appendChild(groupCard);
                    } else {
                        const card = buildDynamicPortalCaseCardElement(item, false, false);
                        attachCardGroupingDragListeners(card, item.ticketId);
                        pContainer.appendChild(card);
                    }
                });
            }

            if (app.db.finalizedCases.length === 0) {
                fContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; font-style: italic; background: var(--theme-panel-tint); padding: 15px; border-radius: 6px; border: 1px dashed var(--border);">No finalized logs discovered.</div>`;
            } else {
                app.db.finalizedCases.forEach((item, index) => {
                    if (item.type === 'group') {
                        const groupCard = buildDynamicGroupContainerCard(item, index, buildDynamicPortalCaseCardElement);
                        fContainer.appendChild(groupCard);
                    } else {
                        fContainer.appendChild(buildDynamicPortalCaseCardElement(item, true, false));
                    }
                });
            }
        }

        window.syncInvestigatorProfileUI();
    };

    const makeRootContainerZoneDropable = (elementId, isArchive) => {
        const zone = document.getElementById(elementId);
        if (!zone) return;

        zone.style.minHeight = "400px";
        zone.style.transition = "background-color 0.2s ease, border-color 0.2s ease";

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.style.backgroundColor = isArchive ? "rgba(46, 213, 115, 0.03)" : "var(--theme-glow)";
            zone.style.borderRadius = "8px";
        });

        zone.addEventListener('dragleave', () => {
            zone.style.backgroundColor = "transparent";
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.backgroundColor = "transparent";

            const draggedId = e.dataTransfer.getData('text/plain');
            const sourceGroupId = e.dataTransfer.getData('source-parent-group');

            if (!draggedId || !sourceGroupId || isArchive) return;

            const listTarget = app.db.activeCases;
            const groupIdx = listTarget.findIndex(g => g.id === sourceGroupId);

            if (groupIdx !== -1) {
                const group = listTarget[groupIdx];
                const caseIdx = group.cases.findIndex(c => c.ticketId === draggedId);

                if (caseIdx !== -1) {
                    const caseObj = group.cases.splice(caseIdx, 1)[0];
                    caseObj.isFinalized = false;
                    listTarget.push(caseObj);

                    checkAndDissolveGroup(app, groupIdx, false);
                    StorageController.save(app.db);
                    renderPortalDashboardHub();
                }
            }
        });
    };

    makeRootContainerZoneDropable('pendingCasesContainer', false);
    makeRootContainerZoneDropable('finalizedCasesContainer', true);

    function buildDynamicPortalCaseCardElement(c, isArchive = false, isGroupChild = false) {
        const card = document.createElement('div');

        let borderColor = 'var(--theme-accent)';
        if (isArchive) borderColor = 'var(--theme-accent-dark)';
        else if (isGroupChild) borderColor = 'var(--theme-accent)';

        card.style.cssText = `background: var(--theme-panel-tint); border: 1px solid ${borderColor}; padding: 15px; border-radius: 8px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; gap: 8px; position: relative; box-shadow: 0 4px 12px var(--theme-glow); color: var(--theme-text-tint);`;

        card.onmouseenter = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = `0 6px 18px var(--theme-glow)`; };
        card.onmouseleave = () => { card.style.transform = 'none'; card.style.boxShadow = '0 4px 12px var(--theme-glow)'; };

        const suspectsArray = Array.isArray(c.suspects) ? c.suspects : [];
        const previewSuspect = suspectsArray[0] || { discordIds: [], robloxIds: [] };
        const discList = Array.isArray(previewSuspect.discordIds) ? previewSuspect.discordIds : [];
        const robList = Array.isArray(previewSuspect.robloxIds) ? previewSuspect.robloxIds : [];
        const dStr = discList.length > 0 ? discList.slice(0, 5).join(', ') : 'NULL';
        const rStr = robList.length > 0 ? robList.slice(0, 5).join(', ') : 'NULL';

        const isSyndicate = suspectsArray.length > 1;

        let badgeHTML = '';
        if (isSyndicate) {
            badgeHTML = `<span style="font-size: 10px; background: rgba(0, 0, 0, 0.25); color: var(--theme-accent-dark); padding: 3px 8px; border-radius: 4px; font-weight: 900; border: 1px solid var(--theme-accent-dark);">SYNDICATE</span>`;
        } else if (isArchive) {
            badgeHTML = `<span style="font-size: 11px; background: var(--theme-glow); color: var(--theme-accent); padding: 3px 8px; border-radius: 4px; font-weight: bold; border: 1px solid var(--theme-border);">ARCHIVED</span>`;
        } else if (isGroupChild) {
            const badgeText = c.isFinalized ? 'DONE' : 'SERIAL';
            const badgeBg = c.isFinalized ? 'var(--theme-glow)' : 'rgba(0, 0, 0, 0.25)';
            const badgeColor = c.isFinalized ? 'var(--theme-accent)' : 'var(--theme-accent-dark)';
            const badgeBorder = c.isFinalized ? 'var(--theme-border)' : 'var(--theme-accent-dark)';

            badgeHTML = `
                <div style="display: flex; gap: 6px; align-items: center;">
                    <span style="font-size: 11px; background: ${badgeBg}; color: ${badgeColor}; padding: 3px 8px; border-radius: 4px; font-weight: bold; border: 1px solid ${badgeBorder};">${badgeText}</span>
                    <button class="breakout-case-btn" title="Remove from Group" style="background: #222; border: 1px solid var(--border); color: #70a1ff; cursor: pointer; padding: 2px 6px; border-radius: 4px; font-size: 11px; transition: background 0.2s;">📤</button>
                </div>
            `;
        } else {
            badgeHTML = `<span style="font-size: 11px; background: var(--theme-glow); color: var(--theme-accent); padding: 3px 8px; border-radius: 4px; font-weight: bold; border: 1px solid var(--theme-border);">EDITABLE</span>`;
        }

        const stepTagHTML = `<span style="font-size: 11px; background: var(--theme-glow); color: var(--theme-accent); border: 1px solid var(--theme-border); padding: 3px 8px; border-radius: 4px; font-weight: 800; font-family: monospace;">STEP ${c.currentStep || 1}</span>`;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 6px;">
                <strong style="color: var(--theme-text-tint); font-family: monospace; font-size: 14px; display: inline-flex; align-items: center;">
                    <svg class="hifi-icon" viewBox="0 0 24 24" style="color: var(--theme-accent); width: 16px; height: 16px;">
                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                    </svg>
                    ${c.ticketId}
                </strong>
                <div style="display: flex; gap: 6px; align-items: center;">${stepTagHTML}${badgeHTML}</div>
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; font-size: 12px; line-height: 1.4;">
                <span style="color: var(--text-muted);">Users (S1):</span> <span style="color: var(--theme-text-tint); font-family: monospace;">${dStr}</span>
                <span style="color: var(--text-muted);">Roblox (S1):</span> <span style="color: var(--theme-text-tint); font-family: monospace;">${rStr}</span>
                <span style="color: var(--text-muted);">Length:</span> <span style="color: var(--theme-text-tint);">${c.banLength || 'NULL'}</span>
                <span style="color: var(--text-muted);">Reason:</span> <span style="color: var(--theme-text-tint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;">${c.selectedRules?.join(' | ') || 'NULL'}</span>
            </div>
        `;

        const breakoutBtn = card.querySelector('.breakout-case-btn');
        if (breakoutBtn) {
            breakoutBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const listTarget = app.db.activeCases;
                const groupIdx = listTarget.findIndex(item => item.type === 'group' && item.cases.some(child => child.ticketId === c.ticketId));

                if (groupIdx !== -1) {
                    const group = listTarget[groupIdx];
                    const caseIdx = group.cases.findIndex(child => child.ticketId === c.ticketId);

                    if (caseIdx !== -1) {
                        const extractedCase = group.cases.splice(caseIdx, 1)[0];
                        extractedCase.isFinalized = false;
                        listTarget.push(extractedCase);

                        checkAndDissolveGroup(app, groupIdx, false);
                        StorageController.save(app.db);
                        renderPortalDashboardHub();
                    }
                }
            };

            breakoutBtn.onmouseenter = () => breakoutBtn.style.background = "#334155";
            breakoutBtn.onmouseleave = () => breakoutBtn.style.background = "#222";
        }

        card.onclick = () => launchTargetInvestigationWorkspace(c);
        return card;
    }

    window.renderPortalDashboardHub();
}

window.addEventListener('DOMContentLoaded', main);