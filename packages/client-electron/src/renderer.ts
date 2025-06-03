// renderer.ts - Handles UI interactions in the Electron renderer process

// DOM Elements
console.log('Initializing DOM elements');
const scenarioInput = document.getElementById('scenario');
console.log('scenarioInput:', scenarioInput);
const baseUrlInput = document.getElementById('baseUrl');
console.log('baseUrlInput:', baseUrlInput);
const apiKeyInput = document.getElementById('apiKey');
console.log('apiKeyInput:', apiKeyInput);
const inputsContainer = document.getElementById('inputs-container');
console.log('inputsContainer:', inputsContainer);
const addInputButton = document.getElementById('add-input');
console.log('addInputButton:', addInputButton);
const domainContextContainer = document.getElementById('domain-context-container');
console.log('domainContextContainer:', domainContextContainer);
const addDomainContextButton = document.getElementById('add-domain-context');
console.log('addDomainContextButton:', addDomainContextButton);
const runTestButton = document.getElementById('run-test');
console.log('runTestButton:', runTestButton);
const resultsContainer = document.getElementById('results-container');
console.log('resultsContainer:', resultsContainer);
const resultStatus = document.getElementById('result-status');
console.log('resultStatus:', resultStatus);
const resultDescription = document.getElementById('result-description');
console.log('resultDescription:', resultDescription);
const playwrightCode = document.getElementById('playwright-code');
console.log('playwrightCode:', playwrightCode);
const playwrightAssertion = document.getElementById('playwright-assertion');
console.log('playwrightAssertion:', playwrightAssertion);

// Types matching the explorer package
// These are TypeScript interfaces, commented out for JavaScript compatibility
/*
interface UserInput {
  key: string;
  value: string;
  description: string;
}

interface TestData {
  scenario: string;
  baseUrl: string;
  userInputs: UserInput[];
  apiKey: string;
  domainContext: Record<string, string>;
}

interface TestResult {
  id: string;
  status: 'SUCCESS' | 'FAILURE';
  description: string;
  playwrightCodes: string[];
  playwrightAssertion?: string;
}
*/

// Add a new user input row
function addInputRow(key = '', value = '', description = '') {
  const inputRow = document.createElement('div');
  inputRow.className = 'input-row';

  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.placeholder = 'Key';
  keyInput.value = key;

  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.placeholder = 'Value';
  valueInput.value = value;

  const descriptionInput = document.createElement('input');
  descriptionInput.type = 'text';
  descriptionInput.placeholder = 'Description';
  descriptionInput.value = description;

  const removeButton = document.createElement('button');
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => {
    inputRow.remove();
  });

  inputRow.appendChild(keyInput);
  inputRow.appendChild(valueInput);
  inputRow.appendChild(descriptionInput);
  inputRow.appendChild(removeButton);

  inputsContainer.appendChild(inputRow);
}

// Get all user inputs from the form
function getUserInputs() {
  const inputs = [];
  const inputRows = inputsContainer.querySelectorAll('.input-row');

  for (const row of inputRows) {
    const keyInput = row.querySelector('input:nth-child(1)');
    const valueInput = row.querySelector('input:nth-child(2)');
    const descriptionInput = row.querySelector('input:nth-child(3)');

    if (keyInput.value && valueInput.value) {
      inputs.push({
        key: keyInput.value,
        value: valueInput.value,
        description: descriptionInput.value || '',
      });
    }
  }

  return inputs;
}

// Add a new domain context row
function addDomainContextRow(value = '') {
  const contextRow = document.createElement('div');
  contextRow.className = 'context-row';

  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.placeholder = 'Value';
  valueInput.value = value;

  const removeButton = document.createElement('button');
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => {
    contextRow.remove();
  });

  contextRow.appendChild(valueInput);
  contextRow.appendChild(removeButton);

  domainContextContainer.appendChild(contextRow);
}

// Get all domain context from the form
function getDomainContext() {
  const context: string[] = [];
  const contextRows = domainContextContainer.querySelectorAll('.context-row');

  for (const row of contextRows) {
    context.push(row.querySelector('input')?.value ?? '');
  }

  return context;
}

// Display test results
function displayResults(result) {
  resultsContainer.style.display = 'block';

  // Display status
  resultStatus.innerHTML = `<h3 class="${result.status.toLowerCase()}">${result.status}</h3>`;

  // Display description
  resultDescription.innerHTML = `<p>${result.description}</p>`;

  // Display Playwright code
  playwrightCode.textContent = result.playwrightCodes.join('\n\n');

  // Display assertion if available
  if (result.playwrightAssertion) {
    playwrightAssertion.textContent = result.playwrightAssertion;
  } else {
    playwrightAssertion.textContent = 'No assertion provided';
  }
}

// Event Listeners
console.log('Setting up DOMContentLoaded event listener');
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired');
  // Add initial input row
  addInputRow();

  // Add initial domain context row
  addDomainContextRow();

  // Add input button
  console.log('Setting up click event listener for addInputButton');
  addInputButton.addEventListener('click', () => {
    console.log('Add Input button clicked');
    addInputRow();
  });

  // Add domain context button
  console.log('Setting up click event listener for addDomainContextButton');
  addDomainContextButton.addEventListener('click', () => {
    console.log('Add Domain Context button clicked');
    addDomainContextRow();
  });

  // Run test button
  runTestButton.addEventListener('click', async () => {
    const testData = {
      scenario: scenarioInput.value,
      baseUrl: baseUrlInput.value,
      userInputs: getUserInputs(),
      apiKey: apiKeyInput.value,
      domainContext: getDomainContext(),
    };

    console.log(testData);

    try {
      runTestButton.disabled = true;
      runTestButton.textContent = 'Running...';
      console.log(window.apiserver);

      const result = await window.apiserver.runTest(testData);
      displayResults(result);
    } catch (error) {
      console.error('Error running test:', error);
      alert('Error running test. Check the console for details.');
    } finally {
      runTestButton.disabled = false;
      runTestButton.textContent = 'Run Test';
    }
  });
});
