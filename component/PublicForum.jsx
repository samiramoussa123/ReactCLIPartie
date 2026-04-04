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
} from 'react-native';
import API from '../api/apiPublic';
import { subscribeToChannel, unsubscribeFromChannel } from '../src/utils/Echo';

export default function PublicForum({ currentUser }) {
  const [questions, setQuestions] = useState([]);
  const [input, setInput] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const flatListRef = useRef(null);
  const channelRef = useRef(null);
  const isSubscribed = useRef(false);
  const isMounted = useRef(true);

  // Récupération initiale des questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await API.get('/forum');
        if (isMounted.current) {
          setQuestions(response.data.data);
        }
      } catch (error) {
        console.error('Erreur chargement forum:', error);
      }
    };
    fetchQuestions();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Souscription unique au canal Pusher
  useEffect(() => {
    if (isSubscribed.current) return;
    isSubscribed.current = true;

    const setupSubscription = async () => {
      try {
        const channel = await subscribeToChannel('forum', 'ForumMessageSent', (e) => {
          console.log('🔔 Événement forum reçu:', e);
          if (!isMounted.current) return;

          setQuestions(prev => {
            if (e.parent_id) {
              // Réponse : ajouter à la question parente
              return prev.map(q =>
                q.id === e.parent_id
                  ? { ...q, replies: [...(q.replies || []), e] }
                  : q
              );
            } else {
              // Nouvelle question : ajouter en tête
              return [{ ...e, replies: [] }, ...prev];
            }
          });
        });
        channelRef.current = channel;
      } catch (error) {
        console.error('Erreur subscription forum:', error);
      }
    };

    setupSubscription();

    // Pas de nettoyage automatique pour éviter les désinscriptions intempestives.
    // Le canal reste actif tant que l'application tourne.
  }, []); // Tableau vide, exécuté une seule fois

  const send = async () => {
    if (!input.trim()) return;

    try {
      await API.post('/forum', {
        content: input,
        author_name: currentUser ? null : (authorName || 'Anonyme'),
        parent_id: replyTo ?? null,
      });
      setInput('');
      setReplyTo(null);
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  };

  const renderReply = (reply) => (
    <View key={reply.id} style={styles.replyContainer}>
      <View style={styles.replyHeader}>
        <Text style={[styles.replyAuthor, reply.is_specialiste && styles.specialistText]}>
          {reply.author_name ?? reply.user?.name ?? 'Anonyme'}
        </Text>
        {reply.is_specialiste && <Text style={styles.specialistBadge}> — Spécialiste</Text>}
      </View>
      <Text style={styles.replyContent}>{reply.content}</Text>
    </View>
  );

  const renderQuestion = ({ item: q }) => (
    <View style={styles.questionContainer}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionAuthor}>
          {q.author_name ?? q.user?.name ?? 'Anonyme'}
        </Text>
      </View>
      <Text style={styles.questionContent}>{q.content}</Text>

      {(q.replies || []).map(renderReply)}

      <TouchableOpacity onPress={() => setReplyTo(q.id)} style={styles.replyButton}>
        <Text style={styles.replyButtonText}>Répondre</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Forum public — Questions & réponses</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={questions}
        extraData={questions} // force le re-rendu lors des mises à jour
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderQuestion}
        contentContainerStyle={styles.questionsList}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputArea}>
        {replyTo && (
          <View style={styles.replyInfo}>
            <Text style={styles.replyInfoText}>Réponse à la question #{replyTo}</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={styles.cancelReplyText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}

        {!currentUser && (
          <TextInput
            style={styles.nameInput}
            value={authorName}
            onChangeText={setAuthorName}
            placeholder="Votre nom (optionnel)"
            placeholderTextColor="#94a3b8"
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.messageInput}
            value={input}
            onChangeText={setInput}
            placeholder={replyTo ? 'Votre réponse...' : 'Posez une question...'}
            placeholderTextColor="#94a3b8"
            multiline
            onSubmitEditing={send}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={send}
            disabled={!input.trim()}
          >
            <Text style={styles.sendButtonText}>{replyTo ? 'Répondre' : 'Envoyer'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#6d28d9',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerTitle: { color: '#fff', fontWeight: '500', fontSize: 16 },
  questionsList: { padding: 16, paddingBottom: 20 },
  questionContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#7c3aed',
    paddingLeft: 12,
    marginBottom: 24,
  },
  questionHeader: { marginBottom: 4 },
  questionAuthor: { fontSize: 11, color: '#7c3aed', fontWeight: '500' },
  questionContent: { fontSize: 14, color: '#1e293b', marginBottom: 8 },
  replyContainer: {
    marginTop: 8,
    marginLeft: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  replyHeader: { flexDirection: 'row', marginBottom: 2 },
  replyAuthor: { fontSize: 11, fontWeight: '500', color: '#64748b' },
  specialistText: { color: '#0f766e' },
  specialistBadge: { fontSize: 11, color: '#0f766e' },
  replyContent: { fontSize: 13, color: '#1e293b', marginTop: 2 },
  replyButton: { marginTop: 6 },
  replyButtonText: { fontSize: 12, color: '#7c3aed' },
  inputArea: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  replyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  replyInfoText: { fontSize: 12, color: '#7c3aed' },
  cancelReplyText: { fontSize: 12, color: '#ef4444' },
  nameInput: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    fontSize: 13,
    marginBottom: 8,
  },
  inputRow: { flexDirection: 'row', gap: 8 },
  messageInput: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    fontSize: 13,
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6d28d9',
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendButtonText: { color: '#fff', fontWeight: '500' },
});