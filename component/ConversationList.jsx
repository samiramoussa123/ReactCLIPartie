// src/components/ConversationList.jsx
import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import API from '../api/api'; 

export default function ConversationList({ onSelect, selectedUserId, currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await API.get('/chat/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
      Alert.alert('Erreur', 'Impossible de charger les conversations');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);
    if (diffHours < 24) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffHours < 48) return 'Hier';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const renderConversation = ({ item }) => {
      if (!item || !item.user_id) return null;

    const isSelected = selectedUserId === item.user_id;
    const hasUnread = item.unread > 0;
    return (
      <TouchableOpacity
        style={[styles.conversationItem, isSelected && styles.selectedItem]}
onPress={() => {
  if (item && item.user_id) {
    onSelect(item);
  } else {
    Alert.alert('Erreur', 'Conversation invalide');
  }
}}        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.user_name?.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, hasUnread && styles.unreadName, isSelected && styles.selectedText]} numberOfLines={1}>
              {item.user_name}
            </Text>
            {item.last_at && (
              <Text style={[styles.timestamp, hasUnread && styles.unreadTimestamp]}>
                {formatTime(item.last_at)}
              </Text>
            )}
          </View>
          <View style={styles.messagePreview}>
            <Text style={[styles.lastMessage, hasUnread && styles.unreadMessage, isSelected && styles.selectedText]} numberOfLines={1}>
              {item.last_message || 'Nouvelle conversation'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unread > 99 ? '99+' : item.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>Chargement des conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.user_id.toString()}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune conversation</Text>
            <Text style={styles.emptySubtext}>Commencez une nouvelle discussion</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  listContent: { flexGrow: 1 },
  conversationItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  selectedItem: { backgroundColor: '#f0fdf4' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0f766e', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  conversationInfo: { flex: 1 },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 16, fontWeight: '500', color: '#1e293b', flex: 1, marginRight: 8 },
  unreadName: { fontWeight: '700', color: '#0f172a' },
  selectedText: { color: '#0f766e' },
  timestamp: { fontSize: 11, color: '#94a3b8' },
  unreadTimestamp: { fontWeight: '600', color: '#0f766e' },
  messagePreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 13, color: '#64748b', flex: 1, marginRight: 8 },
  unreadMessage: { fontWeight: '600', color: '#1e293b' },
  unreadBadge: { backgroundColor: '#0f766e', borderRadius: 12, minWidth: 20, height: 20, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '500', color: '#64748b', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#94a3b8' },
});