import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, StatusBar, Animated, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../api/api';

// ── Mapping symptôme FR → clé backend + icône + couleur ──
const SYMPTOM_MAP = {
  'Fièvre':             { key: 'fever',                    icon: 'thermometer-outline',      color: '#EF4444' },
  'Toux':               { key: 'cough',                    icon: 'water-outline',             color: '#F97316' },
  'Mal de tête':        { key: 'headache',                 icon: 'flash-outline',             color: '#8B5CF6' },
  'Fatigue':            { key: 'fatigue',                  icon: 'battery-dead-outline',      color: '#6B7280' },
  'Douleur thoracique': { key: 'sharp chest pain',         icon: 'heart-dislike-outline',     color: '#EF4444' },
  'Essoufflement':      { key: 'shortness of breath',      icon: 'partly-sunny-outline',      color: '#3B82F6' },
  'Nausées':            { key: 'nausea',                   icon: 'sad-outline',               color: '#10B981' },
  'Douleur abdominale': { key: 'upper abdominal pain',     icon: 'body-outline',              color: '#F59E0B' },
  'Courbatures':        { key: 'muscle pain',              icon: 'fitness-outline',           color: '#EC4899' },
  'Mal de gorge':       { key: 'sore throat',              icon: 'mic-off-outline',           color: '#F97316' },
  'Vertiges':           { key: 'dizziness',                icon: 'sync-outline',              color: '#8B5CF6' },
  'Frissons':           { key: 'chills',                   icon: 'snow-outline',              color: '#3B82F6' },
  'Vomissements':       { key: 'vomiting',                 icon: 'alert-circle-outline',      color: '#EF4444' },
  'Anxiété':            { key: 'anxiety and nervousness',  icon: 'chatbubble-ellipses-outline',color: '#F59E0B' },
};

