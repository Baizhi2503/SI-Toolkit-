const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

const isTestModeActive = ipcRenderer.sendSync('check-test-mode');

const STORAGE_DIR = path.join(require('os').homedir(), '.si_toolkit');
const DB_FILE = path.join(STORAGE_DIR, isTestModeActive ? 'database.test.json' : 'database.json');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif']);
const CURRENT_SCHEMA_VERSION = 1.0;

const BASELINE_TEMPLATES = {
    victimDm: `# <:SI:1169019875814023178> Greetings,

I am here to inform you about the scam report you have opened on [DATE]
**Ticket Copy: [attached below]**

To continue with your case, we would require the following:-
- **A video recording of your DMs with the suspect**

You have 24 hours to provide the requirements. Failure to provide it under the timeframe would result in closing ticket and you have to open a new ticket to report again,

With regards,
**Baizhi**
**Scam Investigator <:SI:1169019875814023178> **
**HiddenDevs <:HiddenDevs:929518256782450749> **`,

    suspectDm: `# <:SI:1169019875814023178> Greetings,

I am here to inform you that you're being reported by [VICTIM_USERNAME] for [S_REASON].

**Ticket Copy: [attached below]**
**Evidence: [EVIDENCE]**

You have 24 hours to defend yourself regarding this case. Failure to co-operate or respond within the given timeframe will result in a ban.

Sincerely,
**Baizhi**
**Scam Investigator <:SI:1169019875814023178> **
**HiddenDevs <:HiddenDevs:929518256782450749> **`,

    verdict: `# <:SI:1169019875814023178> Greetings,

On reviewing this case in depth, I have reached out with a final verdict:-

**Suspect (SUSPECT_USERNAME): [S_REASON]**
**Victim (VICTIM_USERNAME): [V_REASON]**
**Evidence: [EVIDENCE]**

[MESSAGE]

With regards,
**Baizhi**
**Scam Investigator <:SI:1169019875814023178> **
**HiddenDevs <:HiddenDevs:929518256782450749> **`
};

class StorageController {
    static defaultDb() {
        return {
            dbVersion: CURRENT_SCHEMA_VERSION,
            investigatorProfile: { name: '', position: 'Trial Scam Investigator', pfpBase64: '' },
            customTemplates: Object.assign({}, BASELINE_TEMPLATES),
            activeCases: [],
            finalizedCases: []
        };
    }

