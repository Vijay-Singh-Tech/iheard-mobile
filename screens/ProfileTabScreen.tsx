import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CareRecipient } from '../App';
import TodayIcon from '../components/TodayIcon';
import type { TodayIconName } from '../components/TodayIcon';
import { supabase } from '../services/supabase';
import CaregiverProfileScreen from './CaregiverProfileScreen';

type ProfileTabScreenProps = {
  caregiverId: string;
  caregiverName: string;
  caregiverTimezone: string;
  email?: string;
  careRecipient: CareRecipient;
  onProfileSaved: (displayName: string, timezone: string) => void;
};

export default function ProfileTabScreen({
  caregiverId,
  caregiverName,
  caregiverTimezone,
  email,
  careRecipient,
  onProfileSaved,
}: ProfileTabScreenProps) {
  const [page, setPage] = useState<'profile' | 'recipients' | 'settings' | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  async function signOut() {
    setSignOutFailed(false);
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      setSignOutFailed(Boolean(error));
    } catch {
      setSignOutFailed(true);
    } finally {
      setIsSigningOut(false);
    }
  }

  if (page === 'profile') {
    return (
      <CaregiverProfileScreen
        initialProfile={{ displayName: caregiverName, timezone: caregiverTimezone }}
        onCancel={() => setPage(null)}
        onProfileSaved={(displayName, timezone) => {
          onProfileSaved(displayName, timezone);
          setPage(null);
        }}
      />
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.brandBar}>
        {page && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Profile"
            disabled={isSigningOut}
            onPress={() => setPage(null)}
            style={styles.back}
          >
            <Text style={styles.backLabel}>‹ Profile</Text>
          </Pressable>
        )}
        <View accessible accessibilityLabel="iHEARD" style={styles.brand}>
          <TodayIcon name="brand" size={29} />
          <Text style={styles.wordmark}>iHEARD</Text>
        </View>
        <View accessible accessibilityLabel="Notifications unavailable" accessibilityState={{ disabled: true }} style={styles.bell}>
          <TodayIcon name="bell" size={23} color="#776a89" />
        </View>
      </View>

      <View style={styles.content}>
        {page === 'recipients' ? (
          <RecipientList caregiverId={caregiverId} activeRecipient={careRecipient} />
        ) : page === 'settings' ? (
          <>
            <Text accessibilityRole="header" style={styles.heading}>App Settings</Text>
            <ProfileRow icon="profile" title="Account email" description={email ?? 'Email unavailable'} />
            <ProfileRow icon="bell" title="Notifications" description="Manage notification preferences" comingSoon />
            <ProfileRow icon="shield" title="Privacy" description="Manage privacy preferences" comingSoon />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSigningOut, busy: isSigningOut }}
              disabled={isSigningOut}
              onPress={signOut}
              style={({ pressed }) => [styles.signOut, (pressed || isSigningOut) && styles.pressed]}
            >
              <Text style={styles.signOutLabel}>{isSigningOut ? 'Signing out…' : 'Sign out'}</Text>
            </Pressable>
            {signOutFailed && (
              <Text accessibilityRole="alert" style={styles.error}>Unable to sign out. Try again.</Text>
            )}
          </>
        ) : (
          <>
            <View style={styles.intro}>
              <Text accessibilityRole="header" style={styles.heading}>Profile</Text>
              <Text style={styles.subtitle}>Manage your information, care recipients, and care team.</Text>
            </View>
            <ProfileRow
              icon="profile"
              title="My Profile"
              description="Your information and preferences"
              onPress={() => setPage('profile')}
            />
            <ProfileRow
              icon="care"
              title="Care Recipients"
              description="People you are caring for"
              detail={careRecipient.preferred_name}
              highlighted
              onPress={() => setPage('recipients')}
            />
            <ProfileRow
              icon="medicalBag"
              title="Care Team"
              description="Doctors, mental health providers, pharmacies, and others"
              comingSoon
            />
            <ProfileRow
              icon="support"
              title="Support Network"
              description="Family, friends, and support groups"
              comingSoon
            />
            <ProfileRow
              icon="settings"
              title="App Settings"
              description="Notifications, privacy, and account"
              onPress={() => setPage('settings')}
            />
            <AddRecipientNotice />
          </>
        )}
      </View>
    </ScrollView>
  );
}

