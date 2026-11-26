import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CareRecipient } from '../App';
import TodayIcon from '../components/TodayIcon';
import CareResourcesScreen from '../screens/CareResourcesScreen';
import CaregiverHomeScreen from '../screens/CaregiverHomeScreen';
import ProfileTabScreen from '../screens/ProfileTabScreen';
import RechargeScreen from '../screens/RechargeScreen';
import VoiceInputScreen from '../screens/VoiceInputScreen';
import WellbeingCheckScreen from '../screens/WellbeingCheckScreen';

const tabs = ['Today', 'iHEARD', 'Care', 'Recharge', 'Profile'] as const;
type Tab = (typeof tabs)[number];
const tabIcons = { Today: 'home', iHEARD: 'chat', Care: 'care', Recharge: 'lotus', Profile: 'profile' } as const;

type CaregiverTabsProps = {
  caregiverId: string;
  caregiverName: string;
  caregiverTimezone: string;
  email?: string;
  onProfileSaved: (displayName: string, timezone: string) => void;
  careRecipient: CareRecipient | null;
  onRecipientSaved: (recipient: CareRecipient) => void;
  onRecipientDeleted: (recipientId: string, nextRecipient: CareRecipient | null) => void;
};

export default function CaregiverTabs({
  caregiverId,
  caregiverName,
  caregiverTimezone,
  email,
  onProfileSaved,
  careRecipient,
  onRecipientSaved,
  onRecipientDeleted,
}: CaregiverTabsProps) {
  const [tab, setTab] = useState<Tab>('Today');
  const [flow, setFlow] = useState<'wellbeing' | null>(null);
  const [voiceNavigationLocked, setVoiceNavigationLocked] = useState(false);

  function openVoice() {
    setTab('iHEARD');
  }

  let content;
  if (tab === 'Recharge') {
    content = <RechargeScreen />;
  } else if (!careRecipient && tab !== 'Profile') {
    content = (
      <View style={styles.emptyState}>
        <TodayIcon name="care" size={34} />
        <Text accessibilityRole="header" style={styles.emptyTitle}>{tab}</Text>
        <Text style={styles.emptyText}>Add a care recipient to use voice check-ins and wellbeing features.</Text>
        <Pressable accessibilityRole="button" onPress={() => setTab('Profile')} style={styles.profileLink}>
          <Text style={styles.profileLinkLabel}>Go to Profile</Text>
        </Pressable>
      </View>
    );
  } else if (careRecipient && flow === 'wellbeing') {
    content = (
      <WellbeingCheckScreen
        careRecipient={careRecipient}
        onReturnHome={() => setFlow(null)}
        returnLabel={tab === 'Care' ? 'Return to Care' : 'Return to Today'}
      />
    );
  } else if (careRecipient && tab === 'iHEARD') {
    content = (
      <VoiceInputScreen
        careRecipientId={careRecipient.id}
        onReturnHome={() => setTab('Today')}
        onNavigationLockChange={setVoiceNavigationLocked}
      />
    );
  } else if (careRecipient && tab === 'Today') {
    content = (
      <CaregiverHomeScreen
        caregiverId={caregiverId}
        caregiverName={caregiverName}
        careRecipient={careRecipient}
        onStartWellbeingCheck={() => setFlow('wellbeing')}
        onStartVoiceInput={openVoice}
      />
    );
  } else if (careRecipient && tab === 'Care') {
    content = (
      <CareResourcesScreen
        recipientName={careRecipient.preferred_name}
        onStartAssessment={() => setFlow('wellbeing')}
      />
    );
  } else {
    content = (
      <ProfileTabScreen
        caregiverId={caregiverId}
        caregiverName={caregiverName}
        caregiverTimezone={caregiverTimezone}
        email={email}
        careRecipient={careRecipient}
        onProfileSaved={onProfileSaved}
        onRecipientSaved={onRecipientSaved}
        onRecipientDeleted={onRecipientDeleted}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.shell, !flow && styles.brandedShell]}>
      <View style={styles.content}>{content}</View>
      {!flow && (
        <View accessibilityRole="tablist" style={styles.tabBar}>
          {tabs.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item, disabled: voiceNavigationLocked }}
              disabled={voiceNavigationLocked}
              onPress={() => setTab(item)}
              style={[styles.tab, tab === item && styles.selectedTab]}
            >
              <TodayIcon name={tabIcons[item]} color={tab === item ? '#4d278b' : '#4f5267'} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.tabLabel, tab === item && styles.selectedLabel]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#f4f7f6' },
  brandedShell: { backgroundColor: '#f8f6fd' },
  content: { flex: 1 },
  emptyState: { flex: 1, padding: 24, gap: 12, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#241d40', fontSize: 27, fontWeight: '800' },
  emptyText: { color: '#594d67', fontSize: 15, textAlign: 'center' },
  profileLink: { minHeight: 46, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12, backgroundColor: '#512e96' },
  profileLinkLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ded7eb',
    paddingHorizontal: 10,
    paddingTop: 4,
    gap: 5,
    backgroundColor: '#f8f6fd',
  },
  tab: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    gap: 1,
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  selectedTab: { backgroundColor: '#ebe2f8' },
  tabLabel: { color: '#4f5267', fontSize: 12, textAlign: 'center' },
  selectedLabel: { color: '#4d278b', fontWeight: '700' },
});
