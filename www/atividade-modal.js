let _targetSection = null;
let _modalTipo = 'musculacao';

function openAddModal(btn) {
  _targetSection = btn.closest('.exercises-section');
  _modalTipo = 'musculacao';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  _drawAddModal(overlay);
}

function _drawAddModal(overlay) {
  const TIPOS = [
    { id: 'musculacao',  icon: 'ti-barbell',   label: 'Musculação' },
    { id: 'cardio',      icon: 'ti-run',        label: 'Cárdio' },
    { id: 'alongamento', icon: 'ti-stretching', label: 'Alongamento' },
  ];

  const formHTML = _modalTipo === 'musculacao' ? `
    <div class="modal-field">
      <label>Nome</label>
      <input id="m-name" type="text" placeholder="Ex: Leg Press">
    </div>
    <div class="modal-row">
      <div class="modal-field" style="margin:0"><label>Séries</label><input id="m-series" type="text" placeholder="Ex: 3 x 12"></div>
      <div class="modal-field" style="margin:0"><label>Carga (opcional)</label><input id="m-carga" type="text" placeholder="Ex: 40"></div>
    </div>
    <div class="modal-row">
      <div class="modal-field" style="margin:0"><label>Regulagem (opcional)</label><input id="m-reg" type="text" placeholder="Ex: banco 6"></div>
      <div class="modal-field" style="margin:0"><label>Localização (opcional)</label><input id="m-loc" type="text" placeholder="Ex: 8 NE"></div>
    </div>
    <div class="modal-field"><label>Equipamento (opcional)</label><input id="m-equip" type="text" placeholder="Ex: Leg Press Machine"></div>
    <div class="modal-field"><label><i class="ti ti-link" style="font-size:13px;color:#1a56db;margin-right:4px"></i>URL (opcional)</label><input id="m-url" type="url" placeholder="https://..."></div>`
  : _modalTipo === 'cardio' ? `
    <div class="modal-field">
      <label>Subtítulo</label>
      <input id="c-subtitle" type="text" placeholder="Ex: Elíptico 8-12 min">
    </div>
    <div class="modal-field">
      <label>Etapas <span style="font-weight:400;color:#8e8e93">(Fase - duração - zona/bpm)</span></label>
      <textarea id="c-steps" rows="5" style="width:100%;font:inherit;font-size:14px;padding:8px;border:1.5px solid #e0e0e5;border-radius:8px;resize:vertical;box-sizing:border-box;margin-top:4px" placeholder="Aquecimento - 2 min - Zona 2 100-110 bpm&#10;Forte - 1,5 min - Zona 4 137-154 bpm&#10;Recuperação - 1,5 min - Zona 2 105-115 bpm&#10;Desaquecimento - 1 min - Zona 1 95-105 bpm"></textarea>
    </div>` : `
    <div class="modal-field">
      <label>Alongamentos <span style="font-weight:400;color:#8e8e93">(um por linha)</span></label>
      <textarea id="a-items" rows="5" style="width:100%;font:inherit;font-size:14px;padding:8px;border:1.5px solid #e0e0e5;border-radius:8px;resize:vertical;box-sizing:border-box;margin-top:4px" placeholder="Bíceps&#10;Tríceps&#10;Deltóides&#10;Dorsais"></textarea>
    </div>`;

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="margin:0">Nova atividade</h3>
        <div class="pill-group">
          ${TIPOS.map(t =>
            `<button class="pill-btn${_modalTipo === t.id ? ' active' : ''}" data-tipo="${t.id}" title="${t.label}">
              <i class="ti ${t.icon}"></i>
            </button>`
          ).join('')}
        </div>
      </div>
      ${formHTML}
      <div class="modal-actions">
        <button class="modal-cancel">Cancelar</button>
        <button class="modal-confirm">Adicionar</button>
      </div>
    </div>`;

  overlay.querySelectorAll('[data-tipo]').forEach(btn =>
    btn.addEventListener('click', () => { _modalTipo = btn.dataset.tipo; _drawAddModal(overlay); })
  );
  overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.modal-confirm').addEventListener('click', () => _addActivity(overlay));
  setTimeout(() => overlay.querySelector('input, textarea')?.focus(), 50);
}

function _addActivity(overlay) {
  const editMode = !!_treinoEditFileName;

  if (_modalTipo === 'musculacao') {
    const name = document.getElementById('m-name').value.trim();
    if (!name) { document.getElementById('m-name').focus(); return; }
    const series = document.getElementById('m-series').value.trim();
    const carga  = document.getElementById('m-carga').value.trim();
    const reg    = document.getElementById('m-reg').value.trim();
    const loc    = document.getElementById('m-loc').value.trim();
    const equip  = document.getElementById('m-equip').value.trim();
    const url    = document.getElementById('m-url').value.trim();

    const specCells = editMode
      ? [['Séries', series], ['Carga', carga], ['Regulagem', reg], ['Localização', loc]]
          .map(([label, val]) =>
            `<div class="spec-item editable" onclick="editCarga(this)"><div class="spec-label">${label}</div><div class="spec-value">${val}</div></div>`
          ).join('')
      : [
          series ? `<div class="spec-item editable" onclick="editCarga(this)"><div class="spec-label">Séries</div><div class="spec-value">${series}</div></div>` : '',
          loc    ? `<div class="spec-item"><div class="spec-label">Localização</div><div class="spec-value-sm">${loc}</div></div>` : '',
          carga  ? `<div class="spec-item editable" onclick="editCarga(this)"><div class="spec-label">Carga</div><div class="spec-value">${carga}</div></div>` : '',
          reg    ? `<div class="spec-item"><div class="spec-label">Regulagem</div><div class="spec-value-sm">${reg}</div></div>` : '',
        ].filter(Boolean).join('');

    const equipHTML = equip
      ? editMode
        ? `<div class="equipment" data-url="${url.replace(/"/g,'&quot;')}">
             <span class="equipment-name" onclick="editInPlace(this)" style="cursor:pointer">${equip}</span>
             <button class="equipment-url-btn" onclick="editEquipmentUrl(this)" title="Editar URL"><i class="ti ti-link"></i></button>
           </div>`
        : `<div class="equipment">${url ? `<a href="${url}" target="_blank">${equip}</a>` : equip}</div>`
      : '';

    const card = document.createElement('div');
    card.className = 'exercise-card';
    card.setAttribute('draggable', 'true');
    card.innerHTML = `
      <div class="exercise-header">
        <div class="drag-handle"><i class="ti ti-grip-vertical"></i></div>
        <div class="exercise-icon"><i class="ti ti-barbell"></i></div>
        <div${editMode ? ' style="flex:1;min-width:0"' : ''}>
          <div class="exercise-name"${editMode ? ' onclick="editInPlace(this)" style="cursor:pointer"' : ''}>${name}</div>
          ${equipHTML}
        </div>
        ${editMode
          ? `<button class="exercise-delete-btn" onclick="confirmarRemocaoExercicio(this)" title="Remover exercício"><i class="ti ti-trash"></i></button>`
          : `<button class="obs-btn" onclick="toggleObs(this)" title="Observações"><i class="ti ti-note"></i></button>
             <button class="check-btn" onclick="toggleDone(this)" title="Marcar como feito"><i class="ti ti-check"></i></button>`}
      </div>
      ${specCells ? `<div class="specs">${specCells}</div>` : ''}
      ${!editMode ? `<textarea class="obs-input" placeholder="Observações..." rows="1"
        oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>` : ''}`;

    card.dataset.added = 'true';
    const ab = _targetSection.querySelector('.add-exercise-btn');
    _targetSection.insertBefore(card, ab);
    overlay.remove();
    return;
  }

  if (_modalTipo === 'cardio') {
    const subtitle = document.getElementById('c-subtitle').value.trim() || 'Cárdio';
    const stepsRaw = document.getElementById('c-steps').value;
    const steps = stepsRaw.split('\n').map(l => l.trim()).filter(Boolean);

    const section = { title: 'Cárdio', content: [{ type: 'subsection', title: subtitle, content: steps }] };
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderWarmup(section, editMode, 'ti-run');
    const sectionEl = wrapper.firstElementChild;
    sectionEl.dataset.type = 'cardio';
    sectionEl.dataset.added = 'true';
    _insertSectionInTreino(sectionEl);
    overlay.remove();
    return;
  }

  if (_modalTipo === 'alongamento') {
    const itemsRaw = document.getElementById('a-items').value;
    const items = itemsRaw.split('\n').map(l => l.trim()).filter(Boolean);

    const section = { title: 'Alongamento', content: items };
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderStretching(section, editMode);
    const sectionEl = wrapper.firstElementChild;
    sectionEl.dataset.added = 'true';
    _insertSectionInTreino(sectionEl);
    overlay.remove();
  }
}

function _insertSectionInTreino(sectionEl) {
  const treinoContent = _targetSection.closest('.treino-content');
  const editBar = treinoContent.querySelector('.edit-bar');
  if (editBar) treinoContent.insertBefore(sectionEl, editBar);
  else treinoContent.appendChild(sectionEl);
}
