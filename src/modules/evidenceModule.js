const BaseModule = require('../core/BaseModule');
const MediaPlayerEngine = require('../engines/MediaPlayerEngine');
const VideoReverserEngine = require('../engines/VideoReverserEngine');

class EvidenceModule extends BaseModule {
    constructor() {
        super('EvidenceManager', 'evidenceTab', 'evidenceTab');

        this.mediaPlayer = new MediaPlayerEngine(this);
        this.videoReverser = new VideoReverserEngine(this);
    }

    onInit() {
        this.mediaPlayer.init();
        this.videoReverser.init();
    }

    onActivate() {
        this.mediaPlayer.renderGalleryTimeline();
    }

    loadAndMountVideoSourcePath(filePath) {
        this.mediaPlayer.loadAndMountVideoSourcePath(filePath);
    }

    resetGalleryTimeline() {
        this.mediaPlayer.resetGalleryTimeline();
    }

    renderGalleryTimeline() {
        this.mediaPlayer.renderGalleryTimeline();
    }
}

module.exports = EvidenceModule;