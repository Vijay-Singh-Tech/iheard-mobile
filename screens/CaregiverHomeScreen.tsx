import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../components/AppText';

import type { CareRecipient } from '../App';
import TodayIcon from '../components/TodayIcon';
import type { TodayIconName } from '../components/TodayIcon';
import { supabase } from '../services/supabase';

type CaregiverHomeScreenProps = {
  caregiverId: string;
  caregiverName: string;
  careRecipient: CareRecipient;
  onStartVoiceInput: () => void;
  onStartWellbeingCheck: () => void;
};

type CheckIn = {
  completed_at: string;
  mvp_category: string;
};

export default function CaregiverHomeScreen({
  caregiverId,
  caregiverName,
  careRecipient,
  onStartVoiceInput,
  onStartWellbeingCheck,
}: CaregiverHomeScreenProps) {
  const [checkIn, setCheckIn] = useState<CheckIn | null>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const recipientId = careRecipient.id;

  useEffect(() => {
    let active = true;

    async function loadLatestCheckIn() {
      try {
        const { data, error } = await supabase
          .from('wellbeing_checkins')
          .select('completed_at, mvp_category')
          .eq('caregiver_id', caregiverId)
          .eq('care_recipient_id', recipientId)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (active) {
          setCheckIn(data);
        }
      } catch {
        if (active) {
          setLoadFailed(true);
        }
      }
    }

    void loadLatestCheckIn();
    return () => {
      active = false;
    };
  }, [caregiverId, recipientId, loadAttempt]);

  const firstName = caregiverName.trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.brandBar}>
        <View accessible accessibilityLabel="iHEARD" style={styles.brand}>
          <TodayIcon name="brand" size={29} />
          <Text maxFontSizeMultiplier={1.3} style={styles.wordmark}>iHEARD</Text>
        </View>
        <View
          accessible
          accessibilityLabel="Notifications unavailable"
          accessibilityState={{ disabled: true }}
          style={styles.notification}
        >
          <TodayIcon name="bell" color="#7c748d" size={23} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.intro}>
          <Text accessibilityRole="header" style={styles.greeting}>
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </Text>
          <View style={styles.recipientRow}>
            <Text style={styles.detail}>Caring for</Text>
            <View
              accessible
              accessibilityLabel={`${careRecipient.preferred_name}, current care recipient. Switching unavailable.`}
              accessibilityState={{ disabled: true }}
              style={styles.recipient}
            >
              <View style={styles.avatar}><TodayIcon name="profile" size={21} /></View>
              <Text style={styles.recipientName}>{careRecipient.preferred_name}</Text>
              <TodayIcon name="chevron" color="#80758e" size={13} />
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.glance]}>
          <SectionTitle title="Today at a Glance" demo />
          <View style={styles.glanceList}>
            {glanceRows.map(({ icon, color, label, value }) => (
              <View key={label} style={styles.glanceRow}>
                <TodayIcon name={icon} color={color} size={18} />
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={[styles.rowValue, icon === 'check' && styles.completed]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, styles.voice]}>
          <SectionTitle icon="chat" title="How are things going today?" />
          <Text style={styles.detail}>Tell iHEARD what’s happening.</Text>
          <Action label="Talk to iHEARD" icon="mic" onPress={onStartVoiceInput} primary />
          <Text accessibilityState={{ disabled: true }} style={styles.typeUnavailable}>
            Or type instead · unavailable
          </Text>
        </View>

        <View style={[styles.card, styles.wellbeing]}>
          <SectionTitle icon="heart" iconColor="#18704c" title="How are YOU doing today?" />
          <Text style={styles.detail}>Mood tracking unavailable</Text>
          <View style={styles.tiles}>
            {moods.map(({ icon, label, color, backgroundColor }) => (
              <View
                key={icon}
                accessible
                accessibilityLabel={label}
                accessibilityState={{ disabled: true }}
                style={[styles.moodTile, { backgroundColor }]}
              >
                <TodayIcon name={icon} color={color} size={20} />
                <Text style={styles.tileLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <Action label="Take iHEARD Wellbeing Check →" onPress={onStartWellbeingCheck} />

          <View style={styles.checkSummary}>
            {loadFailed ? (
              <>
                <Text accessibilityRole="alert" style={styles.detail}>Unable to load your latest check-in.</Text>
                <Action
                  label="Try again"
                  onPress={() => {
                    setCheckIn(undefined);
                    setLoadFailed(false);
                    setLoadAttempt((attempt) => attempt + 1);
                  }}
                />
              </>
            ) : checkIn === undefined ? (
              <ActivityIndicator accessibilityLabel="Loading latest wellbeing check" color="#512e96" />
            ) : checkIn ? (
              <Text style={styles.detail}>
                Latest check · {checkIn.mvp_category} · {new Date(checkIn.completed_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </Text>
            ) : (
              <Text style={styles.detail}>You haven’t saved a check-in yet.</Text>
            )}
          </View>
        </View>

        <View style={[styles.card, styles.followUp]}>
          <SectionTitle icon="flag" iconColor="#8c5413" title="Things to follow up" demo />
          <Text style={styles.detail}>Trouble sleeping for the last 3 nights.</Text>
          <View style={styles.followUpActions}>
            <Action label="Ask iHEARD" onPress={onStartVoiceInput} primary />
            <Action label="Mark resolved" />
          </View>
        </View>

        <View style={[styles.card, styles.quickActions]}>
          <SectionTitle icon="bolt" title="Quick Actions" />
          <View style={styles.tiles}>
            <QuickAction icon="mic" label="Talk to iHEARD" onPress={onStartVoiceInput} />
            <QuickAction icon="note" label="Add a Note" />
            <QuickAction icon="pill" label="Medication" />
            <QuickAction icon="calendar" label="Appointment" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const glanceRows = [
  { icon: 'check', color: '#16834b', label: 'Morning medication', value: 'Completed' },
  { icon: 'pill', color: '#b74557', label: 'Medication', value: '4:00 PM' },
  { icon: 'calendar', color: '#355bb1', label: 'Dr. Smith (Check-up)', value: '5:30 PM' },
] as const;

const moods = [
  { icon: 'okay', label: 'Doing okay', color: '#247851', backgroundColor: '#e2f2e9' },
  { icon: 'stress', label: 'A little stressed', color: '#89631a', backgroundColor: '#f9f2dd' },
  { icon: 'difficult', label: 'Having a difficult day', color: '#a8404e', backgroundColor: '#fae8e9' },
] as const;

function SectionTitle({ title, icon, iconColor, demo }: {
  title: string;
  icon?: TodayIconName;
  iconColor?: string;
  demo?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      {icon && <TodayIcon name={icon} color={iconColor} size={20} />}
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {demo && <Text style={styles.demo}>Demo</Text>}
    </View>
  );
}

function Action({ label, icon, onPress, primary }: {
  label: string;
  icon?: TodayIconName;
  onPress?: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      accessibilityLabel={onPress ? label : `${label}, unavailable`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary && styles.primaryAction,
        !onPress && styles.disabledAction,
        pressed && styles.pressed,
      ]}
    >
      {icon && <TodayIcon name={icon} size={19} color={primary ? '#fff' : '#512e96'} />}
      <Text style={[styles.actionLabel, primary && styles.primaryLabel, !onPress && styles.disabledLabel]}>
        {onPress ? label : `${label} · unavailable`}
      </Text>
    </Pressable>
  );
}

function QuickAction({ icon, label, onPress }: {
  icon: TodayIconName;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      accessibilityLabel={onPress ? label : `${label}, unavailable`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.quickTile, !onPress && styles.disabledAction, pressed && styles.pressed]}
    >
      <TodayIcon name={icon} size={20} color={onPress ? '#512e96' : '#7b6d88'} />
      <Text style={styles.tileLabel}>{label}</Text>
      {!onPress && <Text style={styles.unavailable}>Unavailable</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fbfaff' },
  scrollContent: { alignItems: 'center', paddingBottom: 5 },
  brandBar: {
    width: '100%', alignItems: 'center', justifyContent: 'center',
    minHeight: 40, backgroundColor: '#eee7fa', borderBottomLeftRadius: 34, borderBottomRightRadius: 48,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  wordmark: { color: '#272047', fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  notification: { position: 'absolute', right: 17, opacity: 0.62 },
  content: { width: '100%', maxWidth: 540, paddingHorizontal: 12, gap: 6 },
  intro: { paddingHorizontal: 8, marginTop: 4, gap: 3 },
  greeting: { color: '#241d40', fontSize: 23, fontWeight: '800', letterSpacing: -0.55 },
  recipientRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  recipient: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2, paddingHorizontal: 7,
    borderRadius: 9, backgroundColor: '#f6f3fa', borderWidth: 1, borderColor: '#e5deee',
  },
  avatar: { backgroundColor: '#e8dcf6', borderRadius: 12 },
  recipientName: { color: '#383048', fontSize: 13, fontWeight: '700', flexShrink: 1 },
  card: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 14, borderWidth: 1, gap: 3 },
  glance: { backgroundColor: '#edf0fc', borderColor: '#e0e5f7' },
  voice: { backgroundColor: '#eee7fa', borderColor: '#e4d9f4' },
  wellbeing: { backgroundColor: '#eaf6ee', borderColor: '#dcefe3' },
  followUp: { backgroundColor: '#fdf4e7', borderColor: '#f4e6cc' },
  quickActions: { backgroundColor: '#f6f3fb', borderColor: '#eae4f4' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { flex: 1, color: '#241d40', fontSize: 16, fontWeight: '800', letterSpacing: -0.25 },
  demo: { color: '#5c456d', backgroundColor: '#e9def3', borderRadius: 9, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2, fontSize: 11, fontWeight: '700' },
  detail: { color: '#4e455c', fontSize: 13 },
  glanceList: { backgroundColor: '#ffffffaa', borderRadius: 9, overflow: 'hidden' },
  glanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 6, paddingVertical: 2,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#dedfee',
  },
  rowLabel: { flex: 1, color: '#2a263c', fontSize: 13 },
  rowValue: { fontSize: 12, color: '#3e3650', fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  completed: { backgroundColor: '#e0f2e5', color: '#1b6940', borderRadius: 8, overflow: 'hidden', paddingHorizontal: 7 },
  action: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    minHeight: 36, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10,
    borderWidth: 1, borderColor: '#a88ad1', backgroundColor: '#ffffffaa',
  },
  primaryAction: { backgroundColor: '#4d278b', borderColor: '#4d278b' },
  actionLabel: { flexShrink: 1, color: '#512e96', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  primaryLabel: { color: '#fff' },
  disabledAction: { backgroundColor: '#ffffff66', borderColor: '#ded6e8' },
  disabledLabel: { color: '#746780' },
  typeUnavailable: { color: '#746780', fontSize: 12, textAlign: 'center', paddingVertical: 1 },
  tiles: { flexDirection: 'row', gap: 5 },
  moodTile: {
    flex: 1, minHeight: 47, justifyContent: 'center', alignItems: 'center', gap: 2,
    padding: 3, borderRadius: 10, borderWidth: 1, borderColor: '#2b214113',
  },
  tileLabel: { color: '#3e354e', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  checkSummary: { paddingHorizontal: 2, gap: 4 },
  followUpActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickTile: {
    flex: 1, minHeight: 51, justifyContent: 'center', alignItems: 'center', gap: 1,
    padding: 3, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4d7f3', borderRadius: 10,
  },
  unavailable: { color: '#746780', fontSize: 9, textAlign: 'center' },
  pressed: { opacity: 0.8 },
});
