import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';

import appConfig from '../app.json';
import { AppTextSizeContext, Text } from '../components/AppText';
import type { TextSize } from '../components/AppText';
import { supabase } from '../services/supabase';

const reminderFields = [
  ['medication_reminders', 'Medication Reminders'],
  ['appointment_reminders', 'Appointment Reminders'],
  ['wellbeing_checkin_reminders', 'Wellbeing Check-in Reminders'],
  ['recharge_reminders', 'Recharge Reminders'],
] as const;

type ReminderField = (typeof reminderFields)[number][0];
type Preferences = Record<ReminderField, boolean> & { text_size: TextSize };

const privacyPages = {
  'Privacy Policy': [
    'Draft · Pending review',
    'iHEARD uses your account and caregiver profile to provide the app. Your entries support the care coordination, wellbeing, and journal features you choose to use.',
    'Manage My Data describes the information stored in iHEARD. Voice & AI Privacy explains what is shared when you use transcription and AI caregiver support.',
  ],
  'Manage My Data': [
    'Account email and caregiver profile, including your time zone and app preferences.',
    'Care recipient profiles, Care Team contacts, Support Network contacts, and their associations.',
    'Wellbeing check-ins, including answers and scores, and journal transcripts you choose to save.',
  ],
  'Voice & AI Privacy': [
    'Your recording is available for local playback. When you request transcription, iHEARD sends the audio through a Supabase function to OpenAI. The app does not save the audio file in Supabase.',
    'When you choose to save a journal entry, iHEARD stores the transcript in Supabase and links it to the selected care recipient when available.',
    'When you request AI caregiver support, a Supabase function sends the latest saved transcript and wellbeing scores for that recipient to OpenAI. The app displays the generated response without saving it in Supabase.',
  ],
} as const;

type PrivacyPage = keyof typeof privacyPages;
const privacyTitles = Object.keys(privacyPages) as PrivacyPage[];

