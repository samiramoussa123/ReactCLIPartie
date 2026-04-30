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
import {
  initNotifications,
  showNotification,
  showUrgentNotification,
  scheduleNotification,
  onForegroundNotificationEvent,
  CHANNEL,
} from '../../src/utils/Notificationservice';
import { useNotifiedIds } from '../../src/utils/useNotifiedIds'; // ✅ import hook persistant

// ─────────────────────────────────
// Modal Notifications
// ─────────────────────────────────
function NotificationsModal({ visible, onClose, onClear, upcomingRendezVous, notificationsList, navigation }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.notificationsModalContainer}>
        <View style={styles.notificationsHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#10B981" />
          </TouchableOpacity>
          <Text style={styles.notificationsTitle}>Notifications</Text>
          <TouchableOpacity onPress={onClear}>
            <Text style={styles.clearText}>Tout effacer</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.notificationsList}>
          {upcomingRendezVous.length > 0 && (
            <View style={styles.upcomingCard}>
              <Text style={styles.upcomingTitle}>📅 Rendez-vous à venir</Text>
              {upcomingRendezVous.map((rdv, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.upcomingItem}
                  onPress={() => { onClose(); navigation.navigate('GestionRendezVous'); }}
                >
                  <Ionicons
                    name={rdv.type === 'today' ? 'today' : 'time'}
                    size={20}
                    color={rdv.type === 'today' ? '#EF4444' : '#F59E0B'}
                  />
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
              <TouchableOpacity
                key={index}
                style={[
                  styles.notificationItem,
                  notif.type === 'urgent' && styles.urgentNotification,
                  notif.type === 'today' && styles.todayNotification,
                ]}
                onPress={() => { navigation.navigate('GestionRendezVous'); onClose(); }}
              >
                <View style={styles.notificationIcon}>
                  <Ionicons
                    name={notif.type === 'urgent' ? 'alert-circle' : notif.type === 'today' ? 'calendar' : 'notifications'}
                    size={24}
                    color={notif.type === 'urgent' ? '#EF4444' : notif.type === 'today' ? '#F59E0B' : '#10B981'}
                  />
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

// ─────────────────────────────────
// Composant principal
// ─────────────────────────────────
export default function ProfileMedecin({ navigation }) {
  // ── Refs ──
  const notificationInterval = useRef(null); // ✅ supprimé notifiedIdsRef
  const channelRef           = useRef(null);

  // ── State ──
  const [user, setUser]                             = useState(null);
  const [loading, setLoading]                       = useState(true);
  const [refreshing, setRefreshing]                 = useState(false);
  const [specialiteNom, setSpecialiteNom]           = useState("");
  const [modalVisible, setModalVisible]             = useState(false);
  const [formData, setFormData] = useState({ prenom: "", nom: "", email: "", telephone: "", adresse: "", age: "" });
  const [notificationCount, setNotificationCount]   = useState(0);
  const [notificationsList, setNotificationsList]   = useState([]);
  const [showNotifications, setShowNotifications]   = useState(false);
  const [upcomingRendezVous, setUpcomingRendezVous] = useState([]);

  const hasNotification = notificationCount > 0;

  // ✅ Hook persistant — remplace notifiedIdsRef
const { loadNotifiedIds, hasNotified, markNotified } = useNotifiedIds(user?.id, 'medecin');

  // ── Init Notifee + chargement IDs persistés ──
  useEffect(() => {
    initNotifications();
 if (user?.id) loadNotifiedIds();
   [user?.id];    const unsubscribe = onForegroundNotificationEvent(navigation);
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [navigation]);

  // ── Fetch utilisateur ──
  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { navigation.replace("Login"); return; }
      const response = await API.get("/me");
      const userData = response.data?.user ?? response.data;
      if (!userData?.id) { setUser(null); return; }
      setUser(userData);
      if (userData?.medecin?.specialite_id) await fetchSpecialite(userData.medecin.specialite_id);
    } catch (error) {
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
      } catch { console.log("Impossible de charger la spécialité"); }
    }
  };

  // ── Ajout notification sans doublon ──
  const addNotification = useCallback((notification) => {
    setNotificationsList(prev => {
      if (prev.some(n => n.id === notification.id)) return prev;
      return [notification, ...prev].slice(0, 50);
    });
    setNotificationCount(prev => prev + 1);
  }, []);

  // ── Nom du patient ──
  const getPatientName = (rdv) => {
    if (rdv.patient_nom_complet && rdv.patient_nom_complet !== 'Patient inconnu') return rdv.patient_nom_complet;
    if (rdv.patient_prenom && rdv.patient_nom) return `${rdv.patient_prenom} ${rdv.patient_nom}`;
    if (rdv.patient?.user?.prenom && rdv.patient?.user?.nom) return `${rdv.patient.user.prenom} ${rdv.patient.user.nom}`;
    if (rdv.patient?.nom) return rdv.patient.nom;
    return "Patient";
  };

  // ─────────────────────────────────────────────────────────
  // ✅ checkUpcomingRendezVousMedecin — filtre date + persistance
  // ─────────────────────────────────────────────────────────
  const checkUpcomingRendezVousMedecin = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !user) return;
      const medecinId = user.medecin?.id;
      if (!medecinId) return;

      const response = await API.get(`/rendezvous/medecin/${medecinId}`);
      const rendezVousList = response.data?.rendez_vous ?? response.data?.data ?? [];
      if (!rendezVousList.length) { setUpcomingRendezVous([]); return; }

      const now   = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const upcoming = [];

      for (const rdv of rendezVousList) {
        if (!rdv.date || !rdv.heure) continue;
        if (rdv.etat === 'refusé' || rdv.etat === 'annulé') continue;

        const rdvDate = new Date(`${rdv.date}T${rdv.heure}`);
        if (isNaN(rdvDate.getTime())) continue;

        // ✅ FILTRE PRINCIPAL : ignorer tous les RDV passés
        if (rdvDate.getTime() <= now.getTime()) continue;

        const rdvDay      = new Date(rdvDate.getFullYear(), rdvDate.getMonth(), rdvDate.getDate());
        const hoursDiff   = (rdvDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const timeStr     = rdvDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const patientName = getPatientName(rdv);

        // ── RDV aujourd'hui ──
        if (rdvDay.getTime() === today.getTime()) {
          upcoming.push({
            ...rdv,
            type: "today",
            message: `Aujourd'hui à ${timeStr} - ${patientName}`,
          });

          // 🔔 Notification "aujourd'hui" — une seule fois (persistée)
          const todayKey = `medecin_today_${rdv.id}`; // ✅ préfixe medecin pour éviter collision avec patient
          if (!hasNotified(todayKey)) {
            await markNotified(todayKey);
            addNotification({
              id: todayKey,
              titre: "📅 Rendez-vous aujourd'hui",
              message: `${patientName} à ${timeStr}`,
              type: "today",
            });
            await showNotification({
              id:        todayKey,
              title:     "📅 Rendez-vous aujourd'hui",
              body:      `Patient : ${patientName} à ${timeStr}`,
              channelId: CHANNEL.REMINDER,
              data:      { screen: 'GestionRendezVous' },
            });
          }

          // 🚨 Notification urgente < 1h — une seule fois (persistée)
          const urgentKey = `medecin_urgent_${rdv.id}`;
          if (hoursDiff <= 1 && hoursDiff > 0 && !hasNotified(urgentKey)) {
            await markNotified(urgentKey);
            addNotification({
              id: urgentKey,
              titre: "⚠️ Rendez-vous imminent",
              message: `${patientName} à ${timeStr} dans moins d'une heure`,
              type: "urgent",
            });
            await showUrgentNotification({
              id:    urgentKey,
              title: '⚠️ Rendez-vous imminent !',
              body:  `${patientName} à ${timeStr} commence bientôt !`,
              data:  { screen: 'GestionRendezVous' },
            });
          }

        // ── RDV dans les prochaines 24h ──
        } else if (hoursDiff > 0 && hoursDiff <= 24) {
          upcoming.push({
            ...rdv,
            type: "upcoming",
            message: `${patientName} le ${rdv.date} à ${timeStr}`,
          });

          // 🔔 Rappel J-1 — une seule fois (persisté)
          const upcomingKey = `medecin_upcoming_${rdv.id}`;
          if (!hasNotified(upcomingKey)) {
            await markNotified(upcomingKey);
            addNotification({
              id: upcomingKey,
              titre: "🔔 Rappel rendez-vous",
              message: `${patientName} dans ${Math.floor(hoursDiff * 60)} min`,
              type: "reminder",
            });
            await showNotification({
              id:        upcomingKey,
              title:     '🔔 Rappel rendez-vous',
              body:      `${patientName} le ${rdv.date} à ${timeStr}`,
              channelId: CHANNEL.REMINDER,
              data:      { screen: 'GestionRendezVous' },
            });

            // ⏰ Notification programmée 30 min avant
            const thirtyMinBefore = rdvDate.getTime() - 30 * 60 * 1000;
            if (thirtyMinBefore > Date.now()) {
              await scheduleNotification({
                id:        `medecin_sched_${rdv.id}`,
                title:     '⏰ Dans 30 minutes !',
                body:      `Rendez-vous avec ${patientName} commence dans 30 minutes.`,
                timestamp: thirtyMinBefore,
                data:      { screen: 'GestionRendezVous' },
              });
            }
          }
        }
      }

      setUpcomingRendezVous(upcoming);
    } catch (error) {
      console.error("❌ Erreur vérification RDV médecin:", error.message);
    }
  }, [user, addNotification, hasNotified, markNotified]);

  // ── Vérification périodique toutes les minutes ──
  const startPeriodicCheck = useCallback(() => {
    if (notificationInterval.current) clearInterval(notificationInterval.current);
    notificationInterval.current = setInterval(checkUpcomingRendezVousMedecin, 60000);
  }, [checkUpcomingRendezVousMedecin]);

  // ── WebSocket médecin ──
  useEffect(() => {
    let isMounted = true;
    const setupWebSocket = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (!userData || !isMounted) return;
        const currentUser = JSON.parse(userData);
        if (currentUser.role !== 'medecin') return;
        const medecinId = currentUser.medecin?.id;
        if (!medecinId) return;

        const channel = await subscribeToChannel(
          `rendez-vous.medecin.${medecinId}`, // ✅ canal correct
          'RappelRendezVousEvent',              // ✅ nom event Laravel
          async (data) => {
            if (!isMounted) return;
            const notifId = `pusher_${data.rendez_vous_id}_${Date.now()}`;
            const message = `Rendez-vous le ${data.date} à ${data.heure}`;

            addNotification({
              id:      notifId,
              titre:   `🔔 Rappel (${data.type})`,
              message: message,
              type:    'pusher',
              data,
            });

            await showNotification({
              id:        notifId,
              title:     '🔔 Rappel rendez-vous',
              body:      message,
              channelId: CHANNEL.REMINDER,
              data:      { screen: 'GestionRendezVous' },
            });
          }
        );
        channelRef.current = channel;
      } catch (error) {
        console.error('Erreur WebSocket médecin:', error);
      }
    };
    setupWebSocket();
    return () => {
      isMounted = false;
      if (channelRef.current) unsubscribeFromChannel(channelRef.current);
    };
  }, [addNotification]);

  // ── Chargement initial + AppState ──
  useEffect(() => {
    const loadData = async () => {
      await fetchUser();
      await checkUpcomingRendezVousMedecin();
      startPeriodicCheck();
    };
    loadData();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkUpcomingRendezVousMedecin();
    });
    return () => {
      if (notificationInterval.current) clearInterval(notificationInterval.current);
      subscription.remove();
    };
  }, [user?.id]);

  useEffect(() => { fetchUser(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUser();
    await checkUpcomingRendezVousMedecin();
    setRefreshing(false);
  };

  const openEditModal = () => {
    if (!user) return;
    setFormData({
      prenom: user.prenom ?? "", nom: user.nom ?? "",
      email: user.email ?? "", telephone: user.telephone ?? "",
      adresse: user.adresse ?? "", age: user.age ? String(user.age) : "",
    });
    setModalVisible(true);
  };

  const modifierProfile = async () => {
    try {
      const response = await API.put(`/users/${user.id}`, {
        prenom: formData.prenom, nom: formData.nom,
        email: formData.email, telephone: formData.telephone,
        adresse: formData.adresse,
        age: formData.age ? parseInt(formData.age, 10) : null,
      });
      setUser(response.data.user ?? response.data);
      setModalVisible(false);
      Alert.alert("Succès", "Profil modifié avec succès");
    } catch (error) {
      Alert.alert("Erreur", error.response?.data?.message ?? "Impossible de modifier le profil");
    }
  };

  const handleClearNotifications = () => { setNotificationsList([]); setNotificationCount(0); };
  const getInitials = () => !user ? "" : `${user.prenom?.charAt(0) || ""}${user.nom?.charAt(0) || ""}`.toUpperCase();
  const getAvatarColor = () => ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"][(user?.id ?? 0) % 5];

  // ── Écrans de chargement ──
  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );

  if (!user) return (
    <View style={styles.loadingContainer}>
      <Ionicons name="alert-circle-outline" size={50} color="#EF4444" />
      <Text style={styles.errorText}>Aucune donnée</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => navigation.replace("Login")}>
        <Text style={styles.retryButtonText}>Se reconnecter</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Rendu ──
  return (
    <>
      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        onClear={handleClearNotifications}
        upcomingRendezVous={upcomingRendezVous}
        notificationsList={notificationsList}
        navigation={navigation}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier Profil</Text>
            <TextInput style={styles.input} placeholder="Prénom" value={formData.prenom} onChangeText={(t) => setFormData({ ...formData, prenom: t })} />
            <TextInput style={styles.input} placeholder="Nom" value={formData.nom} onChangeText={(t) => setFormData({ ...formData, nom: t })} />
            <TextInput style={styles.input} placeholder="Email" value={formData.email} keyboardType="email-address" autoCapitalize="none" onChangeText={(t) => setFormData({ ...formData, email: t })} />
            <TextInput style={styles.input} placeholder="Téléphone" value={formData.telephone} keyboardType="phone-pad" onChangeText={(t) => setFormData({ ...formData, telephone: t })} />
            <TextInput style={styles.input} placeholder="Adresse" value={formData.adresse} onChangeText={(t) => setFormData({ ...formData, adresse: t })} />
            <TextInput style={styles.input} placeholder="Âge" value={formData.age} keyboardType="numeric" onChangeText={(t) => setFormData({ ...formData, age: t })} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={styles.saveButton} onPress={modifierProfile}><Text style={styles.buttonText}>Enregistrer</Text></TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.buttonText}>Annuler</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#10B981"]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: "#10B981" }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Accueil')}>
              <Ionicons name="arrow-back-outline" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuButton} onPress={() => navigation.openDrawer()}>
              <Ionicons name="menu" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
              <Ionicons name="create-outline" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mon Profil</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity style={styles.notificationIconBtn} onPress={() => setShowNotifications(true)}>
                <Ionicons name="notifications-outline" size={24} color="#FFF" />
                {hasNotification && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.notificationIconBtn}
                onPress={() => navigation.navigate("ConversationList", { currentUserId: user.id, currentUser: user })}
              >
                <Ionicons name="chatbubbles-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.profileSection}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.avatarInitials}>{getInitials()}</Text>
          </View>
          <Text style={styles.userName}>Dr. {user.prenom} {user.nom}</Text>
          <Text style={styles.specialite}>{specialiteNom || user.medecin?.specialite?.nom_specialite || "Médecin"}</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Ionicons name="mail-outline" size={16} color="#10B981" />
              <Text style={styles.badgeText}>{user.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📍 Coordonnées</Text>
          {[
            { icon: "call-outline", label: "Téléphone", value: user.telephone },
            { icon: "location-outline", label: "Adresse", value: user.adresse },
            { icon: "calendar-outline", label: "Âge", value: user.age ? `${user.age} ans` : null },
          ].map(({ icon, label, value }) => (
            <View style={styles.infoRow} key={label}>
              <View style={styles.infoIcon}><Ionicons name={icon} size={20} color="#10B981" /></View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || "Non renseigné"}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={openEditModal}>
            <Ionicons name="create-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity
  style={[styles.actionButton, { backgroundColor: "#8B5CF6" }]}
  onPress={() => navigation.navigate("GestionSecretaires")}
>
  <Ionicons name="people-outline" size={20} color="#FFF" />
  <Text style={styles.actionButtonText}>Secrétaires</Text>
</TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.settingsButton]} onPress={() => navigation.openDrawer()}>
            <Ionicons name="settings-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Paramètres</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => confirmLogout(navigation)}>
          <Ionicons name="log-out-outline" size={20} color="#FFF" />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
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
  backButton: { padding: 8 },
  menuButton: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#FFFFFF" },
  editButton: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  notificationIconBtn: { padding: 8, position: "relative" },
  notificationBadge: { position: "absolute", top: 2, right: 2, backgroundColor: "#EF4444", borderRadius: 10, minWidth: 18, height: 18, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  notificationBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
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
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#10B981", paddingVertical: 14, borderRadius: 12, gap: 8, elevation: 4 },
  settingsButton: { backgroundColor: "#3B82F6" },
  actionButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#EF4444", paddingVertical: 14, marginHorizontal: 20, borderRadius: 12, gap: 8, elevation: 4 },
  logoutButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: "90%", backgroundColor: "#fff", padding: 20, borderRadius: 15 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 10, marginBottom: 10 },
  saveButton: { flex: 1, backgroundColor: "#10B981", padding: 12, borderRadius: 10, alignItems: "center" },
  cancelButton: { flex: 1, backgroundColor: "#EF4444", padding: 12, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
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
  upcomingCard: { backgroundColor: "#FFFFFF", marginHorizontal: 16, marginTop: 16, marginBottom: 8, padding: 16, borderRadius: 16, elevation: 3 },
  upcomingTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A", marginBottom: 12 },
  upcomingItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  upcomingText: { fontSize: 14, color: "#475569", flex: 1 },
});