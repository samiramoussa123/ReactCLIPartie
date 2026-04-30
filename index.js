/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  "`new NativeEventEmitter()` was called with a non-null argument without the required `addListener` method",
  "`new NativeEventEmitter()` was called with a non-null argument without the required `removeListeners` method",
]);
AppRegistry.registerComponent(appName, () => App);
