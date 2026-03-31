import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import API from "../../api/api";
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function ListeMedecins({ navigation }) {
  const [medecins, setMedecins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

const chargerMedecins = async () => {
  try {
    console.log("Chargement des médecins...");
    console.log("URL:", "http://192.168.1.78:8000/api/medecins");
    
    const response = await API.get("/medecins");
    console.log("✅ Réponse reçue:", JSON.stringify(response.data).substring(0, 200));
    
    const rawData = response.data;
    let medecinsData = Array.isArray(rawData) ? rawData : (rawData.medecins || []);
    
    const medecinsPlain = medecinsData.map(item => ({
      id:         item.id,
      medecin_id: item.medecin_id || null,
      nom:        item.nom || "",
      prenom:     item.prenom || "",
      specialite: item.nom_specialite || item.specialite || "Médecin",
      email:      item.email || "",
      telephone:  item.telephone || "",
      adresse:    item.adresse || "",
      experience: Number(item.experience) || 0,
      photo:      item.photo || null,
    }));

    setMedecins(medecinsPlain);

  } catch (error) {
    console.error("❌ Erreur complète:", error.message);
    console.error("❌ Code:", error.code);
    console.error("❌ Config URL:", error.config?.url);
    console.error("❌ Config baseURL:", error.config?.baseURL);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  useEffect(() => { chargerMedecins(); }, []);
  const onRefresh = () => { setRefreshing(true); chargerMedecins(); };

  const handleMedecinPress = (item) => {
    if (!item || !item.id) {
      Alert.alert("Erreur", "Médecin invalide");
      return;
    }
    navigation.navigate("DetailleMedecin", {
      medecin: {
        id:         item.id,
        medecin_id: item.medecin_id, 
        nom:        item.nom,
        prenom:     item.prenom,
        nomComplet: `Dr. ${item.prenom} ${item.nom}`.trim(),
        specialite: item.specialite,
        email:      item.email,
        telephone:  item.telephone,
        adresse:    item.adresse,
        experience: item.experience,
        photo:      item.photo,
      }
    });
  };

  const getAvatarColor = (id) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return colors[(id || 0) % colors.length];
  };

  const renderItem = ({ item }) => {
    const nomComplet = `Dr. ${item.prenom} ${item.nom}`.trim();
    const initiale = item.prenom ? item.prenom[0] : item.nom ? item.nom[0] : "M";
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleMedecinPress(item)} activeOpacity={0.7}>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.id) }]}>
            <Text style={styles.avatarText}>{initiale}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.nom} numberOfLines={1}>{nomComplet}</Text>
            <Text style={styles.specialite} numberOfLines={1}>{item.specialite}</Text>
            {item.experience > 0 && (
              <View style={styles.experienceBadge}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.experienceText}>{item.experience} ans</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={24} color="#3B82F6" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des médecins...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={medecins}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        removeClippedSubviews={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3B82F6"]} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={medecins.length > 0 ? <Text style={styles.headerText}>{medecins.length} médecin(s) disponible(s)</Text> : null}
        ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="people-outline" size={64} color="#CBD5E1" /><Text style={styles.emptyText}>Aucun médecin trouvé</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#64748B" },
  list: { padding: 16, paddingBottom: 30 },
  headerText: { fontSize: 14, color: "#64748B", marginBottom: 16, fontWeight: "500", marginLeft: 4 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { color: "#FFFFFF", fontSize: 22, fontWeight: "600" },
  info: { flex: 1 },
  nom: { fontSize: 16, fontWeight: "600", color: "#0F172A", marginBottom: 4 },
  specialite: { fontSize: 14, color: "#3B82F6", fontWeight: "500", marginBottom: 6 },
  experienceBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start", gap: 4 },
  experienceText: { fontSize: 11, color: "#92400E", fontWeight: "500" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: "#94A3B8", fontWeight: "500" },
});