const BaseModule = require('../core/BaseModule');
const { StorageController } = require('../models');

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

        this.setupSettingsListeners();
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
                document.getElementById(tab.getAttribute('data-settings-target')).style.display = 'flex';
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
                this.saveSettingsPayload();
            });
        }

        if (this.cancelSettingsBtn) {
            this.cancelSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.settingsScreen.style.display = 'none';
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

        if (this.settingsTemplateSelectorDropdown) this.settingsTemplateSelectorDropdown.value = 'victimDm';
        document.getElementById('settingsTplVictimWrapper').style.display = 'flex';
        document.getElementById('settingsTplSuspectWrapper').style.display = 'none';
        document.getElementById('settingsTplVerdictWrapper').style.display = 'none';

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
    }
}

module.exports = SettingsModule;