// ── Icône et couleur pour chaque clé de symptôme (questionnaire) ──
const SYMPTOM_ICONS = {
  'fever':                      { icon: 'thermometer-outline',       color: '#EF4444', bg: '#FEF2F2' },
  'fatigue':                    { icon: 'battery-dead-outline',      color: '#6B7280', bg: '#F3F4F6' },
  'weakness':                   { icon: 'barbell-outline',           color: '#9CA3AF', bg: '#F9FAFB' },
  'headache':                   { icon: 'flash-outline',             color: '#8B5CF6', bg: '#F5F3FF' },
  'nausea':                     { icon: 'sad-outline',               color: '#10B981', bg: '#ECFDF5' },
  'vomiting':                   { icon: 'alert-circle-outline',      color: '#EF4444', bg: '#FEF2F2' },
  'diarrhea':                   { icon: 'water-outline',             color: '#F97316', bg: '#FFF7ED' },
  'chills':                     { icon: 'snow-outline',              color: '#3B82F6', bg: '#EFF6FF' },
  'sweating':                   { icon: 'rainy-outline',             color: '#06B6D4', bg: '#ECFEFF' },
  'weight gain':                { icon: 'scale-outline',             color: '#F59E0B', bg: '#FFFBEB' },
  'recent weight loss':         { icon: 'trending-down-outline',     color: '#EF4444', bg: '#FEF2F2' },
  'decreased appetite':         { icon: 'restaurant-outline',        color: '#6B7280', bg: '#F3F4F6' },
  'feeling ill':                { icon: 'medkit-outline',            color: '#EF4444', bg: '#FEF2F2' },
  'sharp chest pain':           { icon: 'heart-dislike-outline',     color: '#EF4444', bg: '#FEF2F2' },
  'chest tightness':            { icon: 'contract-outline',          color: '#DC2626', bg: '#FEF2F2' },
  'palpitations':               { icon: 'pulse-outline',             color: '#EF4444', bg: '#FEF2F2' },
  'irregular heartbeat':        { icon: 'heart-outline',             color: '#F97316', bg: '#FFF7ED' },
  'peripheral edema':           { icon: 'footsteps-outline',         color: '#3B82F6', bg: '#EFF6FF' },
  'cough':                      { icon: 'water-outline',             color: '#F97316', bg: '#FFF7ED' },
  'shortness of breath':        { icon: 'partly-sunny-outline',      color: '#3B82F6', bg: '#EFF6FF' },
  'difficulty breathing':       { icon: 'cloud-offline-outline',     color: '#6B7280', bg: '#F3F4F6' },
  'wheezing':                   { icon: 'musical-notes-outline',     color: '#8B5CF6', bg: '#F5F3FF' },
  'nasal congestion':           { icon: 'bonfire-outline',           color: '#F97316', bg: '#FFF7ED' },
  'hemoptysis':                 { icon: 'water-outline',             color: '#DC2626', bg: '#FEF2F2' },
  'upper abdominal pain':       { icon: 'body-outline',              color: '#F59E0B', bg: '#FFFBEB' },
  'lower abdominal pain':       { icon: 'body-outline',              color: '#F97316', bg: '#FFF7ED' },
  'heartburn':                  { icon: 'flame-outline',             color: '#EF4444', bg: '#FEF2F2' },
  'blood in stool':             { icon: 'warning-outline',           color: '#DC2626', bg: '#FEF2F2' },
  'constipation':               { icon: 'pause-circle-outline',      color: '#6B7280', bg: '#F3F4F6' },
  'jaundice':                   { icon: 'sunny-outline',             color: '#F59E0B', bg: '#FFFBEB' },
  'joint pain':                 { icon: 'fitness-outline',           color: '#EC4899', bg: '#FDF2F8' },
  'back pain':                  { icon: 'accessibility-outline',     color: '#8B5CF6', bg: '#F5F3FF' },
  'low back pain':              { icon: 'accessibility-outline',     color: '#8B5CF6', bg: '#F5F3FF' },
  'neck pain':                  { icon: 'person-outline',            color: '#6B7280', bg: '#F3F4F6' },
  'muscle pain':                { icon: 'fitness-outline',           color: '#EC4899', bg: '#FDF2F8' },
  'dizziness':                  { icon: 'sync-outline',              color: '#8B5CF6', bg: '#F5F3FF' },
  'fainting':                   { icon: 'moon-outline',              color: '#6B7280', bg: '#F3F4F6' },
  'seizures':                   { icon: 'flash-outline',             color: '#EF4444', bg: '#FEF2F2' },
  'disturbance of memory':      { icon: 'help-circle-outline',       color: '#8B5CF6', bg: '#F5F3FF' },
  'loss of sensation':          { icon: 'hand-left-outline',         color: '#6B7280', bg: '#F3F4F6' },
  'insomnia':                   { icon: 'moon-outline',              color: '#3B82F6', bg: '#EFF6FF' },
  'skin rash':                  { icon: 'color-palette-outline',     color: '#EC4899', bg: '#FDF2F8' },
  'itching of skin':            { icon: 'hand-right-outline',        color: '#F97316', bg: '#FFF7ED' },
  'acne or pimples':            { icon: 'ellipse-outline',           color: '#EC4899', bg: '#FDF2F8' },
  'pain in eye':                { icon: 'eye-outline',               color: '#3B82F6', bg: '#EFF6FF' },
  'eye redness':                { icon: 'eye-outline',               color: '#EF4444', bg: '#FEF2F2' },
  'diminished vision':          { icon: 'glasses-outline',           color: '#6B7280', bg: '#F3F4F6' },
  'sore throat':                { icon: 'mic-off-outline',           color: '#F97316', bg: '#FFF7ED' },
  'ear pain':                   { icon: 'volume-mute-outline',       color: '#8B5CF6', bg: '#F5F3FF' },
  'nosebleed':                  { icon: 'water-outline',             color: '#EF4444', bg: '#FEF2F2' },
  'painful urination':          { icon: 'warning-outline',           color: '#F59E0B', bg: '#FFFBEB' },
  'frequent urination':         { icon: 'repeat-outline',            color: '#3B82F6', bg: '#EFF6FF' },
  'blood in urine':             { icon: 'warning-outline',           color: '#DC2626', bg: '#FEF2F2' },
  'anxiety and nervousness':    { icon: 'chatbubble-ellipses-outline',color: '#F59E0B', bg: '#FFFBEB' },
  'depression':                 { icon: 'sad-outline',               color: '#6B7280', bg: '#F3F4F6' },
  'pelvic pain':                { icon: 'body-outline',              color: '#EC4899', bg: '#FDF2F8' },
  'painful menstruation':       { icon: 'calendar-outline',          color: '#EC4899', bg: '#FDF2F8' },
};

