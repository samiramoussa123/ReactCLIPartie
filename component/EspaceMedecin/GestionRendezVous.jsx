import { useEffect, useState, useContext } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Modal, TextInput,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from "react-native-vector-icons/Ionicons";
import API from "../../api/api";
import { RendezVousCountContext } from "../../App"; 

export default function GestionRendezVous({ navigation }) {
  const { setCount } = useContext(RendezVousCountContext);

  const [rendezvous, setRendezVous]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [idMedecin, setIdMedecin]     = useState(null);

  const [modalVisible, setModalVisible]         = useState(false);
  const [rdvSelectionne, setRdvSelectionne]     = useState(null);
  const [dossierRdv, setDossierRdv]             = useState(null);
  const [consultationExistante, setConsultationExistante] = useState(null);

  const [type, setType]             = useState("presentiel");
  const [diagnostic, setDiagnostic] = useState("");
  const [traitement, setTraitement] = useState("");
  const [saving, setSaving]         = useState(false);
  const [loadingConsult, setLoadingConsult] = useState(false);

  const getPatientName = (rdv) => {
    if (rdv.patient_nom_complet && rdv.patient_nom_complet !== 'Patient inconnu')
      return rdv.patient_nom_complet;
    if (rdv.patient_prenom && rdv.patient_nom)
      return `${rdv.patient_prenom} ${rdv.patient_nom}`;
    if (rdv.patient?.user?.prenom && rdv.patient?.user?.nom)
      return `${rdv.patient.user.prenom} ${rdv.patient.user.nom}`;
    if (rdv.patient?.nom) return rdv.patient.nom;
    return "Patient";
  };

  useEffect(() => { chargerMedecin(); }, []);

  const chargerMedecin = async () => {
    try {
      const response = await API.get("/me");
      const userData = response.data?.user ?? response.data;
      const id = userData?.medecin?.id;
      if (!id) { setLoading(false); return; }
      setIdMedecin(id);
      await chargerRendezVous(id);
    } catch (error) {
      console.error("[GestionRDV]", error.message);
      setLoading(false);
    }
  };

const chargerRendezVous = async (id) => {
  try {
    const response = await API.get(`/rendezvous/medecin/${id}`);
    const rdvList = response.data?.rendez_vous ?? response.data?.data ?? response.data ?? [];
    const list = Array.isArray(rdvList) ? rdvList : [];
    const filteredList = list.filter(rdv => rdv.etat === "en attend" || rdv.etat === "confirmé");
    setRendezVous(filteredList);
    setCount(filteredList.length);
  } catch (error) {
    console.error("[GestionRDV] Chargement:", error.message);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  const changerEtat = async (rdvId, etat) => {
    try {
      await API.patch(`/rendezvous/${rdvId}/medecin/${idMedecin}/etat`, { etat });
      Alert.alert("Succès", `Rendez-vous ${etat}`);
      chargerRendezVous(idMedecin); 
    } catch (error) {
      Alert.alert("Erreur", "Impossible de modifier l'état");
    }
  };

  const ouvrirConsultation = async (rdv) => {
    setRdvSelectionne(rdv);
    setLoadingConsult(true);
    setModalVisible(true);
    setConsultationExistante(null);
    setDossierRdv(null);
    setType("presentiel");
    setDiagnostic("");
    setTraitement("");

    try {
      const resDossier = await API.get(`/dossiers/medecin/${idMedecin}`);
      const dossiers   = resDossier.data?.dossiers ?? [];
      const patientId  = rdv.patient?.id ?? rdv.id_patient;
      const dossier    = dossiers.find(d =>
        d.patient_id === patientId || d.patient?.id === patientId
      );

      if (!dossier) {
        setLoadingConsult(false);
        return;
      }

      setDossierRdv(dossier);

      const resConsult    = await API.get(`/consultations/dossier/${dossier.id}`);
      const consultations = resConsult.data?.consultations ?? [];
      const dateRdv       = rdv.date?.substring(0, 10);
      const consult       = consultations.find(c =>
        c.date_consultation?.substring(0, 10) === dateRdv
      );

      if (consult) {
        setConsultationExistante(consult);
        setType(consult.type ?? "presentiel");
        setDiagnostic(consult.diagnostique ?? "");
        setTraitement(consult.traitement ?? "");
      }
    } catch (e) {
      console.error("[ouvrirConsultation]", e.message);
    } finally {
      setLoadingConsult(false);
    }
  };

  const sauvegarderConsultation = async () => {
    if (!dossierRdv) {
      Alert.alert("Dossier manquant", "Ce patient n'a pas de dossier médical.\nAllez dans 'Dossiers Médicaux' pour en créer un.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        dossier_medical_id: dossierRdv.id,
        date_consultation:  rdvSelectionne.date,
        type,
        diagnostique: diagnostic,
        traitement,
      };

      if (consultationExistante) {
        await API.put(`/consultations/${consultationExistante.id}`, payload);
        Alert.alert("Succès", "Consultation mise à jour ✓");
      } else {
        const res = await API.post("/consultations", payload);
        setConsultationExistante(res.data?.consultation ?? null);
        Alert.alert("Succès", "Consultation créée ✓");
      }

      setModalVisible(false);
      chargerRendezVous(idMedecin);
    } catch (e) {
      Alert.alert("Erreur", e.response?.data?.message ?? e.message);
    } finally {
      setSaving(false);
    }
  };

  const supprimerConsultation = () => {
    if (!consultationExistante) return;
    Alert.alert("Supprimer", "Voulez-vous supprimer cette consultation ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          try {
            await API.delete(`/consultations/${consultationExistante.id}`);
            Alert.alert("Succès", "Consultation supprimée");
            setModalVisible(false);
            chargerRendezVous(idMedecin); 
          } catch (e) {
            Alert.alert("Erreur", "Impossible de supprimer");
          }
        }
      }
    ]);
  };


  const demarrerVideo = async (rdv) => {
    try {
      const resDossier = await API.get(`/dossiers/medecin/${idMedecin}`);
      const dossiers   = resDossier.data?.dossiers ?? [];
      const patientId  = rdv.patient?.id ?? rdv.id_patient;
      const dossier    = dossiers.find(d =>
        d.patient_id === patientId || d.patient?.id === patientId
      );

      if (!dossier) {
        Alert.alert("Erreur", "Aucun dossier médical pour ce patient.\nCréez-en un d'abord.");
        return;
      }

      const resConsult    = await API.get(`/consultations/dossier/${dossier.id}`);
      const consultations = resConsult.data?.consultations ?? [];
      const dateRdv       = rdv.date?.substring(0, 10);

      let consultation = consultations.find(c =>
        c.type === "video" && c.date_consultation?.substring(0, 10) === dateRdv
      );

      if (!consultation) {
        const res = await API.post("/consultations", {
          dossier_medical_id: dossier.id,
          date_consultation:  rdv.date,
          type: "video",
        });
        consultation = res.data?.consultation;
      }

      if (!consultation?.id) {
        Alert.alert("Erreur", "Impossible de créer la consultation vidéo");
        return;
      }

      const userData = await AsyncStorage.getItem("userData");
      const user = userData ? JSON.parse(userData) : {};
      const medecinName = `${user.prenom || "Dr"} ${user.nom || ""}`.trim() || "Médecin";

      navigation.navigate("ConsultationVideo", {
        consultationId: consultation.id,
        role: "medecin",
        userName: medecinName,
        roomId: consultation.room_id || rdv.id 
      });
    } catch (e) {
      Alert.alert("Erreur", e.response?.data?.message ?? "Erreur lors du démarrage vidéo");
    }
  };

  const getEtatColor = (etat) => {
    switch (etat) {
      case "confirmé":  return "#10B981";
      case "refusé":    return "#EF4444";
      case "en attend": return "#F59E0B";
      default:          return "#64748B";
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
     

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); chargerRendezVous(idMedecin); }}
            colors={["#10B981"]}
          />
        }
      >
        {rendezvous.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>Aucun rendez-vous</Text>
          </View>
        ) : (
          rendezvous.map((rdv) => (
            <View key={rdv.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getPatientName(rdv).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientNom}>{getPatientName(rdv)}</Text>
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={13} color="#64748B" />
                    <Text style={styles.dateText}>{rdv.date} à {rdv.heure}</Text>
                  </View>
                </View>
                <View style={[styles.etatBadge, { backgroundColor: getEtatColor(rdv.etat) + "20" }]}>
                  <Text style={[styles.etatText, { color: getEtatColor(rdv.etat) }]}>{rdv.etat}</Text>
                </View>
              </View>

              {rdv.motif && (
                <View style={styles.motifRow}>
                  <Ionicons name="chatbubble-outline" size={13} color="#94A3B8" />
                  <Text style={styles.motifText}>{rdv.motif}</Text>
                </View>
              )}

              <View style={styles.divider} />

              {rdv.etat === "en attend" && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => changerEtat(rdv.id, "confirmé")}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={styles.btnText}>Confirmer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.refuseBtn} onPress={() => changerEtat(rdv.id, "refusé")}>
                    <Ionicons name="close" size={16} color="#FFF" />
                    <Text style={styles.btnText}>Refuser</Text>
                  </TouchableOpacity>
                </View>
              )}

              {rdv.etat === "confirmé" && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.consultBtn} onPress={() => ouvrirConsultation(rdv)}>
                    <Ionicons name="document-text-outline" size={16} color="#FFF" />
                    <Text style={styles.btnText}>Consultation</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.videoBtn} onPress={() => demarrerVideo(rdv)}>
                    <Ionicons name="videocam" size={16} color="#FFF" />
                    <Text style={styles.btnText}>Vidéo</Text>
                  </TouchableOpacity>
                </View>
              )}
            
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {consultationExistante ? "Modifier consultation" : "Nouvelle consultation"}
              </Text>
              <View style={styles.modalHeaderActions}>
                {consultationExistante && (
                  <TouchableOpacity onPress={supprimerConsultation} style={styles.deleteIconBtn}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {rdvSelectionne && (
              <View style={styles.rdvInfo}>
                <Ionicons name="person-outline" size={14} color="#3B82F6" />
                <Text style={styles.rdvInfoText}>
                  {getPatientName(rdvSelectionne)} • {rdvSelectionne.date}
                </Text>
              </View>
            )}

            {loadingConsult ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.modalLoadingText}>Recherche du dossier médical...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {!dossierRdv && (
                  <View style={styles.alertBox}>
                    <Ionicons name="warning-outline" size={18} color="#F59E0B" />
                    <Text style={styles.alertText}>
                      Aucun dossier médical pour ce patient. Créez-en un depuis "Dossiers Médicaux".
                    </Text>
                  </View>
                )}

                {dossierRdv && (
                  <View style={styles.dossierInfo}>
                    <Ionicons name="folder-open-outline" size={14} color="#10B981" />
                    <Text style={styles.dossierInfoText}>Dossier #{dossierRdv.id}</Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>Type de consultation</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[styles.typeBtn, type === "presentiel" && styles.typeBtnActif]}
                    onPress={() => setType("presentiel")}
                  >
                    <Ionicons name="person-outline" size={16} color={type === "presentiel" ? "#FFF" : "#64748B"} />
                    <Text style={[styles.typeBtnText, type === "presentiel" && { color: "#FFF" }]}>Présentiel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, type === "video" && styles.typeBtnActif]}
                    onPress={() => setType("video")}
                  >
                    <Ionicons name="videocam-outline" size={16} color={type === "video" ? "#FFF" : "#64748B"} />
                    <Text style={[styles.typeBtnText, type === "video" && { color: "#FFF" }]}>Vidéo</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Diagnostic</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  placeholder="Entrez le diagnostic médical..."
                  placeholderTextColor="#94A3B8"
                  value={diagnostic}
                  onChangeText={setDiagnostic}
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.inputLabel}>Traitement prescrit</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  placeholder="Médicaments, posologie, recommandations..."
                  placeholderTextColor="#94A3B8"
                  value={traitement}
                  onChangeText={setTraitement}
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, (!dossierRdv || saving) && styles.saveBtnDisabled]}
                    onPress={sauvegarderConsultation}
                    disabled={saving || !dossierRdv}
                  >
                    {saving
                      ? <ActivityIndicator color="#FFF" />
                      : <Text style={styles.saveBtnText}>
                          {consultationExistante ? "Mettre à jour" : "Créer"}
                        </Text>
                    }
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#F8FAFC" },
  center:      { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#64748B", marginTop: 10 },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#10B981", paddingHorizontal: 20,
    paddingTop: 50, paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#FFF" },
  headerBadge: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  headerBadgeText: { color: "#FFF", fontWeight: "700", fontSize: 14 },

  empty:     { alignItems: "center", marginTop: 80, gap: 12 },
  emptyText: { color: "#94A3B8", fontSize: 16 },

  card: {
    backgroundColor: "#FFF", marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, padding: 16, elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06,
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: "#DCFCE7", justifyContent: "center", alignItems: "center" },
  avatarText:  { fontSize: 18, fontWeight: "bold", color: "#10B981" },
  patientNom:  { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  dateRow:     { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  dateText:    { fontSize: 13, color: "#64748B" },
  etatBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  etatText:    { fontSize: 12, fontWeight: "700" },
  motifRow:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  motifText:   { fontSize: 13, color: "#64748B", flex: 1 },
  divider:     { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
deleteBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#EF4444", padding: 10, borderRadius: 10 },
  actionRow:   { flexDirection: "row", gap: 10 },
  confirmBtn:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#10B981", padding: 10, borderRadius: 10 },
  refuseBtn:   { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#EF4444", padding: 10, borderRadius: 10 },
  consultBtn:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#8B5CF6", padding: 10, borderRadius: 10 },
  videoBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#3B82F6", padding: 10, borderRadius: 10 },
  btnText:     { color: "#FFF", fontWeight: "700", fontSize: 13 },

  modalOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox:          { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "92%" },
  modalHeader:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  modalHeaderActions:{ flexDirection: "row", alignItems: "center", gap: 12 },
  modalTitle:        { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
  deleteIconBtn:     { padding: 4 },
  rdvInfo:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EFF6FF", padding: 10, borderRadius: 10, marginBottom: 16 },
  rdvInfoText:   { fontSize: 13, color: "#3B82F6", fontWeight: "600" },
  dossierInfo:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0FDF4", padding: 8, borderRadius: 8, marginBottom: 14 },
  dossierInfoText: { fontSize: 13, color: "#10B981", fontWeight: "600" },
  modalLoading:      { alignItems: "center", paddingVertical: 40, gap: 12 },
  modalLoadingText:  { color: "#64748B" },
  alertBox:  { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 10, padding: 12, marginBottom: 16 },
  alertText: { fontSize: 13, color: "#92400E", flex: 1, lineHeight: 20 },

  typeRow:         { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeBtn:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  typeBtnActif:    { backgroundColor: "#10B981", borderColor: "#10B981" },
  typeBtnText:     { fontSize: 14, fontWeight: "600", color: "#64748B" },

  inputLabel:  { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
  input:       { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, fontSize: 14, color: "#0F172A", marginBottom: 14 },
  inputMulti:  { minHeight: 90, textAlignVertical: "top" },

  modalActions:    { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 20 },
  cancelBtn:       { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center" },
  cancelBtnText:   { color: "#64748B", fontWeight: "600" },
  saveBtn:         { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center" },
  saveBtnDisabled: { backgroundColor: "#CBD5E1" },
  saveBtnText:     { color: "#FFF", fontWeight: "700" },
});