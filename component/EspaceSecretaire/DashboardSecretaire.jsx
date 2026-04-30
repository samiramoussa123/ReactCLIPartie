import { useEffect, useState, useCallback, useRef } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Modal,
  TextInput, Platform, AppState, FlatList,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from "../../api/api";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { confirmLogout } from "../../navigation/AppNavigate";

// ─────────────────────────────────
// Constantes statut RDV
// ─────────────────────────────────
const STATUTS = {
  en_attente: { label: "En attente",  color: "#F59E0B", bg: "#FFFBEB", icon: "time-outline" },
  confirme:   { label: "Confirmé",    color: "#10B981", bg: "#D1FAE5", icon: "checkmark-circle-outline" },
  annule:     { label: "Annulé",      color: "#EF4444", bg: "#FEE2E2", icon: "close-circle-outline" },
  termine:    { label: "Terminé",     color: "#3B82F6", bg: "#DBEAFE", icon: "checkmark-done-outline" },
};

// ─────────────────────────────────
// Card Rendez-vous
// ─────────────────────────────────
function RdvCard({ rdv, onChangeStatut, onDelete }) {
  const statut = STATUTS[rdv.etat] ?? STATUTS.en_attente;
  const heure  = rdv.heure?.slice(0, 5) ?? "";

  return (
    <View style={styles.rdvCard}>
      <View style={[styles.rdvStatutBar, { backgroundColor: statut.color }]} />
      <View style={styles.rdvBody}>
        <View style={styles.rdvTop}>
          <View style={styles.rdvPatientInfo}>
            <Text style={styles.rdvPatientName}>
              {rdv.patient?.user?.prenom ?? rdv.patient_prenom ?? "Patient"}{" "}
              {rdv.patient?.user?.nom ?? rdv.patient_nom ?? ""}
            </Text>
            <View style={styles.rdvDateTime}>
              <Ionicons name="calendar-outline" size={13} color="#64748B" />
              <Text style={styles.rdvDateText}>{rdv.date}  {heure}</Text>
            </View>
          </View>
          <View style={[styles.rdvStatutBadge, { backgroundColor: statut.bg }]}>
            <Ionicons name={statut.icon} size={12} color={statut.color} />
            <Text style={[styles.rdvStatutText, { color: statut.color }]}>{statut.label}</Text>
          </View>
        </View>

        {rdv.notes ? (
          <Text style={styles.rdvNotes} numberOfLines={2}>{rdv.notes}</Text>
        ) : null}

        <View style={styles.rdvActions}>
          {rdv.etat === "en_attente" && (
            <>
              <TouchableOpacity
                style={[styles.rdvBtn, { backgroundColor: "#D1FAE5" }]}
                onPress={() => onChangeStatut(rdv.id, "confirme")}
              >
                <Ionicons name="checkmark" size={14} color="#10B981" />
                <Text style={[styles.rdvBtnText, { color: "#10B981" }]}>Confirmer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rdvBtn, { backgroundColor: "#FEE2E2" }]}
                onPress={() => onChangeStatut(rdv.id, "annule")}
              >
                <Ionicons name="close" size={14} color="#EF4444" />
                <Text style={[styles.rdvBtnText, { color: "#EF4444" }]}>Annuler</Text>
              </TouchableOpacity>
            </>
          )}
          {rdv.etat === "confirme" && (
            <TouchableOpacity
              style={[styles.rdvBtn, { backgroundColor: "#DBEAFE" }]}
              onPress={() => onChangeStatut(rdv.id, "termine")}
            >
              <Ionicons name="checkmark-done" size={14} color="#3B82F6" />
              <Text style={[styles.rdvBtnText, { color: "#3B82F6" }]}>Terminer</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.rdvBtn, { backgroundColor: "#FEE2E2", marginLeft: "auto" }]}
            onPress={() => onDelete(rdv.id)}
          >
            <Ionicons name="trash-outline" size={14} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────
