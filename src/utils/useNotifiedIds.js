// src/utils/useNotifiedIds.js
import { useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useNotifiedIds(userId, role) {
  // ✅ Clé unique par utilisateur : "notified_rdv_ids_patient_5" ou "notified_rdv_ids_medecin_3"
  const STORAGE_KEY = `notified_rdv_ids_${role}_${userId}`;
  const memorySet = useRef(new Set());

  const loadNotifiedIds = useCallback(async () => {
    if (!userId || !role) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ids = JSON.parse(raw);
        ids.forEach(id => memorySet.current.add(id));
      }
    } catch (e) {
      console.error('Erreur chargement notifiedIds:', e);
    }
  }, [STORAGE_KEY]);

  const hasNotified = useCallback((id) => {
    return memorySet.current.has(id);
  }, []);

  const markNotified = useCallback(async (id) => {
    if (memorySet.current.has(id)) return;
    memorySet.current.add(id);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const ids = raw ? JSON.parse(raw) : [];
      if (!ids.includes(id)) {
        const updated = [...ids, id].slice(-200);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Erreur sauvegarde notifiedId:', e);
    }
  }, [STORAGE_KEY]);

  const clearOldIds = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      memorySet.current.clear();
    } catch (e) {}
  }, [STORAGE_KEY]);

  return { loadNotifiedIds, hasNotified, markNotified, clearOldIds };
}