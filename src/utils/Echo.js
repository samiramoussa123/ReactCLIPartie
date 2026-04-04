import AsyncStorage from '@react-native-async-storage/async-storage';
import Pusher from 'pusher-js';

let pusherClient = null;
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 3;
let statusListeners = [];

export const initPusher = async () => {
  try {
    if (isConnected && pusherClient) {
      console.log('✅ Pusher déjà connecté');
      return pusherClient;
    }

    console.log('🚀 Initialisation du client Pusher...');
    
    const options = {
      cluster: 'mt1',
      forceTLS: false,
      enabledTransports: ['ws', 'wss'],
      disabledTransports: ['sockjs', 'xhr_streaming', 'xhr_polling'],
      
    };

    pusherClient = new Pusher('a4296ddb2d5684b79663', options);

    pusherClient.connection.bind('connected', () => {
      isConnected = true;
      connectionAttempts = 0;
      console.log('✅ Pusher connecté');
      statusListeners.forEach(listener => listener('connected'));
    });

    pusherClient.connection.bind('disconnected', () => {
      isConnected = false;
      console.log('❌ Pusher déconnecté');
      statusListeners.forEach(listener => listener('disconnected'));
    });

    pusherClient.connection.bind('error', (error) => {
      console.error('❌ Erreur connexion Pusher:', error);
      isConnected = false;
      statusListeners.forEach(listener => listener('failed'));
    });

    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(), 5000);
      pusherClient.connection.bind('connected', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    if (isConnected) {
      console.log('✅ Pusher prêt à l\'emploi');
    } else {
      console.warn('⚠️ Pusher non connecté après 5 secondes');
    }
    
    return pusherClient;

  } catch (error) {
    console.error('❌ Erreur initialisation Pusher:', error);
    if (connectionAttempts++ < MAX_RETRIES) {
      console.log(`🔄 Tentative de reconnexion ${connectionAttempts}/${MAX_RETRIES}...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return initPusher();
    }
    console.warn('⚠️ Impossible de se connecter à Pusher, mode hors ligne');
    return null;
  }
};

// Le reste des fonctions (addConnectionListener, subscribeToChannel, etc.) reste identique
export const addConnectionListener = (callback) => {
  statusListeners.push(callback);
  return () => {
    statusListeners = statusListeners.filter(listener => listener !== callback);
  };
};

export const subscribeToChannel = async (channelName, eventName, callback) => {
  try {
    if (!pusherClient || !isConnected) {
      console.log(`⏳ Pusher non connecté, tentative de reconnexion...`);
      await initPusher();
    }
    
    if (!pusherClient || !isConnected) {
      console.log(`⚠️ Impossible de souscrire à ${channelName}: Pusher non connecté`);
      return null;
    }
    
    console.log(`📡 Souscription au canal: ${channelName}, événement: ${eventName}`);
    
    const channel = pusherClient.subscribe(channelName);
    channel.bind(eventName, (data) => {
      console.log(`🔔 Événement reçu:`, data);
      callback(data);
    });
    channel.bind('pusher:subscription_succeeded', () => {
      console.log(`✅ Souscription réussie au canal: ${channelName}`);
    });
    channel.bind('pusher:subscription_error', (error) => {
      console.error(`❌ Erreur souscription au canal ${channelName}:`, error);
    });
    
    return channel;
    
  } catch (error) {
    console.error('❌ Erreur subscription:', error);
    return null;
  }
};

export const unsubscribeFromChannel = async (channel) => {
  try {
    if (channel && channel.name) {
      console.log(`📡 Désinscription du canal: ${channel.name}`);
      pusherClient.unsubscribe(channel.name);
    }
  } catch (error) {
    console.error('❌ Erreur désinscription:', error);
  }
};

export const destroyPusher = async () => {
  try {
    if (pusherClient) {
      console.log('🔄 Destruction du client Pusher...');
      pusherClient.disconnect();
      pusherClient = null;
      isConnected = false;
      statusListeners = [];
      console.log('✅ Pusher détruit');
    }
  } catch (error) {
    console.error('❌ Erreur destruction Pusher:', error);
  }
};

export const getPusherClient = () => pusherClient;
export const isPusherConnected = () => isConnected;