import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from "react-native-linear-gradient";

export default function Symptomes({ navigation }) {
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);

  // Liste des symptômes courants
  const commonSymptoms = [
    'Fièvre', 'Toux', 'Mal de tête', 'Fatigue', 
    'Douleur thoracique', 'Essoufflement', 'Nausées', 
    'Douleur abdominale', 'Courbatures', 'Perte d\'odorat',
    'Mal de gorge', 'Vertiges', 'Frissons', 'Vomissements'
  ];

  const handleSymptomSelect = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleAnalyze = () => {
    const symptomsToAnalyze = symptoms.trim() || selectedSymptoms.join(', ');
    
    if (!symptomsToAnalyze) {
      Alert.alert(
        "Information requise",
        "Veuillez décrire vos symptômes ou en sélectionner dans la liste",
        [{ text: "OK" }]
      );
      return;
    }

    setLoading(true);
    
    // Simulation d'analyse
    setTimeout(() => {
      const simulatedAnalysis = {
        symptoms: symptomsToAnalyze,
        possibleConditions: [
          'Infection virale possible',
          'État grippal',
          'Fatigue générale'
        ],
        severity: 'Modérée',
        recommendations: [
          'Repos et hydratation',
          'Surveiller la température',
          'Consulter si persistance',
          'Éviter l\'automédication'
        ],
        disclaimer: "⚠️ Cette analyse est préliminaire et ne remplace pas un avis médical professionnel.",
        consultDoctor: true
      };
      
      setAnalysis(simulatedAnalysis);
      setLoading(false);
    }, 1500);
  };

  const resetAnalysis = () => {
    setSymptoms('');
    setSelectedSymptoms([]);
    setAnalysis(null);
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'Urgente': return '#EF4444';
      case 'Élevée': return '#F59E0B';
      case 'Modérée': return '#3B82F6';
      default: return '#10B981';
    }
  };

  const getSeverityBgColor = (severity) => {
    switch(severity) {
      case 'Urgente': return '#EF444415';
      case 'Élevée': return '#F59E0B15';
      case 'Modérée': return '#3B82F615';
      default: return '#10B98115';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header avec navigation */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analyse des symptômes</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Section */}
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            style={styles.heroSection}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <Ionicons name="medkit-outline" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>Comment vous sentez-vous ?</Text>
              <Text style={styles.heroDescription}>
                Décrivez vos symptômes pour obtenir une analyse préliminaire
              </Text>
            </View>
          </LinearGradient>

          {/* Formulaire symptômes */}
          <View style={styles.formContainer}>
            <Text style={styles.label}>Décrivez vos symptômes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ex: J'ai de la fièvre, mal à la tête et je me sens fatigué..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={symptoms}
              onChangeText={setSymptoms}
            />
          </View>

          {/* Symptômes courants */}
          <View style={styles.commonSymptomsContainer}>
            <Text style={styles.label}>Symptômes courants</Text>
            <View style={styles.symptomsGrid}>
              {commonSymptoms.map((symptom, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.symptomChip,
                    selectedSymptoms.includes(symptom) && styles.symptomChipActive
                  ]}
                  onPress={() => handleSymptomSelect(symptom)}
                >
                  <Text style={[
                    styles.symptomChipText,
                    selectedSymptoms.includes(symptom) && styles.symptomChipTextActive
                  ]}>
                    {symptom}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bouton analyser */}
          <TouchableOpacity 
            style={styles.analyzeButton}
            onPress={handleAnalyze}
            disabled={loading}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.analyzeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.analyzeButtonText}>Analyser mes symptômes</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Résultats de l'analyse */}
          {analysis && (
            <View style={styles.resultContainer}>
              <View style={styles.resultHeader}>
                <Ionicons name="analytics-outline" size={24} color="#3B82F6" />
                <Text style={styles.resultTitle}>Résultat de l'analyse</Text>
              </View>

              <View style={styles.resultCard}>
                <Text style={styles.resultSubtitle}>Symptômes détectés :</Text>
                <Text style={styles.resultText}>{analysis.symptoms}</Text>
              </View>

              <View style={styles.resultCard}>
                <Text style={styles.resultSubtitle}>Possibilités :</Text>
                {analysis.possibleConditions.map((condition, index) => (
                  <View key={index} style={styles.conditionItem}>
                    <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
                    <Text style={styles.conditionText}>• {condition}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.resultCard}>
                <Text style={styles.resultSubtitle}>Niveau de sévérité :</Text>
                <View style={[
                  styles.severityBadge,
                  { backgroundColor: getSeverityBgColor(analysis.severity) }
                ]}>
                  <Text style={[styles.severityText, { color: getSeverityColor(analysis.severity) }]}>
                    {analysis.severity}
                  </Text>
                </View>
              </View>

              <View style={styles.resultCard}>
                <Text style={styles.resultSubtitle}>Recommandations :</Text>
                {analysis.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>

              {analysis.consultDoctor && (
                <View style={styles.consultCard}>
                  <Ionicons name="warning-outline" size={24} color="#EF4444" />
                  <Text style={styles.consultText}>
                    Nous vous recommandons de consulter un médecin.
                  </Text>
                  <TouchableOpacity 
                    style={styles.bookButton}
                    onPress={() => navigation.navigate("Home")}
                  >
                    <Text style={styles.bookButtonText}>Prendre rendez-vous</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.disclaimer}>
                {analysis.disclaimer}
              </Text>

              <TouchableOpacity 
                style={styles.resetButton}
                onPress={resetAnalysis}
              >
                <Text style={styles.resetButtonText}>Nouvelle analyse</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Informations supplémentaires */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
              <Text style={styles.infoTitle}>À savoir</Text>
            </View>
            <Text style={styles.infoText}>
              • Cette analyse est basée sur les informations que vous fournissez et ne constitue pas un diagnostic médical.
            </Text>
            <Text style={styles.infoText}>
              • En cas d'urgence (douleur thoracique, difficulté respiratoire, perte de conscience), appelez immédiatement le 198.
            </Text>
            <Text style={styles.infoText}>
              • Consultez toujours un professionnel de santé pour un diagnostic précis et un traitement adapté.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    margin: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  heroContent: {
    padding: 24,
    alignItems: "center",
  },
  heroIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  heroDescription: {
    fontSize: 14,
    color: "#EFF6FF",
    textAlign: "center",
    opacity: 0.9,
  },
  formContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#1F2937",
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 100,
  },
  commonSymptomsContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  symptomsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  symptomChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  symptomChipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  symptomChipText: {
    fontSize: 13,
    color: "#6B7280",
  },
  symptomChipTextActive: {
    color: "#FFFFFF",
  },
  analyzeButton: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  analyzeGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  resultContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resultSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  conditionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  conditionText: {
    fontSize: 14,
    color: "#4B5563",
    flex: 1,
  },
  severityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 13,
    fontWeight: "600",
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 14,
    color: "#4B5563",
    flex: 1,
  },
  consultCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  consultText: {
    fontSize: 14,
    color: "#92400E",
    textAlign: "center",
    marginVertical: 8,
  },
  bookButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  disclaimer: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  resetButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: "#EFF6FF",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  infoText: {
    fontSize: 12,
    color: "#4B5563",
    marginBottom: 8,
    lineHeight: 18,
  },
});