const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

class MediaPlayerEngine {
    constructor(moduleInstance) {
        this.mod = moduleInstance; 
        
        this.activeEditingIndex = null;
        this.originalImageState = null;
        this.undoStack = []; 
        this.redoStack = [];
        this.currentBrushColor = '#ff4757';
        this.currentBrushType = 'box';
        this.isDrawing = false;
        this.isPanning = false;
        this.isCropping = false; 
        this.startX = 0; this.startY = 0; this.panStartX = 0; this.panStartY = 0;
        this.cropStartX = 0; this.cropStartY = 0; this.cropCurrentX = 0; this.cropCurrentY = 0;
        this.currentPanX = 100; this.currentPanY = 100;
        this.currentZoomScale = 1;
        this.draggedIndex = null;
        this.activeCanvasTool = 'hand';
        
        this.shutterAudioTrack = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUpGAAB/f39/f39/f4CBgoOEhYaHiImKi4yNjo+QkJGSkpOTlZaXmJmampucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmampucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8g=");
    }

    init() {
        this.videoPlayer = document.getElementById('evidenceVideoPlayer');
        this.annotationCanvas = document.getElementById('evidenceAnnotationCanvas');
        this.galleryContainer = document.getElementById('evidenceGalleryTimeline');
        this.canvasViewportContainer = document.getElementById('canvasViewportContainer');
        this.canvasZoomSlider = document.getElementById('canvasZoomSlider');
        this.zoomPercentDisplay = document.getElementById('zoomPercentDisplay');
        this.annotationModal = document.getElementById('annotationModal');
        this.videoHint = document.getElementById('videoHint');
        this.ctx = this.annotationCanvas ? this.annotationCanvas.getContext('2d') : null;

        this.setupUIBindings();
        this.setupCanvasListeners();
        this.renderGalleryTimeline();
    }

    setupUIBindings() {
        const getEl = id => document.getElementById(id);
        
        getEl('canvasHandBtn')?.addEventListener('click', () => { this.activeCanvasTool = 'hand'; this.updateToolUIState(); });
        getEl('canvasRedBtn')?.addEventListener('click', () => { this.currentBrushColor = '#ff4757'; this.activeCanvasTool = 'box'; this.updateToolUIState(); });
        getEl('canvasYellowBtn')?.addEventListener('click', () => { this.activeCanvasTool = 'highlight'; this.updateToolUIState(); });
        getEl('canvasUndoBtn')?.addEventListener('click', () => this.triggerUndoAction());
        getEl('canvasRedoBtn')?.addEventListener('click', () => this.triggerRedoAction());

        getEl('canvasCancelBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.annotationModal.style.display = 'none';
            this.activeEditingIndex = null;
            this.undoStack = []; this.redoStack = [];
        });

        getEl('canvasSaveBtn')?.addEventListener('click', () => {
            const currentCase = this.mod.app.getCurrentCase();
            if (this.activeEditingIndex !== null && currentCase) {
                currentCase.evidenceFrames[this.activeEditingIndex].base64 = this.annotationCanvas.toDataURL('image/png');
                this.triggerWorkspaceAutoSaveNotification();
                this.renderGalleryTimeline();
            }
            this.annotationModal.style.display = 'none'; this.activeEditingIndex = null;
        });

