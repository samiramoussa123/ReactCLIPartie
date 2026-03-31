import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const logout = async (navigation) => {
  await AsyncStorage.removeItem("token");
  navigation.replace("Login"); // ✅ marche mobile + web
};

export const confirmLogout = (navigation) => {
  const message = "Êtes-vous sûr de vouloir vous déconnecter ?";

  if (Platform.OS === "web") {
    if (window.confirm(message)) {
      logout(navigation);
    }
  } else {
    const { Alert } = require("react-native");
    Alert.alert("Déconnexion", message, [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: () => logout(navigation) },
    ]);
  }
};

export const navigateTo = (navigation, screen, params = {}) => {
  navigation.navigate(screen, params); // ✅ IMPORTANT
};

export const navigateReplace = (navigation, screen, params = {}) => {
  navigation.replace(screen, params); // ✅ IMPORTANT
};

export const showAlert = (title, message, onConfirm = null) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    if (onConfirm) onConfirm();
  } else {
    const { Alert } = require("react-native");
    const buttons = onConfirm
      ? [{ text: "OK", onPress: ()=>onConfirm }]
      : [{ text: "OK" }];
    Alert.alert(title, message, buttons);
  }
};