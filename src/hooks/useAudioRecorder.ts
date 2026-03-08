// src/hooks/useAudioRecorder.ts
import { useState, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

export type AudioMessage = {
  uri: string;
  durationMs: number;
};

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<any>(null);
  const secondsRef = useRef(0);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return false;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      secondsRef.current = 0;
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setRecordSeconds(secondsRef.current);
      }, 1000);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return true;
    } catch (e) {
      console.error("[audio] startRecording error:", e);
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<AudioMessage | null> => {
    try {
      clearInterval(timerRef.current);
      const recording = recordingRef.current;
      if (!recording) {
        setIsRecording(false);
        return null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      setIsRecording(false);
      const secs = secondsRef.current;
      setRecordSeconds(0);
      secondsRef.current = 0;

      if (!uri) return null;

      return {
        uri,
        durationMs: Math.max(secs * 1000, 1000),
      };
    } catch (e) {
      console.error("[audio] stopRecording error:", e);
      setIsRecording(false);
      recordingRef.current = null;
      return null;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    try {
      clearInterval(timerRef.current);
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {}
    setIsRecording(false);
    setRecordSeconds(0);
    secondsRef.current = 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  return { isRecording, recordSeconds, startRecording, stopRecording, cancelRecording };
}

// ── Reproductor ───────────────────────────────────────────────────────────────
export function useAudioPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const playingUriRef = useRef<string | null>(null);
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const play = useCallback(async (uri: string) => {
    try {
      // Siempre descargar el sonido anterior
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
      }

      // Si era el mismo URI, era un toggle — parar
      if (playingUriRef.current === uri) {
        playingUriRef.current = null;
        setPlayingUri(null);
        setProgress(0);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      // Crear nuevo Sound desde cero cada vez
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          const dur = status.durationMillis ?? 1;
          const pos = status.positionMillis ?? 0;
          setProgress(pos / dur);
          if (status.didJustFinish) {
            playingUriRef.current = null;
            setPlayingUri(null);
            setProgress(0);
          }
        }
      );

      soundRef.current = sound;
      playingUriRef.current = uri;
      setPlayingUri(uri);
    } catch (e) {
      console.error("[audio] play error:", e);
      playingUriRef.current = null;
      setPlayingUri(null);
    }
  }, []);

  return { playingUri, progress, play };
}