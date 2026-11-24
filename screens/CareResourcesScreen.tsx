import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import TodayIcon from '../components/TodayIcon';
import type { TodayIconName } from '../components/TodayIcon';

type CareResourcesScreenProps = {
  recipientName: string;
  onStartAssessment: () => void;
};

export default function CareResourcesScreen({
  recipientName,
  onStartAssessment,
}: CareResourcesScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.brandBar}>
        <View accessible accessibilityLabel="iHEARD" style={styles.brand}>
          <TodayIcon name="brand" size={29} />
          <Text style={styles.wordmark}>iHEARD</Text>
        </View>
        <View
          accessible
          accessibilityLabel="Notifications unavailable"
          accessibilityState={{ disabled: true }}
          style={styles.notification}
        >
          <TodayIcon name="bell" color="#776a89" size={23} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.intro}>
          <Text accessibilityRole="header" style={styles.heading}>Care Resources</Text>
          <Text style={styles.subtitle}>
            Practical tools and information to support you and {recipientName}.
          </Text>
        </View>

        <ResourceCard
          icon="book"
          title="Learn"
          description="Care topics, practical tips, and short guides"
        />
        <ResourceCard
          icon="assessment"
          title="Assess"
          description="Take the caregiver wellbeing check"
          status="Tracking coming soon"
          onPress={onStartAssessment}
        />
        <ResourceCard
          icon="support"
          title="Find Support"
          description="Support groups, counseling, and respite care"
        />
        <ResourceCard
          icon="medicalBag"
          title="Care Team"
          description={`Doctors, specialists, and pharmacies for ${recipientName}`}
        />
        <ResourceCard
          icon="shield"
          title="When to Get Help"
          description="Safety resources and urgent concerns"
          status="Unavailable pending review"
          safety
        />
      </View>
    </ScrollView>
  );
}

type ResourceCardProps = {
  icon: TodayIconName;
  title: string;
  description: string;
  status?: string;
  safety?: boolean;
  onPress?: () => void;
};

function ResourceCard({
  icon,
  title,
  description,
  status,
  safety,
  onPress,
}: ResourceCardProps) {
  const availability = status ?? (onPress ? undefined : 'Coming soon');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      accessibilityLabel={[title, description, availability].filter(Boolean).join('. ')}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        safety && styles.safetyCard,
        pressed && styles.pressed,
      ]}
    >
      <TodayIcon name={icon} color={safety ? '#c64364' : '#653bad'} size={37} />
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {availability && <Text style={styles.availability}>{availability}</Text>}
      </View>
      <View style={styles.arrow}>
        <TodayIcon name="chevron" color={onPress ? '#512e96' : '#887a9b'} size={18} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f6fd' },
  scrollContent: { alignItems: 'center', paddingBottom: 16 },
  brandBar: {
    width: '100%',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee7fa',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 48,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  wordmark: { color: '#272047', fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  notification: { position: 'absolute', right: 17, opacity: 0.7 },
  content: { width: '100%', maxWidth: 540, paddingHorizontal: 14, gap: 11 },
  intro: { paddingHorizontal: 6, paddingTop: 9, paddingBottom: 3, gap: 4 },
  heading: { color: '#241d40', fontSize: 25, fontWeight: '800', letterSpacing: -0.55 },
  subtitle: { color: '#494155', fontSize: 15, lineHeight: 20 },
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e5ddf2',
    backgroundColor: '#f3effb',
    paddingVertical: 10,
    paddingHorizontal: 11,
  },
  safetyCard: { backgroundColor: '#fceff2', borderColor: '#f3d8e1' },
  pressed: { backgroundColor: '#e9dff8' },
  cardCopy: { flex: 1, gap: 2 },
  cardTitle: { color: '#241d40', fontSize: 18, fontWeight: '800', letterSpacing: -0.25 },
  description: { color: '#41354f', fontSize: 13, lineHeight: 17 },
  availability: { color: '#655274', fontSize: 11, lineHeight: 14, fontWeight: '600' },
  arrow: { transform: [{ rotate: '-90deg' }] },
});
