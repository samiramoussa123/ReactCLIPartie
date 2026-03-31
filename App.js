/**
 * App.js — React Native CLI version
 */
import 'react-native-gesture-handler';
import { StatusBar, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import Ionicons from 'react-native-vector-icons/Ionicons';

// ====== Screens ======
import Login from "./component/Login";
import Profile from "./component/EspacePatient/Profile";
import ProfileMedecin from "./component/EspaceMedecin/ProfileMedecin";
import Register from "./component/EspacePatient/Register";
import Symptomes from "./component/EspacePatient/Symptomes";
import RegisterMedecin from "./component/EspaceMedecin/RegisterMedecin";
import GestionRendezVous from "./component/EspaceMedecin/GestionRendezVous";
import DashboardAdmin from "./component/EspaceAdmin/DashboardAdmin";
import RendezVous from "./component/EspacePatient/RendezVous";
import GestionSpecialites from "./component/EspaceAdmin/GestionSpecialités";
import DetailleMedecin from "./component/EspacePatient/DetailleMedecin";
import ListeMedecins from "./component/EspacePatient/ListeMedecins";
import GestionPatients from "./component/EspaceAdmin/GestionPatient";
import GestionMedecins from "./component/EspaceAdmin/GestionMedecins";
import DossiersMedecin from "./component/EspaceMedecin/DossiersMedecin";
import DetailDossier from "./component/EspaceMedecin/DetailDossier";
import DossiersPatient from "./component/EspacePatient/DossiersPatient";
import MotDePasseOublier from "./component/motDePasseOublier";
import RenitialiserMdp from "./component/renitialiserMdp";
import ConsultationVideo from "./component/EspaceMedecin/ConsultationVideo";
import Home from './component/Home';
import { initPusher } from './src/utils/Echo';
import React, { useState, useEffect } from "react";

// ====== Navigators ======
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// ---- Drawer Patient ----
function DrawerMenu() {
  return (
    <Drawer.Navigator
      initialRouteName="Accueil"
      screenOptions={({ route }) => ({
        drawerType: "slide",
        drawerStyle: { width: 220 },
        drawerActiveTintColor: "#3B82F6",
        drawerInactiveTintColor: "#64748B",
        drawerIcon: ({ color, size }) => {
          const icons = {
            Profile:          'person-outline',
            Accueil:          'home-outline',
            RendezVous:       'calendar-outline',
            DossiersPatient:  'folder-open-outline',
            ListedesMedecins: 'people-outline',
          };
          return (
            <Ionicons
              name={icons[route.name] || 'ellipse-outline'}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Drawer.Screen
        name="Accueil"
        component={Home}
        options={{ drawerLabel: "Accueil" }}
      />
      <Drawer.Screen
        name="Profile"
        component={Profile}
        options={{ drawerLabel: "Mon Profil" }}
      />
      <Drawer.Screen
        name="RendezVous"
        component={RendezVous}
        options={{ drawerLabel: "Mes Rendez-vous" }}
      />
      <Drawer.Screen
        name="DossiersPatient"
        component={DossiersPatient}
        options={{ drawerLabel: "Mon Dossier Médical" }}
      />
      <Drawer.Screen
        name="ListedesMedecins"
        component={ListeMedecins}
        options={{ drawerLabel: "Liste des Médecins" }}
      />
    </Drawer.Navigator>
  );
}

// ---- Drawer Médecin ----
function DrawerMed() {
  return (
    <Drawer.Navigator
      screenOptions={({ route }) => ({
        drawerType: "slide",
        drawerStyle: { width: 220 },
        headerShown: false,
        drawerActiveTintColor: "#3B82F6",
        drawerInactiveTintColor: "#64748B",
        drawerIcon: ({ color, size }) => {
          const icons = {
            ProfileMedecin:    'person-outline',
            GestionRendezVous: 'calendar-outline',
            DossiersMedecin:   'folder-open-outline',
          };
          return (
            <Ionicons
              name={icons[route.name] || 'ellipse-outline'}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Drawer.Screen
        name="ProfileMedecin"
        component={ProfileMedecin}
        options={{ drawerLabel: "Mon Profil" }}
      />
      <Drawer.Screen
        name="GestionRendezVous"
        component={GestionRendezVous}
        options={{ drawerLabel: "Rendez-vous" }}
      />
      <Drawer.Screen
        name="DossiersMedecin"
        component={DossiersMedecin}
        options={{ drawerLabel: "Dossiers Médicaux" }}
      />
    </Drawer.Navigator>
  );
}

// ---- Drawer Admin ----
function DrawerAdmin() {
  return (
    <Drawer.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        drawerActiveTintColor: "#3B82F6",
        drawerInactiveTintColor: "#64748B",
        drawerIcon: ({ color, size }) => {
          const icons = {
            DashboardAdminDrawer: 'grid-outline',
            GestionSpecialite:    'medical-outline',
            GestionPatient:       'people-outline',
            GestionMedecin:       'person-add-outline',
          };
          return (
            <Ionicons
              name={icons[route.name] || 'ellipse-outline'}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Drawer.Screen
        name="DashboardAdminDrawer"
        component={DashboardAdmin}
        options={{ drawerLabel: "Dashboard" }}
      />
      <Drawer.Screen
        name="GestionSpecialite"
        component={GestionSpecialites}
        options={{ drawerLabel: "Spécialités" }}
      />
      <Drawer.Screen
        name="GestionPatient"
        component={GestionPatients}
        options={{ drawerLabel: "Patients" }}
      />
      <Drawer.Screen
        name="GestionMedecin"
        component={GestionMedecins}
        options={{ drawerLabel: "Médecins" }}
      />
    </Drawer.Navigator>
  );
}

// ====== Main App ======
export default function App() {
  useEffect(() => {
    initPusher().catch(err => console.error('Pusher init error:', err));
  }, []);

  const isDarkMode = useColorScheme() === "dark";

  const linking = {
    prefixes: ["fontsante://"],
    config: {
      screens: {
        RenitialiserMdp: {
          path: "reset-password",
          parse: {
            token: (token) => token,
            email: (email) => email,
          },
        },
      },
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <NavigationContainer linking={linking}>
          <Stack.Navigator initialRouteName="Home">

            {/* ── Screens publiques ── */}
            <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />

            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={Register}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RegisterMedecin"
              component={RegisterMedecin}
              options={{ title: "Inscription Médecin" }}
            />

            {/* ── Drawers ── */}
            <Stack.Screen
              name="Admin"
              component={DrawerAdmin}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Main"
              component={DrawerMenu}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Medecin"
              component={DrawerMed}
              options={{ headerShown: false }}
            />

            {/* ── Screens communes ── */}
            <Stack.Screen
              name="Symptomes"
              component={Symptomes}
              options={{ title: "Analyser vos Symptômes" }}
            />
            <Stack.Screen
              name="ListeMedecinsStack"
              component={ListeMedecins}
              options={{ title: "Liste des Médecins" }}
            />
            <Stack.Screen
              name="DetailleMedecin"
              component={DetailleMedecin}
              options={{ title: "Détails du Médecin" }}
            />
            <Stack.Screen
              name="RendezVousStack"
              component={RendezVous}
              options={{ title: "Prendre Rendez-vous" }}
            />

            {/* ── Consultation Vidéo ── */}
            <Stack.Screen
              name="ConsultationVideo"
              component={ConsultationVideo}
              options={{ headerShown: false, gestureEnabled: false }}
            />

            {/* ── Dossiers Médicaux Médecin ── */}
            <Stack.Screen
              name="DossiersMedecin"
              component={DossiersMedecin}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="DetailDossier"
              component={DetailDossier}
              options={{ headerShown: false }}
            />

            {/* ── Mot de passe ── */}
            <Stack.Screen
              name="MotDePasseOublier"
              component={MotDePasseOublier}
              options={{ title: "Mot de passe oublié" }}
            />
            <Stack.Screen
              name="RenitialiserMdp"
              component={RenitialiserMdp}
              options={{ title: "Réinitialiser le mot de passe" }}
            />

            {/* ── Dossiers Médicaux Patient ── */}
            <Stack.Screen
              name="DossiersPatient"
              component={DossiersPatient}
              options={{ headerShown: false }}
            />

          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});