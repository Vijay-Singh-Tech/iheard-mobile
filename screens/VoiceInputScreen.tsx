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
import { File } from 'expo-file-system';

import TodayIcon from '../components/TodayIcon';
import { supabase } from '../services/supabase';

type VoiceInputScreenProps = {
  careRecipientId?: string;
  onReturnHome: () => void;
  onNavigationLockChange: (locked: boolean) => void;
};

type PermissionState = 'idle' | 'checking' | 'granted' | 'denied';

type TranscriptionResponse = {
  text: string;
};

type CaregiverSupportResponse = {
  kind: 'support' | 'urgent';
  acknowledgement: string;
  wellbeing_context: string;
  next_steps: string[];
  safety_note: string;
};

function isCaregiverSupportResponse(
  value: unknown
): value is CaregiverSupportResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;

  return (
    (response.kind === 'support' || response.kind === 'urgent') &&
    typeof response.acknowledgement === 'string' &&
    Boolean(response.acknowledgement.trim()) &&
    typeof response.wellbeing_context === 'string' &&
    Boolean(response.wellbeing_context.trim()) &&
    Array.isArray(response.next_steps) &&
    response.next_steps.length >= 2 &&
    response.next_steps.length <= 3 &&
    response.next_steps.every(
      (step) => typeof step === 'string' && Boolean(step.trim())
    ) &&
    typeof response.safety_note === 'string' &&
    Boolean(response.safety_note.trim())
  );
}

