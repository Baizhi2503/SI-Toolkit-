const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

function createWindow () {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        icon: path.join(__dirname, 'images', 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
        backgroundColor: '#141419'
    });

    mainWindow.loadFile('index.html');
}

ipcMain.on('check-test-mode', (event) => {
    event.returnValue = (process.env.TEST_MODE === 'true');
});

app.whenReady().then(() => {
    if (process.env.TEST_MODE === 'true') {
        const testDbPath = path.join(require('os').homedir(), '.si_toolkit', 'database.test.json');
        try {
            if (fs.existsSync(testDbPath)) {
                fs.unlinkSync(testDbPath);
                console.log('🔄 Dev Sandbox: database.test.json successfully purged for renewal test.');
            }
        } catch (error) {
            console.error('Failed to clear test file:', error);
        }
    }

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return await dialog.showOpenDialog(win, options);
});

ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return await dialog.showSaveDialog(win, options);
});

ipcMain.handle('video:reverse', async (event, { inputPath, outputPath }) => {
    return new Promise((resolve, reject) => {
        const args = [ //This is a test comment
            '-y',
            '-i', inputPath,
            '-vf', 'reverse',
            '-af', 'areverse',
            outputPath
        ];

        const ffmpegProcess = spawn(ffmpegPath, args);

        ffmpegProcess.stderr.on('data', (data) => {
        });

        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true });
            } else {
                reject(new Error(`FFmpeg exited with error code ${code}`));
            }
        });

        ffmpegProcess.on('error', (err) => {
            reject(err);
        });
    });
});