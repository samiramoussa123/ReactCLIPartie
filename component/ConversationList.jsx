import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import API from '../api/api';

export default function ConversationList({ onSelect, selectedUserId, currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.id) fetchList();
  }, [currentUser]);

const fetchList = async () => {
  try {
    setLoading(true);

    const meRes = await API.get('/me');
    const me = meRes.data?.user ?? meRes.data;

    let contacts = [];

    if (me.medecin?.id) {
      const res = await API.get(`/dossiers/medecin/${me.medecin.id}/patient`);
      contacts = res.data.patients ?? [];

    } else if (me.patient?.id) {
      const res = await API.get(`/dossiers/patient/${me.patient.id}/medecin`);
      contacts = res.data.medecins ?? [];

    } else {
      setConversations([]);
      return;
    }

    const chatRes = await API.get('/chat/conversations');
    const chatMap = {};
    chatRes.data.forEach(c => { chatMap[c.user_id] = c; });

    const merged = contacts
      .filter(c => c?.user_id)  // ignorer les entrées sans user_id
      .map(contact => {
        const userId = contact.user_id;
        const name   = `${contact.nom ?? ''} ${contact.prenom ?? ''}`.trim();
        const chat   = chatMap[userId] || {};

        return {
          user_id:      userId,
          user_name:    name || `Utilisateur #${userId}`,
          last_message: chat.last_message ?? null,
          last_at:      chat.last_at      ?? null,
          unread:       chat.unread       ?? 0,
        };
      });

    merged.sort((a, b) => {
      if (a.last_at && !b.last_at) return -1;
      if (!a.last_at && b.last_at) return 1;
      if (a.last_at && b.last_at) return new Date(b.last_at) - new Date(a.last_at);
      return a.user_name.localeCompare(b.user_name);
    });

    setConversations(merged);

  } catch (error) {
    console.error('Erreur:', error.response?.status, JSON.stringify(error.response?.data));
    Alert.alert('Erreur', 'Impossible de charger la liste');
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

  const renderItem = ({ item }) => {
    if (!item?.user_id) return null;
    const isSelected  = selectedUserId === item.user_id;
    const hasUnread   = item.unread > 0;
    const hasMessages = !!item.last_message;

    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.itemSelected]}
        onPress={() => onSelect(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.user_name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>

        {/* Infos */}
        <View style={styles.info}>
          <View style={styles.row}>
            <Text
              style={[styles.name, hasUnread && styles.nameUnread, isSelected && styles.nameSelected]}
              numberOfLines={1}
            >
              {item.user_name}
            </Text>
            {item.last_at && (
              <Text style={[styles.time, hasUnread && styles.timeUnread]}>
                {formatTime(item.last_at)}
              </Text>
            )}
          </View>

          <View style={styles.row}>
            <Text
              style={[
                styles.preview,
                hasUnread && styles.previewUnread,
                !hasMessages && styles.previewEmpty,
                isSelected && styles.previewSelected,
              ]}
              numberOfLines={1}
            >
              {hasMessages ? item.last_message : 'Appuyer pour démarrer la conversation'}
            </Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread > 99 ? '99+' : item.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.user_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>Aucun contact trouvé</Text>
            <Text style={styles.emptySub}>Vos patients apparaîtront ici</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#fff' },
  list:           { flexGrow: 1 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:    { marginTop: 12, color: '#64748b', fontSize: 14 },

  item:           { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  itemSelected:   { backgroundColor: '#f0fdf4' },

  avatar:         { width: 50, height: 50, borderRadius: 25, backgroundColor: '#0f766e', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:     { color: '#fff', fontSize: 20, fontWeight: '700' },

  info:           { flex: 1 },
  row:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },

  name:           { fontSize: 15, fontWeight: '500', color: '#1e293b', flex: 1, marginRight: 8 },
  nameUnread:     { fontWeight: '700', color: '#0f172a' },
  nameSelected:   { color: '#0f766e' },

  time:           { fontSize: 11, color: '#94a3b8' },
  timeUnread:     { fontWeight: '600', color: '#0f766e' },

  preview:        { fontSize: 13, color: '#64748b', flex: 1, marginRight: 8 },
  previewUnread:  { fontWeight: '600', color: '#1e293b' },
  previewEmpty:   { fontStyle: 'italic', color: '#94a3b8' },
  previewSelected:{ color: '#0f766e' },

  badge:          { backgroundColor: '#0f766e', borderRadius: 12, minWidth: 20, height: 20, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  badgeText:      { color: '#fff', fontSize: 11, fontWeight: '600' },

  empty:          { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyIcon:      { fontSize: 48, marginBottom: 12 },
  emptyText:      { fontSize: 16, fontWeight: '500', color: '#64748b', marginBottom: 6 },
  emptySub:       { fontSize: 13, color: '#94a3b8' },
});