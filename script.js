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
const startOverBtn = document.getElementById('startOverBtn');
const previewText = document.getElementById('previewText');
const vibeChips = document.querySelectorAll('.vibe-chip');
const progressSteps = document.querySelectorAll('.progress-step');

dateInput.min = new Date().toISOString().split('T')[0];
let noAttempts = 0;
let teaseInterval;

function setProgress(step) { progressSteps.forEach((item) => item.classList.toggle('active', Number(item.dataset.step) <= step)); }
function formatDate(value) { return value ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'a day that feels right'; }
function updatePreview() { const time = timeInput.value ? ` at ${timeInput.value}` : ''; const vibe = noteInput.value.trim(); previewText.textContent = vibe ? `${formatDate(dateInput.value)}${time} — ${vibe}. Sounds perfect.` : `${formatDate(dateInput.value)}${time} is waiting for us.`; }
function moveNoButton() { const x = Math.random() * Math.max(actionPanel.clientWidth - noBtn.offsetWidth, 0); const y = Math.random() * Math.max(actionPanel.clientHeight - noBtn.offsetHeight, 0); Object.assign(noBtn.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' }); }
function resetNoButtonPosition() { Object.assign(noBtn.style, { left: 'auto', top: 'auto', right: '0', bottom: '0' }); }
function launchConfetti() { const colors = ['#ff5db1', '#ffc857', '#7ae3ff', '#9af7a6', '#d2a8ff', '#ff9f7e']; for (let i = 0; i < 34; i += 1) { const piece = document.createElement('span'); piece.className = 'confetti-piece'; piece.style.left = `${Math.random() * 100}%`; piece.style.background = colors[Math.floor(Math.random() * colors.length)]; piece.style.setProperty('--x', `${(Math.random() - 0.5) * 260}px`); piece.style.animationDelay = `${Math.random() * 0.4}s`; confettiLayer.appendChild(piece); setTimeout(() => piece.remove(), 3500); } }
function showToast(message) { const toast = document.getElementById('toast'); toast.textContent = message; toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 2800); }

noBtn.addEventListener('click', () => { noAttempts += 1; if (noAttempts === 1) { noBtn.textContent = 'Are you sure? 🥺'; moveNoButton(); teaseInterval = window.setInterval(moveNoButton, 850); return; } noBtn.textContent = 'Still no? 😄'; moveNoButton(); });
yesBtn.addEventListener('click', () => { window.clearInterval(teaseInterval); questionCard.classList.add('hidden'); dateCard.classList.remove('hidden'); setProgress(2); launchConfetti(); });
[dateInput, timeInput, noteInput].forEach((input) => input.addEventListener('input', updatePreview));
vibeChips.forEach((chip) => chip.addEventListener('click', () => { noteInput.value = chip.dataset.vibe; vibeChips.forEach((item) => item.classList.toggle('selected', item === chip)); updatePreview(); }));
confirmBtn.addEventListener('click', async () => { const chosenDate = dateInput.value || 'Surprise me'; const chosenTime = timeInput.value || 'Any time that feels right'; const chosenNote = noteInput.value.trim() || 'A dreamy little adventure'; selectedDate.textContent = chosenDate; selectedTime.textContent = chosenTime; selectedNote.textContent = chosenNote; confirmBtn.disabled = true; confirmBtn.textContent = 'Saving our plan…'; try { const response = await fetch('/api/submit-date', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'ABBY', answer: 'Yes', date: chosenDate, time: chosenTime, vibe: chosenNote }) }); const result = await response.json(); if (!result.success) showToast('There was a tiny issue saving your response.'); } catch { showToast('Saved locally for now — the app is waiting for a live server.'); } dateCard.classList.add('hidden'); successCard.classList.remove('hidden'); setProgress(3); launchConfetti(); confirmBtn.disabled = false; confirmBtn.innerHTML = 'Lock in our plan <span aria-hidden="true">💖</span>'; });
startOverBtn.addEventListener('click', () => { successCard.classList.add('hidden'); questionCard.classList.remove('hidden'); noAttempts = 0; window.clearInterval(teaseInterval); noBtn.textContent = 'Not yet 😅'; resetNoButtonPosition(); setProgress(1); });
