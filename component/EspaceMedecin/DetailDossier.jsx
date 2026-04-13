import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Modal, TextInput,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import API from "../../api/api";
import DateInput from "../common/DateInput"; 

export default function DetailDossier({ route, navigation }) {
  const { dossier: initialDossier, idMedecin } = route.params;

  const [dossier, setDossier]       = useState(initialDossier);
  const [maladies, setMaladies]     = useState([]);
  const [consultations, setConsultations] = useState(initialDossier.consultations ?? []);
  const [patientInfo, setPatientInfo]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onglet, setOnglet]         = useState("maladies");

  // Modal maladie
  const [modalMaladie, setModalMaladie] = useState(false);
  const [editMaladie, setEditMaladie]   = useState(null);
  const [nomMaladie, setNomMaladie]     = useState("");
  const [dateDiag, setDateDiag]         = useState("");
  const [saving, setSaving]             = useState(false);

  useEffect(() => { chargerTout(); }, []);

  const chargerTout = async () => {
    await Promise.all([
      chargerMaladies(),
      chargerConsultations(),
      chargerPatientInfo(),
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  // ── Charger maladies ──
  const chargerMaladies = async () => {
    try {
      const res = await API.get(`/maladies/dossier/${initialDossier.id}`);
      setMaladies(res.data?.maladies ?? []);
    } catch (e) {
      if (e.response?.status !== 404) console.error("maladies:", e.message);
      setMaladies([]);
    }
  };

  // ── Charger consultations ──
  const chargerConsultations = async () => {
    try {
      const res = await API.get(`/consultations/dossier/${initialDossier.id}`);
      setConsultations(res.data?.consultations ?? []);
    } catch (e) {
      if (e.response?.status !== 404) console.error("consultations:", e.message);
      setConsultations([]);
    }
  };

  // ── Charger infos patient (nom, prénom) ──
  const chargerPatientInfo = async () => {
    const u = initialDossier.patient?.user;
    if (u?.nom || u?.prenom) {
      setPatientInfo(u);
      return;
    }
    try {
      const medecinId = initialDossier.medecin_id ?? idMedecin;
      if (!medecinId) return;
      const res      = await API.get(`/dossiers/medecin/${medecinId}/patient`); // vérifier l'endpoint
      const patients = res.data?.patients ?? [];
      const patientId = initialDossier.patient_id ?? initialDossier.patient?.id;
      const found    = patients.find(p => p.patient_id === patientId);
      if (found) {
        setPatientInfo({ nom: found.nom, prenom: found.prenom, email: found.email });
      }
    } catch (e) {
      console.error("patientInfo:", e.message);
    }
  };

  // ── Nom patient ──
  const patientNom = (() => {
    const prenom = patientInfo?.prenom ?? dossier.patient?.user?.prenom ?? "";
    const nom    = patientInfo?.nom    ?? dossier.patient?.user?.nom    ?? dossier.patient?.nom ?? "";
    return `${prenom} ${nom}`.trim() || `Patient #${dossier.patient_id ?? dossier.patient?.id ?? ""}`;
  })();

  // ── Modal maladie ──
  const ouvrirModalMaladie = (maladie = null) => {
    setEditMaladie(maladie);
    setNomMaladie(maladie?.nom_maladie ?? "");
    setDateDiag(maladie?.date_diagnostic?.substring(0, 10) ?? "");
    setModalMaladie(true);
  };

  const sauvegarderMaladie = async () => {
    if (!nomMaladie.trim()) { Alert.alert("Erreur", "Nom de la maladie requis"); return; }
    if (!dateDiag.trim())   { Alert.alert("Erreur", "Date de diagnostic requise (YYYY-MM-DD)"); return; }

    setSaving(true);
    try {
      const payload = {
        dossier_medical_id: dossier.id,
        nom_maladie:        nomMaladie.trim(),
        date_diagnostic:    dateDiag,
      };

      if (editMaladie) {
        await API.put(`/maladies/${editMaladie.id}`, payload);
      } else {
        await API.post("/maladies", payload);
      }

      setModalMaladie(false);
      await chargerMaladies();
      Alert.alert("Succès", editMaladie ? "Maladie modifiée ✓" : "Maladie ajoutée ✓");
    } catch (e) {
      Alert.alert("Erreur", e.response?.data?.message ?? "Impossible de sauvegarder");
    } finally {
      setSaving(false);
    }
  };

  const supprimerMaladie = (id) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer cette maladie ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          try {
            await API.delete(`/maladies/${id}`);
            await chargerMaladies();
          } catch {
            Alert.alert("Erreur", "Impossible de supprimer");
          }
        }
      }
    ]);
  };

  // Affichage
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{patientNom}</Text>
          <Text style={styles.headerSub}>Dossier #{dossier.id}</Text>
        </View>
      </View>

      {/* Carte patient */}
      <View style={styles.patientCard}>
        <View style={styles.patientAvatar}>
          <Text style={styles.patientAvatarText}>
            {patientNom[0]?.toUpperCase() ?? "P"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.patientNom}>{patientNom}</Text>
          <View style={styles.patientDetails}>
            {(dossier.patient?.sexe ?? initialDossier.patient?.sexe) && (
              <View style={styles.detailBadge}>
                <Ionicons name="person-outline" size={12} color="#64748B" />
                <Text style={styles.detailText}>
                  {dossier.patient?.sexe ?? initialDossier.patient?.sexe}
                </Text>
              </View>
            )}
            {(dossier.patient?.dateNaissance ?? initialDossier.patient?.dateNaissance) && (
              <View style={styles.detailBadge}>
                <Ionicons name="calendar-outline" size={12} color="#64748B" />
                <Text style={styles.detailText}>
                  {new Date(dossier.patient?.dateNaissance ?? initialDossier.patient?.dateNaissance).toLocaleDateString("fr-FR")}
                </Text>
              </View>
            )}
            {(patientInfo?.email) && (
              <View style={styles.detailBadge}>
                <Ionicons name="mail-outline" size={12} color="#64748B" />
                <Text style={styles.detailText}>{patientInfo.email}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{maladies.length}</Text>
          <Text style={styles.statLabel}>Maladies</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{consultations.length}</Text>
          <Text style={styles.statLabel}>Consultations</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{new Date(dossier.created_at).getFullYear()}</Text>
          <Text style={styles.statLabel}>Depuis</Text>
        </View>
      </View>

      {/* Onglets */}
      <View style={styles.onglets}>
        <TouchableOpacity
          style={[styles.onglet, onglet === "maladies" && styles.ongletActif]}
          onPress={() => setOnglet("maladies")}
        >
          <Ionicons name="medical-outline" size={16} color={onglet === "maladies" ? "#FFF" : "#64748B"} />
          <Text style={[styles.ongletText, onglet === "maladies" && styles.ongletTextActif]}>
            Maladies ({maladies.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.onglet, onglet === "consultations" && styles.ongletActif]}
          onPress={() => setOnglet("consultations")}
        >
          <Ionicons name="document-text-outline" size={16} color={onglet === "consultations" ? "#FFF" : "#64748B"} />
          <Text style={[styles.ongletText, onglet === "consultations" && styles.ongletTextActif]}>
            Consultations ({consultations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu principal */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); chargerTout(); }}
            colors={["#10B981"]}
          />
        }
      >
        {onglet === "maladies" && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.addBtn} onPress={() => ouvrirModalMaladie()}>
              <Ionicons name="add-circle-outline" size={20} color="#10B981" />
              <Text style={styles.addBtnText}>Ajouter une maladie</Text>
            </TouchableOpacity>

            {maladies.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="medical-outline" size={50} color="#CBD5E1" />
                <Text style={styles.emptyText}>Aucune maladie enregistrée</Text>
              </View>
            ) : (
              maladies.map((m) => (
                <View key={m.id} style={styles.maladieCard}>
                  <View style={styles.maladieLeft}>
                    <View style={styles.maladieIcon}>
                      <Ionicons name="medical" size={18} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.maladieNom}>{m.nom_maladie}</Text>
                      <Text style={styles.maladieDate}>
                        Diagnostiqué le {new Date(m.date_diagnostic).toLocaleDateString("fr-FR")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.maladieActions}>
                    <TouchableOpacity onPress={() => ouvrirModalMaladie(m)}>
                      <Ionicons name="pencil-outline" size={20} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => supprimerMaladie(m.id)} style={{ marginTop: 8 }}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {onglet === "consultations" && (
          <View style={styles.section}>
            {consultations.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="document-text-outline" size={50} color="#CBD5E1" />
                <Text style={styles.emptyText}>Aucune consultation</Text>
                <Text style={styles.emptySubText}>
                  Les consultations apparaissent après un rendez-vous confirmé
                </Text>
              </View>
            ) : (
              consultations.map((c) => (
                <View key={c.id} style={styles.consultCard}>
                  <View style={styles.consultHeader}>
                    <View style={[
                      styles.typeBadge,
                      { backgroundColor: c.type === "video" ? "#EFF6FF" : "#F0FDF4" }
                    ]}>
                      <Ionicons
                        name={c.type === "video" ? "videocam-outline" : "person-outline"}
                        size={14}
                        color={c.type === "video" ? "#3B82F6" : "#10B981"}
                      />
                      <Text style={[
                        styles.typeText,
                        { color: c.type === "video" ? "#3B82F6" : "#10B981" }
                      ]}>
                        {c.type === "video" ? "Vidéo" : "Présentiel"}
                      </Text>
                    </View>
                    <Text style={styles.consultDate}>
                      {new Date(c.date_consultation).toLocaleDateString("fr-FR")}
                    </Text>
                  </View>

                  {c.diagnostique ? (
                    <View style={styles.consultSection}>
                      <View style={styles.consultSectionHeader}>
                        <Ionicons name="clipboard-outline" size={14} color="#8B5CF6" />
                        <Text style={styles.consultLabel}>Diagnostic</Text>
                      </View>
                      <Text style={styles.consultValue}>{c.diagnostique}</Text>
                    </View>
                  ) : (
                    <View style={styles.consultSection}>
                      <Text style={styles.consultEmpty}>Aucun diagnostic enregistré</Text>
                    </View>
                  )}

                  {c.traitement ? (
                    <View style={styles.consultSection}>
                      <View style={styles.consultSectionHeader}>
                        <Ionicons name="fitness-outline" size={14} color="#10B981" />
                        <Text style={styles.consultLabel}>Traitement</Text>
                      </View>
                      <Text style={styles.consultValue}>{c.traitement}</Text>
                    </View>
                  ) : (
                    <View style={styles.consultSection}>
                      <Text style={styles.consultEmpty}>Aucun traitement enregistré</Text>
                    </View>
                  )}

                  {c.type === "video" && c.statut_video && (
                    <View style={styles.statutBadge}>
                      <Text style={styles.statutText}>
                        {c.statut_video === "terminee" ? "✓ Terminée" :
                         c.statut_video === "en_cours" ? "🔴 En cours" : "⏳ En attente"}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal d’ajout/édition maladie */}
      <Modal visible={modalMaladie} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editMaladie ? "Modifier la maladie" : "Ajouter une maladie"}
              </Text>
              <TouchableOpacity onPress={() => setModalMaladie(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nom de la maladie</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Diabète, Hypertension, Asthme..."
              placeholderTextColor="#94A3B8"
              value={nomMaladie}
              onChangeText={setNomMaladie}
            />

            <Text style={styles.inputLabel}>Date de diagnostic</Text>
            {/* Si le composant DateInput n’existe pas, remplacez-le par un TextInput normal */}
            <DateInput
              value={dateDiag}
              onChange={(date) => setDateDiag(date)}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalMaladie(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={sauvegarderMaladie}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.saveBtnText}>Sauvegarder</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#F8FAFC" },
  center:     { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#10B981", paddingHorizontal: 16,
    paddingTop: 50, paddingBottom: 16,
  },
  backBtn:     { padding: 4 },
  headerInfo:  { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#FFF" },
  headerSub:   { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  // Patient card
  patientCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#FFF", margin: 16, padding: 16,
    borderRadius: 14, elevation: 2,
  },
  patientAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#DCFCE7", justifyContent: "center", alignItems: "center",
  },
  patientAvatarText: { fontSize: 22, fontWeight: "bold", color: "#10B981" },
  patientNom:        { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 6 },
  patientDetails:    { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  detailBadge:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  detailText:        { fontSize: 11, color: "#64748B" },

  // Stats
  statsRow:  { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, gap: 10 },
  statCard:  { flex: 1, backgroundColor: "#FFF", borderRadius: 12, padding: 12, alignItems: "center", elevation: 1 },
  statNum:   { fontSize: 20, fontWeight: "bold", color: "#0F172A" },
  statLabel: { fontSize: 11, color: "#64748B", marginTop: 2 },

  // Onglets
  onglets:     { flexDirection: "row", marginHorizontal: 16, marginBottom: 8, backgroundColor: "#E2E8F0", borderRadius: 12, padding: 4 },
  onglet:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  ongletActif: { backgroundColor: "#10B981" },
  ongletText:  { fontSize: 13, fontWeight: "600", color: "#64748B" },
  ongletTextActif: { color: "#FFF" },

  section:      { padding: 16 },
  empty:        { alignItems: "center", marginTop: 40, gap: 8 },
  emptyText:    { color: "#94A3B8", fontSize: 15 },
  emptySubText: { color: "#CBD5E1", fontSize: 13, textAlign: "center" },

  addBtn:     { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#F0FDF4", borderRadius: 10, borderWidth: 1, borderColor: "#10B981", marginBottom: 16 },
  addBtnText: { color: "#10B981", fontWeight: "600" },

  // Maladie
  maladieCard:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFF", borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  maladieLeft:    { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  maladieIcon:    { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FEF2F2", justifyContent: "center", alignItems: "center" },
  maladieNom:     { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  maladieDate:    { fontSize: 12, color: "#64748B", marginTop: 2 },
  maladieActions: { alignItems: "center" },

  // Consultation
  consultCard:   { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  consultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  typeBadge:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeText:      { fontSize: 12, fontWeight: "600" },
  consultDate:   { fontSize: 12, color: "#64748B" },
  consultSection:{ backgroundColor: "#F8FAFC", borderRadius: 8, padding: 10, marginBottom: 8 },
  consultSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  consultLabel:  { fontSize: 12, fontWeight: "700", color: "#475569" },
  consultValue:  { fontSize: 13, color: "#334155", lineHeight: 20 },
  consultEmpty:  { fontSize: 12, color: "#CBD5E1", fontStyle: "italic" },
  statutBadge:   { alignSelf: "flex-start", backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  statutText:    { fontSize: 12, color: "#64748B" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox:     { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle:   { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
  inputLabel:   { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
  input:        { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, fontSize: 14, color: "#0F172A", marginBottom: 14 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center" },
  cancelBtnText:{ color: "#64748B", fontWeight: "600" },
  saveBtn:      { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center" },
  saveBtnText:  { color: "#FFF", fontWeight: "700" },
});