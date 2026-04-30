import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ConversationList from './ConversationList';

export default function ConversationListScreen({ navigation, route }) {
  const { currentUserId, currentUser } = route.params || {};

  const isMedecin = !!currentUser?.medecin_id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isMedecin ? '🩺 Mes Patients' : '👨‍⚕️ Mes Médecins'}
        </Text>
        <Text style={styles.headerSub}>
          {currentUser?.nom} {currentUser?.prenom}
        </Text>
      </View>

      <ConversationList
        currentUser={currentUser}
        onSelect={(conversation) => {
          if (!conversation?.user_id) return;
          navigation.navigate('PrivateChat', {
            currentUserId,
            otherUser: {
              id:   conversation.user_id,
              name: conversation.user_name,
            },
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#fff' },
  header:      { backgroundColor: '#0f766e', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});