const { StorageController } = require('../models');

class Theme {
    constructor(id, name, accent, hover, startGrad, endGrad, glowOpacity, darkAccent, bgTint, panelTint, textTint) {
        this.id = id;
        this.name = name;
        this.accent = accent;
        this.hover = hover;
        this.gradient = `linear-gradient(135deg, ${startGrad}, ${endGrad})`;
        this.glow = glowOpacity;
        this.darkAccent = darkAccent;
        this.bgTint = bgTint;
        this.panelTint = panelTint;
        this.textTint = textTint;
    }
}

class ThemeEngine {
    constructor() {
        this.themes = {
            red: new Theme('red', 'Vanguard Crimson', '#ff4757', '#ff6b81', '#ff4757', '#ff6b81', 'rgba(255, 71, 87, 0.15)', '#b32e3b', '#0e0a0b', '#160f11', '#fcebee'),
            navy: new Theme('navy', 'Sentinel Cobalt', '#1e3799', '#4a69bd', '#1e3799', '#4a69bd', 'rgba(30, 55, 153, 0.15)', '#112266', '#090a12', '#101221', '#eef1fc'),
            purple: new Theme('purple', 'Aether Void', '#9c88ff', '#574b90', '#9c88ff', '#574b90', 'rgba(156, 136, 255, 0.15)', '#403370', '#0b0912', '#131021', '#f3efff'),
            green: new Theme('green', 'Verdant Aegis', '#2ed573', '#7bed9f', '#2ed573', '#7bed9f', 'rgba(46, 213, 115, 0.15)', '#1b8a47', '#090c0a', '#101612', '#effcf3'),
            cyan: new Theme('cyan', 'Neon Prism', '#00d2d3', '#0aeafd', '#00d2d3', '#0aeafd', 'rgba(0, 210, 211, 0.15)', '#008a8b', '#090b0c', '#101518', '#effbfc')
        };
        this.activeThemeId = 'red';
    }

    getAvailableThemes() {
        return Object.values(this.themes);
    }

    applyTheme(themeId) {
        const targetTheme = this.themes[themeId];
        if (!targetTheme) return;

        this.activeThemeId = themeId;
        const root = document.documentElement;

        root.style.setProperty('--theme-accent', targetTheme.accent);
        root.style.setProperty('--theme-accent-hover', targetTheme.hover);
        root.style.setProperty('--theme-gradient', targetTheme.gradient);
        root.style.setProperty('--theme-glow', targetTheme.glow);
        root.style.setProperty('--theme-border', targetTheme.accent + '4D');
        root.style.setProperty('--theme-accent-dark', targetTheme.darkAccent);
        root.style.setProperty('--theme-bg-tint', targetTheme.bgTint);
        root.style.setProperty('--theme-panel-tint', targetTheme.panelTint);
        root.style.setProperty('--theme-text-tint', targetTheme.textTint);
    }
}

module.exports = new ThemeEngine();