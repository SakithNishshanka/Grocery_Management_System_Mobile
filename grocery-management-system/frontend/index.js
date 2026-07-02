import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

if (
  typeof window !== 'undefined' &&
  typeof window.addEventListener === 'function' &&
  typeof document !== 'undefined' &&
  document.body
) {
  window.addEventListener('error', (event) => {
    document.body.style.cssText = 'padding:24px;font-family:monospace;background:#fff1f2';
    document.body.innerHTML =
      '<h2 style="color:#dc2626">Startup crash</h2><pre style="color:#374151;white-space:pre-wrap">' +
      (event.error ? event.error.stack : event.message) + '</pre>';
  });
  window.addEventListener('unhandledrejection', (event) => {
    document.body.style.cssText = 'padding:24px;font-family:monospace;background:#fff1f2';
    document.body.innerHTML =
      '<h2 style="color:#dc2626">Unhandled Promise</h2><pre style="color:#374151;white-space:pre-wrap">' +
      event.reason + '</pre>';
  });
}

registerRootComponent(App);
