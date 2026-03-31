import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewHome({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>✅ NOUVEAU COMPOSANT</Text>
        <Text style={styles.subtitle}>Si vous voyez ceci,</Text>
        <Text style={styles.subtitle}>le problème vient de l'ancien fichier</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.buttonText}>Aller à Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'green', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#333', marginBottom: 5 },
  button: { marginTop: 30, backgroundColor: '#3B82F6', padding: 15, borderRadius: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});