import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput, RefreshControl,
} from "react-native";
import API from "../../api/api";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function GestionSpecialites({ navigation }) {
  const [specialites, setSpecialites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Modals ───────────────────────────────────────────────────────────────
  const [modalAjout, setModalAjout] = useState(false);
  const [modalModif, setModalModif] = useState(false);
  const [selected, setSelected] = useState(null);
  const [nomInput, setNomInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSpecialites(); }, []);

  // ── LIRE ─────────────────────────────────────────────────────────────────
  const fetchSpecialites = async () => {
    try {
      const response = await API.get("/specialite");
      const data = response.data?.specialites ?? response.data?.data ?? response.data;
      setSpecialites(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("fetchSpecialites:", error.message);
      Alert.alert("Erreur", "Impossible de charger les spécialités");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── AJOUTER ──────────────────────────────────────────────────────────────
  const handleAjouter = async () => {
    if (!nomInput.trim()) {
      Alert.alert("Erreur", "Le nom est obligatoire");
      return;
    }
    setSaving(true);
    try {
      await API.post("/specialite", { nom_specialite: nomInput.trim() });
      setModalAjout(false);
      setNomInput("");
      await fetchSpecialites();
      Alert.alert("Succès", "Spécialité ajoutée");
    } catch (error) {
      console.error("handleAjouter:", error.response?.data ?? error.message);
      Alert.alert("Erreur", error.response?.data?.message ?? "Impossible d'ajouter");
    } finally {
      setSaving(false);
    }
  };

  // ── MODIFIER ─────────────────────────────────────────────────────────────
  const openModif = (specialite) => {
    setSelected(specialite);
    setNomInput(specialite.nom_specialite);
    setModalModif(true);
  };

  const handleModifier = async () => {
    if (!nomInput.trim()) {
      Alert.alert("Erreur", "Le nom est obligatoire");
      return;
    }
    setSaving(true);
    try {
      await API.put(`/specialite/${selected.id}`, { nom_specialite: nomInput.trim() });
      setModalModif(false);
      setNomInput("");
      setSelected(null);
      await fetchSpecialites();
      Alert.alert("Succès", "Spécialité modifiée");
    } catch (error) {
      console.error("handleModifier:", error.response?.data ?? error.message);
      Alert.alert("Erreur", error.response?.data?.message ?? "Impossible de modifier");
    } finally {
      setSaving(false);
    }
  };

  // ── SUPPRIMER ────────────────────────────────────────────────────────────
  const handleSupprimer = (specialite) => {
    Alert.alert(
      "Confirmer la suppression",
      `Supprimer « ${specialite.nom_specialite} » ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/specialite/${specialite.id}`);
              await fetchSpecialites();
              Alert.alert("Succès", "Spécialité supprimée");
            } catch (error) {
              console.error("handleSupprimer:", error.response?.data ?? error.message);
              Alert.alert("Erreur", error.response?.data?.message ?? "Impossible de supprimer");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <>
      {/* ── MODAL AJOUT ── */}
      <Modal visible={modalAjout} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>➕ Nouvelle spécialité</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de la spécialité"
              value={nomInput}
              onChangeText={setNomInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnSave}
                onPress={handleAjouter}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.btnText}>Ajouter</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => { setModalAjout(false); setNomInput(""); }}
              >
                <Text style={styles.btnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL MODIFICATION ── */}
      <Modal visible={modalModif} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>✏️ Modifier spécialité</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de la spécialité"
              value={nomInput}
              onChangeText={setNomInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnSave}
                onPress={handleModifier}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.btnText}>Enregistrer</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => { setModalModif(false); setNomInput(""); setSelected(null); }}
              >
                <Text style={styles.btnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── PAGE PRINCIPALE ── */}
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchSpecialites(); }}
            colors={["#DC2626"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gestion des spécialités</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => { setNomInput(""); setModalAjout(true); }}
            >
              <Ionicons name="add" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSub}>{specialites.length} spécialité{specialites.length > 1 ? "s" : ""}</Text>
        </View>

        {/* Liste */}
        <View style={styles.listContainer}>
          {specialites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="list-outline" size={50} color="#CBD5E1" />
              <Text style={styles.emptyText}>Aucune spécialité</Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => { setNomInput(""); setModalAjout(true); }}
              >
                <Text style={styles.emptyAddText}>+ Ajouter une spécialité</Text>
              </TouchableOpacity>
            </View>
          ) : (
            specialites.map((sp, index) => (
              <View key={sp.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={styles.indexBadge}>
                    <Text style={styles.indexText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.cardName}>{sp.nom_specialite}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: "#DBEAFE" }]}
                    onPress={() => openModif(sp)}
                  >
                    <Ionicons name="create-outline" size={18} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: "#FEE2E2" }]}
                    onPress={() => handleSupprimer(sp)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Bouton flottant bas de page */}
        {specialites.length > 0 && (
          <TouchableOpacity
            style={styles.fabBottom}
            onPress={() => { setNomInput(""); setModalAjout(true); }}
          >
            <Ionicons name="add" size={22} color="#FFF" />
            <Text style={styles.fabText}>Ajouter une spécialité</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#64748B" },

  // Header
  header: { backgroundColor: "#267bdc", paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF" },
  addBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 6, textAlign: "center" },

  // Liste
  listContainer: { padding: 16 },
  emptyContainer: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { color: "#94A3B8", fontSize: 16 },
  emptyAddBtn: { backgroundColor: "#265ddc", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyAddText: { color: "#FFF", fontWeight: "600" },

  // Card
  card: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  indexBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center", marginRight: 12 },
  indexText: { color: "#267bdc", fontWeight: "700", fontSize: 13 },
  cardName: { fontSize: 15, fontWeight: "600", color: "#0F172A", flex: 1 },
  cardActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },

  // FAB
  fabBottom: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#2663dc", marginHorizontal: 20, paddingVertical: 14, borderRadius: 14, gap: 8, elevation: 4 },
  fabText: { color: "#FFF", fontWeight: "700", fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: "88%", backgroundColor: "#FFF", borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 16, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16, backgroundColor: "#F8FAFC" },
  modalButtons: { flexDirection: "row", gap: 10 },
  btnSave: { flex: 1, backgroundColor: "#268adc", padding: 12, borderRadius: 10, alignItems: "center" },
  btnCancel: { flex: 1, backgroundColor: "#94A3B8", padding: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#FFF", fontWeight: "700" },
});