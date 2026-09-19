// InterviewLive.jsx - Live Interview Session
import { Play, Pause, Square, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Panel from "../components/Panel";
import MetricBox from "../components/MetricBox";
import FeedbackRow from "../components/FeedbackRow";
import SpeechMeter from "../components/SpeechMeter";
import ConfidenceMeter from "../components/ConfidenceMeter";
import TimerDisplay from "../components/TimerDisplay";
import WebcamPanel from "../components/WebcamPanel";
import { useSpeechMetrics } from "../hooks/useSpeechMetrics";
import { useConfidenceScore } from "../hooks/useConfidenceScore";
import { aiAPI, reportAPI, sessionAPI } from "../services/endpoints";
import { useLiveMetrics } from "../hooks/useLiveMetrics";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

const SAFE_WPM_MIN = 90;
const SAFE_WPM_MAX = 150;
const RAPID_WPM_DROP = 8;
const GOOD_CLARITY_MIN = 70;
const MAX_INTERVIEW_SECONDS = 15 * 60;

export default function InterviewLive() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const sessionId = state?.sessionId || null;
  const [isPaused, setIsPaused] = useState(false);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [whisperError, setWhisperError] = useState(null);
  const [isRapidSilence, setIsRapidSilence] = useState(false);
  const previousWpmRef = useRef(null);
  const autoEndTriggeredRef = useRef(false);
  const { startRecording, stopRecording, isRecording, error: recorderError } = useAudioRecorder();
  const {
    wpm,
    fillerWords,
    clarity,
    isListening: isSpeechListening,
    isSupported: isSpeechSupported,
    error: speechError,
    startListening,
    isStarting: isSpeechStarting,
    isWaitingForSpeech,
    hasSpeechData,
    transcript,
  } = useSpeechMetrics(!isPaused && !isSessionEnded);
  const liveMetrics = useLiveMetrics(sessionId, { wpm, fillerWords, clarity, eyeContact: 0, blinkScore: 0, headStability: 0, overallConfidence: 0, warnings: [], feedback: [] });
  const {
    eyeContact,
    blinkScore,
    headStability,
    overallConfidence,
    isConnected: isCvConnected,
    faceDetected,
    warnings,
  } = useConfidenceScore(sessionId);

  const metricEyeContact = isCvConnected ? eyeContact : 0;
  const metricBlinkScore = isCvConnected ? blinkScore : 0;
  const metricHeadStability = isCvConnected ? headStability : 0;
  const metricOverallConfidence = isCvConnected ? overallConfidence : 0;
  const liveWarnings = liveMetrics.warnings && liveMetrics.warnings.length > 0 ? liveMetrics.warnings : warnings;

  useEffect(() => {
    if (isSpeechListening && !isRecording && !isSessionEnded) startRecording();
  }, [isSpeechListening, isRecording, isSessionEnded, startRecording]);

  useEffect(() => {
    if (!isSpeechListening || !hasSpeechData || isSessionEnded) {
      previousWpmRef.current = null;
      setIsRapidSilence(false);
      return;
    }

    const previousWpm = previousWpmRef.current;
    const currentWpm = Number(wpm) || 0;

    if (previousWpm !== null) {
      const wpmDrop = previousWpm - currentWpm;
      const previousWpmWasSafe = previousWpm >= SAFE_WPM_MIN && previousWpm <= SAFE_WPM_MAX;
      const currentWpmIsSafe = currentWpm >= SAFE_WPM_MIN && currentWpm <= SAFE_WPM_MAX;

      if (wpmDrop >= RAPID_WPM_DROP && (previousWpmWasSafe || currentWpmIsSafe)) {
        setIsRapidSilence(true);
      } else if (currentWpm > previousWpm) {
        setIsRapidSilence(false);
      }
    }

    previousWpmRef.current = currentWpm;
  }, [wpm, isSpeechListening, hasSpeechData, isSessionEnded]);

  useEffect(() => {
    let interval;
    if (!isPaused && !isSessionEnded) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => Math.min(MAX_INTERVIEW_SECONDS, prev + 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, isSessionEnded]);

  const handleStartNewSession = () => {
    navigate('/interview-setup');
  };

  const handleEndSession = useCallback(async () => {
    let finalTranscript = transcript;
    setWhisperError(null);

    const audioBlob = await stopRecording();
    if (audioBlob) {
      try {
        const whisperResult = await aiAPI.transcribeAudio(audioBlob);
        if (whisperResult.transcript?.trim()) finalTranscript = whisperResult.transcript.trim();
      } catch (error) {
        setWhisperError('Whisper transcription was unavailable; the browser transcript was used.');
        console.warn('[Whisper] Could not transcribe interview audio:', error.message);
      }
    } else if (recorderError) {
      setWhisperError(recorderError);
    }

    if (sessionId) {
      try {
        await sessionAPI.completeSession(sessionId, {
          duration: elapsedSeconds,
          transcription: finalTranscript,
          speechMetrics: { pace: wpm, fillers: fillerWords, clarity },
        });
      } catch (error) {
        console.warn('[Session] Could not complete backend session:', error.message);
      }
    }
    setIsSessionEnded(true);
  }, [clarity, elapsedSeconds, fillerWords, recorderError, sessionId, stopRecording, transcript, wpm]);

  useEffect(() => {
    if (elapsedSeconds < MAX_INTERVIEW_SECONDS || isSessionEnded || autoEndTriggeredRef.current) {
      return;
    }

    autoEndTriggeredRef.current = true;
    handleEndSession();
  }, [elapsedSeconds, handleEndSession, isSessionEnded]);

  const remainingSeconds = Math.max(0, MAX_INTERVIEW_SECONDS - elapsedSeconds);
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingSecondsInMinute = remainingSeconds % 60;
  const remainingLabel = `${remainingMinutes}m ${String(remainingSecondsInMinute).padStart(2, '0')}s`;

  const handleGenerateReport = async () => {
    if (!sessionId) {
      setReportError('This interview is not linked to a saved session');
      return;
    }
    try {
      setIsGeneratingReport(true);
      setReportError(null);
      const response = await reportAPI.generateReport(sessionId);
      const reportId = response.data.data?._id;
      if (reportId) navigate(`/report-view/${reportId}`);
    } catch (error) {
      setReportError(error.response?.data?.message || 'Could not generate the report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0b1220] via-[#0f1b2e] to-[#0b1220] text-white p-6">

      {remainingSeconds > 0 && remainingSeconds <= 60 && !isSessionEnded && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-red-600 bg-red-950/95 px-6 py-3 text-center text-red-200 shadow-2xl"
          role="alert"
        >
          Only <span className="font-bold text-red-300">{remainingLabel}</span> left in this interview.
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl font-bold">
            A
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-wide">ARAMBH</h1>
            <p className="text-sm text-slate-400">
              Real-Time AI Interview Assessment
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700" />
          <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700" />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

        {/* LEFT PANEL - Speech Meter */}
        <div className="lg:col-span-2">
          <Panel>
            <h2 className="text-slate-300 text-sm mb-4">Speech Accuracy</h2>
            <SpeechMeter percent={clarity} />
            <div className="space-y-4">
              <MetricBox label="Words Per Minute" value={wpm ? `${wpm} WPM` : 'Waiting for speech'} good={wpm > 0} />
              <MetricBox label="Filler Words Count" value={fillerWords} warn />
              <MetricBox label="Clarity Score" value={clarity ? `${clarity}%` : 'Waiting for speech'} good={clarity > 0} />
            </div>
          </Panel>
        </div>

        {/* CENTER - Webcam Panel (Larger) */}
        <div className="lg:col-span-8">
          <Panel className="h-full">
            <WebcamPanel isEnabled={!isPaused && !isSessionEnded} isSessionEnded={isSessionEnded} isPaused={isPaused} isCvConnected={isCvConnected} faceDetected={faceDetected} />
          </Panel>

          <Panel className="mt-6">
            <h3 className="text-slate-300 mb-4">Real-Time Feedback</h3>
            {speechError && (
              <div className="rounded-xl border border-yellow-700 bg-yellow-900/30 px-4 py-3 text-yellow-400 flex items-center justify-between gap-4">
                <span>{speechError}</span>
                <button type="button" onClick={startListening} disabled={isSpeechStarting} className="rounded-lg bg-yellow-600 px-3 py-1 text-sm text-white hover:bg-yellow-500 disabled:cursor-wait disabled:opacity-60">
                  {isSpeechStarting ? 'Starting...' : 'Enable Speech'}
                </button>
              </div>
            )}
            {whisperError && <FeedbackRow text={whisperError} type="warn" />}
            {!isSpeechSupported && !speechError && <FeedbackRow text="Speech recognition is unavailable in this browser" type="warn" />}
            {isSpeechSupported && !isSpeechListening && !isSessionEnded && !speechError && (
              <div className="rounded-xl border border-blue-700 bg-blue-900/30 px-4 py-3 text-blue-300 flex items-center justify-between gap-4">
                <span>Start speech measurement to calculate WPM from your words</span>
                <button type="button" onClick={startListening} disabled={isSpeechStarting} className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
                  {isSpeechStarting ? 'Starting...' : 'Start Speech'}
                </button>
              </div>
            )}
            {isSpeechSupported && !speechError && !isSpeechListening && !isSessionEnded && (
              <FeedbackRow text="Waiting for speech input" type="info" />
            )}
            {isSpeechListening && !hasSpeechData && <FeedbackRow text={isWaitingForSpeech ? 'Listening. Speak now to calculate WPM...' : 'Listening for speech input...'} type="info" />}
            {isSpeechListening && hasSpeechData && <FeedbackRow text="Speech is being measured" type="info" />}
            {fillerWords > 0 && <FeedbackRow text={`Filler words detected (${fillerWords}). Try to answer more directly.`} type="danger" />}
            {isSpeechListening && hasSpeechData && (isWaitingForSpeech || isRapidSilence) && <FeedbackRow text="Speech rate is dropping quickly. You may have stopped speaking." type="danger" />}
            {isSpeechListening && hasSpeechData && wpm >= SAFE_WPM_MIN && wpm <= SAFE_WPM_MAX && clarity >= GOOD_CLARITY_MIN && !isWaitingForSpeech && !isRapidSilence && (
              <FeedbackRow text="Great speaking skills and clarity. Your pace is in the safe range." type="success" />
            )}
            {!isCvConnected && <FeedbackRow text="CV analysis is connecting..." type="info" />}
            {isCvConnected && !faceDetected && <FeedbackRow text="Face not detected. Move closer and keep your face visible." type="warn" />}
            {isCvConnected && liveWarnings.length === 0 && (
              <FeedbackRow text="Behavioral indicators are steady" type="success" />
            )}
            {liveWarnings.map((warning) => (
              <FeedbackRow key={warning} text={warning} type="warn" />
            ))}
          </Panel>
        </div>

        {/* RIGHT PANEL - Confidence Meter */}
        <div className="lg:col-span-2">
          <Panel>
            <h2 className="text-slate-300 text-sm mb-4">Confidence Level</h2>
            <ConfidenceMeter percent={metricOverallConfidence} available={isCvConnected} />
            <div className="space-y-4">
              <MetricBox label="Eye Contact" value={isCvConnected ? `${metricEyeContact}%` : '--'} good={isCvConnected} />
              <MetricBox label="Blink Behavior" value={isCvConnected ? `${metricBlinkScore}%` : '--'} good={isCvConnected} />
              <MetricBox label="Head Stability" value={isCvConnected ? `${metricHeadStability}%` : '--'} good={isCvConnected} />
            </div>
          </Panel>
        </div>

      </div>

      {/* Bottom Controls */}
      <div className="mt-6 bg-[#0f1b2e]/90 border border-slate-800 rounded-2xl shadow-xl p-6 flex flex-wrap gap-4 justify-between">

        <div className="flex flex-wrap gap-4">
          {!isSessionEnded && (
            <>
              {!isPaused ? (
                <BtnBlue onClick={() => setIsPaused(true)}>
                  <Pause size={18}/> Pause
                </BtnBlue>
              ) : (
                <BtnGreen onClick={() => setIsPaused(false)}>
                  <Play size={18}/> Resume
                </BtnGreen>
              )}
              <BtnRed onClick={handleEndSession}>
                <Square size={18}/> End Session
              </BtnRed>
            </>
          )}
          {isSessionEnded && (
            <>
              <BtnGreen onClick={handleStartNewSession}>
                <Play size={18}/> Start New Session
              </BtnGreen>
              <BtnCyan onClick={handleGenerateReport} disabled={isGeneratingReport}>
                <FileText size={18}/> Generate Report
              </BtnCyan>
              {reportError && <p className="basis-full text-sm text-red-400">{reportError}</p>}
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <TimerDisplay seconds={elapsedSeconds} isPaused={isPaused} isSessionEnded={isSessionEnded} />
          
          {isSessionEnded ? (
            <motion.div
              className="px-4 py-2 rounded-xl border border-red-700 bg-red-900/50 text-red-400 text-sm font-semibold flex items-center gap-2"
            >
              ●
              <span>ENDED</span>
            </motion.div>
          ) : isPaused ? (
            <motion.div
              className="px-4 py-2 rounded-xl border border-yellow-700 bg-yellow-900/50 text-yellow-400 text-sm font-semibold flex items-center gap-2"
            >
              ⏸
              <span>PAUSED</span>
            </motion.div>
          ) : (
            <motion.div
              className="px-4 py-2 rounded-xl border border-green-700 bg-green-900/50 text-green-400 text-sm font-semibold flex items-center gap-2"
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ●
              </motion.span>
              <span>LIVE</span>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}

const BtnBlue = ({children, onClick}) =>
  <button onClick={onClick} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl flex gap-2 transition">{children}</button>;

const BtnGreen = ({children, onClick}) =>
  <button onClick={onClick} className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl flex gap-2 transition">{children}</button>;

const BtnRed = ({children, onClick}) =>
  <button onClick={onClick} className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl flex gap-2 transition">{children}</button>;

const BtnCyan = ({children, onClick, disabled}) =>
  <button onClick={onClick} disabled={disabled} className="bg-cyan-600 hover:bg-cyan-700 px-6 py-3 rounded-xl flex gap-2 transition disabled:cursor-wait disabled:opacity-60">{children}</button>;
