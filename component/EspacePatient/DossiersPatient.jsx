import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from "../../api/api";

export default function DossiersPatient({ navigation }) {
  const [dossiers, setDossiers]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [idPatient, setIdPatient]   = useState(null);

  useEffect(() => { chargerPatient(); }, []);

  const chargerPatient = async () => {
    try {
      const res  = await API.get("/me");
      const user = res.data?.user ?? res.data;
      const id   = user?.patient?.id;
      if (!id) return;
      setIdPatient(id);
      await chargerDossiers(id);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const chargerDossiers = async (id) => {
    try {
      const res  = await API.get(`/dossiers/patient/${id}`);
      const list = res.data?.dossiers ?? [];
      setDossiers(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e.response?.status !== 404) console.error(e.message);
      setDossiers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Dossier Médical</Text>
        <Ionicons name="medical" size={24} color="#FFF" />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); chargerDossiers(idPatient); }}
            colors={["#3B82F6"]}
          />
        }
      >
        {dossiers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={70} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Aucun dossier médical</Text>
            <Text style={styles.emptyText}>Votre médecin créera votre dossier après votre première consultation</Text>
          </View>
        ) : (
          dossiers.map((d) => (
            <View key={d.id} style={styles.dossierCard}>
              {/* Info médecin */}
              <View style={styles.medecinRow}>
                <View style={styles.medecinAvatar}>
                  <Ionicons name="person" size={22} color="#3B82F6" />
                </View>
                <View>
                  <Text style={styles.medecinNom}>
                    Dr. {d.medecin?.user?.prenom ?? ""} {d.medecin?.user?.nom ?? "Médecin"}
                  </Text>
                  <Text style={styles.medecinSpec}>
                    {d.medecin?.specialite?.nom_specialite ?? "Médecin généraliste"}
                  </Text>
                </View>
              </View>

              <View style={styles.separator} />

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="medical-outline" size={20} color="#EF4444" />
                  <Text style={styles.statNum}>{d.maladies?.length ?? 0}</Text>
                  <Text style={styles.statLabel}>Maladies</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="document-text-outline" size={20} color="#10B981" />
                  <Text style={styles.statNum}>{d.consultations?.length ?? 0}</Text>
                  <Text style={styles.statLabel}>Consultations</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
                  <Text style={styles.statNum}>{new Date(d.created_at).getFullYear()}</Text>
                  <Text style={styles.statLabel}>Depuis</Text>
                </View>
              </View>

              <View style={styles.separator} />

              {/* Maladies */}
              {d.maladies?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="medical" size={14} color="#EF4444" /> Antécédents médicaux
                  </Text>
                  {d.maladies.map((m) => (
                    <View key={m.id} style={styles.maladieRow}>
                      <View style={styles.maladieDot} />
                      <View>
                        <Text style={styles.maladieNom}>{m.nom_maladie}</Text>
                        <Text style={styles.maladieDate}>
                          {new Date(m.date_diagnostic).toLocaleDateString("fr-FR")}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Consultations */}
              {d.consultations?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="document-text" size={14} color="#10B981" /> Dernières consultations
                  </Text>
                  {d.consultations.slice(0, 3).map((c) => (
                    <View key={c.id} style={styles.consultRow}>
                      <View style={[
                        styles.consultType,
                        { backgroundColor: c.type === "video" ? "#EFF6FF" : "#F0FDF4" }
                      ]}>
                        <Ionicons
                          name={c.type === "video" ? "videocam-outline" : "person-outline"}
                          size={14}
                          color={c.type === "video" ? "#3B82F6" : "#10B981"}
                        />
                        <Text style={[
                          styles.consultTypeText,
                          { color: c.type === "video" ? "#3B82F6" : "#10B981" }
                        ]}>
                          {c.type === "video" ? "Vidéo" : "Présentiel"}
                        </Text>
                      </View>
                      <Text style={styles.consultDate}>
                        {new Date(c.date_consultation).toLocaleDateString("fr-FR")}
                      </Text>
                    </View>
                  ))}
                  {d.consultations.length > 3 && (
                    <Text style={styles.voirPlus}>+{d.consultations.length - 3} autres consultations</Text>
                  )}
                </View>
              )}

              <Text style={styles.dossierDate}>
                Dossier créé le {new Date(d.created_at).toLocaleDateString("fr-FR")}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#F8FAFC" },
  center:     { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#3B82F6", paddingHorizontal: 20,
    paddingTop: 50, paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#FFF" },

  empty:      { alignItems: "center", marginTop: 100, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#334155" },
  emptyText:  { fontSize: 14, color: "#94A3B8", textAlign: "center", lineHeight: 22 },

  dossierCard: {
    backgroundColor: "#FFF", margin: 16, borderRadius: 16,
    padding: 20, elevation: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08,
  },
  medecinRow:   { flexDirection: "row", alignItems: "center", gap: 14 },
  medecinAvatar:{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center" },
  medecinNom:   { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  medecinSpec:  { fontSize: 13, color: "#64748B", marginTop: 2 },

  separator:  { height: 1, backgroundColor: "#F1F5F9", marginVertical: 16 },

  statsRow:   { flexDirection: "row", justifyContent: "space-around" },
  statItem:   { alignItems: "center", gap: 4 },
  statNum:    { fontSize: 20, fontWeight: "bold", color: "#0F172A" },
  statLabel:  { fontSize: 11, color: "#64748B" },

  section:      { marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 10 },

  maladieRow:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  maladieDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  maladieNom:  { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  maladieDate: { fontSize: 12, color: "#64748B" },

  consultRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  consultType:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  consultTypeText:{ fontSize: 12, fontWeight: "600" },
  consultDate:    { fontSize: 12, color: "#64748B" },
  voirPlus:       { fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 4 },

  dossierDate: { fontSize: 11, color: "#CBD5E1", textAlign: "right", marginTop: 8 },
});