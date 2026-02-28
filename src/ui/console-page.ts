const STYLES = String.raw`
:root {
  --bg-1: #081523;
  --bg-2: #0f2a3c;
  --bg-3: #13394a;
  --surface: rgba(12, 32, 47, 0.72);
  --surface-strong: rgba(7, 22, 36, 0.88);
  --surface-soft: rgba(21, 51, 68, 0.55);
  --line: rgba(164, 212, 222, 0.28);
  --line-strong: rgba(164, 212, 222, 0.5);
  --text: #ecf7fb;
  --text-dim: #b5d4dd;
  --teal: #1fc9b8;
  --cyan: #69b6ff;
  --amber: #ffb95e;
  --danger: #ff6b6b;
  --success: #30d17c;
  --queued: #7aa4ff;
  --running: #ffd166;
  --radius-lg: 18px;
  --radius-md: 12px;
  --mono: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  --sans: "Manrope", "Avenir Next", "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  font-family: var(--sans);
  color: var(--text);
  background:
    radial-gradient(1200px 700px at -10% -20%, #1a5161 0%, transparent 60%),
    radial-gradient(850px 560px at 100% 0%, #27487d 0%, transparent 62%),
    linear-gradient(145deg, var(--bg-1), var(--bg-2) 48%, var(--bg-3));
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at center, black 42%, transparent 100%);
  opacity: 0.45;
}

main {
  max-width: 1500px;
  margin: 0 auto;
  padding: 28px 22px 38px;
}

header {
  position: sticky;
  top: 0;
  z-index: 20;
  margin-bottom: 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: linear-gradient(125deg, rgba(12, 37, 54, 0.85), rgba(10, 28, 41, 0.8));
  backdrop-filter: blur(10px);
}

.header-inner {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  padding: 18px 20px;
  align-items: center;
}

.brand {
  display: flex;
  gap: 15px;
  align-items: center;
}

.brand-mark {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background:
    conic-gradient(from 35deg, #58e9d9, #64a2ff, #ffcf77, #58e9d9);
  box-shadow: 0 10px 28px rgba(24, 188, 174, 0.36);
}

h1 {
  margin: 0;
  font-size: 1.28rem;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

.subtitle {
  margin: 4px 0 0;
  color: var(--text-dim);
  font-size: 0.92rem;
}

.health-pill {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 8px 12px;
  color: var(--text);
  font-size: 0.82rem;
  background: rgba(13, 45, 61, 0.62);
}

.health-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--danger);
  box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
  animation: pulse 2s infinite;
}

.health-dot.ok {
  background: var(--success);
  box-shadow: 0 0 0 0 rgba(48, 209, 124, 0.7);
}

.layout {
  display: grid;
  grid-template-columns: minmax(360px, 430px) minmax(0, 1fr);
  gap: 18px;
}

.panel {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--surface), var(--surface-strong));
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transform: translateY(10px);
  opacity: 0;
  animation: reveal 420ms ease forwards;
}

.panel:nth-child(2) {
  animation-delay: 90ms;
}

.panel-head {
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(145deg, rgba(18, 49, 70, 0.6), rgba(8, 24, 35, 0.2));
}

.panel-title {
  margin: 0;
  font-size: 1rem;
  letter-spacing: 0.02em;
}

.panel-note {
  margin: 6px 0 0;
  font-size: 0.82rem;
  color: var(--text-dim);
}

.panel-body {
  padding: 16px 18px 20px;
}

.form-grid {
  display: grid;
  gap: 14px;
}

label {
  display: grid;
  gap: 6px;
  font-size: 0.84rem;
  color: var(--text-dim);
}

input,
select,
textarea,
button {
  font: inherit;
}

input,
select,
textarea {
  width: 100%;
  background: rgba(7, 24, 36, 0.72);
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--text);
  padding: 10px 11px;
  outline: none;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--line-strong);
  box-shadow: 0 0 0 2px rgba(97, 198, 255, 0.22);
}

textarea {
  min-height: 80px;
  resize: vertical;
}

button {
  border: 1px solid transparent;
  color: #051521;
  background: linear-gradient(135deg, #6de2cf, #62a8ff);
  border-radius: 11px;
  padding: 9px 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease;
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(90, 180, 255, 0.35);
  filter: brightness(1.03);
}

button:active {
  transform: translateY(0);
}

button.ghost {
  background: rgba(13, 39, 55, 0.6);
  color: var(--text);
  border-color: var(--line);
  box-shadow: none;
}

button.ghost:hover {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.26);
}

button.warn {
  background: linear-gradient(135deg, #ffd59a, #ffb45f);
}

button.danger {
  background: linear-gradient(135deg, #ffb0b0, #ff7272);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
  transform: none;
  box-shadow: none;
}

.type-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  background: rgba(6, 23, 34, 0.7);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 6px;
}

.type-switch button {
  border-radius: 8px;
  min-height: 37px;
  background: transparent;
  color: var(--text-dim);
  border-color: transparent;
  box-shadow: none;
  font-size: 0.8rem;
}

.type-switch button.active {
  background: linear-gradient(132deg, rgba(113, 225, 212, 0.26), rgba(99, 169, 255, 0.26));
  color: var(--text);
  border-color: rgba(127, 213, 242, 0.5);
}

.inline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.inline-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.switch {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text);
}

.switch input {
  width: 17px;
  height: 17px;
  accent-color: var(--teal);
  padding: 0;
}

.fieldset {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  background: rgba(9, 29, 43, 0.46);
}

.fieldset > h3 {
  margin: 0 0 10px;
  font-size: 0.88rem;
  color: var(--text);
}

.fieldset > p {
  margin: -2px 0 10px;
  font-size: 0.78rem;
  color: var(--text-dim);
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 10px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.checkbox-item input {
  width: 15px;
  height: 15px;
  accent-color: var(--cyan);
}

.cta-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 4px;
}

.code-box {
  margin-top: 8px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(5, 20, 31, 0.72);
  overflow: hidden;
}

.code-tabs {
  display: flex;
  border-bottom: 1px solid var(--line);
}

.code-tabs button {
  flex: 1;
  min-height: 35px;
  border-radius: 0;
  font-size: 0.78rem;
  background: transparent;
  color: var(--text-dim);
  border: none;
  border-right: 1px solid var(--line);
  box-shadow: none;
}

.code-tabs button:last-child {
  border-right: none;
}

.code-tabs button.active {
  background: rgba(102, 182, 255, 0.2);
  color: var(--text);
}

pre {
  margin: 0;
  padding: 12px;
  max-height: 270px;
  overflow: auto;
  font-family: var(--mono);
  font-size: 0.74rem;
  line-height: 1.45;
  color: #dff6ff;
}

.right-stack {
  display: grid;
  gap: 18px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  align-items: center;
}

.job-id-input {
  min-width: min(390px, 100%);
  flex: 1;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 11px;
  font-size: 0.78rem;
  border: 1px solid var(--line);
  background: rgba(7, 23, 34, 0.62);
}

.status-badge.queued {
  color: var(--queued);
  border-color: rgba(122, 164, 255, 0.45);
}

.status-badge.running {
  color: var(--running);
  border-color: rgba(255, 209, 102, 0.45);
}

.status-badge.completed {
  color: var(--success);
  border-color: rgba(48, 209, 124, 0.45);
}

.status-badge.failed {
  color: var(--danger);
  border-color: rgba(255, 107, 107, 0.45);
}

.metric-grid {
  margin-top: 11px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.metric {
  background: rgba(7, 25, 36, 0.62);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px;
}

.metric-label {
  font-size: 0.74rem;
  color: var(--text-dim);
}

.metric-value {
  margin-top: 6px;
  font-size: 1.07rem;
  font-weight: 700;
}

.progress-track {
  margin-top: 12px;
  border-radius: 999px;
  height: 11px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: rgba(4, 16, 25, 0.82);
}

.progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #4de7c8, #78c4ff);
  transition: width 260ms ease;
}

.result-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.result-toolbar input,
.result-toolbar select {
  max-width: 260px;
}

.result-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 12px;
}

.table-wrap {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(6, 22, 33, 0.74);
  overflow: auto;
  max-height: 445px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

th,
td {
  padding: 9px 10px;
  border-bottom: 1px solid rgba(158, 213, 231, 0.18);
  text-align: left;
  white-space: nowrap;
}

th {
  position: sticky;
  top: 0;
  background: rgba(18, 49, 67, 0.96);
  z-index: 1;
  color: var(--text-dim);
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

tbody tr {
  cursor: pointer;
}

tbody tr:hover {
  background: rgba(106, 181, 255, 0.11);
}

tbody tr.active {
  background: rgba(48, 209, 124, 0.18);
}

.side-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(9, 30, 42, 0.7);
  padding: 12px;
  max-height: 445px;
  overflow: auto;
}

.side-card h4 {
  margin: 0 0 8px;
  font-size: 0.92rem;
}

.side-card dl {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

.side-card dt {
  color: var(--text-dim);
  font-size: 0.72rem;
}

.side-card dd {
  margin: 0;
  font-size: 0.83rem;
  color: var(--text);
  word-break: break-word;
}

.review-list {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.review-item {
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 8px;
  background: rgba(4, 16, 25, 0.5);
}

.review-head {
  display: flex;
  justify-content: space-between;
  font-size: 0.74rem;
  color: var(--text-dim);
  margin-bottom: 4px;
}

.review-text {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.4;
}

.history-list {
  margin-top: 10px;
  display: grid;
  gap: 7px;
}

.history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 8px 10px;
  background: rgba(6, 22, 32, 0.58);
}

.history-item button {
  min-height: 30px;
  padding: 5px 9px;
  font-size: 0.74rem;
}

.history-main {
  display: grid;
  gap: 4px;
}

.history-id {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: #d8f8ff;
}

.history-meta {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.callout {
  border: 1px solid rgba(255, 185, 94, 0.4);
  background: rgba(255, 185, 94, 0.12);
  padding: 9px 10px;
  border-radius: 10px;
  font-size: 0.8rem;
  color: #ffe4bf;
}

.error {
  border: 1px solid rgba(255, 107, 107, 0.5);
  background: rgba(255, 107, 107, 0.14);
  color: #ffd0d0;
}

.hide {
  display: none !important;
}

.muted {
  color: var(--text-dim);
}

.small {
  font-size: 0.77rem;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 currentColor;
  }
  70% {
    box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
  }
}

@keyframes reveal {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 1150px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .result-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  main {
    padding: 18px 12px 28px;
  }

  .header-inner {
    grid-template-columns: 1fr;
  }

  .inline-grid,
  .inline-grid-3,
  .cta-row,
  .checkbox-grid {
    grid-template-columns: 1fr;
  }

  .toolbar {
    align-items: stretch;
  }

  .toolbar > * {
    width: 100%;
  }

  .job-id-input {
    min-width: 0;
  }
}
`;