// Modal Ajouter RDV
// ─────────────────────────────────
function ModalAjouterRdv({ visible, onClose, onSave, medecinId, saving }) {
  const [form, setForm] = useState({
    patient_nom: "", patient_prenom: "", patient_telephone: "",
    date: "", heure: "", notes: "",
  });

  const reset = () => setForm({
    patient_nom: "", patient_prenom: "", patient_telephone: "",
    date: "", heure: "", notes: "",
  });

  const handleSave = () => {
    if (!form.patient_nom || !form.date || !form.heure) {
      Alert.alert("Champs requis", "Nom, date et heure sont obligatoires.");
      return;
    }
    onSave(form, reset);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouveau rendez-vous</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Prénom patient</Text>
            <TextInput style={styles.input} placeholder="Prénom" value={form.patient_prenom}
              onChangeText={t => setForm({ ...form, patient_prenom: t })} />

            <Text style={styles.inputLabel}>Nom patient *</Text>
            <TextInput style={styles.input} placeholder="Nom" value={form.patient_nom}
              onChangeText={t => setForm({ ...form, patient_nom: t })} />

            <Text style={styles.inputLabel}>Téléphone</Text>
            <TextInput style={styles.input} placeholder="Téléphone" keyboardType="phone-pad"
              value={form.patient_telephone} onChangeText={t => setForm({ ...form, patient_telephone: t })} />

            <Text style={styles.inputLabel}>Date * (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} placeholder="2026-05-01" value={form.date}
              onChangeText={t => setForm({ ...form, date: t })} />

            <Text style={styles.inputLabel}>Heure * (HH:MM)</Text>
            <TextInput style={styles.input} placeholder="09:30" value={form.heure}
              onChangeText={t => setForm({ ...form, heure: t })} />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              placeholder="Notes..." multiline value={form.notes}
              onChangeText={t => setForm({ ...form, notes: t })} />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.saveBtnText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────
// Composant principal
// ─────────────────────────────────
export default function DashboardSecretaire({ navigation }) {
  const [user, setUser]               = useState(null);
  const [medecin, setMedecin]         = useState(null);
  const [rdvList, setRdvList]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [onglet, setOnglet]           = useState("aujourd_hui"); // aujourd_hui | tous | agenda
  const [modalRdv, setModalRdv]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [agenda, setAgenda]           = useState(null);
  const appStateRef                   = useRef(AppState.currentState);

  // ── Vérifier accès secrétaire ──
  const verifierAcces = useCallback(async () => {
    try {
      const response = await API.get("/VerifierEtat");
      if (!response.data?.active) {
        await AsyncStorage.multiRemove(["token", "userData"]);
        Alert.alert(
          "Accès révoqué",
          "Le médecin a révoqué votre accès. Vous allez être déconnecté.",
          [{ text: "OK", onPress: () => navigation.replace("Login") }]
        );
      }
    } catch {
      // Si 403 direct depuis le middleware
      await AsyncStorage.multiRemove(["token", "userData"]);
      navigation.replace("Login");
    }
  }, [navigation]);

  // ── Charger données ──
  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { navigation.replace("Login"); return; }

      // Infos secrétaire
      const meRes = await API.get("/me");
      const userData = meRes.data?.user ?? meRes.data;
      setUser(userData);

      // Récupérer le medecin_id via la liaison secrétaire
      const secRes = await API.get("/VerifierEtat");
      if (!secRes.data?.active) { verifierAcces(); return; }

      // Infos médecin lié
      const medecinData = userData?.secretaire?.medecin ?? null;
      const medecinId   = userData?.secretaire?.medecin_id ?? null;

      if (!medecinId) {
        Alert.alert("Erreur", "Aucun médecin associé à ce compte.");
        return;
      }

      // Charger profil médecin
      const medRes = await API.get(`/users/${medecinId}`);
      setMedecin(medRes.data?.user ?? medRes.data);

      // Charger RDV du médecin
      await fetchRdv(medecinId);

      // Charger agenda
      await fetchAgenda(medecinId);

    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        await AsyncStorage.multiRemove(["token", "userData"]);
        navigation.replace("Login");
      } else {
        Alert.alert("Erreur", "Impossible de charger les données.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, verifierAcces]);

  const fetchRdv = async (medecinId) => {
    try {
      const response = await API.get(`/rendezvous/medecin/${medecinId}`);
      const list = response.data?.rendez_vous ?? response.data?.data ?? response.data ?? [];
      setRdvList(Array.isArray(list) ? list : []);
    } catch {
      setRdvList([]);
    }
  };

  const fetchAgenda = async (medecinId) => {
    try {
      const response = await API.get(`/agenda/medecin/${medecinId}`);
      setAgenda(response.data);
    } catch {
      setAgenda(null);
    }
  };

  // ── Ajouter RDV ──
  const ajouterRdv = async (form, reset) => {
    const medecinId = user?.secretaire?.medecin_id;
    if (!medecinId) return;
    try {
      setSaving(true);
      await API.post("/rendezvous", {
        medecin_id:        medecinId,
        patient_nom:       form.patient_nom,
        patient_prenom:    form.patient_prenom,
        patient_telephone: form.patient_telephone,
        date:              form.date,
        heure:             form.heure,
        notes:             form.notes,
      });
      reset();
      setModalRdv(false);
      Alert.alert("Succès", "Rendez-vous ajouté.");
      await fetchRdv(medecinId);
    } catch (error) {
      const msg = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join("\n")
        : error.response?.data?.message ?? "Erreur lors de l'ajout.";
      Alert.alert("Erreur", msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Changer statut RDV ──
  const changerStatut = async (rdvId, etat) => {
    const medecinId = user?.secretaire?.medecin_id;
    try {
      await API.patch(`/rendezvous/${rdvId}/medecin/${medecinId}/etat`, { etat });
      setRdvList(prev =>
        prev.map(r => r.id === rdvId ? { ...r, etat } : r)
      );
    } catch (error) {
      Alert.alert("Erreur", error.response?.data?.message ?? "Impossible de modifier le statut.");
    }
  };

  // ── Supprimer RDV ──
  const supprimerRdv = (rdvId) => {
    Alert.alert("Supprimer", "Supprimer ce rendez-vous ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          try {
            await API.delete(`/rendezvous/${rdvId}`);
            setRdvList(prev => prev.filter(r => r.id !== rdvId));
          } catch {
            Alert.alert("Erreur", "Impossible de supprimer.");
          }
        },
      },
    ]);
  };

  // ── Lifecycle ──
  useEffect(() => {
    fetchData();
    verifierAcces();

    // Vérifier accès toutes les 2 minutes
    const interval = setInterval(verifierAcces, 120000);

    const sub = AppState.addEventListener("change", state => {
      if (appStateRef.current.match(/inactive|background/) && state === "active") {
        verifierAcces();
        fetchData();
      }
      appStateRef.current = state;
    });

    return () => { clearInterval(interval); sub.remove(); };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await verifierAcces();
    await fetchData();
  };

  // ── Filtrer RDV par onglet ──
  const today = new Date().toISOString().split("T")[0];
  const rdvFiltres = onglet === "aujourd_hui"
    ? rdvList.filter(r => r.date === today)
    : rdvList;

  const statsRdv = {
    total:      rdvList.length,
    aujourdhui: rdvList.filter(r => r.date === today).length,
    en_attente: rdvList.filter(r => r.etat === "en_attente").length,
    confirme:   rdvList.filter(r => r.etat === "confirme").length,
  };

  // ── Loading ──
  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#8B5CF6" />
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );

  const medecinNom = medecin ? `Dr. ${medecin.prenom ?? ""} ${medecin.nom ?? ""}` : "Médecin";

  return (
    <>
      <ModalAjouterRdv
        visible={modalRdv}
        onClose={() => setModalRdv(false)}
        onSave={ajouterRdv}
        medecinId={user?.secretaire?.medecin_id}
        saving={saving}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.openDrawer?.()}>
            <Ionicons name="menu" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Espace Secrétaire</Text>
            <Text style={styles.headerSubtitle}>{medecinNom}</Text>
          </View>
          <TouchableOpacity onPress={() => confirmLogout(navigation)}>
            <Ionicons name="log-out-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Bonjour */}
        <View style={styles.headerWelcome}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>
              {user?.prenom?.charAt(0)}{user?.nom?.charAt(0)}
            </Text>
          </View>
          <View>
            <Text style={styles.welcomeText}>Bonjour, {user?.prenom} 👋</Text>
            <Text style={styles.welcomeSub}>Secrétaire de {medecinNom}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#8B5CF6"]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "Aujourd'hui", value: statsRdv.aujourdhui, color: "#8B5CF6", icon: "today-outline" },
            { label: "En attente",  value: statsRdv.en_attente, color: "#F59E0B", icon: "time-outline" },
            { label: "Confirmés",   value: statsRdv.confirme,   color: "#10B981", icon: "checkmark-circle-outline" },
            { label: "Total",       value: statsRdv.total,      color: "#3B82F6", icon: "calendar-outline" },
          ].map(({ label, value, color, icon }) => (
            <View key={label} style={[styles.statCard, { borderTopColor: color }]}>
              <Ionicons name={icon} size={18} color={color} />
              <Text style={[styles.statNumber, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Onglets */}
        <View style={styles.onglets}>
          {[
            { key: "aujourd_hui", label: "Aujourd'hui", icon: "today-outline" },
            { key: "tous",        label: "Tous les RDV", icon: "list-outline" },
            { key: "agenda",      label: "Agenda",       icon: "calendar-outline" },
          ].map(({ key, label, icon }) => (
            <TouchableOpacity
              key={key}
              style={[styles.onglet, onglet === key && styles.ongletActif]}
              onPress={() => setOnglet(key)}
            >
              <Ionicons name={icon} size={15} color={onglet === key ? "#8B5CF6" : "#64748B"} />
              <Text style={[styles.ongletText, onglet === key && styles.ongletTextActif]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bouton ajouter RDV */}
        {onglet !== "agenda" && (
          <TouchableOpacity style={styles.addRdvBtn} onPress={() => setModalRdv(true)}>
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.addRdvBtnText}>Ajouter un rendez-vous</Text>
          </TouchableOpacity>
        )}

        {/* Contenu onglets */}
        {onglet === "agenda" ? (
          <View style={styles.agendaContainer}>
            <Text style={styles.sectionTitle}>📅 Agenda du médecin</Text>
            {agenda ? (
              <View style={styles.agendaCard}>
                <Text style={styles.agendaText}>
                  {JSON.stringify(agenda, null, 2)}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>Aucun agenda disponible</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {onglet === "aujourd_hui" ? "📋 Rendez-vous d'aujourd'hui" : "📋 Tous les rendez-vous"}
              {" "}({rdvFiltres.length})
            </Text>
            {rdvFiltres.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                  {onglet === "aujourd_hui" ? "Aucun RDV aujourd'hui" : "Aucun rendez-vous"}
                </Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalRdv(true)}>
                  <Text style={styles.emptyBtnText}>Ajouter un rendez-vous</Text>
                </TouchableOpacity>
              </View>
            ) : (
              rdvFiltres.map(rdv => (
                <RdvCard
                  key={rdv.id}
                  rdv={rdv}
                  onChangeStatut={changerStatut}
                  onDelete={supprimerRdv}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container:        { flexGrow: 1, backgroundColor: "#F5F7FA", paddingBottom: 30, paddingHorizontal: 16, paddingTop: 12 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F7FA" },
  loadingText:      { marginTop: 12, fontSize: 16, color: "#64748B" },

  // Header
  header:          { backgroundColor: "#8B5CF6", paddingTop: Platform.OS === "ios" ? 50 : 40, paddingBottom: 24, paddingHorizontal: 20 },
  headerTop:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerCenter:    { alignItems: "center" },
  headerTitle:     { fontSize: 18, fontWeight: "700", color: "#FFF" },
  headerSubtitle:  { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  headerWelcome:   { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, padding: 12 },
  avatarSmall:     { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center" },
  avatarSmallText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  welcomeText:     { color: "#FFF", fontSize: 15, fontWeight: "600" },
  welcomeSub:      { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },

  // Stats
  statsRow:    { flexDirection: "row", gap: 8, marginBottom: 16, marginTop: 8 },
  statCard:    { flex: 1, backgroundColor: "#FFF", borderRadius: 12, padding: 10, borderTopWidth: 3, elevation: 2, alignItems: "center", gap: 4 },
  statNumber:  { fontSize: 20, fontWeight: "700" },
  statLabel:   { fontSize: 10, color: "#64748B", textAlign: "center" },

  // Onglets
  onglets:       { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 12, padding: 4, marginBottom: 16, elevation: 1 },
  onglet:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, gap: 4, borderRadius: 8 },
  ongletActif:   { backgroundColor: "#F3F0FF" },
  ongletText:    { fontSize: 11, color: "#64748B", fontWeight: "500" },
  ongletTextActif: { color: "#8B5CF6", fontWeight: "700" },

  // Ajouter RDV
  addRdvBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#8B5CF6", borderRadius: 12, paddingVertical: 12, marginBottom: 16, gap: 8, elevation: 3 },
  addRdvBtnText: { color: "#FFF", fontWeight: "600", fontSize: 14 },

  // Section title
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", marginBottom: 12 },

  // RDV Card
  rdvCard:        { backgroundColor: "#FFF", borderRadius: 14, marginBottom: 12, flexDirection: "row", overflow: "hidden", elevation: 2 },
  rdvStatutBar:   { width: 4 },
  rdvBody:        { flex: 1, padding: 14 },
  rdvTop:         { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  rdvPatientInfo: { flex: 1 },
  rdvPatientName: { fontSize: 15, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  rdvDateTime:    { flexDirection: "row", alignItems: "center", gap: 4 },
  rdvDateText:    { fontSize: 12, color: "#64748B" },
  rdvStatutBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  rdvStatutText:  { fontSize: 11, fontWeight: "600" },
  rdvNotes:       { fontSize: 12, color: "#64748B", marginBottom: 10, fontStyle: "italic" },
  rdvActions:     { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  rdvBtn:         { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  rdvBtnText:     { fontSize: 12, fontWeight: "600" },

  // Empty
  emptyContainer: { alignItems: "center", paddingTop: 40, paddingBottom: 20 },
  emptyText:      { fontSize: 15, color: "#94A3B8", marginTop: 12, marginBottom: 16 },
  emptyBtn:       { backgroundColor: "#8B5CF6", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText:   { color: "#FFF", fontWeight: "600" },

  // Agenda
  agendaContainer: { marginTop: 4 },
  agendaCard:      { backgroundColor: "#FFF", borderRadius: 12, padding: 16, elevation: 1 },
  agendaText:      { fontSize: 12, color: "#475569", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },

  // Modal
  modalOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent:  { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24, maxHeight: "90%" },
  modalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle:    { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  inputLabel:    { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
  input:         { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 14, color: "#0F172A", backgroundColor: "#F8FAFC" },
  modalButtons:  { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn:     { flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 14, alignItems: "center" },
  cancelBtnText: { color: "#64748B", fontWeight: "600" },
  saveBtn:       { flex: 1, backgroundColor: "#8B5CF6", borderRadius: 10, padding: 14, alignItems: "center" },
  saveBtnText:   { color: "#FFF", fontWeight: "600", fontSize: 15 },
});