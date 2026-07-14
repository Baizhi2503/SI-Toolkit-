const BaseModule = require('../core/BaseModule');
const { StorageController } = require('../models');
const ThemeEngine = require('../engines/themeEngine');

class SettingsModule extends BaseModule {
    constructor() {
        super('SettingsManager', null, 'settingsScreen');
        this.temporaryPfpBase64 = "";
    }

    onInit() {
        this.settingsScreen = document.getElementById('settingsScreen');
        this.profileBadge = document.getElementById('investigatorProfileBadge');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.cancelSettingsBtn = document.getElementById('cancelSettingsBtn');

        this.setProfileName = document.getElementById('settingsProfileNameInput');
        this.setProfilePos = document.getElementById('settingsProfilePositionSelect');
        this.setTplVictim = document.getElementById('settingsTemplateVictimDm');
        this.setTplSuspect = document.getElementById('settingsTemplateSuspectDm');
        this.setTplVerdict = document.getElementById('settingsTemplateVerdict');
        this.settingsTemplateSelectorDropdown = document.getElementById('settingsTemplateSelectorDropdown');

        this.pfpClickCircle = document.getElementById('settingsPfpClickCircle');
        this.pfpHiddenInput = document.getElementById('settingsPfpHiddenFileInput');
        this.pfpImageDisplay = document.getElementById('settingsPfpImage');
        this.pfpPlaceholderEmoji = document.getElementById('settingsPfpPlaceholderEmoji');

        this.initializeDedicatedThemesTabStructure();
        this.setupSettingsListeners();
    }

