const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script is loading...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
console.log('Setting up electronAPI in preload script...');
contextBridge.exposeInMainWorld('apiserver', {
  runTest: (testData) => {
    console.log('runTest called with data:', testData);
    return ipcRenderer.invoke('run-test', testData);
  },
  clearBrowserCache: () => ipcRenderer.invoke('clear-browser-cache'),
});
console.log('Preload script loaded successfully!'); 