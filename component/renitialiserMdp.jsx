import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import API from "../api/api";

export default function RenitialiserMdp({ navigation, route }) {
      console.log("route.params complet:", route.params);

  const { email, token } = route.params; 
  console.log("email:", email);   // ← ajoute
  console.log("token:", token);   // ← ajoute  // ← token reçu automatiquement
  const [mdp, setMdp] = useState("");
  const [mdpConfirmation, setMdpConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!mdp || !mdpConfirmation) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires.");
      return;
    }
    if (mdp !== mdpConfirmation) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }
    if (mdp.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    try {
      await API.post(`/reset-password/${token}`, {
        email,
        token,
        mdp,
        mdp_confirmation: mdpConfirmation,
      });

      Alert.alert(
        "Succès ✅",
        "Mot de passe réinitialisé avec succès !",
        [{ text: "Se connecter", onPress: () => navigation.navigate("Login") }]
      );
    } catch (error) {
      const message = error.response?.data?.message ?? "Token invalide ou expiré.";
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🔑</Text>
          </View>
          <Text style={styles.welcomeText}>Nouveau mot de passe</Text>
          <Text style={styles.subtitle}>
            Réinitialisation pour {"\n"}{email}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* ← Plus de champ token */}
          <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
          <TextInput
            value={mdp}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            onChangeText={setMdp}
            style={styles.input}
            editable={!loading}
          />

          <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
          <TextInput
            value={mdpConfirmation}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            onChangeText={setMdpConfirmation}
            style={styles.input}
            editable={!loading}
          />

          <TouchableOpacity
            onPress={handleReset}
            style={[styles.button, loading && styles.buttonDisabled]}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Réinitialiser</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  headerContainer: { alignItems: "center", marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#10B981",
    justifyContent: "center", alignItems: "center", marginBottom: 20,
  },
  logoText: { fontSize: 32 },
  welcomeText: { fontSize: 28, fontWeight: "700", color: "#0F172A", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#64748B", textAlign: "center", lineHeight: 22 },
  formContainer: { width: "100%" },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#1E293B", marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: "#E2E8F0", padding: 16, marginBottom: 20,
    borderRadius: 16, backgroundColor: "#F8FAFC", fontSize: 16, color: "#1E293B",
  },
  button: {
    backgroundColor: "#10B981", paddingVertical: 18,
    borderRadius: 16, alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#94A3B8" },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 18 },
});