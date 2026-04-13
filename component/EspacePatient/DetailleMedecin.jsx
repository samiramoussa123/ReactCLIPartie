import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function DetailleMedecin({ route, navigation }) {
  const medecin = route.params?.medecin || {};

  if (!medecin || Object.keys(medecin).length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>Médecin non trouvé</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    id,         
    medecin_id,  
    nom = "",
    prenom = "",
    nomComplet,
    specialite = "Médecin généraliste",
    email = "",
    telephone = "",
    adresse = "",
    experience = 0,
  } = medecin;

  const displayName = nomComplet || `Dr. ${prenom} ${nom}`.trim() || "Médecin";

  const handlePrendreRDV = () => {
    const rdvMedecinId = medecin_id || id;

    if (!rdvMedecinId) {
      Alert.alert("Erreur", "Impossible d'identifier le médecin");
      return;
    }

    console.log("Navigation RDV → medecin_id:", rdvMedecinId, "user_id:", id);

    navigation.navigate("Main", {
  screen: "RendezVous",
  params: {
    idMedecin:     rdvMedecinId,
    nomMedecin:    displayName,
    specialite:    specialite,
    ongletInitial: "calendrier",
  },
});
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {prenom ? prenom[0] : nom ? nom[0] : 'M'}
            </Text>
          </View>
        </View>
        <Text style={styles.nom}>{displayName}</Text>
        <Text style={styles.specialite}>{specialite}</Text>
        {experience > 0 && (
          <View style={styles.experienceBadge}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.experienceText}>{experience} ans d'expérience</Text>
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Informations de contact</Text>
        {telephone ? (
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}><Ionicons name="call-outline" size={20} color="#3B82F6" /></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{telephone}</Text>
            </View>
          </View>
        ) : null}
        {email ? (
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}><Ionicons name="mail-outline" size={20} color="#3B82F6" /></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
          </View>
        ) : null}
        {adresse ? (
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}><Ionicons name="location-outline" size={20} color="#3B82F6" /></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Adresse</Text>
              <Text style={styles.infoValue}>{adresse}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.rdvButton} onPress={handlePrendreRDV}>
        <Ionicons name="calendar" size={20} color="#FFFFFF" />
        <Text style={styles.rdvButtonText}>Prendre rendez-vous</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={20} color="#3B82F6" />
        <Text style={styles.backButtonText}>Retour à la liste</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC", padding: 20 },
  errorText: { fontSize: 18, color: "#64748B", marginTop: 12, marginBottom: 20 },
  header: { backgroundColor: "#3B82F6", paddingTop: 30, paddingBottom: 30, alignItems: "center", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarContainer: { marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#FFFFFF" },
  avatarText: { color: "#FFFFFF", fontSize: 40, fontWeight: "600" },
  nom: { fontSize: 24, fontWeight: "700", color: "#FFFFFF", marginBottom: 8, textAlign: "center", paddingHorizontal: 20 },
  specialite: { fontSize: 16, color: "#EFF6FF", marginBottom: 12 },
  experienceBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  experienceText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, margin: 20, shadowColor: "#1E293B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#0F172A", marginBottom: 16 },
  infoRow: { flexDirection: "row", marginBottom: 16 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  infoContent: { flex: 1, justifyContent: "center" },
  infoLabel: { fontSize: 12, color: "#64748B", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 16, color: "#0F172A", fontWeight: "500" },
  rdvButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#3B82F6", marginHorizontal: 20, paddingVertical: 16, borderRadius: 16, gap: 8, shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  rdvButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  backButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: 20, marginTop: 12, marginBottom: 30, paddingVertical: 12, gap: 8 },
  backButtonText: { color: "#3B82F6", fontSize: 14, fontWeight: "500" },
});