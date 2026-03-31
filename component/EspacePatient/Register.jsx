import { useState } from "react";
import { 
  ScrollView, 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform 
} from "react-native";
import { launchImageLibrary, launchCamera, requestCameraPermissions, requestMediaLibraryPermissions } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { navigateTo,showAlert } from "../../navigation/AppNavigate";
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from "@react-native-community/datetimepicker";
import API from "../../api/api";

import DateInput from "../common/DateInput";
export default function Register({ navigation }) {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [mdp, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [age, setAge] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [sexe, setSexe] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const [focusedInput, setFocusedInput] = useState(null);

 const selectPhoto = async () => {
  launchImageLibrary({ mediaType: 'photo', quality: 0.5 }, (response) => {
    if (response.didCancel) {
      console.log('User cancelled image picker');
    } else if (response.error) {
      console.log('ImagePicker Error: ', response.error);
    } else if (response.assets && response.assets[0]) {
      setPhoto(response.assets[0].uri);
    }
  });
};

const takePhotoWithCamera = async () => {
  launchCamera({ mediaType: 'photo', quality: 0.5, saveToPhotos: true }, (response) => {
    if (response.didCancel) {
      console.log('User cancelled camera');
    } else if (response.error) {
      console.log('Camera Error: ', response.error);
    } else if (response.assets && response.assets[0]) {
      setPhoto(response.assets[0].uri);
    }
  });
};

const showPhotoOptions = () => {
  Alert.alert(
    "Photo de profil",
    "Choisissez une option",
    [
      { text: "Prendre une photo", onPress: takePhotoWithCamera },
      { text: "Choisir dans la galerie", onPress: selectPhoto },
      { text: "Annuler", style: "cancel" }
    ]
  );
};
 ;

 const handleRegister = async () => {
  if (!nom || !prenom || !email || !mdp || !dateNaissance || !sexe) {
    return Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires !");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return Alert.alert("Erreur", "Veuillez entrer un email valide.");
  }

  if (mdp.length < 6) {
    return Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères.");
  }

  if (mdp !== passwordConfirmation) {
    return Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
  }

  setLoading(true);

  try {

    const formData = new FormData();

    formData.append("nom", nom);
    formData.append("prenom", prenom);
    formData.append("email", email);
    formData.append("mdp", mdp);
    formData.append("mdp_confirmation", passwordConfirmation);
    formData.append("adresse", adresse);
    formData.append("telephone", telephone);
    formData.append("age", age ? parseInt(age) : "");
    formData.append("role", "patient");
    formData.append("dateNaissance", dateNaissance);
    formData.append("sexe", sexe);

    if (photo) {
      const filename = photo.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append("photo", {
        uri: photo,
        type: type,
        name: `photo_${Date.now()}.jpg`,
      });
    }

    const response = await API.post("/register", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    console.log("Réponse:", response.data);

    showAlert(
  "Inscription réussie 📧",
  "Votre compte a été créé.\n\nVeuillez vérifier votre email pour activer votre compte avant de vous connecter.",
  () => navigateTo(navigation, "Login")
);

  } catch (error) {

    console.error("Erreur inscription:", error.response?.data || error.message);

    let errorMessage = "Une erreur est survenue.";

    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      const firstError = Object.values(errors)[0];
      errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    Alert.alert("Erreur", errorMessage);

  } finally {
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>FS</Text>
          </View>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez-nous en tant que patient</Text>
        </View>

        <TouchableOpacity onPress={showPhotoOptions} style={styles.photoContainer}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={40} color="#94A3B8" />
              <Text style={styles.photoText}>Ajouter une photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.formContainer}>
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel}>Nom *</Text>
              <TextInput
                placeholder="Votre nom"
                value={nom}
                onChangeText={setNom}
                style={[
                  styles.input,
                  focusedInput === 'nom' && styles.inputFocused
                ]}
                onFocus={() => setFocusedInput('nom')}
                onBlur={() => setFocusedInput(null)}
                editable={!loading}
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel}>Prénom *</Text>
              <TextInput
                placeholder="Votre prénom"
                value={prenom}
                onChangeText={setPrenom}
                style={[
                  styles.input,
                  focusedInput === 'prenom' && styles.inputFocused
                ]}
                onFocus={() => setFocusedInput('prenom')}
                onBlur={() => setFocusedInput(null)}
                editable={!loading}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Email *</Text>
          <TextInput
            placeholder="exemple@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[
              styles.input,
              focusedInput === 'email' && styles.inputFocused
            ]}
            onFocus={() => setFocusedInput('email')}
            onBlur={() => setFocusedInput(null)}
            editable={!loading}
          />

          <Text style={styles.inputLabel}>Mot de passe *</Text>
          <TextInput
            placeholder="•••••••• (min. 6 caractères)"
            value={mdp}
            onChangeText={setPassword}
            secureTextEntry
            style={[
              styles.input,
              focusedInput === 'mdp' && styles.inputFocused
            ]}
            onFocus={() => setFocusedInput('mdp')}
            onBlur={() => setFocusedInput(null)}
            editable={!loading}
          />

          <Text style={styles.inputLabel}>Confirmer mot de passe *</Text>
          <TextInput
            placeholder="Re-saisissez votre mot de passe"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            style={[
              styles.input,
              focusedInput === 'passwordConfirmation' && styles.inputFocused
            ]}
            onFocus={() => setFocusedInput('passwordConfirmation')}
            onBlur={() => setFocusedInput(null)}
            editable={!loading}
          />

          <Text style={styles.inputLabel}>Téléphone</Text>
          <TextInput
            placeholder="Votre numéro"
            value={telephone}
            onChangeText={setTelephone}
            keyboardType="phone-pad"
            style={[
              styles.input,
              focusedInput === 'telephone' && styles.inputFocused
            ]}
            onFocus={() => setFocusedInput('telephone')}
            onBlur={() => setFocusedInput(null)}
            editable={!loading}
          />

          <Text style={styles.inputLabel}>Adresse</Text>
          <TextInput
            placeholder="Votre adresse"
            value={adresse}
            onChangeText={setAdresse}
            style={[
              styles.input,
              focusedInput === 'adresse' && styles.inputFocused
            ]}
            onFocus={() => setFocusedInput('adresse')}
            onBlur={() => setFocusedInput(null)}
            editable={!loading}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel}>Âge</Text>
              <TextInput
                placeholder="Âge"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                style={[
                  styles.input,
                  focusedInput === 'age' && styles.inputFocused
                ]}
                onFocus={() => setFocusedInput('age')}
                onBlur={() => setFocusedInput(null)}
                editable={!loading}
              />
            </View>
           <View style={styles.halfWidth}>
  <Text style={styles.inputLabel}>Date naissance *</Text>

  <DateInput
    value={dateNaissance}
    onChange={setDateNaissance}
  />
