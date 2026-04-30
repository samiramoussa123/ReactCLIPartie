import { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, StatusBar, Platform,
  PermissionsAndroid,
} from "react-native";
import { WebView } from "react-native-webview";
import Ionicons from "react-native-vector-icons/Ionicons";
import AudioRecord from "react-native-audio-record";
import RNFS from "react-native-fs";
import API from "../../api/api";
import { useProchainRdv } from '../../src/utils/useProchainRdv';

const JAAS_APP_ID = "vpaas-magic-cookie-5507144e28c44f7f808ad1071af6dece";

// ─────────────────────────────────
// Hook enregistrement audio
// ─────────────────────────────────
const useAudioRecorder = (consultationId) => {
  const [recording, setRecording]   = useState(false);
  const [uploading, setUploading]   = useState(false);

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Permission Microphone',
          message: 'Nous avons besoin du micro pour enregistrer la consultation',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const initAudio = async () => {
    const hasPerm = await requestPermission();
    if (!hasPerm) {
      Alert.alert("Permission refusée", "Impossible d'enregistrer l'audio");
      return false;
    }
    AudioRecord.init({
      sampleRate:    16000,
      channels:      1,
      bitsPerSample: 16,
      audioSource:   6,
      wavFile:       'recording.wav',
    });
    return true;
  };

  const startRecording = async () => {
    const ready = await initAudio();
    if (!ready) return;
    AudioRecord.start();
    setRecording(true);
  };

  const stopRecording = async () => {
    if (!recording) return;
    const audioFile = await AudioRecord.stop();
    setRecording(false);
    setUploading(true);
    try {
      const base64 = await RNFS.readFile(audioFile, 'base64');
      await API.post(`/consultations/${consultationId}/audio`, { audio: base64 });
      Alert.alert('Succès', 'Audio enregistré et envoyé');
    } catch (err) {
      console.error('Erreur upload', err);
      Alert.alert('Erreur', "L'audio n'a pas pu être sauvegardé sur le serveur");
    } finally {
      setUploading(false);
    }
  };

  return { startRecording, stopRecording, recording, uploading };
};

