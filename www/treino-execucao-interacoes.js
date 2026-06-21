function _moveSection(container, dragged, target) {
  const siblings = [...container.children].filter(c =>
    c.classList.contains('section') || c.classList.contains('exercises-section')
  );
  if (siblings.indexOf(dragged) < siblings.indexOf(target)) target.after(dragged);
  else target.before(dragged);
}

// Divide um exercises-section em dois, inserindo sectionEl entre eles.
// insertBefore=true → inserir ANTES de targetCard; false → DEPOIS.
function _splitAndInsert(exercisesSection, targetCard, insertBefore, sectionEl) {
  const cards = [...exercisesSection.querySelectorAll('.exercise-card')];
  const splitIdx = insertBefore ? cards.indexOf(targetCard) : cards.indexOf(targetCard) + 1;

  if (splitIdx <= 0) { exercisesSection.before(sectionEl); return; }
  if (splitIdx >= cards.length) { exercisesSection.after(sectionEl); return; }

  // Cria novo exercises-section com as cards a partir de splitIdx
  const newSec = document.createElement('div');
  newSec.className = 'exercises-section';
  cards.slice(splitIdx).forEach(c => newSec.appendChild(c));

  exercisesSection.after(newSec);
  exercisesSection.after(sectionEl);
  initDragAndDrop(newSec);
}

function initSectionDragAndDrop(container) {
  let dragged = null;

  function _clearHighlights() {
    container.querySelectorAll('.section, .exercises-section').forEach(s => s.classList.remove('drag-over'));
    container.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('drag-over-before', 'drag-over-after'));
  }

  function _highlightCard(card, clientY) {
    const rect = card.getBoundingClientRect();
    const before = clientY < rect.top + rect.height / 2;
    card.classList.add(before ? 'drag-over-before' : 'drag-over-after');
    return before;
  }

  // ── Desktop: HTML5 drag, só a partir do handle ─────────────────
  container.addEventListener('dragstart', e => {
    if (!e.target.closest('.section-drag-handle')) { e.preventDefault(); return; }
    dragged = e.target.closest('.section');
    if (!dragged) return;
    setTimeout(() => dragged.classList.add('dragging'), 0);
  });

  container.addEventListener('dragend', () => {
    if (dragged) { dragged.classList.remove('dragging'); dragged = null; }
    _clearHighlights();
  });

  container.addEventListener('dragover', e => {
    if (!dragged) return;
    _clearHighlights();

    // Card individual tem prioridade (permite split)
    const card = e.target.closest('.exercise-card');
    if (card && container.contains(card)) {
      e.preventDefault();
      _highlightCard(card, e.clientY);
      return;
    }

    const target = e.target.closest('.section, .exercises-section');
    if (!target || target === dragged || !container.contains(target)) return;
    e.preventDefault();
    target.classList.add('drag-over');
  });

  container.addEventListener('drop', e => {
    if (!dragged) return;

    const card = e.target.closest('.exercise-card');
    if (card && container.contains(card)) {
      e.preventDefault();
      const insertBefore = card.classList.contains('drag-over-before');
      _clearHighlights();
      _splitAndInsert(card.closest('.exercises-section'), card, insertBefore, dragged);
      dragged = null;
      return;
    }

    const target = e.target.closest('.section, .exercises-section');
    if (!target || target === dragged || !container.contains(target)) return;
    e.preventDefault();
    _clearHighlights();
    _moveSection(container, dragged, target);
    dragged = null;
  });

  // ── Mobile: touch drag, só a partir do handle ──────────────────
  container.addEventListener('touchstart', e => {
    if (!e.target.closest('.section-drag-handle')) return;
    dragged = e.target.closest('.section');
    if (!dragged) return;
    e.preventDefault();
    dragged.classList.add('dragging');
  }, { passive: false });

  container.addEventListener('touchmove', e => {
    if (!dragged) return;
    e.preventDefault();
    const { clientX, clientY } = e.touches[0];
    dragged.style.display = 'none';
    const below = document.elementFromPoint(clientX, clientY);
    dragged.style.display = '';
    _clearHighlights();

    const card = below?.closest('.exercise-card');
    if (card && container.contains(card)) {
      _highlightCard(card, clientY);
      return;
    }

    const target = below?.closest('.section, .exercises-section');
    if (target && target !== dragged && container.contains(target))
      target.classList.add('drag-over');
  }, { passive: false });

  container.addEventListener('touchend', () => {
    if (!dragged) return;

    const card = container.querySelector('.exercise-card.drag-over-before, .exercise-card.drag-over-after');
    if (card) {
      const insertBefore = card.classList.contains('drag-over-before');
      _clearHighlights();
      _splitAndInsert(card.closest('.exercises-section'), card, insertBefore, dragged);
      dragged.classList.remove('dragging');
      dragged = null;
      return;
    }

    const target = container.querySelector('.section.drag-over, .exercises-section.drag-over');
    if (target) _moveSection(container, dragged, target);
    dragged.classList.remove('dragging');
    _clearHighlights();
    dragged = null;
  });
}

function _moveCard(section, dragged, target) {
  const cards = [...section.querySelectorAll('.exercise-card')];
  if (cards.indexOf(dragged) < cards.indexOf(target)) target.after(dragged);
  else target.before(dragged);
}

