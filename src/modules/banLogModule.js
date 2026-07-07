const BaseModule = require('../core/BaseModule');

class BanLogModule extends BaseModule {
    constructor() {
        super('BanLogManager', 'banLogTab', 'banLogTab');
        
        // 🔒 Internal Array State tracking[cite: 8]
        this.generatedChunksMatrix = []; 
        this.activeChunkMatrixIndex = 0;
    }

    onInit() {
        this.lengthInput = document.getElementById('banLogLength');
        this.evidenceInput = document.getElementById('banLogEvidence');
        this.ticketIdInput = document.getElementById('banLogTicketId');
        this.previewBox = document.getElementById('banLogPreviewBox');
        this.copyBtn = document.getElementById('copyBanLogBtn');
        this.prevChunkBtn = document.getElementById('prevBanLogChunk');
        this.nextChunkBtn = document.getElementById('nextBanLogChunk');
        this.indexLabel = document.getElementById('banLogIndexLabel');
        this.paginationStatus = document.getElementById('banLogPaginationStatus');
        this.reasonCheckboxes = document.querySelectorAll('.ban-reason-check');

        this.setupListeners();
    }

    setupListeners() {
        const renderTrigger = () => {
            this.compileBanLogText();
            if (typeof window.triggerSilentWorkspaceAutoSave === 'function') {
                window.triggerSilentWorkspaceAutoSave();
            }
        };

        if (this.lengthInput) this.lengthInput.addEventListener('input', renderTrigger);
        if (this.evidenceInput) this.evidenceInput.addEventListener('input', renderTrigger);
        this.reasonCheckboxes.forEach(box => box.addEventListener('change', renderTrigger));

        if (this.prevChunkBtn) {
            this.prevChunkBtn.addEventListener('click', () => {
                if (this.activeChunkMatrixIndex > 0) {
                    this.activeChunkMatrixIndex--;
                    this.updatePaginationUI();
                }
            });
        }

        if (this.nextChunkBtn) {
            this.nextChunkBtn.addEventListener('click', () => {
                if (this.activeChunkMatrixIndex < this.generatedChunksMatrix.length - 1) {
                    this.activeChunkMatrixIndex++;
                    this.updatePaginationUI();
                }
            });
        }

        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => {
                if (!this.previewBox) return;
                const payload = this.previewBox.value;
                navigator.clipboard.writeText(payload);
                
                const originalText = this.copyBtn.textContent;
                this.copyBtn.textContent = "✅ Copied This Command Segment!";
                this.copyBtn.style.backgroundColor = "#2ed573";
                setTimeout(() => {
                    this.copyBtn.textContent = originalText;
                    this.copyBtn.style.backgroundColor = "#ff4757";
                }, 1200);
            });
        }
    }

    onActivate() {
        this.syncUI(this.app.getCurrentCase());
    }

    syncUI(currentCase) {
        if (!currentCase) {
            if (this.ticketIdInput) this.ticketIdInput.value = '';
            this.generatedChunksMatrix = [];
            this.activeChunkMatrixIndex = 0;
            this.updatePaginationUI();
            return;
        }

        if (this.ticketIdInput) this.ticketIdInput.value = currentCase.ticketId || '';
        
        // Populate fields from active case metadata
        if (this.lengthInput) this.lengthInput.value = currentCase.banLength || '';
        if (this.evidenceInput) this.evidenceInput.value = currentCase.evidenceLink || '';

        const isLocked = !!currentCase.isFinalized;
        if (this.lengthInput) this.lengthInput.disabled = isLocked;
        if (this.evidenceInput) this.evidenceInput.disabled = isLocked;

        this.reasonCheckboxes.forEach(box => {
            box.checked = currentCase.selectedRules ? currentCase.selectedRules.includes(box.value) : false;
            box.disabled = isLocked;
        });

        this.generatedChunksMatrix = [];
        const suspectsList = currentCase.suspects || [];

        // Build the matrices based on 9-ID chunking limits[cite: 8]
        suspectsList.forEach((suspect) => {
            const dIds = Array.isArray(suspect.discordIds) ? suspect.discordIds : [];
            const rIds = Array.isArray(suspect.robloxIds) ? suspect.robloxIds : [];
            
            if (dIds.length === 0 && rIds.length === 0) {
                this.generatedChunksMatrix.push({ suspectName: suspect.name, userChunkString: '[USER_ID]', robloxIdsString: 'NULL' });
                return;
            }

            const robloxIdsString = rIds.length > 0 ? rIds.join(', ') : 'NULL';

            if (dIds.length === 0) {
                this.generatedChunksMatrix.push({ suspectName: suspect.name, userChunkString: '[USER_ID]', robloxIdsString: robloxIdsString });
            } else {
                for (let i = 0; i < dIds.length; i += 9) {
                    const sliceChunk = dIds.slice(i, i + 9);
                    this.generatedChunksMatrix.push({ suspectName: suspect.name, userChunkString: sliceChunk.join(', '), robloxIdsString: robloxIdsString });
                }
            }
        });

        this.activeChunkMatrixIndex = 0;
        this.updatePaginationUI();
    }

    updatePaginationUI() {
        const activeChunk = this.generatedChunksMatrix[this.activeChunkMatrixIndex];
        if (activeChunk && this.indexLabel) {
            this.indexLabel.textContent = `${activeChunk.suspectName} (Segment Chunk #${this.activeChunkMatrixIndex + 1})`;
        } else if (this.indexLabel) {
            this.indexLabel.textContent = `Ban Log #1`;
        }
        
        if (this.paginationStatus) {
            this.paginationStatus.textContent = `${this.activeChunkMatrixIndex + 1} / ${Math.max(1, this.generatedChunksMatrix.length)}`;
        }
        this.compileBanLogText();
    }

    compileBanLogText() {
        if (!this.previewBox) return;

        const ticketId = this.ticketIdInput ? this.ticketIdInput.value || '[TICKET_ID]' : '[TICKET_ID]';
        const banLength = this.lengthInput ? this.lengthInput.value || '[BAN_LENGTH]' : '[BAN_LENGTH]';
        const evidence = this.evidenceInput ? this.evidenceInput.value || '[EVIDENCE_LINK]' : '[EVIDENCE_LINK]';

        const selectedReasons = [];
        document.querySelectorAll('.ban-reason-check:checked').forEach(box => {
            selectedReasons.push(box.value);
        });

        let builtReasonString = '';
        if (selectedReasons.length === 1) builtReasonString = `Violation of ${selectedReasons[0]}`;
        else if (selectedReasons.length === 2) builtReasonString = `Violation of ${selectedReasons[0]} & ${selectedReasons[1]}`;
        else if (selectedReasons.length > 2) builtReasonString = `Violation of ${selectedReasons[0]}, ${selectedReasons[1]} & ${selectedReasons[2]}`;
        else builtReasonString = 'Violation of [REASON]';

        const currentActiveChunkNode = this.generatedChunksMatrix[this.activeChunkMatrixIndex];
        const userIdsOutput = currentActiveChunkNode ? currentActiveChunkNode.userChunkString : '[USER_ID]';
        const robloxIdsOutput = currentActiveChunkNode ? currentActiveChunkNode.robloxIdsString : '[ROBLOX_ID]';

        this.previewBox.value = `User ID(s): ${userIdsOutput}\nRoblox ID(s): ${robloxIdsOutput}\nTicket ID: ${ticketId}\nBan Length: ${banLength}\nReason: ${builtReasonString}\nEvidence Link: ${evidence}`;
    }
}

module.exports = BanLogModule;