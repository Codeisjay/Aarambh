// useSpeechMetrics.js
import { useCallback, useEffect, useRef, useState } from "react";

const WORD_REGEX = /\b[A-Za-z]+(?:['-][A-Za-z]+)*\b/g;

const FILLER_REGEX =
  /\b(?:um+|uh+|erm+|hmm+|like|actually|basically|you know|i mean|kind of|sort of)\b/gi;

// Target UI/metric refresh rate
const UPDATE_INTERVAL = 200;

// Maximum reasonable interview speaking rate
const MAX_WPM = 220;

// Maximum amount of time we consider between two
// speech-recognition results as active speech.
const MAX_SPEECH_GAP_MS = 1500;

// Small initial speech duration to prevent huge WPM
// from appearing after only one result.
const INITIAL_SPEECH_MS = 500;

export function useSpeechMetrics(isEnabled = true) {
  const [wpm, setWpm] = useState(0);
  const [fillerWords, setFillerWords] = useState(0);
  const [clarity, setClarity] = useState(0);

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isWaitingForSpeech, setIsWaitingForSpeech] =
    useState(true);

  const [hasSpeechData, setHasSpeechData] =
    useState(false);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const recognitionRunningRef = useRef(false);
  const restartTimerRef = useRef(null);

  /*
   * ==========================================
   * FINAL SPEECH DATA
   * ==========================================
   *
   * Only finalized recognition results are
   * permanently stored here.
   */
  const finalWordCountRef = useRef(0);
  const finalFillerCountRef = useRef(0);
  const transcriptRef = useRef('');

  /*
   * ==========================================
   * INTERIM SPEECH DATA
   * ==========================================
   *
   * These values are temporary.
   *
   * Example:
   *
   * "hello"
   * "hello my"
   * "hello my name"
   *
   * We only keep the latest version.
   */
  const interimWordCountRef = useRef(0);
  const interimFillerCountRef = useRef(0);

  /*
   * ==========================================
   * SPEECH TIMING
   * ==========================================
   *
   * This is the important WPM fix.
   *
   * We DON'T use:
   *
   * currentTime - firstSpeechTime
   *
   * because that would count silence.
   *
   * Instead, we accumulate only the time
   * between speech recognition results.
   */
  const activeSpeechMsRef = useRef(0);

  const lastSpeechResultAtRef =
    useRef(null);

  /*
   * Used only for debugging / state.
   */
  const firstSpeechAtRef = useRef(null);

  /*
   * ==========================================
   * WORD COUNT
   * ==========================================
   */
  const countWords = useCallback((text) => {
    if (!text) {
      return 0;
    }

    return (
      text.match(WORD_REGEX) || []
    ).length;
  }, []);

  /*
   * ==========================================
   * FILLER COUNT
   * ==========================================
   */
  const countFillers = useCallback((text) => {
    if (!text) {
      return 0;
    }

    const matches =
      text.match(FILLER_REGEX);

    return matches
      ? matches.length
      : 0;
  }, []);

  /*
   * ==========================================
   * RECORD ACTIVE SPEECH
   * ==========================================
   *
   * Called whenever a speech recognition
   * result arrives.
   */
  const recordSpeechActivity =
    useCallback(() => {
      const now = Date.now();

      /*
       * First speech result.
       */
      if (!firstSpeechAtRef.current) {
        firstSpeechAtRef.current =
          now;

        lastSpeechResultAtRef.current =
          now;

        /*
         * Give the first recognition result
         * a small amount of speech duration.
         */
        activeSpeechMsRef.current =
          INITIAL_SPEECH_MS;

        return;
      }

      if (
        lastSpeechResultAtRef.current
      ) {
        const gap =
          now -
          lastSpeechResultAtRef.current;

        /*
         * Only count a reasonable gap.
         *
         * If the candidate stopped speaking for
         * 10 seconds, we don't add those 10 seconds
         * to speaking time.
         */
        activeSpeechMsRef.current +=
          Math.min(
            Math.max(gap, 0),
            MAX_SPEECH_GAP_MS
          );
      }

      lastSpeechResultAtRef.current =
        now;
    }, []);

  /*
   * ==========================================
   * CALCULATE METRICS
   * ==========================================
   */
  const calculateMetrics =
    useCallback(() => {
      const finalWords =
        finalWordCountRef.current;

      const finalFillers =
        finalFillerCountRef.current;

      const interimWords =
        interimWordCountRef.current;

      const interimFillers =
        interimFillerCountRef.current;

      /*
       * Visible values =
       *
       * finalized speech
       * +
       * current interim speech
       */
      const totalWords =
        finalWords +
        interimWords;

      const totalFillers =
        finalFillers +
        interimFillers;

      if (totalWords <= 0) {
        setWpm(0);
        setFillerWords(0);
        setClarity(0);
        setHasSpeechData(false);
        return;
      }

      /*
       * ========================================
       * WPM
       * ========================================
       */
      const idleSpeechMs = lastSpeechResultAtRef.current
        ? Math.max(0, Date.now() - lastSpeechResultAtRef.current - MAX_SPEECH_GAP_MS)
        : 0;

      const activeSpeechMs = Math.max(
        activeSpeechMsRef.current + idleSpeechMs,
        INITIAL_SPEECH_MS
      );

      const activeSpeechMinutes =
        activeSpeechMs / 60000;

      let calculatedWpm =
        totalWords /
        activeSpeechMinutes;

      /*
       * Prevent unrealistic values, but do not
       * bury the WPM value in an artificial
       * zero bucket when the user has already
       * spoken words.
       */

      /*
       * Prevent unrealistic values.
       */
      calculatedWpm = Math.min(
        MAX_WPM,
        Math.max(
          0,
          calculatedWpm
        )
      );

      /*
       * ========================================
       * FILLER RATE
       * ========================================
       */
      const fillerRatio =
        totalWords > 0
          ? totalFillers /
            totalWords
          : 0;

      /*
       * ========================================
       * CLARITY
       * ========================================
       *
       * 0% fillers  = 100
       * 5% fillers  = 80
       * 10% fillers = 60
       * 25% fillers = 0
       */
      const calculatedClarity =
        Math.max(0, Math.min(100, Math.round(
          100 - fillerRatio * 400 - (
            calculatedWpm < 90
              ? Math.min(35, (90 - calculatedWpm) * 0.35)
              : calculatedWpm > 170
                ? Math.min(35, (calculatedWpm - 170) * 0.35)
                : 0
          )
        )));

      setWpm(
        Math.round(
          calculatedWpm
        )
      );

      setFillerWords(
        totalFillers
      );

      setClarity(
        calculatedClarity
      );

      setHasSpeechData(true);
    }, []);

  /*
   * ==========================================
   * MAIN SPEECH RECOGNITION EFFECT
   * ==========================================
   */
  useEffect(() => {
    if (!isEnabled) {
      return undefined;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    /*
     * Browser support check.
     */
    if (!SpeechRecognition) {
      setIsSupported(false);

      setError(
        "Speech recognition is not supported in this browser."
      );

      return undefined;
    }

    setIsSupported(true);

    console.log(
      "[Aarambh Speech] SpeechRecognition supported"
    );

    const recognition =
      new SpeechRecognition();

    /*
     * Keep recognition running.
     */
    recognition.continuous = true;

    /*
     * Required for low-latency interim
     * speech updates.
     */
    recognition.interimResults = true;

    recognition.maxAlternatives = 1;

    /*
     * Indian English.
     */
    recognition.lang = "en-IN";

    recognitionRef.current =
      recognition;

    /*
     * ==========================================
     * RECOGNITION START
     * ==========================================
     */
    recognition.onstart = () => {
      console.log(
        "[Aarambh Speech] STARTED"
      );

      setIsListening(true);
      setIsStarting(false);
      recognitionRunningRef.current = true;
      setIsWaitingForSpeech(true);
      setError(null);
    };

    /*
     * ==========================================
     * SPEECH RESULT
     * ==========================================
     */
    recognition.onresult = (
      event
    ) => {
      console.log(
        "[Aarambh Speech] RESULT",
        event
      );

      /*
       * New recognition results mean the
       * candidate is actively producing speech.
       */
      recordSpeechActivity();

      let currentInterimWords = 0;
      let currentInterimFillers = 0;

      /*
       * Process only results that changed.
       */
      for (
        let i =
          event.resultIndex;
        i <
          event.results.length;
        i++
      ) {
        const result =
          event.results[i];

        if (
          !result ||
          !result[0]
        ) {
          continue;
        }

        const transcript =
          result[0]
            .transcript
            ?.trim() || "";

        if (!transcript) {
          continue;
        }

        const words =
          countWords(
            transcript
          );

        const fillers =
          countFillers(
            transcript
          );

        console.log(
          "[Aarambh Speech] Transcript:",
          transcript,
          "Final:",
          result.isFinal
        );

        /*
         * ======================================
         * FINAL RESULT
         * ======================================
         *
         * Final results are permanently counted.
         */
        if (result.isFinal) {
          transcriptRef.current = `${transcriptRef.current} ${transcript}`.trim();
          finalWordCountRef.current +=
            words;

          finalFillerCountRef.current +=
            fillers;

          console.log(
            "[Aarambh Speech] FINAL RESULT:",
            transcript
          );

          /*
           * The interim version has now become
           * final, so clear temporary values.
           */
          currentInterimWords = 0;
          currentInterimFillers = 0;
        }

        /*
         * ======================================
         * INTERIM RESULT
         * ======================================
         *
         * Don't permanently add it.
         */
        else {
          currentInterimWords +=
            words;

          currentInterimFillers +=
            fillers;
        }
      }

      /*
       * Replace interim values.
       *
       * IMPORTANT:
       *
       * We don't add interim results to the
       * permanent counters.
       */
      interimWordCountRef.current =
        currentInterimWords;

      interimFillerCountRef.current =
        currentInterimFillers;

      setHasSpeechData(true);
      setIsWaitingForSpeech(false);

      /*
       * Update immediately instead of waiting
       * for the next 500ms interval.
       */
      calculateMetrics();
    };

    /*
     * ==========================================
     * ACTUAL SPEECH START
     * ==========================================
     */
    recognition.onspeechstart = () => {
      console.log(
        "[Aarambh Speech] ACTUAL SPEECH START"
      );

      if (
        !firstSpeechAtRef.current
      ) {
        firstSpeechAtRef.current =
          Date.now();

        lastSpeechResultAtRef.current =
          Date.now();

        activeSpeechMsRef.current =
          INITIAL_SPEECH_MS;
      }

      setIsWaitingForSpeech(false);
    };

    /*
     * ==========================================
     * SPEECH TEMPORARILY ENDED
     * ==========================================
     *
     * Recognition remains alive.
     */
    recognition.onspeechend = () => {
      console.log(
        "[Aarambh Speech] SPEECH END"
      );

      /*
       * Keep listening for the next sentence.
       */
      setIsWaitingForSpeech(true);

      /*
       * IMPORTANT:
       *
       * We DON'T add silence time to
       * activeSpeechMsRef.
       *
       * Therefore WPM won't continuously
       * decrease while the candidate thinks.
       */
    };

    /*
     * ==========================================
     * ERROR
     * ==========================================
     */
    recognition.onerror = (
      event
    ) => {
      console.error(
        "[Aarambh Speech] ERROR:",
        event.error
      );

      /*
       * These aren't fatal.
       */
      if (
        event.error ===
        "no-speech"
      ) {
        setIsWaitingForSpeech(true);
        return;
      }

      if (
        event.error ===
        "aborted"
      ) {
        recognitionRunningRef.current = false;
        if (shouldListenRef.current) {
          setIsStarting(true);
        } else {
          setIsListening(false);
        }
        return;
      }

      /*
       * Microphone permission.
       */
      if (
        event.error ===
        "not-allowed"
      ) {
        shouldListenRef.current =
          false;

        setError(
          "Microphone permission was denied."
        );
      }

      /*
       * No microphone device.
       */
      else if (
        event.error ===
        "audio-capture"
      ) {
        shouldListenRef.current =
          false;

        setError(
          "Microphone could not be accessed."
        );
      }

      /*
       * Network problem with browser
       * speech recognition.
       */
      else if (
        event.error ===
        "network"
      ) {
        setError(
          "Speech recognition network error."
        );
      }

      else {
        setError(
          `Speech recognition error: ${event.error}`
        );
      }

      setIsListening(false);
      setIsStarting(false);
      recognitionRunningRef.current = false;
    };

    /*
     * ==========================================
     * RECOGNITION END
     * ==========================================
     *
     * Chrome can terminate SpeechRecognition
     * even when continuous=true.
     */
    recognition.onend = () => {
      console.log(
        "[Aarambh Speech] RECOGNITION END"
      );

      recognitionRunningRef.current = false;

      /*
       * Restart automatically while the
       * interview is active.
       *
       * NO TIME LIMIT.
       */
      if (
        shouldListenRef.current &&
        recognitionRef.current ===
          recognition
      ) {
        if (restartTimerRef.current) {
          return;
        }

        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (
            !shouldListenRef.current ||
            recognitionRunningRef.current
          ) {
            return;
          }

          try {
            setIsStarting(true);
            recognition.start();

            console.log(
              "[Aarambh Speech] RESTARTED"
            );
          } catch {
            /*
             * Ignore duplicate start
             * errors.
             */
            setIsStarting(false);
          }
        }, 100);
      } else {
        setIsListening(false);
      }
    };

    /*
     * ==========================================
     * 500ms METRIC REFRESH
     * ==========================================
     *
     * This does NOT force Chrome to produce
     * speech results.
     *
     * It only refreshes our calculated metrics.
     */
    const metricInterval =
      window.setInterval(
        () => {
          calculateMetrics();
        },
        UPDATE_INTERVAL
      );

    /*
     * ==========================================
     * CLEANUP
     * ==========================================
     */
    return () => {
      console.log(
        "[Aarambh Speech] CLEANUP"
      );

      shouldListenRef.current =
        false;

      window.clearInterval(
        metricInterval
      );

      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }

      recognition.onstart =
        null;

      recognition.onresult =
        null;

      recognition.onspeechstart =
        null;

      recognition.onspeechend =
        null;

      recognition.onerror =
        null;

      recognition.onend =
        null;

      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }

      recognitionRef.current =
        null;
    };
  }, [
    isEnabled,
    calculateMetrics,
    countWords,
    countFillers,
    recordSpeechActivity,
  ]);

  /*
   * ==========================================
   * START LISTENING
   * ==========================================
   */
  const startListening =
    useCallback(
      async () => {
        const recognition =
          recognitionRef.current;

        if (!recognition) {
          setError(
            "Speech recognition is unavailable."
          );

          return;
        }

        if (
          !isSupported
        ) {
          setError(
            "Speech recognition is not supported in this browser."
          );

          return;
        }

        if (
          isListening ||
          isStarting
        ) {
          return;
        }

        setIsStarting(true);
        setError(null);

        try {
          /*
           * Explicit microphone permission.
           */
          const stream =
            await navigator.mediaDevices.getUserMedia(
              {
                audio: true,
              }
            );

          /*
           * We only needed the stream to
           * obtain permission.
           */
          stream
            .getTracks()
            .forEach(
              (track) => {
                track.stop();
              }
            );

          /*
           * ====================================
           * RESET FOR NEW INTERVIEW
           * ====================================
           */

          finalWordCountRef.current =
            0;

          finalFillerCountRef.current =
            0;

          transcriptRef.current = '';

          interimWordCountRef.current =
            0;

          interimFillerCountRef.current =
            0;

          activeSpeechMsRef.current =
            0;

          lastSpeechResultAtRef.current =
            null;

          firstSpeechAtRef.current =
            null;

          setWpm(0);
          setFillerWords(0);
          setClarity(0);

          setHasSpeechData(false);
          setIsWaitingForSpeech(
            true
          );

          /*
           * ====================================
           * NO TIME LIMIT
           * ====================================
           */
          shouldListenRef.current =
            true;

          console.log(
            "[Aarambh Speech] START LISTENING"
          );

          try {
            recognition.start();
            recognitionRunningRef.current = true;
          } catch (
            startError
          ) {
            console.error(
              "[Aarambh Speech] START ERROR:",
              startError
            );

            /*
             * Recognition might already
             * be running.
             */
            if (
              startError?.name !==
              "InvalidStateError"
            ) {
              setError(
                "Unable to start speech recognition."
              );
            }

            setIsStarting(false);
            if (startError?.name === "InvalidStateError") {
              setIsListening(true);
              recognitionRunningRef.current = true;
            }
          }
        } catch (
          microphoneError
        ) {
          console.error(
            "[Aarambh Speech] MICROPHONE ERROR:",
            microphoneError
          );

          setIsStarting(false);

          setError(
            "Please allow microphone access."
          );
        }
      },
      [
        isSupported,
        isListening,
        isStarting,
      ]
    );

  /*
   * ==========================================
   * EXISTING API — UNCHANGED
   * ==========================================
   */
  return {
    wpm,
    fillerWords,
    clarity,
    isListening,
    isSupported,
    error,
    startListening,
    isStarting,
    isWaitingForSpeech,
    hasSpeechData,
    transcript: transcriptRef.current,
  };
}