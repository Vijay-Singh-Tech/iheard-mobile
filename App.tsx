import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';

import AddCareRecipientScreen from './screens/AddCareRecipientScreen';
import CaregiverProfileScreen from './screens/CaregiverProfileScreen';
import SignInScreen from './screens/SignInScreen';
import { supabase } from './services/supabase';

export default function App() {
  const [session, setSession] = useState<Session | null>();
  const [hasProfile, setHasProfile] = useState<boolean>();

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

  useEffect(() => {
    let isMounted = true;

    if (!session) {
      setHasProfile(session === null ? false : undefined);
      return () => {
        isMounted = false;
      };
    }

    setHasProfile(undefined);

    supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          console.error('Unable to check caregiver profile:', error.message);
          setHasProfile(false);
          return;
        }

        setHasProfile(Boolean(data));
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  let content;

  if (session === undefined || (session && hasProfile === undefined)) {
    content = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#147d6f" size="large" />
      </View>
    );
  } else if (!session) {
    content = <SignInScreen />;
  } else if (!hasProfile) {
    content = (
      <CaregiverProfileScreen onProfileSaved={() => setHasProfile(true)} />
    );
  } else {
    content = <AddCareRecipientScreen />;
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
