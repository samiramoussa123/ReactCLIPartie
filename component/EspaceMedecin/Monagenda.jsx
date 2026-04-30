import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Switch, Modal, TextInput,
  Dimensions, Platform
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from 'react-native-linear-gradient';
import API from "../../api/api";

const { width } = Dimensions.get('window');

const JOURS = [
  { id: 1, label: "Lundi",    court: "Lun" },
  { id: 2, label: "Mardi",    court: "Mar" },
  { id: 3, label: "Mercredi", court: "Mer" },
  { id: 4, label: "Jeudi",    court: "Jeu" },
  { id: 5, label: "Vendredi", court: "Ven" },
  { id: 6, label: "Samedi",   court: "Sam" },
];

const DUREES = [
  { val: 15, label: "15 min" },
  { val: 20, label: "20 min" },
  { val: 30, label: "30 min" },
  { val: 45, label: "45 min" },
  { val: 60, label: "1 h"    },
];

const HEURES_OPTIONS = (() => {
  const opts = [];
  for (let h = 7; h <= 21; h++) {
    opts.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 21) opts.push(`${String(h).padStart(2, "0")}:30`);
  }
  return opts;
})();

const defaultDispo = () => ({
  jour_semaine:  1,
  heure_debut:   "09:00",
  heure_fin:     "17:00",
  duree_creneau: 60,
  actif:         true,
});

