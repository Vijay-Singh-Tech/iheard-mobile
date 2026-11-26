import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text, TextInput } from '../components/AppText';

import TodayIcon from '../components/TodayIcon';
import { supabase } from '../services/supabase';

type Feedback = {
  type: 'error' | 'success';
  message: string;
};

function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

const timeZoneOptions = [
  { label: 'New York — Eastern', id: 'America/New_York' },
  { label: 'Chicago — Central', id: 'America/Chicago' },
  { label: 'Denver — Mountain', id: 'America/Denver' },
  { label: 'Phoenix — Arizona', id: 'America/Phoenix' },
  { label: 'Los Angeles — Pacific', id: 'America/Los_Angeles' },
  { label: 'Anchorage — Alaska', id: 'America/Anchorage' },
  { label: 'Honolulu — Hawaii', id: 'Pacific/Honolulu' },
] as const;

const peopleOptions = [1, 2, 3, 4, 5] as const;
const peopleLabel = 'How many people do you care for?';

type CaregiverProfileScreenProps = {
  initialProfile?: { caregiverId: string; displayName: string; timezone: string };
  onCancel?: () => void;
  onProfileSaved?: (displayName: string, timezone: string) => void;
};

export default function CaregiverProfileScreen({
  initialProfile,
  onCancel,
  onProfileSaved,
}: CaregiverProfileScreenProps) {
  const [displayName, setDisplayName] = useState(initialProfile?.displayName ?? '');
  const [timezone, setTimezone] = useState(() => initialProfile?.timezone || getDeviceTimezone());
  const [isTimeZonePickerOpen, setIsTimeZonePickerOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [peopleCaredFor, setPeopleCaredFor] = useState<number>();
  const [isPeoplePickerOpen, setIsPeoplePickerOpen] = useState(false);
  const [peopleLoadFailed, setPeopleLoadFailed] = useState(false);
  const [peopleLoadAttempt, setPeopleLoadAttempt] = useState(0);
  const caregiverId = initialProfile?.caregiverId;
  const timeZoneLabel = timeZoneOptions.find(({ id }) => id === timezone)?.label ?? timezone;

  useEffect(() => {
    if (!caregiverId) {
      return;
    }

    const controller = new AbortController();

    async function loadPeopleCaredFor() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('people_cared_for')
          .eq('id', caregiverId)
          .abortSignal(controller.signal)
          .single();

        if (error) {
          throw error;
        }

        if (!controller.signal.aborted) {
          setPeopleCaredFor(data.people_cared_for ?? 1);
        }
      } catch {
        if (!controller.signal.aborted) {
          setPeopleLoadFailed(true);
        }
      }
    }

    void loadPeopleCaredFor();
    return () => controller.abort();
  }, [caregiverId, peopleLoadAttempt]);

  async function handleSaveProfile() {
    const normalizedDisplayName = displayName.trim();
    const normalizedTimezone = timezone.trim();

    if (!normalizedDisplayName) {
      setFeedback({ type: 'error', message: 'Enter your display name.' });
      return;
    }

    if (!normalizedTimezone) {
      setFeedback({ type: 'error', message: 'Enter your timezone.' });
      return;
    }

    setFeedback(null);
    setIsPeoplePickerOpen(false);
    setIsTimeZonePickerOpen(false);
    setIsLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setFeedback({
          type: 'error',
          message: userError?.message ?? 'You must be signed in to save a profile.',
        });
        return;
      }

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          display_name: normalizedDisplayName,
          timezone: normalizedTimezone,
          ...(peopleCaredFor !== undefined && { people_cared_for: peopleCaredFor }),
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        setFeedback({ type: 'error', message: profileError.message });
        return;
      }

      setDisplayName(normalizedDisplayName);
      setTimezone(normalizedTimezone);
      setFeedback({ type: 'success', message: 'Profile saved successfully.' });
      onProfileSaved?.(normalizedDisplayName, normalizedTimezone);
    } catch {
      setFeedback({
        type: 'error',
        message: 'Unable to save your profile. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>iHeard</Text>
          <Text style={styles.title}>{initialProfile ? 'My Profile' : 'Your caregiver profile'}</Text>
          <Text style={styles.subtitle}>
            Tell us how to address you and confirm your local timezone.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              autoCapitalize="words"
              autoComplete="name"
              editable={!isLoading}
              onChangeText={setDisplayName}
              placeholder="Your name"
              returnKeyType="next"
              style={styles.input}
              textContentType="name"
              value={displayName}
            />

            {initialProfile ? (
              <View style={styles.peopleField}>
                <Text style={styles.label}>Time Zone</Text>
                <Pressable
                  accessibilityRole="combobox"
                  accessibilityLabel="Time Zone"
                  accessibilityValue={{ text: timeZoneLabel }}
                  accessibilityState={{ expanded: isTimeZonePickerOpen, disabled: isLoading }}
                  disabled={isLoading}
                  onPress={() => {
                    setIsPeoplePickerOpen(false);
                    setIsTimeZonePickerOpen((open) => !open);
                  }}
                  style={({ pressed }) => [styles.peopleTrigger, pressed && styles.peopleSelected]}
                >
                  <Text style={[styles.peopleValue, styles.timeZoneValue]}>{timeZoneLabel}</Text>
                  <TodayIcon name="chevron" size={18} />
                </Pressable>
                {isTimeZonePickerOpen && (
                  <View accessibilityRole="radiogroup" style={styles.peopleOptions}>
                    {timeZoneOptions.map(({ id, label }) => (
                      <Pressable
                        key={id}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: timezone === id }}
                        onPress={() => {
                          setTimezone(id);
                          setIsTimeZonePickerOpen(false);
                        }}
                        style={({ pressed }) => [
                          styles.peopleOption,
                          (timezone === id || pressed) && styles.peopleSelected,
                        ]}
                      >
                        <Text style={[styles.peopleValue, styles.timeZoneValue]}>{label}</Text>
                        {timezone === id && <TodayIcon name="check" size={18} />}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <>
                <Text style={styles.label}>Timezone</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  onChangeText={setTimezone}
                  onSubmitEditing={handleSaveProfile}
                  placeholder="America/New_York"
                  returnKeyType="done"
                  style={styles.input}
                  value={timezone}
                />
              </>
            )}

            {initialProfile && (
              <View style={styles.peopleField}>
                <Text style={styles.label}>{peopleLabel}</Text>
                {peopleLoadFailed ? (
                  <>
                    <Text accessibilityRole="alert" style={styles.peopleHint}>
                      Unable to load the number of people you care for.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setPeopleLoadFailed(false);
                        setPeopleLoadAttempt((attempt) => attempt + 1);
                      }}
                      style={styles.cancel}
                    >
                      <Text style={styles.cancelLabel}>Try again</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="combobox"
                      accessibilityLabel={peopleLabel}
                      accessibilityValue={{ text: peopleCaredFor?.toString() ?? 'Loading' }}
                      accessibilityState={{
                        expanded: isPeoplePickerOpen,
                        disabled: isLoading || peopleCaredFor === undefined,
                      }}
                      disabled={isLoading || peopleCaredFor === undefined}
                      onPress={() => {
                        setIsTimeZonePickerOpen(false);
                        setIsPeoplePickerOpen((open) => !open);
                      }}
                      style={({ pressed }) => [
                        styles.peopleTrigger,
                        pressed && styles.peopleSelected,
                      ]}
                    >
                      <Text style={styles.peopleValue}>{peopleCaredFor ?? 'Loading…'}</Text>
                      <TodayIcon name="chevron" size={18} />
                    </Pressable>
                    {isPeoplePickerOpen && (
                      <View accessibilityRole="radiogroup" style={styles.peopleOptions}>
                        {peopleOptions.map((option) => (
                          <Pressable
                            key={option}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: peopleCaredFor === option }}
                            onPress={() => {
                              setPeopleCaredFor(option);
                              setIsPeoplePickerOpen(false);
                            }}
                            style={({ pressed }) => [
                              styles.peopleOption,
                              (peopleCaredFor === option || pressed) && styles.peopleSelected,
                            ]}
                          >
                            <Text style={styles.peopleValue}>{option}</Text>
                            {peopleCaredFor === option && <TodayIcon name="check" size={18} />}
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {feedback ? (
              <Text
                accessibilityLiveRegion="polite"
                style={
                  feedback.type === 'error'
                    ? styles.errorMessage
                    : styles.successMessage
                }
              >
                {feedback.message}
              </Text>
            ) : null}

            <Pressable
              disabled={isLoading}
              onPress={handleSaveProfile}
              style={({ pressed }) => [
                styles.button,
                (pressed || isLoading) && styles.buttonMuted,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Save profile</Text>
              )}
            </Pressable>
            {onCancel && (
              <Pressable
                accessibilityRole="button"
                disabled={isLoading}
                onPress={onCancel}
                style={styles.cancel}
              >
                <Text style={styles.cancelLabel}>Back to Profile</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    shadowColor: '#102a26',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
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
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    color: '#5e6f6c',
    fontSize: 16,
    lineHeight: 23,
  },
  form: {
    marginTop: 28,
  },
  label: {
    marginBottom: 7,
    color: '#253d39',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minHeight: 50,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#cbd8d5',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    color: '#122522',
    fontSize: 16,
  },
  peopleField: { marginBottom: 18 },
  peopleTrigger: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#c6b2e4',
    borderRadius: 10,
    backgroundColor: '#f3edf9',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  peopleOptions: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#e2d5f1',
    borderRadius: 10,
    backgroundColor: '#faf7ff',
    overflow: 'hidden',
  },
  peopleOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  peopleSelected: { backgroundColor: '#e9ddf7' },
  peopleValue: { color: '#512e96', fontSize: 16, fontWeight: '600' },
  timeZoneValue: { flexShrink: 1, marginRight: 8 },
  peopleHint: { color: '#655274', fontSize: 14 },
  errorMessage: {
    marginBottom: 16,
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  successMessage: {
    marginBottom: 16,
    color: '#08745f',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#147d6f',
    paddingHorizontal: 18,
  },
  cancel: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  cancelLabel: { color: '#512e96', fontSize: 15, fontWeight: '700' },
  buttonMuted: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
