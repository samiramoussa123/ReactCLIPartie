import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import API from '../api/api';
import { subscribeToChannel, unsubscribeFromChannel } from '../src/utils/Echo';

export default function PrivateChat({ navigation }) {
  const route = useRoute();
  const { currentUserId, otherUser } = route.params || {};

  // Vérification de sécurité
  if (!otherUser || !otherUser.id) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Conversation invalide</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const response = await API.get(`/chat/${otherUser.id}/messages`);
        if (isMounted) {
          setMessages(response.data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
        if (isMounted) {
          Alert.alert('Erreur', 'Impossible de charger les messages');
          setLoading(false);
        }
      }
    };

    fetchMessages();

    const setupSubscription = async () => {
      try {
        const channelName = `chat.user.${currentUserId}`;
        //const channelName = `private-chat.user.${currentUserId}`;
        const channel = await subscribeToChannel(channelName, 'PrivateMessageSent', (e) => {
          if (isMounted && e.sender_user_id === otherUser.id) {
            setMessages(prev => [...prev, e]);
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        });
        channelRef.current = channel;
      } catch (error) {
        console.error('Erreur subscription Pusher:', error);
      }
    };

    setupSubscription();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
      }
    };
  }, [otherUser.id, currentUserId]);

  useEffect(() => {
    if (messages.length > 0 && !loading) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || sending) return;
    
    const content = input.trim();
    setInput('');
    setSending(true);

    const tempId = Date.now();
    const tempMessage = {
      id: tempId,
      sender_user_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      temp: true,
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await API.post(`/chat/${otherUser.id}/messages`, { content });
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId && msg.temp 
            ? { ...response.data, temp: false }
            : msg
        )
      );
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender_user_id === currentUserId;
    const isTemp = item.temp;
    
    return (
      <View style={[
        styles.messageContainer,
        isMine ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isMine ? styles.myBubble : styles.otherBubble,
          isTemp && styles.tempMessage
        ]}>
          <Text style={[
            styles.messageText,
            isMine ? styles.myText : styles.otherText,
            isTemp && styles.tempText
          ]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            {isTemp && (
              <Text style={styles.sendingIndicator}> • Envoi...</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>Chargement des messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {otherUser.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{otherUser.name}</Text>
          <Text style={styles.chatType}>
            Conversation privée et sécurisée
          </Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Écrire un message..."
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={1000}
          editable={!sending}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Enter' && Platform.OS === 'web') {
              send();
            }
          }}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]} 
          onPress={send}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendButtonText}>
            {sending ? '...' : '➤'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 12,
  },
  header: {
    padding: 16,
    backgroundColor: '#0f766e',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  chatType: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.8,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 8,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    padding: 10,
    borderRadius: 16,
    maxWidth: '80%',
  },
  myBubble: {
    backgroundColor: '#0f766e',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tempMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myText: {
    color: '#fff',
  },
  otherText: {
    color: '#1e293b',
  },
  tempText: {
    fontStyle: 'italic',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.6,
    textAlign: 'right',
  },
  sendingIndicator: {
    fontSize: 10,
    opacity: 0.6,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    fontSize: 14,
    maxHeight: 100,
    backgroundColor: '#fff',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f766e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
  },
});