export default function AppSettingsScreen({
  caregiverId, email, timezone, onSignOut, isSigningOut, signOutFailed, onPageChange,
}: {
  caregiverId: string;
  email?: string;
  timezone: string;
  onSignOut: () => void;
  isSigningOut: boolean;
  signOutFailed: boolean;
  onPageChange: () => void;
}) {
  const { setSize } = useContext(AppTextSizeContext);
  const [page, setPage] = useState<PrivacyPage | null>(null);
  const [saved, setSaved] = useState<Preferences | null>(null);
  const [draft, setDraft] = useState<Preferences | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error?: boolean }>();
  const dirty = draft !== saved;

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase.from('profiles')
        .select('medication_reminders, appointment_reminders, wellbeing_checkin_reminders, recharge_reminders, text_size')
        .eq('id', caregiverId)
        .single();
      if (!active) return;
      if (error || !data) throw new Error('Preferences unavailable');

      const preferences: Preferences = { ...data, text_size: data.text_size === 'large' ? 'large' : 'standard' };
      setSize(preferences.text_size);
      setSaved(preferences);
      setDraft(preferences);
    }
    void load().catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [caregiverId, loadAttempt, setSize]);

  function change<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setFeedback(undefined);
  }

  async function save() {
    if (!draft || !saved || saving) return;
    setSaving(true);
    setFeedback(undefined);
    try {
      const changes: Partial<Preferences> = {};
      for (const [key] of reminderFields) {
        if (draft[key] !== saved[key]) changes[key] = draft[key];
      }
      if (draft.text_size !== saved.text_size) changes.text_size = draft.text_size;
      if (Object.keys(changes).length === 0) {
        setDraft(saved);
        return;
      }
      const { data, error } = await supabase.from('profiles')
        .update(changes)
        .eq('id', caregiverId)
        .select('medication_reminders, appointment_reminders, wellbeing_checkin_reminders, recharge_reminders, text_size')
        .single();
      if (error || !data) throw new Error('Preferences not saved');
      const preferences: Preferences = { ...data, text_size: data.text_size === 'large' ? 'large' : 'standard' };
      setSize(preferences.text_size);
      setSaved(preferences);
      setDraft(preferences);
      setFeedback({ message: 'Preferences saved.' });
    } catch {
      setFeedback({ message: 'Unable to save preferences. Try again.', error: true });
    } finally {
      setSaving(false);
    }
  }

  function openPage(next: PrivacyPage | null) {
    setPage(next);
    onPageChange();
  }

  if (page) {
    return (
      <>
        <Pressable accessibilityRole="button" onPress={() => openPage(null)} style={styles.actionRow}>
          <Text style={styles.action}>‹ App Settings</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.heading}>{page}</Text>
        <View style={styles.card}>
          {privacyPages[page].map((paragraph) => <Text key={paragraph} style={styles.body}>{paragraph}</Text>)}
        </View>
      </>
    );
  }

  return (
    <>
      <Text accessibilityRole="header" style={styles.heading}>App Settings</Text>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.section}>Account</Text>
        <Text style={styles.label}>Registered email</Text>
        <Text style={styles.body} selectable>{email ?? 'Email unavailable'}</Text>
        <ComingSoon label="Change Email" />
        <ComingSoon label="Change Password" />
        <Pressable accessibilityRole="button" accessibilityState={{ busy: isSigningOut, disabled: isSigningOut || saving }}
          disabled={isSigningOut || saving} onPress={onSignOut} style={styles.actionRow}>
          <Text style={styles.action}>{isSigningOut ? 'Signing out…' : 'Sign Out'}</Text>
        </Pressable>
        {signOutFailed && <Text accessibilityRole="alert" style={styles.error}>Unable to sign out. Try again.</Text>}
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.section}>Notifications &amp; Reminders</Text>
        <Text style={styles.body}>Preferences for future reminders. Notifications are currently inactive.</Text>
        <Text style={styles.label}>Time Zone</Text>
        <Text style={styles.body}>{timezone || 'Set your time zone in My Profile.'}</Text>
        {draft ? reminderFields.map(([key, label]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Switch accessibilityLabel={label} value={draft[key]} disabled={saving || isSigningOut}
              trackColor={{ true: '#7547bb' }} onValueChange={(value) => change(key, value)} />
          </View>
        )) : loadFailed ? (
          <>
            <Text accessibilityRole="alert" style={styles.error}>Unable to load preferences.</Text>
            <Pressable accessibilityRole="button" onPress={() => { setLoadFailed(false); setLoadAttempt((n) => n + 1); }} style={styles.actionRow}>
              <Text style={styles.action}>Try again</Text>
            </Pressable>
          </>
        ) : <ActivityIndicator accessibilityLabel="Loading preferences" color="#512e96" />}
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.section}>Privacy &amp; Data</Text>
        {privacyTitles.map((title) => (
          <Pressable key={title} accessibilityRole="button" onPress={() => openPage(title)} style={styles.row}>
            <Text style={styles.rowLabel}>{title}</Text>
            <View accessible={false}><Text style={styles.action}>›</Text></View>
          </Pressable>
        ))}
        <ComingSoon label="Delete My Account" />
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.section}>App Preferences</Text>
        <Text style={styles.label}>Text Size</Text>
        {draft && (
          <View accessibilityRole="radiogroup" style={styles.choices}>
            {(['standard', 'large'] as const).map((size) => {
              const selected = draft.text_size === size;
              return (
                <Pressable key={size} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: saving || isSigningOut }}
                  disabled={saving || isSigningOut} onPress={() => change('text_size', size)}
                  style={[styles.choice, selected && styles.selected]}>
                  <Text style={styles.action}>{size === 'large' ? 'Large' : 'Standard'}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        <Text style={styles.label}>App Information</Text>
        <Text style={styles.body}>iHEARD · Version {appConfig.expo.version}</Text>
      </View>

      {draft && (
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !dirty || saving || isSigningOut, busy: saving }}
          disabled={!dirty || saving || isSigningOut} onPress={save}
          style={[styles.save, (!dirty || saving || isSigningOut) && styles.disabled]}>
          <Text style={styles.saveLabel}>{saving ? 'Saving…' : 'Save Preferences'}</Text>
        </Pressable>
      )}
      {feedback && <Text accessibilityRole="alert" style={feedback.error ? styles.error : styles.body}>{feedback.message}</Text>}
    </>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <View accessible accessibilityState={{ disabled: true }} accessibilityLabel={label + ', Coming Soon'} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.status}>Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { color: '#241d40', fontSize: 27, fontWeight: '800' },
  section: { color: '#241d40', fontSize: 19, fontWeight: '800' },
  card: { borderRadius: 15, borderWidth: 1, borderColor: '#e7dff0', backgroundColor: '#fff', padding: 14, gap: 8 },
  label: { color: '#34234c', fontSize: 15, fontWeight: '700' },
  body: { color: '#494155', fontSize: 14, lineHeight: 20 },
  row: { minHeight: 44, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { flex: 1, color: '#34234c', fontSize: 15, fontWeight: '600' },
  status: { color: '#685776', fontSize: 12, flexShrink: 1 },
  actionRow: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 12 },
  action: { color: '#512e96', fontSize: 15, fontWeight: '700' },
  choices: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  choice: { minHeight: 44, padding: 10, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#d9c9ee' },
  selected: { backgroundColor: '#eee4fa', borderColor: '#7547bb' },
  save: { minHeight: 48, padding: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#512e96' },
  disabled: { opacity: 0.6 },
  saveLabel: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  error: { color: '#8e2939', fontSize: 14 },
});
