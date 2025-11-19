// State management
let currentScript = null;
let scriptsData = null;

// DOM elements
const scriptList = document.getElementById('scriptList');
const welcomeScreen = document.getElementById('welcomeScreen');
const scriptDetail = document.getElementById('scriptDetail');
const scriptTitle = document.getElementById('scriptTitle');
const scriptDescription = document.getElementById('scriptDescription');
const scriptBadge = document.getElementById('scriptBadge');
const parametersForm = document.getElementById('parametersForm');
const executeBtn = document.getElementById('executeBtn');
const clearOutputBtn = document.getElementById('clearOutputBtn');
const outputConsole = document.getElementById('outputConsole');
const outputStatus = document.getElementById('outputStatus');
const scriptCount = document.getElementById('scriptCount');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const parametersSection = document.getElementById('parametersSection');
const parametersHeader = document.getElementById('parametersHeader');
const loadingSpinner = document.getElementById('loadingSpinner');

// Apply custom branding
async function applyBranding() {
  try {
    const result = await window.electronAPI.loadBranding();
    const branding = result.config;

    // Update document title
    if (branding.windowTitle) {
      document.title = branding.windowTitle;
    }

    // Update logo
    const logoImg = document.querySelector('.logo-container img');
    if (logoImg && branding.logoPath) {
      logoImg.src = branding.logoPath;
      logoImg.alt = branding.appName || 'Logo';
    }

    // Update app name
    const appNameElements = document.querySelectorAll('.app-name');
    appNameElements.forEach(el => {
      if (branding.appName) {
        el.textContent = branding.appName;
      }
    });

    // Update welcome screen
    const welcomeTitle = document.querySelector('.welcome-title');
    if (welcomeTitle && branding.welcomeTitle) {
      welcomeTitle.textContent = branding.welcomeTitle;
    }

    const welcomeSubtitle = document.querySelector('.welcome-subtitle');
    if (welcomeSubtitle && branding.welcomeSubtitle) {
      welcomeSubtitle.textContent = branding.welcomeSubtitle;
    }

    console.log('Branding applied:', result.success ? 'Custom' : 'Default');
  } catch (error) {
    console.error('Failed to apply branding:', error);
  }
}

// Apply custom theme CSS
async function applyCustomTheme() {
  try {
    const result = await window.electronAPI.loadCustomTheme();

    if (result.success && result.css) {
      // Create style element and inject custom CSS
      const styleEl = document.createElement('style');
      styleEl.id = 'custom-theme';
      styleEl.textContent = result.css;
      document.head.appendChild(styleEl);
      console.log('Custom theme loaded');
    } else {
      console.log('Using default theme');
    }
  } catch (error) {
    console.error('Failed to apply custom theme:', error);
  }
}

