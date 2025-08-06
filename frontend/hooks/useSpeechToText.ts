import { useState, useEffect, useCallback, useRef } from 'react';
import { useSpeechRecognition as useWebSpeechRecognition } from 'react-speech-recognition';

// Define types for the Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((this: SpeechRecognition, event: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface UseSpeechToTextReturn {
  transcript: string;
  listening: boolean;
  recognitionError: string | null;
  isBrowserSupported: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => void;
  resetTranscript: () => void;
  clearTranscript: () => void;  // New function to clear the transcript
  interimTranscript: string;
}

const getSpeechRecognition = (): (new () => SpeechRecognition) | null => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const useSpeechToText = (): UseSpeechToTextReturn => {
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [isBrowserSupported, setIsBrowserSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalTranscriptRef = useRef('');
  const isMounted = useRef(true);

  const {
    transcript,
    resetTranscript: resetWebSpeechTranscript,
    browserSupportsSpeechRecognition: isWebSpeechSupported,
    isMicrophoneAvailable,
  } = useWebSpeechRecognition();

  // Check browser support on mount
  useEffect(() => {
    const isSupported = !!(getSpeechRecognition() || isWebSpeechSupported);
    setIsBrowserSupported(isSupported);
    
    if (!isSupported) {
      setRecognitionError('Your browser does not support speech recognition. Please use Chrome, Edge, or Safari.');
    }

    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, [isWebSpeechSupported]);

  const cleanup = useCallback(() => {
    // Stop recognition
    if (recognitionRef.current) {
      try {
        const rec = recognitionRef.current;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch (error) {
        console.log('Error stopping recognition:', error);
      }
      recognitionRef.current = null;
    }

    // Clean up microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setInterimTranscript('');
    resetWebSpeechTranscript();
  }, [resetWebSpeechTranscript]);

  // New function to clear just the transcript without affecting the Web Speech API
  const clearTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setInterimTranscript('');
  }, []);

  const processResults = useCallback((event: SpeechRecognitionEvent) => {
    if (!isMounted.current) return;
    
    let currentTranscript = finalTranscriptRef.current;
    let newInterim = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0].transcript;
      
      if (result.isFinal) {
        // Append final results to the existing transcript
        currentTranscript += (currentTranscript ? ' ' : '') + text.trim();
      } else {
        // Keep track of interim results
        newInterim = text;
      }
    }

    // Update the final transcript reference
    if (currentTranscript !== finalTranscriptRef.current) {
      finalTranscriptRef.current = currentTranscript;
      resetWebSpeechTranscript();
    }
    
    // Update the interim transcript
    setInterimTranscript(newInterim);
  }, [resetWebSpeechTranscript]);

  const startListening = useCallback(async () => {
    if (isListening) return;
    setRecognitionError(null);

    try {
      if (!isMicrophoneAvailable) {
        throw new Error('Microphone is not available');
      }

      cleanup();

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      streamRef.current = stream;

      const SpeechRecognition = getSpeechRecognition();
      if (!SpeechRecognition) {
        throw new Error('SpeechRecognition API not available');
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (!isMounted.current) return;
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => processResults(event);

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (!isMounted.current) return;
        console.error('Speech recognition error:', event.error, event.message);
        if (event.error !== 'aborted') {
          setRecognitionError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        if (!isMounted.current) return;
        if (isListening) {
          recognition.start();
        }
      };

      recognition.start();

    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setRecognitionError(error instanceof Error ? error.message : 'Failed to start speech recognition');
      cleanup();
    }
  }, [isListening, isMicrophoneAvailable, cleanup, processResults]);

  const stopListening = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const toggleListening = useCallback(() => {
    isListening ? stopListening() : startListening();
  }, [isListening, startListening, stopListening]);

  // Combine final and interim transcripts for the output
  const combinedTranscript = (transcript || finalTranscriptRef.current) + 
    (interimTranscript ? ' ' + interimTranscript : '');

  return {
    transcript: combinedTranscript.trim(),
    interimTranscript,
    listening: isListening,
    recognitionError,
    isBrowserSupported,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    clearTranscript,  // Expose the clearTranscript function
  };
};