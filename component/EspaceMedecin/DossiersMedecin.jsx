import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, TextInput, Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import API from "../../api/api";

export default function DossiersMedecin({ navigation }) {
  const [dossiers, setDossiers]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [idMedecin, setIdMedecin]         = useState(null);
  const [search, setSearch]               = useState("");

  const [modalVisible, setModalVisible]   = useState(false);
  const [patients, setPatients]           = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving]               = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => { chargerMedecin(); }, []);

  const chargerMedecin = async () => {
    try {
      const res  = await API.get("/me");
      const user = res.data?.user ?? res.data;
      const id   = user?.medecin?.id;
      
      if (!id) return;
      setIdMedecin(id);
      await chargerDossiers(id);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const chargerDossiers = async (id) => {
    try {
      const res  = await API.get(`/dossiers/medecin/${id}`);
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

 
  const chargerPatients = async () => {
    setLoadingPatients(true);
    try {
      //  RDV de ce médecin → pour collecter les patients
      const resRdv  = await API.get(`/rendezvous/medecin/${idMedecin}`);
      const rdvList = resRdv.data?.rendez_vous ?? resRdv.data?.data ?? resRdv.data ?? [];

      //  IDs patients qui ont déjà un dossier (pour les exclure)
      let dossierPatientIds = [];
      try {
        const resDossiers  = await API.get(`/dossiers/medecin/${idMedecin}`);
        const dossiersListe = resDossiers.data?.dossiers ?? [];
        dossierPatientIds  = dossiersListe.map((d) => d.patient_id ?? d.patient?.id);
      } catch (_) {}

      //  Construire la map des patients sans dossier
      const patientsMap = {};
      rdvList.forEach((rdv) => {
        const p = rdv.patient;
        if (!p) return;
        const patientId = p.id;
        if (!dossierPatientIds.includes(patientId) && !patientsMap[patientId]) {
          patientsMap[patientId] = {
            ...p,
            _nom:    p?.user?.nom    ?? p?.nom    ?? null,
            _prenom: p?.user?.prenom ?? p?.prenom ?? null,
            _email:  p?.user?.email  ?? p?.email  ?? null,
          };
        }
      });

      //  Enrichir avec /dossiers/medecin/{id}/patient (un seul appel)
      let patientsAvecNom = {};
      try {
        const resPat = await API.get(`/dossiers/medecin/${idMedecin}/patient`);
        const pList  = resPat.data?.patients ?? [];
        pList.forEach((p) => { patientsAvecNom[p.patient_id] = p; });
      } catch (_) {}

      const listeEnrichie = Object.values(patientsMap).map((p) => {
        const info = patientsAvecNom[p.id];
        return {
          ...p,
          _nom:    info?.nom    ?? p._nom    ?? null,
          _prenom: info?.prenom ?? p._prenom ?? null,
          _email:  info?.email  ?? p._email  ?? null,
        };
      });

      setPatients(listeEnrichie);
    } catch (e) {
      console.error("chargerPatients:", e.message);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  const ouvrirModal = async () => {
    setSelectedPatient(null);
    setModalVisible(true);
    await chargerPatients();
  };

  const ajouterDossier = async () => {
    if (!selectedPatient) {
      Alert.alert("Erreur", "Veuillez sélectionner un patient");
      return;
    }
    const patientId = selectedPatient?.id ?? null;
    if (!patientId) {
      Alert.alert("Erreur", "ID patient introuvable");
      return;
    }

    setSaving(true);
    try {
      await API.post("/dossiers", { patient_id: patientId, medecin_id: idMedecin });
      Alert.alert("Succès", "Dossier créé avec succès ✓");
      setModalVisible(false);
      chargerDossiers(idMedecin);
    } catch (e) {
      if (e.response?.status === 409) {
        Alert.alert("Info", "Ce patient a déjà un dossier médical");
      } else {
        Alert.alert("Erreur", e.response?.data?.message ?? "Impossible de créer le dossier");
      }
    } finally {
      setSaving(false);
    }
  };

  const supprimerDossier = (id) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer ce dossier ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          try {
            await API.delete(`/dossiers/${id}`);
            chargerDossiers(idMedecin);
          } catch {
            Alert.alert("Erreur", "Impossible de supprimer");
          }
        },
      },
    ]);
  };

  const getNomPatient = (p) => {
    const prenom = p?._prenom ?? p?.user?.prenom ?? "";
    const nom    = p?._nom    ?? p?.user?.nom    ?? "";
    if (prenom || nom) return `${prenom} ${nom}`.trim();
    return `Patient #${p?.id ?? "?"}`;
  };

  const getEmailPatient = (p) => p?._email ?? p?.user?.email ?? null;

  const dossiersFiltres = dossiers.filter((d) => {
    const nom    = d.patient?.user?.nom    ?? d.patient?.nom    ?? "";
    const prenom = d.patient?.user?.prenom ?? d.patient?.prenom ?? "";
    return (nom + " " + prenom).toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

   const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('ProfilMedecin');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
         <TouchableOpacity onPress={goBack} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
        <Text style={styles.headerTitle}>Dossiers Médicaux</Text>
        <TouchableOpacity style={styles.addBtn} onPress={ouvrirModal}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Recherche */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un patient..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Liste dossiers */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); chargerDossiers(idMedecin); }}
            colors={["#10B981"]}
          />
        }
      >
        {dossiersFiltres.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>Aucun dossier médical</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={ouvrirModal}>
              <Text style={styles.emptyBtnText}>Créer un dossier</Text>
            </TouchableOpacity>
          </View>
        ) : (
          dossiersFiltres.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={styles.card}
              onPress={() => navigation.navigate("DetailDossier", { dossier: d, idMedecin })}
            >
              <View style={styles.cardLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(d.patient?.user?.prenom ?? d.patient?.prenom ?? "P")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName}>
                    {d.patient?.user?.prenom ?? ""}{" "}
                    {d.patient?.user?.nom ?? d.patient?.nom ?? `Patient #${d.patient_id}`}
                  </Text>
                  <Text style={styles.patientInfo}>
                    {d.maladies?.length ?? 0} maladie(s) · {d.consultations?.length ?? 0} consultation(s)
                  </Text>
                  <Text style={styles.dateText}>
                    Créé le {new Date(d.created_at).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("DetailDossier", { dossier: d, idMedecin })}
                >
                  <Ionicons name="eye-outline" size={22} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => supprimerDossier(d.id)} style={{ marginTop: 8 }}>
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modal — Nouveau dossier */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau dossier médical</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Patients avec RDV sans dossier :</Text>

            {loadingPatients ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.modalLoadingText}>Chargement des patients...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {patients.length === 0 ? (
                  <View style={styles.noPatientsBox}>
                    <Ionicons name="people-outline" size={40} color="#CBD5E1" />
                    <Text style={styles.noPatients}>Tous vos patients ont déjà un dossier</Text>
                  </View>
                ) : (
                  patients.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.patientItem, selectedPatient?.id === p.id && styles.patientItemSelected]}
                      onPress={() => setSelectedPatient(p)}
                    >
                      <View style={[styles.radioCircle, selectedPatient?.id === p.id && styles.radioSelected]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.patientItemName}>{getNomPatient(p)}</Text>
                        {getEmailPatient(p) && (
                          <Text style={styles.patientItemEmail}>{getEmailPatient(p)}</Text>
                        )}
                        <Text style={styles.patientItemSub}>
                          {p.sexe ?? ""}
                          {p.dateNaissance
                            ? ` · Né(e) le ${new Date(p.dateNaissance).toLocaleDateString("fr-FR")}`
                            : ""}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!selectedPatient || saving) && styles.saveBtnDisabled]}
                onPress={ajouterDossier}
                disabled={saving || !selectedPatient}
              >
                {saving
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.saveBtnText}>Créer</Text>
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
  center:     { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#10B981", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#FFF" },
  addBtn:      { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 20, padding: 6 },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFF", margin: 16, paddingHorizontal: 14,
    paddingVertical: 10, borderRadius: 12, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A" },
  empty:       { alignItems: "center", marginTop: 80, gap: 12 },
  emptyText:   { color: "#94A3B8", fontSize: 16 },
  emptyBtn:    { backgroundColor: "#10B981", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText:{ color: "#FFF", fontWeight: "700" },
  card: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#FFF", marginHorizontal: 16, marginBottom: 12,
    padding: 16, borderRadius: 14, elevation: 2,
  },
  cardLeft:    { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar:      { width: 46, height: 46, borderRadius: 23, backgroundColor: "#DCFCE7", justifyContent: "center", alignItems: "center" },
  avatarText:  { fontSize: 18, fontWeight: "bold", color: "#10B981" },
  patientName: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  patientInfo: { fontSize: 12, color: "#64748B", marginTop: 2 },
  dateText:    { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  cardActions: { alignItems: "center" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox:     { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" },
  modalHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle:   { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
  modalSubtitle:{ fontSize: 13, color: "#64748B", marginBottom: 14 },
  modalLoading: { alignItems: "center", paddingVertical: 30, gap: 10 },
  modalLoadingText: { color: "#64748B", fontSize: 14 },
  noPatientsBox:{ alignItems: "center", paddingVertical: 30, gap: 10 },
  noPatients:   { textAlign: "center", color: "#94A3B8", fontSize: 14 },
  patientItem:  { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, marginBottom: 8, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  patientItemSelected: { borderColor: "#10B981", backgroundColor: "#F0FDF4" },
  radioCircle:  { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#CBD5E1" },
  radioSelected:{ borderColor: "#10B981", backgroundColor: "#10B981" },
  patientItemName:  { fontSize: 14, fontWeight: "600", color: "#334155" },
  patientItemEmail: { fontSize: 12, color: "#94A3B8", marginTop: 1 },
  patientItemSub:   { fontSize: 11, color: "#CBD5E1", marginTop: 1 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center" },
  cancelBtnText:{ color: "#64748B", fontWeight: "600" },
  saveBtn:      { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center" },
  saveBtnDisabled: { backgroundColor: "#CBD5E1" },
  saveBtnText:  { color: "#FFF", fontWeight: "700" },
});