import { useEffect, useState, useRef, useCallback } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Modal,
  TextInput, Platform, AppState,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from "../../api/api";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { confirmLogout } from "../../navigation/AppNavigate";
import { subscribeToChannel, unsubscribeFromChannel } from '../../src/utils/Echo';
import ConversationList from "../ConversationList";
import { DrawerActions } from '@react-navigation/native';
// ============================================================
// Fonction utilitaire pour extraire le nom du médecin depuis donnees_json
// ============================================================
const getMedecinName = (rdv) => {
  if (rdv.medecin?.donnees_json) {
    try {
      const data = typeof rdv.medecin.donnees_json === 'string' 
        ? JSON.parse(rdv.medecin.donnees_json) 
        : rdv.medecin.donnees_json;
      if (data.prenom && data.nom) {
        return `Dr. ${data.prenom} ${data.nom}`;
      }
    } catch(e) {}
  }
  if (rdv.nom_medecin && rdv.nom_medecin !== 'Médecin') {
    return `Dr. ${rdv.nom_medecin}`;
  }
  return "un médecin";
};

// ============================================================
// Composant modal des notifications (identique à votre code)
// ============================================================
function NotificationsModal({
  visible, onClose, onClear,
  upcomingRendezVous, notificationsList,
  navigation,
}) {
  const getRendezVousId = (item) => {
    if (typeof item.id === 'number') return item.id;
    if (typeof item.id === 'string') {
      const parts = item.id.split('_');
      if (parts.length > 1) return parseInt(parts[0], 10);
      return parseInt(item.id, 10);
    }
    return null;
  };
  const handlePress = (item) => {
    onClose();
    const rdvId = getRendezVousId(item);
    navigation.navigate('RendezVousStack', { rdvId });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.notificationsModalContainer}>
        <View style={styles.notificationsHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#3B82F6" />
          </TouchableOpacity>
          <Text style={styles.notificationsTitle}>Notifications</Text>
          <TouchableOpacity onPress={onClear}>
            <Text style={styles.clearText}>Tout effacer</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.notificationsList}>
          {upcomingRendezVous.length > 0 && (
            <View style={styles.upcomingCard}>
              <Text style={styles.upcomingTitle}>📅 Mes Rendez-vous </Text>
              {upcomingRendezVous.map((rdv, index) => (
                <TouchableOpacity key={index} style={styles.upcomingItem} onPress={() => handlePress(rdv)}>
                  <Ionicons name={rdv.type === 'today' ? 'today' : 'time'} size={20}
                    color={rdv.type === 'today' ? '#EF4444' : '#F59E0B'} />
                  <Text style={styles.upcomingText}>{rdv.message}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {notificationsList.length === 0 && upcomingRendezVous.length === 0 ? (
            <View style={styles.noNotifications}>
              <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
              <Text style={styles.noNotificationsText}>Aucune notification</Text>
            </View>
          ) : (
            notificationsList.map((notif, index) => (
              <TouchableOpacity key={index}
                style={[styles.notificationItem, notif.type === 'urgent' && styles.urgentNotification, notif.type === 'today' && styles.todayNotification]}
                onPress={() => handlePress(notif)}>
                <View style={styles.notificationIcon}>
                  <Ionicons name={notif.type === 'urgent' ? 'alert-circle' : notif.type === 'today' ? 'calendar' : 'notifications'}
                    size={24} color={notif.type === 'urgent' ? '#EF4444' : notif.type === 'today' ? '#F59E0B' : '#3B82F6'} />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notif.titre}</Text>
                  <Text style={styles.notificationMessage}>{notif.message}</Text>
                  <Text style={styles.notificationTime}>
                    {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============================================================
// Composant principal Profile (patient)
// ============================================================
export default function Profile({ navigation }) {
  const notifiedIdsRef      = useRef(new Set());
  const notificationInterval = useRef(null);
  const channelRef           = useRef(null);

  const [user, setUser]                       = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [modalVisible, setModalVisible]       = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationsList, setNotificationsList] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [upcomingRendezVous, setUpcomingRendezVous] = useState([]);
  const [showConversations, setShowConversations] = useState(false); // 👈 Pour la messagerie
  const [formData, setFormData] = useState({
    prenom: "", nom: "", telephone: "",
    adresse: "", age: "", dateNaissance: "", sexe: "",
  });

  const hasNotification = notificationCount > 0;

  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());
  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Accueil');
  };

  const addNotification = useCallback((notification) => {
    setNotificationsList(prev => {
      if (prev.some(n => n.id === notification.id)) return prev;
      return [notification, ...prev].slice(0, 50);
    });
    setNotificationCount(prev => prev + 1);
  }, []);

  // Vérification des rendez-vous à venir
  const checkUpcomingRendezVous = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !user) return;

      const patientId = user.patient?.id;
      let rendezVousList = [];

      if (patientId) {
        try {
          const response = await API.get(`/rendezvous/patient/${patientId}`);
          const data = response.data;
          if (data?.rendez_vous && Array.isArray(data.rendez_vous)) rendezVousList = data.rendez_vous;
          else if (Array.isArray(data)) rendezVousList = data;
        } catch (err) {}
      }

      if (rendezVousList.length === 0) {
        try {
          const response = await API.get('/rendezvous');
          const data = response.data;
          let all = data?.rendez_vous && Array.isArray(data.rendez_vous) ? data.rendez_vous : (Array.isArray(data) ? data : null);
          if (Array.isArray(all)) {
            rendezVousList = patientId ? all.filter(rdv => rdv.id_patient === patientId) : all;
          }
        } catch (err) {}
      }

      if (rendezVousList.length === 0) {
        setUpcomingRendezVous([]);
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const upcoming = [];

      rendezVousList.forEach(rdv => {
        if (!rdv.date || !rdv.heure) return;
        if (rdv.etat === 'refusé' || rdv.etat === 'annulé') return;

        const rdvDate = new Date(`${rdv.date}T${rdv.heure}`);
        if (isNaN(rdvDate.getTime())) return;

        const rdvDay = new Date(rdvDate.getFullYear(), rdvDate.getMonth(), rdvDate.getDate());
        const hoursDiff = (rdvDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const timeStr = rdvDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const medecinName = getMedecinName(rdv);

        if (rdvDay.getTime() === today.getTime()) {
          if (hoursDiff > -1) {
            upcoming.push({ ...rdv, type: "today", message: `Rendez-vous avec ${medecinName} aujourd'hui à ${timeStr}` });
          }
          const todayKey = `today_${rdv.id}`;
          if (!notifiedIdsRef.current.has(todayKey)) {
            notifiedIdsRef.current.add(todayKey);
            addNotification({
              id: todayKey,
              titre: "📅 Rendez-vous aujourd'hui",
              message: `Vous avez un rendez-vous avec ${medecinName} aujourd'hui à ${timeStr}.`,
              type: "today",
            });
          }
          const urgentKey = `urgent_${rdv.id}`;
          if (hoursDiff <= 1 && hoursDiff > 0 && !notifiedIdsRef.current.has(urgentKey)) {
            notifiedIdsRef.current.add(urgentKey);
            addNotification({
              id: urgentKey,
              titre: "⚠️ Rendez-vous imminent",
              message: `Votre rendez-vous avec ${medecinName} à ${timeStr} commence dans moins d'une heure !`,
              type: "urgent",
            });
            Alert.alert("⚠️ Rendez-vous imminent", `Votre rendez-vous avec ${medecinName} à ${timeStr} commence bientôt !`);
          }
        } else if (hoursDiff > 0 && hoursDiff <= 24) {
          upcoming.push({ ...rdv, type: "upcoming", message: `Rendez-vous avec ${medecinName} le ${rdv.date} à ${timeStr}` });
          const upcomingKey = `upcoming_${rdv.id}`;
          if (hoursDiff <= 1 && !notifiedIdsRef.current.has(upcomingKey)) {
            notifiedIdsRef.current.add(upcomingKey);
            addNotification({
              id: upcomingKey,
              titre: "🔔 Rappel rendez-vous",
              message: `Votre rendez-vous avec ${medecinName} commence dans ${Math.floor(hoursDiff * 60)} minutes.`,
              type: "reminder",
            });
          }
        }
      });

      setUpcomingRendezVous(upcoming);
    } catch (error) {
      console.error("❌ Erreur vérification rendez-vous:", error.message);
    }
  }, [user, addNotification]);

  const startPeriodicCheck = useCallback(() => {
    if (notificationInterval.current) clearInterval(notificationInterval.current);
    notificationInterval.current = setInterval(checkUpcomingRendezVous, 60000);
  }, [checkUpcomingRendezVous]);

  // WebSocket (Pusher)
  useEffect(() => {
    let isMounted = true;
    const setupWebSocket = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (!userData || !isMounted) return;
        const currentUser = JSON.parse(userData);
        if (currentUser.role !== 'patient') return;
        const channel = await subscribeToChannel(
          `patient.${currentUser.id}`,
          'rappel.rendez-vous',
          (data) => {
            if (!isMounted) return;
            const medName = data.medecin_nom ? `Dr. ${data.medecin_nom}` : "un médecin";
            addNotification({
              id: `pusher_${Date.now()}`,
              titre: data.titre || 'Rappel rendez-vous',
              message: data.corps || `Vous avez un rendez-vous avec ${medName} prévu.`,
              type: 'pusher',
              data,
            });
            Alert.alert(
              data.titre || 'Rappel rendez-vous',
              data.corps || `Vous avez un rendez-vous avec ${medName} prévu.`,
              [
                { text: 'OK', style: 'cancel' },
                { text: 'Voir détails', onPress: () => navigation.navigate('RendezVousStack') },
              ]
            );
          }
        );
        channelRef.current = channel;
        console.log('✅ WebSocket connecté');
      } catch (error) {
        console.error('Erreur WebSocket:', error);
      }
    };
    setupWebSocket();
    return () => {
      isMounted = false;
      if (channelRef.current) unsubscribeFromChannel(channelRef.current);
    };
  }, [navigation, addNotification]);

  // Chargement initial
  useEffect(() => {
    const loadData = async () => {
      await fetchUser();
      await checkUpcomingRendezVous();
      startPeriodicCheck();
    };
    loadData();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkUpcomingRendezVous();
    });
    return () => {
      if (notificationInterval.current) clearInterval(notificationInterval.current);
      subscription.remove();
    };
  }, [user?.id]);

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { navigation.replace("Login"); return; }
      const response = await API.get("/me");
      const userData = response.data?.user ?? response.data;
      setUser(userData);
    } catch (error) {
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUser();
    await checkUpcomingRendezVous();
    setRefreshing(false);
  };

  const openEditModal = () => {
    if (!user) return;
    setFormData({
      prenom: user.prenom ?? "", nom: user.nom ?? "",
      telephone: user.telephone ?? "", adresse: user.adresse ?? "",
      age: user.age ? String(user.age) : "",
      dateNaissance: user.patient?.dateNaissance ?? "",
      sexe: user.patient?.sexe ?? "",
    });
    setModalVisible(true);
  };

  const modifierProfile = async () => {
    try {
      const response = await API.put(`/users/${user.id}`, {
        prenom: formData.prenom, nom: formData.nom,
        telephone: formData.telephone, adresse: formData.adresse,
        age: formData.age ? parseInt(formData.age, 10) : null,
        dateNaissance: formData.dateNaissance || null,
        sexe: formData.sexe || null,
      });
      setUser(response.data.user ?? response.data);
      setModalVisible(false);
      Alert.alert("Succès", "Profil modifié avec succès");
    } catch (error) {
      Alert.alert("Erreur", "Impossible de modifier le profil");
    }
  };

  const handleClearNotifications = () => {
    setNotificationsList([]);
    setNotificationCount(0);
  };

  const getInitials = () => {
    if (!user) return "";
    return `${user.prenom?.charAt(0) || ""}${user.nom?.charAt(0) || ""}`.toUpperCase();
  };

  const getAvatarColor = () => {
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
    return colors[(user?.id ?? 0) % colors.length];
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
      {/* Modal des notifications */}
      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        onClear={handleClearNotifications}
        upcomingRendezVous={upcomingRendezVous}
        notificationsList={notificationsList}
        navigation={navigation}
      />

      {/* Modal de messagerie (ConversationList) */}
      <Modal
        visible={showConversations}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowConversations(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowConversations(false)}>
              <Ionicons name="arrow-back" size={24} color="#3B82F6" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Messages</Text>
            <View style={{ width: 40 }} />
          </View>
          <ConversationList
            currentUser={user}
            onSelect={(conversation) => {
              setShowConversations(false);
              navigation.navigate("PrivateChat", {
                currentUserId: user.id,
                otherUser: {
                  id: conversation.user_id,
                  name: conversation.user_name,
                },
              });
            }}
          />
        </View>
      </Modal>

      {/* Modal d'édition du profil */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier le profil</Text>
            <TextInput style={styles.input} placeholder="Prénom" value={formData.prenom} onChangeText={(t) => setFormData({ ...formData, prenom: t })} />
            <TextInput style={styles.input} placeholder="Nom" value={formData.nom} onChangeText={(t) => setFormData({ ...formData, nom: t })} />
            <TextInput style={styles.input} placeholder="Téléphone" value={formData.telephone} keyboardType="phone-pad" onChangeText={(t) => setFormData({ ...formData, telephone: t })} />
            <TextInput style={styles.input} placeholder="Adresse" value={formData.adresse} onChangeText={(t) => setFormData({ ...formData, adresse: t })} />
            <TextInput style={styles.input} placeholder="Âge" value={formData.age} keyboardType="numeric" onChangeText={(t) => setFormData({ ...formData, age: t })} />
            <TextInput style={styles.input} placeholder="Date de naissance (YYYY-MM-DD)" value={formData.dateNaissance} onChangeText={(t) => setFormData({ ...formData, dateNaissance: t })} />
            <TextInput style={styles.input} placeholder="Sexe (homme/femme)" value={formData.sexe} onChangeText={(t) => setFormData({ ...formData, sexe: t })} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={styles.saveButton} onPress={modifierProfile}><Text style={styles.buttonText}>Enregistrer</Text></TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.buttonText}>Annuler</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mon Profil</Text>
          <View style={styles.headerRight}>
            {/* Bouton messages */}
            <TouchableOpacity onPress={() => setShowConversations(true)} style={styles.iconButton}>
              <Ionicons name="chatbubbles-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            {/* Bouton menu (drawer) */}
            <TouchableOpacity onPress={openDrawer} style={styles.iconButton}>
              <Ionicons name="menu-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            {/* Bouton notifications */}
            <TouchableOpacity style={styles.notificationButton} onPress={() => setShowNotifications(true)}>
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              {hasNotification && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.header}><View style={styles.headerBackground} /></View>

        <View style={styles.profileSection}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.avatarInitials}>{getInitials()}</Text>
          </View>
          <Text style={styles.userName}>{user.prenom} {user.nom}</Text>
          <Text style={styles.userRole}>{user.role === "patient" ? "👤 Patient" : "👨‍⚕️ Médecin"}</Text>
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
            { icon: "gift-outline", label: "Date de naissance", value: user.patient?.dateNaissance ? new Date(user.patient.dateNaissance).toLocaleDateString("fr-FR") : null },
            { icon: user.patient?.sexe === "homme" ? "male-outline" : "female-outline", label: "Sexe", value: user.patient?.sexe === "homme" ? "Homme" : user.patient?.sexe === "femme" ? "Femme" : null },
            { icon: "time-outline", label: "Membre depuis", value: user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }) : "Récent" },
          ].map(({ icon, label, value }) => (
            <View style={styles.infoRow} key={label}>
              <View style={styles.infoIcon}><Ionicons name={icon} size={20} color="#3B82F6" /></View>
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
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => confirmLogout(navigation)}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

// ============================================================
// Styles
// ============================================================
const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#F5F7FA", paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F7FA" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#64748B" },
  customHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#3B82F6", paddingTop: Platform.OS === "ios" ? 50 : 20, paddingBottom: 15, paddingHorizontal: 16 },
  backButton: { padding: 8, width: 40 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#FFFFFF", flex: 1, textAlign: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: { padding: 8 },
  menuButton: { padding: 8 },
  notificationButton: { padding: 8, position: "relative" },
  notificationBadge: { position: "absolute", top: 2, right: 2, backgroundColor: "#EF4444", borderRadius: 10, minWidth: 18, height: 18, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  notificationBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },

  upcomingCard: { backgroundColor: "#FFFFFF", marginHorizontal: 16, marginTop: 16, marginBottom: 8, padding: 16, borderRadius: 16, elevation: 3 },
  upcomingTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A", marginBottom: 12 },
  upcomingItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  upcomingText: { fontSize: 14, color: "#475569", flex: 1 },

  notificationsModalContainer: { flex: 1, backgroundColor: "#F5F7FA" },
  notificationsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingTop: Platform.OS === "ios" ? 50 : 16 },
  notificationsTitle: { fontSize: 18, fontWeight: "600", color: "#0F172A" },
  clearText: { color: "#EF4444", fontSize: 14 },
  notificationsList: { flex: 1 },
  notificationItem: { flexDirection: "row", backgroundColor: "#FFFFFF", padding: 16, marginHorizontal: 16, marginVertical: 8, borderRadius: 12, elevation: 2 },
  urgentNotification: { backgroundColor: "#FEF2F2", borderLeftWidth: 3, borderLeftColor: "#EF4444" },
  todayNotification: { backgroundColor: "#FFFBEB", borderLeftWidth: 3, borderLeftColor: "#F59E0B" },
  notificationIcon: { marginRight: 12, justifyContent: "center" },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 14, fontWeight: "600", color: "#0F172A", marginBottom: 4 },
  notificationMessage: { fontSize: 13, color: "#475569", marginBottom: 4 },
  notificationTime: { fontSize: 11, color: "#94A3B8" },
  noNotifications: { alignItems: "center", justifyContent: "center", paddingTop: 100 },
  noNotificationsText: { marginTop: 16, fontSize: 16, color: "#94A3B8" },

  header: { height: 100, position: "relative" },
  headerBackground: { position: "absolute", top: 0, left: 0, right: 0, height: 100, backgroundColor: "#3B82F6", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  profileSection: { alignItems: "center", marginTop: -50, marginBottom: 20 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
  avatarInitials: { fontSize: 36, fontWeight: "700", color: "#FFFFFF" },
  userName: { fontSize: 24, fontWeight: "700", color: "#0F172A", marginTop: 12, marginBottom: 4 },
  userRole: { fontSize: 16, color: "#64748B", marginBottom: 12 },
  badgeContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 20 },
  badge: { flexDirection: "row", alignItems: "center", backgroundColor: "#EFF6FF", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 8 },
  badgeText: { color: "#1E293B", fontSize: 14, fontWeight: "500" },
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 20, elevation: 3 },
  infoTitle: { fontSize: 18, fontWeight: "600", color: "#0F172A", marginBottom: 20 },
  infoRow: { flexDirection: "row", marginBottom: 16 },
  infoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  infoContent: { flex: 1, justifyContent: "center" },
  infoLabel: { fontSize: 12, color: "#64748B", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 16, color: "#0F172A", fontWeight: "500" },
  actionsContainer: { flexDirection: "row", justifyContent: "center", marginHorizontal: 20, marginBottom: 20 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginHorizontal: 6, borderWidth: 1, borderColor: "#E2E8F0", gap: 8 },
  actionButtonText: { color: "#1E293B", fontSize: 14, fontWeight: "500" },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#EF4444", paddingVertical: 16, marginHorizontal: 20, borderRadius: 16, gap: 8, elevation: 4 },
  logoutButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  versionText: { textAlign: "center", color: "#94A3B8", fontSize: 12, marginTop: 20 },

  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: "90%", backgroundColor: "#fff", padding: 20, borderRadius: 15 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 10, marginBottom: 10 },
  saveButton: { flex: 1, backgroundColor: "#3B82F6", padding: 12, borderRadius: 10, alignItems: "center" },
  cancelButton: { flex: 1, backgroundColor: "#EF4444", padding: 12, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingTop: Platform.OS === "ios" ? 50 : 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
});