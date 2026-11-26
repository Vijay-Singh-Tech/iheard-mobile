import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';

import TodayIcon from '../components/TodayIcon';

const activities = [
  {
    title: 'Smile & Laugh',
    description: 'Funny and uplifting clips to brighten your day',
    icon: 'okay',
    thumbnail: require('../assets/recharge/smile.png'),
  },
  {
    title: 'Breathing Break',
    description: 'Guided 1–3 minute breathing exercises',
    icon: 'wind',
    thumbnail: require('../assets/recharge/breathing.png'),
  },
  {
    title: 'Relaxing Music',
    description: 'Calming music and soothing sounds',
    icon: 'music',
    thumbnail: require('../assets/recharge/music.png'),
  },
  {
    title: 'Take a Break',
    description: 'Simple 2–5 minute relaxation activities',
    icon: 'cup',
    thumbnail: require('../assets/recharge/break.png'),
  },
  {
    title: 'Just for You',
    description: 'Personalized suggestions based on how you’re feeling',
    icon: 'heart',
    thumbnail: require('../assets/recharge/personal.png'),
  },
] as const;

export default function RechargeScreen() {
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
          <TodayIcon name="bell" color="#776a89" size={23} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.intro}>
          <View style={styles.headingRow}>
            <TodayIcon name="lotus" size={37} />
            <Text accessibilityRole="header" style={styles.heading}>Recharge</Text>
          </View>
          <Text style={styles.subtitle}>
            Take a short break, relax, and do something that helps you feel better.
          </Text>
        </View>

        {activities.map(({ title, description, icon, thumbnail }) => (
          <Pressable
            key={title}
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${description}. Coming Soon.`}
            accessibilityHint="Shows availability"
            onPress={() => Alert.alert(title, 'Coming Soon')}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <TodayIcon name={icon} size={34} />
            <View style={styles.cardText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
              <Text style={styles.status}>Coming Soon</Text>
            </View>
            <Image accessible={false} source={thumbnail} style={styles.thumbnail} />
            <View style={styles.arrow}>
              <TodayIcon name="chevron" size={17} />
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f6fd' },
  scrollContent: { alignItems: 'center', paddingBottom: 18 },
  brandBar: {
    width: '100%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee7fa',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 48,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  wordmark: { color: '#272047', fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  notification: { position: 'absolute', right: 17, opacity: 0.7 },
  content: { width: '100%', maxWidth: 540, paddingHorizontal: 12, gap: 9 },
  intro: { paddingHorizontal: 8, paddingVertical: 10, gap: 4 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heading: { flexShrink: 1, color: '#241d40', fontSize: 31, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: '#3e354e', fontSize: 16, lineHeight: 21 },
  card: {
    minHeight: 83,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#faf7ff',
    borderWidth: 1,
    borderColor: '#e7dff4',
    borderRadius: 18,
  },
  cardPressed: { backgroundColor: '#eee5f8' },
  cardText: { flex: 1, gap: 2 },
  title: { color: '#241d40', fontSize: 17, fontWeight: '800', letterSpacing: -0.25 },
  description: { color: '#3e354e', fontSize: 13, lineHeight: 16 },
  status: { color: '#654b86', fontSize: 11, fontWeight: '700' },
  thumbnail: { width: '26%', maxWidth: 100, height: 59, borderRadius: 11 },
  arrow: { transform: [{ rotate: '-90deg' }] },
});