// ── IMAGES pour chaque symptôme (fallback sur icône si absente) ──
const SYMPTOM_IMAGES = {
  'fever':                    require('../assets/fever.png'),
  'cough':                    require('../assets/cough.png'),
  'headache':                 require('../assets/headache.png'),
  'fatigue':                  require('../assets/fatigue.jpg'),
  'sharp chest pain':         require('../assets/sharp chest pain.jpg'),
  'shortness of breath':      require('../assets/shortness of breath.jpg'),
  'nausea':                   require('../assets/nausea.jpg'),
  'upper abdominal pain':     require('../assets/upper abdominal pain.jpg'),
  'muscle pain':              require('../assets/muscle pain.jpg'),
  'sore throat':              require('../assets/sore throat.jpg'),
  'dizziness':                require('../assets/dizziness.jpg'),
  'chills':                   require('../assets/chills.jpg'),
  'vomiting':                 require('../assets/vomiting.jpg'),
  'anxiety and nervousness':  require('../assets/anxiety and nervousness.png'),
  'weakness':                 require('../assets/weakness.png'),
  'diarrhea':                 require('../assets/diarrhea.jpg'),
  'sweating':                 require('../assets/sweating.jpg'),
  'weight gain':              require('../assets/weight.jpg'),
  'recent weight loss':       require('../assets/recent weight loss.jpg'),
  'decreased appetite':       require('../assets/decreased appetite.jpg'),
  'feeling ill':              require('../assets/feeling ill.jpg'),
  'palpitations':             require('../assets/palpitations.jpg'),
  'irregular heartbeat':      require('../assets/irregular heartbeat.jpg'),
  'peripheral edema':         require('../assets/peripheral edema.jpg'),
  'nasal congestion':         require('../assets/nasal congestion.jpg'),
  'hemoptysis':               require('../assets/hemoptysis.jpg'),
  'lower abdominal pain':     require('../assets/lower  abdominal pain.jpg'),
  'heartburn':                require('../assets/heartburn.jpg'),
  'blood in stool':           require('../assets/blood in stool.jpg'),
  'constipation':             require('../assets/constipation.jpg'),
  'jaundice':                 require('../assets/jaundice.jpg'),
  'joint pain':               require('../assets/joint pain.jpg'),
  'back pain':                require('../assets/backpain.jpg'),
  'low back pain':            require('../assets/low back pain.jpg'),
  'neck pain':                require('../assets/neck pain.jpg'),
  'fainting':                 require('../assets/fainting.jpg'),
  'seizures':                 require('../assets/seizures.jpg'),
  'disturbance of memory':    require('../assets/disturbance of memory.jpg'),
  'loss of sensation':        require('../assets/loss of sensation.jpg'),
  'insomnia':                 require('../assets/insomnia.jpg'),
  'skin rash':                require('../assets/skin ras.jpg'),
  'itching of skin':          require('../assets/itching of skin.jpg'),
  'acne or pimples':          require('../assets/acne or pimples.jpg'),
  'pain in eye':              require('../assets/pain in eye.jpg'),
  'eye redness':              require('../assets/eye redness.jpg'),
  'diminished vision':        require('../assets/diminished vision.jpg'),
  'ear pain':                 require('../assets/ear pain.jpg'),
  'nosebleed':                require('../assets/nosebleed.jpg'),
  'painful urination':        require('../assets/painful urination.jpg'),
  'frequent urination':       require('../assets/frequent urination.jpg'),
  'depression':               require('../assets/depression.jpg'),
  'painful menstruation':     require('../assets/painful menstruation.jpg'),
};

