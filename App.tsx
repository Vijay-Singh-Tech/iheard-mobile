import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';

import CaregiverProfileScreen from './screens/CaregiverProfileScreen';
import SignInScreen from './screens/SignInScreen';
import { supabase } from './services/supabase';

export default function App() {
  const [session, setSession] = useState<Session | null>();

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  let content;

  if (session === undefined) {
    content = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#147d6f" size="large" />
      </View>
    );
  } else {
    content = session ? <CaregiverProfileScreen /> : <SignInScreen />;
  }

  return (
    <>
      <StatusBar style="dark" />
      {content}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f7f6',
  },
});
