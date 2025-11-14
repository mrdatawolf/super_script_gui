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

// Initialize app
async function init() {
  try {
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

  // Check for updates in the background (don't await - let it run async)
  checkForScriptUpdates(script);
}

// Check for script updates in the background
async function checkForScriptUpdates(script) {
  try {
    const updateResult = await window.electronAPI.checkUpdates(script);

    if (updateResult.hasUpdate) {
      // Show update notification
      const updateMessage = `A newer version of "${script.name}" is available.\n\nWould you like to download and use the latest version?`;

      if (confirm(updateMessage)) {
        // User wants to update
        appendOutput({ type: 'stdout', data: `📥 Downloading latest version of ${script.name}...\n` });

        const downloadResult = await window.electronAPI.downloadScript(script);

        if (downloadResult.success) {
          appendOutput({ type: 'stdout', data: `✅ Successfully updated to latest version!\n` });
          // Show success message
          scriptBadge.textContent = 'Updated!';
          scriptBadge.style.backgroundColor = '#10b981';
          setTimeout(() => {
            scriptBadge.textContent = 'PowerShell';
            scriptBadge.style.backgroundColor = '';
          }, 3000);
        } else {
          appendOutput({ type: 'stderr', data: `❌ Failed to download update: ${downloadResult.message}\n` });
        }
      }
    }
  } catch (error) {
    // Silently fail - don't interrupt user workflow
    console.error('Update check failed:', error);
  }
}

// Generate parameter input form
function generateParameterForm(parameters) {
  parametersForm.innerHTML = '';

  if (!parameters || parameters.length === 0) {
    parametersForm.innerHTML = '<p style="color: var(--text-secondary);">This script has no parameters.</p>';
    return;
  }

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

    switch (param.type) {
      case 'boolean':
      case 'switch':
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'form-checkbox';
        input = document.createElement('input');
        input.type = 'checkbox';
        input.id = param.name;
        input.name = param.name;
        input.checked = param.default || false;

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

        if (param.default) {
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
        if (param.default) {
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

        if (param.default) {
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

// Initialize app when DOM is ready
init();
