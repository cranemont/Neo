const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apiserver', {
  runTest: (testData) => {
    console.log('runTest called with data:', testData);
    return ipcRenderer.invoke('run-test', testData);
  },
  clearBrowserCache: () => ipcRenderer.invoke('clear-browser-cache'),
});