    static init() {
        if (!fs.existsSync(STORAGE_DIR)) {
            fs.mkdirSync(STORAGE_DIR, { recursive: true });
        }
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(this.defaultDb(), null, 4));
        }
    }

    static normalizeDb(db) {
        const normalized = Object.assign(this.defaultDb(), db && typeof db === 'object' ? db : {});
        
        normalized.investigatorProfile = Object.assign(
            this.defaultDb().investigatorProfile,
            normalized.investigatorProfile && typeof normalized.investigatorProfile === 'object' ? normalized.investigatorProfile : {}
        );
        
        normalized.customTemplates = Object.assign(
            {},
            BASELINE_TEMPLATES,
            normalized.customTemplates && typeof normalized.customTemplates === 'object' ? normalized.customTemplates : {}
        );
        
        normalized.activeCases = Array.isArray(normalized.activeCases) ? normalized.activeCases : [];
        normalized.finalizedCases = Array.isArray(normalized.finalizedCases) ? normalized.finalizedCases : [];

        const deeplyNormalizeCases = (caseArray) => {
            return caseArray.map(caseRecord => {
                const baselineCase = Object.assign(new ScamCase(), caseRecord);
                if (Array.isArray(baselineCase.suspects)) {
                    baselineCase.suspects = baselineCase.suspects.map(suspect => {
                        return Object.assign({ id: 1, name: "Suspect", discordIds: [], robloxIds: [] }, suspect);
                    });
                }
                return baselineCase;
            });
        };

        normalized.activeCases = deeplyNormalizeCases(normalized.activeCases);
        normalized.finalizedCases = deeplyNormalizeCases(normalized.finalizedCases);

        if (normalized.dbVersion < CURRENT_SCHEMA_VERSION) {
            normalized.dbVersion = CURRENT_SCHEMA_VERSION;
        }

        return normalized;
    }

    static load() {
        try {
            this.init();
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            let db = this.normalizeDb(JSON.parse(raw));

            let structureChanged = false;
            
            Object.keys(BASELINE_TEMPLATES).forEach(key => {
                if (!db.customTemplates[key] || db.customTemplates[key].includes('[TICKET_ID]') || !db.customTemplates[key].includes('Greetings,')) {
                    db.customTemplates[key] = BASELINE_TEMPLATES[key];
                    structureChanged = true;
                }
            });
            
            if (structureChanged) this.save(db);
            return db;
        } catch (e) {
            const fallback = this.defaultDb();
            this.save(fallback);
            return fallback;
        }
    }

    static save(data) {
        try {
            this.init();
            const tmpFile = `${DB_FILE}.tmp`;
            const finalizedPayload = this.normalizeDb(data);
            finalizedPayload.dbVersion = CURRENT_SCHEMA_VERSION;

            fs.writeFileSync(tmpFile, JSON.stringify(finalizedPayload, null, 4));
            fs.renameSync(tmpFile, DB_FILE);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
}

class ScamCase {
    constructor(ticketId = null) {
        this.ticketId = ticketId || `case-${Date.now()}`;
        this.suspects = [{ id: 1, name: "Suspect #1", discordIds: [], robloxIds: [] }];
        this.activeSuspectId = 1;
        this.notes = '';
        this.currentStep = 1;
        this.evidenceVideoPath = '';
        this.evidenceFrames = [];
        this.sourceFolder = '';
        this.banLength = '';
        this.selectedRules = [];
        this.evidenceLink = '';
        this.isFinalized = false;
    }

    getActiveSuspect() {
        if (!Array.isArray(this.suspects) || this.suspects.length === 0) {
            this.suspects = [{ id: 1, name: "Suspect #1", discordIds: [], robloxIds: [] }];
        }
        let active = this.suspects.find(s => s.id === this.activeSuspectId);
        if (!active) {
            active = this.suspects[0];
            this.activeSuspectId = active.id;
        }
        active.discordIds = Array.isArray(active.discordIds) ? active.discordIds : [];
        active.robloxIds = Array.isArray(active.robloxIds) ? active.robloxIds : [];
        return active;
    }

    addIdentity(rawValue) {
        const values = String(rawValue || '')
            .split(/[\s,;]+/)
            .map(value => value.trim())
            .filter(Boolean);

        values.forEach(value => {
            const active = this.getActiveSuspect();
            const normalized = value.replace(/^<@!?(\d+)>$/, '$1');
            const isDiscord = /^<@!?\d+>$/.test(value) || /^\d{15,25}$/.test(normalized);
            const targetList = isDiscord ? active.discordIds : active.robloxIds;

            if (!targetList.includes(normalized)) {
                targetList.push(normalized);
            }
        });
    }

    removeIdentity(type, value) {
        const active = this.getActiveSuspect();
        const listName = type === 'discord' ? 'discordIds' : 'robloxIds';
        active[listName] = active[listName].filter(id => id !== value);
    }

    addNewSuspect() {
        if (!Array.isArray(this.suspects)) this.suspects = [];
        const nextId = this.suspects.reduce((max, suspect) => Math.max(max, Number(suspect.id) || 0), 0) + 1;
        const suspect = { id: nextId, name: `Suspect #${nextId}`, discordIds: [], robloxIds: [] };
        this.suspects.push(suspect);
        this.activeSuspectId = nextId;
        return suspect;
    }

    removeSuspect(id) {
        if (!Array.isArray(this.suspects) || this.suspects.length <= 1) return;
        this.suspects = this.suspects.filter(suspect => suspect.id !== id);
        if (!this.suspects.some(suspect => suspect.id === this.activeSuspectId)) {
            this.activeSuspectId = this.suspects[0].id;
        }
    }

    processEvidence(destinationFolder) {
        if (!this.sourceFolder || !fs.existsSync(this.sourceFolder)) {
            throw new Error('Source evidence folder does not exist.');
        }
        if (!destinationFolder) {
            throw new Error('Destination folder was not selected.');
        }

        fs.mkdirSync(destinationFolder, { recursive: true });

        const files = fs.readdirSync(this.sourceFolder)
            .map(name => {
                const fullPath = path.join(this.sourceFolder, name);
                const stat = fs.statSync(fullPath);
                return { name, fullPath, stat };
            })
            .filter(file => file.stat.isFile() && IMAGE_EXTENSIONS.has(path.extname(file.name).toLowerCase()))
            .sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs || a.name.localeCompare(b.name));

        files.forEach((file, index) => {
            const ext = path.extname(file.name).toLowerCase();
            const outputName = `${String(index + 1).padStart(4, '0')}${ext}`;
            fs.copyFileSync(file.fullPath, path.join(destinationFolder, outputName));
        });

        return { count: files.length, destination: destinationFolder };
    }
}

module.exports = { ScamCase, StorageController, BASELINE_TEMPLATES };