import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { confirmLogout } from "../../navigation/AppNavigate";
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from "../../api/api";
import Ionicons from 'react-native-vector-icons/Ionicons';
const { width } = Dimensions.get("window");

export default function ProfileMedecin({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [specialiteNom, setSpecialiteNom] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
    age: "",
  });

  const openEditModal = () => {
    if (!user) {
      Alert.alert("Erreur", "Utilisateur non chargé");
      return;
    }
    setFormData({
      prenom: user.prenom ?? "",
      nom: user.nom ?? "",
      email: user.email ?? "",
      telephone: user.telephone ?? "",
      adresse: user.adresse ?? "",
      age: user.age ? String(user.age) : "",
    });
    setModalVisible(true);
  };

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      console.log("[fetchUser] token:", token ? "OK" : "NULL");

      if (!token) {
        navigation.replace("Login");
        return;
      }

      const response = await API.get("/me");

      console.log("[fetchUser] status:", response.status);
      console.log("[fetchUser] data:", JSON.stringify(response.data));

      const userData = response.data?.user ?? response.data;
      console.log("[fetchUser] userData.id:", userData?.id);
      console.log("[fetchUser] userData.prenom:", userData?.prenom);

      if (!userData || !userData.id) {
        console.error("[fetchUser] userData invalide:", userData);
        setUser(null);
        return;
      }

      setUser(userData);

      if (userData?.medecin?.specialite_id) {
        await fetchSpecialite(userData.medecin.specialite_id);
      }

    } catch (error) {
      console.error("[fetchUser] ERREUR:", error.message);
      console.error("[fetchUser] status:", error.response?.status);
      console.error("[fetchUser] data:", JSON.stringify(error.response?.data));
      console.error("[fetchUser] requiresLogout:", error.requiresLogout);

      if (error.response?.status === 401 || error.requiresLogout) {
        await AsyncStorage.removeItem("token");
        Alert.alert("Session expirée", "Veuillez vous reconnecter.", [
          { text: "OK", onPress: () => navigation.replace("Login") },
        ]);
      } else {
        Alert.alert("Erreur", "Impossible de charger le profil : " + error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSpecialite = async (specialiteId) => {
    try {
      const response = await API.get(`/specialite/${specialiteId}`);
      setSpecialiteNom(response.data.nom_specialite);
    } catch {
      try {
        const all = await API.get("/specialite");
        const found = all.data.find((s) => s.id === specialiteId);
        if (found) setSpecialiteNom(found.nom_specialite);
      } catch {
        console.log("Impossible de charger la spécialité");
      }
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUser();
  };

  const ModifierProfile = async () => {
    console.log("URL complète:", API.defaults.baseURL + `/users/${user.id}`);
  console.log("user.id:", user.id);
    try {
      console.log("[ModifierProfile] PUT /users/" + user.id);
      console.log("[ModifierProfile] body:", JSON.stringify({
        prenom: formData.prenom,
        nom: formData.nom,
        email: formData.email,
        telephone: formData.telephone,
        adresse: formData.adresse,
        age: formData.age ? parseInt(formData.age, 10) : null,
      }));

      const response = await API.put(`/users/${user.id}`, {
        prenom: formData.prenom,
        nom: formData.nom,
        email: formData.email,
        telephone: formData.telephone,
        adresse: formData.adresse,
        age: formData.age ? parseInt(formData.age, 10) : null,
      });

      console.log("[ModifierProfile] réponse:", JSON.stringify(response.data));

      const updatedUser = response.data.user ?? response.data;
      setUser(updatedUser);

      setModalVisible(false);
      Alert.alert("Succès", "Profil modifié avec succès");

    } catch (error) {
      console.error("[ModifierProfile] ERREUR:", error.message);
      console.error("[ModifierProfile] status:", error.response?.status);
      console.error("[ModifierProfile] data:", JSON.stringify(error.response?.data));
      Alert.alert(
        "Erreur",
        error.response?.data?.message ?? "Impossible de modifier le profil"
      );
    }
  };

const handleLogout = () => confirmLogout(navigation);

  const getInitials = () => {
    if (!user) return "";
    return `${user.prenom?.charAt(0) || ""}${user.nom?.charAt(0) || ""}`.toUpperCase();
  };

  const getAvatarColor = () => {
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];
    if (!user?.id) return colors[0];
    return colors[user.id % colors.length];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#EF4444" />
        <Text style={styles.errorText}>Aucune donnée utilisateur</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.replace("Login")}
        >
          <Text style={styles.retryButtonText}>Se reconnecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier Profil</Text>

            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={formData.prenom}
              onChangeText={(t) => setFormData({ ...formData, prenom: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Nom"
              value={formData.nom}
              onChangeText={(t) => setFormData({ ...formData, nom: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={(t) => setFormData({ ...formData, email: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Téléphone"
              value={formData.telephone}
              keyboardType="phone-pad"
              onChangeText={(t) => setFormData({ ...formData, telephone: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Adresse"
              value={formData.adresse}
              onChangeText={(t) => setFormData({ ...formData, adresse: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Âge"
              value={formData.age}
              keyboardType="numeric"
              onChangeText={(t) => setFormData({ ...formData, age: t })}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={styles.saveButton} onPress={ModifierProfile}>
                <Text style={styles.buttonText}>Enregistrer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#10B981"]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: "#10B981" }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.menuButton} onPress={() => navigation.openDrawer()}>
              <Ionicons name="menu" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mon Profil</Text>
            <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
              <Ionicons name="create-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileSection}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.avatarInitials}>{getInitials()}</Text>
          </View>
          <Text style={styles.userName}>Dr. {user.prenom} {user.nom}</Text>
          <Text style={styles.specialite}>
            {specialiteNom || user.medecin?.specialite?.nom_specialite || "Médecin"}
          </Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Ionicons name="mail-outline" size={16} color="#10B981" />
              <Text style={styles.badgeText}>{user.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📍 Coordonnées</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{user.telephone || "Non renseigné"}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="location-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Adresse</Text>
              <Text style={styles.infoValue}>{user.adresse || "Non renseigné"}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Âge</Text>
              <Text style={styles.infoValue}>
                {user.age ? `${user.age} ans` : "Non renseigné"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={openEditModal}>
            <Ionicons name="create-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Modifier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.settingsButton]}
            onPress={() => Alert.alert("Info", "Paramètres - À venir")}
          >
            <Ionicons name="settings-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Paramètres</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFF" />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#F5F7FA", paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F7FA" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#64748B" },
  errorText: { fontSize: 16, color: "#64748B", marginTop: 10 },
  retryButton: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: "#10B981", borderRadius: 8 },
  retryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },
  header: { paddingTop: 50, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  menuButton: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#FFFFFF" },
  editButton: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  profileSection: { alignItems: "center", marginTop: -40, marginBottom: 20 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "#FFFFFF", justifyContent: "center", alignItems: "center", marginBottom: 10 },
  avatarInitials: { fontSize: 28, fontWeight: "700", color: "#FFFFFF" },
  userName: { fontSize: 22, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  specialite: { fontSize: 14, color: "#10B981", fontWeight: "500", marginBottom: 10 },
  badgeContainer: { flexDirection: "row", justifyContent: "center", paddingHorizontal: 20 },
  badge: { flexDirection: "row", alignItems: "center", backgroundColor: "#E6F7E6", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, gap: 6 },
  badgeText: { color: "#10B981", fontSize: 13, fontWeight: "500" },
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 20, shadowColor: "#1E293B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  infoTitle: { fontSize: 18, fontWeight: "600", color: "#0F172A", marginBottom: 20 },
  infoRow: { flexDirection: "row", marginBottom: 16 },
  infoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#E6F7E6", justifyContent: "center", alignItems: "center", marginRight: 12 },
  infoContent: { flex: 1, justifyContent: "center" },
  infoLabel: { fontSize: 12, color: "#64748B", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 15, color: "#0F172A", fontWeight: "500" },
  actionsContainer: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 15, gap: 10 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#10B981", paddingVertical: 14, borderRadius: 12, gap: 8, shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  settingsButton: { backgroundColor: "#3B82F6" },
  actionButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#EF4444", paddingVertical: 14, marginHorizontal: 20, borderRadius: 12, gap: 8, shadowColor: "#EF4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  logoutButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  versionText: { textAlign: "center", color: "#94A3B8", fontSize: 12, marginTop: 20 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: "90%", backgroundColor: "#fff", padding: 20, borderRadius: 15 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 10, marginBottom: 10 },
  saveButton: { flex: 1, backgroundColor: "#10B981", padding: 12, borderRadius: 10, alignItems: "center" },
  cancelButton: { flex: 1, backgroundColor: "#EF4444", padding: 12, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
});