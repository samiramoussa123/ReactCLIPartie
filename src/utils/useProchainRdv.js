// src/utils/useProchainRdv.js
import { useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import API from '../../api/api';
import { showNotification, CHANNEL } from './Notificationservice';

export function useProchainRdv(rdvActuelId, medecinId) {
  const alertShownRef   = useRef(false);  // ✅ évite les alertes répétées
  const intervalRef     = useRef(null);

  const checkProchainRdv = useCallback(async () => {
    if (!rdvActuelId || !medecinId || alertShownRef.current) return;

    try {
      const response = await API.get(
        `/rendezvous/medecin/${medecinId}/prochain/${rdvActuelId}`
      );
      const prochain = response.data?.prochain;
      if (!prochain) return;

      const rdvDate   = new Date(`${prochain.date}T${prochain.heure}`);
      const now       = new Date();
      const minutesRestantes = (rdvDate.getTime() - now.getTime()) / (1000 * 60);

      // ✅ Alerte si RDV suivant dans moins de 15 minutes
      if (minutesRestantes > 0 && minutesRestantes <= 15) {
        alertShownRef.current = true; // ne plus afficher

        // Alerte dans l'app
        Alert.alert(
          '⏰ Prochain patient dans ' + Math.ceil(minutesRestantes) + ' min',
          `${prochain.patient_nom} — ${prochain.heure.slice(0, 5)}`,
          [{ text: 'OK' }]
        );

        // Notification native
        await showNotification({
          id:        `prochain_${prochain.id}`,
          title:     '⏰ Prochain patient bientôt !',
          body:      `${prochain.patient_nom} dans ${Math.ceil(minutesRestantes)} min (${prochain.heure.slice(0, 5)})`,
          channelId: CHANNEL.URGENT,
          data:      { screen: 'GestionRendezVous' },
        });
      }
    } catch (e) {
      console.warn('Erreur vérification prochain RDV:', e.message);
    }
  }, [rdvActuelId, medecinId]);

  useEffect(() => {
    if (!rdvActuelId || !medecinId) return;

    // Vérifie immédiatement puis toutes les minutes
    checkProchainRdv();
    intervalRef.current = setInterval(checkProchainRdv, 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rdvActuelId, medecinId]);

  // Reset si on change de RDV
  const reset = useCallback(() => {
    alertShownRef.current = false;
  }, []);

  return { reset };
}