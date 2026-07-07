const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs'); // 🔥 Required to delete the test cache file

function createWindow () {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
        backgroundColor: '#141419'
    });

    mainWindow.loadFile('index.html');
}

// Stable Synchronous IPC bridge to tell the renderer if TEST_MODE is active
ipcMain.on('check-test-mode', (event) => {
    event.returnValue = (process.env.TEST_MODE === 'true');
});

app.whenReady().then(() => {
    // 🔥 CLEAR ACCOUNT DEV TRIGGER: If booting in rookie test mode, wipe the test database before the window draws!
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

// Bulletproof IPC Dialog Handlers
ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return await dialog.showOpenDialog(win, options);
});

ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return await dialog.showSaveDialog(win, options);
});