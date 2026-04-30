const fs = require('fs');
const path = require('path');

const patches = [
  {
    file: 'node_modules/@react-native-community/netinfo/lib/module/internal/nativeInterface.js',
    find: 'nativeEventEmitter = new NativeEventEmitter(RNCNetInfo);',
    replace: `if (!RNCNetInfo.addListener) RNCNetInfo.addListener = () => {};
      if (!RNCNetInfo.removeListeners) RNCNetInfo.removeListeners = () => {};
      nativeEventEmitter = new NativeEventEmitter(RNCNetInfo);`,
  },
  {
    file: 'node_modules/@pusher/pusher-websocket-react-native/lib/module/index.js',
    find: '_defineProperty(this, "pusherEventEmitter", new NativeEventEmitter(PusherWebsocketReactNative));',
    replace: `if (!PusherWebsocketReactNative.addListener) PusherWebsocketReactNative.addListener = () => {};
    if (!PusherWebsocketReactNative.removeListeners) PusherWebsocketReactNative.removeListeners = () => {};
    _defineProperty(this, "pusherEventEmitter", new NativeEventEmitter(PusherWebsocketReactNative));`,
  },
];

patches.forEach(({ file, find, replace }) => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier introuvable: ${file}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(replace)) {
    console.log(`✅ Déjà patché: ${file}`);
    return;
  }
  if (!content.includes(find)) {
    console.log(`⚠️  Cible introuvable dans: ${file}`);
    return;
  }
  content = content.replace(find, replace);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Patché: ${file}`);
});