// ─────────────────────────────────
// Composant principal
// ─────────────────────────────────
export default function ConsultationVideo({ route, navigation }) {
  // ✅ Récupération des params — rdvId et medecinId nécessaires pour useProchainRdv
  const {
    consultationId,
    role,
    rdvId,      // ← id du RDV en cours
    medecinId,  // ← id du médecin
  } = route.params ?? {};

  const webviewRef = useRef(null);
  const [loading, setLoading]         = useState(true);
  const [roomId, setRoomId]           = useState(null);
  const [token, setToken]             = useState(null);
  const [statut, setStatut]           = useState("Connexion...");
  const [webviewReady, setWebviewReady] = useState(false);
  const [error, setError]             = useState(null);

  // ✅ Hook prochain RDV — actif uniquement pour le médecin
  // Affiche une alerte 15 min avant le prochain RDV
  useProchainRdv(
    role === 'medecin' ? rdvId     : null,   // ← null = désactivé pour le patient
    role === 'medecin' ? medecinId : null
  );

  const { startRecording, stopRecording, recording, uploading } = useAudioRecorder(consultationId);

  // ── Init consultation ──
  const init = useCallback(async () => {
    try {
      setError(null);
      if (role === "medecin") {
        await API.post(`/consultations/${consultationId}/video/demarrer`);
        setStatut("En attente du patient...");
      } else {
        await API.post(`/consultations/${consultationId}/video/rejoindre`);
        setStatut("Connecté");
      }
      const res = await API.post(`/consultations/${consultationId}/video/token`, { role });
      const { token: jwt, room_id } = res.data ?? {};
      if (!jwt || !room_id) throw new Error("Token ou room_id manquant");
      setToken(jwt);
      setRoomId(room_id);
    } catch (e) {
      const msg = e?.response?.data?.message ?? e.message ?? "Erreur inconnue";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [consultationId, role]);

  useEffect(() => {
    if (!consultationId || !role) {
      setError("Paramètres manquants");
      setLoading(false);
      return;
    }
    init();
  }, [init]);

  // ── Terminer la consultation ──
  const terminer = useCallback(() => {
    Alert.alert("Terminer", "Voulez-vous terminer la consultation ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Terminer",
        style: "destructive",
        onPress: async () => {
          if (recording) await stopRecording();
          try {
            await API.post(`/consultations/${consultationId}/video/terminer`);
          } catch (e) {
            console.warn(e);
          } finally {
            navigation.goBack();
          }
        },
      },
    ]);
  }, [consultationId, navigation, recording, stopRecording]);

  const toolbarButtons = encodeURIComponent(
    JSON.stringify(["microphone", "camera", "hangup", "tileview", "fullscreen"])
  );

  const jitsiUrl = roomId && token
    ? `https://8x8.vc/${JAAS_APP_ID}/${roomId}?jwt=${token}#config.disableDeepLinking=true&config.prejoinPageEnabled=false&config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.enableWelcomePage=false&config.recordingEnabled=false&config.toolbarButtons=${toolbarButtons}`
    : null;

  // ── Écrans de chargement / erreur ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Préparation...</Text>
      </View>
    );
  }

  if (error || !jitsiUrl) {
    return (
      <View style={styles.center}>
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error ?? "Impossible de démarrer"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={init}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Rendu principal ──
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" hidden />

      <WebView
        ref={webviewRef}
        source={{ uri: jitsiUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        onLoad={() => setWebviewReady(true)}
        onError={() => setError("Erreur chargement vidéo")}
      />

      {/* ── Barre de contrôle en haut ── */}
      <View style={styles.topBar}>

        {/* Statut connexion */}
        <View style={styles.statusBadge}>
          <View style={[styles.dot, { backgroundColor: webviewReady ? "#10B981" : "#F59E0B" }]} />
          <Text style={styles.statusText}>{webviewReady ? "En ligne" : statut}</Text>
        </View>

        {/* Bouton enregistrement — médecin uniquement */}
        {role === 'medecin' && (
          <TouchableOpacity
            style={[styles.recordBtn, recording && styles.recordBtnActive]}
            onPress={() => recording ? stopRecording() : startRecording()}
            disabled={uploading}
          >
            <Ionicons name={recording ? "mic-off" : "mic"} size={20} color="#FFF" />
            <Text style={styles.recordBtnText}>
              {uploading ? "Envoi..." : recording ? "Arrêter" : "Enregistrer"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Bouton fin */}
        <TouchableOpacity style={styles.endBtn} onPress={terminer}>
          <Ionicons name="call" size={16} color="#FFF" />
          <Text style={styles.endBtnText}>Fin</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#0F172A" },
  center:       { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", padding: 24 },
  loadingText:  { color: "#94A3B8", marginTop: 12, fontSize: 16 },
  errorText:    { color: "#EF4444", marginTop: 12, textAlign: "center", marginBottom: 20 },
  webview:      { flex: 1 },
  retryBtn:     { backgroundColor: "#3B82F6", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginBottom: 10 },
  retryBtnText: { color: "#FFF", fontWeight: "600" },
  backBtn:      { backgroundColor: "#475569", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backBtnText:  { color: "#FFF", fontWeight: "600" },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 12, paddingTop: 40, paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  statusBadge:    { flexDirection: "row", alignItems: "center", gap: 6 },
  dot:            { width: 8, height: 8, borderRadius: 4 },
  statusText:     { color: "#FFF", fontSize: 12 },
  recordBtn:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#3B82F6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  recordBtnActive:{ backgroundColor: "#DC2626" },
  recordBtnText:  { color: "#FFF", fontWeight: "600", fontSize: 12 },
  endBtn:         { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#DC2626", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  endBtnText:     { color: "#FFF", fontWeight: "700", fontSize: 12 },
});