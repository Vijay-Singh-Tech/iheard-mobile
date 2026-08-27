import { StatusBar } from 'expo-status-bar';

import SignInScreen from './screens/SignInScreen';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <SignInScreen />
    </>
  );
}
