import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Croatian language code for speech recognition
const CROATIAN_LANG = "hr-HR";

// Speech recognition interface for browser compatibility
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onerror:
    | ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => any)
    | null;
  onresult:
    | ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

export interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  browserSupport: {
    hasGetUserMedia: boolean;
    hasSpeechRecognition: boolean;
    isHttps: boolean;
  };
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionReturn {
  const {
    continuous = true,
    interimResults = true,
    lang = CROATIAN_LANG,
    onTranscript,
    onError,
    onStart,
    onEnd,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isManualStopRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Check browser support
  const browserSupport = {
    hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
    hasSpeechRecognition: !!(
      window.SpeechRecognition || window.webkitSpeechRecognition
    ),
    isHttps:
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost",
  };

  const isSupported =
    browserSupport.hasSpeechRecognition && browserSupport.isHttps;

  // Initialize speech recognition
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - only run on mount
  useEffect(() => {
    if (!isSupported) {
      const errorMsg = !browserSupport.hasSpeechRecognition
        ? "Preglednik ne podržava prepoznavanje govora. Koristite Chrome ili Brave."
        : !browserSupport.isHttps
          ? "Prepoznavanje govora zahtijeva HTTPS vezu"
          : "Prepoznavanje govora nije dostupno";
      setError(errorMsg);
      return;
    }

    if (isInitializedRef.current) {
      return;
    }

    try {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionAPI();

      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log("Speech recognition started");
        setIsListening(true);
        setError(null);
        isManualStopRef.current = false;
        onStart?.();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;

          if (result.isFinal) {
            final += `${transcriptText} `;
          } else {
            interim += transcriptText;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
          setTranscript(finalTranscript + interim);
          onTranscript?.(interim, false);
        }

        if (final) {
          const newFinal = finalTranscript + final;
          setFinalTranscript(newFinal);
          setTranscript(newFinal);
          setInterimTranscript("");
          onTranscript?.(final.trim(), true);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error, event.message);

        let errorMessage = "Greška pri prepoznavanju govora";
        let shouldRestart = false;

        switch (event.error) {
          case "no-speech":
            errorMessage = "Nije detektiran govor. Nastavak slušanja...";
            shouldRestart = true;
            break;
          case "audio-capture":
            errorMessage = "Mikrofon nije dostupan. Provjerite dozvole.";
            break;
          case "not-allowed":
            errorMessage =
              "Pristup mikrofonu je odbijen. Omogućite dozvole u pregledniku.";
            break;
          case "network":
            errorMessage = "Greška mreže. Provjerite internetsku vezu.";
            shouldRestart = true;
            break;
          case "aborted":
            errorMessage = "Prepoznavanje govora je prekinuto.";
            break;
          case "service-not-allowed":
            errorMessage = "Usluga prepoznavanja govora nije dostupna.";
            break;
        }

        setError(errorMessage);
        onError?.(errorMessage);

        // Auto-restart on certain errors if not manually stopped
        if (!isManualStopRef.current && shouldRestart) {
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && !isManualStopRef.current) {
              try {
                console.log("Auto-restarting speech recognition after error");
                recognitionRef.current.start();
              } catch (err) {
                console.error("Failed to restart recognition:", err);
              }
            }
          }, 1000);
        } else {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        console.log("Speech recognition ended");
        setIsListening(false);
        onEnd?.();

        // Auto-restart if continuous and not manually stopped
        if (continuous && !isManualStopRef.current) {
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && !isManualStopRef.current) {
              try {
                console.log("Auto-restarting speech recognition after end");
                recognitionRef.current.start();
              } catch (err) {
                console.error("Failed to restart recognition:", err);
              }
            }
          }, 100);
        }
      };

      recognitionRef.current = recognition;
      isInitializedRef.current = true;
      console.log("Speech recognition initialized successfully");
    } catch (err) {
      console.error("Failed to initialize speech recognition:", err);
      setError("Greška pri inicijalizaciji prepoznavanja govora");
    }

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          console.error("Error aborting recognition:", err);
        }
      }
      isInitializedRef.current = false;
    };
  }, [continuous, interimResults, lang, isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      const errorMsg =
        "Prepoznavanje govora nije podržano. Koristite Chrome ili Brave preko HTTPS veze.";
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    if (!recognitionRef.current) {
      const errorMsg = "Prepoznavanje govora nije inicijalizirano";
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    if (isListening) {
      console.log("Already listening, ignoring start request");
      return;
    }

    try {
      isManualStopRef.current = false;
      recognitionRef.current.start();
      console.log("Speech recognition start requested");
      toast.success("Prepoznavanje govora pokrenuto");
    } catch (err: any) {
      console.error("Failed to start recognition:", err);
      if (err.message?.includes("already started")) {
        // Recognition is already running, just update state
        setIsListening(true);
        console.log("Recognition already started, updating state");
      } else {
        const errorMsg = "Greška pri pokretanju prepoznavanja govora";
        toast.error(errorMsg);
        setError(errorMsg);
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }

    try {
      isManualStopRef.current = true;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      recognitionRef.current.stop();
      console.log("Speech recognition stop requested");
      toast.info("Prepoznavanje govora zaustavljeno");
    } catch (err) {
      console.error("Failed to stop recognition:", err);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setFinalTranscript("");
    setError(null);
    console.log("Transcript reset");
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    browserSupport,
  };
}