// Icône par défaut si symptôme non trouvé
const DEFAULT_ICON = { icon: 'help-circle-outline', color: '#3B82F6', bg: '#EFF6FF' };

const STEP = { SELECT: 'select', QUESTIONNAIRE: 'questionnaire', RESULT: 'result' };

export default function Symptomes({ navigation }) {
  const [step, setStep]                         = useState(STEP.SELECT);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [answeredSymptoms, setAnsweredSymptoms] = useState({});
  const [currentQuestion, setCurrentQuestion]   = useState(null);
  const [questionIndex, setQuestionIndex]       = useState(0);
  const [loading, setLoading]                   = useState(false);
  const [result, setResult]                     = useState(null);
  const progressAnim                            = useRef(new Animated.Value(0)).current;
  const cardAnim                                = useRef(new Animated.Value(0)).current;

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) navigation.replace('Login');
  };

  const handleError = (error) => {
    if (error.response?.status === 401) {
      Alert.alert('Session expirée', 'Veuillez vous reconnecter.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]);
    } else if (error.response?.status === 503) {
      Alert.alert('Service indisponible', 'Le service IA est temporairement indisponible.');
    } else if (error.code === 'ECONNABORTED') {
      Alert.alert('Timeout', 'La requête a pris trop de temps. Vérifiez votre connexion.');
    } else {
      Alert.alert('Erreur', error.response?.data?.message ?? error.message ?? 'Une erreur est survenue.');
    }
  };

  const animateProgress = (percent) => {
    Animated.timing(progressAnim, { toValue: percent, duration: 400, useNativeDriver: false }).start();
  };

  const animateCard = () => {
    cardAnim.setValue(0);
    Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }).start();
  };

  const toggleSymptom = (frLabel) => {
    const key = SYMPTOM_MAP[frLabel].key;
    setSelectedSymptoms(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const startQuestionnaire = async () => {
    if (selectedSymptoms.length === 0) {
      Alert.alert('Sélection requise', 'Veuillez sélectionner au moins un symptôme.');
      return;
    }
    const initial = {};
    selectedSymptoms.forEach(k => { initial[k] = 1; });
    setAnsweredSymptoms(initial);
    setLoading(true);
    try {
      const { data } = await API.post('/symptomes/question-suivante', {
        answered_symptoms: initial, confidence_threshold: 0.82,
      });
      if (data.should_stop) {
        await fetchResult(initial);
      } else {
        setCurrentQuestion({ question: data.question, symptom_key: data.symptom_key });
        setQuestionIndex(data.questions_answered);
        animateProgress(data.progress_percent ?? 0);
        animateCard();
        setStep(STEP.QUESTIONNAIRE);
      }
    } catch (e) { handleError(e); }
    finally { setLoading(false); }
  };

  const answerQuestion = async (answer) => {
    const updated = { ...answeredSymptoms, [currentQuestion.symptom_key]: answer };
    setAnsweredSymptoms(updated);
    setLoading(true);
    try {
      const { data } = await API.post('/symptomes/question-suivante', {
        answered_symptoms: updated, confidence_threshold: 0.82,
      });
      animateProgress(data.progress_percent ?? 100);
      if (data.should_stop) {
        await fetchResult(updated);
      } else {
        setCurrentQuestion({ question: data.question, symptom_key: data.symptom_key });
        setQuestionIndex(data.questions_answered);
        animateCard();
      }
    } catch (e) { handleError(e); }
    finally { setLoading(false); }
  };

  const fetchResult = async (symptoms) => {
    try {
      const { data } = await API.post('/symptomes/recommander', { symptoms });
      setResult(data);
      setStep(STEP.RESULT);
    } catch (e) { handleError(e); }
  };

  const reset = () => {
    setStep(STEP.SELECT); setSelectedSymptoms([]); setAnsweredSymptoms({});
    setCurrentQuestion(null); setQuestionIndex(0); setResult(null);
    progressAnim.setValue(0); cardAnim.setValue(0);
  };

  const getCurrentIcon = () => {
    if (!currentQuestion) return DEFAULT_ICON;
    return SYMPTOM_ICONS[currentQuestion.symptom_key] ?? DEFAULT_ICON;
  };

  const getSymptomImage = (symptomKey) => {
    return SYMPTOM_IMAGES[symptomKey] || null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => step === STEP.SELECT ? navigation.goBack() : reset()}>
          <Ionicons name="arrow-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analyse des symptômes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ─── ÉTAPE 1 : Sélection ─── */}
      {step === STEP.SELECT && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.hero} start={{x:0,y:0}} end={{x:1,y:1}}>
            <View style={styles.heroIcon}>
              <Ionicons name="medkit-outline" size={38} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>Comment vous sentez-vous ?</Text>
            <Text style={styles.heroSub}>Appuyez sur vos symptômes actuels</Text>
          </LinearGradient>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Symptômes courants</Text>
            <View style={styles.chipGrid}>
              {Object.entries(SYMPTOM_MAP).map(([fr, { key, icon, color }]) => {
                const active = selectedSymptoms.includes(key);
                return (
                  <TouchableOpacity
                    key={fr}
                    style={[styles.chip, active && { ...styles.chipActive, borderColor: color, backgroundColor: color }]}
                    onPress={() => toggleSymptom(fr)}
                  >
                    <Ionicons name={icon} size={18} color={active ? '#fff' : color} style={{ marginBottom: 4 }} />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{fr}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {selectedSymptoms.length > 0 && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.selectedText}>{selectedSymptoms.length} symptôme(s) sélectionné(s)</Text>
            </View>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={startQuestionnaire} disabled={loading}>
            <LinearGradient colors={['#3B82F6','#1D4ED8']} style={styles.primaryGradient} start={{x:0,y:0}} end={{x:1,y:1}}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <><Text style={styles.primaryBtnText}>Commencer l'analyse</Text><Ionicons name="arrow-forward" size={20} color="#fff" /></>
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Ionicons name="information-circle-outline" size={22} color="#3B82F6" />
              <Text style={styles.infoTitle}>À savoir</Text>
            </View>
            {[
              "Cette analyse ne constitue pas un diagnostic médical.",
              "En cas d'urgence (douleur thoracique, difficulté respiratoire), appelez le 198.",
              "Consultez toujours un professionnel de santé pour un diagnostic précis.",
            ].map((t, i) => <Text key={i} style={styles.infoText}>• {t}</Text>)}
          </View>
        </ScrollView>
      )}

      {/* ─── ÉTAPE 2 : Questionnaire avec IMAGES (fallback icônes) ─── */}
      {step === STEP.QUESTIONNAIRE && (
        <View style={styles.questionnaireContainer}>
          {/* Barre de progression */}
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, {
              width: progressAnim.interpolate({ inputRange: [0,100], outputRange: ['0%','100%'] })
            }]} />
          </View>
          <Text style={styles.progressLabel}>Question {questionIndex + 1} / 10</Text>

          {/* Carte question avec image ou icône */}
          <Animated.View style={[styles.questionCard, {
            opacity: cardAnim,
            transform: [{ translateY: cardAnim.interpolate({ inputRange: [0,1], outputRange: [30, 0] }) }]
          }]}>
            {!loading && currentQuestion ? (() => {
              const symptomKey = currentQuestion.symptom_key;
              const imageSource = getSymptomImage(symptomKey);
              const iconData = getCurrentIcon();

              if (imageSource) {
                return (
                  <Image
                    source={imageSource}
                    style={styles.questionImage}
                    resizeMode="cover"
                  />
                );
              } else {
                return (
                  <View style={[styles.questionIconBig, { backgroundColor: iconData.bg }]}>
                    <Ionicons name={iconData.icon} size={56} color={iconData.color} />
                  </View>
                );
              }
            })() : (
              <View style={styles.questionIconBig}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            )}

            {/* Texte de la question */}
            <Text style={styles.questionText}>
              {loading ? 'Chargement...' : currentQuestion?.question}
            </Text>

            {/* Indication visuelle Oui/Non */}
            {!loading && (
              <View style={styles.hintRow}>
                <View style={styles.hintYes}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.hintYesText}>Oui = je ressens ça</Text>
                </View>
                <View style={styles.hintNo}>
                  <Ionicons name="close-circle" size={14} color="#EF4444" />
                  <Text style={styles.hintNoText}>Non = pas du tout</Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Boutons réponse */}
          {loading ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.answerRow}>
              <TouchableOpacity style={[styles.answerBtn, styles.answerYes]} onPress={() => answerQuestion(1)}>
                <Ionicons name="checkmark" size={32} color="#fff" />
                <Text style={styles.answerBtnText}>Oui</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.answerBtn, styles.answerNo]} onPress={() => answerQuestion(0)}>
                <Ionicons name="close" size={32} color="#fff" />
                <Text style={styles.answerBtnText}>Non</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.skipLink} onPress={reset}>
            <Text style={styles.skipText}>Recommencer depuis le début</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === STEP.RESULT && result && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#10B981','#059669']} style={styles.resultHero} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Ionicons name="checkmark-circle" size={48} color="#fff" />
            <Text style={styles.resultHeroLabel}>Spécialité recommandée</Text>
            <Text style={styles.resultSpecialty}>{result.specialty_fr ?? result.specialty}</Text>
            <View style={styles.confidencePill}>
              <Text style={styles.confidenceText}>Confiance : {result.confidence_percent}</Text>
            </View>
          </LinearGradient>

          {result.top_3?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top 3 des spécialités</Text>
              {result.top_3.map((item, i) => (
                <View key={i} style={styles.top3Row}>
                  <Text style={styles.top3Rank}>#{i + 1}</Text>
                  <Text style={styles.top3Name}>{item.specialty_fr ?? item.specialty}</Text>
                  <View style={styles.top3Bar}>
                    <View style={[styles.top3Fill, { width: `${Math.round(item.confidence * 100)}%` }]} />
                  </View>
                  <Text style={styles.top3Pct}>{item.confidence_percent ?? `${Math.round(item.confidence * 100)}%`}</Text>
                </View>
              ))}
            </View>
          )}

          {result.doctors?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Médecins disponibles</Text>
              {result.doctors.map((doc, i) => (
                <View key={i} style={styles.doctorRow}>
                  <View style={styles.doctorAvatar}>
                    <Ionicons name="person" size={22} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.doctorName}>Dr. {doc.nom}</Text>
                    <Text style={styles.doctorSpec}>{doc.specialite_fr}</Text>
                    {doc.ville ? <Text style={styles.doctorCity}><Ionicons name="location-outline" size={12} /> {doc.ville}</Text> : null}
                  </View>
                  {doc.note > 0 && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{doc.note.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {result.doctors?.length === 0 && (
            <View style={[styles.card, { alignItems: 'center' }]}>
              <Ionicons name="search-outline" size={32} color="#9CA3AF" />
              <Text style={{ color: '#6B7280', marginTop: 8 }}>Aucun médecin trouvé pour cette spécialité.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Home')}>
            <LinearGradient colors={['#3B82F6','#1D4ED8']} style={styles.primaryGradient} start={{x:0,y:0}} end={{x:1,y:1}}>
              <Text style={styles.primaryBtnText}>Prendre rendez-vous</Text>
              <Ionicons name="calendar-outline" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={reset}>
            <Text style={styles.resetText}>Nouvelle analyse</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            ⚠️ Cette analyse est préliminaire et ne remplace pas un avis médical professionnel.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F8FAFC' },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn:            { padding: 8 },
  headerTitle:        { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  scrollContent:      { paddingBottom: 32 },

  // Hero
  hero:               { margin: 16, borderRadius: 20, padding: 28, alignItems: 'center' },
  heroIcon:           { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  heroTitle:          { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 6, textAlign: 'center' },
  heroSub:            { fontSize: 14, color: '#DBEAFE', textAlign: 'center' },

  // Chips avec icône
  section:            { marginHorizontal: 16, marginBottom: 16 },
  sectionLabel:       { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  chipGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:               { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', minWidth: 90 },
  chipActive:         { borderWidth: 1.5 },
  chipText:           { fontSize: 12, color: '#6B7280', fontWeight: '500', textAlign: 'center' },
  chipTextActive:     { color: '#fff', fontWeight: '600' },

  selectedBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 16 },
  selectedText:       { fontSize: 13, color: '#10B981', fontWeight: '600' },

  primaryBtn:         { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: 'hidden' },
  primaryGradient:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 8 },
  primaryBtnText:     { fontSize: 16, fontWeight: '600', color: '#fff' },

  infoCard:           { backgroundColor: '#EFF6FF', marginHorizontal: 16, padding: 16, borderRadius: 12, marginBottom: 16 },
  infoTitle:          { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  infoText:           { fontSize: 12, color: '#4B5563', marginBottom: 6, lineHeight: 18 },

  // Questionnaire
  questionnaireContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  progressBar:        { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill:       { height: '100%', backgroundColor: '#3B82F6', borderRadius: 4 },
  progressLabel:      { fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginBottom: 20 },

  // Carte question avec IMAGE ou icône
  questionCard:       { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 6, marginBottom: 28 },
  questionImage:      { width: 110, height: 110, borderRadius: 55, marginBottom: 20, alignSelf: 'center' },
  questionIconBig:    { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  questionText:       { fontSize: 18, fontWeight: '700', color: '#1F2937', textAlign: 'center', lineHeight: 28, marginBottom: 16 },

  // Indication Oui/Non
  hintRow:            { flexDirection: 'row', gap: 16, marginTop: 4 },
  hintYes:            { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hintYesText:        { fontSize: 11, color: '#10B981' },
  hintNo:             { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hintNoText:         { fontSize: 11, color: '#EF4444' },

  // Boutons réponse
  answerRow:          { flexDirection: 'row', gap: 16, justifyContent: 'center', width: '100%' },
  answerBtn:          { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 20, borderRadius: 18 },
  answerYes:          { backgroundColor: '#10B981' },
  answerNo:           { backgroundColor: '#EF4444' },
  answerBtnText:      { fontSize: 18, fontWeight: '800', color: '#fff' },

  skipLink:           { alignItems: 'center', marginTop: 20 },
  skipText:           { fontSize: 13, color: '#9CA3AF' },

  // Résultats
  resultHero:         { margin: 16, borderRadius: 20, padding: 28, alignItems: 'center' },
  resultHeroLabel:    { fontSize: 13, color: '#D1FAE5', marginTop: 10, marginBottom: 4 },
  resultSpecialty:    { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12 },
  confidencePill:     { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  confidenceText:     { fontSize: 13, color: '#fff', fontWeight: '600' },
  card:               { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 14, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle:          { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 14 },
  top3Row:            { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  top3Rank:           { fontSize: 13, fontWeight: '700', color: '#3B82F6', width: 24 },
  top3Name:           { fontSize: 13, color: '#374151', flex: 1 },
  top3Bar:            { width: 60, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  top3Fill:           { height: '100%', backgroundColor: '#3B82F6', borderRadius: 3 },
  top3Pct:            { fontSize: 12, color: '#6B7280', width: 36, textAlign: 'right' },
  doctorRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  doctorAvatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  doctorName:         { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  doctorSpec:         { fontSize: 12, color: '#6B7280' },
  doctorCity:         { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  ratingBadge:        { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  ratingText:         { fontSize: 12, fontWeight: '600', color: '#92400E' },
  resetBtn:           { alignItems: 'center', marginVertical: 8 },
  resetText:          { fontSize: 14, color: '#3B82F6', fontWeight: '600' },
  disclaimer:         { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginHorizontal: 16, marginBottom: 8, fontStyle: 'italic' },
});