// InterviewLive.jsx - Live Interview Session
import { Play, Pause, Square, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Panel from "../components/Panel";
import MetricBox from "../components/MetricBox";
import FeedbackRow from "../components/FeedbackRow";
import SpeechMeter from "../components/SpeechMeter";
import ConfidenceMeter from "../components/ConfidenceMeter";
import TimerDisplay from "../components/TimerDisplay";
import WebcamPanel from "../components/WebcamPanel";
import InterviewerPanel from "../components/InterviewerPanel";
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
const ANSWER_SILENCE_DELAY_MS = 1800;

const InterviewState = {
  IDLE: "idle",
  AI_SPEAKING: "ai-speaking",
  LISTENING: "listening",
  PROCESSING: "processing",
  FINISHED: "finished",
};

const normalizeSessionId = (value) => {
  const match = String(value || '').match(/[a-f\d]{24}/i);
  return match ? match[0] : null;
};

export default function InterviewLive() {
  const { state, search } = useLocation();
  const navigate = useNavigate();
  const urlSessionId = normalizeSessionId(new URLSearchParams(search).get('sessionId'));
  const storedSessionId = typeof window !== 'undefined'
    ? normalizeSessionId(sessionStorage.getItem('currentInterviewSessionId') || localStorage.getItem('currentInterviewSessionId'))
    : null;
  const stateSessionId = normalizeSessionId(state?.sessionId);
  const [resolvedSessionId, setResolvedSessionId] = useState(stateSessionId || urlSessionId || storedSessionId || null);
  const sessionId = resolvedSessionId || null;
  const [isPaused, setIsPaused] = useState(false);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionError, setQuestionError] = useState(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isQuestionSpeaking, setIsQuestionSpeaking] = useState(false);
  const [interviewState, setInterviewState] = useState(InterviewState.IDLE);
  const [whisperError, setWhisperError] = useState(null);
  const [isRapidSilence, setIsRapidSilence] = useState(false);
  const previousWpmRef = useRef(null);
  const autoEndTriggeredRef = useRef(false);
  const interviewAnswersRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const spokenQuestionRef = useRef('');
  const answerReadyAtRef = useRef(0);
  const answerSubmittedRef = useRef(false);
  const questionRequestInFlightRef = useRef(false);
  const initialQuestionRequestedRef = useRef(false);
  const isMountedRef = useRef(true);
  const { startRecording, stopRecording, isRecording, error: recorderError } = useAudioRecorder();
  const {
    wpm,
    fillerWords,
    clarity,
    isListening: isSpeechListening,
    isSupported: isSpeechSupported,
    error: speechError,
    startListening,
    isWaitingForSpeech,
    hasSpeechData,
    resetTranscript,
    transcript,
    interimTranscript,
    stopListening,
  } = useSpeechMetrics(!isPaused && !isSessionEnded);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
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
    if (stateSessionId) {
      setResolvedSessionId(stateSessionId);
    } else if (urlSessionId) {
      setResolvedSessionId(urlSessionId);
    } else if (storedSessionId) {
      setResolvedSessionId(storedSessionId);
    }
  }, [stateSessionId, urlSessionId, storedSessionId]);

  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem('currentInterviewSessionId', sessionId);
      localStorage.setItem('currentInterviewSessionId', sessionId);
    } else {
      sessionStorage.removeItem('currentInterviewSessionId');
      localStorage.removeItem('currentInterviewSessionId');
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      let cancelled = false;
      sessionAPI.getSessions(1, 20, { status: 'in-progress' })
        .then((response) => {
          if (cancelled) return;
          const activeSession = response?.data?.data?.[0];
          if (activeSession?._id) {
            setResolvedSessionId(activeSession._id);
          }
        })
        .catch(() => {
          // Ignore and keep the current flow as-is.
        });

      return () => {
        cancelled = true;
      };
    }
  }, [sessionId]);

  useEffect(() => {
    if (isSpeechListening && !isRecording && !isSessionEnded) startRecording();
  }, [isSpeechListening, isRecording, isSessionEnded, startRecording]);

  useEffect(() => {
    if (!sessionId || currentQuestion || isSessionEnded || initialQuestionRequestedRef.current || questionRequestInFlightRef.current) return;
    initialQuestionRequestedRef.current = true;
    questionRequestInFlightRef.current = true;
    setIsLoadingQuestion(true);
    sessionAPI.getNextInterviewQuestion(sessionId)
      .then((response) => {
        setCurrentQuestion(response.data.data);
        setInterviewState(InterviewState.AI_SPEAKING);
      })
      .catch((error) => {
        initialQuestionRequestedRef.current = false;
        setQuestionError(error.response?.data?.message || 'Could not load the interview question');
      })
      .finally(() => {
        questionRequestInFlightRef.current = false;
        setIsLoadingQuestion(false);
      });
  }, [currentQuestion, isSessionEnded, sessionId]);

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
    sessionStorage.removeItem('currentInterviewSessionId');
    navigate('/interview-setup');
  };

  const handleEndSession = useCallback(async () => {
    let finalTranscript = [...interviewAnswersRef.current, transcript].filter(Boolean).join('\n\n');
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
    setInterviewState(InterviewState.FINISHED);
    setIsSessionEnded(true);
    if ('speechSynthesis' in window) {
      window.setTimeout(() => {
        const farewell = new SpeechSynthesisUtterance(
          'Thank you for completing your AARAMBH mock interview. Your responses have been recorded. All the best.'
        );
        farewell.lang = 'en-IN';
        farewell.rate = 0.95;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(farewell);
      }, 0);
    }
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

  const finishAnswer = useCallback(async () => {
    if (interviewState !== InterviewState.LISTENING || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;
    setInterviewState(InterviewState.PROCESSING);
    stopListening();

    const answerText = `${transcript} ${interimTranscript}`.trim();
    if (!sessionId || !currentQuestion || !answerText) {
      answerSubmittedRef.current = false;
      setInterviewState(InterviewState.LISTENING);
      setQuestionError('Speak an answer before requesting the next question.');
      return;
    }
    if (questionRequestInFlightRef.current) return;
    questionRequestInFlightRef.current = true;
    try {
      setIsSubmittingAnswer(true);
      setQuestionError(null);
      interviewAnswersRef.current.push(answerText);
      const response = await sessionAPI.getNextInterviewQuestion(sessionId, {
        answer: answerText,
        analysis: {},
      });
      if (!isMountedRef.current) return;
      setCurrentQuestion(response.data.data);
      resetTranscript();
      setInterviewState(InterviewState.AI_SPEAKING);
    } catch (error) {
      if (!isMountedRef.current) return;
      answerSubmittedRef.current = false;
      setInterviewState(InterviewState.LISTENING);
      setQuestionError(error.response?.data?.message || 'Could not evaluate the answer');
    } finally {
      questionRequestInFlightRef.current = false;
      setIsSubmittingAnswer(false);
    }
  }, [currentQuestion, interimTranscript, interviewState, resetTranscript, sessionId, stopListening, transcript]);

  useEffect(() => {
    if (interviewState !== InterviewState.AI_SPEAKING || !currentQuestion?.question || isSessionEnded || isPaused) return undefined;
    if (!('speechSynthesis' in window)) {
      answerReadyAtRef.current = Date.now();
      setInterviewState(InterviewState.LISTENING);
      startListening();
      return undefined;
    }

    window.speechSynthesis.cancel();
    stopListening();
    resetTranscript();
    answerSubmittedRef.current = false;
    answerReadyAtRef.current = 0;
    setIsQuestionSpeaking(true);
    spokenQuestionRef.current = currentQuestion.question;
    const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
    utterance.lang = 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    const resumeCandidateSpeech = () => {
      setIsQuestionSpeaking(false);
      answerReadyAtRef.current = Date.now();
      setInterviewState(InterviewState.LISTENING);
      startListening();
    };
    utterance.onend = resumeCandidateSpeech;
    utterance.onerror = () => {
      setQuestionError('The interviewer could not finish speaking the question. Please try again.');
      setIsQuestionSpeaking(false);
    };
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      setIsQuestionSpeaking(false);
    };
  }, [currentQuestion?.question, interviewState, isPaused, isSessionEnded, resetTranscript, startListening, stopListening]);

  useEffect(() => {
    const hasAnswer = Boolean(`${transcript} ${interimTranscript}`.trim());
    if (interviewState !== InterviewState.LISTENING || !hasAnswer || isSubmittingAnswer || answerSubmittedRef.current || isSessionEnded || isPaused || isQuestionSpeaking) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      return undefined;
    }

    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      if (answerSubmittedRef.current) return;
      finishAnswer();
    }, ANSWER_SILENCE_DELAY_MS);

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [finishAnswer, interimTranscript, interviewState, isPaused, isQuestionSpeaking, isSessionEnded, isSubmittingAnswer, transcript]);

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
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <InterviewerPanel isSpeaking={isQuestionSpeaking} isPaused={isPaused} isSessionEnded={isSessionEnded} />
              <WebcamPanel isEnabled={!isPaused && !isSessionEnded} isSessionEnded={isSessionEnded} isPaused={isPaused} isCvConnected={isCvConnected} faceDetected={faceDetected} />
            </div>
          </Panel>

          <Panel className="mt-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-cyan-400">Resume-grounded question</p>
                <h2 className="text-lg font-semibold mt-1">{isLoadingQuestion ? 'Preparing your first question...' : currentQuestion?.question || 'Question unavailable'}</h2>
              </div>
              {currentQuestion?.difficulty && <span className="text-xs rounded-full border border-slate-700 px-3 py-1 text-slate-300">{currentQuestion.difficulty}</span>}
            </div>
            {currentQuestion?.topic && <p className="text-sm text-slate-400 mb-4">Topic: {currentQuestion.topic}{currentQuestion.follow_up ? ' | Follow-up' : ''}</p>}
            {questionError && <p className="text-sm text-red-400 mb-3">{questionError}</p>}
            {isSubmittingAnswer && <p className="text-sm text-cyan-300">Analyzing answer...</p>}
            {isSpeechListening && (
              <p className="text-sm text-slate-300">
                {`${transcript} ${interimTranscript}`.trim() || 'Listening for your answer...'}
              </p>
            )}
          </Panel>

          <Panel className="mt-6">
            <h3 className="text-slate-300 mb-4">Real-Time Feedback</h3>
            {speechError && (
              <div className="rounded-xl border border-yellow-700 bg-yellow-900/30 px-4 py-3 text-yellow-400 flex items-center justify-between gap-4">
                <span>{speechError}</span>
              </div>
            )}
            {whisperError && <FeedbackRow text={whisperError} type="warn" />}
            {!isSpeechSupported && !speechError && <FeedbackRow text="Speech recognition is unavailable in this browser" type="warn" />}
            {isSpeechSupported && !isSpeechListening && !isSessionEnded && !speechError && (
              <div className="rounded-xl border border-blue-700 bg-blue-900/30 px-4 py-3 text-blue-300 flex items-center justify-between gap-4">
                <span>Start speech measurement to calculate WPM from your words</span>
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
