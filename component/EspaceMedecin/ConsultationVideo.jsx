import { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, StatusBar, Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import Ionicons from "react-native-vector-icons/Ionicons";
import API from "../../api/api";

const JAAS_APP_ID = "vpaas-magic-cookie-5507144e28c44f7f808ad1071af6dece";

export default function ConsultationVideo({ route, navigation }) {
  const { consultationId, role } = route.params ?? {};

  const webviewRef = useRef(null);
  const [loading, setLoading]         = useState(true);
  const [roomId, setRoomId]           = useState(null);
  const [token, setToken]             = useState(null);
  const [statut, setStatut]           = useState("Connexion...");
  const [webviewReady, setWebviewReady] = useState(false);
  const [error, setError]             = useState(null);

  // pour éviter le re-création à chaque render
  const init = useCallback(async () => {
    try {
      setError(null);

      //  Démarrer ou rejoindre selon le rôle
      if (role === "medecin") {
        await API.post(`/consultations/${consultationId}/video/demarrer`);
        setStatut("En attente du patient...");
      } else {
        await API.post(`/consultations/${consultationId}/video/rejoindre`);
        setStatut("Connecté");
      }

      //  Générer le token JaaS
      const res = await API.post(
        `/consultations/${consultationId}/video/token`,
        { role }
      );

      const { token: jwt, room_id } = res.data ?? {};

      if (!jwt || !room_id) {
        throw new Error("Token ou room_id manquant dans la réponse serveur");
      }

      setToken(jwt);
      setRoomId(room_id);

    } catch (e) {
      const msg = e?.response?.data?.message ?? e.message ?? "Erreur inconnue";
      console.error("[ConsultationVideo][init]", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [consultationId, role]);

  useEffect(() => {
    // Vérifier les params avant d'initialiser
    if (!consultationId || !role) {
      setError("Paramètres manquants (consultationId ou role)");
      setLoading(false);
      return;
    }
    init();
  }, [init]);

  const terminer = useCallback(() => {
    Alert.alert("Terminer", "Voulez-vous terminer la consultation ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Terminer",
        style: "destructive",
        onPress: async () => {
          try {
            await API.post(`/consultations/${consultationId}/video/terminer`);
          } catch (e) {
            console.warn("[terminer]", e?.response?.data?.message ?? e.message);
          } finally {
            navigation.goBack();
          }
        },
      },
    ]);
  }, [consultationId, navigation]);

  // Toolbar JSON correctement encodé dans l'URL
  const toolbarButtons = encodeURIComponent(
    JSON.stringify(["microphone", "camera", "hangup", "tileview", "fullscreen"])
  );

  const jitsiUrl = roomId && token
    ? `https://8x8.vc/${JAAS_APP_ID}/${roomId}` +
      `?jwt=${token}` +
      `#config.disableDeepLinking=true` +
      `&config.prejoinPageEnabled=false` +
      `&config.startWithVideoMuted=false` +
      `&config.startWithAudioMuted=false` +
      `&config.enableWelcomePage=false` +
      `&config.toolbarButtons=${toolbarButtons}`
    : null;


  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Préparation de la consultation...</Text>
      </View>
    );
  }

  if (error || !jitsiUrl) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>
          {error ?? "Impossible de démarrer la consultation"}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={init}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }


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
        allowsFullscreenVideo={true}
        originWhitelist={["*"]}
        setSupportMultipleWindows={false}
        mixedContentMode="always"
        thirdPartyCookiesEnabled={true}
        userAgent={
          Platform.OS === "android"
            ? "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
            : "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        }
        onShouldStartLoadWithRequest={() => true}
        onLoad={() => {
          setWebviewReady(true);
          console.log(" JaaS chargé avec token");
        }}
        onError={(e) => {
          console.error("[WebView error]", e.nativeEvent);
          setError("Impossible de charger la consultation vidéo");
        }}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 400) {
            console.error("[WebView HTTP error]", e.nativeEvent.statusCode);
            setError(`Erreur HTTP ${e.nativeEvent.statusCode}`);
          }
        }}
      />

      <View style={styles.topBar}>
        <View style={styles.statusBadge}>
          <View style={[styles.dot, {
            backgroundColor: webviewReady ? "#10B981" : "#F59E0B"
          }]} />
          <Text style={styles.statusText}>
            {webviewReady ? "En ligne" : statut}
          </Text>
        </View>

        <TouchableOpacity style={styles.endBtn} onPress={terminer}>
          <Ionicons name="call" size={16} color="#FFF" />
          <Text style={styles.endBtnText}>Fin</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#0F172A" },
  center:      { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A", padding: 24 },
  loadingText: { color: "#94A3B8", marginTop: 12, fontSize: 16, textAlign: "center" },
  errorText:   { color: "#EF4444", marginTop: 12, fontSize: 15, textAlign: "center", marginBottom: 20 },
  webview:     { flex: 1 },

  retryBtn: {
    backgroundColor: "#3B82F6", paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 8, marginBottom: 10,
  },
  retryBtnText: { color: "#FFF", fontWeight: "600", fontSize: 15 },
  backBtn: {
    backgroundColor: "#475569", paddingHorizontal: 20,
    paddingVertical: 10, borderRadius: 8,
  },
  backBtnText: { color: "#FFF", fontWeight: "600" },

  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 12, paddingTop: 40, paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  statusText:  { color: "#FFF", fontSize: 12 },
  endBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#DC2626", paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20,
  },
  endBtnText: { color: "#FFF", fontWeight: "700", fontSize: 12 },
});