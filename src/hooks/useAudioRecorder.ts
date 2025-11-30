"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseAudioRecorderReturn {
  isRecording: boolean;
  duration: string; // Format: MM:SS
  audioBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

/**
 * useAudioRecorder Hook
 * 
 * Records audio using the browser MediaRecorder API.
 * Tracks recording state, duration, and returns audio blob when stopped.
 * 
 * @returns {UseAudioRecorderReturn} Recording state and controls
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState("00:00");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  /**
   * Format seconds as MM:SS
   */
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];

      console.log("[Audio] Requesting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[Audio] Got stream:", stream);

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      console.log("[Audio] MediaRecorder created");

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log("[Audio] Data chunk:", event.data.size, "bytes");
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("[Audio] Recording stopped, chunks:", chunksRef.current.length);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        console.log("[Audio] Blob created:", blob.size, "bytes");
        setAudioBlob(blob);
        setIsRecording(false);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      console.log("[Audio] Recording started");

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setDuration(formatDuration(elapsed));
        }
      }, 1000);
    } catch (err: any) {
      console.error("[Audio] Error:", err);
      setError(err.message);
      setIsRecording(false);
    }
  }, [formatDuration]);

  /**
   * Stop recording audio
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [isRecording]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Stop recording if still active
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Clear interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []); // Empty array = only run cleanup on unmount

  return {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    error,
  };
}