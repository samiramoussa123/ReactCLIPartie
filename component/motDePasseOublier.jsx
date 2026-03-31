import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import API from "../api/api";
export default function MotDePasseOublier({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

 const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Erreur", "Veuillez entrer votre email.");
      return;
    }

    setLoading(true);
    try {
      //  Récupère le token depuis la réponse
      const response = await API.post("/forgot-password", { email });
      const token = response.data.token;

      Alert.alert(
        "Email envoyé ✅",
        "Un lien de réinitialisation a été envoyé à votre adresse email.",
        [{ 
          text: "OK", 
          onPress: () => navigation.navigate("RenitialiserMdp", { 
            email,
            token   // ← ajoute le token ici
          }) 
        }]
      );
    } catch (error) {
      const message = error.response?.data?.errors?.email?.[0]
        ?? error.response?.data?.message
        ?? "Une erreur est survenue.";
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
            <Text style={styles.logoText}>🔐</Text>
          </View>
          <Text style={styles.welcomeText}>Mot de passe oublié</Text>
          <Text style={styles.subtitle}>
            Entrez votre email pour recevoir un lien de réinitialisation
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            value={email}
            placeholder="exemple@email.com"
            placeholderTextColor="#94A3B8"
            onChangeText={setEmail}
            style={[styles.input, emailFocused && styles.inputFocused]}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <TouchableOpacity
            onPress={handleForgotPassword}
            style={[styles.button, loading && styles.buttonDisabled]}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Envoyer le lien</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Retour à la connexion</Text>
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
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#3B82F6",
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
  inputFocused: { borderColor: "#3B82F6", backgroundColor: "#FFFFFF" },
  button: {
    backgroundColor: "#3B82F6", paddingVertical: 18,
    borderRadius: 16, alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#94A3B8" },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 18 },
  backButton: { alignItems: "center", marginTop: 20 },
  backText: { color: "#3B82F6", fontSize: 15, fontWeight: "500" },
});