const SCRIPT = String.raw`
const HISTORY_KEY = 'gmaps-api.console.history.v1';

const state = {
  inputType: 'keyword_location',
  currentJobId: '',
  autoPoll: true,
  pollIntervalMs: 3000,
  pollTimer: null,
  status: null,
  resultsModel: null,
  selectedPlaceKey: null,
  history: [],
  filteredPlaces: [],
  codeTab: 'submit',
  health: null
};

const ui = {
  healthDot: document.getElementById('healthDot'),
  healthLabel: document.getElementById('healthLabel'),
  guardrailNotice: document.getElementById('guardrailNotice'),
  typeButtons: Array.from(document.querySelectorAll('[data-type-button]')),
  form: document.getElementById('jobForm'),
  inputKeyword: document.getElementById('inputKeyword'),
  inputMapsUrl: document.getElementById('inputMapsUrl'),
  inputPlaceId: document.getElementById('inputPlaceId'),
  query: document.getElementById('query'),
  location: document.getElementById('location'),
  mapsUrl: document.getElementById('mapsUrl'),
  placeId: document.getElementById('placeId'),
  maxPlaces: document.getElementById('maxPlaces'),
  maxScrollSteps: document.getElementById('maxScrollSteps'),
  maxViewportPans: document.getElementById('maxViewportPans'),
  stopOnNoGrowth: document.getElementById('stopOnNoGrowth'),
  reviewsEnabled: document.getElementById('reviewsEnabled'),
  reviewsPanel: document.getElementById('reviewsPanel'),
  reviewSort: document.getElementById('reviewSort'),
  maxReviews: document.getElementById('maxReviews'),
  includeSensitiveFields: document.getElementById('includeSensitiveFields'),
  sensitivePanel: document.getElementById('sensitivePanel'),
  requestedFields: Array.from(document.querySelectorAll('[data-field]')),
  advancedPolicyEnabled: document.getElementById('advancedPolicyEnabled'),
  policyPanel: document.getElementById('policyPanel'),
  maxRetries: document.getElementById('maxRetries'),
  initialBackoffMs: document.getElementById('initialBackoffMs'),
  maxBackoffMs: document.getElementById('maxBackoffMs'),
  backoffJitterRatio: document.getElementById('backoffJitterRatio'),
  pacingMs: document.getElementById('pacingMs'),
  useProxy: document.getElementById('useProxy'),
  captchaMode: document.getElementById('captchaMode'),
  submitBtn: document.getElementById('submitBtn'),
  presets: Array.from(document.querySelectorAll('[data-preset]')),
  currentJobId: document.getElementById('currentJobId'),
  trackBtn: document.getElementById('trackBtn'),
  autoPoll: document.getElementById('autoPoll'),
  pollInterval: document.getElementById('pollInterval'),
  refreshStatusBtn: document.getElementById('refreshStatusBtn'),
  fetchResultsBtn: document.getElementById('fetchResultsBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  statusBadge: document.getElementById('statusBadge'),
  statusUpdatedAt: document.getElementById('statusUpdatedAt'),
  metricDiscovered: document.getElementById('metricDiscovered'),
  metricProcessed: document.getElementById('metricProcessed'),
  metricUnique: document.getElementById('metricUnique'),
  metricFailed: document.getElementById('metricFailed'),
  metricElapsed: document.getElementById('metricElapsed'),
  metricHeartbeat: document.getElementById('metricHeartbeat'),
  progressFill: document.getElementById('progressFill'),
  statusError: document.getElementById('statusError'),
  historyList: document.getElementById('historyList'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  resultSummary: document.getElementById('resultSummary'),
  placeSearch: document.getElementById('placeSearch'),
  placeSort: document.getElementById('placeSort'),
  placesBody: document.getElementById('placesBody'),
  placeDetails: document.getElementById('placeDetails'),
  codeTabs: Array.from(document.querySelectorAll('[data-code-tab]')),
  codeBlock: document.getElementById('codeBlock')
};

bootstrap().catch((error) => {
  console.error(error);
  showCode('status', { error: 'ui_bootstrap_failed', message: String(error?.message ?? error) });
});

async function bootstrap() {
  hydrateHistory();
  bindEvents();
  applyInputType(state.inputType);
  applyToggleSections();
  renderHistory();
  renderResultsSection();
  showCode('submit', { info: 'Submit a job to see request/response details here.' });
  await fetchHealth();
}

function bindEvents() {
  ui.typeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const type = button.dataset.typeButton;
      if (!type) {
        return;
      }
      state.inputType = type;
      applyInputType(type);
    });
  });

  ui.reviewsEnabled.addEventListener('change', applyToggleSections);
  ui.includeSensitiveFields.addEventListener('change', applyToggleSections);
  ui.advancedPolicyEnabled.addEventListener('change', applyToggleSections);

  ui.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitJob();
  });

  ui.presets.forEach((button) => {
    button.addEventListener('click', () => {
      const preset = button.dataset.preset;
      if (!preset) {
        return;
      }
      applyPreset(preset);
    });
  });

  ui.trackBtn.addEventListener('click', async () => {
    const jobId = ui.currentJobId.value.trim();
    if (!jobId) {
      setStatusError('Enter a job id to track.');
      return;
    }
    activateJob(jobId);
    await refreshStatus();
  });

  ui.currentJobId.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      ui.trackBtn.click();
    }
  });

  ui.autoPoll.addEventListener('change', () => {
    state.autoPoll = ui.autoPoll.checked;
    updatePolling();
  });

  ui.pollInterval.addEventListener('change', () => {
    state.pollIntervalMs = Number(ui.pollInterval.value);
    updatePolling();
  });

  ui.refreshStatusBtn.addEventListener('click', async () => {
    await refreshStatus();
  });

  ui.fetchResultsBtn.addEventListener('click', async () => {
    await fetchResults();
  });

  ui.exportJsonBtn.addEventListener('click', () => {
    triggerExport('json');
  });

  ui.exportCsvBtn.addEventListener('click', () => {
    triggerExport('csv');
  });

  ui.placeSearch.addEventListener('input', () => {
    renderPlacesTable();
  });

  ui.placeSort.addEventListener('change', () => {
    renderPlacesTable();
  });

  ui.clearHistoryBtn.addEventListener('click', () => {
    state.history = [];
    persistHistory();
    renderHistory();
  });

  ui.codeTabs.forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.codeTab;
      if (!tab) {
        return;
      }
      showCode(tab);
    });
  });
}

async function fetchHealth() {
  const response = await api('/health');
  if (!response.ok) {
    ui.healthDot.classList.remove('ok');
    ui.healthLabel.textContent = 'API unreachable';
    ui.guardrailNotice.textContent = 'Could not load /health. Ensure server is running.';
    return;
  }

  state.health = response.data;
  ui.healthDot.classList.add('ok');
  ui.healthLabel.textContent = 'API healthy';
  ui.guardrailNotice.textContent = response.data.notice || 'Guardrail notice unavailable.';
}

function applyInputType(type) {
  state.inputType = type;
  ui.typeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.typeButton === type);
  });
  ui.inputKeyword.classList.toggle('hide', type !== 'keyword_location');
  ui.inputMapsUrl.classList.toggle('hide', type !== 'maps_url');
  ui.inputPlaceId.classList.toggle('hide', type !== 'place_id');
}

function applyToggleSections() {
  ui.reviewsPanel.classList.toggle('hide', !ui.reviewsEnabled.checked);
  ui.sensitivePanel.classList.toggle('hide', !ui.includeSensitiveFields.checked);
  ui.policyPanel.classList.toggle('hide', !ui.advancedPolicyEnabled.checked);
}

function applyPreset(name) {
  if (name === 'coffee') {
    applyInputType('keyword_location');
    ui.query.value = 'coffee roasters';
    ui.location.value = 'seattle wa';
    ui.maxPlaces.value = '40';
    ui.maxScrollSteps.value = '18';
    ui.maxViewportPans.value = '1';
    ui.reviewsEnabled.checked = true;
    ui.reviewSort.value = 'newest';
    ui.maxReviews.value = '20';
    ui.includeSensitiveFields.checked = false;
    ui.advancedPolicyEnabled.checked = false;
    applyToggleSections();
    return;
  }

  if (name === 'maps') {
    applyInputType('maps_url');
    ui.mapsUrl.value = 'https://www.google.com/maps/search/?api=1&query=coffee+seattle';
    ui.maxPlaces.value = '60';
    ui.maxScrollSteps.value = '25';
    ui.maxViewportPans.value = '2';
    ui.reviewsEnabled.checked = false;
    ui.includeSensitiveFields.checked = false;
    ui.advancedPolicyEnabled.checked = false;
    applyToggleSections();
    return;
  }

  if (name === 'place') {
    applyInputType('place_id');
    ui.placeId.value = 'ChIJVTPokywQkFQRmtVEaUZlJRA';
    ui.maxPlaces.value = '25';
    ui.maxScrollSteps.value = '20';
    ui.maxViewportPans.value = '0';
    ui.reviewsEnabled.checked = true;
    ui.reviewSort.value = 'most_relevant';
    ui.maxReviews.value = '15';
    ui.includeSensitiveFields.checked = true;
    applyToggleSections();
  }
}

async function submitJob() {
  clearStatusError();
  const payload = buildPayload();
  if (!payload.ok) {
    showCode('submit', { error: 'invalid_form', message: payload.message });
    setStatusError(payload.message);
    return;
  }

  showCode('submit', { request: payload.data, note: 'Submitting...' });
  ui.submitBtn.disabled = true;

  try {
    const response = await api('/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload.data)
    });

    showCode('submit', {
      request: payload.data,
      statusCode: response.status,
      response: response.data
    });

    if (!response.ok) {
      setStatusError(response.data?.message || 'Job submission failed.');
      return;
    }

    const jobId = String(response.data.jobId);
    activateJob(jobId);
    addHistory({
      jobId,
      status: response.data.status,
      createdAt: new Date().toISOString(),
      query: response.data.input?.query || response.data.input?.placeId || 'maps_url',
      source: response.data.input?.inputType || state.inputType
    });
    await refreshStatus();
  } finally {
    ui.submitBtn.disabled = false;
  }
}

function buildPayload() {
  const maxScrollSteps = toOptionalInt(ui.maxScrollSteps.value);
  const maxViewportPans = toOptionalInt(ui.maxViewportPans.value);
  const collection = {
    maxPlaces: toInt(ui.maxPlaces.value),
    maxScrollSteps,
    maxViewportPans,
    stopOnNoGrowth: ui.stopOnNoGrowth.checked
  };

  if (!Number.isFinite(collection.maxPlaces) || collection.maxPlaces < 1 || collection.maxPlaces > 500) {
    return { ok: false, message: 'Collection maxPlaces must be in 1..500.' };
  }

  if (maxScrollSteps !== undefined && (maxScrollSteps < 0 || maxScrollSteps > 100)) {
    return { ok: false, message: 'Collection maxScrollSteps must be in 0..100.' };
  }

  if (maxViewportPans !== undefined && (maxViewportPans < 0 || maxViewportPans > 25)) {
    return { ok: false, message: 'Collection maxViewportPans must be in 0..25.' };
  }

  const payload = {
    inputType: state.inputType,
    collection
  };

  if (state.inputType === 'keyword_location') {
    const query = ui.query.value.trim();
    const location = ui.location.value.trim();
    if (!query || !location) {
      return { ok: false, message: 'Keyword + location jobs require both query and location.' };
    }
    payload.query = query;
    payload.location = location;
  }

  if (state.inputType === 'maps_url') {
    const mapsUrl = ui.mapsUrl.value.trim();
    if (!mapsUrl) {
      return { ok: false, message: 'Maps URL is required for maps_url input type.' };
    }
    payload.mapsUrl = mapsUrl;
  }

  if (state.inputType === 'place_id') {
    const placeId = ui.placeId.value.trim();
    if (!placeId) {
      return { ok: false, message: 'Place ID is required for place_id input type.' };
    }
    payload.placeId = placeId;
  }

  if (ui.reviewsEnabled.checked) {
    const maxReviews = toOptionalInt(ui.maxReviews.value);
    if (maxReviews !== undefined && (maxReviews < 0 || maxReviews > 200)) {
      return { ok: false, message: 'Review maxReviews must be in 0..200.' };
    }

    payload.reviews = {
      enabled: true,
      sort: ui.reviewSort.value,
      maxReviews: maxReviews ?? 0
    };
  }

  if (ui.includeSensitiveFields.checked) {
    payload.includeSensitiveFields = true;
    payload.requestedFields = ui.requestedFields
      .filter((node) => node.checked)
      .map((node) => node.dataset.field)
      .filter(Boolean);
  }

  if (ui.advancedPolicyEnabled.checked) {
    payload.policy = {
      maxRetries: toOptionalInt(ui.maxRetries.value),
      initialBackoffMs: toOptionalInt(ui.initialBackoffMs.value),
      maxBackoffMs: toOptionalInt(ui.maxBackoffMs.value),
      backoffJitterRatio: toOptionalFloat(ui.backoffJitterRatio.value),
      pacingMs: toOptionalInt(ui.pacingMs.value),
      includeSensitiveFields: ui.includeSensitiveFields.checked,
      useProxy: ui.useProxy.checked,
      captchaMode: ui.captchaMode.value
    };

    Object.keys(payload.policy).forEach((key) => {
      if (payload.policy[key] === null || payload.policy[key] === undefined || payload.policy[key] === '') {
        delete payload.policy[key];
      }
    });
  }

  return { ok: true, data: payload };
}

function activateJob(jobId) {
  if (state.currentJobId !== jobId) {
    state.status = null;
    state.resultsModel = null;
    state.selectedPlaceKey = null;
    renderResultsSection();
  }
  state.currentJobId = jobId;
  ui.currentJobId.value = jobId;
  updatePolling();
}

async function refreshStatus() {
  if (!state.currentJobId) {
    setStatusError('No active job id. Submit or track a job first.');
    return;
  }

  clearStatusError();
  const endpoint = '/jobs/' + encodeURIComponent(state.currentJobId);
  const response = await api(endpoint);
  showCode('status', {
    endpoint,
    statusCode: response.status,
    response: response.data
  });

  if (!response.ok) {
    setStatusError(response.data?.message || 'Status lookup failed.');
    return;
  }

  state.status = response.data;
  updateStatusPanel();
  upsertHistoryStatus(state.currentJobId, response.data.status);

  if (response.data.status === 'completed' && !state.resultsModel) {
    await fetchResults(true);
  }
}

function updateStatusPanel() {
  if (!state.status) {
    return;
  }

  const status = String(state.status.status || 'queued');
  ui.statusBadge.textContent = status;
  ui.statusBadge.className = 'status-badge ' + status;
  ui.metricDiscovered.textContent = formatNumber(state.status.progress?.discoveredCount || 0);
  ui.metricProcessed.textContent = formatNumber(state.status.progress?.processedCount || 0);
  ui.metricUnique.textContent = formatNumber(state.status.progress?.uniqueAcceptedCount || 0);
  ui.metricFailed.textContent = formatNumber(state.status.progress?.failedCount || 0);
  ui.metricElapsed.textContent = formatDuration(state.status.metrics?.elapsedMs);
  ui.metricHeartbeat.textContent = formatDuration(state.status.metrics?.heartbeatAgeMs);

  const discovered = Number(state.status.progress?.discoveredCount || 0);
  const processed = Number(state.status.progress?.processedCount || 0);
  const ratio = discovered > 0 ? Math.min(1, processed / discovered) : status === 'completed' ? 1 : 0;
  ui.progressFill.style.width = String(Math.round(ratio * 100)) + '%';
  ui.statusUpdatedAt.textContent = 'Updated ' + new Date().toLocaleTimeString();

  const failureReason = state.status.progress?.failureReason;
  if (failureReason) {
    setStatusError(String(failureReason));
  }
}

async function fetchResults(silent = false) {
  if (!state.currentJobId) {
    if (!silent) {
      setStatusError('No active job id.');
    }
    return;
  }

  const endpoint = '/jobs/' + encodeURIComponent(state.currentJobId) + '/results';
  const response = await api(endpoint);
  showCode('results', {
    endpoint,
    statusCode: response.status,
    response: response.data
  });

  if (!response.ok) {
    state.resultsModel = null;
    state.selectedPlaceKey = null;
    renderResultsSection();
    if (!silent) {
      setStatusError(response.data?.message || 'Results not available yet.');
    }
    return;
  }

  state.resultsModel = response.data;
  if (!state.selectedPlaceKey && response.data.results?.places?.length > 0) {
    state.selectedPlaceKey = response.data.results.places[0].placeKey;
  }
  renderResultsSection();
}

function triggerExport(format) {
  if (!state.currentJobId) {
    setStatusError('No active job id to export.');
    return;
  }

  const href = '/jobs/' + encodeURIComponent(state.currentJobId) + '/exports?format=' + format;
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function renderResultsSection() {
  const places = state.resultsModel?.results?.places || [];
  ui.resultSummary.textContent = places.length
    ? places.length + ' places loaded for job ' + (state.resultsModel?.jobId || state.currentJobId)
    : 'No completed result set loaded yet.';
  renderPlacesTable();
  renderSelectedPlace();
}

function renderPlacesTable() {
  const places = (state.resultsModel?.results?.places || []).slice();
  const search = ui.placeSearch.value.trim().toLowerCase();
  const sort = ui.placeSort.value;

  let filtered = places;
  if (search) {
    filtered = filtered.filter((place) => {
      const haystack = [
        place.name,
        place.address,
        place.category,
        place.placeId,
        place.mapsUrl,
        place.phone,
        place.email
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  if (sort === 'rating_desc') {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sort === 'reviews_desc') {
    filtered.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
  } else if (sort === 'name_asc') {
    filtered.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  } else if (sort === 'newest') {
    filtered.sort((a, b) => Date.parse(b.discoveredAt || '') - Date.parse(a.discoveredAt || ''));
  }

  state.filteredPlaces = filtered;

  if (!filtered.some((place) => place.placeKey === state.selectedPlaceKey)) {
    state.selectedPlaceKey = filtered[0]?.placeKey || null;
  }

  if (filtered.length === 0) {
    ui.placesBody.innerHTML = '<tr><td colspan="6" class="muted">No places match the current filter.</td></tr>';
    renderSelectedPlace();
    return;
  }

  const rows = filtered
    .map((place) => {
      const active = place.placeKey === state.selectedPlaceKey ? 'active' : '';
      return '<tr data-place-key="' + escapeHtml(place.placeKey) + '" class="' + active + '">' +
        '<td>' + escapeHtml(place.name || 'Unnamed') + '</td>' +
        '<td>' + escapeHtml(place.category || 'n/a') + '</td>' +
        '<td>' + escapeHtml(formatNumber(place.rating)) + '</td>' +
        '<td>' + escapeHtml(formatNumber(place.reviewsCount)) + '</td>' +
        '<td>' + escapeHtml(place.address || 'n/a') + '</td>' +
        '<td>' + escapeHtml(String((place.reviews || []).length)) + '</td>' +
        '</tr>';
    })
    .join('');

  ui.placesBody.innerHTML = rows;
  Array.from(ui.placesBody.querySelectorAll('tr[data-place-key]')).forEach((row) => {
    row.addEventListener('click', () => {
      const key = row.getAttribute('data-place-key');
      state.selectedPlaceKey = key;
      renderPlacesTable();
      renderSelectedPlace();
    });
  });

  renderSelectedPlace();
}

function renderSelectedPlace() {
  const place = state.filteredPlaces.find((entry) => entry.placeKey === state.selectedPlaceKey) || null;
  if (!place) {
    ui.placeDetails.innerHTML = '<p class="muted small">Select a place to inspect details and reviews.</p>';
    return;
  }

  const reviews = place.reviews || [];
  const reviewMarkup = reviews.length
    ? reviews
        .map((review) => {
          return '<div class="review-item">' +
            '<div class="review-head"><span>' + escapeHtml(review.authorName || 'Anonymous') + '</span><span>Rating ' + escapeHtml(formatNumber(review.rating)) + '</span></div>' +
            '<p class="review-text">' + escapeHtml(review.text || 'No text') + '</p>' +
            '<div class="review-head"><span>' + escapeHtml(review.publishedAt || 'n/a') + '</span><span>#' + escapeHtml(String(review.position || '')) + '</span></div>' +
            '</div>';
        })
        .join('')
    : '<p class="muted small">No reviews captured for this place.</p>';

  ui.placeDetails.innerHTML = '' +
    '<h4>' + escapeHtml(place.name || 'Unnamed place') + '</h4>' +
    '<dl>' +
    '<dt>Place key</dt><dd>' + escapeHtml(place.placeKey || 'n/a') + '</dd>' +
    '<dt>Place ID</dt><dd>' + escapeHtml(place.placeId || 'n/a') + '</dd>' +
    '<dt>Address</dt><dd>' + escapeHtml(place.address || 'n/a') + '</dd>' +
    '<dt>Coordinates</dt><dd>' + escapeHtml(formatCoordinates(place.lat, place.lng)) + '</dd>' +
    '<dt>Website</dt><dd>' + formatLink(place.website) + '</dd>' +
    '<dt>Email</dt><dd>' + escapeHtml(place.email || 'n/a') + '</dd>' +
    '<dt>Phone</dt><dd>' + escapeHtml(place.phone || 'n/a') + '</dd>' +
    '<dt>Maps URL</dt><dd>' + formatLink(place.mapsUrl) + '</dd>' +
    '<dt>Discovered</dt><dd>' + escapeHtml(formatDate(place.discoveredAt)) + '</dd>' +
    '</dl>' +
    '<div class="review-list">' + reviewMarkup + '</div>';
}

function updatePolling() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }

  if (!state.autoPoll || !state.currentJobId) {
    return;
  }

  state.pollTimer = setInterval(() => {
    refreshStatus().catch((error) => {
      console.error(error);
    });
  }, state.pollIntervalMs);
}

function addHistory(entry) {
  const existing = state.history.find((row) => row.jobId === entry.jobId);
  if (existing) {
    existing.status = entry.status || existing.status;
    existing.lastSeenAt = new Date().toISOString();
  } else {
    state.history.unshift({
      jobId: entry.jobId,
      status: entry.status || 'queued',
      createdAt: entry.createdAt || new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      source: entry.source || 'unknown',
      query: entry.query || ''
    });
  }

  state.history = state.history.slice(0, 40);
  persistHistory();
  renderHistory();
}

function upsertHistoryStatus(jobId, status) {
  const existing = state.history.find((row) => row.jobId === jobId);
  if (!existing) {
    addHistory({ jobId, status });
    return;
  }

  existing.status = status;
  existing.lastSeenAt = new Date().toISOString();
  persistHistory();
  renderHistory();
}

function renderHistory() {
  if (state.history.length === 0) {
    ui.historyList.innerHTML = '<p class="muted small">No tracked jobs yet.</p>';
    return;
  }

  ui.historyList.innerHTML = state.history
    .map((entry) => {
      return '<div class="history-item">' +
        '<div class="history-main">' +
        '<div class="history-id">' + escapeHtml(entry.jobId) + '</div>' +
        '<div class="history-meta">' + escapeHtml(entry.source || 'n/a') + ' • ' + escapeHtml(entry.query || 'n/a') + '</div>' +
        '<div class="history-meta">' + escapeHtml(formatDate(entry.lastSeenAt)) + '</div>' +
        '</div>' +
        '<div class="toolbar">' +
        '<span class="status-badge ' + escapeHtml(entry.status || 'queued') + '">' + escapeHtml(entry.status || 'queued') + '</span>' +
        '<button class="ghost" data-history-track="' + escapeHtml(entry.jobId) + '">Track</button>' +
        '<button class="ghost" data-history-remove="' + escapeHtml(entry.jobId) + '">Remove</button>' +
        '</div>' +
        '</div>';
    })
    .join('');

  Array.from(ui.historyList.querySelectorAll('[data-history-track]')).forEach((button) => {
    button.addEventListener('click', async () => {
      const jobId = button.getAttribute('data-history-track');
      if (!jobId) {
        return;
      }
      activateJob(jobId);
      await refreshStatus();
    });
  });

  Array.from(ui.historyList.querySelectorAll('[data-history-remove]')).forEach((button) => {
    button.addEventListener('click', () => {
      const jobId = button.getAttribute('data-history-remove');
      if (!jobId) {
        return;
      }
      state.history = state.history.filter((entry) => entry.jobId !== jobId);
      persistHistory();
      renderHistory();
    });
  });
}

function hydrateHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    state.history = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.history)) {
      state.history = [];
    }
  } catch {
    state.history = [];
  }
}

function persistHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
  } catch {
    // storage failures are non-fatal
  }
}

function setStatusError(message) {
  ui.statusError.textContent = message;
  ui.statusError.classList.remove('hide');
  ui.statusError.classList.add('error');
}

function clearStatusError() {
  ui.statusError.textContent = '';
  ui.statusError.classList.add('hide');
}

function showCode(tab, payload) {
  if (payload !== undefined) {
    state['code_' + tab] = payload;
  }

  state.codeTab = tab;
  ui.codeTabs.forEach((button) => {
    button.classList.toggle('active', button.dataset.codeTab === tab);
  });

  const value = state['code_' + tab];
  ui.codeBlock.textContent = value ? JSON.stringify(value, null, 2) : 'No data captured yet.';
}

async function api(path, options) {
  try {
    const response = await fetch(path, options);
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: {
        error: 'network_error',
        message: String(error?.message || error)
      }
    };
  }
}

function toInt(value) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : NaN;
}

function toOptionalInt(value) {
  const trimmed = String(value).trim();
  if (!trimmed) {
    return undefined;
  }
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : undefined;
}

function toOptionalFloat(value) {
  const trimmed = String(value).trim();
  if (!trimmed) {
    return undefined;
  }
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 'n/a';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value);
  }
  if (Math.abs(numeric) < 10 && numeric % 1 !== 0) {
    return numeric.toFixed(1);
  }
  return new Intl.NumberFormat().format(numeric);
}

function formatDuration(ms) {
  if (ms === null || ms === undefined) {
    return 'n/a';
  }

  const totalSeconds = Math.max(0, Math.floor(Number(ms) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + 'm ' + seconds + 's';
}

function formatCoordinates(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return 'n/a';
  }
  return String(lat) + ', ' + String(lng);
}

function formatDate(value) {
  if (!value) {
    return 'n/a';
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return String(value);
  }
  return new Date(timestamp).toLocaleString();
}

function formatLink(url) {
  if (!url) {
    return 'n/a';
  }

  if (!isHttpUrl(url)) {
    return escapeHtml(url);
  }

  const safe = escapeHtml(url);
  return '<a href="' + safe + '" target="_blank" rel="noopener noreferrer">' + safe + '</a>';
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
`;

