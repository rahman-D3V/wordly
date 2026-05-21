/* =============================================
   WORDLY — script.js
   Word Counter & Writing Assistant
   ============================================= */

// ── DOM refs ──────────────────────────────────
const editor          = document.getElementById('editor');
const themeToggle     = document.getElementById('themeToggle');
const typingIndicator = document.getElementById('typingIndicator');
const toast           = document.getElementById('toast');
const copyBtn         = document.getElementById('copyBtn');
const clearBtn        = document.getElementById('clearBtn');
const saveBadge       = document.getElementById('saveBadge');
const saveLabel       = document.getElementById('saveLabel');
const editorHint      = document.getElementById('editorHint');
const densityBar      = document.getElementById('densityBar');
const densityLabel    = document.getElementById('densityLabel');

// Stat value elements
const els = {
  words:      document.getElementById('wordCount'),
  chars:      document.getElementById('charCount'),
  charsNoSp:  document.getElementById('charNoSpaceCount'),
  readTime:   document.getElementById('readTime'),
  speakTime:  document.getElementById('speakTime'),
  sentences:  document.getElementById('sentenceCount'),
  paragraphs: document.getElementById('paragraphCount'),
};

// ── Timers ────────────────────────────────────
let typingTimer = null;
let toastTimer  = null;
let saveTimer   = null;

// ── Theme ─────────────────────────────────────

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('wordly-theme', theme);
  // Sync browser chrome color
  const meta = document.getElementById('metaThemeColor');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#18181b' : '#18181b');
  // Update aria-label
  themeToggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  );
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  const saved = localStorage.getItem('wordly-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(saved || (prefersDark ? 'dark' : 'light'));
}

// ── Stats ─────────────────────────────────────

function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function countSentences(text) {
  const matches = text.match(/[^.!?]*[.!?]+/g);
  return matches ? matches.length : (text.trim() ? 1 : 0);
}

function countParagraphs(text) {
  return text.trim() === ''
    ? 0
    : text.trim().split(/\n\s*\n+/).filter(p => p.trim()).length;
}

function formatReadTime(words) {
  const mins = words / 200;
  if (words === 0) return '—';
  if (mins < 1)    return '< 1 min';
  return `${Math.ceil(mins)} min`;
}

function formatSpeakTime(words) {
  const mins = words / 130;
  if (words === 0) return '—';
  if (mins < 1)    return '< 1 min';
  return `${Math.ceil(mins)} min`;
}

function flashStat(el) {
  el.classList.remove('flash');
  void el.offsetWidth; // force reflow
  el.classList.add('flash');
}

function updateStats() {
  const text = editor.value;

  const words      = countWords(text);
  const chars      = text.length;
  const charsNoSp  = text.replace(/\s/g, '').length;
  const sentences  = countSentences(text);
  const paragraphs = countParagraphs(text);
  const readTime   = formatReadTime(words);

  const updates = [
    [els.words,      words],
    [els.chars,      chars],
    [els.charsNoSp,  charsNoSp],
    [els.sentences,  sentences],
    [els.paragraphs, paragraphs],
  ];

  updates.forEach(([el, val]) => {
    if (el.textContent !== String(val)) {
      el.textContent = val;
      flashStat(el);
    }
  });

  if (els.readTime.textContent !== readTime) {
    els.readTime.textContent = readTime;
  }

  const speakTime = formatSpeakTime(words);
  if (els.speakTime.textContent !== speakTime) {
    els.speakTime.textContent = speakTime;
  }

  // Update density bar (capped at 2000 words for the bar)
  const pct = Math.min((words / 2000) * 100, 100);
  densityBar.style.width = pct + '%';

  if (words === 0) {
    densityLabel.textContent = 'No content yet';
  } else if (words < 100) {
    densityLabel.textContent = `${words} words — short form`;
  } else if (words < 500) {
    densityLabel.textContent = `${words} words — medium length`;
  } else if (words < 1000) {
    densityLabel.textContent = `${words} words — long form`;
  } else {
    densityLabel.textContent = `${words} words — in-depth piece`;
  }

  // Update editor hint
  if (editorHint) {
    editorHint.textContent = words > 0
      ? `${words} word${words !== 1 ? 's' : ''} · ${chars} characters`
      : 'Start typing to see your stats';
  }
}

// ── Typing indicator ──────────────────────────

function handleTypingIndicator() {
  typingIndicator.classList.add('active');
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    typingIndicator.classList.remove('active');
  }, 900);
}

// ── Auto-save to localStorage ─────────────────

function setSaveBadge(state) {
  saveBadge.className = 'status-badge ' + state;
  const labels = { saving: 'Saving…', saved: 'Saved', '': 'Ready' };
  saveLabel.textContent = labels[state] ?? 'Ready';
}

function autoSave() {
  setSaveBadge('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem('wordly-draft', editor.value);
    setSaveBadge('saved');
    // Revert to "Ready" after 2s
    setTimeout(() => setSaveBadge(''), 2000);
  }, 800);
}

function loadDraft() {
  const draft = localStorage.getItem('wordly-draft');
  if (draft) {
    editor.value = draft;
    updateStats();
    setSaveBadge('saved');
    setTimeout(() => setSaveBadge(''), 1500);
  }
}

// ── Toast ─────────────────────────────────────

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ── Copy & Clear ──────────────────────────────

function copyText() {
  if (!editor.value.trim()) {
    showToast('Nothing to copy');
    return;
  }
  navigator.clipboard.writeText(editor.value)
    .then(() => showToast('Copied to clipboard ✓'))
    .catch(() => {
      editor.select();
      document.execCommand('copy');
      showToast('Copied to clipboard ✓');
    });
}

function clearText() {
  if (!editor.value) return;
  editor.value = '';
  localStorage.removeItem('wordly-draft');
  updateStats();
  setSaveBadge('');
  editor.focus();
}

// ── Event listeners ───────────────────────────

editor.addEventListener('input', () => {
  updateStats();
  handleTypingIndicator();
  autoSave();
});

themeToggle.addEventListener('click', toggleTheme);
copyBtn.addEventListener('click', copyText);
clearBtn.addEventListener('click', clearText);

// Keyboard shortcut: Ctrl/Cmd + Shift + C → copy
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    copyText();
  }
});

// ── Init ──────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();
initTheme();
loadDraft();
if (!editor.value) updateStats();
editor.focus();
