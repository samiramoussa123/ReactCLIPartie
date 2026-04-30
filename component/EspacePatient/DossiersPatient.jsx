import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TouchableOpacity,
  Platform, PermissionsAndroid, Alert
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import API from "../../api/api";
import RNFS from "react-native-fs";
import Sound from "react-native-sound";

export default function DossiersPatient({ navigation }) {
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [idPatient, setIdPatient] = useState(null);

  const [currentSound, setCurrentSound] = useState(null);
  const [currentSoundId, setCurrentSoundId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => { chargerPatient(); }, []);

  useEffect(() => {
    return () => {
      if (currentSound) {
        currentSound.stop(() => currentSound.release());
      }
    };
  }, [currentSound]);

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

  const toggleAudio = async (consultationId) => {
    if (currentSoundId === consultationId && currentSound && isPlaying) {
      currentSound.pause();
      setIsPlaying(false);
      return;
    }
    if (currentSoundId === consultationId && currentSound && !isPlaying) {
      currentSound.play();
      setIsPlaying(true);
      return;
    }
    if (currentSound) {
      currentSound.stop(() => currentSound.release());
      setCurrentSound(null);
      setCurrentSoundId(null);
      setIsPlaying(false);
    }
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

  const chargerPatient = async () => {
    try {
      const res = await API.get("/me");
      const user = res.data?.user ?? res.data;
      const id = user?.patient?.id;
      if (!id) return;
      setIdPatient(id);
      await chargerDossiers(id);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const chargerDossiers = async (id) => {
    try {
      const res = await API.get(`/dossiers/patient/${id}`);
      const list = res.data?.dossiers ?? [];
      setDossiers(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e.response?.status !== 404) console.error(e.message);
      setDossiers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); chargerDossiers(idPatient); }}
            colors={["#3B82F6"]}
          />
        }
      >
        {dossiers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={70} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Aucun dossier médical</Text>
            <Text style={styles.emptyText}>Votre médecin créera votre dossier après votre première consultation</Text>
          </View>
        ) : (
          dossiers.map((d) => (
            <View key={d.id} style={styles.dossierCard}>
              <View style={styles.medecinRow}>
                <View style={styles.medecinAvatar}>
                  <Ionicons name="person" size={22} color="#3B82F6" />
                </View>
                <View>
                  <Text style={styles.medecinNom}>
                    Dr. {d.medecin?.user?.prenom ?? ""} {d.medecin?.user?.nom ?? "Médecin"}
                  </Text>
                  <Text style={styles.medecinSpec}>
                    {d.medecin?.specialite?.nom_specialite ?? "Médecin généraliste"}
                  </Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="medical-outline" size={20} color="#EF4444" />
                  <Text style={styles.statNum}>{d.maladies?.length ?? 0}</Text>
                  <Text style={styles.statLabel}>Maladies</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="document-text-outline" size={20} color="#10B981" />
                  <Text style={styles.statNum}>{d.consultations?.length ?? 0}</Text>
                  <Text style={styles.statLabel}>Consultations</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
                  <Text style={styles.statNum}>{new Date(d.created_at).getFullYear()}</Text>
                  <Text style={styles.statLabel}>Depuis</Text>
                </View>
              </View>

              <View style={styles.separator} />

              {d.maladies?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="medical" size={14} color="#EF4444" /> Antécédents médicaux
                  </Text>
                  {d.maladies.map((m) => (
                    <View key={m.id} style={styles.maladieRow}>
                      <View style={styles.maladieDot} />
                      <View>
                        <Text style={styles.maladieNom}>{m.nom_maladie}</Text>
                        <Text style={styles.maladieDate}>
                          {new Date(m.date_diagnostic).toLocaleDateString("fr-FR")}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {d.consultations?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="document-text" size={14} color="#10B981" /> Consultations
                  </Text>
                  {d.consultations.map((c) => (
                    <View key={c.id} style={styles.consultItem}>
                      <View style={styles.consultHeader}>
                        <View style={[
                          styles.consultType,
                          { backgroundColor: c.type === "video" ? "#EFF6FF" : "#F0FDF4" }
                        ]}>
                          <Ionicons
                            name={c.type === "video" ? "videocam-outline" : "person-outline"}
                            size={14}
                            color={c.type === "video" ? "#3B82F6" : "#10B981"}
                          />
                          <Text style={[
                            styles.consultTypeText,
                            { color: c.type === "video" ? "#3B82F6" : "#10B981" }
                          ]}>
                            {c.type === "video" ? "Vidéo" : "Présentiel"}
                          </Text>
                        </View>
                        <Text style={styles.consultDate}>
                          {new Date(c.date_consultation).toLocaleDateString("fr-FR")}
                        </Text>
                      </View>

                      {c.diagnostique ? (
                        <Text style={styles.consultDiagnostic}>📋 {c.diagnostique}</Text>
                      ) : null}

                      {c.traitement ? (
                        <Text style={styles.consultTraitement}>💊 {c.traitement}</Text>
                      ) : null}

                      {c.audio_path && (
                        <TouchableOpacity
                          style={styles.audioBtn}
                          onPress={() => toggleAudio(c.id)}
                        >
                          <Ionicons
                            name={currentSoundId === c.id && isPlaying ? "pause-circle" : "play-circle"}
                            size={24}
                            color={currentSoundId === c.id && isPlaying ? "#EF4444" : "#3B82F6"}
                          />
                          <Text style={styles.audioBtnText}>
                            {currentSoundId === c.id && isPlaying ? "Pause" : "Écouter l'enregistrement"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.dossierDate}>
                Dossier créé le {new Date(d.created_at).toLocaleDateString("fr-FR")}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", marginTop: 100, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#334155" },
  emptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center", lineHeight: 22 },
  dossierCard: {
    backgroundColor: "#FFF", margin: 16, borderRadius: 16,
    padding: 20, elevation: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08,
  },
  medecinRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  medecinAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center" },
  medecinNom: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  medecinSpec: { fontSize: 13, color: "#64748B", marginTop: 2 },
  separator: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 16 },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center", gap: 4 },
  statNum: { fontSize: 20, fontWeight: "bold", color: "#0F172A" },
  statLabel: { fontSize: 11, color: "#64748B" },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 10 },
  maladieRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  maladieDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  maladieNom: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  maladieDate: { fontSize: 12, color: "#64748B" },
  consultItem: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingBottom: 12 },
  consultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  consultType: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  consultTypeText: { fontSize: 12, fontWeight: "600" },
  consultDate: { fontSize: 12, color: "#64748B" },
  consultDiagnostic: { fontSize: 13, color: "#475569", marginTop: 4, paddingLeft: 4 },
  consultTraitement: { fontSize: 13, color: "#475569", marginTop: 4, paddingLeft: 4 },
  audioBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginTop: 12, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: "#F8FAFC", borderRadius: 30,
    borderWidth: 1, borderColor: "#E2E8F0", alignSelf: "flex-start",
  },
  audioBtnText: { fontSize: 13, fontWeight: "500", color: "#3B82F6" },
  dossierDate: { fontSize: 11, color: "#CBD5E1", textAlign: "right", marginTop: 8 },
});