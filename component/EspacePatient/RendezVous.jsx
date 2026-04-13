import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Platform, Modal   // ← Modal ajouté ici
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import API from "../../api/api";
import { showAlert } from "../../navigation/AppNavigate";

export default function RendezVous({ route, navigation }) {
  const idMedecin     = route?.params?.idMedecin  || null;
  const nomMedecin    = route?.params?.nomMedecin || "Médecin";
  const specialite    = route?.params?.specialite || "";
  const ongletInitial = route?.params?.ongletInitial || (idMedecin ? "calendrier" : "mesrdv");
  const { rdvId } = route.params || {}; 

  const [idPatient, setIdPatient]                     = useState(route?.params?.idPatient || null);
  const [moisActuel, setMoisActuel]                   = useState(new Date());
  const [joursDuMois, setJoursDuMois]                 = useState([]);
  const [rendezVousExistants, setRendezVousExistants] = useState([]);
  const [mesRendezVous, setMesRendezVous]             = useState([]);
  const [loading, setLoading]                         = useState(false);
  const [onglet, setOnglet]                           = useState(ongletInitial);
  const [highlightedRdvId, setHighlightedRdvId]       = useState(null);
  const [showHeureModal, setShowHeureModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [heuresDisponibles, setHeuresDisponibles] = useState([]);
  const scrollViewRef = useRef(null);
  const rdvItemRefs   = useRef({});

  useEffect(() => {
    const recupererPatient = async () => {
      if (idPatient) return;
      try {
        const response  = await API.get("/me");
        const user      = response.data?.user ?? response.data;
        const patientId = user?.patient?.id || null;
        if (patientId) setIdPatient(patientId);
        else Alert.alert("Erreur", "Impossible de récupérer votre profil patient.");
      } catch (error) {
        console.log("Erreur récupération patient:", error.message);
      }
    };
    recupererPatient();
  }, []);

  useEffect(() => {
    if (idMedecin) chargerRendezVousMedecin();
  }, [idMedecin, moisActuel]);

  useEffect(() => {
    if (idPatient) chargerMesRendezVous();
  }, [idPatient]);

  useEffect(() => {
    genererJoursMois();
  }, [moisActuel, rendezVousExistants]);

  useEffect(() => {
    if (onglet === "mesrdv" && mesRendezVous.length > 0 && rdvId) {
      const index = mesRendezVous.findIndex(rdv => rdv.id === rdvId);
      if (index !== -1) {
        setHighlightedRdvId(rdvId);
        const ref = rdvItemRefs.current[rdvId];
        if (ref) {
          ref.measureLayout(scrollViewRef.current, (x, y) => {
            scrollViewRef.current.scrollTo({ y: y - 100, animated: true });
          });
        }
        setTimeout(() => setHighlightedRdvId(null), 3000);
      }
    }
  }, [onglet, mesRendezVous, rdvId]);

  const chargerRendezVousMedecin = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/rendezvous/medecin/${idMedecin}`);
      const rawData  = response.data;
      const rdvs     = rawData?.rendez_vous ?? rawData?.rendezvous ?? rawData?.data ?? [];
      setRendezVousExistants(Array.isArray(rdvs) ? rdvs : []);
    } catch {
      setRendezVousExistants([]);
    } finally {
      setLoading(false);
    }
  };

  const chargerMesRendezVous = async () => {
    try {
      const response = await API.get(`/rendezvous/patient/${idPatient}`);
      const rdvs     = response.data?.rendez_vous ?? response.data?.data ?? response.data ?? [];
      setMesRendezVous(Array.isArray(rdvs) ? rdvs : []);
    } catch (error) {
      console.log("Erreur mes RDV:", error.message);
    }
  };

  const genererJoursMois = () => {
    const annee       = moisActuel.getFullYear();
    const mois        = moisActuel.getMonth();
    const premierJour = new Date(annee, mois, 1);
    const dernierJour = new Date(annee, mois + 1, 0);
    const jours       = [];
    const decalage    = premierJour.getDay() === 0 ? 6 : premierJour.getDay() - 1;

    for (let i = 0; i < decalage; i++) jours.push({ vide: true });

    const toutesHeures = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
    const aujourdhui   = new Date(); aujourdhui.setHours(0, 0, 0, 0);

    for (let jour = 1; jour <= dernierJour.getDate(); jour++) {
      const dateStr     = `${annee}-${String(mois+1).padStart(2,"0")}-${String(jour).padStart(2,"0")}`;
      const dateObj     = new Date(annee, mois, jour);
      const estPasse    = dateObj < aujourdhui;
      const estDimanche = dateObj.getDay() === 0;

      const rdvsJour = rendezVousExistants.filter(
        rdv => rdv.date === dateStr &&
          ["en attente", "confirmé", "en attend"].includes(rdv.etat)
      );
      const heuresPrises      = rdvsJour.map(rdv => rdv.heure?.substring(0, 5));
      const heuresDisponibles = toutesHeures.filter(h => !heuresPrises.includes(h));
      const estDisponible     = heuresDisponibles.length > 0 && !estDimanche && !estPasse;

      jours.push({
        date: dateStr, jour, estDisponible, estPasse, estDimanche,
        heuresDisponibles: [...heuresDisponibles],
        messageDispo: estDisponible ? `${heuresDisponibles.length} créneaux` : "complet",
      });
    }
    setJoursDuMois(jours);
  };

  const changerMois = (direction) => {
    const n = new Date(moisActuel);
    n.setMonth(moisActuel.getMonth() + direction);
    setMoisActuel(n);
  };

  const handleJourPress = (jour) => {
    if (!jour.estDisponible || jour.estPasse) return;
    const heures = jour.heuresDisponibles || [];
    if (!heures.length) return;
    setSelectedDate(jour.date);
    setHeuresDisponibles(heures);
    setShowHeureModal(true);
  };

  const confirmerRendezVous = async (date, heure) => {
    if (!idPatient) {
      Alert.alert("Non connecté", "Impossible de récupérer votre profil patient.");
      return;
    }
    try {
      await API.post("/rendezvous", {
        id_patient: parseInt(idPatient),
        id_medecin: parseInt(idMedecin),
        date, heure,
      });
      showAlert("Succès 🎉", "Demande envoyée. En attente de confirmation.", [
        { text: "OK", onPress: () => { chargerRendezVousMedecin(); chargerMesRendezVous(); } }
      ]);
    } catch (error) {
      if (error.response?.status === 409)
        Alert.alert("Créneau pris", "Ce créneau vient d'être réservé.");
      else if (error.response?.status === 422)
        Alert.alert("Erreur", JSON.stringify(error.response?.data?.errors));
      else
        Alert.alert("Erreur", `Impossible de réserver (${error.response?.status || error.message})`);
    }
  };

  const rejoindreVideo = async (rdv) => {
    try {
      const dossierRes = await API.get(`/dossiers/patient/${idPatient}`);
      const dossiers   = dossierRes.data?.dossiers ?? dossierRes.data?.data ?? dossierRes.data ?? [];
      const medecinId  = rdv.id_medecin ?? rdv.medecin?.id;
      const dossier    = Array.isArray(dossiers)
        ? dossiers.find(d => d.medecin_id === medecinId || d.id_medecin === medecinId)
        : null;

      if (!dossier) { Alert.alert("Info", "Aucun dossier médical trouvé avec ce médecin."); return; }

      const consultRes    = await API.get(`/consultations/dossier/${dossier.id}`);
      const consultations = consultRes.data?.consultations ?? consultRes.data?.data ?? consultRes.data ?? [];
      const consultation  = Array.isArray(consultations)
        ? consultations.find(c => c.type === "video" && c.statut_video === "en_cours")
        : null;

      if (!consultation) {
        Alert.alert("Info", "Le médecin n'a pas encore démarré la consultation vidéo.\nVeuillez patienter.");
        return;
      }

      await API.post(`/consultations/${consultation.id}/video/rejoindre`);
      navigation.navigate("ConsultationVideo", { consultationId: consultation.id, role: "patient" });
    } catch (e) {
      Alert.alert("Erreur", e.response?.data?.message ?? "Impossible de rejoindre la consultation");
    }
  };

  const getEtatColor = (etat) => {
    switch (etat) {
      case "confirmé":  return "#10B981";
      case "refusé":    return "#EF4444";
      case "en attente":
      case "en attend": return "#F59E0B";
      default:          return "#64748B";
    }
  };

  const renderJour = (item, index) => {
    if (item.vide) return <View key={`vide-${index}`} style={styles.jourVide} />;
    const bg = item.estPasse ? "#f0f0f0"
      : (item.estDimanche || !item.estDisponible) ? "#ffebee" : "#e8f5e9";
    return (
      <TouchableOpacity
        key={item.date}
        style={[styles.jour, { backgroundColor: bg }]}
        onPress={() => handleJourPress(item)}
        disabled={!item.estDisponible || item.estPasse}
      >
        <Text style={styles.jourNumero}>{item.jour}</Text>
        <Text style={styles.dispoBadge}>{item.messageDispo}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.onglets}>
        {idMedecin && (
          <TouchableOpacity
            style={[styles.onglet, onglet === "calendrier" && styles.ongletActif]}
            onPress={() => setOnglet("calendrier")}
          >
            <Ionicons name="calendar-outline" size={16} color={onglet === "calendrier" ? "#FFF" : "#64748B"} />
            <Text style={[styles.ongletText, onglet === "calendrier" && styles.ongletTextActif]}>Calendrier</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.onglet, onglet === "mesrdv" && styles.ongletActif]}
          onPress={() => setOnglet("mesrdv")}
        >
          <Ionicons name="calendar-outline" size={16} color={onglet === "mesrdv" ? "#FFF" : "#64748B"} />
          <Text style={[styles.ongletText, onglet === "mesrdv" && styles.ongletTextActif]}>Mes Rendez-Vous</Text>
        </TouchableOpacity>
      </View>

      {onglet === "calendrier" && idMedecin && (
        <>
          <View style={styles.navigation}>
            <TouchableOpacity onPress={() => changerMois(-1)} style={styles.navBtn}>
              <Text style={styles.navButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.mois}>
              {moisActuel.toLocaleString("fr-FR", { month: "long", year: "numeric" })}
            </Text>
            <TouchableOpacity onPress={() => changerMois(1)} style={styles.navBtn}>
              <Text style={styles.navButton}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.joursSemaine}>
            {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(j => (
              <Text key={j} style={styles.jourSemaine}>{j}</Text>
            ))}
          </View>

          <View style={styles.legende}>
            {[["#e8f5e9","Disponible"],["#ffebee","Complet"],["#f0f0f0","Passé"]].map(([c,l]) => (
              <View key={l} style={styles.legendeItem}>
                <View style={[styles.legendeColor, { backgroundColor: c }]} />
                <Text style={styles.legendeText}>{l}</Text>
              </View>
            ))}
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Chargement des créneaux...</Text>
            </View>
          ) : (
            <ScrollView>
              <View style={styles.calendrier}>
                {joursDuMois.map((jour, index) => renderJour(jour, index))}
              </View>
            </ScrollView>
          )}
        </>
      )}

      {onglet === "mesrdv" && (
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, padding: 16 }}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {mesRendezVous.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="calendar-outline" size={50} color="#CBD5E1" />
              <Text style={styles.emptyText}>Aucun rendez-vous</Text>
            </View>
          ) : (
            mesRendezVous.map((rdv) => (
              <View
                key={rdv.id}
                ref={ref => rdvItemRefs.current[rdv.id] = ref}
                style={[
                  styles.rdvCard,
                  highlightedRdvId === rdv.id && styles.highlightedRdvCard
                ]}
              >
                <Text style={styles.rdvText}>
                  👨‍⚕️ Dr. {rdv.medecin?.user?.prenom ?? rdv.medecin?.nom ?? "Médecin"}
                </Text>
                <Text style={styles.rdvText}>📅 {rdv.date} à {rdv.heure}</Text>
                <View style={[styles.etatBadge, { backgroundColor: getEtatColor(rdv.etat) + "20" }]}>
                  <Text style={[styles.etatText, { color: getEtatColor(rdv.etat) }]}>{rdv.etat}</Text>
                </View>
                {rdv.etat === "confirmé" && (
                  <TouchableOpacity style={styles.videoBtn} onPress={() => rejoindreVideo(rdv)}>
                    <Ionicons name="videocam" size={18} color="#FFF" />
                    <Text style={styles.videoBtnText}>Rejoindre la consultation vidéo</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={showHeureModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHeureModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Choisir une heure</Text>
            <Text style={styles.modalSubtitle}>pour le {selectedDate}</Text>
            <ScrollView style={styles.heureList}>
              {heuresDisponibles.map((heure) => (
                <TouchableOpacity
                  key={heure}
                  style={styles.heureItem}
                  onPress={() => {
                    setShowHeureModal(false);
                    confirmerRendezVous(selectedDate, heure);
                  }}
                >
                  <Text style={styles.heureText}>{heure}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowHeureModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#f5f5f5" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText:     { marginTop: 10, fontSize: 14, color: "#64748B" },
  emptyText:       { color: "#94A3B8", fontSize: 16, marginTop: 12 },

  medecinBanner:     { backgroundColor: "#4CAF50", padding: 12, alignItems: "center" },
  medecinBannerText: { color: "#FFF", fontSize: 15, fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  heureList: {
    width: '100%',
    marginBottom: 15,
  },
  heureItem: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 10,
    marginVertical: 5,
    alignItems: 'center',
  },
  heureText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  onglets:         { flexDirection: "row", backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  onglet:          { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  ongletActif:     { backgroundColor: "#119213" },
  ongletText:      { fontSize: 14, fontWeight: "600", color: "#64748B" },
  ongletTextActif: { color: "#FFF" },

  navigation: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, backgroundColor: "#fff" },
  navBtn:     { padding: 8 },
  navButton:  { fontSize: 24, color: "#4CAF50" },
  mois:       { fontSize: 18, fontWeight: "bold", textTransform: "capitalize" },

  joursSemaine: { flexDirection: "row", paddingHorizontal: 10, marginTop: 8, marginBottom: 4 },
  jourSemaine:  { flex: 1, textAlign: "center", fontWeight: "bold", fontSize: 12, color: "#475569" },

  legende:      { flexDirection: "row", justifyContent: "center", gap: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  legendeItem:  { flexDirection: "row", alignItems: "center", gap: 4 },
  legendeColor: { width: 14, height: 14, borderRadius: 3, borderWidth: 1, borderColor: "#ddd" },
  legendeText:  { fontSize: 11, color: "#64748B" },

  calendrier:  { flexDirection: "row", flexWrap: "wrap", padding: 10 },
  jour:        { width: "14.28%", aspectRatio: 1, borderWidth: 1, borderColor: "#ddd", padding: 3, justifyContent: "space-between" },
  jourVide:    { width: "14.28%", aspectRatio: 1 },
  jourNumero:  { fontSize: 14, fontWeight: "bold", color: "#0F172A" },
  dispoBadge:  { fontSize: 8, color: "#4CAF50", textAlign: "right" },

  rdvCard:   { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  highlightedRdvCard: { backgroundColor: "#DBEAFE", borderLeftWidth: 4, borderLeftColor: "#3B82F6" },
  rdvText:   { fontSize: 14, color: "#334155", marginBottom: 4 },
  etatBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 6 },
  etatText:  { fontWeight: "bold", fontSize: 12 },

  videoBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#3B82F6", padding: 12, borderRadius: 10, marginTop: 12 },
  videoBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});