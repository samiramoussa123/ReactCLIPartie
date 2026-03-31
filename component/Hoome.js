import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Hoome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue sur CLIReact</Text>
      <Text>Application médicale</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
