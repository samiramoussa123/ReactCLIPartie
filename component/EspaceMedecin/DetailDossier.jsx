import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Modal, TextInput,
  Platform, PermissionsAndroid
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import API from "../../api/api";
import DateInput from "../common/DateInput";
import RNFS from "react-native-fs";
import Sound from "react-native-sound";

export default function DetailDossier({ route, navigation }) {
  const { dossier: initialDossier, idMedecin } = route.params;

  const [dossier, setDossier] = useState(initialDossier);
  const [maladies, setMaladies] = useState([]);
  const [consultations, setConsultations] = useState(initialDossier.consultations ?? []);
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onglet, setOnglet] = useState("maladies");

  // Modal maladie
  const [modalMaladie, setModalMaladie] = useState(false);
  const [editMaladie, setEditMaladie] = useState(null);
  const [nomMaladie, setNomMaladie] = useState("");
  const [dateDiag, setDateDiag] = useState("");
  const [saving, setSaving] = useState(false);

  // État pour la lecture audio
  const [currentSound, setCurrentSound] = useState(null);
  const [currentSoundId, setCurrentSoundId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => { chargerTout(); }, []);

  // Nettoyage à la fermeture de l'écran
  useEffect(() => {
    return () => {
      if (currentSound) {
        currentSound.stop(() => currentSound.release());
      }
    };
  }, [currentSound]);

  // ----------------------------------------------------------------------
  // PERMISSIONS ANDROID
  // ----------------------------------------------------------------------
  const requestAudioPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: "Permission de stockage",
            message: "L'application a besoin d'accéder au stockage pour lire l'enregistrement audio.",
            buttonNeutral: "Demander plus tard",
            buttonNegative: "Annuler",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // ----------------------------------------------------------------------
  // CONVERSION ArrayBuffer -> Base64 (sans btoa)
  // ----------------------------------------------------------------------
  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    for (let i = 0; i < binary.length; i += 3) {
      const a = binary.charCodeAt(i);
      const b = binary.charCodeAt(i + 1);
      const c = binary.charCodeAt(i + 2);
      const b1 = (a >> 2) & 0x3F;
      const b2 = ((a & 0x03) << 4) | ((b >> 4) & 0x0F);
      const b3 = ((b & 0x0F) << 2) | ((c >> 6) & 0x03);
      const b4 = c & 0x3F;
      result += base64chars.charAt(b1) + base64chars.charAt(b2);
      result += isNaN(b) ? '=' : base64chars.charAt(b3);
      result += isNaN(c) ? '=' : base64chars.charAt(b4);
    }
    return result;
  };

  // ----------------------------------------------------------------------
  // TOGGLE AUDIO (PLAY / PAUSE / REPRENDRE)
  // ----------------------------------------------------------------------
  const toggleAudio = async (consultationId) => {
    // Même audio en cours de lecture -> pause
    if (currentSoundId === consultationId && currentSound && isPlaying) {
      currentSound.pause();
      setIsPlaying(false);
      return;
    }
    // Même audio en pause -> reprise
    if (currentSoundId === consultationId && currentSound && !isPlaying) {
      currentSound.play();
      setIsPlaying(true);
      return;
    }
    // Autre audio : arrêter l'ancien
    if (currentSound) {
      currentSound.stop(() => currentSound.release());
      setCurrentSound(null);
      setCurrentSoundId(null);
      setIsPlaying(false);
    }
    // Télécharger et jouer le nouvel audio
    try {
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) return;

      const response = await API.get(`/consultations/${consultationId}/audio`, {
        responseType: 'arraybuffer',
      });

      const base64Audio = arrayBufferToBase64(response.data);
      const fileName = `audio_${consultationId}_${Date.now()}.wav`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, base64Audio, 'base64');

      Sound.setCategory('Playback');
      const sound = new Sound(filePath, '', (error) => {
        if (error) {
          RNFS.unlink(filePath).catch(() => {});
          Alert.alert('Erreur', 'Lecture impossible');
          return;
        }
        sound.play(() => {
          // Fin de lecture
          sound.release();
          RNFS.unlink(filePath).catch(() => {});
          setCurrentSound(null);
          setCurrentSoundId(null);
          setIsPlaying(false);
        });
        setCurrentSound(sound);
        setCurrentSoundId(consultationId);
        setIsPlaying(true);
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Échec du téléchargement audio');
    }
  };

  // ----------------------------------------------------------------------
  // CHARGEMENT DES DONNÉES
  // ----------------------------------------------------------------------
  const chargerTout = async () => {
    await Promise.all([
      chargerMaladies(),
      chargerConsultations(),
      chargerPatientInfo(),
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  const chargerMaladies = async () => {
    try {
      const res = await API.get(`/maladies/dossier/${initialDossier.id}`);
      setMaladies(res.data?.maladies ?? []);
    } catch (e) {
      if (e.response?.status !== 404) console.error("maladies:", e.message);
      setMaladies([]);
    }
  };

  const chargerConsultations = async () => {
    try {
      const res = await API.get(`/consultations/dossier/${initialDossier.id}`);
      setConsultations(res.data?.consultations ?? []);
    } catch (e) {
      if (e.response?.status !== 404) console.error("consultations:", e.message);
      setConsultations([]);
    }
  };

  const chargerPatientInfo = async () => {
    const u = initialDossier.patient?.user;
    if (u?.nom || u?.prenom) {
      setPatientInfo(u);
      return;
    }
    try {
      const medecinId = initialDossier.medecin_id ?? idMedecin;
      if (!medecinId) return;
      const res = await API.get(`/dossiers/medecin/${medecinId}/patient`);
      const patients = res.data?.patients ?? [];
      const patientId = initialDossier.patient_id ?? initialDossier.patient?.id;
      const found = patients.find(p => p.patient_id === patientId);
      if (found) {
        setPatientInfo({ nom: found.nom, prenom: found.prenom, email: found.email });
      }
    } catch (e) {
      console.error("patientInfo:", e.message);
    }
  };

  const patientNom = (() => {
    const prenom = patientInfo?.prenom ?? dossier.patient?.user?.prenom ?? "";
    const nom = patientInfo?.nom ?? dossier.patient?.user?.nom ?? dossier.patient?.nom ?? "";
    return `${prenom} ${nom}`.trim() || `Patient #${dossier.patient_id ?? dossier.patient?.id ?? ""}`;
  })();

  // ----------------------------------------------------------------------
  // CRUD MALADIES
  // ----------------------------------------------------------------------
  const ouvrirModalMaladie = (maladie = null) => {
    setEditMaladie(maladie);
    setNomMaladie(maladie?.nom_maladie ?? "");
    setDateDiag(maladie?.date_diagnostic?.substring(0, 10) ?? "");
    setModalMaladie(true);
  };

  const sauvegarderMaladie = async () => {
    if (!nomMaladie.trim()) { Alert.alert("Erreur", "Nom de la maladie requis"); return; }
    if (!dateDiag.trim()) { Alert.alert("Erreur", "Date de diagnostic requise (YYYY-MM-DD)"); return; }

    setSaving(true);
    try {
      const payload = {
        dossier_medical_id: dossier.id,
        nom_maladie: nomMaladie.trim(),
        date_diagnostic: dateDiag,
      };

      if (editMaladie) {
        await API.put(`/maladies/${editMaladie.id}`, payload);
      } else {
        await API.post("/maladies", payload);
      }

      setModalMaladie(false);
      await chargerMaladies();
      Alert.alert("Succès", editMaladie ? "Maladie modifiée ✓" : "Maladie ajoutée ✓");
    } catch (e) {
      Alert.alert("Erreur", e.response?.data?.message ?? "Impossible de sauvegarder");
    } finally {
      setSaving(false);
    }
  };

  const supprimerMaladie = (id) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer cette maladie ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          try {
            await API.delete(`/maladies/${id}`);
            await chargerMaladies();
          } catch {
            Alert.alert("Erreur", "Impossible de supprimer");
          }
        }
      }
    ]);
  };

  // ----------------------------------------------------------------------
  // AFFICHAGE
  // ----------------------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{patientNom}</Text>
          <Text style={styles.headerSub}>Dossier #{dossier.id}</Text>
        </View>
      </View>

      {/* Carte patient */}
      <View style={styles.patientCard}>
        <View style={styles.patientAvatar}>
          <Text style={styles.patientAvatarText}>
            {patientNom[0]?.toUpperCase() ?? "P"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.patientNom}>{patientNom}</Text>
          <View style={styles.patientDetails}>
            {(dossier.patient?.sexe ?? initialDossier.patient?.sexe) && (
              <View style={styles.detailBadge}>
                <Ionicons name="person-outline" size={12} color="#64748B" />
                <Text style={styles.detailText}>
                  {dossier.patient?.sexe ?? initialDossier.patient?.sexe}
                </Text>
              </View>
            )}
            {(dossier.patient?.dateNaissance ?? initialDossier.patient?.dateNaissance) && (
              <View style={styles.detailBadge}>
                <Ionicons name="calendar-outline" size={12} color="#64748B" />
                <Text style={styles.detailText}>
                  {new Date(dossier.patient?.dateNaissance ?? initialDossier.patient?.dateNaissance).toLocaleDateString("fr-FR")}
                </Text>
              </View>
            )}
            {(patientInfo?.email) && (
              <View style={styles.detailBadge}>
                <Ionicons name="mail-outline" size={12} color="#64748B" />
                <Text style={styles.detailText}>{patientInfo.email}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{maladies.length}</Text>
          <Text style={styles.statLabel}>Maladies</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{consultations.length}</Text>
          <Text style={styles.statLabel}>Consultations</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{new Date(dossier.created_at).getFullYear()}</Text>
          <Text style={styles.statLabel}>Depuis</Text>
        </View>
      </View>

      {/* Onglets */}
      <View style={styles.onglets}>
        <TouchableOpacity
          style={[styles.onglet, onglet === "maladies" && styles.ongletActif]}
          onPress={() => setOnglet("maladies")}
        >
          <Ionicons name="medical-outline" size={16} color={onglet === "maladies" ? "#FFF" : "#64748B"} />
          <Text style={[styles.ongletText, onglet === "maladies" && styles.ongletTextActif]}>
            Maladies ({maladies.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.onglet, onglet === "consultations" && styles.ongletActif]}
          onPress={() => setOnglet("consultations")}
        >
          <Ionicons name="document-text-outline" size={16} color={onglet === "consultations" ? "#FFF" : "#64748B"} />
          <Text style={[styles.ongletText, onglet === "consultations" && styles.ongletTextActif]}>
            Consultations ({consultations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu principal */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); chargerTout(); }}
            colors={["#10B981"]}
          />
        }
      >
        {onglet === "maladies" && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.addBtn} onPress={() => ouvrirModalMaladie()}>
              <Ionicons name="add-circle-outline" size={20} color="#10B981" />
              <Text style={styles.addBtnText}>Ajouter une maladie</Text>
            </TouchableOpacity>

            {maladies.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="medical-outline" size={50} color="#CBD5E1" />
                <Text style={styles.emptyText}>Aucune maladie enregistrée</Text>
              </View>
            ) : (
              maladies.map((m) => (
                <View key={m.id} style={styles.maladieCard}>
                  <View style={styles.maladieLeft}>
                    <View style={styles.maladieIcon}>
                      <Ionicons name="medical" size={18} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.maladieNom}>{m.nom_maladie}</Text>
                      <Text style={styles.maladieDate}>
                        Diagnostiqué le {new Date(m.date_diagnostic).toLocaleDateString("fr-FR")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.maladieActions}>
                    <TouchableOpacity onPress={() => ouvrirModalMaladie(m)}>
                      <Ionicons name="pencil-outline" size={20} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => supprimerMaladie(m.id)} style={{ marginTop: 8 }}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {onglet === "consultations" && (
          <View style={styles.section}>
            {consultations.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="document-text-outline" size={50} color="#CBD5E1" />
                <Text style={styles.emptyText}>Aucune consultation</Text>
                <Text style={styles.emptySubText}>
                  Les consultations apparaissent après un rendez-vous confirmé
                </Text>
              </View>
            ) : (
              consultations.map((c) => (
                <View key={c.id} style={styles.consultCard}>
                  <View style={styles.consultHeader}>
                    <View style={[
                      styles.typeBadge,
                      { backgroundColor: c.type === "video" ? "#EFF6FF" : "#F0FDF4" }
                    ]}>
                      <Ionicons
                        name={c.type === "video" ? "videocam-outline" : "person-outline"}
                        size={14}
                        color={c.type === "video" ? "#3B82F6" : "#10B981"}
                      />
                      <Text style={[styles.typeText,
                        { color: c.type === "video" ? "#3B82F6" : "#10B981" }]}>
                        {c.type === "video" ? "Vidéo" : "Présentiel"}
                      </Text>
                    </View>
                    <Text style={styles.consultDate}>
                      {new Date(c.date_consultation).toLocaleDateString("fr-FR")}
                    </Text>
                  </View>

                  {c.diagnostique ? (
                    <View style={styles.consultSection}>
                      <View style={styles.consultSectionHeader}>
                        <Ionicons name="clipboard-outline" size={14} color="#8B5CF6" />
                        <Text style={styles.consultLabel}>Diagnostic</Text>
                      </View>
                      <Text style={styles.consultValue}>{c.diagnostique}</Text>
                    </View>
                  ) : (
                    <View style={styles.consultSection}>
                      <Text style={styles.consultEmpty}>Aucun diagnostic enregistré</Text>
                    </View>
                  )}

                  {c.traitement ? (
                    <View style={styles.consultSection}>
                      <View style={styles.consultSectionHeader}>
                        <Ionicons name="fitness-outline" size={14} color="#10B981" />
                        <Text style={styles.consultLabel}>Traitement</Text>
                      </View>
                      <Text style={styles.consultValue}>{c.traitement}</Text>
                    </View>
                  ) : (
                    <View style={styles.consultSection}>
                      <Text style={styles.consultEmpty}>Aucun traitement enregistré</Text>
                    </View>
                  )}

                  {c.type === "video" && c.statut_video && (
                    <View style={styles.statutBadge}>
                      <Text style={styles.statutText}>
                        {c.statut_video === "terminee" ? "✓ Terminée"
                          : c.statut_video === "en_cours" ? "🔴 En cours"
                            : "⏳ En attente"}
                      </Text>
                    </View>
                  )}

                  {/* Bouton audio avec pause/reprise */}
                  {c.audio_path && (
                    <TouchableOpacity
                      style={styles.audioBtn}
                      onPress={() => toggleAudio(c.id)}
                    >
                      <Ionicons
                        name={currentSoundId === c.id && isPlaying ? "pause-circle-outline" : "play-circle-outline"}
                        size={18}
                        color="#3B82F6"
                      />
                      <Text style={styles.audioBtnText}>
                        {currentSoundId === c.id && isPlaying ? "Pause" : "Écouter l'enregistrement"}
                      </Text>
                      <Ionicons name="chevron-forward-outline" size={14} color="#93C5FD" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal maladie */}
      <Modal visible={modalMaladie} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editMaladie ? "Modifier la maladie" : "Ajouter une maladie"}
              </Text>
              <TouchableOpacity onPress={() => setModalMaladie(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nom de la maladie</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Diabète, Hypertension, Asthme..."
              placeholderTextColor="#94A3B8"
              value={nomMaladie}
              onChangeText={setNomMaladie}
            />

            <Text style={styles.inputLabel}>Date de diagnostic</Text>
            <DateInput
              value={dateDiag}
              onChange={(date) => setDateDiag(date)}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalMaladie(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={sauvegarderMaladie}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.saveBtnText}>Sauvegarder</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  audioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  audioBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#10B981", paddingHorizontal: 16,
    paddingTop: 50, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#FFF" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  patientCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#FFF", margin: 16, padding: 16,
    borderRadius: 14, elevation: 2,
  },
  patientAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#DCFCE7", justifyContent: "center", alignItems: "center",
  },
  patientAvatarText: { fontSize: 22, fontWeight: "bold", color: "#10B981" },
  patientNom: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 6 },
  patientDetails: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  detailBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  detailText: { fontSize: 11, color: "#64748B" },
  statsRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, gap: 10 },
  statCard: { flex: 1, backgroundColor: "#FFF", borderRadius: 12, padding: 12, alignItems: "center", elevation: 1 },
  statNum: { fontSize: 20, fontWeight: "bold", color: "#0F172A" },
  statLabel: { fontSize: 11, color: "#64748B", marginTop: 2 },
  onglets: { flexDirection: "row", marginHorizontal: 16, marginBottom: 8, backgroundColor: "#E2E8F0", borderRadius: 12, padding: 4 },
  onglet: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  ongletActif: { backgroundColor: "#10B981" },
  ongletText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  ongletTextActif: { color: "#FFF" },
  section: { padding: 16 },
  empty: { alignItems: "center", marginTop: 40, gap: 8 },
  emptyText: { color: "#94A3B8", fontSize: 15 },
  emptySubText: { color: "#CBD5E1", fontSize: 13, textAlign: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#F0FDF4", borderRadius: 10, borderWidth: 1, borderColor: "#10B981", marginBottom: 16 },
  addBtnText: { color: "#10B981", fontWeight: "600" },
  maladieCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFF", borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  maladieLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  maladieIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FEF2F2", justifyContent: "center", alignItems: "center" },
  maladieNom: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  maladieDate: { fontSize: 12, color: "#64748B", marginTop: 2 },
  maladieActions: { alignItems: "center" },
  consultCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  consultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeText: { fontSize: 12, fontWeight: "600" },
  consultDate: { fontSize: 12, color: "#64748B" },
  consultSection: { backgroundColor: "#F8FAFC", borderRadius: 8, padding: 10, marginBottom: 8 },
  consultSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  consultLabel: { fontSize: 12, fontWeight: "700", color: "#475569" },
  consultValue: { fontSize: 13, color: "#334155", lineHeight: 20 },
  consultEmpty: { fontSize: 12, color: "#CBD5E1", fontStyle: "italic" },
  statutBadge: { alignSelf: "flex-start", backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  statutText: { fontSize: 12, color: "#64748B" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, fontSize: 14, color: "#0F172A", marginBottom: 14 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center" },
  cancelBtnText: { color: "#64748B", fontWeight: "600" },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center" },
  saveBtnText: { color: "#FFF", fontWeight: "700" },
});