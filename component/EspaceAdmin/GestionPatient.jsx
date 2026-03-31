import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput, RefreshControl,
} from "react-native";
import API from "../../api/api";
import Ionicons from "react-native-vector-icons/Ionicons";

const ROLES = ["patient", "medecin", "admin"];

export default function GestionPatients({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal modifier
  const [modalModif, setModalModif] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({ prenom: "", nom: "", email: "", telephone: "", adresse: "", age: "", role: "patient" });

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    try {
      const response = await API.get("/patients");
      console.log("[GestionPatients]", JSON.stringify(response.data));
      const data = response.data?.patients ?? response.data?.data ?? response.data;
      setPatients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("fetchPatients:", e.message);
      Alert.alert("Erreur", "Impossible de charger les patients");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openModif = (p) => {
    setSelected(p);
    setFormData({
      prenom: p.prenom ?? "",
      nom: p.nom ?? "",
      email: p.email ?? "",
      telephone: p.telephone ?? "",
      adresse: p.adresse ?? "",
      age: p.age ? String(p.age) : "",
      role: p.role ?? "patient",
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
      await fetchPatients();
      Alert.alert("Succès", "Patient modifié");
    } catch (e) {
      console.error("handleModifier:", e.response?.data ?? e.message);
      Alert.alert("Erreur", e.response?.data?.message ?? "Impossible de modifier");
    } finally {
      setSaving(false);
    }
  };

  const handleSupprimer = (p) => {
    Alert.alert(
      "Confirmer",
      `Supprimer ${p.prenom} ${p.nom} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer", style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/users/${p.id}`);
              await fetchPatients();
              Alert.alert("Succès", "Patient supprimé");
            } catch (e) {
              Alert.alert("Erreur", e.response?.data?.message ?? "Impossible de supprimer");
            }
          },
        },
      ]
    );
  };

  const getInitials = (p) =>
    `${p.prenom?.charAt(0) ?? ""}${p.nom?.charAt(0) ?? ""}`.toUpperCase();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
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
            <Text style={styles.modalTitle}>✏️ Modifier patient</Text>
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

              {/* Sélecteur de rôle */}
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
                <TouchableOpacity style={styles.btnSave} onPress={handleModifier} disabled={saving}>
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

      {/* PAGE */}
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPatients(); }} colors={["#3B82F6"]} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: "#3B82F6" }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gestion des patients</Text>
            <View style={{ width: 38 }} />
          </View>
          <Text style={styles.headerSub}>{patients.length} patient{patients.length > 1 ? "s" : ""}</Text>
        </View>

        {/* Liste */}
        <View style={styles.listContainer}>
          {patients.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={50} color="#CBD5E1" />
              <Text style={styles.emptyText}>Aucun patient</Text>
            </View>
          ) : (
            patients.map((p) => (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={[styles.avatar, { backgroundColor: "#DBEAFE" }]}>
                    <Text style={[styles.avatarText, { color: "#3B82F6" }]}>{getInitials(p)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{p.prenom} {p.nom}</Text>
                    <Text style={styles.cardEmail}>{p.email}</Text>
                    <View style={[styles.rolePill, { backgroundColor: getRoleColor(p.role) + "20" }]}>
                      <Text style={[styles.rolePillText, { color: getRoleColor(p.role) }]}>{p.role}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.iconBtn, { backgroundColor: "#DBEAFE" }]} onPress={() => openModif(p)}>
                    <Ionicons name="create-outline" size={18} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, { backgroundColor: "#FEE2E2" }]} onPress={() => handleSupprimer(p)}>
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
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 6, textAlign: "center" },
  listContainer: { padding: 16 },
  emptyContainer: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { color: "#94A3B8", fontSize: 16 },
  card: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { fontWeight: "700", fontSize: 15 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  cardEmail: { fontSize: 12, color: "#64748B", marginTop: 2 },
  rolePill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  rolePillText: { fontSize: 11, fontWeight: "600" },
  cardActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
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