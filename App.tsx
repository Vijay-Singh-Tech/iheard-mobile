import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from './services/supabase';

export default function App() {
  useEffect(() => {
    async function testSupabase() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.log('Supabase error:', error.message);
      } else {
        console.log('Supabase connection successful');
        console.log('Session:', data.session);
      }
    }

    testSupabase();
  }, []);

  return (
    <View style={styles.container}>
      <Text>iHeard MVP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});