function RecipientList({ caregiverId, activeRecipient }: {
  caregiverId: string;
  activeRecipient: CareRecipient;
}) {
  const [recipients, setRecipients] = useState<CareRecipient[]>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecipients() {
      try {
        const { data, error } = await supabase
          .from('care_recipients')
          .select('id, preferred_name, relationship, primary_condition')
          .eq('caregiver_id', caregiverId)
          .order('created_at', { ascending: true })
          .abortSignal(controller.signal);

        if (error) {
          throw error;
        }
        if (!controller.signal.aborted) {
          setRecipients(data);
        }
      } catch {
        if (!controller.signal.aborted) {
          setLoadFailed(true);
        }
      }
    }

    void loadRecipients();
    return () => controller.abort();
  }, [caregiverId, attempt]);

  return (
    <>
      <Text accessibilityRole="header" style={styles.heading}>Care Recipients</Text>
      <Text style={styles.subtitle}>People you are caring for. Switching recipients is coming soon.</Text>
      {loadFailed && (
        <View style={styles.loadError}>
          <Text accessibilityRole="alert" style={styles.error}>Unable to load all care recipients.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLoadFailed(false);
              setAttempt((value) => value + 1);
            }}
            style={styles.retry}
          >
            <Text style={styles.backLabel}>Try again</Text>
          </Pressable>
        </View>
      )}
      {!recipients && !loadFailed && (
        <ActivityIndicator accessibilityLabel="Loading care recipients" color="#653bad" />
      )}
      {(recipients ?? [activeRecipient]).map((recipient) => (
        <ProfileRow
          key={recipient.id}
          icon="profile"
          title={recipient.preferred_name}
          description={[recipient.relationship, recipient.primary_condition].filter(Boolean).join(' · ')}
          detail={recipient.id === activeRecipient.id ? 'Current' : undefined}
          highlighted={recipient.id === activeRecipient.id}
        />
      ))}
      {recipients?.length === 0 && <Text style={styles.subtitle}>No care recipients found.</Text>}
      <AddRecipientNotice />
    </>
  );
}

function ProfileRow({ icon, title, description, detail, highlighted, comingSoon, onPress }: {
  icon: TodayIconName;
  title: string;
  description: string;
  detail?: string;
  highlighted?: boolean;
  comingSoon?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <TodayIcon name={icon} color="#653bad" size={34} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
        {comingSoon && <Text style={styles.status}>Coming Soon</Text>}
      </View>
      {detail && <Text numberOfLines={2} style={styles.detail}>{detail}</Text>}
      {onPress && (
        <View style={styles.chevron}>
          <TodayIcon name="chevron" size={17} />
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[title, description, detail].filter(Boolean).join('. ')}
        onPress={onPress}
        style={({ pressed }) => [styles.row, highlighted && styles.highlighted, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.row, highlighted && styles.highlighted]}>{content}</View>;
}

function AddRecipientNotice() {
  return (
    <View style={styles.addCard}>
      <View style={styles.addIntro}>
        <TodayIcon name="support" size={26} />
        <Text style={styles.addCopy}>Adding more care recipients is coming soon.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add Care Recipient, Coming Soon"
        accessibilityState={{ disabled: true }}
        disabled
        style={styles.addButton}
      >
        <Text style={styles.addLabel}>＋ Add Care Recipient</Text>
        <Text style={styles.status}>Coming Soon</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fbfaff' },
  scrollContent: { alignItems: 'center', paddingBottom: 17 },
  brandBar: {
    width: '100%', minHeight: 44, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#eee7fa', borderBottomLeftRadius: 34, borderBottomRightRadius: 48,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  wordmark: { color: '#272047', fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  bell: { position: 'absolute', right: 17, opacity: 0.7 },
  back: { position: 'absolute', left: 14, minHeight: 44, justifyContent: 'center' },
  backLabel: { color: '#512e96', fontSize: 14, fontWeight: '700' },
  content: { width: '100%', maxWidth: 540, paddingHorizontal: 14, paddingTop: 10, gap: 10 },
  intro: { paddingHorizontal: 8, paddingBottom: 8, gap: 4 },
  heading: { color: '#241d40', fontSize: 27, fontWeight: '800', letterSpacing: -0.55 },
  subtitle: { color: '#494155', fontSize: 15, lineHeight: 20 },
  row: {
    minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 15, borderWidth: 1,
    borderColor: '#e8e1f1', backgroundColor: '#fbfaff',
  },
  highlighted: { backgroundColor: '#f0eafa', borderColor: '#e7ddf4' },
  pressed: { opacity: 0.7 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { color: '#241d40', fontSize: 18, fontWeight: '800', letterSpacing: -0.25 },
  rowDescription: { color: '#494155', fontSize: 13, lineHeight: 17 },
  detail: { maxWidth: '25%', color: '#5b3e86', fontSize: 12, fontWeight: '700', textAlign: 'right' },
  status: { color: '#685776', fontSize: 11, lineHeight: 15, fontWeight: '600' },
  chevron: { transform: [{ rotate: '-90deg' }] },
  addCard: {
    marginTop: 7, borderRadius: 16, backgroundColor: '#eee7fa', padding: 12,
    alignItems: 'center', gap: 7,
  },
  addIntro: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  addCopy: { flexShrink: 1, color: '#403057', fontSize: 13 },
  addButton: {
    minHeight: 44, borderWidth: 1, borderColor: '#c5b3e1', borderRadius: 11,
    backgroundColor: '#f9f5ff', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 17, paddingVertical: 4,
  },
  addLabel: { color: '#695782', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  signOut: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#512e96', borderRadius: 12 },
  signOutLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: '#8e2939', fontSize: 14 },
  loadError: { gap: 2 },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
