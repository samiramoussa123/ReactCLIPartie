import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput, RefreshControl,
} from "react-native";
import API from "../../api/api";
import Ionicons from "react-native-vector-icons/Ionicons";

const ROLES = ["patient", "medecin", "admin"];

export default function GestionMedecins({ navigation }) {
  const [medecins, setMedecins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalModif, setModalModif] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({ prenom: "", nom: "", email: "", telephone: "", adresse: "", age: "", role: "medecin" });

  const [modalValidation, setModalValidation] = useState(false);
  const [medecinEnAttente, setMedecinEnAttente] = useState([]);
  const [loadingValidation, setLoadingValidation] = useState(false);

  useEffect(() => { fetchMedecins(); }, []);

  const fetchMedecins = async () => {
    try {
      const response = await API.get("/medecins");
      console.log("[GestionMedecins]", JSON.stringify(response.data));
      const data = response.data?.medecins ?? response.data?.data ?? response.data;
      setMedecins(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("fetchMedecins:", e.message);
      Alert.alert("Erreur", "Impossible de charger les médecins");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchEnAttente = async () => {
    setLoadingValidation(true);
    try {
      const response = await API.get("/admin/medecins/en-attente");
      const data = response.data?.medecins ?? response.data?.data ?? response.data;
      setMedecinEnAttente(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("fetchEnAttente:", e.message);
    } finally {
      setLoadingValidation(false);
    }
  };

  const openModif = (m) => {
    setSelected(m);
    setFormData({
      prenom: m.prenom ?? "",
      nom: m.nom ?? "",
      email: m.email ?? "",
      telephone: m.telephone ?? "",
      adresse: m.adresse ?? "",
      age: m.age ? String(m.age) : "",
      role: m.role ?? "medecin",
    });
    setModalModif(true);
  };

  const handleModifier = async () => {
    if (!formData.prenom.trim() || !formData.nom.trim()) {
      Alert.alert("Erreur", "Prénom et Nom sont obligatoires");
      return;
    }
    setSaving(true);
    try {
      await API.put(`/users/${selected.id}`, {
        ...formData,
        age: formData.age ? parseInt(formData.age, 10) : null,
      });
      setModalModif(false);
      await fetchMedecins();
      Alert.alert("Succès", "Médecin modifié");
    } catch (e) {
      console.error("handleModifier:", e.response?.data ?? e.message);
      Alert.alert("Erreur", e.response?.data?.message ?? "Impossible de modifier");
    } finally {
      setSaving(false);
    }
  };

  const handleSupprimer = (m) => {
    Alert.alert(
      "Confirmer",
      `Supprimer Dr. ${m.prenom} ${m.nom} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer", style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/users/${m.id}`);
              await fetchMedecins();
              Alert.alert("Succès", "Médecin supprimé");
            } catch (e) {
              Alert.alert("Erreur", e.response?.data?.message ?? "Impossible de supprimer");
            }
          },
        },
      ]
    );
  };

  const handleVerifier = async (id) => {
    try {
      await API.put(`/admin/medecins/${id}/verifier`);
      await fetchEnAttente();
      await fetchMedecins();
      Alert.alert("Succès", "Médecin vérifié");
    } catch (e) {
      Alert.alert("Erreur", e.response?.data?.message ?? "Impossible de vérifier");
    }
  };

  const handleRejeter = (id, nom) => {
    Alert.alert(
      "Confirmer",
      `Rejeter Dr. ${nom} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Rejeter", style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/admin/medecins/${id}/rejeter`);
              await fetchEnAttente();
              await fetchMedecins();
              Alert.alert("Succès", "Médecin rejeté");
            } catch (e) {
              Alert.alert("Erreur", e.response?.data?.message ?? "Impossible de rejeter");
            }
          },
        },
      ]
    );
  };

  const getInitials = (m) =>
    `${m.prenom?.charAt(0) ?? ""}${m.nom?.charAt(0) ?? ""}`.toUpperCase();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <>
      {/* MODAL MODIFIER */}
      <Modal visible={modalModif} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>✏️ Modifier médecin</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: "prenom", placeholder: "Prénom" },
                { key: "nom", placeholder: "Nom" },
                { key: "email", placeholder: "Email", keyboard: "email-address", caps: "none" },
                { key: "telephone", placeholder: "Téléphone", keyboard: "phone-pad" },
                { key: "adresse", placeholder: "Adresse" },
                { key: "age", placeholder: "Âge", keyboard: "numeric" },
              ].map(({ key, placeholder, keyboard, caps }) => (
                <TextInput
                  key={key}
                  style={styles.input}
                  placeholder={placeholder}
                  value={formData[key]}
                  keyboardType={keyboard ?? "default"}
                  autoCapitalize={caps ?? "sentences"}
                  onChangeText={(t) => setFormData({ ...formData, [key]: t })}
                />
              ))}

              {/* Rôle */}
              <Text style={styles.roleLabel}>Rôle</Text>
              <View style={styles.roleRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleBtn, formData.role === r && styles.roleBtnActive]}
                    onPress={() => setFormData({ ...formData, role: r })}
                  >
                    <Text style={[styles.roleBtnText, formData.role === r && styles.roleBtnTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.btnSave, { backgroundColor: "#10B981" }]} onPress={handleModifier} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Enregistrer</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setModalModif(false)}>
                  <Text style={styles.btnText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL EN ATTENTE */}
      <Modal visible={modalValidation} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: "80%" }]}>
            <Text style={styles.modalTitle}>⏳ Médecins en attente</Text>
            {loadingValidation ? (
              <ActivityIndicator color="#F59E0B" style={{ marginVertical: 20 }} />
            ) : medecinEnAttente.length === 0 ? (
              <Text style={styles.emptyText}>Aucun médecin en attente</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {medecinEnAttente.map((m) => (
                  <View key={m.id} style={styles.attentCard}>
                    <Text style={styles.attentName}>{m.prenom} {m.nom}</Text>
                    <Text style={styles.attentEmail}>{m.email}</Text>
                    <View style={styles.attentActions}>
                      <TouchableOpacity
                        style={[styles.attentBtn, { backgroundColor: "#10B981" }]}
                        onPress={() => handleVerifier(m.medecin?.id ?? m.id)}
                      >
                        <Text style={styles.btnText}>✓ Valider</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.attentBtn, { backgroundColor: "#EF4444" }]}
                        onPress={() => handleRejeter(m.medecin?.id ?? m.id, `${m.prenom} ${m.nom}`)}
                      >
                        <Text style={styles.btnText}>✗ Rejeter</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.btnCancel, { marginTop: 12 }]} onPress={() => setModalValidation(false)}>
              <Text style={styles.btnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PAGE */}
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMedecins(); }} colors={["#10B981"]} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: "#10B981" }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gestion des médecins</Text>
            <TouchableOpacity
              style={styles.validationBtn}
              onPress={() => { fetchEnAttente(); setModalValidation(true); }}
            >
              <Ionicons name="time-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSub}>{medecins.length} médecin{medecins.length > 1 ? "s" : ""}</Text>
        </View>

        {/* Bouton en attente */}
        <TouchableOpacity
          style={styles.enAttenteBar}
          onPress={() => { fetchEnAttente(); setModalValidation(true); }}
        >
          <Ionicons name="time-outline" size={18} color="#F59E0B" />
          <Text style={styles.enAttenteText}>Voir les médecins en attente de validation</Text>
          <Ionicons name="chevron-forward" size={18} color="#F59E0B" />
        </TouchableOpacity>

        {/* Liste */}
        <View style={styles.listContainer}>
          {medecins.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="medical-outline" size={50} color="#CBD5E1" />
              <Text style={styles.emptyText}>Aucun médecin</Text>
            </View>
          ) : (
            medecins.map((m) => (
              <View key={m.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={[styles.avatar, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={[styles.avatarText, { color: "#10B981" }]}>{getInitials(m)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>Dr. {m.prenom} {m.nom}</Text>
                    <Text style={styles.cardEmail}>{m.email}</Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                      <View style={[styles.rolePill, { backgroundColor: getRoleColor(m.role) + "20" }]}>
                        <Text style={[styles.rolePillText, { color: getRoleColor(m.role) }]}>{m.role}</Text>
                      </View>
                      {m.medecin?.verifie_json && (
                        <View style={[styles.rolePill, { backgroundColor: "#DCFCE7" }]}>
                          <Text style={[styles.rolePillText, { color: "#10B981" }]}>✓ Vérifié</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.iconBtn, { backgroundColor: "#DCFCE7" }]} onPress={() => openModif(m)}>
                    <Ionicons name="create-outline" size={18} color="#10B981" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, { backgroundColor: "#FEE2E2" }]} onPress={() => handleSupprimer(m)}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const getRoleColor = (role) => {
  switch (role) {
    case "admin":   return "#DC2626";
    case "medecin": return "#10B981";
    default:        return "#3B82F6";
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#64748B" },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF" },
  validationBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 6, textAlign: "center" },
  enAttenteBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", marginHorizontal: 16, marginTop: 14, padding: 12, borderRadius: 12, gap: 8 },
  enAttenteText: { flex: 1, color: "#92400E", fontWeight: "600", fontSize: 13 },
  listContainer: { padding: 16 },
  emptyContainer: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { color: "#94A3B8", fontSize: 16, textAlign: "center" },
  card: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { fontWeight: "700", fontSize: 15 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  cardEmail: { fontSize: 12, color: "#64748B", marginTop: 2 },
  rolePill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  rolePillText: { fontSize: 11, fontWeight: "600" },
  cardActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  attentCard: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12, marginBottom: 10 },
  attentName: { fontWeight: "700", fontSize: 15, color: "#0F172A" },
  attentEmail: { fontSize: 12, color: "#64748B", marginTop: 2, marginBottom: 8 },
  attentActions: { flexDirection: "row", gap: 8 },
  attentBtn: { flex: 1, padding: 9, borderRadius: 8, alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: "90%", backgroundColor: "#FFF", borderRadius: 16, padding: 20, maxHeight: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 14, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 11, fontSize: 14, marginBottom: 10, backgroundColor: "#F8FAFC" },
  roleLabel: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 8 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  roleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center" },
  roleBtnActive: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  roleBtnText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  roleBtnTextActive: { color: "#FFF" },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  btnSave: { flex: 1, backgroundColor: "#3B82F6", padding: 12, borderRadius: 10, alignItems: "center" },
  btnCancel: { flex: 1, backgroundColor: "#94A3B8", padding: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#FFF", fontWeight: "700" },
});