        getEl('selectVideoBtn')?.addEventListener('click', async () => {
            const currentCase = this.mod.app.getCurrentCase();
            if (!currentCase) return alert("Please initiate an active Case Workspace first.");
            
            const result = await ipcRenderer.invoke('dialog:showOpenDialog', {
                properties: ['openFile'],
                filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'] }]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                currentCase.evidenceVideoPath = result.filePaths[0];
                this.triggerWorkspaceAutoSaveNotification();
                this.loadAndMountVideoSourcePath(result.filePaths[0]);
            }
        });

        getEl('exportGalleryBtn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            const currentCase = this.mod.app.getCurrentCase();
            if (!currentCase) return alert("Please initiate an active Case Workspace first.");
            if (!currentCase.evidenceFrames || currentCase.evidenceFrames.length === 0) return alert("Your timeline container is empty.");
            
            const result = await ipcRenderer.invoke('dialog:showSaveDialog', {
                title: 'Choose Location & Name for Exported Gallery Folder',
                defaultPath: path.join(require('os').homedir(), 'Desktop', `${currentCase.ticketId}_Gallery_Export_1`),
                buttonLabel: 'Export Frames Here'
            });

            if (!result.canceled && result.filePath) {
                const targetExportPath = result.filePath;
                if (!fs.existsSync(targetExportPath)) fs.mkdirSync(targetExportPath, { recursive: true });

                currentCase.evidenceFrames.forEach((frameObj, index) => {
                    const base64Data = frameObj.base64.replace(/^data:image\/png;base64,/, "");
                    const paddedName = String(index + 1).padStart(4, '0');
                    fs.writeFileSync(path.join(targetExportPath, `${paddedName}.png`), base64Data, 'base64');
                });
                
                this.triggerWorkspaceAutoSaveNotification();
                alert(`📦 Export Complete! Saved to custom location: ${targetExportPath}`);
            }
        });
        
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (e.ctrlKey && key === 's') {
                if (this.videoPlayer && this.videoPlayer.src) {
                    e.preventDefault();
                    if (!this.videoPlayer.paused) this.videoPlayer.pause();
                    this.captureFrameToGallery();
                }
                return; 
            }

