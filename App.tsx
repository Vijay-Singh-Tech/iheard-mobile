import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';

import AddCareRecipientScreen from './screens/AddCareRecipientScreen';
import CaregiverHomeScreen from './screens/CaregiverHomeScreen';
import CaregiverProfileScreen from './screens/CaregiverProfileScreen';
import SignInScreen from './screens/SignInScreen';
import WellbeingCheckScreen from './screens/WellbeingCheckScreen';
import { supabase } from './services/supabase';

export type CareRecipient = {
  id: string;
  preferred_name: string;
  relationship: string;
  primary_condition: string;
};

export default function App() {
  const [session, setSession] = useState<Session | null>();
  const [hasProfile, setHasProfile] = useState<boolean>();
  const [careRecipient, setCareRecipient] = useState<
    CareRecipient | null | undefined
  >();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<'home' | 'wellbeing'>(
    'home'
  );

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
      setCareRecipient(undefined);
      setLoadError(null);
      setActiveScreen('home');
      return () => {
        isMounted = false;
      };
    }

    setHasProfile(undefined);
    setCareRecipient(undefined);
    setLoadError(null);
    const userId = session.user.id;

    async function loadCaregiverData() {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (profileError) {
        console.error(
          'Unable to check caregiver profile:',
          profileError.message
        );
        setLoadError('Unable to load your caregiver profile.');
        return;
      }

      const profileExists = Boolean(profile);
      setHasProfile(profileExists);

      if (!profileExists) {
        setCareRecipient(null);
        return;
      }

      const { data: recipient, error: recipientError } = await supabase
        .from('care_recipients')
        .select('id, preferred_name, relationship, primary_condition')
        .eq('caregiver_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (recipientError) {
        console.error('Unable to load care recipient:', recipientError.message);
        setLoadError('Unable to load your care recipient.');
        return;
      }

      setCareRecipient(recipient);
    }

    loadCaregiverData().catch((error: unknown) => {
      if (isMounted) {
        console.error('Unable to load caregiver data:', error);
        setLoadError('Unable to load your caregiver information.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [session]);

  let content;

  if (
    session === undefined ||
    (session &&
      !loadError &&
      (hasProfile === undefined || careRecipient === undefined))
  ) {
    content = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#147d6f" size="large" />
      </View>
    );
  } else if (!session) {
    content = <SignInScreen />;
  } else if (loadError) {
    content = (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{loadError} Please try again.</Text>
      </View>
    );
  } else if (!hasProfile) {
    content = (
      <CaregiverProfileScreen
        onProfileSaved={() => {
          setHasProfile(true);
          setCareRecipient(null);
        }}
      />
    );
  } else if (careRecipient && activeScreen === 'wellbeing') {
    content = (
      <WellbeingCheckScreen
        careRecipient={careRecipient}
        onReturnHome={() => setActiveScreen('home')}
      />
    );
  } else if (careRecipient) {
    content = (
      <CaregiverHomeScreen
        careRecipient={careRecipient}
        onStartWellbeingCheck={() => setActiveScreen('wellbeing')}
      />
    );
  } else {
    content = <AddCareRecipientScreen onRecipientAdded={setCareRecipient} />;
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
  errorText: {
    paddingHorizontal: 24,
    color: '#b42318',
    fontSize: 16,
    textAlign: 'center',
  },
});
