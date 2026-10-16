import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CareRecipient } from '../App';
import { supabase } from '../services/supabase';

type CaregiverHomeScreenProps = {
  careRecipient: CareRecipient;
  onStartWellbeingCheck: () => void;
};

export default function CaregiverHomeScreen({
  careRecipient,
  onStartWellbeingCheck,
}: CaregiverHomeScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>iHeard</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Your care recipient is ready.</Text>

        <Pressable
          accessibilityHint="Opens the caregiver wellbeing check"
          accessibilityRole="button"
          onPress={onStartWellbeingCheck}
          style={({ pressed }) => [
            styles.recipientDetails,
            pressed && styles.recipientDetailsPressed,
          ]}
        >
          <Text style={styles.name}>{careRecipient.preferred_name}</Text>
          <Text style={styles.detail}>{careRecipient.relationship}</Text>
          <Text style={styles.detail}>{careRecipient.primary_condition}</Text>
          <Text style={styles.cardAction}>Start wellbeing check</Text>
        </Pressable>

        <Pressable
          onPress={() => supabase.auth.signOut()}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutButtonText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f7f6',
    padding: 24,
  },
  card: {
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
  },
  recipientDetails: {
    marginTop: 28,
    borderRadius: 12,
    backgroundColor: '#eef5f3',
    padding: 18,
  },
  recipientDetailsPressed: {
    opacity: 0.75,
  },
  name: {
    color: '#122522',
    fontSize: 22,
    fontWeight: '700',
  },
  detail: {
    marginTop: 6,
    color: '#5e6f6c',
    fontSize: 16,
  },
  cardAction: {
    marginTop: 16,
    color: '#147d6f',
    fontSize: 15,
    fontWeight: '700',
  },
  signOutButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  signOutButtonText: {
    color: '#147d6f',
    fontSize: 15,
    fontWeight: '600',
  },
});
