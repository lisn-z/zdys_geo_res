export interface BackgroundTrack {
    readonly id: string;
    readonly title: string;
    readonly artist: string;
    readonly src: string;
}

/** The small media surface also permits deterministic playback tests without a browser. */
export interface BackgroundMusicAudio {
    src: string;
    volume: number;
    preload: string;
    loop: boolean;
    currentTime: number;
    readonly paused: boolean;
    play(): Promise<void>;
    pause(): void;
    load(): void;
    removeAttribute(name: string): void;
    addEventListener(type: 'ended' | 'error', listener: () => void): void;
    removeEventListener(type: 'ended' | 'error', listener: () => void): void;
}

/** One media element keeps the two tracks in order, independent of story seeking. */
export class BackgroundMusic {
    private readonly tracks: readonly BackgroundTrack[];
    private readonly configured: boolean;
    private audio: BackgroundMusicAudio | null = null;
    private active = false;
    private disposed = false;
    private needsGesture = false;
    private trackIndex = 0;
    private volume = .32;
    private request = 0;
    private pendingRequest: number | null = null;

    constructor(tracks: readonly BackgroundTrack[], private readonly audioFactory: () => BackgroundMusicAudio = () => new Audio()) {
        this.tracks = tracks.map(track => ({ ...track }));
        this.configured = this.tracks.length > 0 && this.tracks.every(track => track.src.trim().length > 0);
    }

    get ready() { return this.configured && !this.disposed; }
    get blocked() { return this.needsGesture; }
    get currentTrack(): BackgroundTrack | null { return this.tracks[this.trackIndex] ?? null; }

    /** Deactivation preserves the current track and position; repeated calls never retry play(). */
    setActive(active: boolean) {
        const next = active && this.ready;
        if (this.disposed || next === this.active) return;
        this.active = next;
        if (next) this.tryPlay();
        else this.stopPlayback();
    }

    /** Call synchronously from a click/key handler to retry browser autoplay rejection. */
    resumeFromGesture() {
        if (!this.active || !this.ready) return;
        this.needsGesture = false;
        this.tryPlay();
    }

    setVolume(value: number) {
        if (!Number.isFinite(value) || this.disposed) return;
        this.volume = Math.max(0, Math.min(1, value));
        if (this.audio) this.audio.volume = this.volume;
    }

    /** Restarting the experience returns to its silent intro and the first track. */
    reset() {
        if (this.disposed) return;
        this.active = false;
        this.stopPlayback();
        this.trackIndex = 0;
        this.needsGesture = false;
        if (this.audio) this.loadCurrentTrack();
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.active = false;
        this.stopPlayback();
        if (this.audio) {
            this.audio.removeEventListener('ended', this.onEnded);
            this.audio.removeEventListener('error', this.onError);
            this.audio.removeAttribute('src');
            this.audio.load();
            this.audio = null;
        }
    }

    private stopPlayback() {
        this.request++;
        this.pendingRequest = null;
        this.audio?.pause();
    }

    private ensureAudio() {
        if (this.audio) return this.audio;
        const audio = this.audioFactory();
        this.audio = audio;
        audio.preload = 'none';
        audio.loop = false;
        audio.volume = this.volume;
        audio.addEventListener('ended', this.onEnded);
        audio.addEventListener('error', this.onError);
        this.loadCurrentTrack();
        return audio;
    }

    private loadCurrentTrack() {
        const track = this.currentTrack;
        if (!this.audio || !track) return;
        this.audio.src = track.src;
        this.audio.currentTime = 0;
        this.audio.load();
    }

    private tryPlay() {
        if (!this.active || !this.ready || this.needsGesture || this.pendingRequest !== null) return;
        let audio: BackgroundMusicAudio;
        try { audio = this.ensureAudio(); }
        catch { this.needsGesture = true; return; }
        if (!audio.paused) return;
        const request = ++this.request;
        this.pendingRequest = request;
        // play() may throw synchronously in a host implementation as well as reject later.
        let promise: Promise<void>;
        try { promise = audio.play(); }
        catch { this.playRejected(request, audio); return; }
        void promise.then(() => {
            if (this.disposed || !this.active || this.needsGesture) {
                audio.pause();
                return;
            }
            if (request === this.request) this.pendingRequest = null;
        }, () => this.playRejected(request, audio));
    }

    private playRejected(request: number, audio: BackgroundMusicAudio) {
        // An earlier play request must not pause a newer, successful one.
        if (this.disposed || !this.active || request !== this.request) return;
        this.pendingRequest = null;
        this.needsGesture = true;
        audio.pause();
    }

    private readonly onEnded = () => {
        if (!this.active || !this.ready || this.needsGesture) return;
        this.stopPlayback();
        this.trackIndex = (this.trackIndex + 1) % this.tracks.length;
        this.loadCurrentTrack();
        this.tryPlay();
    };

    private readonly onError = () => {
        if (this.disposed) return;
        // A missing/unavailable track stops here instead of skipping and retrying forever.
        this.stopPlayback();
        this.needsGesture = true;
    };
}
