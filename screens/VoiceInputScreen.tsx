import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

type VoiceInputScreenProps = {
  onReturnHome: () => void;
};

type PermissionState = 'checking' | 'granted' | 'denied';

function formatDuration(durationMillis: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMillis / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function VoiceInputScreen({
  onReturnHome,
}: VoiceInputScreenProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const player = useAudioPlayer(recordingUri);
  const playerStatus = useAudioPlayerStatus(player);
  const playerRef = useRef(player);
  const recorderRef = useRef(recorder);
  const isRecordingRef = useRef(false);
  const isMountedRef = useRef(true);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionState, setPermissionState] =
    useState<PermissionState>('checking');
  const [canAskForPermissionAgain, setCanAskForPermissionAgain] =
    useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  playerRef.current = player;
  recorderRef.current = recorder;

  async function requestMicrophonePermission() {
    setFeedback(null);
    setPermissionState('checking');

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();

      if (!isMountedRef.current) {
        return;
      }

      setCanAskForPermissionAgain(permission.canAskAgain);
      setPermissionState(permission.granted ? 'granted' : 'denied');

      if (!permission.granted) {
        setFeedback(
          permission.canAskAgain
            ? 'Microphone access is needed to record a voice check-in.'
            : 'Microphone access is denied. Enable it in your device settings to record a voice check-in.'
        );
      }
    } catch {
      if (!isMountedRef.current) {
        return;
      }

      setPermissionState('denied');
      setFeedback('Unable to request microphone access. Please try again.');
    }
  }

  useEffect(() => {
    isMountedRef.current = true;
    void requestMicrophonePermission();

    return () => {
      isMountedRef.current = false;

      try {
        playerRef.current.pause();
      } catch {
        // The managed player may already be released during screen teardown.
      }

      if (isRecordingRef.current) {
        void recorderRef.current.stop().catch(() => undefined);
        isRecordingRef.current = false;
      }

      void setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }).catch(() => undefined);
    };
  }, []);

  async function handleStartRecording() {
    if (permissionState !== 'granted') {
      setFeedback('Microphone access is required before recording.');
      return;
    }

    setFeedback(null);
    setIsBusy(true);

    try {
      player.pause();
      setRecordingUri(null);
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch {
      isRecordingRef.current = false;
      setIsRecording(false);
      setFeedback('Unable to start recording. Please try again.');
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }).catch(() => undefined);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleStopRecording() {
    if (!isRecordingRef.current) {
      setFeedback('There is no active recording to stop.');
      return;
    }

    setFeedback(null);
    setIsBusy(true);

    try {
      await recorder.stop();
      isRecordingRef.current = false;
      setIsRecording(false);
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (!recorder.uri) {
        setRecordingUri(null);
        setFeedback('The recording could not be found. Please record again.');
        return;
      }

      setRecordingUri(recorder.uri);
    } catch {
      isRecordingRef.current = false;
      setIsRecording(false);
      setFeedback('Unable to stop recording. Please try again.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReplay() {
    if (!recordingUri) {
      setFeedback('Record a voice check-in before trying to replay it.');
      return;
    }

    if (!playerStatus.isLoaded) {
      setFeedback('The recording is still loading. Please try again shortly.');
      return;
    }

    setFeedback(null);

    try {
      await player.seekTo(0);
      player.play();
    } catch {
      setFeedback('Unable to replay the recording. Please try again.');
    }
  }

  async function handleReturnHome() {
    setIsBusy(true);

    try {
      player.pause();

      if (isRecordingRef.current) {
        await recorder.stop();
        isRecordingRef.current = false;
        setIsRecording(false);
      }

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch {
      isRecordingRef.current = false;
    } finally {
      onReturnHome();
    }
  }

  const recordingDuration = formatDuration(recorderState.durationMillis);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>iHeard</Text>
        <Text style={styles.title}>Voice Check-in</Text>
        <Text style={styles.subtitle}>
          Record a short caregiver check-in, then listen back before continuing.
        </Text>

        {permissionState === 'checking' ? (
          <View style={styles.statusCard}>
            <ActivityIndicator color="#147d6f" />
            <Text style={styles.statusText}>Checking microphone access…</Text>
          </View>
        ) : null}

        {permissionState === 'denied' ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Microphone access needed</Text>
            <Text style={styles.statusText}>{feedback}</Text>
            {canAskForPermissionAgain ? (
              <Pressable
                onPress={requestMicrophonePermission}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  Request microphone access
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {permissionState === 'granted' ? (
          <>
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>
                {isRecording
                  ? 'Recording in progress'
                  : recordingUri
                    ? 'Recording available'
                    : 'Ready to record'}
              </Text>
              <Text style={styles.timer}>{recordingDuration}</Text>
              {recordingUri && !isRecording ? (
                <Text style={styles.statusText}>
                  Your recording is stored temporarily on this device.
                </Text>
              ) : null}
            </View>

            <Pressable
              disabled={isBusy}
              onPress={
                isRecording ? handleStopRecording : handleStartRecording
              }
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isBusy) && styles.buttonMuted,
                isRecording && styles.stopButton,
              ]}
            >
              {isBusy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isRecording ? 'Stop recording' : 'Start recording'}
                </Text>
              )}
            </Pressable>

            {recordingUri && !isRecording ? (
              <Pressable
                disabled={isBusy}
                onPress={handleReplay}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonMuted,
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {playerStatus.playing
                    ? 'Replay from beginning'
                    : 'Replay recording'}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {feedback && permissionState === 'granted' ? (
          <Text accessibilityLiveRegion="polite" style={styles.errorMessage}>
            {feedback}
          </Text>
        ) : null}

        <Pressable
          disabled={isBusy}
          onPress={handleReturnHome}
          style={styles.homeButton}
        >
          <Text style={styles.homeButtonText}>Return to caregiver home</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f7f6',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 24,
  },
  eyebrow: {
    marginBottom: 8,
    color: '#147d6f',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: '#122522',
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: '#5e6f6c',
    fontSize: 16,
    lineHeight: 23,
  },
  statusCard: {
    alignItems: 'center',
    marginTop: 28,
    borderRadius: 12,
    backgroundColor: '#eef5f3',
    padding: 20,
  },
  statusTitle: {
    color: '#122522',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusText: {
    marginTop: 8,
    color: '#5e6f6c',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  timer: {
    marginTop: 10,
    color: '#147d6f',
    fontSize: 32,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: '#147d6f',
    paddingHorizontal: 18,
  },
  stopButton: {
    backgroundColor: '#b42318',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#147d6f',
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#147d6f',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  homeButton: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 10,
  },
  homeButtonText: {
    color: '#147d6f',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonMuted: {
    opacity: 0.7,
  },
  errorMessage: {
    marginTop: 16,
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
});