</View></View>

          <Text style={styles.inputLabel}>Sexe *</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity 
              style={styles.radioOption} 
              onPress={() => setSexe("homme")}
              disabled={loading}
            >
              <View style={styles.radioCircle}>
                {sexe === "homme" && <View style={styles.selectedRb} />}
              </View>
              <Text style={styles.radioText}>Homme</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.radioOption} 
              onPress={() => setSexe("femme")}
              disabled={loading}
            >
              <View style={styles.radioCircle}>
                {sexe === "femme" && <View style={styles.selectedRb} />}
              </View>
              <Text style={styles.radioText}>Femme</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>S'inscrire</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Déjà un compte ?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "400",
    textAlign: "center",
  },
  photoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#3B82F6",
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  photoText: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },
  formContainer: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    fontSize: 16,
    fontWeight: "400",
    color: "#1E293B",
    placeholderTextColor: "#94A3B8",
  },
  inputFocused: {
    borderColor: "#3B82F6",
    backgroundColor: "#FFFFFF",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateInput: {
    justifyContent: "center",
  },
  radioContainer: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 20,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioCircle: {
    height: 22,
    width: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  selectedRb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
  },
  radioText: {
    fontSize: 16,
    color: "#1E293B",
  },
  button: {
    backgroundColor: "#3B82F6",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#1E4ED8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 18,
    letterSpacing: 0.8,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
    gap: 8,
  },
  loginText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "400",
  },
  loginLink: {
    color: "#3B82F6",
    fontWeight: "600",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});