// Initialize app
async function init() {
  try {
    // Apply branding and custom theme first
    await Promise.all([
      applyBranding(),
      applyCustomTheme()
    ]);

    scriptsData = await window.electronAPI.getScripts();
    renderScriptList();
    scriptCount.textContent = scriptsData.scripts.length;

    // Listen for script output
    window.electronAPI.onScriptOutput((data) => {
      appendOutput(data);
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Render script list in sidebar
function renderScriptList() {
  scriptList.innerHTML = '';

  scriptsData.scripts.forEach(script => {
    const button = document.createElement('button');
    button.className = 'script-button';
    const adminBadge = script.requiresAdmin ? '<span class="admin-badge" title="Requires Administrator">🛡️</span>' : '';
    button.innerHTML = `
      <span class="script-button-title">${script.name} ${adminBadge}</span>
      <span class="script-button-subtitle">${script.repo}</span>
    `;
    button.addEventListener('click', () => selectScript(script));
    scriptList.appendChild(button);
  });
}

// Select and display script
async function selectScript(script) {
  currentScript = script;

  // Update UI
  welcomeScreen.style.display = 'none';
  scriptDetail.style.display = 'block';

  // Update active button
  document.querySelectorAll('.script-button').forEach(btn => btn.classList.remove('active'));
  event.target.closest('.script-button').classList.add('active');

  // Update script info
  scriptTitle.textContent = script.name;
  scriptDescription.textContent = script.description;
  scriptBadge.textContent = 'PowerShell';

  // Generate parameter form
  generateParameterForm(script.parameters);

  // Expand parameters section when selecting a new script
  parametersSection.classList.remove('collapsed');

  // Clear output
  clearOutput();
}

// Check all scripts for updates
async function checkAllScriptsForUpdates() {
  const checkUpdatesBtn = document.getElementById('checkUpdatesToggle');

  try {
    // Add checking animation
    checkUpdatesBtn.classList.add('checking');
    checkUpdatesBtn.disabled = true;

    // Get all scripts
    const scriptsData = await window.electronAPI.getScripts();
    const scripts = scriptsData.scripts || [];

    // Filter scripts with repos (can be updated)
    const updatableScripts = scripts.filter(s => s.repo);

    if (updatableScripts.length === 0) {
      alert('No updatable scripts found.');
      return;
    }

    // Check each script for updates
    const results = [];
    for (const script of updatableScripts) {
      try {
        const updateResult = await window.electronAPI.checkUpdates(script);
        if (updateResult.hasUpdate) {
          results.push({ script, updateResult });
        }
      } catch (error) {
        console.error(`Failed to check ${script.name}:`, error);
      }
    }

    // Remove checking animation
    checkUpdatesBtn.classList.remove('checking');

    if (results.length === 0) {
      alert('All scripts are up to date!');
      checkUpdatesBtn.classList.remove('has-updates');
    } else {
      // Show which scripts have updates
      checkUpdatesBtn.classList.add('has-updates');

      const updateList = results.map(r => `• ${r.script.name}`).join('\n');
      const message = `Updates available for ${results.length} script${results.length > 1 ? 's' : ''}:\n\n${updateList}\n\nWould you like to download all updates now?`;

      if (confirm(message)) {
        // Download all updates
        let successCount = 0;
        for (const { script } of results) {
          try {
            const downloadResult = await window.electronAPI.downloadScript(script);
            if (downloadResult.success) {
              successCount++;
            }
          } catch (error) {
            console.error(`Failed to download ${script.name}:`, error);
          }
        }

        alert(`Successfully updated ${successCount} of ${results.length} script${results.length > 1 ? 's' : ''}!`);
        checkUpdatesBtn.classList.remove('has-updates');
      }
    }
  } catch (error) {
    console.error('Update check failed:', error);
    alert('Failed to check for updates. Please try again later.');
  } finally {
    checkUpdatesBtn.classList.remove('checking');
    checkUpdatesBtn.disabled = false;
  }
}

// LocalStorage key prefix for saved parameters
const STORAGE_PREFIX = 'biztech-script-params-';

// Save parameters to localStorage
function saveParameterValues(scriptName, parameters) {
  try {
    const storageKey = STORAGE_PREFIX + scriptName;
    localStorage.setItem(storageKey, JSON.stringify(parameters));
  } catch (error) {
    console.error('Failed to save parameters:', error);
  }
}

// Load saved parameters from localStorage
function loadSavedParameters(scriptName) {
  try {
    const storageKey = STORAGE_PREFIX + scriptName;
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load saved parameters:', error);
    return null;
  }
}

// Clear saved parameters for a script
function clearSavedParameters(scriptName) {
  try {
    const storageKey = STORAGE_PREFIX + scriptName;
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Failed to clear saved parameters:', error);
  }
}

// Generate parameter input form
function generateParameterForm(parameters) {
  parametersForm.innerHTML = '';

  if (!parameters || parameters.length === 0) {
    parametersForm.innerHTML = '<p style="color: var(--text-secondary);">This script has no parameters.</p>';
    return;
  }

  // Load saved values for this script
  const savedValues = loadSavedParameters(currentScript.name);
  let hasSavedValues = false;

  parameters.forEach(param => {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';

    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = param.label || param.name;

    if (param.required) {
      const required = document.createElement('span');
      required.className = 'required';
      required.textContent = '*';
      label.appendChild(required);
    }

    formGroup.appendChild(label);

    let input;
    let savedValue = savedValues ? savedValues[param.name] : undefined;

    switch (param.type) {
      case 'boolean':
      case 'switch':
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'form-checkbox';
        input = document.createElement('input');
        input.type = 'checkbox';
        input.id = param.name;
        input.name = param.name;

        // Use saved value if exists, otherwise use default
        if (savedValue !== undefined) {
          input.checked = savedValue;
          hasSavedValues = true;
        } else {
          input.checked = param.default || false;
        }

        const checkboxLabel = document.createElement('label');
        checkboxLabel.textContent = param.description || 'Enable this option';
        checkboxLabel.style.cursor = 'pointer';
        checkboxLabel.htmlFor = param.name;

        checkboxContainer.appendChild(input);
        checkboxContainer.appendChild(checkboxLabel);
        formGroup.appendChild(checkboxContainer);
        break;

      case 'select':
        input = document.createElement('select');
        input.className = 'form-input';
        input.id = param.name;
        input.name = param.name;

        if (!param.required) {
          const emptyOption = document.createElement('option');
          emptyOption.value = '';
          emptyOption.textContent = '-- Select --';
          input.appendChild(emptyOption);
        }

        param.options.forEach(option => {
          const opt = document.createElement('option');
          opt.value = option.value || option;
          opt.textContent = option.label || option;
          input.appendChild(opt);
        });

        // Use saved value if exists, otherwise use default
        if (savedValue !== undefined && savedValue !== null && savedValue !== '') {
          input.value = savedValue;
          hasSavedValues = true;
        } else if (param.default) {
          input.value = param.default;
        }

        formGroup.appendChild(input);
        break;

      case 'textarea':
        input = document.createElement('textarea');
        input.className = 'form-input';
        input.id = param.name;
        input.name = param.name;
        input.rows = 4;
        input.placeholder = param.placeholder || '';

        // Use saved value if exists, otherwise use default
        if (savedValue !== undefined && savedValue !== null && savedValue !== '') {
          input.value = savedValue;
          hasSavedValues = true;
        } else if (param.default) {
          input.value = param.default;
        }

        formGroup.appendChild(input);
        break;

      default: // text, number, etc.
        input = document.createElement('input');
        input.className = 'form-input';
        input.type = param.type || 'text';
        input.id = param.name;
        input.name = param.name;
        input.placeholder = param.placeholder || '';

        // Use saved value if exists, otherwise use default
        if (savedValue !== undefined && savedValue !== null && savedValue !== '') {
          input.value = savedValue;
          hasSavedValues = true;
        } else if (param.default) {
          input.value = param.default;
        }

        if (param.required) {
          input.required = true;
        }

        formGroup.appendChild(input);
        break;
    }

    if (param.description && param.type !== 'boolean' && param.type !== 'switch') {
      const help = document.createElement('div');
      help.className = 'form-help';
      help.textContent = param.description;
      formGroup.appendChild(help);
    }

    parametersForm.appendChild(formGroup);
  });

  // Show indicator if saved values were loaded
  if (hasSavedValues) {
    showSavedValuesIndicator();
  }
}

// Execute script
executeBtn.addEventListener('click', async () => {
  if (!currentScript) return;

  // Validate form
  if (!parametersForm.checkValidity()) {
    parametersForm.reportValidity();
    return;
  }

  // Collect parameters
  const parameters = {};
  const formData = new FormData(parametersForm);

  currentScript.parameters.forEach(param => {
    const element = document.getElementById(param.name);

    if (param.type === 'boolean' || param.type === 'switch') {
      parameters[param.name] = element.checked;
    } else {
      const value = formData.get(param.name);
      if (value !== null && value !== '') {
        parameters[param.name] = value;
      }
    }
  });

  // Update UI
  executeBtn.disabled = true;
  executeBtn.innerHTML = '<span class="btn-icon">⏳</span> Executing...';
  setOutputStatus('running');
  clearOutput();

  // Show loading spinner IMMEDIATELY
  loadingSpinner.classList.add('active');

  // Collapse parameters after execution starts
  setTimeout(() => {
    parametersSection.classList.add('collapsed');
  }, 300);

  // Force multiple repaints to ensure spinner shows before blocking IPC call
  // Using requestAnimationFrame ensures the browser has painted
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => requestAnimationFrame(resolve));

  try {
    const result = await window.electronAPI.executeScript(currentScript, parameters);

    if (result.success) {
      setOutputStatus('success');
      appendOutput({ type: 'stdout', data: '\n\n✓ Script completed successfully\n' });

      // Save parameters for next time (only on successful execution)
      saveParameterValues(currentScript.name, parameters);
    } else {
      setOutputStatus('error');
      // Show exit code and any helpful error messages
      let errorMessage = '\n\n✗ Script failed with exit code: ' + result.exitCode + '\n';
      if (result.error) {
        errorMessage += result.error;
      }
      appendOutput({ type: 'stderr', data: errorMessage });
    }
  } catch (error) {
    setOutputStatus('error');
    appendOutput({ type: 'stderr', data: '\n\n✗ Error: ' + error.message + '\n' });
  } finally {
    // Hide loading spinner
    loadingSpinner.classList.remove('active');
    executeBtn.disabled = false;
    executeBtn.innerHTML = '<span class="btn-icon">▶</span> Execute Script';
  }
});

// Clear output
clearOutputBtn.addEventListener('click', () => {
  clearOutput();
  // Expand parameters when clearing output
  parametersSection.classList.remove('collapsed');
});

function clearOutput() {
  outputConsole.textContent = '';
  setOutputStatus('ready');
}

function appendOutput(data) {
  // Don't hide spinner when output arrives - let the execute handler control it
  const line = document.createElement('span');
  line.textContent = data.data;

  if (data.type === 'stderr') {
    line.style.color = '#ff6b6b';
  }

  outputConsole.appendChild(line);
  outputConsole.scrollTop = outputConsole.scrollHeight;
}

function setOutputStatus(status) {
  outputStatus.className = 'output-status ' + status;

  switch (status) {
    case 'ready':
      outputStatus.textContent = 'Ready';
      break;
    case 'running':
      outputStatus.textContent = 'Running...';
      break;
    case 'success':
      outputStatus.textContent = 'Success';
      break;
    case 'error':
      outputStatus.textContent = 'Error';
      break;
  }
}

// Show indicator that saved values were loaded
function showSavedValuesIndicator() {
  // Check if indicator already exists
  let indicator = document.getElementById('savedValuesIndicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'savedValuesIndicator';
    indicator.className = 'saved-values-indicator';
    indicator.innerHTML = `
      <span class="indicator-icon">💾</span>
      <span class="indicator-text">Saved values loaded</span>
      <button class="clear-saved-btn" id="clearSavedBtn" title="Clear saved values">✕</button>
    `;

    // Insert at the top of the parameters form
    parametersForm.insertBefore(indicator, parametersForm.firstChild);

    // Add click handler for clear button
    const clearBtn = document.getElementById('clearSavedBtn');
    clearBtn.addEventListener('click', () => {
      if (confirm(`Clear saved values for "${currentScript.name}"?`)) {
        clearSavedParameters(currentScript.name);
        hideSavedValuesIndicator();
        // Regenerate form with defaults
        generateParameterForm(currentScript.parameters);
      }
    });
  }
}

// Hide saved values indicator
function hideSavedValuesIndicator() {
  const indicator = document.getElementById('savedValuesIndicator');
  if (indicator) {
    indicator.remove();
  }
}

// Sidebar toggle functionality
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  sidebarToggle.classList.toggle('hidden');
});

// Parameters section accordion
parametersHeader.addEventListener('click', () => {
  parametersSection.classList.toggle('collapsed');
});

// Festive toggle functionality
const festiveToggle = document.getElementById('festiveToggle');
if (festiveToggle) {
  // Set initial state
  const isEnabled = window.seasonalEffects?.isEnabled();
  if (!isEnabled) {
    festiveToggle.classList.add('disabled');
  }

  festiveToggle.addEventListener('click', () => {
    const currentState = window.seasonalEffects?.isEnabled();
    const newState = !currentState;

    window.seasonalEffects?.toggle(newState);

    if (newState) {
      festiveToggle.classList.remove('disabled');
    } else {
      festiveToggle.classList.add('disabled');
    }
  });
}

// Tools List toggle functionality
const toolsListToggle = document.getElementById('toolsListToggle');
const toolsListView = document.getElementById('toolsListView');
if (toolsListToggle && toolsListView) {
  toolsListToggle.addEventListener('click', () => {
    const isShowingToolsList = toolsListView.style.display !== 'none';

    if (isShowingToolsList) {
      // Switch back to scripts view
      welcomeScreen.style.display = currentScript ? 'none' : 'flex';
      scriptDetail.style.display = currentScript ? 'block' : 'none';
      toolsListView.style.display = 'none';
      toolsListToggle.classList.remove('active');
      toolsListToggle.title = 'View Tools List';
    } else {
      // Switch to tools list view
      welcomeScreen.style.display = 'none';
      scriptDetail.style.display = 'none';
      toolsListView.style.display = 'flex';
      toolsListToggle.classList.add('active');
      toolsListToggle.title = 'Back to Scripts';
    }
  });
}

// Check Updates toggle functionality
const checkUpdatesToggle = document.getElementById('checkUpdatesToggle');
if (checkUpdatesToggle) {
  checkUpdatesToggle.addEventListener('click', () => {
    checkAllScriptsForUpdates();
  });
}

// Initialize app when DOM is ready
init();