function initDragAndDrop(section) {
  let dragged = null;

  // ── Desktop: HTML5 drag, só a partir do handle ─────────────────
  section.addEventListener('dragstart', e => {
    if (!e.target.closest('.drag-handle')) { e.preventDefault(); return; }
    dragged = e.target.closest('.exercise-card');
    if (!dragged) return;
    setTimeout(() => dragged.classList.add('dragging'), 0);
  });

  section.addEventListener('dragend', () => {
    if (dragged) { dragged.classList.remove('dragging'); dragged = null; }
    section.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('drag-over'));
  });

  section.addEventListener('dragover', e => {
    if (!dragged) return;
    const target = e.target.closest('.exercise-card');
    if (!target || target === dragged) return;
    e.preventDefault();
    section.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('drag-over'));
    target.classList.add('drag-over');
  });

  section.addEventListener('drop', e => {
    if (!dragged) return;
    const target = e.target.closest('.exercise-card');
    if (!target || target === dragged) return;
    e.preventDefault();
    target.classList.remove('drag-over');
    _moveCard(section, dragged, target);
    dragged = null;
  });

  // ── Mobile: touch drag, só a partir do handle ──────────────────
  section.addEventListener('touchstart', e => {
    if (!e.target.closest('.drag-handle')) return;
    dragged = e.target.closest('.exercise-card');
    if (!dragged) return;
    e.preventDefault();
    dragged.classList.add('dragging');
  }, { passive: false });

  section.addEventListener('touchmove', e => {
    if (!dragged) return;
    e.preventDefault();
    const { clientX, clientY } = e.touches[0];
    dragged.style.display = 'none';
    const below = document.elementFromPoint(clientX, clientY);
    dragged.style.display = '';
    const target = below?.closest('.exercise-card');
    section.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('drag-over'));
    if (target && target !== dragged && section.contains(target))
      target.classList.add('drag-over');
  }, { passive: false });

  section.addEventListener('touchend', () => {
    if (!dragged) return;
    const target = section.querySelector('.exercise-card.drag-over');
    if (target) _moveCard(section, dragged, target);
    dragged.classList.remove('dragging');
    section.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('drag-over'));
    dragged = null;
  });
}

function editSubTitle(btn) {
  const titleEl = btn.closest('.subsection-title').querySelector('.sub-title-text');
  if (titleEl.querySelector('input')) return;
  const current = titleEl.textContent.trim();
  titleEl.innerHTML = '';
  const input = document.createElement('input');
  input.value = current;
  input.style.cssText = 'font:inherit;font-weight:600;background:transparent;border:none;border-bottom:2px solid #1a56db;outline:none;width:100%;';
  titleEl.appendChild(input);
  input.focus();
  input.select();
  function save() {
    titleEl.textContent = input.value.trim() || current;
    btn.classList.toggle('has-obs', titleEl.textContent !== current);
  }
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { titleEl.textContent = current; }
  });
}

function toggleObs(btn) {
  const card  = btn.closest('.exercise-card');
  const input = card.querySelector('.obs-input');
  const isOpen = input.classList.contains('open');
  if (isOpen) {
    input.classList.remove('open');
    btn.classList.toggle('has-obs', input.value.trim() !== '');
  } else {
    input.classList.add('open');
    input.focus();
  }
}

function toggleDoneSm(btn) {
  btn.classList.toggle('done');
  btn.closest('.subsection').classList.toggle('done');
}

function toggleDone(btn) {
  btn.classList.toggle('done');
  btn.closest('.exercise-card').classList.toggle('done');
}

function editCarga(item) {
  const valueEl = item.querySelector('.spec-value');
  if (valueEl.querySelector('input')) return;
  const current = valueEl.textContent;
  item.classList.add('editing');
  valueEl.innerHTML = `<input class="spec-input" type="text" value="${current}">`;
  const input = valueEl.querySelector('input');
  input.focus();
  input.select();
  function done() { item.classList.remove('editing'); }
  function save() {
    valueEl.textContent = input.value.trim();
    if (_treinoEditFileName) _treinoPodeCompartilhar = false;
    done();
  }
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { valueEl.textContent = current; done(); }
  });
}

function confirmarRemocaoExercicio(btn) {
  const card = btn.closest('.exercise-card');
  const name = card.querySelector('.exercise-name')?.textContent.trim() || 'este exercício';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <h3>Remover exercício?</h3>
      <p style="font-size:14px;color:#636366;margin:8px 0 16px">${name}</p>
      <div class="modal-actions">
        <button class="modal-cancel">Cancelar</button>
        <button class="modal-danger">Remover</button>
      </div>
    </div>`;
  overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.modal-danger').addEventListener('click', () => {
    card.remove();
    overlay.remove();
    if (_treinoEditFileName) _treinoPodeCompartilhar = false;
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function editEquipmentUrl(btn) {
  const equipDiv = btn.closest('.equipment');
  const currentUrl = equipDiv.dataset.url || '';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <h3>URL do equipamento</h3>
      <div class="modal-field">
        <label>Link</label>
        <input id="equip-url-input" type="url" value="${currentUrl.replace(/"/g,'&quot;')}" placeholder="https://...">
      </div>
      <div class="modal-actions">
        <button class="modal-cancel">Cancelar</button>
        <button class="modal-confirm">OK</button>
      </div>
    </div>`;
  overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.modal-confirm').addEventListener('click', () => {
    equipDiv.dataset.url = overlay.querySelector('#equip-url-input').value.trim();
    overlay.remove();
    if (_treinoEditFileName) _treinoPodeCompartilhar = false;
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  setTimeout(() => overlay.querySelector('#equip-url-input')?.focus(), 50);
}
