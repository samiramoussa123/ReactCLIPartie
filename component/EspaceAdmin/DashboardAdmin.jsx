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
  Platform,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from "../../api/api";
import Ionicons from "react-native-vector-icons/Ionicons";
import { confirmLogout } from "../../navigation/AppNavigate";
export default function DashboardAdmin({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    medecins: 0,
    patients: 0,
    medecinEnAttente: 0,
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.replace("Login");
        return;
      }

      const response = await API.get("/me");
      const userData = response.data?.user ?? response.data;

      if (userData?.role !== "admin") {
        Alert.alert("Accès refusé", "Vous n'êtes pas administrateur.");
        await AsyncStorage.removeItem("token");
        navigation.replace("Login");
        return;
      }

      setUser(userData);
      await fetchStats();

    } catch (error) {
      console.error("[Admin] Erreur fetchUser:", error.message);
      if (error.response?.status === 401 || error.requiresLogout) {
        await AsyncStorage.removeItem("token");
        navigation.replace("Login");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [statsRes, enAttenteRes] = await Promise.all([
        API.get("/admin/medecins/stats"),
        API.get("/admin/medecins/en-attente"),
      ]);

      setStats({
        medecins: statsRes.data?.stats?.total ?? statsRes.data?.total_medecins ?? 0,
        patients: statsRes.data?.stats?.patients ?? statsRes.data?.total_patients ?? 0,
        medecinEnAttente:
          enAttenteRes.data?.count ??
          enAttenteRes.data?.medecins?.length ??
          0,
      });
    } catch (error) {
      console.error("[Admin] Erreur fetchStats:", error.message);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUser();
  };

const handleLogout = () => confirmLogout(navigation);

  const getInitials = () => {
    if (!user) return "A";
    return `${user.prenom?.charAt(0) || ""}${user.nom?.charAt(0) || ""}`.toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!user) return null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#DC2626"]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.openDrawer?.()}
          >
            <Ionicons name="menu" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard Admin</Text>
          <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* PROFIL */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <Text style={styles.userName}>{user.prenom} {user.nom}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#DC2626" />
          <Text style={styles.roleText}>Administrateur</Text>
        </View>
        <View style={styles.emailBadge}>
          <Ionicons name="mail-outline" size={14} color="#64748B" />
          <Text style={styles.emailText}>{user.email}</Text>
        </View>
      </View>

      {/* STATISTIQUES */}
      <Text style={styles.sectionTitle}>📊 Statistiques</Text>
      <View style={styles.statsRow}>

        <View style={[styles.statCard, { borderTopColor: "#10B981" }]}>
          <Ionicons name="people" size={28} color="#10B981" />
          <Text style={styles.statNumber}>{stats.medecins}</Text>
          <Text style={styles.statLabel}>Médecins</Text>
        </View>

        <View style={[styles.statCard, { borderTopColor: "#3B82F6" }]}>
          <Ionicons name="person" size={28} color="#3B82F6" />
          <Text style={styles.statNumber}>{stats.patients}</Text>
          <Text style={styles.statLabel}>Patients</Text>
        </View>

        <View style={[styles.statCard, { borderTopColor: "#F59E0B" }]}>
          <Ionicons name="time" size={28} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats.medecinEnAttente}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>

      </View>

      {/* ACTIONS RAPIDES */}
      <Text style={styles.sectionTitle}>⚡ Actions rapides</Text>
      <View style={styles.actionsContainer}>

        {/* ✅ Valider médecins → GestionMedecin */}
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#FEF3C7" }]}
          onPress={() => navigation.navigate("GestionMedecin")}
        >
          <Ionicons name="checkmark-circle-outline" size={32} color="#F59E0B" />
          <Text style={[styles.actionText, { color: "#F59E0B" }]}>
            Valider médecins
          </Text>
          {stats.medecinEnAttente > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.medecinEnAttente}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ✅ Tous les médecins → GestionMedecin */}
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#DCFCE7" }]}
          onPress={() => navigation.navigate("GestionMedecin")}
        >
          <Ionicons name="medical-outline" size={32} color="#10B981" />
          <Text style={[styles.actionText, { color: "#10B981" }]}>
            Tous les médecins
          </Text>
        </TouchableOpacity>

        {/* ✅ Tous les patients → GestionPatient */}
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#DBEAFE" }]}
          onPress={() => navigation.navigate("GestionPatient")}
        >
          <Ionicons name="people-outline" size={32} color="#3B82F6" />
          <Text style={[styles.actionText, { color: "#3B82F6" }]}>
            Tous les patients
          </Text>
        </TouchableOpacity>

        {/* ✅ Spécialités → GestionSpecialite */}
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#FCE7F3" }]}
          onPress={() => navigation.navigate("GestionSpecialite")}
        >
          <Ionicons name="list-outline" size={32} color="#EC4899" />
          <Text style={[styles.actionText, { color: "#EC4899" }]}>
            Spécialités
          </Text>
        </TouchableOpacity>

      </View>

      {/* INFOS COMPTE */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>👤 Mon compte</Text>

        {[
          { icon: "call-outline",     label: "Téléphone",     value: user.telephone },
          { icon: "location-outline", label: "Adresse",       value: user.adresse },
          { icon: "calendar-outline", label: "Âge",           value: user.age ? `${user.age} ans` : null },
          {
            icon: "time-outline", label: "Membre depuis",
            value: user.created_at
              ? new Date(user.created_at).toLocaleDateString("fr-FR", {
                  year: "numeric", month: "long", day: "numeric",
                })
              : null,
          },
        ].map(({ icon, label, value }) => (
          <View style={styles.infoRow} key={label}>
            <View style={styles.infoIcon}>
              <Ionicons name={icon} size={18} color="#DC2626" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value || "Non renseigné"}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* LOGOUT */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FFF" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#64748B" },

  header: {
    backgroundColor: "#56b5f4", paddingTop: 50, paddingBottom: 25,
    paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  menuButton: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFF" },
  logoutIcon: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },

  profileSection: { alignItems: "center", marginTop: -30, marginBottom: 24, paddingTop: 10 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#268ddc",
    borderWidth: 3, borderColor: "#FFF", justifyContent: "center",
    alignItems: "center", marginBottom: 10, elevation: 4,
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#FFF" },
  userName: { fontSize: 22, fontWeight: "700", color: "#0F172A", marginBottom: 6 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FEE2E2",
    paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, gap: 6, marginBottom: 6,
  },
  roleText: { color: "#2657dc", fontWeight: "600", fontSize: 13 },
  emailBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  emailText: { color: "#64748B", fontSize: 13 },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginHorizontal: 20, marginBottom: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 20, marginBottom: 24, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: "#FFF", borderRadius: 14, padding: 14,
    alignItems: "center", borderTopWidth: 3, elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6,
  },
  statNumber: { fontSize: 24, fontWeight: "800", color: "#0F172A", marginTop: 6 },
  statLabel: { fontSize: 11, color: "#64748B", marginTop: 2, textAlign: "center" },

  actionsContainer: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 20, gap: 12, marginBottom: 24 },
  actionCard: { width: "47%", borderRadius: 14, padding: 16, alignItems: "center", position: "relative", elevation: 1 },
  actionText: { fontWeight: "600", fontSize: 13, marginTop: 8, textAlign: "center" },
  badge: {
    position: "absolute", top: 8, right: 8, backgroundColor: "#DC2626",
    borderRadius: 10, minWidth: 20, height: 20, justifyContent: "center",
    alignItems: "center", paddingHorizontal: 4,
  },
  badgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },

  infoCard: {
    backgroundColor: "#FFF", borderRadius: 20, padding: 20,
    marginHorizontal: 20, marginBottom: 20, elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8,
  },
  infoTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 16 },
  infoRow: { flexDirection: "row", marginBottom: 14 },
  infoIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "#FEE2E2",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  infoContent: { flex: 1, justifyContent: "center" },
  infoLabel: { fontSize: 11, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 14, color: "#0F172A", fontWeight: "500" },

  logoutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#DC2626", paddingVertical: 14, marginHorizontal: 20,
    borderRadius: 12, gap: 8, elevation: 3, marginBottom: 10,
  },
  logoutText: { color: "#FFF", fontWeight: "600", fontSize: 15 },
  version: { textAlign: "center", color: "#CBD5E1", fontSize: 12, marginBottom: 30 },
});