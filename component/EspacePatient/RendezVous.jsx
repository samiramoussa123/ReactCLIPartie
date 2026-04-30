import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal
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
  const [loading, setLoading]                         = useState(false);
  const [onglet, setOnglet]                           = useState(ongletInitial);

  const [mesRendezVous, setMesRendezVous]             = useState([]);
  const [highlightedRdvId, setHighlightedRdvId]       = useState(null);

  const [showHeureModal, setShowHeureModal]           = useState(false);
  const [selectedDate, setSelectedDate]               = useState(null);
  const [heuresDisponibles, setHeuresDisponibles]     = useState([]);
const [typeConsultation, setTypeConsultation] = useState("presentiel");
  const scrollViewRef = useRef(null);
  const rdvItemRefs   = useRef({});

  const [videoStatus, setVideoStatus]           = useState({});
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const videoStatusRef                          = useRef({});

  // Récupération du profil patient
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

  // Alerte quand un RDV passe à "en_cours"
  useEffect(() => {
    const ancienStatuts = videoStatusRef.current;
    for (const [rdvId, nouveauStatut] of Object.entries(videoStatus)) {
      const ancienStatut = ancienStatuts[rdvId];
      if (ancienStatut && ancienStatut !== "en_cours" && nouveauStatut === "en_cours") {
        const rdv    = mesRendezVous.find(r => String(r.id) === String(rdvId));
        const nomDoc = rdv
          ? `Dr. ${rdv.medecin?.user?.prenom ?? rdv.medecin?.nom ?? "votre médecin"}`
          : "Votre médecin";
        Alert.alert(
          "🎥 Consultation démarrée",
          `${nomDoc} vous attend en vidéo.`,
          [
            { text: "Rejoindre maintenant", onPress: () => setOnglet("mesrdv") },
            { text: "Plus tard" },
          ]
        );
      }
    }
    videoStatusRef.current = { ...videoStatus };
  }, [videoStatus]);

  // Chargement du calendrier
  useEffect(() => {
    if (idMedecin) chargerCalendrier();
  }, [idMedecin, moisActuel]);

  const chargerCalendrier = async () => {
    setLoading(true);
    try {
      const annee = moisActuel.getFullYear();
      const mois  = moisActuel.getMonth() + 1;
      // Correction de l'URL : "disponibilites" au lieu de "disponibiliteZ"
      const res   = await API.get(`/agenda/${idMedecin}/disponibilites`, {
        params: { annee, mois },
      });
      setJoursDuMois(res.data?.jours ?? []);
    } catch (e) {
      console.log("Erreur calendrier:", e.message);
      setJoursDuMois([]);
    } finally {
      setLoading(false);
    }
  };

  // Chargement des rendez-vous du patient
  useEffect(() => {
    if (idPatient) chargerMesRendezVous();
  }, [idPatient]);

  useEffect(() => {
    if (onglet === "mesrdv" && idPatient) {
      chargerMesRendezVous();
      const interval = setInterval(chargerMesRendezVous, 10000);
      return () => clearInterval(interval);
    }
  }, [onglet, idPatient]);

  useEffect(() => {
    if (mesRendezVous.length > 0) chargerStatutsVideo();
  }, [mesRendezVous]);

  useEffect(() => {
    if (onglet === "mesrdv" && mesRendezVous.length > 0 && rdvId) {
      const index = mesRendezVous.findIndex(r => r.id === rdvId);
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

  const chargerMesRendezVous = async () => {
    try {
      const response = await API.get(`/rendezvous/patient/${idPatient}`);
      const rdvs     = response.data?.rendez_vous ?? response.data?.data ?? response.data ?? [];
      setMesRendezVous(Array.isArray(rdvs) ? rdvs : []);
    } catch (error) {
      console.log("Erreur mes RDV:", error.message);
    }
  };

  const chargerStatutsVideo = async () => {
    if (!idPatient) return;
    try {
      setRefreshingStatus(true);
      const dossierRes        = await API.get(`/dossiers/patient/${idPatient}`);
      const dossiers          = dossierRes.data?.dossiers ?? [];
      const toutesConsultations = [];
      for (const dossier of dossiers) {
        try {
          const consultRes    = await API.get(`/consultations/dossier/${dossier.id}`);
          toutesConsultations.push(...(consultRes.data?.consultations ?? []));
        } catch {}
      }
      const updates = {};
      for (const rdv of mesRendezVous) {
        if (rdv.etat !== "confirmé") continue;
        let consultation = toutesConsultations.find(
          c => c.type === "video" && c.rendez_vous_id === rdv.id
        );
        if (!consultation) {
          consultation = toutesConsultations.find(
            c => c.type === "video" &&
              c.date_consultation?.substring(0, 10) === rdv.date?.substring(0, 10)
          );
        }
        updates[rdv.id] = consultation?.statut_video ?? "en_attente";
      }
      setVideoStatus(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error("Erreur statuts vidéo:", error);
    } finally {
      setRefreshingStatus(false);
    }
  };
  

  const rejoindreVideo = async (rdv) => {
    if (videoStatus[rdv.id] !== "en_cours") {
      Alert.alert("Info", "Le médecin n'a pas encore démarré la consultation.");
      return;
    }
    try {
      const dossierRes = await API.get(`/dossiers/patient/${idPatient}`);
      const dossiers   = dossierRes.data?.dossiers ?? [];
      let consultation = null;
      for (const dossier of dossiers) {
        const consultRes    = await API.get(`/consultations/dossier/${dossier.id}`);
        const consultations = consultRes.data?.consultations ?? [];
        consultation = consultations.find(c => c.type === "video" && c.rendez_vous_id === rdv.id)
          ?? consultations.find(c =>
              c.type === "video" &&
              c.date_consultation?.substring(0, 10) === rdv.date?.substring(0, 10)
            );
        if (consultation) break;
      }
      if (!consultation || consultation.statut_video !== "en_cours") {
        Alert.alert("Info", "Consultation vidéo non disponible.");
        return;
      }
      await API.post(`/consultations/${consultation.id}/video/rejoindre`);
      navigation.navigate("ConsultationVideo", { consultationId: consultation.id, role: "patient" });
    } catch (e) {
      Alert.alert("Erreur", e.response?.data?.message ?? "Impossible de rejoindre");
    }
  };

  // Navigation mois
  const changerMois = (direction) => {
    const n = new Date(moisActuel);
    n.setMonth(moisActuel.getMonth() + direction);
    setMoisActuel(n);
  };

  // Sélection d'un jour
  const handleJourPress = (jour) => {
    if (!jour.estDisponible) return;
    setSelectedDate(jour.date);
    setHeuresDisponibles(jour.heuresDisponibles ?? []);
    setShowHeureModal(true);
  };

const confirmerRendezVous = async (date, heure, type = "presentiel") => {
  if (!idPatient) {
    Alert.alert("Non connecté", "Impossible de récupérer votre profil patient.");
    return;
  }
  try {
    await API.post("/rendezvous", {
      id_patient: parseInt(idPatient),
      id_medecin: parseInt(idMedecin),
      date, heure,
      type_consultation: type,
    });
    
    const messages = {
      "en_ligne": "Demande de Rendez-Vous en ligne envoyée, en attente de confirmation.",
      "presentiel": "Demande de Rendez-Vous présentiel envoyée, en attente de confirmation."
    };
    
    showAlert("Succès 🎉", messages[type] || "Demande envoyée, en attente de confirmation.", [
      { text: "OK", onPress: () => {
          chargerCalendrier();
          setShowHeureModal(false);
        }
      }
    ]);
  } catch (error) {
    // Gestion des erreurs identique...
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

  // Rendu d'un jour
  const renderJour = (item, index) => {
    if (item.vide) return <View key={`vide-${index}`} style={styles.jourVide} />;

    let bg = "#f0f0f0";
    let textColor = "#94A3B8";

    if (item.estConge) {
      bg = "#FEF3C7";
    } else if (item.estJourNonTravaille) {
      bg = "#F1F5F9";
    } else if (!item.estPasse && item.estDisponible) {
      bg = "#DCFCE7";
      textColor = "#065F46";
    } else if (!item.estPasse && !item.estDisponible) {
      bg = "#FEE2E2";
      textColor = "#991B1B";
    }

    return (
      <TouchableOpacity
        key={item.date}
        style={[styles.jour, { backgroundColor: bg }]}
        onPress={() => handleJourPress(item)}
        disabled={!item.estDisponible}
        activeOpacity={item.estDisponible ? 0.7 : 1}
      >
        <Text style={[styles.jourNumero, { color: textColor }]}>{item.jour}</Text>
        {!item.estPasse && !item.estJourNonTravaille && (
          <Text style={[styles.dispoBadge, { color: textColor }]} numberOfLines={1}>
            {item.messageDispo}
          </Text>
        )}
        {item.estConge && <Text style={styles.congeBadge}>🏖</Text>}
      </TouchableOpacity>
    );
  };

  // Rendu bouton vidéo
  const renderBoutonVideo = (rdv) => {
    if (rdv.etat !== "confirmé") return null;
    const statut  = videoStatus[rdv.id] ?? "en_attente";
    const enCours = statut === "en_cours";
    return (
      <>
        <View style={styles.statutVideoRow}>
          <View style={[styles.statutDot, {
            backgroundColor: enCours ? "#10B981" : statut === "terminee" ? "#64748B" : "#F59E0B"
          }]} />
          <Text style={styles.statutVideoText}>
            {enCours ? "Consultation en cours" : statut === "terminee" ? "Consultation terminée" : "En attente du médecin"}
          </Text>
          {refreshingStatus && <ActivityIndicator size="small" color="#94A3B8" style={{ marginLeft: 8 }} />}
        </View>
        <TouchableOpacity
          style={[styles.videoBtn, !enCours && styles.videoBtnDisabled]}
          onPress={() => rejoindreVideo(rdv)}
          disabled={!enCours}
        >
          <Ionicons name="videocam" size={18} color="#FFF" />
          <Text style={styles.videoBtnText}>
            {enCours ? "Rejoindre la consultation vidéo" : "En attente du médecin..."}
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  // Décalage du premier jour
  const joursAvecVides = () => {
    if (!joursDuMois.length) return [];
    const annee       = moisActuel.getFullYear();
    const mois        = moisActuel.getMonth();
    const premierJour = new Date(annee, mois, 1);
    const decalage    = premierJour.getDay() === 0 ? 6 : premierJour.getDay() - 1;
    const vides       = Array.from({ length: decalage }, (_, i) => ({ vide: true, key: `v${i}` }));
    return [...vides, ...joursDuMois];
  };

  return (
    <View style={styles.container}>
      {/* Onglets */}
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
          <Ionicons name="list-outline" size={16} color={onglet === "mesrdv" ? "#FFF" : "#64748B"} />
          <Text style={[styles.ongletText, onglet === "mesrdv" && styles.ongletTextActif]}>Mes Rendez-Vous</Text>
        </TouchableOpacity>
      </View>

      {/* Calendrier */}
      {onglet === "calendrier" && idMedecin && (
        <>
          <View style={styles.medecinBanner}>
            <View style={styles.medecinAvatar}>
              <Text style={styles.medecinAvatarText}>{nomMedecin.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.medecinNom}>Dr. {nomMedecin}</Text>
              {specialite ? <Text style={styles.medecinSpec}>{specialite}</Text> : null}
            </View>
          </View>

          <View style={styles.navigation}>
            <TouchableOpacity onPress={() => changerMois(-1)} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color="#10B981" />
            </TouchableOpacity>
            <Text style={styles.mois}>
              {moisActuel.toLocaleString("fr-FR", { month: "long", year: "numeric" })}
            </Text>
            <TouchableOpacity onPress={() => changerMois(1)} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color="#10B981" />
            </TouchableOpacity>
          </View>

          <View style={styles.joursSemaine}>
            {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(j => (
              <Text key={j} style={styles.jourSemaine}>{j}</Text>
            ))}
          </View>

          <View style={styles.legende}>
            {[
              ["#DCFCE7","Disponible"],
              ["#FEE2E2","Complet"],
              ["#FEF3C7","Congé"],
              ["#F1F5F9","Non travaillé"],
            ].map(([c, l]) => (
              <View key={l} style={styles.legendeItem}>
                <View style={[styles.legendeColor, { backgroundColor: c }]} />
                <Text style={styles.legendeText}>{l}</Text>
              </View>
            ))}
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>Chargement de l'agenda...</Text>
            </View>
          ) : joursDuMois.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="calendar-outline" size={50} color="#CBD5E1" />
              <Text style={styles.emptyText}>Ce médecin n'a pas encore</Text>
              <Text style={styles.emptyText}>configuré son agenda.</Text>
            </View>
          ) : (
            <ScrollView>
              <View style={styles.calendrier}>
                {joursAvecVides().map((jour, index) =>
                  jour.vide
                    ? <View key={jour.key} style={styles.jourVide} />
                    : renderJour(jour, index)
                )}
              </View>
            </ScrollView>
          )}
        </>
      )}

      {/* Mes rendez-vous */}
      {onglet === "mesrdv" && (
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, padding: 16 }}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View style={styles.refreshHeader}>
            <Text style={styles.refreshTitle}>Mes rendez-vous</Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => { chargerMesRendezVous(); chargerStatutsVideo(); }}
              disabled={refreshingStatus}
            >
              <Ionicons name="refresh-outline" size={20} color="#3B82F6" />
              <Text style={styles.refreshBtnText}>Actualiser</Text>
            </TouchableOpacity>
          </View>

          {mesRendezVous.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="calendar-outline" size={50} color="#CBD5E1" />
              <Text style={styles.emptyText}>Aucun rendez-vous</Text>
            </View>
          ) : (
            mesRendezVous.map(rdv => (
              <View
                key={rdv.id}
                ref={ref => rdvItemRefs.current[rdv.id] = ref}
                style={[styles.rdvCard, highlightedRdvId === rdv.id && styles.highlightedRdvCard]}
              >
                <Text style={styles.rdvText}>
                  👨‍⚕️ Dr. {rdv.medecin?.user?.prenom ?? rdv.medecin?.nom ?? "Médecin"}
                </Text>
                <Text style={styles.rdvText}>📅 {rdv.date} à {rdv.heure?.substring(0, 5)}</Text>
                <View style={[styles.etatBadge, { backgroundColor: getEtatColor(rdv.etat) + "20" }]}>
                  <Text style={[styles.etatText, { color: getEtatColor(rdv.etat) }]}>{rdv.etat}</Text>
                </View>
                {rdv.etat === "refusé" && rdv.motif_refus && (
  <View style={styles.motifRefusBox}>
    <Ionicons name="information-circle-outline" size={15} color="#991B1B" />
    <Text style={styles.motifRefusText}>
      Motif : {rdv.motif_refus}{"\n"}
      <Text style={{ fontStyle: "italic", color: "#64748B" }}>
        Nous nous excusons pour la gêne occasionnée.
      </Text>
    </Text>
  </View>
)}
                {renderBoutonVideo(rdv)}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal sélection heure */}
      <Modal
  visible={showHeureModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowHeureModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <View style={styles.modalHandle} />
      <Text style={styles.modalTitle}>Choisir un créneau</Text>
      <Text style={styles.modalSubtitle}>📅 {selectedDate}</Text>

      {/* --- NOUVEAU : sélection du type --- */}
      <Text style={styles.typeLabel}>Type de consultation</Text>
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeCard, typeConsultation === "presentiel" && styles.typeCardActif]}
          onPress={() => setTypeConsultation("presentiel")}
        >
          <Text style={styles.typeIcon}>🏥</Text>
          <Text style={[styles.typeCardTitle, typeConsultation === "presentiel" && styles.typeCardTitleActif]}>Présentiel</Text>
          <Text style={styles.typeCardSub}>Au cabinet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeCard, typeConsultation === "en_ligne" && styles.typeCardActifBleu]}
          onPress={() => setTypeConsultation("en_ligne")}
        >
          <Text style={styles.typeIcon}>💻</Text>
          <Text style={[styles.typeCardTitle, typeConsultation === "en_ligne" && styles.typeCardTitleBleu]}>En ligne</Text>
          <Text style={styles.typeCardSub}>Vidéo consultation</Text>
        </TouchableOpacity>
      </View>
      {/* ---------------------------------- */}

      <ScrollView style={styles.heureList}>
        {heuresDisponibles.map(heure => (
          <TouchableOpacity
            key={heure}
            style={styles.heureItem}
            onPress={() => {
              setShowHeureModal(false);
              confirmerRendezVous(selectedDate, heure, typeConsultation); // ← passer le type
            }}
          >
            <Ionicons name="time-outline" size={16} color="#10B981" />
            <Text style={styles.heureText}>{heure}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.cancelButton} onPress={() => setShowHeureModal(false)}>
        <Text style={styles.cancelButtonText}>Annuler</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#f5f5f5" },
  centerContainer:{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, minHeight: 200 },
  loadingText:    { marginTop: 10, fontSize: 14, color: "#64748B" },
  emptyText:      { color: "#94A3B8", fontSize: 15, marginTop: 4, textAlign: "center" },

  onglets:        { flexDirection: "row", backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  onglet:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  ongletActif:    { backgroundColor: "#10B981" },
  ongletText:     { fontSize: 14, fontWeight: "600", color: "#64748B" },
  ongletTextActif:{ color: "#FFF" },

  medecinBanner:     { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  medecinAvatar:     { width: 42, height: 42, borderRadius: 21, backgroundColor: "#DCFCE7", justifyContent: "center", alignItems: "center" },
  medecinAvatarText: { fontSize: 18, fontWeight: "bold", color: "#10B981" },
  medecinNom:        { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  medecinSpec:       { fontSize: 12, color: "#64748B" },

  navigation:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, backgroundColor: "#FFF" },
  navBtn:       { padding: 8 },
  mois:         { fontSize: 17, fontWeight: "bold", textTransform: "capitalize", color: "#0F172A" },

  joursSemaine: { flexDirection: "row", paddingHorizontal: 10, marginTop: 6, marginBottom: 2, backgroundColor: "#FFF" },
  jourSemaine:  { flex: 1, textAlign: "center", fontWeight: "bold", fontSize: 11, color: "#475569", paddingVertical: 4 },

  legende:      { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, paddingVertical: 8, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  legendeItem:  { flexDirection: "row", alignItems: "center", gap: 4 },
  legendeColor: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: "#ddd" },
  legendeText:  { fontSize: 10, color: "#64748B" },

  calendrier:   { flexDirection: "row", flexWrap: "wrap", padding: 8 },
  jour:         { width: "14.28%", aspectRatio: 0.85, borderWidth: 0.5, borderColor: "#E2E8F0", padding: 3, justifyContent: "space-between", alignItems: "flex-start" },
  jourVide:     { width: "14.28%", aspectRatio: 0.85 },
  jourNumero:   { fontSize: 13, fontWeight: "bold" },
  dispoBadge:   { fontSize: 7, textAlign: "left", lineHeight: 9 },
  congeBadge:   { fontSize: 10 },

  refreshHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  refreshTitle:   { fontSize: 16, fontWeight: "bold", color: "#0F172A" },
  refreshBtn:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  refreshBtnText: { fontSize: 12, color: "#3B82F6", fontWeight: "600" },

  rdvCard:            { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  highlightedRdvCard: { backgroundColor: "#DBEAFE", borderLeftWidth: 4, borderLeftColor: "#3B82F6" },
  rdvText:            { fontSize: 14, color: "#334155", marginBottom: 4 },
  etatBadge:          { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 6 },
  etatText:           { fontWeight: "bold", fontSize: 12 },

  statutVideoRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 6 },
  statutDot:      { width: 8, height: 8, borderRadius: 4 },
  statutVideoText:{ fontSize: 12, color: "#64748B" },
  videoBtn:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#3B82F6", padding: 12, borderRadius: 10, marginTop: 8 },
  videoBtnDisabled:   { backgroundColor: "#94A3B8", opacity: 0.6 },
  videoBtnText:       { color: "#FFF", fontWeight: "700", fontSize: 14 },

  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "65%", alignItems: "center" },
  modalHandle:    { width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, marginBottom: 14 },
  modalTitle:     { fontSize: 18, fontWeight: "bold", color: "#0F172A", marginBottom: 4 },
  modalSubtitle:  { fontSize: 14, color: "#64748B", marginBottom: 14 },
  heureList:      { width: "100%", marginBottom: 12 },
  heureItem:      { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F0FDF4", padding: 14, borderRadius: 12, marginVertical: 4 },
  heureText:      { fontSize: 16, fontWeight: "600", color: "#065F46" },
  cancelButton:   { backgroundColor: "#F1F5F9", paddingVertical: 13, paddingHorizontal: 20, borderRadius: 12, width: "100%", alignItems: "center" },
  cancelButtonText:{ color: "#64748B", fontWeight: "bold", fontSize: 15 },
  typeLabel:          { alignSelf: "flex-start", fontSize: 12, fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
typeRow:            { flexDirection: "row", gap: 10, width: "100%", marginBottom: 14 },
typeCard:           { flex: 1, borderWidth: 0.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, alignItems: "center", backgroundColor: "#F8FAFC" },
typeCardActif:      { borderWidth: 2, borderColor: "#10B981", backgroundColor: "#F0FDF4" },
typeCardActifBleu:  { borderWidth: 2, borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
typeIcon:           { fontSize: 22, marginBottom: 4 },
typeCardTitle:      { fontSize: 14, fontWeight: "600", color: "#334155" },
typeCardTitleActif: { color: "#065F46" },
typeCardTitleBleu:  { color: "#1D4ED8" },
typeCardSub:        { fontSize: 11, color: "#94A3B8", marginTop: 2 },
});