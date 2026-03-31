import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Simple() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>SI VOUS VOYEZ CE TEXTE, L'APP FONCTIONNE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'red' },
  text: { fontSize: 20, color: 'white', textAlign: 'center' }
});
