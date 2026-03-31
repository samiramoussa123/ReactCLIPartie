import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from "../../api/api";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { confirmLogout } from "../../navigation/AppNavigate";
export default function Profile({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    telephone: "",
    adresse: "",
    age: "",
    dateNaissance: "",
    sexe: "",
  });

  const openEditModal = () => {
    if (!user) return;
    setFormData({
      prenom: user.prenom ?? "",
      nom: user.nom ?? "",
      telephone: user.telephone ?? "",
      adresse: user.adresse ?? "",
      age: user.age ? String(user.age) : "",
      dateNaissance: user.patient?.dateNaissance ?? "",
      sexe: user.patient?.sexe ?? "",
    });
    setModalVisible(true);
  };

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.replace("Login");
        return;
      }

      const response = await API.get("/me");
      const userData = response.data?.user ?? response.data;
      setUser(userData);

    } catch (error) {
      console.error("Erreur récupération user:", error.message);
      if (error.requiresLogout || error.response?.status === 401) {
        await AsyncStorage.removeItem("token");
        Alert.alert("Session expirée", "Veuillez vous reconnecter.", [
          { text: "OK", onPress: () => navigation.replace("Login") },
        ]);
      } else {
        Alert.alert("Erreur", "Impossible de récupérer vos informations.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUser(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchUser(); };

  const modifierProfile = async () => {
    try {
      const response = await API.put(`/users/${user.id}`, {
        prenom: formData.prenom,
        nom: formData.nom,
        telephone: formData.telephone,
        adresse: formData.adresse,
        age: formData.age ? parseInt(formData.age, 10) : null,
        dateNaissance: formData.dateNaissance || null,
        sexe: formData.sexe || null,
      });

      const updatedUser = response.data.user ?? response.data;
      setUser(updatedUser);
      setModalVisible(false);
      Alert.alert("Succès", "Profil modifié avec succès");

    } catch (error) {
      console.error("Erreur modification:", error.message);
      console.error("Status:", error.response?.status);
      console.error("Data:", JSON.stringify(error.response?.data));
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
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
    if (!user?.id) return colors[0];
    return colors[user.id % colors.length];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Aucune donnée utilisateur</Text>
        <TouchableOpacity onPress={() => navigation.replace("Login")}>
          <Text style={{ color: "#3B82F6", marginTop: 10 }}>Se reconnecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier le profil</Text>

            <TextInput style={styles.input} placeholder="Prénom" value={formData.prenom}
              onChangeText={(t) => setFormData({ ...formData, prenom: t })} />
            <TextInput style={styles.input} placeholder="Nom" value={formData.nom}
              onChangeText={(t) => setFormData({ ...formData, nom: t })} />
            <TextInput style={styles.input} placeholder="Téléphone" value={formData.telephone}
              keyboardType="phone-pad"
              onChangeText={(t) => setFormData({ ...formData, telephone: t })} />
            <TextInput style={styles.input} placeholder="Adresse" value={formData.adresse}
              onChangeText={(t) => setFormData({ ...formData, adresse: t })} />
            <TextInput style={styles.input} placeholder="Âge" value={formData.age}
              keyboardType="numeric"
              onChangeText={(t) => setFormData({ ...formData, age: t })} />
            <TextInput style={styles.input} placeholder="Date de naissance (YYYY-MM-DD)"
              value={formData.dateNaissance}
              onChangeText={(t) => setFormData({ ...formData, dateNaissance: t })} />
            <TextInput style={styles.input} placeholder="Sexe (homme/femme)"
              value={formData.sexe}
              onChangeText={(t) => setFormData({ ...formData, sexe: t })} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={styles.saveButton} onPress={modifierProfile}>
                <Text style={styles.buttonText}>Enregistrer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerBackground} />
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => Alert.alert("Info", "Fonctionnalité à venir")}
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.avatarInitials}>{getInitials()}</Text>
          </View>
          <Text style={styles.userName}>{user.prenom} {user.nom}</Text>
          <Text style={styles.userRole}>
            {user.role === "patient" ? "👤 Patient" : "👨‍⚕️ Médecin"}
          </Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Ionicons name="mail-outline" size={16} color="#3B82F6" />
              <Text style={styles.badgeText}>{user.email}</Text>
            </View>
          </View>
        </View>


        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Informations personnelles</Text>

          {[
            { icon: "call-outline", label: "Téléphone", value: user.telephone },
            { icon: "location-outline", label: "Adresse", value: user.adresse },
            { icon: "calendar-outline", label: "Âge", value: user.age ? `${user.age} ans` : null },
            {
              icon: "gift-outline", label: "Date de naissance",
              value: user.patient?.dateNaissance
                ? new Date(user.patient.dateNaissance).toLocaleDateString("fr-FR")
                : null
            },
            {
              icon: user.patient?.sexe === "homme" ? "male-outline" : "female-outline",
              label: "Sexe",
              value: user.patient?.sexe === "homme" ? "Homme"
                : user.patient?.sexe === "femme" ? "Femme" : null
            },
            {
              icon: "time-outline", label: "Membre depuis",
              value: user.created_at
                ? new Date(user.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
                : "Récent"
            },
          ].map(({ icon, label, value }) => (
            <View style={styles.infoRow} key={label}>
              <View style={styles.infoIcon}>
                <Ionicons name={icon} size={20} color="#3B82F6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || "Non renseigné"}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={openEditModal}>
            <Ionicons name="create-outline" size={20} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Modifier le profil</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert("Info", "Fonctionnalité à venir")}
          >
            <Ionicons name="options-outline" size={20} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Paramètres</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
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
  header: { height: 150, position: "relative" },
  headerBackground: { position: "absolute", top: 0, left: 0, right: 0, height: 150, backgroundColor: "#3B82F6", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  settingsButton: { position: "absolute", top: 50, right: 20, zIndex: 10, padding: 8 },
  profileSection: { alignItems: "center", marginTop: -50, marginBottom: 20 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
  avatarInitials: { fontSize: 36, fontWeight: "700", color: "#FFFFFF" },
  userName: { fontSize: 24, fontWeight: "700", color: "#0F172A", marginTop: 12, marginBottom: 4 },
  userRole: { fontSize: 16, color: "#64748B", marginBottom: 12 },
  badgeContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 20 },
  badge: { flexDirection: "row", alignItems: "center", backgroundColor: "#EFF6FF", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 8 },
  badgeText: { color: "#1E293B", fontSize: 14, fontWeight: "500" },
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 20, shadowColor: "#1E293B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  infoTitle: { fontSize: 18, fontWeight: "600", color: "#0F172A", marginBottom: 20 },
  infoRow: { flexDirection: "row", marginBottom: 16 },
  infoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  infoContent: { flex: 1, justifyContent: "center" },
  infoLabel: { fontSize: 12, color: "#64748B", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 16, color: "#0F172A", fontWeight: "500" },
  actionsContainer: { flexDirection: "row", justifyContent: "space-around", marginHorizontal: 20, marginBottom: 20 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginHorizontal: 6, borderWidth: 1, borderColor: "#E2E8F0", gap: 8 },
  actionButtonText: { color: "#1E293B", fontSize: 14, fontWeight: "500" },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#EF4444", paddingVertical: 16, marginHorizontal: 20, borderRadius: 16, gap: 8, shadowColor: "#EF4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  logoutButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  versionText: { textAlign: "center", color: "#94A3B8", fontSize: 12, marginTop: 20 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: "90%", backgroundColor: "#fff", padding: 20, borderRadius: 15 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 10, marginBottom: 10 },
  saveButton: { flex: 1, backgroundColor: "#3B82F6", padding: 12, borderRadius: 10, alignItems: "center" },
  cancelButton: { flex: 1, backgroundColor: "#EF4444", padding: 12, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
});