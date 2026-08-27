import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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

type CaregiverProfileScreenProps = {
  onProfileSaved?: () => void;
};

export default function CaregiverProfileScreen({
  onProfileSaved,
}: CaregiverProfileScreenProps) {
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState(getDeviceTimezone);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      onProfileSaved?.();
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
          <Text style={styles.title}>Your caregiver profile</Text>
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
    height: 50,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#cbd8d5',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    color: '#122522',
    fontSize: 16,
  },
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
  buttonMuted: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
