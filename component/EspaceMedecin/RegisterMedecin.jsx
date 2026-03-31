import { useState, useEffect } from "react";
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
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from "../../api/api";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';

export default function RegisterMedecin({ navigation }) {
  
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [mdp, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [age, setAge] = useState("");
  const [photo, setPhoto] = useState(null);
  
  const [specialites, setSpecialites] = useState([]);
  const [specialiteId, setSpecialiteId] = useState("");
  const [experience, setExperience] = useState("");
  const [loadingSpecialites, setLoadingSpecialites] = useState(true);
  
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  
  const [focusedInput, setFocusedInput] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSpecialites();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (nom && prenom && specialiteId) {
        verifierMedecin();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [nom, prenom, specialiteId]);

  const fetchSpecialites = async () => {
    try {
      setLoadingSpecialites(true);
      const response = await API.get("/specialite");
      console.log("Spécialités chargées:", response.data.length);
      setSpecialites(response.data);
    } catch (error) {
      console.error("Erreur chargement spécialités:", error.response?.data || error.message);
      Alert.alert(
        "Erreur", 
        "Impossible de charger la liste des spécialités. Vérifiez votre connexion."
      );
    } finally {
      setLoadingSpecialites(false);
    }
  };

  const verifierMedecin = async () => {
    if (!nom || !prenom || !specialiteId || loading) return;

    setVerificationLoading(true);
    try {
      const specialite = specialites.find(s => s.id === specialiteId);
      
      if (!specialite) {
        console.log("⚠️ Spécialité non trouvée avec ID:", specialiteId);
        return;
      }

      console.log("🔍 Vérification médecin:", { nom, prenom, specialite: specialite.nom_specialite });
      
      const response = await API.post("/check-medecin", {
        nom: nom,
        prenom: prenom,
        specialite: specialite.nom_specialite 
      });

      console.log("Résultat vérification:", response.data);
      setVerificationStatus(response.data);
      
    } catch (error) {
      console.error("Erreur vérification:", error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        setVerificationStatus({ exists: false, message: "Médecin non trouvé" });
      } else {
        Alert.alert("Attention", "Impossible de vérifier automatiquement votre profil");
      }
    } finally {
      setVerificationLoading(false);
    }
  };

  const selectPhoto = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.5, selectionLimit: 1 }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
        Alert.alert("Erreur", "Impossible de sélectionner l'image");
      } else if (response.assets && response.assets[0]) {
        setPhoto(response.assets[0].uri);
      }
    });
  };

  const takePhotoWithCamera = () => {
    launchCamera({ mediaType: 'photo', quality: 0.5, saveToPhotos: true }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.error) {
        console.log('Camera Error: ', response.error);
        Alert.alert("Erreur", "Impossible d'utiliser la caméra");
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
        { text: "📸 Prendre une photo", onPress: takePhotoWithCamera },
        { text: "🖼️ Choisir dans la galerie", onPress: selectPhoto },
        { text: "❌ Supprimer", onPress: () => setPhoto(null), style: "destructive" },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const isValidPhone = (phone) => {
    const phoneRegex = /^[0-9]{8}$/;
    return phone === "" || phoneRegex.test(phone);
  };

  const handleRegister = async () => {
    if (!nom || !prenom || !email || !mdp || !specialiteId) {
      return Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires !");
    }

    if (!isValidEmail(email)) {
      return Alert.alert("Erreur", "Veuillez saisir un email valide.");
    }

    if (mdp.length < 6) {
      return Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères.");
    }

    if (mdp !== passwordConfirmation) {
      return Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
    }

    if (telephone && !isValidPhone(telephone)) {
      return Alert.alert("Erreur", "Le téléphone doit contenir 8 chiffres.");
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("nom", nom.trim());
      formData.append("prenom", prenom.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("mdp", mdp);
      formData.append("mdp_confirmation", passwordConfirmation);
      formData.append("adresse", adresse.trim());
      formData.append("telephone", telephone.trim());
      formData.append("age", age ? parseInt(age) : "");
      formData.append("role", "medecin");
      formData.append("specialite", specialiteId); 
      formData.append("experience", experience ? parseInt(experience) : 0);

      if (photo) {
        const filename = photo.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append("photo", {
          uri: photo,
          type: type,
          name: `medecin_${Date.now()}.jpg`,
        });
      }

      console.log("📤 Envoi des données d'inscription...");
      
      const response = await API.post("/register", formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Accept": "application/json"
        },
      });

      console.log("Réponse inscription:", response.data);
      
      const token = response.data.token || response.data.access_token;
      if (token) {
        await AsyncStorage.setItem("token", token);
        
        if (response.data.user) {
          await AsyncStorage.setItem("userData", JSON.stringify(response.data.user));
        }
      }
      
      const message = verificationStatus?.exists 
        ? "Inscription réussie ! Votre compte a été automatiquement vérifié."
        : "Inscription réussie ! Votre compte est en attente de vérification administrative.\n\nUn administrateur validera votre profil sous 24-48h.";
      
      Alert.alert(
        "🎉 Succès", 
        message,
        [{ 
          text: "OK", 
          onPress: () => navigation.replace("ProfileMedecin") 
        }]
      );
      
    } catch (error) {
      console.error("❌ Erreur inscription:", error.response?.data || error.message);
      
      let errorMessage = "Une erreur est survenue lors de l'inscription.";
      
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstErrorKey = Object.keys(errors)[0];
        errorMessage = errors[firstErrorKey][0];
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message.includes("Network Error")) {
        errorMessage = "Problème de connexion. Vérifiez votre réseau.";
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
            <Ionicons name="medical" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Inscription Médecin</Text>
          <Text style={styles.subtitle}>Rejoignez notre plateforme de télésanté</Text>
        </View>

        {verificationStatus && (
          <View style={[
            styles.verificationBadge,
            verificationStatus.exists ? styles.verificationSuccess : styles.verificationWarning
          ]}>
            <Ionicons 
              name={verificationStatus.exists ? "checkmark-circle" : "time"} 
              size={24} 
              color="#FFFFFF" 
            />
            <Text style={styles.verificationText}>
              {verificationStatus.exists 
                ? "✅ Médecin trouvé - Compte vérifié automatiquement"
                : "⏳ Médecin non trouvé - En attente de vérification administrative"}
            </Text>
          </View>
        )}

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
          <Text style={styles.sectionTitle}>📋 Informations personnelles</Text>
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel}>Nom <Text style={styles.required}>*</Text></Text>
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
              <Text style={styles.inputLabel}>Prénom <Text style={styles.required}>*</Text></Text>
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

          <Text style={styles.inputLabel}>Email professionnel <Text style={styles.required}>*</Text></Text>
          <TextInput
            placeholder="dr.nom@email.com"
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

          <Text style={styles.inputLabel}>Mot de passe <Text style={styles.required}>*</Text></Text>
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

          <Text style={styles.inputLabel}>Confirmer mot de passe <Text style={styles.required}>*</Text></Text>
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

          <Text style={styles.sectionTitle}>🏥 Informations professionnelles</Text>

          <Text style={styles.inputLabel}>Spécialité <Text style={styles.required}>*</Text></Text>
          <View style={styles.pickerContainer}>
            {loadingSpecialites ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.loadingText}>Chargement des spécialités...</Text>
              </View>
            ) : specialites.length > 0 ? (
              <Picker
                selectedValue={specialiteId}
                onValueChange={(itemValue) => setSpecialiteId(itemValue)}
                style={styles.picker}
                enabled={!loading}
              >
                <Picker.Item label="📌 Sélectionnez votre spécialité" value="" />
                {specialites.map((spec) => (
                  <Picker.Item 
                    key={spec.id} 
                    label={spec.nom_specialite} 
                    value={spec.id} 
                  />
                ))}
              </Picker>
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Aucune spécialité disponible</Text>
              </View>
            )}
          </View>

          {verificationLoading && (
            <View style={styles.verificationLoading}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.verificationLoadingText}>Vérification dans l'annuaire...</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Années d'expérience</Text>
          <TextInput
            placeholder="Ex: 10 ans"
            value={experience}
            onChangeText={setExperience}
            keyboardType="number-pad"
            style={[
              styles.input,
              focusedInput === 'experience' && styles.inputFocused
            ]}
            onFocus={() => setFocusedInput('experience')}
            onBlur={() => setFocusedInput(null)}
            editable={!loading}
          />

          <Text style={styles.sectionTitle}>📍 Coordonnées</Text>

          <Text style={styles.inputLabel}>Téléphone</Text>
          <TextInput
            placeholder="Votre numéro (8 chiffres)"
            value={telephone}
            onChangeText={setTelephone}
            keyboardType="phone-pad"
            maxLength={8}
            style={[
              styles.input,
              focusedInput === 'telephone' && styles.inputFocused
            ]}
            onFocus={() => setFocusedInput('telephone')}
            onBlur={() => setFocusedInput(null)}
            editable={!loading}
          />

          <Text style={styles.inputLabel}>Adresse du cabinet</Text>
          <TextInput
            placeholder="Adresse complète"
            value={adresse}
            onChangeText={setAdresse}
            multiline
            numberOfLines={2}
            style={[
              styles.input,
              styles.textArea,
              focusedInput === 'adresse' && styles.inputFocused
            ]}
            onFocus={() => setFocusedInput('adresse')}
            onBlur={() => setFocusedInput(null)}
            editable={!loading}
          />

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

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="medical" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>S'inscrire comme médecin</Text>
              </>
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
    marginBottom: 20,
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
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  verificationSuccess: {
    backgroundColor: "#10B981",
  },
  verificationWarning: {
    backgroundColor: "#F59E0B",
  },
  verificationText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  verificationLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  verificationLoadingText: {
    color: "#64748B",
    fontSize: 14,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 16,
    marginTop: 8,
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
  required: {
    color: "#EF4444",
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
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
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
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    marginBottom: 20,
    minHeight: 50,
    justifyContent: "center",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  loadingText: {
    color: "#64748B",
    fontSize: 14,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#3B82F6",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#1E4ED8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    marginTop: 16,
  },
  buttonIcon: {
    marginRight: 8,
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
