import { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import API from "../api/api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import MotDePasseOublier from "./motDePasseOublier";
import { navigateReplace , navigateTo, showAlert } from "../navigation/AppNavigate";
export default function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [mdp, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);



 const redirectBasedOnRole = (user) => {
  const role = user.role?.toLowerCase();

  if (role === "medecin") {
    navigation.replace("Medecin");
  } else if (role === "admin") {
    navigation.replace("Admin");
  } else {
    navigation.replace("Main", {
      screen: "Accueil",
    });
  }
};

  const handleLogin = async () => {
    if (!email || !mdp) {
      Alert.alert("Erreur", "Veuillez entrer votre email et mot de passe.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Erreur", "Veuillez entrer un email valide.");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/login", { email, mdp });
      const token = response.data.access_token;
      const user = response.data.user;

      if (!token) {
        Alert.alert("Erreur", "Impossible de récupérer le token !");
        return;
      }

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("userData", JSON.stringify(user));

      console.log("Utilisateur connecté, rôle:", user.role);

      const successMessage =
        user.role === "medecin" ? "Bienvenue docteur !" :
        user.role === "admin"   ? "Bienvenue administrateur !" :
                                  "Connexion réussie";

   

showAlert("Succès ✅", successMessage);

redirectBasedOnRole(user);

    } catch (error) {
      console.error("Erreur de connexion:", error.response?.data || error.message);

      const status = error.response?.status;
      const data   = error.response?.data;

      // ✅ Email non vérifié
      if (status === 403 && data?.email_verified === false) {
        showAlert(
  "Email non vérifié 📧",
  "Votre adresse email n'a pas encore été vérifiée.\n\nVeuillez consulter votre boîte mail."
);;
        return;
      }

      // ✅ Autres erreurs
      let errorMessage = "Une erreur est survenue lors de la connexion.";

      if (status === 401) {
        errorMessage = "Email ou mot de passe incorrect.";
      } else if (status === 403) {
        errorMessage = data?.message ?? "Accès refusé.";
      } else if (status === 404) {
        errorMessage = "Serveur non trouvé. Vérifiez votre connexion.";
      } else if (data?.message) {
        errorMessage = data.message;
      } else if (data?.error) {
        errorMessage = data.error;
      }

showAlert("Erreur", errorMessage);

    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>TS+</Text>
          </View>
          <Text style={styles.welcomeText}>Bienvenue 👋</Text>
          <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>
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

          <Text style={styles.inputLabel}>Mot de passe</Text>
          <TextInput
            value={mdp}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            onChangeText={setPassword}
            style={[styles.input, passwordFocused && styles.inputFocused]}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            editable={!loading}
          />

          <TouchableOpacity
onPress={() => navigateTo(navigation, "MotDePasseOublier")}
            disabled={loading}
          >
            <Text style={styles.forgotPassword}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            style={[styles.button, loading && styles.buttonDisabled]}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Pas encore de compte ?</Text>
            <TouchableOpacity
onPress={() => navigateTo(navigation, "Register")}
              disabled={loading}
            >
              <Text style={styles.registerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.doctorRegisterContainer}>
            <Text style={styles.doctorRegisterText}>Vous êtes médecin ?</Text>
            <TouchableOpacity
onPress={() => navigateTo(navigation, "RegisterMedecin")}
              disabled={loading}
            >
              <Text style={styles.doctorRegisterLink}>Inscription professionnelle</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.versionText}>Version 1.0.0</Text>
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
    shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  logoText: { color: "#FFFFFF", fontSize: 32, fontWeight: "700" },
  welcomeText: { fontSize: 28, fontWeight: "700", color: "#0F172A", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#64748B", fontWeight: "400" },
  formContainer: { width: "100%" },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#1E293B", marginBottom: 8, marginLeft: 4 },
  input: {
    borderWidth: 1.5, borderColor: "#E2E8F0", padding: 16, marginBottom: 20,
    borderRadius: 16, backgroundColor: "#F8FAFC", fontSize: 16, color: "#1E293B",
  },
  inputFocused: {
    borderColor: "#3B82F6", backgroundColor: "#FFFFFF",
    shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  forgotPassword: { alignSelf: "flex-end", marginBottom: 24, color: "#3B82F6", fontSize: 14, fontWeight: "500" },
  button: {
    backgroundColor: "#3B82F6", paddingVertical: 18, borderRadius: 16, alignItems: "center",
    shadowColor: "#1E4ED8", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 5,
  },
  buttonDisabled: { backgroundColor: "#94A3B8", shadowOpacity: 0.1 },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 18, letterSpacing: 0.8 },
  dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: 30 },
  divider: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { marginHorizontal: 16, color: "#64748B", fontSize: 14, fontWeight: "500" },
  registerContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 12 },
  registerText: { color: "#64748B", fontSize: 16 },
  registerLink: { color: "#3B82F6", fontWeight: "600", fontSize: 16, textDecorationLine: "underline" },
  doctorRegisterContainer: {
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8,
    marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0",
  },
  doctorRegisterText: { color: "#64748B", fontSize: 14 },
  doctorRegisterLink: { color: "#10B981", fontWeight: "600", fontSize: 14, textDecorationLine: "underline" },
  versionText: { textAlign: "center", color: "#94A3B8", fontSize: 12, marginTop: 40 },
});