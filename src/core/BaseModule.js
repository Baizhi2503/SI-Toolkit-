// src/core/BaseModule.js

class BaseModule {
    constructor(moduleName, tabTargetId, panelId) {
        // Encapsulation: Storing the DOM elements specific to this module
        this.moduleName = moduleName;
        this.tabElement = document.querySelector(`[data-target="${tabTargetId}"]`);
        this.panelElement = document.getElementById(panelId);
        this.app = null; // This will hold the global app state
    }

    // Abstraction: These methods act as hooks for the child classes
    onInit() { console.log(`${this.moduleName} initialized.`); }
    onActivate() { }
    onDeactivate() { }

    mount(appContext) {
        this.app = appContext;
        this.onInit();
    }

    toggleVisibility(shouldShow) {
        if (this.panelElement) {
            this.panelElement.style.display = shouldShow ? 'flex' : 'none';
        }
        if (this.tabElement) {
            shouldShow ? this.tabElement.classList.add('active') : this.tabElement.classList.remove('active');
        }
    }
}

module.exports = BaseModule;