export function renderConsolePage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>gmaps-api Control Center</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>${STYLES}</style>
  </head>
  <body>
    <main>
      <header>
        <div class="header-inner">
          <div class="brand">
            <div class="brand-mark" aria-hidden="true"></div>
            <div>
              <h1>gmaps-api Control Center</h1>
              <p class="subtitle">Submit jobs, track worker progress, inspect places + reviews, and export JSON/CSV from one interface.</p>
            </div>
          </div>
          <div class="health-pill">
            <span id="healthDot" class="health-dot"></span>
            <span id="healthLabel">Checking health...</span>
          </div>
        </div>
      </header>

      <section class="layout">
        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Job Composer</h2>
            <p class="panel-note">Full POST /jobs coverage including all input variants, collection controls, reviews, sensitive-field policy, and runtime overrides.</p>
          </div>
          <div class="panel-body">
            <form id="jobForm" class="form-grid">
              <div class="callout" id="guardrailNotice">Loading guardrail notice...</div>

              <div class="type-switch" role="tablist" aria-label="Input type">
                <button type="button" data-type-button="keyword_location" class="active">keyword + location</button>
                <button type="button" data-type-button="maps_url">maps_url</button>
                <button type="button" data-type-button="place_id">place_id</button>
              </div>

              <div id="inputKeyword" class="fieldset">
                <h3>Keyword + Location Target</h3>
                <label>
                  Query
                  <input id="query" type="text" value="coffee" autocomplete="off" />
                </label>
                <label>
                  Location
                  <input id="location" type="text" value="seattle wa" autocomplete="off" />
                </label>
              </div>

              <div id="inputMapsUrl" class="fieldset hide">
                <h3>Maps URL Target</h3>
                <label>
                  Canonical Google Maps search URL
                  <textarea id="mapsUrl" placeholder="https://www.google.com/maps/search/?api=1&query=..." autocomplete="off"></textarea>
                </label>
              </div>

              <div id="inputPlaceId" class="fieldset hide">
                <h3>Place ID Target</h3>
                <label>
                  Place ID
                  <input id="placeId" type="text" placeholder="ChIJVTPokywQkFQRmtVEaUZlJRA" autocomplete="off" />
                </label>
              </div>

              <div class="fieldset">
                <h3>Collection Controls</h3>
                <div class="inline-grid-3">
                  <label>
                    maxPlaces (1..500)
                    <input id="maxPlaces" type="number" min="1" max="500" step="1" value="40" />
                  </label>
                  <label>
                    maxScrollSteps (0..100)
                    <input id="maxScrollSteps" type="number" min="0" max="100" step="1" value="20" />
                  </label>
                  <label>
                    maxViewportPans (0..25)
                    <input id="maxViewportPans" type="number" min="0" max="25" step="1" value="0" />
                  </label>
                </div>
                <label class="switch" style="margin-top: 10px;">
                  <input id="stopOnNoGrowth" type="checkbox" checked />
                  Stop early when no new places appear (faster, may return fewer than target)
                </label>
              </div>

              <div class="fieldset">
                <h3>Reviews</h3>
                <label class="switch"><input id="reviewsEnabled" type="checkbox" /> Enable review extraction</label>
                <div id="reviewsPanel" class="inline-grid hide">
                  <label>
                    Review sort
                    <select id="reviewSort">
                      <option value="newest">newest</option>
                      <option value="most_relevant">most_relevant</option>
                      <option value="highest_rating">highest_rating</option>
                      <option value="lowest_rating">lowest_rating</option>
                    </select>
                  </label>
                  <label>
                    maxReviews (0..200)
                    <input id="maxReviews" type="number" min="0" max="200" step="1" value="10" />
                  </label>
                </div>
              </div>

              <div class="fieldset">
                <h3>Sensitive Field Policy</h3>
                <p>Matches server guardrail behavior from resolveSensitiveFieldPolicy.</p>
                <label class="switch"><input id="includeSensitiveFields" type="checkbox" /> includeSensitiveFields=true</label>
                <div id="sensitivePanel" class="checkbox-grid hide">
                  <label class="checkbox-item"><input data-field="reviewAuthor" type="checkbox" checked />reviewAuthor</label>
                  <label class="checkbox-item"><input data-field="reviewAuthorProfile" type="checkbox" />reviewAuthorProfile</label>
                  <label class="checkbox-item"><input data-field="reviewAuthorAvatar" type="checkbox" />reviewAuthorAvatar</label>
                  <label class="checkbox-item"><input data-field="website" type="checkbox" />website</label>
                  <label class="checkbox-item"><input data-field="phone" type="checkbox" />phone</label>
                  <label class="checkbox-item"><input data-field="email" type="checkbox" />email</label>
                </div>
              </div>

              <div class="fieldset">
                <h3>Advanced Runtime Policy</h3>
                <label class="switch"><input id="advancedPolicyEnabled" type="checkbox" /> Override defaults (optional)</label>
                <div id="policyPanel" class="form-grid hide">
                  <div class="inline-grid-3">
                    <label>maxRetries<input id="maxRetries" type="number" min="0" max="6" step="1" placeholder="3" /></label>
                    <label>initialBackoffMs<input id="initialBackoffMs" type="number" min="100" max="60000" step="100" placeholder="800" /></label>
                    <label>maxBackoffMs<input id="maxBackoffMs" type="number" min="1000" max="120000" step="100" placeholder="20000" /></label>
                  </div>
                  <div class="inline-grid-3">
                    <label>backoffJitterRatio<input id="backoffJitterRatio" type="number" min="0" max="0.5" step="0.01" placeholder="0.2" /></label>
                    <label>pacingMs<input id="pacingMs" type="number" min="200" max="30000" step="100" placeholder="1200" /></label>
                    <label>captchaMode<select id="captchaMode"><option value="off">off</option><option value="optional">optional</option></select></label>
                  </div>
                  <label class="switch"><input id="useProxy" type="checkbox" /> useProxy=true</label>
                </div>
              </div>

              <div class="cta-row">
                <button id="submitBtn" type="submit">Submit Job</button>
                <button type="button" class="ghost" id="fetchResultsBtn">Fetch Results</button>
              </div>

              <div class="toolbar small muted">
                <span>Presets:</span>
                <button type="button" class="ghost" data-preset="coffee">Coffee Sweep</button>
                <button type="button" class="ghost" data-preset="maps">Maps URL</button>
                <button type="button" class="ghost" data-preset="place">Single Place</button>
              </div>
            </form>
          </div>
        </article>

        <section class="right-stack">
          <article class="panel">
            <div class="panel-head">
              <h2 class="panel-title">Job Monitor</h2>
              <p class="panel-note">Live lifecycle tracking from GET /jobs/:id with auto polling and exports.</p>
            </div>
            <div class="panel-body">
              <div class="toolbar">
                <input id="currentJobId" class="job-id-input" type="text" placeholder="Enter job id" autocomplete="off" />
                <button type="button" id="trackBtn" class="ghost">Track</button>
                <button type="button" id="refreshStatusBtn" class="ghost">Refresh</button>
                <button type="button" id="exportJsonBtn" class="warn">Export JSON</button>
                <button type="button" id="exportCsvBtn" class="warn">Export CSV</button>
              </div>

              <div class="toolbar small muted">
                <label class="switch"><input id="autoPoll" type="checkbox" checked /> Auto poll</label>
                <label>
                  Interval
                  <select id="pollInterval">
                    <option value="1500">1.5s</option>
                    <option value="3000" selected>3s</option>
                    <option value="5000">5s</option>
                    <option value="10000">10s</option>
                  </select>
                </label>
                <span id="statusUpdatedAt">Not updated yet.</span>
              </div>

              <div class="toolbar" style="margin-top: 8px;">
                <span id="statusBadge" class="status-badge queued">queued</span>
              </div>

              <div class="metric-grid">
                <div class="metric"><div class="metric-label">Discovered</div><div class="metric-value" id="metricDiscovered">0</div></div>
                <div class="metric"><div class="metric-label">Processed</div><div class="metric-value" id="metricProcessed">0</div></div>
                <div class="metric"><div class="metric-label">Unique accepted</div><div class="metric-value" id="metricUnique">0</div></div>
                <div class="metric"><div class="metric-label">Failed</div><div class="metric-value" id="metricFailed">0</div></div>
                <div class="metric"><div class="metric-label">Elapsed</div><div class="metric-value" id="metricElapsed">n/a</div></div>
                <div class="metric"><div class="metric-label">Heartbeat age</div><div class="metric-value" id="metricHeartbeat">n/a</div></div>
              </div>

              <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>

              <div id="statusError" class="callout hide" style="margin-top: 12px;"></div>

              <div class="fieldset" style="margin-top: 14px;">
                <h3>Tracked Jobs (local history)</h3>
                <div class="toolbar small">
                  <button id="clearHistoryBtn" type="button" class="ghost danger">Clear history</button>
                </div>
                <div class="history-list" id="historyList"></div>
              </div>
            </div>
          </article>

          <article class="panel">
            <div class="panel-head">
              <h2 class="panel-title">Results Explorer</h2>
              <p class="panel-note">Structured payload browser for GET /jobs/:id/results, including place details and review drilldown.</p>
            </div>
            <div class="panel-body">
              <p id="resultSummary" class="small muted">No completed result set loaded yet.</p>
              <div class="result-toolbar">
                <input id="placeSearch" type="search" placeholder="Filter by name, address, placeId, email, phone..." />
                <select id="placeSort">
                  <option value="newest">Sort: newest discovered</option>
                  <option value="rating_desc">Sort: highest rating</option>
                  <option value="reviews_desc">Sort: most reviews</option>
                  <option value="name_asc">Sort: name (A-Z)</option>
                </select>
              </div>
              <div class="result-grid">
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Rating</th>
                        <th>Reviews</th>
                        <th>Address</th>
                        <th>Captured reviews</th>
                      </tr>
                    </thead>
                    <tbody id="placesBody">
                      <tr><td colspan="6" class="muted">No results loaded.</td></tr>
                    </tbody>
                  </table>
                </div>
                <aside class="side-card" id="placeDetails">
                  <p class="muted small">Select a place to inspect details and reviews.</p>
                </aside>
              </div>
            </div>
          </article>

          <article class="panel">
            <div class="panel-head">
              <h2 class="panel-title">API Trace</h2>
              <p class="panel-note">Debug payloads from submission, status polling, and results retrieval.</p>
            </div>
            <div class="panel-body">
              <div class="code-box">
                <div class="code-tabs">
                  <button data-code-tab="submit" class="active">Submit</button>
                  <button data-code-tab="status">Status</button>
                  <button data-code-tab="results">Results</button>
                </div>
                <pre id="codeBlock">Loading...</pre>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>

    <script type="module">${SCRIPT}</script>
  </body>
</html>`;
}
