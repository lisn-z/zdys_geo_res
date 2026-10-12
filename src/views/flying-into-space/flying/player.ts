import { STORY, TOTAL_DURATION, locateStory, type StoryGate } from './story';
import { HISTORY_QUIZZES, type HistoryQuiz } from './quizzes';
import type { LandingState } from './math';
import type { VisualState } from './worlds';

export interface QuizResult { answer: number | null; correct: boolean; skipped: boolean; }
export class StoryPlayer {
    time = 0;
    playing = false;
    started = false;
    experience: 'film' | 'task' = 'film';
    private interactions = false;
    get interactionEnabled() { return this.interactions; }
    set interactionEnabled(enabled: boolean) {
        this.interactions = enabled;
        if (!enabled && this.quiz) this.skipQuiz();
    }
    get mode(): 'auto' | 'interactive' { return this.interactionEnabled ? 'interactive' : 'auto'; }
    set mode(value: 'auto' | 'interactive') { this.interactionEnabled = value === 'interactive'; }
    speed = 1;
    ended = false;
    quiz: HistoryQuiz | null = null;
    quizAnswer: number | null = null;
    quizResults = new Map<number, QuizResult>();
    private seenQuizzes = new Set<number>();
    private quizResumePlaying = false;
    private filmReturnTime = 0;
    private filmReturnPlaying = false;
    // Legacy rendering fields remain; historical model actions run on their story clocks.
    gate: StoryGate | null = null;
    lastGate: StoryGate | null = null;
    completed = new Map<string, 'user' | 'demo'>();
    missionArmed = false;
    get waitingForLaunch() { return false; }
    interactionTime = 0;
    thrust = false;
    orbitSpeed = 7.67;
    orbitRun = 0;
    orbitRunning = false;
    orbitFeedback = '';
    landing: LandingState | null = null;
    relay = false;
    roverTarget = 1;
    stationPart = '';
    feedback = '';
    quality: 'balanced' | 'high' = 'balanced';
    get located() { return locateStory(this.time); }
    get visual(): VisualState {
        return { speed: this.orbitSpeed, orbitRun: this.orbitRun, landing: null, relay: this.relay,
            roverTarget: this.roverTarget, stationPart: this.stationPart, activeKind: '', thrust: false,
            demo: true, taskArmed: false, quality: this.quality };
    }
    start() {
        if (this.experience === 'task') { this.playing = false; return; }
        if (this.ended) this.seek(0);
        this.started = true; this.ended = false; this.playing = !this.quiz;
    }
    setExperience(experience: 'film' | 'task') {
        if (experience === this.experience) return;
        this.thrust = false;
        if (experience === 'task') {
            this.filmReturnTime = this.time;
            this.filmReturnPlaying = this.quiz ? this.quizResumePlaying : this.playing;
            if (this.quiz) this.dismissQuiz(false);
            this.experience = 'task'; this.playing = false;
        } else {
            this.experience = 'film'; this.time = this.filmReturnTime;
            this.playing = this.filmReturnPlaying && this.started && !this.ended;
        }
    }
    tick(dt: number) {
        if (!Number.isFinite(dt) || dt < 0 || this.experience !== 'film' || !this.playing || !this.started || this.ended || this.quiz) return;
        const next = Math.min(TOTAL_DURATION, this.time + Math.min(dt,.1) * this.speed);
        const upcoming = this.interactionEnabled ? HISTORY_QUIZZES.find(quiz => {
            const chapter = STORY[quiz.chapterId];
            if (!chapter) return false;
            const at = chapter.start + quiz.at;
            return at > this.time && at <= next && !this.seenQuizzes.has(quiz.chapterId);
        }) : undefined;
        if (upcoming) {
            this.time = STORY[upcoming.chapterId]!.start + upcoming.at;
            this.quiz = upcoming; this.quizAnswer = null; this.feedback = '';
            this.quizResumePlaying = this.playing; this.playing = false;
            return;
        }
        this.time = next;
        if (this.time >= TOTAL_DURATION) { this.ended = true; this.playing = false; this.thrust = false; }
    }
    answerQuiz(index: number): boolean {
        if (!this.quiz || this.quizAnswer !== null || !Number.isInteger(index) || index < 0 || index >= this.quiz.choices.length) return false;
        this.quizAnswer = index;
        const correct = index === this.quiz.correctIndex;
        this.quizResults.set(this.quiz.chapterId,{ answer: index, correct, skipped: false });
        this.feedback = correct ? '回答正确' : '再记住这一点就好';
        return true;
    }
    private dismissQuiz(resume: boolean) {
        if (!this.quiz) return;
        if (this.quizAnswer === null) this.quizResults.set(this.quiz.chapterId,{answer:null,correct:false,skipped:true});
        this.seenQuizzes.add(this.quiz.chapterId);
        this.quiz = null; this.quizAnswer = null; this.feedback = '';
        if (resume) this.playing = this.quizResumePlaying && this.experience === 'film' && !this.ended;
        this.quizResumePlaying = false;
    }
    continueQuiz() { this.dismissQuiz(true); }
    skipQuiz() { this.dismissQuiz(true); }
    /** Seeking never requires an answer or a demonstration confirmation. */
    seek(target: number, _allowDemonstration = false) {
        if (!Number.isFinite(target)) return false;
        target = Math.max(0,Math.min(TOTAL_DURATION-.01,target));
        const resume = this.quiz ? this.quizResumePlaying : this.playing;
        if (this.quiz) this.dismissQuiz(false);
        if (target < this.time) {
            for (const quiz of HISTORY_QUIZZES) {
                const chapter = STORY[quiz.chapterId];
                if (chapter && chapter.start + quiz.at >= target) this.seenQuizzes.delete(quiz.chapterId);
            }
        }
        this.time = target; this.started = true; this.ended = false;
        this.playing = this.experience === 'film' && resume;
        if (this.experience === 'task') this.filmReturnTime = target;
        this.gate = null; this.lastGate = null; this.thrust = false; this.landing = null;
        this.feedback = ''; this.orbitRunning = false; this.interactionTime = 0;
        return true;
    }
    // These compatibility methods cannot start the independent launch mission.
    action() { if (!this.started) this.start(); else if (this.quiz) this.continueQuiz(); }
    demonstrate() { this.skipQuiz(); }
    retry() { if (this.quiz) { this.quizResults.delete(this.quiz.chapterId); this.quizAnswer = null; this.feedback = ''; } }
    finishGate(_source: 'user' | 'demo' = 'user', _localEnd?: number) { this.gate = null; }
    setMode(mode: 'auto' | 'interactive') { this.mode = mode; this.thrust = false; }
    reset() {
        this.experience = 'film'; this.interactions = false; this.filmReturnTime = 0; this.filmReturnPlaying = false;
        this.time = 0; this.playing = false; this.started = false; this.ended = false;
        this.quiz = null; this.quizAnswer = null; this.quizResumePlaying = false; this.quizResults.clear(); this.seenQuizzes.clear();
        this.gate = null; this.lastGate = null; this.completed.clear(); this.missionArmed = false; this.thrust = false;
        this.landing = null; this.relay = false; this.roverTarget = 1; this.stationPart = ''; this.orbitRun = 0;
        this.orbitRunning = false; this.orbitFeedback = ''; this.feedback = ''; this.interactionTime = 0;
    }
}
