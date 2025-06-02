// preload.ts - Exposes a limited set of Electron APIs to the renderer process

const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script is loading...');

// Interface for test data
// interface TestData {
//   scenario: string;
//   baseUrl: string;
//   userInputs: {
//     key: string;
//     value: string;
//     description: string;
//   }[];
//   apiKey: string;
// }

// Interface for test result
// interface TestResult {
//   id: string;
//   status: 'SUCCESS' | 'FAILURE';
//   description: string;
//   playwrightCodes: string[];
//   playwrightAssertion?: string;
// }

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
console.log('Setting up electronAPI in preload script...');
contextBridge.exposeInMainWorld('apiserver', {
  runTest: (testData) => {
    console.log('runTest called with data:', testData);
    return ipcRenderer.invoke('run-test', testData);
  },
});
console.log('Preload script loaded successfully!');
