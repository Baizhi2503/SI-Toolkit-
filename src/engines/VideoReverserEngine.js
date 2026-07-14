const { ipcRenderer } = require('electron');

class VideoReverserEngine {
    constructor(moduleInstance) {
        this.mod = moduleInstance;
        this.inputVideoFilePath = "";
        this.outputVideoFilePath = "";
    }

    init() {
        const getEl = id => document.getElementById(id);
        
        const inputBtn = getEl('selectInputVideoBtn');
        const outputBtn = getEl('selectOutputVideoBtn');
        const executeBtn = getEl('executeVideoReverseBtn');
        const inputLabel = getEl('inputVideoPathDisplay');
        const outputLabel = getEl('outputVideoPathDisplay');
        const processingLoader = getEl('videoProcessingLoader');

        const validateExecutionState = () => {
            if (executeBtn) {
                executeBtn.disabled = !(this.inputVideoFilePath && this.outputVideoFilePath);
            }
        };

        inputBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            const result = await ipcRenderer.invoke('dialog:showOpenDialog', {
                title: 'Import Source Video File for Reversion',
                filters: [{ name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }],
                properties: ['openFile']
            });

            if (!result.canceled && result.filePaths.length > 0) {
                this.inputVideoFilePath = result.filePaths[0];
                if (inputLabel) {
                    inputLabel.textContent = this.inputVideoFilePath;
                    inputLabel.style.color = '#cbd5e1';
                }
                validateExecutionState();
            }
        });

        outputBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            const result = await ipcRenderer.invoke('dialog:showSaveDialog', {
                title: 'Select Destination to Save Reversed Video',
                defaultPath: 'reversed_output.mp4',
                filters: [{ name: 'MP4 Video File', extensions: ['mp4'] }]
            });

            if (!result.canceled && result.filePath) {
                this.outputVideoFilePath = result.filePath;
                if (outputLabel) {
                    outputLabel.textContent = this.outputVideoFilePath;
                    outputLabel.style.color = '#cbd5e1';
                }
                validateExecutionState();
            }
        });

        executeBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            
            executeBtn.disabled = true;
            if (inputBtn) inputBtn.disabled = true;
            if (outputBtn) outputBtn.disabled = true;
            if (processingLoader) processingLoader.style.display = 'flex';

            try {
                const response = await ipcRenderer.invoke('video:reverse', {
                    inputPath: this.inputVideoFilePath,
                    outputPath: this.outputVideoFilePath
                });

                if (response.success) {
                    alert("✨ Video processing complete! Reversed file exported successfully.");
                    this.inputVideoFilePath = "";
                    this.outputVideoFilePath = "";
                    if (inputLabel) inputLabel.textContent = "No source file imported...";
                    if (outputLabel) outputLabel.textContent = "No save location allocated...";
                }
            } catch (error) {
                console.error("FFmpeg Core Failure:", error);
                alert(`❌ Reverser Engine Error: ${error.message}`);
            } finally {
                if (processingLoader) processingLoader.style.display = 'none';
                if (inputBtn) inputBtn.disabled = false;
                if (outputBtn) outputBtn.disabled = false;
                validateExecutionState();
            }
        });
    }
}

module.exports = VideoReverserEngine;