            if (this.annotationModal && this.annotationModal.style.display === 'flex') {
                if (key === '1') { this.activeCanvasTool = 'hand'; this.updateToolUIState(); } 
                else if (key === '2') { this.currentBrushColor = '#ff4757'; this.activeCanvasTool = 'box'; this.updateToolUIState(); } 
                else if (key === '3') { this.activeCanvasTool = 'highlight'; this.updateToolUIState(); } 
                else if (key === '4') { this.activeCanvasTool = 'crop'; this.updateToolUIState(); }
                if (e.ctrlKey && key === 'z') { e.preventDefault(); this.triggerUndoAction(); }
                if (e.ctrlKey && key === 'y') { e.preventDefault(); this.triggerRedoAction(); }
            }
        });
    }

    setupCanvasListeners() {
        if (!this.canvasViewportContainer || !this.annotationCanvas) return;

        this.canvasViewportContainer.addEventListener('wheel', (e) => {
            if (this.activeCanvasTool === 'hand') {
                e.preventDefault();
                const zoomFactor = 0.1;
                const previousScale = this.currentZoomScale;
                if (e.deltaY < 0) { this.currentZoomScale = Math.min(4, this.currentZoomScale + zoomFactor); } 
                else { this.currentZoomScale = Math.max(0.1, this.currentZoomScale - zoomFactor); }

                if (this.currentZoomScale !== previousScale) {
                    const rect = this.canvasViewportContainer.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
                    const canvasX = (mouseX - this.currentPanX) / previousScale; const canvasY = (mouseY - this.currentPanY) / previousScale;
                    this.currentPanX = mouseX - canvasX * this.currentZoomScale; this.currentPanY = mouseY - canvasY * this.currentZoomScale;
                    if(this.canvasZoomSlider) this.canvasZoomSlider.value = this.currentZoomScale;
                    if(this.zoomPercentDisplay) this.zoomPercentDisplay.textContent = `${Math.round(this.currentZoomScale * 100)}%`;
                    this.applyViewportTransformations();
                }
            }
        }, { passive: false }); 

        this.canvasViewportContainer.addEventListener('mousedown', (e) => {
            if (this.activeCanvasTool === 'hand' || e.button === 1) {
                this.isPanning = true; this.canvasViewportContainer.style.cursor = 'grabbing';
                this.panStartX = e.clientX - this.currentPanX; this.panStartY = e.clientY - this.currentPanY;
                return;
            }
            if (e.target === this.annotationCanvas) {
                const coords = this.getCanvasMouseCoordinates(e);
                if (this.activeCanvasTool === 'crop') {
                    this.isCropping = true; this.cropStartX = coords.x; this.cropStartY = coords.y;
                    this.cropCurrentX = coords.x; this.cropCurrentY = coords.y; return;
                }
                this.isDrawing = true;
                this.undoStack.push(this.ctx.getImageData(0, 0, this.annotationCanvas.width, this.annotationCanvas.height));
                this.redoStack = []; this.startX = coords.x; this.startY = coords.y;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPanning) { this.currentPanX = e.clientX - this.panStartX; this.currentPanY = e.clientY - this.panStartY; this.applyViewportTransformations(); return; }
            if (this.isCropping) {
                const coords = this.getCanvasMouseCoordinates(e);
                this.cropCurrentX = coords.x; this.cropCurrentY = coords.y;
                this.ctx.putImageData(this.originalImageState, 0, 0); this.ctx.strokeStyle = '#ffa502'; this.ctx.lineWidth = 2 / this.currentZoomScale;
                this.ctx.setLineDash([6, 4]); this.ctx.strokeRect(this.cropStartX, this.cropStartY, this.cropCurrentX - this.cropStartX, this.cropCurrentY - this.cropStartY);
                this.ctx.setLineDash([]); return;
            }
            if (this.isDrawing) {
                const coords = this.getCanvasMouseCoordinates(e); this.ctx.putImageData(this.originalImageState, 0, 0);
                this.ctx.fillStyle = this.activeCanvasTool === 'highlight' ? 'rgba(255, 242, 0, 0.4)' : this.currentBrushColor;
                this.ctx.fillRect(this.startX, this.startY, coords.x - this.startX, coords.y - this.startY);
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isPanning) { this.isPanning = false; this.canvasViewportContainer.style.cursor = this.activeCanvasTool === 'hand' ? 'grab' : 'default'; }
            if (this.isCropping) {
                this.isCropping = false; this.ctx.putImageData(this.originalImageState, 0, 0);
                const x = Math.min(this.cropStartX, this.cropCurrentX); const y = Math.min(this.cropStartY, this.cropCurrentY);
                const width = Math.abs(this.cropCurrentX - this.cropStartX); const height = Math.abs(this.cropCurrentY - this.cropStartY);
                if (width > 10 && height > 10) {
                    this.undoStack.push(this.ctx.getImageData(0, 0, this.annotationCanvas.width, this.annotationCanvas.height)); this.redoStack = [];
                    const croppedData = this.ctx.getImageData(x, y, width, height);
                    this.annotationCanvas.width = width; this.annotationCanvas.height = height; this.ctx.putImageData(croppedData, 0, 0);
                    this.originalImageState = this.ctx.getImageData(0, 0, width, height);
                    this.currentZoomScale = 1; if(this.canvasZoomSlider) this.canvasZoomSlider.value = 1; if(this.zoomPercentDisplay) this.zoomPercentDisplay.textContent = "100%";
                    this.currentPanX = (this.canvasViewportContainer.clientWidth - width) / 2; this.currentPanY = (this.canvasViewportContainer.clientHeight - height) / 2;
                    this.applyViewportTransformations(); this.activeCanvasTool = 'hand'; this.updateToolUIState();
                }
            }
            if (this.isDrawing) { this.isDrawing = false; this.originalImageState = this.ctx.getImageData(0, 0, this.annotationCanvas.width, this.annotationCanvas.height); }
        });
    }

    loadAndMountVideoSourcePath(filePath) {
        if (!filePath || !fs.existsSync(filePath) || !this.videoPlayer) return;
        const disp = document.getElementById('videoPathDisplay');
        if (disp) disp.value = filePath;
        this.videoPlayer.src = filePath;
        this.videoPlayer.style.display = 'block';
        if (this.videoHint) this.videoHint.style.display = 'block';
        this.videoPlayer.load();
    }

    resetGalleryTimeline() {
        if(this.galleryContainer) this.galleryContainer.innerHTML = ''; 
        if (this.videoPlayer) {
            this.videoPlayer.src = ''; 
            this.videoPlayer.style.display = 'none'; 
        }
        if (this.videoHint) this.videoHint.style.display = 'none'; 
        if (this.annotationCanvas && this.ctx) {
            this.ctx.clearRect(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);
        }
    }

    captureFrameToGallery() {
        const currentCase = this.mod.app.getCurrentCase();
        if (!currentCase || !this.videoPlayer) return;

        if (!currentCase.evidenceFrames) currentCase.evidenceFrames = [];

        const rawSeconds = this.videoPlayer.currentTime;
        const mins = Math.floor(rawSeconds / 60); const secs = Math.floor(rawSeconds % 60);
        const formattedDisplayTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = this.videoPlayer.videoWidth; offscreenCanvas.height = this.videoPlayer.videoHeight;
        const offscreenCtx = offscreenCanvas.getContext('2d');
        offscreenCtx.drawImage(this.videoPlayer, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        
        currentCase.evidenceFrames.push({
            base64: offscreenCanvas.toDataURL('image/png'),
            timestamp: rawSeconds,
            displayTime: formattedDisplayTime
        });

        this.shutterAudioTrack.currentTime = 0;
        this.shutterAudioTrack.play().catch(err => console.log("Audio deferred:", err));

        this.triggerWorkspaceAutoSaveNotification();
        this.renderGalleryTimeline();
    }

    renderGalleryTimeline() {
        if (!this.galleryContainer) return;
        this.galleryContainer.innerHTML = '';
        
        const currentCase = this.mod.app.getCurrentCase();
        if (!currentCase || !currentCase.evidenceFrames) return;

        currentCase.evidenceFrames.forEach((frameObj, index) => {
            const card = document.createElement('div');
            card.setAttribute('draggable', 'true');
            card.style.cssText = `position: relative; min-width: 140px; max-width: 140px; height: 120px; background: #222; border: 2px solid #444; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; cursor: grab;`;
            
            const imgContainer = document.createElement('div');
            imgContainer.style.cssText = "width: 100%; height: 90px; position: relative; overflow: hidden;";
            
            const img = document.createElement('img');
            img.src = frameObj.base64; img.style.cssText = "width: 100%; height: 100%; object-fit: cover;";
            imgContainer.appendChild(img);
            
            const timeBadge = document.createElement('div');
            timeBadge.textContent = `⏱️ ${frameObj.displayTime || '00:00'}`;
            timeBadge.style.cssText = "position: absolute; bottom: 4px; left: 4px; background: rgba(12, 12, 16, 0.85); color: #ffa502; border: 1px solid rgba(255, 165, 2, 0.4); padding: 2px 5px; border-radius: 3px; font-family: monospace; font-size: 10px; font-weight: bold; cursor: pointer; z-index: 10; transition: transform 0.1s;";
            timeBadge.onclick = (e) => {
                e.stopPropagation(); e.preventDefault();
                if (this.videoPlayer && frameObj.timestamp !== undefined) {
                    this.videoPlayer.currentTime = frameObj.timestamp;
                    this.videoPlayer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            };
            imgContainer.appendChild(timeBadge);
            
            const overlay = document.createElement('div');
            overlay.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; gap: 15px; opacity: 0; transition: opacity 0.2s; z-index: 5;`;
            imgContainer.onmouseenter = () => overlay.style.opacity = '1';
            imgContainer.onmouseleave = () => overlay.style.opacity = '0';
            
            const editBtn = document.createElement('button'); editBtn.innerHTML = '✏️';
            editBtn.style.cssText = "background: #341f97; border: none; padding: 4px 8px; cursor: pointer;";
            editBtn.onclick = (e) => { e.stopPropagation(); this.launchAnnotationModal(index); };
            
            const trashBtn = document.createElement('button'); trashBtn.innerHTML = '🗑️';
            trashBtn.style.cssText = "background: #ff4757; border: none; padding: 4px 8px; cursor: pointer;";
            trashBtn.onclick = (e) => { e.stopPropagation(); currentCase.evidenceFrames.splice(index, 1); this.triggerWorkspaceAutoSaveNotification(); this.renderGalleryTimeline(); };
            
            overlay.appendChild(editBtn); overlay.appendChild(trashBtn); imgContainer.appendChild(overlay);
            
            const dragHandle = document.createElement('div'); dragHandle.innerHTML = '☰ Drag to Reorder';
            dragHandle.style.cssText = `width: 100%; height: 30px; background: #2a2a2a; border-top: 1px solid #444; display: flex; justify-content: center; align-items: center; font-size: 11px; color: var(--text-muted); font-weight: bold;`;
            card.appendChild(imgContainer); card.appendChild(dragHandle);

            card.addEventListener('dragstart', () => { this.draggedIndex = index; card.style.opacity = '0.5'; });
            card.addEventListener('dragend', () => { this.draggedIndex = null; card.style.opacity = '1'; this.triggerWorkspaceAutoSaveNotification(); this.renderGalleryTimeline(); });
            card.addEventListener('dragover', (e) => e.preventDefault());
            card.addEventListener('drop', () => {
                if (this.draggedIndex !== null && this.draggedIndex !== index) {
                    const targetData = currentCase.evidenceFrames[this.draggedIndex];
                    currentCase.evidenceFrames.splice(this.draggedIndex, 1); currentCase.evidenceFrames.splice(index, 0, targetData);
                    this.renderGalleryTimeline();
                }
            });
            this.galleryContainer.appendChild(card);
        });
    }

    launchAnnotationModal(index) {
        const currentCase = this.mod.app.getCurrentCase();
        if (!currentCase || !currentCase.evidenceFrames) return;

        this.activeEditingIndex = index;
        this.activeCanvasTool = 'hand'; this.updateToolUIState();
        this.undoStack = []; this.redoStack = [];
        
        const baseImg = new Image();
        baseImg.src = currentCase.evidenceFrames[index].base64;
        baseImg.onload = () => {
            this.annotationCanvas.width = baseImg.width; this.annotationCanvas.height = baseImg.height; this.ctx.drawImage(baseImg, 0, 0);
            this.originalImageState = this.ctx.getImageData(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);
            
            const vWidth = this.canvasViewportContainer.clientWidth; const vHeight = this.canvasViewportContainer.clientHeight;
            const scaleX = (vWidth - 40) / this.annotationCanvas.width; const scaleY = (vHeight - 40) / this.annotationCanvas.height;
            
            this.currentZoomScale = Math.max(0.5, Math.min(1, scaleX, scaleY));
            if(this.canvasZoomSlider) this.canvasZoomSlider.value = this.currentZoomScale; 
            if(this.zoomPercentDisplay) this.zoomPercentDisplay.textContent = `${Math.round(this.currentZoomScale * 100)}%`;
            
            this.currentPanX = (vWidth - (this.annotationCanvas.width * this.currentZoomScale)) / 2; 
            this.currentPanY = (vHeight - (this.annotationCanvas.height * this.currentZoomScale)) / 2;
            this.applyViewportTransformations(); 
            if (this.annotationModal) this.annotationModal.style.display = 'flex';
        };
    }

    updateToolUIState() {
        const getEl = id => document.getElementById(id);
        if(getEl('canvasHandBtn')) getEl('canvasHandBtn').style.background = this.activeCanvasTool === 'hand' ? '#2ed573' : '#747d8c';
        if(getEl('canvasRedBtn')) getEl('canvasRedBtn').style.background = this.activeCanvasTool === 'box' ? '#ff4757' : '#747d8c';
        if(getEl('canvasYellowBtn')) getEl('canvasYellowBtn').style.background = this.activeCanvasTool === 'highlight' ? '#ffa502' : '#747d8c';
        const cropBtn = getEl('canvasCropBtn');
        if (cropBtn) { cropBtn.style.background = this.activeCanvasTool === 'crop' ? '#341f97' : '#747d8c'; }
        if(this.canvasViewportContainer) this.canvasViewportContainer.style.cursor = this.activeCanvasTool === 'hand' ? 'grab' : (this.activeCanvasTool === 'crop' ? 'crosshair' : 'default');
    }

    applyViewportTransformations() { 
        const wrapper = document.getElementById('canvasZoomWrapper');
        if (wrapper) wrapper.style.transform = `translate(${this.currentPanX}px, ${this.currentPanY}px) scale(${this.currentZoomScale})`; 
    }
    
    getCanvasMouseCoordinates(e) { 
        const rect = this.annotationCanvas.getBoundingClientRect(); 
        return { x: (e.clientX - rect.left) * (this.annotationCanvas.width / rect.width), y: (e.clientY - rect.top) * (this.annotationCanvas.height / rect.height) };  
    }
    
    triggerUndoAction() { 
        if (this.undoStack.length > 0) { 
            this.redoStack.push(this.ctx.getImageData(0, 0, this.annotationCanvas.width, this.annotationCanvas.height)); 
            const pastState = this.undoStack.pop(); this.ctx.putImageData(pastState, 0, 0); this.originalImageState = pastState; 
        } 
    }
    
    triggerRedoAction() { 
        if (this.redoStack.length > 0) { 
            this.undoStack.push(this.ctx.getImageData(0, 0, this.annotationCanvas.width, this.annotationCanvas.height)); 
            const forwardState = this.redoStack.pop(); this.ctx.putImageData(forwardState, 0, 0); this.originalImageState = forwardState; 
        } 
    }
    
    triggerWorkspaceAutoSaveNotification() { 
        if (typeof window.triggerSilentWorkspaceAutoSave === 'function') window.triggerSilentWorkspaceAutoSave(); 
    }
}

module.exports = MediaPlayerEngine;