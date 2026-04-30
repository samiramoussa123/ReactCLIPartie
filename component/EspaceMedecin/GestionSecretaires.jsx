import { useEffect, useState } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Modal,
  TextInput, Platform, Switch,
} from "react-native";
import API from "../../api/api";
import Ionicons from 'react-native-vector-icons/Ionicons';

// ─────────────────────────────────
// Card secrétaire
// ─────────────────────────────────
function SecretaireCard({ secretaire, onToggle, onDelete }) {
  const user = secretaire.user;
  const isActive = secretaire.is_active;

  const getInitials = () =>
    `${user?.prenom?.charAt(0) || ""}${user?.nom?.charAt(0) || ""}`.toUpperCase();

  const getAvatarColor = () =>
    ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"][(user?.id ?? 0) % 5];

  return (
    <View style={[styles.card, !isActive && styles.cardInactive]}>
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor() }]}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{user?.prenom} {user?.nom}</Text>
          <Text style={styles.cardEmail}>{user?.email}</Text>
          <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
            <Ionicons
              name={isActive ? "checkmark-circle" : "close-circle"}
              size={12}
              color={isActive ? "#10B981" : "#EF4444"}
            />
            <Text style={[styles.statusText, { color: isActive ? "#10B981" : "#EF4444" }]}>
              {isActive ? "Actif" : "Révoqué"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        <Switch
          value={isActive}
          onValueChange={() => onToggle(secretaire.id, isActive)}
          trackColor={{ false: "#FCA5A5", true: "#6EE7B7" }}
          thumbColor={isActive ? "#10B981" : "#EF4444"}
        />
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(secretaire.id, user?.prenom, user?.nom)}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────
// Composant principal
// ─────────────────────────────────
export default function GestionSecretaires({ navigation }) {
  const [secretaires, setSecretaires]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [formData, setFormData]         = useState({
    nom: "", prenom: "", email: "", mdp: "",
  });
  const [showMdp, setShowMdp]           = useState(false);

  // ── Charger la liste ──
  const fetchSecretaires = async () => {
    try {
      const response = await API.get("/secretaires");
      setSecretaires(response.data?.secretaires ?? []);
    } catch (error) {
      Alert.alert("Erreur", error.response?.data?.message ?? "Impossible de charger les secrétaires.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSecretaires(); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchSecretaires(); };

  // ── Ajouter ──
  const ajouterSecretaire = async () => {
    if (!formData.nom || !formData.prenom || !formData.email || !formData.mdp) {
      Alert.alert("Champs requis", "Veuillez remplir tous les champs.");
      return;
    }
    try {
      setSaving(true);
      await API.post("/secretaires", formData);
      setModalVisible(false);
      setFormData({ nom: "", prenom: "", email: "", mdp: "" });
      Alert.alert("Succès", "Secrétaire créée avec succès.");
      await fetchSecretaires();
    } catch (error) {
      const errors = error.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join("\n")
        : error.response?.data?.message ?? "Erreur lors de la création.";
      Alert.alert("Erreur", msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle accès ──
  const toggleAcces = async (id, currentState) => {
    const action = currentState ? "révoquer" : "réactiver";
    Alert.alert(
      "Confirmation",
      `Voulez-vous ${action} l'accès de cette secrétaire ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: async () => {
            try {
              const response = await API.patch(`/secretaire/${id}/etat`);
              setSecretaires(prev =>
                prev.map(s =>
                  s.id === id ? { ...s, is_active: response.data.is_active } : s
                )
              );
              Alert.alert("Succès", response.data.message);
            } catch (error) {
              Alert.alert("Erreur", error.response?.data?.message ?? "Impossible de modifier l'accès.");
            }
          },
        },
      ]
    );
  };

  // ── Supprimer ──
  const supprimerSecretaire = (id, prenom, nom) => {
    Alert.alert(
      "Supprimer",
      `Supprimer définitivement ${prenom} ${nom} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/secretaire/${id}`);
              setSecretaires(prev => prev.filter(s => s.id !== id));
              Alert.alert("Succès", "Secrétaire supprimée.");
            } catch (error) {
              Alert.alert("Erreur", error.response?.data?.message ?? "Impossible de supprimer.");
            }
          },
        },
      ]
    );
  };

  // ── Stats ──
  const actives  = secretaires.filter(s => s.is_active).length;
  const inactives = secretaires.filter(s => !s.is_active).length;

  // ── Loading ──
  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );

  return (
    <>
      {/* Modal Ajouter */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle secrétaire</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={formData.prenom}
              onChangeText={t => setFormData({ ...formData, prenom: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Nom"
              value={formData.nom}
              onChangeText={t => setFormData({ ...formData, nom: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={t => setFormData({ ...formData, email: t })}
            />
            <View style={styles.mdpContainer}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Mot de passe"
                value={formData.mdp}
                secureTextEntry={!showMdp}
                onChangeText={t => setFormData({ ...formData, mdp: t })}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowMdp(!showMdp)}
              >
                <Ionicons
                  name={showMdp ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={ajouterSecretaire}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.saveBtnText}>Créer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Accueil')}
          >
            <Ionicons name="arrow-back-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes Secrétaires</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="person-add-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#10B981"]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: "#10B981" }]}>
            <Text style={styles.statNumber}>{actives}</Text>
            <Text style={styles.statLabel}>Actives</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#EF4444" }]}>
            <Text style={styles.statNumber}>{inactives}</Text>
            <Text style={styles.statLabel}>Révoquées</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#3B82F6" }]}>
            <Text style={styles.statNumber}>{secretaires.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#3B82F6" />
          <Text style={styles.infoBoxText}>
            Utilisez le bouton toggle pour activer ou révoquer l'accès d'une secrétaire instantanément.
          </Text>
        </View>

        {/* Liste */}
        {secretaires.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>Aucune secrétaire</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Ajouter une secrétaire</Text>
            </TouchableOpacity>
          </View>
        ) : (
          secretaires.map(s => (
            <SecretaireCard
              key={s.id}
              secretaire={s}
              onToggle={toggleAcces}
              onDelete={supprimerSecretaire}
            />
          ))
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
  header:        { backgroundColor: "#10B981", paddingTop: Platform.OS === "ios" ? 50 : 40, paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle:   { fontSize: 20, fontWeight: "600", color: "#FFF", flex: 1, textAlign: "center" },
  backButton:    { padding: 8 },
  addButton:     { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },

  // Stats
  statsRow:    { flexDirection: "row", gap: 10, marginBottom: 16, marginTop: 8 },
  statCard:    { flex: 1, backgroundColor: "#FFF", borderRadius: 12, padding: 14, borderLeftWidth: 4, elevation: 2, alignItems: "center" },
  statNumber:  { fontSize: 22, fontWeight: "700", color: "#0F172A" },
  statLabel:   { fontSize: 12, color: "#64748B", marginTop: 2 },

  // Info box
  infoBox:     { flexDirection: "row", backgroundColor: "#EFF6FF", borderRadius: 10, padding: 12, marginBottom: 16, gap: 8, alignItems: "flex-start" },
  infoBoxText: { flex: 1, fontSize: 13, color: "#3B82F6", lineHeight: 18 },

  // Card
  card:         { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", elevation: 2 },
  cardInactive: { opacity: 0.65 },
  cardLeft:     { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar:       { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText:   { color: "#FFF", fontSize: 16, fontWeight: "700" },
  cardInfo:     { flex: 1 },
  cardName:     { fontSize: 15, fontWeight: "600", color: "#0F172A", marginBottom: 2 },
  cardEmail:    { fontSize: 12, color: "#64748B", marginBottom: 6 },
  statusBadge:  { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start" },
  statusActive: { backgroundColor: "#D1FAE5" },
  statusInactive: { backgroundColor: "#FEE2E2" },
  statusText:   { fontSize: 11, fontWeight: "600" },
  cardActions:  { flexDirection: "row", alignItems: "center", gap: 8 },
  deleteBtn:    { padding: 8, backgroundColor: "#FEE2E2", borderRadius: 10 },

  // Empty
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyText:      { fontSize: 16, color: "#94A3B8", marginTop: 12, marginBottom: 20 },
  emptyButton:    { backgroundColor: "#10B981", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyButtonText: { color: "#FFF", fontWeight: "600", fontSize: 14 },

  // Modal
  modalOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent:  { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24 },
  modalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle:    { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  input:         { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14, color: "#0F172A", backgroundColor: "#F8FAFC" },
  mdpContainer:  { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, backgroundColor: "#F8FAFC", marginBottom: 12, paddingRight: 12 },
  eyeBtn:        { padding: 8 },
  modalButtons:  { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn:     { flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 14, alignItems: "center" },
  cancelBtnText: { color: "#64748B", fontWeight: "600" },
  saveBtn:       { flex: 1, backgroundColor: "#10B981", borderRadius: 10, padding: 14, alignItems: "center" },
  saveBtnText:   { color: "#FFF", fontWeight: "600", fontSize: 15 },
});