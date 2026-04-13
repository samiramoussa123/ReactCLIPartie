import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Dimensions, StatusBar, Alert,
  ActivityIndicator, RefreshControl, Animated,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiPublic from '../api/apiPublic';
import { subscribeToChannel, unsubscribeFromChannel } from '../src/utils/Echo';

const { width } = Dimensions.get('window');

export default function Home({ navigation }) {
  const subscriptionsRef = useRef([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('Tous');
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState(['Tous']);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState([
    { id: 1, value: "0", label: "Médecins", icon: "people-outline", color: "#3B82F6" },
    { id: 2, value: "0", label: "Patients", icon: "happy-outline", color: "#10B981" },
    { id: 3, value: "24/7", label: "Disponible", icon: "time-outline", color: "#F59E0B" },
  ]);
  const [scrollY] = useState(new Animated.Value(0));

  const isAuthenticated = async () => {
    const token = await AsyncStorage.getItem("token");
    return !!token;
  };

  const requireAuth = async (callback) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      callback();
    } else {
      Alert.alert(
        "Connexion requise",
        "Veuillez vous connecter pour accéder à cette fonctionnalité.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Se connecter", onPress: () => navigation.navigate("Login") }
        ]
      );
    }
  };

  const features = [
    {
      id: 1,
      title: "Analyse des symptômes",
      description: "Décrivez vos symptômes pour obtenir une analyse préliminaire",
      icon: "medkit-outline",
      color: "#3B82F6",
      screen: "Symptomes",
      needAuth: false
    },
    {
      id: 2,
      title: "Suivi de santé",
      description: "Suivez vos constantes et votre historique médical",
      icon: "heart-outline",
      color: "#10B981",
      screen: "DossiersPatient",
      needAuth: true
    },
    {
      id: 3,
      title: "Conseils personnalisés",
      description: "Recevez des recommandations adaptées à votre profil",
      icon: "bulb-outline",
      color: "#F59E0B",
      screen: "ConversationList",
      needAuth: true
    },
    {
      id: 4,
      title: "Téléconsultation",
      description: "Contactez un professionnel de santé",
      icon: "videocam-outline",
      color: "#8B5CF6",
      screen: "RendezVous",
      needAuth: true
    }
  ];

  const fetchDoctors = async () => {
    try {
      const response = await ApiPublic.get('/admin/medecins/verifies');
      let doctorsList = [];
      if (response.data?.medecins && Array.isArray(response.data.medecins))
        doctorsList = response.data.medecins;
      else if (Array.isArray(response.data))
        doctorsList = response.data;
      else if (response.data?.data && Array.isArray(response.data.data))
        doctorsList = response.data.data;

      const extraireVille = (adresse) => {
        if (!adresse) return 'Ville non spécifiée';
        const parties = adresse.split(',');
        return parties[parties.length - 1].trim();
      };
      const getColorForId = (id) => {
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];
        return colors[(id || 0) % colors.length];
      };

      const formattedDoctors = doctorsList.map(doctor => {
        let specialite = 'Généraliste';
        if (doctor.medecin?.specialite)
          specialite = doctor.medecin.specialite.nom_specialite || 'Généraliste';
        return {
          id: doctor.id,
          nom: `${doctor.prenom || ''} ${doctor.nom || ''}`.trim() || 'Dr. Médecin',
          prenom: doctor.prenom || '',
          specialite,
          adresse: doctor.adresse || 'Adresse non spécifiée',
          ville: extraireVille(doctor.adresse),
          note: 4.5,
          nb_avis: 0,
          disponible: true,
          tarif: 5000,
          experience: doctor.medecin?.experience || 5,
          avatarColor: getColorForId(doctor.id),
          photo: doctor.photo,
        };
      });

      setDoctors(formattedDoctors);
      return formattedDoctors;
    } catch (error) {
      console.error('Erreur chargement médecins:', error.message);
      return [];
    }
  };

  const fetchSpecialties = async () => {
    try {
      const response = await ApiPublic.get('/specialite');
      let specialtiesList = [];
      if (Array.isArray(response.data))
        specialtiesList = response.data.map(item =>
          typeof item === 'string' ? item : item.nom_specialite || item.nom
        );
      setSpecialties(['Tous', ...specialtiesList]);
    } catch (error) {
      console.error('Erreur chargement spécialités:', error.message);
      setSpecialties(['Tous']);
    }
  };

  const fetchStats = async (medecinsData = []) => {
    try {
      let patientsCount = 0;
      try {
        const patientsRes = await ApiPublic.get('/patients');
        if (Array.isArray(patientsRes.data))
          patientsCount = patientsRes.data.length;
        else if (patientsRes.data?.patients)
          patientsCount = patientsRes.data.patients.length;
        else if (typeof patientsRes.data?.total === 'number')
          patientsCount = patientsRes.data.total;
      } catch (_) {}
      setStats([
        { id: 1, value: medecinsData.length.toString(), label: "Médecins", icon: "people-outline", color: "#3B82F6" },
        { id: 2, value: patientsCount.toString(), label: "Patients", icon: "happy-outline", color: "#10B981" },
        { id: 3, value: "24/7", label: "Disponible", icon: "time-outline", color: "#F59E0B" },
      ]);
    } catch (error) {
      console.error('Erreur stats:', error.message);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const medecinsData = await fetchDoctors();
      await fetchSpecialties();
      await fetchStats(medecinsData || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  useEffect(() => {
    let isMounted = true;
    let channelName = null;

    const setupNotifications = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (!userData) return;
        
        const user = JSON.parse(userData);
        
        if (user.role === 'patient') {
          channelName = `patient.${user.id}`;
          
          await subscribeToChannel(channelName, 'rappel.rendez-vous', (data) => {
            if (isMounted) {
              Alert.alert(
                data.titre || 'Rappel RDV',
                data.corps || 'Vous avez un rendez-vous prévu.'
              );
            }
          });
          
          subscriptionsRef.current.push(channelName);
          console.log(`✅ Notifications activées pour ${channelName}`);
        }
      } catch (error) {
        console.error('Erreur configuration notifications:', error);
      }
    };
    
    setupNotifications();
    
    return () => {
      isMounted = false;
      subscriptionsRef.current.forEach(async (channel) => {
        try {
          await unsubscribeFromChannel(channel);
        } catch (error) {
          console.error('Erreur désabonnement:', error);
        }
      });
      subscriptionsRef.current = [];
    };
  }, []);

  const navigateToProfile = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      const token = await AsyncStorage.getItem("token");
      
      if (!userData || !token) {
        navigation.navigate("Login");
        return;
      }
      
      const user = JSON.parse(userData);
      
      if (user.role === "medecin") {
        navigation.reset({
          index: 0,
          routes: [{ name: "Medecin" }],
        });
      } else if (user.role === "admin") {
        navigation.reset({
          index: 0,
          routes: [{ name: "Admin" }],
        });
      } else if (user.role === "patient") {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "Main",
              state: {
                routes: [
                  { name: "Profile" }
                ],
              },
            },
          ],
        });
      } else {
        navigation.navigate("Login");
      }
      
    } catch (error) {
      console.error("Erreur navigation:", error);
      navigation.navigate("Login");
    }
  };

  const handleAppointment = async (doctor) => {
    if (!doctor.disponible) {
      Alert.alert("Non disponible", "Ce médecin n'est pas disponible pour le moment");
      return;
    }

    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert(
        "Connexion requise",
        "Veuillez vous connecter pour prendre un rendez-vous.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Se connecter", onPress: () => navigation.navigate("Login") }
        ]
      );
      return;
    }

    Alert.alert(
      "Rendez-vous",
      `Voulez-vous prendre rendez-vous avec ${doctor.nom} ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Confirmer", onPress: () => navigation.navigate("RendezVousStack", { doctorId: doctor.id, doctorName: doctor.nom }) },
      ]
    );
  };

  const handleFeaturePress = async (feature) => {
  if (feature.needAuth) {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert(
        "Connexion requise",
        "Veuillez vous connecter pour accéder à cette fonctionnalité.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Se connecter", onPress: () => navigation.navigate("Login") }
        ]
      );
      return;
    }
    if (feature.screen === "RendezVous") {
      const userData = await AsyncStorage.getItem("userData");
      let role = null;
      if (userData) {
        try {
          const user = JSON.parse(userData);
          role = user.role;
        } catch (e) {}
      }
      if (role === "medecin") {
        navigation.navigate("GestionRendezVous");
      } else {
        navigation.navigate("RendezVous");
      }
    }
    if (feature.screen === "DossiersPatient") {
      const userData = await AsyncStorage.getItem("userData");
      let role = null;
      if (userData) {
        try {
          const user = JSON.parse(userData);
          role = user.role;
        } catch (e) {}
      }
      if (role === "medecin") {
        navigation.navigate("DossiersMedecin");
      } else {
        navigation.navigate("DossiersPatient");
      }
    }
    
    else {
      navigation.navigate(feature.screen);
    }
  } else {
    navigation.navigate(feature.screen);
  }
};

  const filteredDoctors = doctors.filter(doctor => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = searchLower === '' || (
      (doctor.nom?.toLowerCase() || '').includes(searchLower) ||
      (doctor.specialite?.toLowerCase() || '').includes(searchLower) ||
      (doctor.adresse?.toLowerCase() || '').includes(searchLower) ||
      (doctor.ville?.toLowerCase() || '').includes(searchLower)
    );
    const matchesSpecialty =
      selectedSpecialty === 'Tous' ||
      (doctor.specialite || '').toLowerCase() === selectedSpecialty.toLowerCase();
    return matchesSearch && matchesSpecialty;
  });

  const renderDoctorCard = (doctor) => (
    <TouchableOpacity
      key={doctor.id}
      style={styles.doctorCard}
      onPress={() => navigation.navigate("DetailleMedecin", { doctorId: doctor.id })}
      activeOpacity={0.7}
    >
      <View style={styles.doctorCardHeader}>
        <View style={[styles.doctorAvatar, { backgroundColor: doctor.avatarColor }]}>
          <Text style={styles.doctorAvatarText}>{doctor.nom?.charAt(0) || 'D'}</Text>
        </View>
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>{doctor.nom}</Text>
          <Text style={styles.doctorSpecialty}>{doctor.specialite}</Text>
          <View style={styles.doctorRating}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.doctorRatingText}>{doctor.note || '4.5'}</Text>
            <Text style={styles.doctorReviewCount}>({doctor.nb_avis || 0} avis)</Text>
          </View>
        </View>
        <View style={[styles.availabilityBadge, doctor.disponible ? styles.available : styles.unavailable]}>
          <Text style={[styles.availabilityText, { color: doctor.disponible ? '#10B981' : '#EF4444' }]}>
            {doctor.disponible ? 'Disponible' : 'Occupé'}
          </Text>
        </View>
      </View>

      <View style={styles.doctorDetails}>
        <View style={styles.doctorDetailItem}>
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.doctorDetailText} numberOfLines={1}>{doctor.adresse}</Text>
        </View>
        <View style={styles.doctorDetailItem}>
          <Ionicons name="cash-outline" size={14} color="#6B7280" />
          <Text style={styles.doctorDetailText}>{doctor.tarif} FCFA</Text>
        </View>
        <View style={styles.doctorDetailItem}>
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text style={styles.doctorDetailText}>{doctor.experience || 0} ans d'expérience</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.appointmentButton, !doctor.disponible && styles.appointmentButtonDisabled]}
        onPress={() => handleAppointment(doctor)}
        disabled={!doctor.disponible}
      >
        <Text style={styles.appointmentButtonText}>Prendre rendez-vous</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement des médecins...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.navbar}>
        <View style={styles.navbarLeft}>
          <Text style={styles.logo}>TéleSanté+</Text>
        </View>
        
        <View style={styles.navbarRight}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate("Register")}
          >
            <Ionicons name="person-add-outline" size={20} color="#3B82F6" />
            <Text style={styles.navButtonText}>Patient</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, styles.doctorNavButton]}
            onPress={() => navigation.navigate("RegisterMedecin")}
          >
            <Ionicons name="medical-outline" size={20} color="#10B981" />
            <Text style={[styles.navButtonText, styles.doctorNavText]}>Médecin</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileIcon}
            onPress={navigateToProfile}
          >
            <Ionicons name="person-circle" size={36} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Bienvenue sur</Text>
              <Text style={styles.appName}>TéleSanté+</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Votre assistant santé intelligent</Text>
        </LinearGradient>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Nom, spécialité, ville..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.specialtiesContainer}
          contentContainerStyle={styles.specialtiesContent}
        >
          {specialties.map((specialty) => (
            <TouchableOpacity
              key={specialty}
              style={[
                styles.specialtyChip,
                selectedSpecialty === specialty && styles.specialtyChipActive
              ]}
              onPress={() => setSelectedSpecialty(specialty)}
            >
              <Text style={[
                styles.specialtyChipText,
                selectedSpecialty === specialty && styles.specialtyChipTextActive
              ]}>
                {specialty}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.statsContainer}>
          {stats.map((stat) => (
            <View key={stat.id} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                <Ionicons name={stat.icon} size={24} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.doctorsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Médecins disponibles</Text>
            <Text style={styles.doctorCount}>{filteredDoctors.length} médecins</Text>
          </View>

          {filteredDoctors.length > 0 ? (
            filteredDoctors.map(doctor => renderDoctorCard(doctor))
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={48} color="#D1D5DB" />
              <Text style={styles.noResultsText}>Aucun médecin trouvé</Text>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedSpecialty('Tous');
                }}
              >
                <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.forumSection}
          onPress={() => navigation.navigate("Forum")}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6D28D9']}
            style={styles.forumGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.forumContent}>
              <View style={styles.forumIconContainer}>
                <Ionicons name="chatbubbles" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.forumTextContainer}>
                <Text style={styles.forumTitle}>Forum Public</Text>
                <Text style={styles.forumDescription}>
                  Échangez avec la communauté, posez vos questions et partagez vos expériences
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={32} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.heroSection}
          onPress={() => navigation.navigate("Symptomes")}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#4F46E5', '#7C3AED']}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <Ionicons name="search" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Analysez vos symptômes</Text>
                <Text style={styles.heroDescription}>
                  Décrivez ce que vous ressentez et obtenez une analyse préliminaire
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={32} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.servicesTitle}>Nos services</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={styles.featureCard}
              onPress={() => handleFeaturePress(feature)}
              activeOpacity={0.7}
            >
              <View style={[styles.featureIcon, { backgroundColor: `${feature.color}15` }]}>
                <Ionicons name={feature.icon} size={28} color={feature.color} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.doctorSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.doctorContent}>
            <View style={styles.doctorIconContainer}>
              <Ionicons name="medical" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.doctorTextContainer}>
              <Text style={styles.doctorTitle}>Vous êtes médecin ?</Text>
              <Text style={styles.doctorDescription}>
                Rejoignez notre réseau de professionnels de santé
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.doctorButton}
              onPress={() => navigation.navigate("RegisterMedecin")}
            >
              <Text style={styles.doctorButtonText}>S'inscrire</Text>
              <Ionicons name="arrow-forward" size={16} color="#10B981" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <View style={styles.tipIconContainer}>
              <Ionicons name="bulb" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.tipTitle}>Conseil du jour</Text>
          </View>
          <Text style={styles.tipText}>
            Buvez au moins 8 verres d'eau par jour pour rester hydraté et favoriser l'élimination des toxines.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>En cas d'urgence, appelez le 198</Text>
          <Text style={styles.footerCopyright}>© 2026 TéleSanté+ - Tous droits réservés</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  navbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  navbarLeft: { flex: 1 },
  logo: { fontSize: 18, fontWeight: "700", color: "#3B82F6" },
  navbarRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  navButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
  doctorNavButton: { backgroundColor: "#E7F5E9" },
  navButtonText: { fontSize: 12, fontWeight: "500", color: "#3B82F6" },
  doctorNavText: { color: "#10B981" },
  profileIcon: { marginLeft: 4 },
  scrollContainer: { paddingBottom: 30 },
  header: { paddingTop: 20, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  welcomeContainer: { flex: 1 },
  welcomeText: { fontSize: 14, color: "#EFF6FF", fontWeight: "500", letterSpacing: 0.5 },
  appName: { fontSize: 28, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },
  headerSubtitle: { fontSize: 14, color: "#EFF6FF", opacity: 0.9, marginTop: 5 },
  searchContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 30, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, color: "#1F2937", padding: 0 },
  specialtiesContainer: { maxHeight: 50, marginBottom: 20 },
  specialtiesContent: { paddingHorizontal: 20, gap: 10 },
  specialtyChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#FFFFFF", borderRadius: 25, borderWidth: 1, borderColor: "#E5E7EB" },
  specialtyChipActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  specialtyChipText: { fontSize: 13, color: "#6B7280" },
  specialtyChipTextActive: { color: "#FFFFFF" },
  statsContainer: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 20, marginBottom: 24 },
  statCard: { alignItems: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, width: (width - 60) / 3, shadowColor: "#1E293B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 2 },
  statLabel: { fontSize: 12, color: "#64748B" },
  doctorsSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  doctorCount: { fontSize: 14, color: "#6B7280" },
  doctorCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  doctorCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  doctorAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center", marginRight: 12 },
  doctorAvatarText: { fontSize: 20, fontWeight: "600", color: "#FFFFFF" },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  doctorSpecialty: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  doctorRating: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  doctorRatingText: { fontSize: 12, fontWeight: "600", color: "#1F2937" },
  doctorReviewCount: { fontSize: 11, color: "#9CA3AF" },
  availabilityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: "#F3F4F6" },
  availabilityText: { fontSize: 11, fontWeight: "500" },
  available: { backgroundColor: "#10B98115" },
  unavailable: { backgroundColor: "#EF444415" },
  doctorDetails: { marginBottom: 12, gap: 6 },
  doctorDetailItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  doctorDetailText: { fontSize: 12, color: "#4B5563", flex: 1 },
  appointmentButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#3B82F6", paddingVertical: 10, borderRadius: 12, gap: 6 },
  appointmentButtonDisabled: { backgroundColor: "#9CA3AF" },
  appointmentButtonText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  noResults: { alignItems: "center", paddingVertical: 40 },
  noResultsText: { fontSize: 14, color: "#9CA3AF", marginTop: 10 },
  resetButton: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#3B82F6", borderRadius: 20 },
  resetButtonText: { fontSize: 12, color: "#FFFFFF", fontWeight: "500" },
  forumSection: { marginHorizontal: 20, marginVertical: 24, borderRadius: 20, overflow: "hidden", shadowColor: "#8B5CF6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  forumGradient: { padding: 20 },
  forumContent: { flexDirection: "row", alignItems: "center", gap: 15 },
  forumIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  forumTextContainer: { flex: 1 },
  forumTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 4 },
  forumDescription: { fontSize: 12, color: "#FFFFFF", opacity: 0.9, lineHeight: 16 },
  heroSection: { marginHorizontal: 20, marginBottom: 24, borderRadius: 20, overflow: "hidden", shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  heroGradient: { padding: 20 },
  heroContent: { flexDirection: "row", alignItems: "center", gap: 15 },
  heroIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  heroTextContainer: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: "600", color: "#FFFFFF", marginBottom: 4 },
  heroDescription: { fontSize: 12, color: "#EFF6FF", opacity: 0.9, lineHeight: 16 },
  servicesTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A", marginHorizontal: 20, marginBottom: 16 },
  featuresGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 20, gap: 15 },
  featureCard: { width: (width - 55) / 2, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, shadowColor: "#1E293B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, marginBottom: 15 },
  featureIcon: { width: 50, height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  featureTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A", marginBottom: 6 },
  featureDescription: { fontSize: 12, color: "#64748B", lineHeight: 16 },
  doctorSection: { marginHorizontal: 20, marginVertical: 24, borderRadius: 20, overflow: "hidden", shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  doctorContent: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  doctorIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  doctorTextContainer: { flex: 1 },
  doctorTitle: { fontSize: 16, fontWeight: "600", color: "#FFFFFF", marginBottom: 2 },
  doctorDescription: { fontSize: 12, color: "#FFFFFF", opacity: 0.9 },
  doctorButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, gap: 4 },
  doctorButtonText: { color: "#10B981", fontSize: 12, fontWeight: "600" },
  tipCard: { backgroundColor: "#FFFFFF", marginHorizontal: 20, marginVertical: 16, padding: 16, borderRadius: 16, shadowColor: "#1E293B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  tipHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  tipIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center" },
  tipTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  tipText: { fontSize: 14, color: "#475569", lineHeight: 20 },
  footer: { alignItems: "center", marginTop: 30, paddingTop: 20, paddingBottom: 20, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  footerText: { fontSize: 14, fontWeight: "600", color: "#EF4444", marginBottom: 8 },
  footerCopyright: { fontSize: 12, color: "#94A3B8" },
});