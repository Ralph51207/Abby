const questionCard = document.getElementById('questionCard');
const dateCard = document.getElementById('dateCard');
const successCard = document.getElementById('successCard');
const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');
const dateInput = document.getElementById('dateInput');
const timeInput = document.getElementById('timeInput');
const noteInput = document.getElementById('noteInput');
const confirmBtn = document.getElementById('confirmBtn');
const actionPanel = document.getElementById('actionPanel');

const selectedDate = document.getElementById('selectedDate');
const selectedTime = document.getElementById('selectedTime');
const selectedNote = document.getElementById('selectedNote');
const confettiLayer = document.querySelector('.confetti-layer');

const today = new Date().toISOString().split('T')[0];
dateInput.min = today;

function moveNoButton() {
  const panelWidth = actionPanel.clientWidth;
  const panelHeight = actionPanel.clientHeight;
  const maxX = Math.max(panelWidth - noBtn.offsetWidth, 0);
  const maxY = Math.max(panelHeight - noBtn.offsetHeight, 0);

  const x = Math.random() * maxX;
  const y = Math.random() * maxY;

  noBtn.style.left = `${x}px`;
  noBtn.style.top = `${y}px`;
  noBtn.style.right = 'auto';
  noBtn.style.bottom = 'auto';
}

function resetNoButtonPosition() {
  noBtn.style.left = 'auto';
  noBtn.style.top = 'auto';
  noBtn.style.right = '0';
  noBtn.style.bottom = '0';
}

let noAttempts = 0;

function startNoButtonTease() {
  const intervalId = window.setInterval(() => {
    if (!noBtn.disabled) {
      moveNoButton();
    }
  }, 700);

  noBtn.dataset.teaseInterval = String(intervalId);
}

noBtn.addEventListener('click', () => {
  if (noBtn.disabled) return;

  noAttempts += 1;

  if (noAttempts === 1) {
    moveNoButton();
    startNoButtonTease();
    return;
  }

  noBtn.textContent = 'Still no 😄';
  moveNoButton();
});

resetNoButtonPosition();

yesBtn.addEventListener('click', () => {
  questionCard.classList.add('hidden');
  dateCard.classList.remove('hidden');
  launchConfetti();
});

async function submitDateResponse(payload) {
  try {
    const response = await fetch('/api/submit-date', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let result;
    try {
      result = await response.json();
    } catch (_error) {
      result = { success: response.ok };
    }

    if (!result.success) {
      showToast('There was a tiny issue sending your response.');
      return;
    }

    if (result.emailSent) {
      showToast('Sent to email successfully.');
    } else {
      showToast(result.message || 'Saved locally only - email is not configured.');
    }
  } catch (_error) {
    showToast('Saved locally for now - the app is waiting for a live server.');
  }
}

function confirmDatePlan() {
  const chosenDate = dateInput.value || 'Surprise me';
  const chosenTime = timeInput.value || 'Any time that feels right';
  const chosenNote = noteInput.value.trim() || 'A dreamy little adventure';

  selectedDate.textContent = chosenDate;
  selectedTime.textContent = chosenTime;
  selectedNote.textContent = chosenNote;

  dateCard.classList.add('hidden');
  successCard.classList.remove('hidden');
  launchConfetti();

  const payload = {
    name: 'ABBY',
    answer: 'Yes',
    date: chosenDate,
    time: chosenTime,
    vibe: chosenNote,
  };

  submitDateResponse(payload);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

confirmBtn.addEventListener('click', () => {
  confirmDatePlan();
});

function launchConfetti() {
  const colors = ['#ff5db1', '#ffc857', '#7ae3ff', '#9af7a6', '#d2a8ff', '#ff9f7e'];

  for (let i = 0; i < 30; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty('--x', `${(Math.random() - 0.5) * 260}px`);
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    confettiLayer.appendChild(piece);

    setTimeout(() => piece.remove(), 3500);
  }
}
