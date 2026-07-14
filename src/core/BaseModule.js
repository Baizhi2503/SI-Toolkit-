
class BaseModule {
    constructor(moduleName, tabTargetId, panelId) {
        this.moduleName = moduleName;
        this.tabElement = document.querySelector(`[data-target="${tabTargetId}"]`);
        this.panelElement = document.getElementById(panelId);
        this.app = null;
    }

    onInit() {}
    onActivate() {}
    onDeactivate() {}

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