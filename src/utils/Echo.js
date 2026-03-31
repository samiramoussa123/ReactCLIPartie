import Pusher from '@pusher/pusher-websocket-react-native';

let pusherClient = null;
let isConnected = false;

export const initPusher = async () => {
  if (isConnected) return;
  pusherClient = Pusher.getInstance();
  await pusherClient.init({
    apiKey: 'a4296ddb2d5684b79663',
    cluster: 'mt1',
  });
  await pusherClient.connect();
  isConnected = true;
};

export const subscribeToChannel = async (channelName, eventName, callback) => {
  if (!pusherClient) return;
  await pusherClient.subscribe({
    channelName,
    onEvent: (event) => {
      if (event.eventName === eventName) {
        try {
          const data = typeof event.data === 'string'
            ? JSON.parse(event.data)
            : event.data;
          callback(data);
        } catch {
          callback(event.data);
        }
      }
    },
  });
};

export const unsubscribeFromChannel = async (channelName) => {
  if (!pusherClient) return;
  await pusherClient.unsubscribe({ channelName });
};