export default function MonAgenda({ navigation }) {
  const [idMedecin, setIdMedecin]           = useState(null);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [disponibilites, setDisponibilites] = useState([]);
  const [conges, setConges]                 = useState([]);

  // Modals
  const [showCongeModal, setShowCongeModal] = useState(false);
  const [congeDebut, setCongeDebut]         = useState("");
  const [congeFin, setCongeFin]             = useState("");
  const [congeMotif, setCongeMotif]         = useState("");
  const [savingConge, setSavingConge]       = useState(false);

  const [showHeureModal, setShowHeureModal]   = useState(false);
  const [heureModalCible, setHeureModalCible] = useState(null);

  const [showDureeModal, setShowDureeModal] = useState(false);
  const [dureeModalIndex, setDureeModalIndex] = useState(null);

  useEffect(() => { chargerMedecin(); }, []);

  const chargerMedecin = async () => {
    try {
      const res  = await API.get("/me");
      const user = res.data?.user ?? res.data;
      const id   = user?.medecin?.id;
      if (!id) { setLoading(false); return; }
      setIdMedecin(id);
      await chargerAgenda(id);
    } catch (e) {
      console.error(e.message);
      setLoading(false);
    }
  };

  const chargerAgenda = async (id) => {
    try {
      const res   = await API.get(`/agenda/medecin/${id}`);
      const dispos = res.data?.disponibilites ?? [];
      setDisponibilites(
        dispos.map(d => ({
          jour_semaine:  d.jour_semaine,
          heure_debut:   d.heure_debut?.substring(0, 5),
          heure_fin:     d.heure_fin?.substring(0, 5),
          duree_creneau: d.duree_creneau,
          actif:         d.actif,
        }))
      );
      setConges(res.data?.conges ?? []);
    } catch (e) {
      console.error("Erreur chargement agenda:", e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── CRUD disponibilités ──
  const ajouterJour = () => {
    const joursUtilises = disponibilites.map(d => d.jour_semaine);
    const jourLibre = JOURS.find(j => !joursUtilises.includes(j.id));
    if (!jourLibre) {
      Alert.alert("Info", "Tous les jours de la semaine sont déjà configurés.");
      return;
    }
    setDisponibilites(prev => [...prev, { ...defaultDispo(), jour_semaine: jourLibre.id }]);
  };

  const supprimerJour = (index) => {
    Alert.alert("Supprimer", "Retirer ce jour de votre agenda ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => setDisponibilites(prev => prev.filter((_, i) => i !== index)) },
    ]);
  };

  const modifierJour = (index, jourId) => {
    const dejaPris = disponibilites.some((d, i) => i !== index && d.jour_semaine === jourId);
    if (dejaPris) { Alert.alert("Doublon", "Ce jour est déjà configuré."); return; }
    setDisponibilites(prev => prev.map((d, i) => i === index ? { ...d, jour_semaine: jourId } : d));
  };

  const modifierHeure = (index, champ, valeur) => {
    setDisponibilites(prev => prev.map((d, i) => i === index ? { ...d, [champ]: valeur } : d));
  };

  const modifierDuree = (index, valeur) => {
    setDisponibilites(prev => prev.map((d, i) => i === index ? { ...d, duree_creneau: valeur } : d));
  };

  const toggleActif = (index) => {
    setDisponibilites(prev => prev.map((d, i) => i === index ? { ...d, actif: !d.actif } : d));
  };

  const sauvegarder = async () => {
    for (const d of disponibilites) {
      if (d.heure_debut >= d.heure_fin) {
        Alert.alert("Erreur", `Heure de fin invalide — ${JOURS.find(j => j.id === d.jour_semaine)?.label}`);
        return;
      }
    }
    setSaving(true);
    try {
      await API.post(`/agenda/medecin/${idMedecin}`, {
        disponibilites: disponibilites.filter(d => d.actif),
      });
      Alert.alert("✅ Sauvegardé", "Votre agenda a été mis à jour.");
    } catch (e) {
      Alert.alert("Erreur", e.response?.data?.message ?? e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── CRUD congés ──
  const ajouterConge = async () => {
    if (!congeDebut || !congeFin) {
      Alert.alert("Erreur", "Veuillez renseigner les dates de début et de fin.");
      return;
    }
    if (congeDebut > congeFin) {
      Alert.alert("Erreur", "La date de fin doit être après la date de début.");
      return;
    }
    setSavingConge(true);
    try {
      await API.post(`/agenda/medecin/${idMedecin}/conge`, {
        date_debut: congeDebut, date_fin: congeFin, motif: congeMotif,
      });
      setShowCongeModal(false);
      setCongeDebut(""); setCongeFin(""); setCongeMotif("");
      await chargerAgenda(idMedecin);
      Alert.alert("✅ Congé ajouté");
    } catch (e) {
      Alert.alert("Erreur", e.response?.data?.message ?? e.message);
    } finally {
      setSavingConge(false);
    }
  };

  const supprimerConge = (congeId) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer ce congé ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          try {
            await API.delete(`/agenda/medecin/${idMedecin}/conge/${congeId}`);
            await chargerAgenda(idMedecin);
          } catch {
            Alert.alert("Erreur", "Impossible de supprimer le congé");
          }
        },
      },
    ]);
  };

  // ── Sélecteur jours ──
  const renderSelectorJour = (index, jourActuel) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jourChips}>
      {JOURS.map(j => {
        const pris = disponibilites.some((d, i) => i !== index && d.jour_semaine === j.id);
        return (
          <TouchableOpacity
            key={j.id}
            style={[styles.chip, jourActuel === j.id && styles.chipActif, pris && styles.chipDisabled]}
            onPress={() => !pris && modifierJour(index, j.id)}
            disabled={pris}
          >
            <Text style={[styles.chipText, jourActuel === j.id && styles.chipTextActif]}>{j.court}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Chargement de votre agenda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          {/* ✅ Bouton retour */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Accueil')}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>

          <Ionicons name="calendar" size={28} color="#FFF" />
          <Text style={styles.headerTitle}>Mon Agenda</Text>
          <Text style={styles.headerSubtitle}>Gérez vos disponibilités et congés</Text>
        </LinearGradient>

        {/* ── Section disponibilités ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📅 Jours et horaires</Text>
            <TouchableOpacity style={styles.addBtn} onPress={ajouterJour}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.addBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {disponibilites.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={48} color="#C7D2FE" />
              <Text style={styles.emptyText}>Aucune disponibilité</Text>
              <Text style={styles.emptySubtext}>Appuyez sur "Ajouter" pour commencer</Text>
            </View>
          ) : (
            disponibilites
              .slice()
              .sort((a, b) => a.jour_semaine - b.jour_semaine)
              .map((dispo) => {
                const realIndex = disponibilites.indexOf(dispo);
                return (
                  <View key={realIndex} style={[styles.dispoCard, !dispo.actif && styles.dispoCardInactif]}>
                    <View style={styles.dispoHeader}>
                      <Text style={styles.jourLabel}>
                        {JOURS.find(j => j.id === dispo.jour_semaine)?.label ?? "?"}
                      </Text>
                      <View style={styles.headerActions}>
                        <Switch
                          value={dispo.actif}
                          onValueChange={() => toggleActif(realIndex)}
                          trackColor={{ false: "#E2E8F0", true: "#A5B4FC" }}
                          thumbColor={dispo.actif ? "#4F46E5" : "#94A3B8"}
                          ios_backgroundColor="#E2E8F0"
                        />
                        <TouchableOpacity onPress={() => supprimerJour(realIndex)} style={styles.deleteBtn}>
                          <Ionicons name="trash-outline" size={20} color="#F87171" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {renderSelectorJour(realIndex, dispo.jour_semaine)}

                    <View style={styles.horairesRow}>
                      <TouchableOpacity
                        style={styles.heureBtn}
                        onPress={() => { setHeureModalCible({ index: realIndex, champ: "heure_debut" }); setShowHeureModal(true); }}
                      >
                        <Ionicons name="time-outline" size={16} color="#4F46E5" />
                        <Text style={styles.heureBtnText}>{dispo.heure_debut}</Text>
                      </TouchableOpacity>

                      <Text style={styles.heureSepar}>→</Text>

                      <TouchableOpacity
                        style={styles.heureBtn}
                        onPress={() => { setHeureModalCible({ index: realIndex, champ: "heure_fin" }); setShowHeureModal(true); }}
                      >
                        <Ionicons name="time-outline" size={16} color="#4F46E5" />
                        <Text style={styles.heureBtnText}>{dispo.heure_fin}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dureeBtn}
                        onPress={() => { setDureeModalIndex(realIndex); setShowDureeModal(true); }}
                      >
                        <Ionicons name="stopwatch-outline" size={16} color="#8B5CF6" />
                        <Text style={styles.dureeBtnText}>
                          {DUREES.find(d => d.val === dispo.duree_creneau)?.label ?? `${dispo.duree_creneau}min`}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {dispo.actif && (
                      <Text style={styles.creneauxInfo}>
                        {compterCreneaux(dispo.heure_debut, dispo.heure_fin, dispo.duree_creneau)} créneaux disponibles par jour
                      </Text>
                    )}
                  </View>
                );
              })
          )}
        </View>

        {/* ── Section congés ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✈️ Congés & absences</Text>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#F59E0B" }]} onPress={() => setShowCongeModal(true)}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.addBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {conges.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="sunny-outline" size={44} color="#C7D2FE" />
              <Text style={styles.emptyText}>Aucun congé planifié</Text>
              <Text style={styles.emptySubtext}>Ajoutez vos périodes d'indisponibilité</Text>
            </View>
          ) : (
            conges.map(conge => (
              <View key={conge.id} style={styles.congeCard}>
                <View style={styles.congeInfo}>
                  <Ionicons name="calendar-clear-outline" size={20} color="#F97316" />
                  <View>
                    <Text style={styles.congeDates}>{conge.date_debut} → {conge.date_fin}</Text>
                    {conge.motif ? <Text style={styles.congeMotif}>{conge.motif}</Text> : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => supprimerConge(conge.id)}>
                  <Ionicons name="close-circle" size={24} color="#F87171" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* ── Bouton sauvegarder ── */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={sauvegarder}
          disabled={saving}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={saving ? ['#94A3B8', '#CBD5E1'] : ['#4F46E5', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            {saving
              ? <ActivityIndicator color="#FFF" />
              : <>
                  <Ionicons name="checkmark-done-circle-outline" size={22} color="#FFF" />
                  <Text style={styles.saveBtnText}>Sauvegarder l'agenda</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Modal sélection heure ── */}
      <Modal visible={showHeureModal} transparent animationType="slide" onRequestClose={() => setShowHeureModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {heureModalCible?.champ === "heure_debut" ? "🕐 Heure de début" : "🕐 Heure de fin"}
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {HEURES_OPTIONS.map(h => (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.heureOption,
                    heureModalCible && disponibilites[heureModalCible.index]?.[heureModalCible.champ] === h && styles.heureOptionActif,
                  ]}
                  onPress={() => {
                    if (heureModalCible) modifierHeure(heureModalCible.index, heureModalCible.champ, h);
                    setShowHeureModal(false);
                  }}
                >
                  <Text style={styles.heureOptionText}>{h}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowHeureModal(false)}>
              <Text style={styles.cancelBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal sélection durée ── */}
      <Modal visible={showDureeModal} transparent animationType="slide" onRequestClose={() => setShowDureeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>⏱ Durée d'un créneau</Text>
            {DUREES.map(d => (
              <TouchableOpacity
                key={d.val}
                style={[
                  styles.heureOption,
                  dureeModalIndex !== null && disponibilites[dureeModalIndex]?.duree_creneau === d.val && styles.heureOptionActif,
                ]}
                onPress={() => {
                  if (dureeModalIndex !== null) modifierDuree(dureeModalIndex, d.val);
                  setShowDureeModal(false);
                }}
              >
                <Text style={styles.heureOptionText}>{d.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDureeModal(false)}>
              <Text style={styles.cancelBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal ajout congé ── */}
      <Modal visible={showCongeModal} transparent animationType="slide" onRequestClose={() => setShowCongeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>✈️ Ajouter un congé</Text>

            <Text style={styles.inputLabel}>Date de début (AAAA-MM-JJ)</Text>
            <TextInput
              style={styles.input}
              placeholder="ex: 2025-07-01"
              placeholderTextColor="#94A3B8"
              value={congeDebut}
              onChangeText={setCongeDebut}
            />

            <Text style={styles.inputLabel}>Date de fin (AAAA-MM-JJ)</Text>
            <TextInput
              style={styles.input}
              placeholder="ex: 2025-07-15"
              placeholderTextColor="#94A3B8"
              value={congeFin}
              onChangeText={setCongeFin}
            />

            <Text style={styles.inputLabel}>Motif (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Vacances, formation..."
              placeholderTextColor="#94A3B8"
              value={congeMotif}
              onChangeText={setCongeMotif}
            />

            {/* ✅ Boutons côte à côte avec LinearGradient sur Confirmer */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelBtnModal}
                onPress={() => { setShowCongeModal(false); setCongeDebut(""); setCongeFin(""); setCongeMotif(""); }}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtnWrapper}
                onPress={ajouterConge}
                disabled={savingConge}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={savingConge ? ['#94A3B8', '#CBD5E1'] : ['#F59E0B', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmBtnGradient}
                >
                  {savingConge
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                        <Text style={styles.confirmBtnText}>Confirmer</Text>
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function compterCreneaux(debut, fin, dureeMin) {
  const [hd, md] = debut.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  const totalMin = (hf * 60 + mf) - (hd * 60 + md);
  return totalMin > 0 ? Math.floor(totalMin / dureeMin) : 0;
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#F5F7FA" },
  center:      { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F7FA" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#4B5563" },

  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: "center",
    position: "relative",
  },
  // ✅ Bouton retour positionné en haut à gauche du header
  backButton: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 58 : 38,
    left: 16,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  headerTitle:    { fontSize: 24, fontWeight: "700", color: "#FFF", marginTop: 8, letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: "#E0E7FF", marginTop: 4 },

  section:       { marginHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle:  { fontSize: 17, fontWeight: "600", color: "#1E293B" },
  addBtn:        { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#4F46E5", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 30, elevation: 2 },
  addBtnText:    { color: "#FFF", fontSize: 13, fontWeight: "600" },

  emptyBox:    { alignItems: "center", paddingVertical: 40, backgroundColor: "#FFF", borderRadius: 24, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  emptyText:   { fontSize: 16, fontWeight: "600", color: "#64748B" },
  emptySubtext:{ fontSize: 13, color: "#94A3B8" },

  dispoCard:        { backgroundColor: "#FFF", borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  dispoCardInactif: { opacity: 0.55, backgroundColor: "#F8FAFC" },
  dispoHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  jourLabel:        { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  headerActions:    { flexDirection: "row", alignItems: "center", gap: 12 },
  deleteBtn:        { padding: 4 },

  jourChips:     { marginBottom: 12 },
  chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 30, backgroundColor: "#F1F5F9", marginRight: 8 },
  chipActif:     { backgroundColor: "#4F46E5" },
  chipDisabled:  { opacity: 0.3 },
  chipText:      { fontSize: 12, fontWeight: "600", color: "#475569" },
  chipTextActif: { color: "#FFF" },

  horairesRow:  { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 },
  heureBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F1F5F9", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 40 },
  heureBtnText: { fontSize: 14, fontWeight: "600", color: "#4F46E5" },
  heureSepar:   { fontSize: 16, color: "#94A3B8", fontWeight: "300" },
  dureeBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F3E8FF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 40, marginLeft: "auto" },
  dureeBtnText: { fontSize: 13, fontWeight: "600", color: "#8B5CF6" },
  creneauxInfo: { fontSize: 11, color: "#6B7280", marginTop: 10, textAlign: "right" },

  congeCard:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderRadius: 18, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  congeInfo:  { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  congeDates: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  congeMotif: { fontSize: 12, color: "#64748B", marginTop: 2 },

  saveBtn:         { marginHorizontal: 20, marginTop: 16, marginBottom: 30, borderRadius: 60, overflow: 'hidden' },
  saveGradient:    { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText:     { color: "#FFF", fontWeight: "700", fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox:     { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: "75%" },
  modalTitle:   { fontSize: 19, fontWeight: "700", color: "#1E293B", marginBottom: 18, textAlign: "center" },

  heureOption:      { paddingVertical: 14, borderRadius: 50, marginBottom: 8, backgroundColor: "#F8FAFC", alignItems: "center" },
  heureOptionActif: { backgroundColor: "#E0E7FF", borderWidth: 1, borderColor: "#4F46E5" },
  heureOptionText:  { fontSize: 16, fontWeight: "500", color: "#0F172A" },

  cancelBtn:      { backgroundColor: "#F1F5F9", paddingVertical: 14, borderRadius: 50, alignItems: "center", marginTop: 12 },
  cancelBtnText:  { color: "#475569", fontWeight: "600" },

  inputLabel: { fontSize: 14, fontWeight: "600", color: "#475569", marginBottom: 6 },
  input:      { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 14, fontSize: 15, color: "#0F172A", marginBottom: 14 },

  // ✅ Boutons modal congé
  modalButtonsRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtnModal:  { flex: 1, backgroundColor: "#F1F5F9", paddingVertical: 14, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  confirmBtnWrapper:  { flex: 1, borderRadius: 50, overflow: "hidden" },
  confirmBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 6 },
  confirmBtnText:     { color: "#FFF", fontWeight: "700", fontSize: 15 },
});