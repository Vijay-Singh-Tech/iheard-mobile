import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppTextSizeContext } from './components/AppText';
import type { TextSize } from './components/AppText';
import CaregiverTabs from './navigation/CaregiverTabs';
import AddCareRecipientScreen from './screens/AddCareRecipientScreen';
import CaregiverProfileScreen from './screens/CaregiverProfileScreen';
import SignInScreen from './screens/SignInScreen';
import { supabase } from './services/supabase';

export type CareRecipient = {
  id: string;
  preferred_name: string;
  relationship: string;
  primary_condition: string;
};

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

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {session === undefined ? (
        <LoadingScreen />
      ) : session ? (
        <CaregiverBootstrap
          key={session.user.id}
          userId={session.user.id}
          email={session.user.email}
        />
      ) : (
        <SignInScreen />
      )}
    </SafeAreaProvider>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color="#147d6f" size="large" />
    </View>
  );
}

function CaregiverBootstrap({ userId, email }: { userId: string; email?: string }) {
  const [caregiverName, setCaregiverName] = useState<string | null>();
  const [size, setSize] = useState<TextSize>('standard');
  const [caregiverTimezone, setCaregiverTimezone] = useState('');
  const [careRecipient, setCareRecipient] = useState<
    CareRecipient | null | undefined
  >();
  const [isAddingFirstRecipient, setIsAddingFirstRecipient] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCaregiverData() {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, timezone, text_size')
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

      setSize(profile?.text_size === 'large' ? 'large' : 'standard');
      setCaregiverName(profile?.display_name ?? null);
      setCaregiverTimezone(profile?.timezone ?? '');

      if (!profile) {
        setCareRecipient(null);
        return;
      }

      const { data: recipient, error: recipientError } = await supabase
        .from('care_recipients')
        .select('id, preferred_name, relationship, primary_condition')
        .eq('caregiver_id', userId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
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
  }, [userId]);

  if (loadError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{loadError} Please try again.</Text>
      </View>
    );
  }

  if (caregiverName === undefined || careRecipient === undefined) {
    return <LoadingScreen />;
  }

  if (caregiverName === null) {
    return (
      <CaregiverProfileScreen
        onProfileSaved={(displayName, timezone) => {
          setCaregiverName(displayName);
          setCaregiverTimezone(timezone);
          setCareRecipient(null);
          setIsAddingFirstRecipient(true);
        }}
      />
    );
  }

  if (!careRecipient && isAddingFirstRecipient) {
    return <AddCareRecipientScreen onRecipientAdded={(recipient) => {
      setCareRecipient(recipient);
      setIsAddingFirstRecipient(false);
    }} />;
  }

  return (
    <AppTextSizeContext.Provider value={{ size, setSize }}>
      <CaregiverTabs
        caregiverId={userId}
        caregiverName={caregiverName}
        caregiverTimezone={caregiverTimezone}
        email={email}
        onProfileSaved={(displayName, timezone) => {
          setCaregiverName(displayName);
          setCaregiverTimezone(timezone);
        }}
        careRecipient={careRecipient}
        onRecipientSaved={(saved) => {
          setCareRecipient((current) => !current || current.id === saved.id ? saved : current);
        }}
        onRecipientDeleted={(deletedId, nextRecipient) => {
          setCareRecipient((current) => current?.id === deletedId ? nextRecipient : current);
        }}
      />
    </AppTextSizeContext.Provider>
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
