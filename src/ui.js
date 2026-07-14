const UI = {
    welcomeScreen: document.getElementById('welcomeScreen'),
    newCaseBtn: document.getElementById('newCaseBtn'),
    closeCaseBtn: document.getElementById('closeCaseBtn'),
    sidebarCaseId: document.getElementById('sidebarCaseId'),
    ticketIdInput: document.getElementById('ticketIdInput'),
    idInput: document.getElementById('idInput'),
    discordChips: document.getElementById('discordChips'),
    robloxChips: document.getElementById('robloxChips'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    viewPanels: document.querySelectorAll('.view-panel'),
    folderPathInput: document.getElementById('folderPathInput'),
    selectFolderBtn: document.getElementById('selectFolderBtn'),
    processImagesBtn: document.getElementById('processImagesBtn'),
    sortingStatusBox: document.getElementById('sortingStatusBox'),
    statusTitle: document.getElementById('statusTitle'),
    statusText: document.getElementById('statusText'),
    videoPathDisplay: document.getElementById('videoPathDisplay'),
    selectVideoBtn: document.getElementById('selectVideoBtn'),
    evidenceVideo: document.getElementById('evidenceVideo'),
    videoHint: document.getElementById('videoHint'),
    galleryContainer: document.getElementById('galleryContainer'),
    annotationModal: document.getElementById('annotationModal'),
    annotationCanvas: document.getElementById('annotationCanvas'),
    canvasRedBtn: document.getElementById('canvasRedBtn'),
    canvasYellowBtn: document.getElementById('canvasYellowBtn'),
    canvasUndoBtn: document.getElementById('canvasUndoBtn'),
    canvasRedoBtn: document.getElementById('canvasRedoBtn'),
    canvasSaveBtn: document.getElementById('canvasSaveBtn'),
    exportGalleryBtn: document.getElementById('exportGalleryBtn'),
    canvasZoomSlider: document.getElementById('canvasZoomSlider'),
    zoomPercentDisplay: document.getElementById('zoomPercentDisplay'),
    canvasZoomWrapper: document.getElementById('canvasZoomWrapper'),
    canvasHandBtn: document.getElementById('canvasHandBtn'),
    canvasViewportContainer: document.getElementById('canvasViewportContainer'),
    templateSelector: document.getElementById('templateSelector'),
    dynamicTemplateInputs: document.getElementById('dynamicTemplateInputs'),
    templatePreviewBox: document.getElementById('templatePreviewBox'),
    copyTemplateBtn: document.getElementById('copyTemplateBtn'),
    banLogTicketId: document.getElementById('banLogTicketId'),
    banLogRobloxIds: document.getElementById('banLogRobloxIds'),
    banLogLength: document.getElementById('banLogLength'),
    banLogEvidence: document.getElementById('banLogEvidence'),
    copyBanLogBtn: document.getElementById('copyBanLogBtn'),
    banLogIndexLabel: document.getElementById('banLogIndexLabel'),
    prevBanLogChunk: document.getElementById('prevBanLogChunk'),
    nextBanLogChunk: document.getElementById('nextBanLogChunk'),
    banLogPaginationStatus: document.getElementById('banLogPaginationStatus'),
    banLogPreviewBox: document.getElementById('banLogPreviewBox'),
    banLogTab: document.getElementById('banLogTab'),
};

UI.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        UI.tabButtons.forEach(b => b.classList.remove('active'));
        UI.viewPanels.forEach(p => p.classList.remove('active')); //This is a test comment
        
        btn.classList.add('active');
        const target = btn.getAttribute('data-target');
        document.getElementById(target).classList.add('active');
    });
});

module.exports = UI;