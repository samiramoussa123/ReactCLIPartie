import React, { useEffect, useRef, useState, createContext, useContext } from "react";
import 'react-native-gesture-handler';
import { StatusBar, StyleSheet, useColorScheme, View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import Ionicons from 'react-native-vector-icons/Ionicons';

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
import { initPusher, destroyPusher, isPusherConnected } from './src/utils/Echo';
import PrivateChat from "./component/PrivateChat";
import PublicForum from "./component/PublicForum";
import ConversationListScreen from "./component/ConversationListScreen";
export const RendezVousCountContext = createContext({ count: 0, setCount: () => {} });

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerMenu() {
  const headerRightIcons = {
    Accueil:          'home-outline',
    Profile:          'person-outline',
    RendezVous:       'calendar-outline',
    DossiersPatient:  'medical-outline',
    ListedesMedecins: 'people-outline',
  };

  return (
    <Drawer.Navigator
      backBehavior="history"
      //initialRouteName="Accueil"
      screenOptions={({ route, navigation }) => ({
        drawerType: "slide",
        drawerStyle: { width: 220 },
        drawerActiveTintColor: "#3B82F6",
        drawerInactiveTintColor: "#64748B",
        headerShown: true,
        headerStyle: { backgroundColor: "#3B82F6" },
        headerTintColor: "#FFFFFF",
        headerTitleAlign: "center",
        headerTitleStyle: { fontWeight: '500', fontSize: 16 },
        headerLeft: () => (
          <TouchableOpacity style={{ marginLeft: 12 }} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
        headerRight: () => {
          const iconName = headerRightIcons[route.name];
          if (!iconName) return null;
          return (
            <TouchableOpacity style={{ marginRight: 15 }} onPress={() => console.log(`Icône ${iconName} pressée sur ${route.name}`)}>
              <Ionicons name={iconName} size={24} color="#FFFFFF" />
            </TouchableOpacity>
          );
        },
        drawerIcon: ({ color, size }) => {
          const icons = {
            Accueil:          'home-outline',
            Profile:          'person-outline',
            RendezVous:       'calendar-outline',
            DossiersPatient:  'folder-open-outline',
            ListedesMedecins: 'people-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Drawer.Screen name="Accueil" component={Home} options={{ drawerLabel: "Accueil", title: "Accueil" }} />
      <Drawer.Screen name="Profile" component={Profile} options={{ drawerLabel: "Mon Profil", headerShown: false, title: "" }} />
<Drawer.Screen
  name="RendezVous"
  component={RendezVous}
  options={({ route }) => {
    const nomMedecin = route.params?.nomMedecin;
    const specialite = route.params?.specialite;

    return {
      drawerLabel: "Mes Rendez-vous",
      headerTitle: () =>
        nomMedecin ? (
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 15 }}>
              {nomMedecin}
            </Text>
            {specialite ? (
              <Text style={{ color: "#D1FAE5", fontSize: 12 }}>
                {specialite.toUpperCase()}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={{ color: "#FFF", fontWeight: "500", fontSize: 16 }}>
            Mes Rendez-vous
          </Text>
        ),
    };
  }}
  initialParams={{ ongletInitial: "mesrdv" }}
/> 
     <Drawer.Screen name="DossiersPatient" component={DossiersPatient} options={{ drawerLabel: "Mon Dossier Médical", title: "Mon Dossier" }} />
      <Drawer.Screen name="ListedesMedecins" component={ListeMedecins} options={{ drawerLabel: "Liste des Médecins", title: "Médecins" }} />
    </Drawer.Navigator>
  );
}

function DrawerMed() {
  const { count } = useContext(RendezVousCountContext);
  const headerRightIcons = {
        Accueil:          'home-outline',

    ProfileMedecin:    'person-outline',
    GestionRendezVous: 'calendar-outline',
    DossiersMedecin:   'folder-open-outline',
  };

  return (
    <Drawer.Navigator
      screenOptions={({ route, navigation }) => ({
        drawerType: "slide",
        drawerStyle: { width: 220 },
        headerShown: true,
        headerStyle: { backgroundColor: "#3B82F6" },
        headerTintColor: "#FFFFFF",
        headerTitleAlign: "center",
        drawerActiveTintColor: "#3B82F6",
        drawerInactiveTintColor: "#64748B",
        headerLeft: () => (
          <TouchableOpacity style={{ marginLeft: 12 }} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
        headerRight: () => {
          const iconName = headerRightIcons[route.name];
          if (!iconName) return null;
          return (
            <TouchableOpacity style={{ marginRight: 15 }} onPress={() => console.log(route.name)}>
              <Ionicons name={iconName} size={24} color="#FFFFFF" />
            </TouchableOpacity>
          );
        },
        drawerIcon: ({ color, size }) => {
          const icons = {
            ProfileMedecin:    'person-outline',
            GestionRendezVous: 'calendar-outline',
            DossiersMedecin:   'folder-open-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      
<Drawer.Screen 
  name="ProfileMedecin" 
  component={ProfileMedecin} 
  options={{
    drawerLabel: "Mon Profil",
    gestureEnabled: false,                   
    headerStyle: { backgroundColor: "#10B981" }, 
    headerTitle: () => (                      
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="medical-outline" size={20} color="#FFF" />
        <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "bold", marginLeft: 8 }}>
          
        </Text>
      </View>
    ),
    headerLeft: () => (                      
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 12 }}>
        <Ionicons name="arrow-back-outline" size={24} color="#FFF" />
      </TouchableOpacity>
    ),
    headerRight: () => null,
  }} 
/>
      <Drawer.Screen name="Accueil" component={Home} options={{ drawerLabel: "Accueil", title: "Accueil" }} />

<Drawer.Screen 
  name="GestionRendezVous" 
  component={GestionRendezVous} 
  options={{
    drawerLabel: "Rendez-vous",
    title: "Mes Rendez-Vous",
    drawerIcon: ({ color, size }) => (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="calendar-outline" size={size} color={color} />
        {count > 0 && (
          <View style={styles.drawerBadgeOnIcon}>
            <Text style={styles.drawerBadgeText}>{count}</Text>
          </View>
        )}
      </View>
    ),
  }} 
/>      
      <Drawer.Screen name="DossiersMedecin" component={DossiersMedecin} options={{ drawerLabel: "Dossiers Médicaux" ,headerShown:false}} />
    </Drawer.Navigator>
  );
}

function DrawerAdmin() {
  const headerRightIcons = {
    DashboardAdminDrawer: 'grid-outline',
    GestionSpecialite:    'medical-outline',
    GestionPatient:       'people-outline',
    GestionMedecin:       'person-add-outline',
  };

  return (
    <Drawer.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: "#3B82F6" },
        headerTintColor: "#FFFFFF",
        headerTitleAlign: "center",
        drawerActiveTintColor: "#3B82F6",
        drawerInactiveTintColor: "#64748B",
        headerLeft: () => (
          <TouchableOpacity style={{ marginLeft: 12 }} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
        headerRight: () => {
          const iconName = headerRightIcons[route.name];
          if (!iconName) return null;
          return (
            <TouchableOpacity style={{ marginRight: 15 }} onPress={() => console.log(route.name)}>
              <Ionicons name={iconName} size={24} color="#FFFFFF" />
            </TouchableOpacity>
          );
        },
        drawerIcon: ({ color, size }) => {
          const icons = {
            DashboardAdminDrawer: 'grid-outline',
            GestionSpecialite:    'medical-outline',
            GestionPatient:       'people-outline',
            GestionMedecin:       'person-add-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Drawer.Screen name="DashboardAdminDrawer" component={DashboardAdmin} options={{ drawerLabel: "Dashboard" }} />
      <Drawer.Screen name="GestionSpecialite" component={GestionSpecialites} options={{ drawerLabel: "Spécialités" }} />
      <Drawer.Screen name="GestionPatient" component={GestionPatients} options={{ drawerLabel: "Patients" }} />
      <Drawer.Screen name="GestionMedecin" component={GestionMedecins} options={{ drawerLabel: "Médecins" }} />
    </Drawer.Navigator>
  );
}

export default function App() {
  const [pusherStatus, setPusherStatus] = useState('initializing');
  const [rendezvousCount, setRendezvousCount] = useState(0);
  const initAttempted = useRef(false);

  useEffect(() => {
    const initializePusher = async () => {
      if (initAttempted.current) return;
      initAttempted.current = true;
      try {
        await initPusher();
        setPusherStatus('connected');
        const interval = setInterval(() => {
          const connected = isPusherConnected();
          if (!connected) {
            setPusherStatus('reconnecting');
            initPusher().catch(() => setPusherStatus('failed'));
          } else {
            setPusherStatus('connected');
          }
        }, 5000);
        return () => clearInterval(interval);
      } catch {
        setPusherStatus('failed');
      }
    };
    initializePusher();
    return () => { destroyPusher?.(); initAttempted.current = false; };
  }, []);

  const isDarkMode = useColorScheme() === "dark";

  const linking = {
    prefixes: ["fontsante://"],
    config: {
      screens: {
        RenitialiserMdp: {
          path: "reset-password",
          parse: { token: (t) => t, email: (e) => e },
        },
      },
    },
  };

  if (pusherStatus === 'initializing') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Initialisation des notifications...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RendezVousCountContext.Provider value={{ count: rendezvousCount, setCount: setRendezvousCount }}>
          <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
          <NavigationContainer linking={linking}>
            <Stack.Navigator initialRouteName="Home">
              <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
              <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
              <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
              <Stack.Screen name="RegisterMedecin" component={RegisterMedecin} options={{ title: "Inscription Médecin" }} />

              <Stack.Screen name="Admin" component={DrawerAdmin} options={{ headerShown: false }} />
              <Stack.Screen name="Main" component={DrawerMenu} options={{ headerShown: false }} />
              <Stack.Screen name="Medecin" component={DrawerMed} options={{ headerShown: false }} />
              <Stack.Screen name="Forum" component={PublicForum} options={{ title: "Poser votre question" }} />
              <Stack.Screen name="Symptomes" component={Symptomes} options={{ title: "Analyser vos Symptômes" }} />
              <Stack.Screen name="ListeMedecinsStack" component={ListeMedecins} options={{ title: "Liste des Médecins" }} />
              <Stack.Screen name="DetailleMedecin" component={DetailleMedecin} options={{ title: "Détails du Médecin" }} />
              <Stack.Screen name="RendezVousStack" component={RendezVous} options={{ title: "Prendre Rendez-vous" }} />
<Stack.Screen
  name="ConversationList"
  component={ConversationListScreen}
  options={{ title: "Messages" }}
/>
              <Stack.Screen name="ConsultationVideo" component={ConsultationVideo} options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="DossiersMedecin" component={DossiersMedecin} options={{ headerShown: false }} />
              <Stack.Screen name="DetailDossier" component={DetailDossier} options={{ headerShown: false }} />
              <Stack.Screen name="MotDePasseOublier" component={MotDePasseOublier} options={{ title: "Mot de passe oublié" }} />
              <Stack.Screen name="RenitialiserMdp" component={RenitialiserMdp} options={{ title: "Réinitialiser le mot de passe" }} />
              <Stack.Screen name="DossiersPatient" component={DossiersPatient} options={{ headerShown: false }} />
<Stack.Screen
  name="PrivateChat"
  component={PrivateChat}
  options={{ headerShown: false }}
/>
       
 </Stack.Navigator>
          </NavigationContainer>
        </RendezVousCountContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B'
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  drawerBadge: {
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 8,
  },
  drawerBadgeOnIcon: {
  position: 'absolute',
  top: -6,
  right: -10,
  backgroundColor: 'red',
  borderRadius: 10,
  minWidth: 16,
  height: 16,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 3,
},
  drawerBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});