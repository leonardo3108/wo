const APP_VERSION = '1.0.0';

const sessionFiles = {};
const openTreinos = {};
let currentTreino = null;

function showToast(msg, duration = 2200) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('hide');
    el.addEventListener('transitionend', () => el.remove());
  }, duration);
}