function formatDuration(durationMillis: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMillis / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function VoiceInputScreen({
  careRecipientId,
  onReturnHome,
  onNavigationLockChange,
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
    useState<PermissionState>('idle');
  const [canAskForPermissionAgain, setCanAskForPermissionAgain] =
    useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  const [recordedAt, setRecordedAt] = useState<Date | null>(null);
  const [supportReceivedAt, setSupportReceivedAt] = useState<Date | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [isJournalSaved, setIsJournalSaved] = useState(false);
  const [journalSaveError, setJournalSaveError] = useState<string | null>(null);
  const [caregiverSupport, setCaregiverSupport] =
    useState<CaregiverSupportResponse | null>(null);
  const [isPreparingSupport, setIsPreparingSupport] = useState(false);
  const [caregiverSupportError, setCaregiverSupportError] = useState<
    string | null
  >(null);

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

      return permission.granted;
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
    setFeedback(null);
    setIsBusy(true);

    try {
      if (permissionState !== 'granted' && !(await requestMicrophonePermission())) {
        return;
      }

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
      setHasStartedConversation(true);
      setRecordedAt(null);
      setSupportReceivedAt(null);
      setTranscript(null);
      setIsJournalSaved(false);
      setJournalSaveError(null);
      setCaregiverSupport(null);
      setCaregiverSupportError(null);
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
      setRecordedAt(new Date());
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

  async function handleTranscribe() {
    if (!recordingUri) {
      setFeedback('Record a voice check-in before trying to transcribe it.');
      return;
    }

    setFeedback(null);
    setTranscript(null);
    setIsTranscribing(true);
    setIsJournalSaved(false);
    setJournalSaveError(null);
    setCaregiverSupport(null);
    setCaregiverSupportError(null);

    try {
      const audioFile = new File(recordingUri);

      if (!audioFile.exists || audioFile.size === 0) {
        throw new Error('Recording is unavailable');
      }

      const formData = new FormData();
      formData.append('file', audioFile, 'voice-check-in.m4a');

      const { data, error } =
        await supabase.functions.invoke<TranscriptionResponse>(
          'transcribe-audio',
          { body: formData }
        );

      if (error || typeof data?.text !== 'string' || !data.text.trim()) {
        throw new Error('Transcription failed');
      }

      if (isMountedRef.current) {
        setTranscript(data.text.trim());
      }
    } catch {
      if (isMountedRef.current) {
        setFeedback('Unable to transcribe this recording. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsTranscribing(false);
      }
    }
  }

  async function handleSaveJournalEntry() {
    const normalizedTranscript = transcript?.trim();

    if (!normalizedTranscript || isJournalSaved) {
      return;
    }

    setJournalSaveError(null);
    setIsSavingJournal(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Authentication required');
      }

      const { error: saveError } = await supabase
        .from('journal_entries')
        .insert({
          caregiver_id: user.id,
          care_recipient_id: careRecipientId ?? null,
          transcript: normalizedTranscript,
        });

      if (saveError) {
        throw new Error('Journal save failed');
      }

      if (isMountedRef.current) {
        setIsJournalSaved(true);
      }
    } catch {
      if (isMountedRef.current) {
        setJournalSaveError(
          'Unable to save this journal entry. Please try again.'
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsSavingJournal(false);
      }
    }
  }

  async function handleGetCaregiverSupport() {
    if (!isJournalSaved || !careRecipientId) {
      setCaregiverSupportError(
        'Unable to prepare caregiver support right now. Please try again.'
      );
      return;
    }

    setCaregiverSupportError(null);
    setIsPreparingSupport(true);

    try {
      const { data, error } =
        await supabase.functions.invoke<CaregiverSupportResponse>(
          'caregiver-support',
          {
            body: { careRecipientId },
          }
        );

      if (error || !isCaregiverSupportResponse(data)) {
        throw new Error('Caregiver support request failed');
      }

      if (isMountedRef.current) {
        setCaregiverSupport(data);
        setSupportReceivedAt(new Date());
      }
    } catch {
      if (isMountedRef.current) {
        setCaregiverSupportError(
          'Unable to prepare caregiver support right now. Please try again.'
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsPreparingSupport(false);
      }
    }
  }

  const isWorking = isBusy || isTranscribing || isSavingJournal || isPreparingSupport;
  const navigationLocked = isWorking || isRecording || permissionState === 'checking';
  const isDemo = !hasStartedConversation;
  const canUseMicrophone = permissionState !== 'denied' || canAskForPermissionAgain;
  const recordingDuration = formatDuration(
    recordingUri && playerStatus.duration > 0
      ? playerStatus.duration * 1000
      : recorderState.durationMillis
  );

  useEffect(() => {
    onNavigationLockChange(navigationLocked);
  }, [navigationLocked, onNavigationLockChange]);

  useEffect(() => {
    return () => onNavigationLockChange(false);
  }, [onNavigationLockChange]);

  return (
    <View style={styles.screen}>
      <View style={styles.brandBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to Today"
          accessibilityState={{ disabled: navigationLocked }}
          disabled={navigationLocked}
          onPress={onReturnHome}
          style={[styles.back, navigationLocked && styles.muted]}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>Today</Text>
        </Pressable>
        <View accessible accessibilityLabel="iHEARD" style={styles.brand}>
          <TodayIcon name="brand" size={29} />
          <Text style={styles.wordmark}>iHEARD</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <View style={styles.headingRow}>
            <TodayIcon name="chat" size={29} />
            <Text accessibilityRole="header" style={styles.heading}>Talk to iHEARD</Text>
          </View>
          <Text style={styles.subtitle}>Share what’s happening with you or the person you care for, in your own words.</Text>
        </View>

        {isDemo && (
          <>
            <View style={styles.caregiverMessage}>
              <View style={styles.caregiverCard}>
                <View style={styles.audioRow} accessibilityLabel="Demo conversation, no audio available">
                  <View style={styles.audioIcon}><TodayIcon name="mic" size={17} color="#fff" /></View>
                  <Waveform />
                  <Text style={styles.audioDuration}>Demo</Text>
                </View>
                <Text style={styles.messageText}>
                  My mom didn’t sleep well last night. She seems more confused today, and I’m feeling exhausted.
                </Text>
              </View>
            </View>

            <View style={styles.supportMessage}>
              <SupportAvatar />
              <View style={styles.supportCard}>
                <Text style={styles.messageTag}>Demo · iHEARD</Text>
                <Text style={styles.messageText}>
                  That sounds like a tough day for both of you. Here are a few topics you might want to talk through.
                </Text>
                <View style={styles.suggestions}>
                  <DemoSuggestion icon="note" label="Tips to help with sleep" />
                  <DemoSuggestion icon="chat" label="Ways to manage confusion" />
                  <DemoSuggestion icon="heart" label="Support for your own stress" />
                </View>
              </View>
            </View>
          </>
        )}

        {isRecording && (
          <Text accessibilityLiveRegion="polite" style={styles.status}>
            Recording · {recordingDuration}
          </Text>
        )}

        {recordingUri && !isRecording && (
          <View style={styles.caregiverMessage}>
            <View style={styles.caregiverCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={playerStatus.playing ? 'Replay recording from the beginning' : 'Play recording'}
                accessibilityState={{ disabled: isWorking || !playerStatus.isLoaded }}
                disabled={isWorking || !playerStatus.isLoaded}
                onPress={handleReplay}
                style={({ pressed }) => [styles.audioRow, pressed && styles.muted]}
              >
                <View style={styles.audioIcon}><Text style={styles.playIcon}>▶</Text></View>
                <Waveform />
                <Text style={styles.audioDuration}>{recordingDuration}</Text>
              </Pressable>
              {transcript ? (
                <Text accessibilityLiveRegion="polite" style={styles.messageText}>{transcript}</Text>
              ) : (
                <ConversationAction
                  label={isTranscribing ? 'Transcribing…' : 'Transcribe recording'}
                  disabled={isWorking}
                  onPress={handleTranscribe}
                />
              )}
            </View>
            {recordedAt && <Text style={styles.timestamp}>{formatTime(recordedAt)}</Text>}
          </View>
        )}

        {transcript && !isJournalSaved && (
          <ConversationAction
            label={isSavingJournal ? 'Saving…' : 'Save journal entry'}
            disabled={isWorking}
            onPress={handleSaveJournalEntry}
          />
        )}

        {isJournalSaved && (
          <Text accessibilityLiveRegion="polite" style={styles.status}>Journal entry saved.</Text>
        )}

        {isJournalSaved && !caregiverSupport && (
          <ConversationAction
            label={isPreparingSupport ? 'Preparing support…' : 'Get AI caregiver support'}
            disabled={isWorking}
            onPress={handleGetCaregiverSupport}
          />
        )}

        {caregiverSupport && (
          <View accessibilityLiveRegion="polite" style={styles.supportMessage}>
            <SupportAvatar />
            <View style={styles.supportBody}>
              <View style={[styles.supportCard, caregiverSupport.kind === 'urgent' && styles.urgentCard]}>
                <Text style={styles.messageTag}>iHEARD · AI-generated support</Text>
                {caregiverSupport.kind === 'urgent' && (
                  <Text style={styles.error}>Urgent real-world support may be needed</Text>
                )}
                <Text style={styles.messageText}>{caregiverSupport.acknowledgement}</Text>
                <Text style={styles.messageText}>{caregiverSupport.wellbeing_context}</Text>
                <View style={styles.suggestions}>
                  <Text style={styles.suggestionsHeading}>Possible next steps</Text>
                  {caregiverSupport.next_steps.map((step, index) => (
                    <View key={index} style={styles.suggestion}>
                      <TodayIcon name="check" size={17} />
                      <Text style={styles.suggestionLabel}>{step}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.safetyNote}>{caregiverSupport.safety_note}</Text>
              </View>
              {supportReceivedAt && <Text style={styles.timestamp}>{formatTime(supportReceivedAt)}</Text>}
            </View>
          </View>
        )}

        {permissionState === 'checking' && (
          <Text accessibilityLiveRegion="polite" style={styles.status}>Checking microphone access…</Text>
        )}

        {[feedback, journalSaveError, caregiverSupportError].filter(Boolean).map((error, index) => (
          <Text key={index} accessibilityRole="alert" style={styles.error}>{error}</Text>
        ))}
      </ScrollView>

      <View style={styles.composer}>
        <View style={styles.recordControl}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isRecording ? 'Stop recording' : 'Tap to talk'}
            accessibilityState={{ disabled: isWorking || !canUseMicrophone, busy: isBusy }}
            disabled={isWorking || !canUseMicrophone}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            style={({ pressed }) => [
              styles.recordButton,
              isRecording && styles.stopButton,
              (pressed || !canUseMicrophone) && styles.muted,
            ]}
          >
            {isBusy ? <ActivityIndicator color="#fff" /> : isRecording ? (
              <View style={styles.stopIcon} />
            ) : (
              <TodayIcon name="mic" size={36} color="#fff" />
            )}
          </Pressable>
          <Text style={styles.recordLabel}>{isRecording ? 'Stop recording' : 'Tap to talk'}</Text>
        </View>
        <View accessible accessibilityLabel="Type instead, unavailable" accessibilityState={{ disabled: true }} style={styles.typeControl}>
          <View style={styles.typeIcon}><TodayIcon name="keyboard" size={20} color="#746287" /></View>
          <Text style={styles.typeLabel}>Type instead</Text>
          <Text style={styles.unavailable}>Unavailable</Text>
        </View>
      </View>
    </View>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const bars = [8, 13, 19, 11, 17, 23, 14, 9, 18, 25, 15, 10, 21, 16, 8, 12, 20, 11, 14, 7];

function Waveform() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.waveform}>
      {bars.map((height, index) => <View key={index} style={[styles.bar, { height }]} />)}
    </View>
  );
}

function SupportAvatar() {
  return <View style={styles.supportAvatar}><TodayIcon name="brand" size={23} /></View>;
}

function DemoSuggestion({ icon, label }: { icon: 'note' | 'chat' | 'heart'; label: string }) {
  return (
    <View accessible accessibilityLabel={`${label}, unavailable`} accessibilityState={{ disabled: true }} style={styles.suggestion}>
      <TodayIcon name={icon} size={18} color={icon === 'heart' ? '#ab527a' : '#7757a5'} />
      <Text style={styles.suggestionLabel}>{label}</Text>
      <Text style={styles.unavailable}>Unavailable</Text>
    </View>
  );
}

function ConversationAction({ label, disabled, onPress }: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, (pressed || disabled) && styles.muted]}
    >
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fbfaff' },
  brandBar: {
    minHeight: 44, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#eee7fa', borderBottomLeftRadius: 34, borderBottomRightRadius: 48,
  },
  brand: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  wordmark: { color: '#272047', fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  back: { position: 'absolute', left: 13, zIndex: 1, minHeight: 44, flexDirection: 'row', gap: 4, alignItems: 'center' },
  backArrow: { color: '#512e96', fontSize: 28, lineHeight: 30 },
  backLabel: { color: '#512e96', fontSize: 15, fontWeight: '600' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 10, gap: 13 },
  intro: { gap: 6, paddingBottom: 9, alignItems: 'center' },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heading: { flexShrink: 1, color: '#241d40', fontSize: 23, fontWeight: '800', letterSpacing: -0.55 },
  subtitle: { color: '#494155', fontSize: 14, lineHeight: 19, textAlign: 'center', maxWidth: 330 },
  caregiverMessage: { alignSelf: 'flex-end', width: '88%', gap: 4 },
  caregiverCard: { borderRadius: 17, padding: 12, gap: 8, backgroundColor: '#ece3fa', borderWidth: 1, borderColor: '#e8dcf6' },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, padding: 4, backgroundColor: '#f8f3ff' },
  audioIcon: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#714ab2' },
  playIcon: { color: '#fff', fontSize: 13 },
  audioDuration: { color: '#624886', fontSize: 11, fontWeight: '700', marginLeft: 'auto', paddingRight: 4 },
  waveform: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 2, alignItems: 'center', overflow: 'hidden' },
  bar: { width: 2, borderRadius: 1, backgroundColor: '#8963c0' },
  messageText: { color: '#30283c', fontSize: 15, lineHeight: 20 },
  timestamp: { alignSelf: 'flex-end', color: '#6b6279', fontSize: 11 },
  supportMessage: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingRight: 6 },
  supportAvatar: { width: 30, height: 30, marginTop: 4, borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee7fa' },
  supportBody: { flex: 1, gap: 4 },
  supportCard: { flexShrink: 1, padding: 11, borderRadius: 16, gap: 7, backgroundColor: '#f1eff5' },
  urgentCard: { backgroundColor: '#fff0ed' },
  messageTag: { color: '#654b86', fontSize: 11, fontWeight: '800' },
  suggestions: { backgroundColor: '#fbfaff', borderRadius: 10, paddingHorizontal: 7 },
  suggestionsHeading: { color: '#512e96', fontSize: 13, fontWeight: '700', paddingTop: 7 },
  suggestion: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e4ddec' },
  suggestionLabel: { flex: 1, color: '#3c3449', fontSize: 13, lineHeight: 17 },
  unavailable: { color: '#73667f', fontSize: 10 },
  safetyNote: { color: '#574a64', fontSize: 12, lineHeight: 17 },
  status: { color: '#574a64', fontSize: 13, textAlign: 'center' },
  error: { color: '#8e2939', fontSize: 14, fontWeight: '600' },
  action: { minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf7ff', borderWidth: 1, borderColor: '#b49bd6', padding: 6 },
  actionLabel: { color: '#512e96', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  composer: { marginHorizontal: 14, marginBottom: 9, padding: 8, borderRadius: 19, alignItems: 'center', backgroundColor: '#f0eafa' },
  recordControl: { alignItems: 'center', gap: 4, maxWidth: '45%' },
  recordButton: { width: 74, height: 74, borderRadius: 37, borderWidth: 3, borderColor: '#fff', backgroundColor: '#6335a8', justifyContent: 'center', alignItems: 'center' },
  stopButton: { backgroundColor: '#8b355f' },
  stopIcon: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#fff' },
  recordLabel: { color: '#42305b', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  typeControl: { position: 'absolute', right: 12, top: 13, width: '25%', alignItems: 'center', gap: 2 },
  typeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f9f5ff', borderWidth: 1, borderColor: '#dcd2e9', alignItems: 'center', justifyContent: 'center' },
  typeLabel: { color: '#685977', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  muted: { opacity: 0.55 },
});
