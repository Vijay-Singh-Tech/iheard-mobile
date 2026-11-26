import { Image } from 'react-native';

const icons = {
  lotus: require('../assets/recharge/lotus.png'),
  wind: require('../assets/recharge/wind.png'),
  music: require('../assets/recharge/musicIcon.png'),
  cup: require('../assets/recharge/cup.png'),
  settings: require('../assets/today/settings.png'),
  book: require('../assets/today/book.png'),
  assessment: require('../assets/today/assessment.png'),
  support: require('../assets/today/support.png'),
  medicalBag: require('../assets/today/medicalBag.png'),
  shield: require('../assets/today/shield.png'),
  brand: require('../assets/today/brand.png'),
  home: require('../assets/today/home.png'),
  chat: require('../assets/today/chat.png'),
  care: require('../assets/today/care.png'),
  profile: require('../assets/today/profile.png'),
  bell: require('../assets/today/bell.png'),
  keyboard: require('../assets/today/keyboard.png'),
  mic: require('../assets/today/mic.png'),
  check: require('../assets/today/check.png'),
  pill: require('../assets/today/pill.png'),
  calendar: require('../assets/today/calendar.png'),
  heart: require('../assets/today/heart.png'),
  note: require('../assets/today/note.png'),
  flag: require('../assets/today/flag.png'),
  bolt: require('../assets/today/bolt.png'),
  okay: require('../assets/today/okay.png'),
  stress: require('../assets/today/stress.png'),
  difficult: require('../assets/today/difficult.png'),
  chevron: require('../assets/today/chevron.png'),
};

export type TodayIconName = keyof typeof icons;

export default function TodayIcon({
  name,
  color = '#512e96',
  size = 22,
}: {
  name: TodayIconName;
  color?: string;
  size?: number;
}) {
  return (
    <Image
      accessible={false}
      source={icons[name]}
      style={{ width: size, height: size, tintColor: color }}
    />
  );
}
