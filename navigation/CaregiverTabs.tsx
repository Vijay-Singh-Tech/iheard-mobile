import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CareRecipient } from '../App';
import TodayIcon from '../components/TodayIcon';
import CareResourcesScreen from '../screens/CareResourcesScreen';
import CaregiverHomeScreen from '../screens/CaregiverHomeScreen';
import ProfileTabScreen from '../screens/ProfileTabScreen';
import VoiceInputScreen from '../screens/VoiceInputScreen';
import WellbeingCheckScreen from '../screens/WellbeingCheckScreen';

const tabs = ['Today', 'iHEARD', 'Care', 'Profile'] as const;
type Tab = (typeof tabs)[number];
const tabIcons = { Today: 'home', iHEARD: 'chat', Care: 'care', Profile: 'profile' } as const;

type CaregiverTabsProps = {
  caregiverId: string;
  caregiverName: string;
  caregiverTimezone: string;
  email?: string;
  onProfileSaved: (displayName: string, timezone: string) => void;
  careRecipient: CareRecipient;
};

export default function CaregiverTabs({
  caregiverId,
  caregiverName,
  caregiverTimezone,
  email,
  onProfileSaved,
  careRecipient,
}: CaregiverTabsProps) {
  const [tab, setTab] = useState<Tab>('Today');
  const [flow, setFlow] = useState<'wellbeing' | null>(null);
  const [voiceNavigationLocked, setVoiceNavigationLocked] = useState(false);

  function openVoice() {
    setTab('iHEARD');
  }

  let content;
  if (flow === 'wellbeing') {
    content = (
      <WellbeingCheckScreen
        careRecipient={careRecipient}
        onReturnHome={() => setFlow(null)}
        returnLabel={tab === 'Care' ? 'Return to Care' : 'Return to Today'}
      />
    );
  } else if (tab === 'iHEARD') {
    content = (
      <VoiceInputScreen
        careRecipientId={careRecipient.id}
        onReturnHome={() => setTab('Today')}
        onNavigationLockChange={setVoiceNavigationLocked}
      />
    );
  } else if (tab === 'Today') {
    content = (
      <CaregiverHomeScreen
        caregiverId={caregiverId}
        caregiverName={caregiverName}
        careRecipient={careRecipient}
        onStartWellbeingCheck={() => setFlow('wellbeing')}
        onStartVoiceInput={openVoice}
      />
    );
  } else if (tab === 'Care') {
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
              <Text style={[styles.tabLabel, tab === item && styles.selectedLabel]}>
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
