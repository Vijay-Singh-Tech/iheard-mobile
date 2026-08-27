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

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setFeedback({ type: 'error', message: 'Enter your email address.' });
      return;
    }

    if (!password) {
      setFeedback({ type: 'error', message: 'Enter your password.' });
      return;
    }

    setFeedback(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setFeedback({ type: 'error', message: error.message });
        return;
      }

      setFeedback({ type: 'success', message: 'Signed in successfully.' });
      setPassword('');
    } catch {
      setFeedback({
        type: 'error',
        message: 'Unable to sign in. Please try again.',
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
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue your caregiver support journey.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              returnKeyType="next"
              style={styles.input}
              textContentType="emailAddress"
              value={email}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="current-password"
              editable={!isLoading}
              onChangeText={setPassword}
              onSubmitEditing={handleSignIn}
              placeholder="Enter your password"
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              textContentType="password"
              value={password}
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
              onPress={handleSignIn}
              style={({ pressed }) => [
                styles.button,
                (pressed || isLoading) && styles.buttonMuted,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
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
