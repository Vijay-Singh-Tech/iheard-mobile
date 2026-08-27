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

export default function AddCareRecipientScreen() {
  const [preferredName, setPreferredName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [primaryCondition, setPrimaryCondition] = useState('');
  const [otherConditions, setOtherConditions] = useState('');
  const [careNotes, setCareNotes] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleAddCareRecipient() {
    const normalizedPreferredName = preferredName.trim();
    const normalizedRelationship = relationship.trim();
    const normalizedPrimaryCondition = primaryCondition.trim();

    if (!normalizedPreferredName) {
      setFeedback({ type: 'error', message: 'Enter a preferred name.' });
      return;
    }

    if (!normalizedRelationship) {
      setFeedback({
        type: 'error',
        message: 'Enter their relationship to you.',
      });
      return;
    }

    if (!normalizedPrimaryCondition) {
      setFeedback({
        type: 'error',
        message: 'Enter a primary condition or ailment.',
      });
      return;
    }

    const conditions = otherConditions
      .split(',')
      .map((condition) => condition.trim())
      .filter(Boolean);
    const normalizedCareNotes = careNotes.trim();

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
          message:
            userError?.message ??
            'You must be signed in to add a care recipient.',
        });
        return;
      }

      const { error: recipientError } = await supabase
        .from('care_recipients')
        .insert({
          caregiver_id: user.id,
          preferred_name: normalizedPreferredName,
          relationship: normalizedRelationship,
          primary_condition: normalizedPrimaryCondition,
          other_conditions: conditions,
          care_notes: normalizedCareNotes || null,
        });

      if (recipientError) {
        setFeedback({ type: 'error', message: recipientError.message });
        return;
      }

      setPreferredName('');
      setRelationship('');
      setPrimaryCondition('');
      setOtherConditions('');
      setCareNotes('');
      setFeedback({
        type: 'success',
        message: 'Care recipient added successfully.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Unable to add the care recipient. Please try again.',
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
          <Text style={styles.title}>Add a care recipient</Text>
          <Text style={styles.subtitle}>
            Add the person you support and the details most useful for their
            care.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Preferred name</Text>
            <TextInput
              autoCapitalize="words"
              editable={!isLoading}
              onChangeText={setPreferredName}
              placeholder="Their preferred name"
              style={styles.input}
              value={preferredName}
            />

            <Text style={styles.label}>Relationship to caregiver</Text>
            <TextInput
              autoCapitalize="words"
              editable={!isLoading}
              onChangeText={setRelationship}
              placeholder="For example, parent or spouse"
              style={styles.input}
              value={relationship}
            />

            <Text style={styles.label}>Primary condition / ailment</Text>
            <TextInput
              autoCapitalize="sentences"
              editable={!isLoading}
              onChangeText={setPrimaryCondition}
              placeholder="Primary condition"
              style={styles.input}
              value={primaryCondition}
            />

            <Text style={styles.label}>Other conditions (optional)</Text>
            <TextInput
              autoCapitalize="sentences"
              editable={!isLoading}
              onChangeText={setOtherConditions}
              placeholder="Separate conditions with commas"
              style={styles.input}
              value={otherConditions}
            />
            <Text style={styles.helpText}>
              Example: Hypertension, arthritis
            </Text>

            <Text style={styles.label}>Care notes (optional)</Text>
            <TextInput
              autoCapitalize="sentences"
              editable={!isLoading}
              multiline
              onChangeText={setCareNotes}
              placeholder="Anything important to remember"
              style={[styles.input, styles.notesInput]}
              textAlignVertical="top"
              value={careNotes}
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
              onPress={handleAddCareRecipient}
              style={({ pressed }) => [
                styles.button,
                (pressed || isLoading) && styles.buttonMuted,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Add care recipient</Text>
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
  notesInput: {
    minHeight: 100,
    paddingTop: 14,
  },
  helpText: {
    marginTop: -10,
    marginBottom: 18,
    color: '#71817e',
    fontSize: 13,
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
