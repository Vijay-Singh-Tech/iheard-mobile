import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';

import type { CareRecipient } from '../App';
import TodayIcon from '../components/TodayIcon';
import type { TodayIconName } from '../components/TodayIcon';
import { supabase } from '../services/supabase';
import CareRecipientsEditor from './CareRecipientsEditor';
import CareTeamScreen from './CareTeamScreen';
import CaregiverProfileScreen from './CaregiverProfileScreen';
import AppSettingsScreen from './AppSettingsScreen';
import SupportNetworkScreen from './SupportNetworkScreen';

type ProfileTabScreenProps = {
  caregiverId: string;
  caregiverName: string;
  caregiverTimezone: string;
  email?: string;
  careRecipient: CareRecipient | null;
  onRecipientSaved: (recipient: CareRecipient) => void;
  onRecipientDeleted: (recipientId: string, nextRecipient: CareRecipient | null) => void;
  onProfileSaved: (displayName: string, timezone: string) => void;
};

export default function ProfileTabScreen({
  caregiverId,
  caregiverName,
  caregiverTimezone,
  email,
  careRecipient,
  onProfileSaved,
  onRecipientSaved,
  onRecipientDeleted,
}: ProfileTabScreenProps) {
  const [page, setPage] = useState<'profile' | 'recipients' | 'team' | 'support' | 'settings' | null>(null);
  const scrollRef = useRef<ScrollView>(null);
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
        initialProfile={{
          caregiverId,
          displayName: caregiverName,
          timezone: caregiverTimezone,
        }}
        onCancel={() => setPage(null)}
        onProfileSaved={(displayName, timezone) => {
          onProfileSaved(displayName, timezone);
          setPage(null);
        }}
      />
    );
  }

  const hasEditableForm = page === 'recipients' || page === 'team' || page === 'support';

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      automaticallyAdjustKeyboardInsets
      directionalLockEnabled={hasEditableForm}
      keyboardDismissMode={hasEditableForm ? 'none' : 'interactive'}
      keyboardShouldPersistTaps={hasEditableForm ? 'always' : 'handled'}
    >
      <View style={styles.brandBar}>
        {page && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Profile"
            disabled={isSigningOut}
            onPress={() => setPage(null)}
            style={styles.back}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.backLabel}>‹ Profile</Text>
          </Pressable>
        )}
        <View accessible accessibilityLabel="iHEARD" style={styles.brand}>
          <TodayIcon name="brand" size={29} />
          <Text maxFontSizeMultiplier={1.3} style={styles.wordmark}>iHEARD</Text>
        </View>
        <View accessible accessibilityLabel="Notifications unavailable" accessibilityState={{ disabled: true }} style={styles.bell}>
          <TodayIcon name="bell" size={23} color="#776a89" />
        </View>
      </View>

      <View style={styles.content}>
        {page === 'recipients' ? (
          <CareRecipientsEditor
            caregiverId={caregiverId}
            activeRecipientId={careRecipient?.id}
            onRecipientDeleted={onRecipientDeleted}
            onRecipientSaved={onRecipientSaved}
            onEditorOpened={() => scrollRef.current?.scrollTo({ y: 0, animated: false })}
          />
        ) : page === 'team' ? (
          <CareTeamScreen
            caregiverId={caregiverId}
            onPageChange={() => scrollRef.current?.scrollTo({ y: 0, animated: false })}
          />
        ) : page === 'support' ? (
          <SupportNetworkScreen
            caregiverId={caregiverId}
            onPageChange={() => scrollRef.current?.scrollTo({ y: 0, animated: false })}
          />
        ) : page === 'settings' ? (
          <AppSettingsScreen
            caregiverId={caregiverId}
            email={email}
            timezone={caregiverTimezone}
            onSignOut={signOut}
            isSigningOut={isSigningOut}
            signOutFailed={signOutFailed}
            onPageChange={() => scrollRef.current?.scrollTo({ y: 0, animated: false })}
          />
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
              highlighted
              onPress={() => setPage('recipients')}
            />
            <ProfileRow
              icon="medicalBag"
              title="Care Team"
              description="Doctors, mental health providers, pharmacies, and others"
              onPress={() => setPage('team')}
            />
            <ProfileRow
              icon="support"
              title="Support Network"
              description="Family, friends, and support groups"
              onPress={() => setPage('support')}
            />
            <ProfileRow
              icon="settings"
              title="App Settings"
              description="Notifications, privacy, and account"
              onPress={() => setPage('settings')}
            />
          </>
        )}
      </View>
    </ScrollView>
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
});
