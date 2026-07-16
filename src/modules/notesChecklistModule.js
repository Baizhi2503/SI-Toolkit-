const BaseModule = require('../core/BaseModule');

class NotesChecklistModule extends BaseModule {
    constructor() {
        super('NotesChecklistManager', 'notesChecklistTab', 'notesChecklistTab');
    }

    onInit() {
        this.notesArea = document.getElementById('caseNotesTextArea');
        this.stepRadios = document.querySelectorAll('input[name="todoStepGroup"]');
        
        this.setupListeners();
    }

    setupListeners() {
        const triggerSave = () => {
            if (typeof window.triggerSilentWorkspaceAutoSave === 'function') {
                window.triggerSilentWorkspaceAutoSave();
            }
        };

        if (this.notesArea) {
            this.notesArea.addEventListener('change', triggerSave);
        }

        this.stepRadios.forEach(radio => {
            radio.addEventListener('change', triggerSave);
        });
    }

    onActivate() {
        this.syncUI(this.app.getCurrentCase());
    }

    syncUI(currentCase) {
        if (!currentCase) return;

        if (this.notesArea) {
            this.notesArea.value = currentCase.notes || '';
        }

        const stepValue = currentCase.currentStep || 1;
        const targetRadio = document.querySelector(`input[name="todoStepGroup"][value="${stepValue}"]`);
        if (targetRadio) {
            targetRadio.checked = true;
        }

        const isLocked = !!currentCase.isFinalized;
        if (this.notesArea) this.notesArea.disabled = isLocked;
        this.stepRadios.forEach(radio => {
            radio.disabled = isLocked;
        });
    }
}

module.exports = NotesChecklistModule;