    initializeDedicatedThemesTabStructure() {
        const subNav = document.getElementById('settingsSubNav');
        const profileTab = document.getElementById('settingsProfileTab');
        
        if (!subNav || !profileTab || document.getElementById('settingsThemesTab')) return;

        const themeLi = document.createElement('li');
        themeLi.setAttribute('data-settings-target', 'settingsThemesTab');
        themeLi.style.cursor = 'pointer';
        themeLi.style.display = 'inline-flex';
        themeLi.style.alignItems = 'center';
        themeLi.style.gap = '6px';
        themeLi.innerHTML = `
            <svg class="hifi-icon" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-8 4.03-8 8 0 .73.11 1.42.3 2.06.12.4.6.59.96.32l1.09-.82c.42-.31.98-.32 1.41-.01l1.51 1.06c.41.29.95.27 1.34-.04l1.32-1.05c.42-.33 1.01-.3 1.39.07l1.52 1.48c.31.3.78.36 1.15.15l2.45-1.36c.43-.24.63-.76.43-1.22C19.46 9.8 16.48 3 12 3zm-4.5 6c-.83 0-1.5-.67-1.5-1.5S6.67 6 7.5 6s1.5.67 1.5 1.5S8.33 9 7.5 9zm3.5 4c-.83 0-1.5-.67-1.5-1.5S10.17 10 11 10s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-6c-.83 0-1.5-.67-1.5-1.5S10.17 4 11 4s1.5.67 1.5 1.5S11.83 7 11.5 7zm4.5 4c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
            Interface Themes`;
        subNav.appendChild(themeLi);

        const themesTabPanel = document.createElement('div');
        themesTabPanel.id = 'settingsThemesTab';
        themesTabPanel.className = 'settings-view-panel';
        themesTabPanel.style.cssText = 'display: none; flex-direction: column; gap: 20px; width: 100%; font-family: monospace; padding: 10px; box-sizing: border-box;';

        themesTabPanel.innerHTML = `
            <div style="border-bottom: 1px solid #2a2a35; padding-bottom: 12px; margin-bottom: 5px;">
                <h2 style="color: #fff; font-size: 20px; font-weight: bold; border: none; margin: 0; padding: 0;">Operational Interface Themes</h2>
                <p style="color: var(--text-muted); font-size: 13px; margin: 6px 0 0 0;">Hot-swap core layout tokens to match your active hidden department profiles.</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1.2fr 1.8fr; gap: 40px; align-items: start; margin-top: 10px;">
                <div style="display: flex; flex-direction: column; gap: 14px;">
                    <span style="color: var(--text-muted); font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Select Department Palette</span>
                    <div id="themeOptionsNodeGrid" style="display: flex; flex-direction: column; gap: 12px;"></div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 14px;">
                    <span style="color: var(--text-muted); font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Live Viewport Component Preview</span>
                    
                    <div style="background: #0d0d12; border: 1px solid #252530; padding: 30px; border-radius: 12px; display: flex; flex-direction: column; gap: 20px; box-shadow: inset 0 4px 20px rgba(0,0,0,0.6);">
                        <div id="mockPreviewCaseBox" style="background: #141419; border: 2px solid var(--theme-accent); border-radius: 10px; padding: 22px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 8px 24px var(--theme-glow); transition: all 0.3s ease-in-out;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2a2a35; padding-bottom: 12px;">
                                <strong style="color: #fff; font-size: 15px; font-family: monospace; letter-spacing: 0.5px;">📂 case-1783466336208</strong>
                                <span style="font-size: 11px; background: var(--theme-gradient); color: #fff; padding: 4px 10px; border-radius: 6px; font-weight: bold; letter-spacing: 0.5px; box-shadow: 0 2px 6px var(--theme-glow);">WORKSPACE ACTIVE</span>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 13px; line-height: 1.5; font-family: sans-serif;">
                                <span style="color: var(--text-muted);">Users (S1):</span> <span style="color: #cbd5e1; font-family: monospace; font-weight: bold;">1512826801477652682</span>
                                <span style="color: var(--text-muted);">Roblox (S1):</span> <span style="color: #cbd5e1; font-family: monospace; font-weight: bold;">5066314187</span>
                                <span style="color: var(--text-muted);">Ban Length:</span> <span style="color: #cbd5e1;">Permanent Sweep</span>
                                <span style="color: var(--text-muted);">Reason:</span> <span style="color: #cbd5e1; font-style: italic;">2.2.1: Cross-Trade Compromise String</span>
                            </div>
                            
                            <button style="margin-top: 8px; width: 100%; background: var(--theme-gradient); border: none; color: #fff; padding: 12px; border-radius: 6px; font-size: 13px; font-weight: bold; font-family: monospace; cursor: not-allowed; box-shadow: 0 4px 10px var(--theme-glow); transition: all 0.2s;">
                                Synchronize Case Payload
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        profileTab.parentNode.appendChild(themesTabPanel);

        const optionsGrid = document.getElementById('themeOptionsNodeGrid');
        ThemeEngine.getAvailableThemes().forEach(t => { //This is a test comment
            const btn = document.createElement('button');
            btn.style.cssText = 'background: #161622; border: 1px solid #2a2a38; color: #cbd5e1; padding: 16px 20px; border-radius: 8px; cursor: pointer; text-align: left; font-size: 14px; font-weight: bold; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s ease-in-out; font-family: monospace;';
            
            btn.innerHTML = `
                <span style="letter-spacing: 0.5px;">${t.name}</span>
                <span style="width: 16px; height: 16px; border-radius: 50%; background: ${t.gradient}; display: inline-block; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 2px 4px rgba(0,0,0,0.4);"></span>
            `;

            btn.onclick = (e) => {
                e.preventDefault();
                ThemeEngine.applyTheme(t.id);
                
                if (this.app && this.app.db) {
                    this.app.db.investigatorProfile.activeTheme = t.id;
                    StorageController.save(this.app.db);
                }
                this.syncThemesSelectionRings(optionsGrid);
            };

            optionsGrid.appendChild(btn);
        });

        this.syncThemesSelectionRings(optionsGrid);
    }

    syncThemesSelectionRings(optionsGridContainer) {
        const targetGrid = optionsGridContainer || document.getElementById('themeOptionsNodeGrid');
        if (!targetGrid) return;

        const buttons = targetGrid.querySelectorAll('button');
        ThemeEngine.getAvailableThemes().forEach((t, i) => {
            const buttonElement = buttons[i];
            if (!buttonElement) return;

            if (t.id === ThemeEngine.activeThemeId) {
                buttonElement.style.borderColor = 'var(--theme-accent)';
                buttonElement.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                buttonElement.style.transform = 'translateX(4px)';
                buttonElement.style.boxShadow = '0 4px 12px var(--theme-glow)';
            } else {
                buttonElement.style.borderColor = '#2a2a38';
                buttonElement.style.backgroundColor = '#161622';
                buttonElement.style.transform = 'none';
                buttonElement.style.boxShadow = 'none';
            }
        });
    }

    setupSettingsListeners() {
        if (this.profileBadge) {
            this.profileBadge.addEventListener('click', (e) => {
                e.preventDefault();
                this.launchSettingsOverlay();
            });
        }

        if (this.pfpClickCircle && this.pfpHiddenInput) {
            this.pfpClickCircle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.pfpHiddenInput.click();
            });
        }

        if (this.pfpHiddenInput) {
            this.pfpHiddenInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.temporaryPfpBase64 = event.target.result;
                        this.updatePfpPreviewState(this.temporaryPfpBase64);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        const settingsTabs = document.querySelectorAll('#settingsSubNav li');
        settingsTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                settingsTabs.forEach(li => li.classList.remove('active'));
                document.querySelectorAll('.settings-view-panel').forEach(panel => panel.style.display = 'none');
                
                tab.classList.add('active');
                
                const targetId = tab.getAttribute('data-settings-target');
                const targetPanel = document.getElementById(targetId);
                if (targetPanel) {
                    targetPanel.style.display = 'flex';
                }
            });
        });

        if (this.settingsTemplateSelectorDropdown) {
            this.settingsTemplateSelectorDropdown.addEventListener('change', (e) => {
                const val = e.target.value;
                document.getElementById('settingsTplVictimWrapper').style.display = val === 'victimDm' ? 'flex' : 'none';
                document.getElementById('settingsTplSuspectWrapper').style.display = val === 'suspectDm' ? 'flex' : 'none';
                document.getElementById('settingsTplVerdictWrapper').style.display = val === 'verdict' ? 'flex' : 'none';
            });
        }

        if (this.closeSettingsBtn) {
            this.closeSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.executeWithLoadingOverlay(() => {
                    this.saveSettingsPayload();
                });
            });
        }

        if (this.cancelSettingsBtn) {
            this.cancelSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.executeWithLoadingOverlay(() => {
                    this.settingsScreen.style.display = 'none';
                });
            });
        }
    }

    launchSettingsOverlay() {
        const currentDbState = this.app.db;
        this.setProfileName.value = currentDbState.investigatorProfile.name || '';
        this.setProfilePos.value = currentDbState.investigatorProfile.position || 'Trial Scam Investigator';
        this.setTplVictim.value = currentDbState.customTemplates.victimDm || '';
        this.setTplSuspect.value = currentDbState.customTemplates.suspectDm || '';
        this.setTplVerdict.value = currentDbState.customTemplates.verdict || '';
        
        this.temporaryPfpBase64 = currentDbState.investigatorProfile.pfpBase64 || "";
        this.updatePfpPreviewState(this.temporaryPfpBase64);

        const settingsTabs = document.querySelectorAll('#settingsSubNav li');
        settingsTabs.forEach((li, idx) => {
            if (idx === 0) li.classList.add('active');
            else li.classList.remove('active');
        });
        
        document.getElementById('settingsProfileTab').style.display = 'flex';
        document.getElementById('settingsTemplatesTab').style.display = 'none';
        
        const themesPanel = document.getElementById('settingsThemesTab');
        if (themesPanel) themesPanel.style.display = 'none';

        if (this.settingsTemplateSelectorDropdown) this.settingsTemplateSelectorDropdown.value = 'victimDm';
        document.getElementById('settingsTplVictimWrapper').style.display = 'flex';
        document.getElementById('settingsTplSuspectWrapper').style.display = 'none';
        document.getElementById('settingsTplVerdictWrapper').style.display = 'none';

        this.syncThemesSelectionRings();
        this.settingsScreen.style.display = 'flex';
    }

    updatePfpPreviewState(base64Data) {
        if (this.pfpImageDisplay && this.pfpPlaceholderEmoji) {
            if (base64Data) {
                this.pfpImageDisplay.style.backgroundImage = `url(${base64Data})`;
                this.pfpImageDisplay.style.display = "block";
                this.pfpPlaceholderEmoji.style.display = "none";
            } else {
                this.pfpImageDisplay.style.display = "none";
                this.pfpPlaceholderEmoji.style.display = "block";
            }
        }
    }

    saveSettingsPayload() {
        const inputName = this.setProfileName.value.trim();

        if (inputName === '') {
            alert("❌ Set your profile first!!!!");
            if (this.setProfileName) {
                this.setProfileName.focus();
            }
            return;
        }

        this.app.db.investigatorProfile.name = inputName;
        this.app.db.investigatorProfile.position = this.setProfilePos.value;
        this.app.db.investigatorProfile.pfpBase64 = this.temporaryPfpBase64;
        this.app.db.customTemplates.victimDm = this.setTplVictim.value;
        this.app.db.customTemplates.suspectDm = this.setTplSuspect.value;
        this.app.db.customTemplates.verdict = this.setTplVerdict.value;
        
        StorageController.save(this.app.db);
        
        if (typeof window.syncInvestigatorProfileUI === 'function') {
            window.syncInvestigatorProfileUI();
        }

        this.settingsScreen.style.display = 'none';

        const onboardingCard = document.getElementById('onboardingCardView');
        const coreDashboardWrapper = document.getElementById('dashboardCoreLayoutWrapper');
        const profileBadge = document.getElementById('investigatorProfileBadge');
        const dashboardLayout = document.getElementById('portalDashboardLayout');
        const newCaseBtn = document.getElementById('newCaseBtn');
        const subHeader = document.querySelector('#welcomeScreen p');

        if (inputName !== '') {
            if (onboardingCard) onboardingCard.style.display = 'none';
            if (coreDashboardWrapper) coreDashboardWrapper.style.display = 'flex';
            if (profileBadge) profileBadge.style.display = 'flex';
            if (dashboardLayout) dashboardLayout.style.display = 'grid';
            if (newCaseBtn) newCaseBtn.style.display = 'block';
            
            if (subHeader) {
                subHeader.textContent = 'Ready to hunt down some scammers?';
                subHeader.style.color = 'var(--text-muted)';
            }

            const pContainer = document.getElementById('pendingCasesContainer');
            const fContainer = document.getElementById('finalizedCasesContainer');
            
            if (pContainer && fContainer) {
                pContainer.innerHTML = '';
                fContainer.innerHTML = '';
                
                if (this.app.db.activeCases.length === 0) {
                    pContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; font-style: italic; background: #15151a; padding: 15px; border-radius: 6px; border: 1px dashed var(--border);">No active investigations found.</div>`;
                    
                    if (dashboardLayout && !document.getElementById('dashboardEmptyStateBanner')) {
                        const emptyStateBanner = document.createElement('div');
                        emptyStateBanner.id = 'dashboardEmptyStateBanner';
                        emptyStateBanner.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 60px 20px; margin-top: 40px; background: rgba(30, 30, 40, 0.4); border: 1px solid var(--border); border-radius: 12px; font-family: monospace;';
                        emptyStateBanner.innerHTML = `
                            <h2 style="color: var(--theme-accent); font-size: 20px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 8px;">Ready to begin the hunt?</h2>
                            <p style="color: #cbd5e1; font-size: 14px; font-weight: 600;">Click <span style="background: var(--theme-gradient); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; font-size: 12px; font-weight: bold;">New Case</span> to start hunting!!!</p>
                        `;
                        dashboardLayout.appendChild(emptyStateBanner);
                    }
                }
                if (this.app.db.finalizedCases.length === 0) {
                    fContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; font-style: italic; background: #15151a; padding: 15px; border-radius: 6px; border: 1px dashed var(--border);">No finalized logs discovered.</div>`;
                }
            }
            if (typeof window.renderPortalDashboardHub === 'function') {
                window.renderPortalDashboardHub();
            }
        }
    }
}

module.exports = SettingsModule;