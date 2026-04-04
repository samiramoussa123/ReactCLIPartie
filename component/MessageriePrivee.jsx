// src/components/ConversationList.jsx
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';

export default function MessageriePrivee({ onSelect, selectedUserId }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/conversations')
      .then(r => {
        setConversations(r.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const renderConversation = ({ item }) => {
    const isSelected = selectedUserId === item.user_id;
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          isSelected && styles.selectedItem,
        ]}
        onPress={() => onSelect(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.user_name[0].toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[
              styles.userName,
              isSelected && styles.selectedText,
            ]}>
              {item.user_name}
            </Text>
            {item.last_message_date && (
              <Text style={styles.timestamp}>
                {new Date(item.last_message_date).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            )}
          </View>
          
          <Text 
            style={[
              styles.lastMessage,
              isSelected && styles.selectedText,
              !item.last_message_read && item.last_message_sender_id !== currentUser?.id && styles.unreadMessage,
            ]}
            numberOfLines={1}
          >
            {item.last_message || 'Nouvelle conversation'}
          </Text>
        </View>
        
        {!item.last_message_read && item.last_message_sender_id !== currentUser?.id && (
          <View style={styles.unreadBadge} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0f766e" />
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: '#f0fdf4',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f766e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  selectedText: {
    color: '#0f766e',
  },
  timestamp: {
    fontSize: 11,
    color: '#94a3b8',
  },
  lastMessage: {
    fontSize: 13,
    color: '#64748b',
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#1e293b',
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0f766e',
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});