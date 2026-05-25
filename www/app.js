const ICONS = {
  'aquecimento': 'ti-run',
  'alongamento': 'ti-stretching',
  'pós-treino':  'ti-run',
};

function getIcon(title) {
  for (const [key, icon] of Object.entries(ICONS)) {
    if (title.toLowerCase().includes(key)) return icon;
  }
  return 'ti-barbell';
}


function extractSpecs(content, equipment) {
  const specs = {};
  for (const line of content) {
    if (line.match(/^\d+\s*x\s*/i)) specs.series = line;
    else if (/^carga\s/i.test(line)) {
      const rest = line.replace(/^carga\s*/i, '');
      const regIdx = rest.search(/\bregulagem\b/i);
      if (regIdx !== -1) {
        specs.carga = rest.slice(0, regIdx).trim();
        specs.regulagem = rest.slice(regIdx).replace(/^regulagem\s*/i, '').trim();
      } else {
        specs.carga = rest;
      }
    } else if (/^regulagem\s/i.test(line)) specs.regulagem = line.replace(/^regulagem\s*/i, '');
  }
  if (equipment?.extra) specs.location = equipment.extra;
  return specs;
}

function renderIntervals(lines, editMode = false) {
  const filtered = lines.filter(l => l.trim());
  if (editMode && !filtered.length) {
    return `<div class="interval-empty" onclick="editIntervalBlock(this)">Toque para adicionar linhas</div>`;
  }
  return filtered.map(line => {
    const [phase, ...rest] = line.split(' - ');
    return `<div class="interval-item"${editMode ? ' onclick="editIntervalBlock(this)" style="cursor:pointer"' : ''}>
      <div class="interval-header">${phase}</div>
      ${rest.length ? `<div class="interval-details">${rest.map(p => `<span>${p}</span>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
}

function renderWarmup(section, editMode = false, icon = 'ti-flame') {
  const subs = section.content.filter(s => s.type === 'subsection');
  return `<div class="section" draggable="true">
    <div class="section-title">
      <i class="ti ti-grip-vertical section-drag-handle"></i>
      <i class="ti ${icon}"></i>${
        editMode
          ? `<span onclick="editInPlace(this)" style="cursor:pointer">${section.title}</span>
             <button class="section-delete-btn" onclick="confirmarRemocaoSection(this)" title="Remover"><i class="ti ti-trash"></i></button>`
          : section.title
      }</div>
    ${subs.map(sub => `
      <div class="subsection">
        <div class="subsection-title">
          <span class="sub-title-text"${editMode ? ' onclick="editInPlace(this)" style="cursor:pointer"' : ''}>${sub.title}</span>
          ${!editMode ? `<div style="display:flex;gap:6px">
            <button class="obs-btn-sm" onclick="editSubTitle(this)" title="Editar"><i class="ti ti-pencil"></i></button>
            <button class="check-btn-sm" onclick="toggleDoneSm(this)" title="Marcar como feito"><i class="ti ti-check"></i></button>
          </div>` : ''}
        </div>
        ${renderIntervals(sub.content, editMode)}
      </div>`).join('')}
  </div>`;
}

function renderExercise(section, editMode = false) {
  const specs = extractSpecs(section.content.filter(l => typeof l === 'string'), section.equipment);
  const icon  = getIcon(section.title);

  const specCells = editMode
    ? [
        ['Séries',     specs.series    || ''],
        ['Carga',      specs.carga     || ''],
        ['Regulagem',  specs.regulagem || ''],
        ['Localização',specs.location  || ''],
      ].map(([label, val]) =>
        `<div class="spec-item editable" onclick="editCarga(this)"><div class="spec-label">${label}</div><div class="spec-value">${val}</div></div>`
      ).join('')
    : [
        specs.series   ? `<div class="spec-item editable" onclick="editCarga(this)" data-original="${specs.series}"><div class="spec-label">Séries</div><div class="spec-value">${specs.series}</div></div>` : '',
        specs.location ? `<div class="spec-item"><div class="spec-label">Localização</div><div class="spec-value-sm">${specs.location}</div></div>` : '',
        specs.carga    ? `<div class="spec-item editable" onclick="editCarga(this)" data-original="${specs.carga}"><div class="spec-label">Carga</div><div class="spec-value">${specs.carga}</div></div>` : '',
        specs.regulagem? `<div class="spec-item"><div class="spec-label">Regulagem</div><div class="spec-value-sm">${specs.regulagem}</div></div>` : '',
      ].filter(Boolean).join('');

  return `<div class="exercise-card" draggable="true">
    <div class="exercise-header">
      <div class="drag-handle"><i class="ti ti-grip-vertical"></i></div>
      <div class="exercise-icon"><i class="ti ${icon}"></i></div>
      <div${editMode ? ' style="flex:1;min-width:0"' : ''}>
        <div class="exercise-name"${editMode ? ' onclick="editInPlace(this)" style="cursor:pointer"' : ''}>${section.title}</div>
        ${section.equipment
          ? editMode
            ? `<div class="equipment" data-url="${section.equipment.url.replace(/"/g,'&quot;')}">
                <span class="equipment-name" onclick="editInPlace(this)" style="cursor:pointer">${section.equipment.name}</span>
                <button class="equipment-url-btn" onclick="editEquipmentUrl(this)" title="Editar URL"><i class="ti ti-link"></i></button>
               </div>`
            : `<div class="equipment"><a href="${section.equipment.url}" target="_blank">${section.equipment.name}</a></div>`
          : ''}
      </div>
      ${editMode
        ? `<button class="exercise-delete-btn" onclick="confirmarRemocaoExercicio(this)" title="Remover exercício"><i class="ti ti-trash"></i></button>`
        : `<button class="obs-btn" onclick="toggleObs(this)" title="Observações"><i class="ti ti-note"></i></button>
           <button class="check-btn" onclick="toggleDone(this)" title="Marcar como feito"><i class="ti ti-check"></i></button>`}
    </div>
    ${specCells ? `<div class="specs">${specCells}</div>` : ''}
    ${!editMode ? `<textarea class="obs-input" placeholder="Observações..." rows="1" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>` : ''}
  </div>`;
}

function renderStretching(section, editMode = false) {
  const items = section.content.filter(l => typeof l === 'string');
  return `<div class="section" draggable="true">
    <div class="section-title">
      <i class="ti ti-grip-vertical section-drag-handle"></i>
      <i class="ti ti-stretching"></i>${
        editMode
          ? `<span onclick="editInPlace(this)" style="cursor:pointer">${section.title}</span>
             <button class="section-delete-btn" onclick="confirmarRemocaoSection(this)" title="Remover"><i class="ti ti-trash"></i></button>`
          : section.title
      }</div>
    <div class="stretch-list">${items.map(i =>
      editMode
        ? `<div class="stretch-item"><span onclick="editInPlace(this)" style="cursor:pointer">${i}</span></div>`
        : `<div class="stretch-item" onclick="this.classList.toggle('done');this.querySelector('.check-btn-sm').classList.toggle('done')">${i}<button class="check-btn-sm" style="pointer-events:none"><i class="ti ti-check"></i></button></div>`
    ).join('')}${editMode ? `<button class="add-line-btn" onclick="addStretchItem(this)"><i class="ti ti-plus"></i> Item</button>` : ''}</div>
  </div>`;
}

function renderPostWorkout(section, editMode = false) {
  const lines    = section.content.filter(l => typeof l === 'string');
  const subTitle = lines.find(l => !l.includes(' - ')) || section.title;
  return `<div class="section" draggable="true">
    <div class="section-title">
      <i class="ti ti-grip-vertical section-drag-handle"></i>
      <i class="ti ti-run"></i>${
        editMode
          ? `<span onclick="editInPlace(this)" style="cursor:pointer">${section.title}</span>
             <button class="section-delete-btn" onclick="confirmarRemocaoSection(this)" title="Remover"><i class="ti ti-trash"></i></button>`
          : section.title
      }</div>
    <div class="subsection">
      <div class="subsection-title" style="margin-bottom:10px">
        <span class="sub-title-text"${editMode ? ' onclick="editInPlace(this)" style="cursor:pointer"' : ''}>${subTitle}</span>
        ${!editMode ? `<div style="display:flex;gap:6px">
          <button class="obs-btn-sm" onclick="editSubTitle(this)" title="Editar"><i class="ti ti-pencil"></i></button>
          <button class="check-btn-sm" onclick="toggleDoneSm(this)" title="Marcar como feito"><i class="ti ti-check"></i></button>
        </div>` : ''}
      </div>
      ${renderIntervals(lines, editMode)}
    </div>
  </div>`;
}

function buildTreinoNode(title, subtitle, sections, fileName, editMode = false) {
  const node = document.createElement('div');
  node.className = 'treino-content';

  let html = editMode
    ? `<div class="header">
        <div class="header-row">
          <button class="close-btn" onclick="verTreinos()" title="Voltar"><i class="ti ti-arrow-left"></i></button>
          <h1 onclick="editInPlace(this)" style="cursor:pointer;flex:1;text-align:center">${title}</h1>
          <button class="home-btn" onclick="compartilharTreinoEditado()" title="Compartilhar"><i class="ti ti-share"></i></button>
        </div>
        ${subtitle
          ? `<p onclick="editSubtitulo(this)" style="cursor:pointer">${subtitle}</p>`
          : `<p onclick="editSubtitulo(this)" style="cursor:pointer;opacity:.35">Toque para adicionar subtítulo</p>`}
      </div>`
    : `<div class="header">
        <div class="header-row">
          <button class="close-btn" onclick="fecharTreino('${fileName}')" title="Fechar treino"><i class="ti ti-x"></i></button>
          <h1>${title}</h1>
          <button class="home-btn" onclick="goHome()" title="Voltar"><i class="ti ti-home"></i></button>
        </div>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
      </div>`;

  const cards = [];
  let hasExercisesSection = false;
  function flushCards() {
    if (cards.length) {
      hasExercisesSection = true;
      html += `<div class="exercises-section">
        ${cards.join('')}
        <button class="add-exercise-btn" onclick="openAddModal(this)">
          <i class="ti ti-plus"></i> Adicionar exercício
        </button>
      </div>`;
      cards.length = 0;
    }
  }

  for (const section of sections) {
    const key = section.title.toLowerCase();
    if      (key.includes('desaquecimento')) { flushCards(); html += renderWarmup(section, editMode, 'ti-walk'); }
    else if (key.includes('aquecimento'))    { flushCards(); html += renderWarmup(section, editMode, 'ti-flame'); }
    else if (key.includes('desenvolvimento')){ flushCards(); html += renderWarmup(section, editMode, 'ti-run'); }
    else if (key.includes('cárdio'))         { flushCards(); html += renderWarmup(section, editMode, 'ti-run'); }
    else if (key.includes('pós-treino'))     { flushCards(); html += renderPostWorkout(section, editMode); }
    else if (key.includes('alongamento'))    { flushCards(); html += renderStretching(section, editMode); }
    else { cards.push(renderExercise(section, editMode)); }
  }
  flushCards();
  if (!hasExercisesSection) {
    html += `<div class="exercises-section">
      <button class="add-exercise-btn" onclick="openAddModal(this)">
        <i class="ti ti-plus"></i> Adicionar exercício
      </button>
    </div>`;
  }

  if (editMode) {
    html += `<div class="edit-bar">
      <button class="edit-bar-btn edit-bar-excluir" onclick="confirmarDelecaoTreino('${fileName}')">
        <i class="ti ti-trash"></i>Excluir
      </button>
      <button class="edit-bar-btn edit-bar-duplicar" onclick="duplicarTreino()">
        <i class="ti ti-copy"></i>Duplicar
      </button>
      <button class="edit-bar-btn edit-bar-salvar" onclick="salvarTreinoEditado()">
        <i class="ti ti-device-floppy"></i>Salvar
      </button>
    </div>`;
  }

  node.innerHTML = html;
  node.querySelectorAll('.exercises-section').forEach(s => initDragAndDrop(s));
  initSectionDragAndDrop(node);
  return node;
}

function renderTabs() {
  const names = Object.keys(openTreinos);
  if (names.length === 0) return;

  const app = document.getElementById('app');

  if (!document.getElementById('tab-bar')) {
    app.innerHTML = `
      <div id="tab-bar" class="tab-bar"></div>
      <div id="tab-content"></div>
      <div class="registrar-bar">
        <button class="registrar-btn" onclick="registrar()">
          <i class="ti ti-download"></i> Registrar treino
        </button>
      </div>`;
  }

  const tabBar = document.getElementById('tab-bar');
  tabBar.innerHTML = names.map(name =>
    `<button class="tab-btn${name === currentTreino ? ' active' : ''}" onclick="switchTab('${name}')">
      ${openTreinos[name].title}
    </button>`
  ).join('');

  switchTab(currentTreino, false);
}

function switchTab(name, updateBar = true) {
  currentTreino = name;
  const content = document.getElementById('tab-content');
  if (!content) return;
  content.innerHTML = '';
  content.appendChild(openTreinos[name].node);
  if (updateBar) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.textContent.trim() === openTreinos[name].title);
    });
  }
}

function render(md, fileName) {
  const { title, subtitle, sections } = parseMarkdown(md);
  _setTreinoTipo(fileName, _tipoFromSubtitle(subtitle));
  const node = buildTreinoNode(title, subtitle, sections, fileName);
  openTreinos[fileName] = { title, node };
  currentTreino = fileName;
  renderTabs();
}

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
    _insertSectionInTreino(wrapper.firstElementChild);
    overlay.remove();
  }
}

function _insertSectionInTreino(sectionEl) {
  const treinoContent = _targetSection.closest('.treino-content');
  const editBar = treinoContent.querySelector('.edit-bar');
  if (editBar) treinoContent.insertBefore(sectionEl, editBar);
  else treinoContent.appendChild(sectionEl);
}

function _moveSection(container, dragged, target) {
  const siblings = [...container.children].filter(c =>
    c.classList.contains('section') || c.classList.contains('exercises-section')
  );
  if (siblings.indexOf(dragged) < siblings.indexOf(target)) target.after(dragged);
  else target.before(dragged);
}

function initSectionDragAndDrop(container) {
  let dragged = null;

  // ── Desktop: HTML5 drag, só a partir do handle ─────────────────
  container.addEventListener('dragstart', e => {
    if (!e.target.closest('.section-drag-handle')) { e.preventDefault(); return; }
    dragged = e.target.closest('.section');
    if (!dragged) return;
    setTimeout(() => dragged.classList.add('dragging'), 0);
  });
  container.addEventListener('dragend', () => {
    if (dragged) { dragged.classList.remove('dragging'); dragged = null; }
    container.querySelectorAll('.section').forEach(s => s.classList.remove('drag-over'));
  });
  container.addEventListener('dragover', e => {
    if (!dragged) return;
    const target = e.target.closest('.section');
    if (!target || target === dragged || !container.contains(target)) return;
    e.preventDefault();
    container.querySelectorAll('.section').forEach(s => s.classList.remove('drag-over'));
    target.classList.add('drag-over');
  });
  container.addEventListener('drop', e => {
    if (!dragged) return;
    const target = e.target.closest('.section');
    if (!target || target === dragged || !container.contains(target)) return;
    e.preventDefault();
    target.classList.remove('drag-over');
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
    const target = below?.closest('.section');
    container.querySelectorAll('.section').forEach(s => s.classList.remove('drag-over'));
    if (target && target !== dragged && container.contains(target))
      target.classList.add('drag-over');
  }, { passive: false });

  container.addEventListener('touchend', () => {
    if (!dragged) return;
    const target = container.querySelector('.section.drag-over');
    if (target) _moveSection(container, dragged, target);
    dragged.classList.remove('dragging');
    container.querySelectorAll('.section').forEach(s => s.classList.remove('drag-over'));
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

const sessionFiles = {};
const openTreinos = {};
let currentTreino = null;

async function renderHome() {
  if (window.Capacitor?.isNativePlatform?.()) {
    await _renderHomeNativo();
  } else {
    _renderHomeBrowser();
  }
}

async function _renderHomeNativo() {
  document.getElementById('app').innerHTML = `<div class="picker" style="padding:2rem;text-align:center;color:#636366">Carregando...</div>`;
  const allNames = await listarTreinosNoApp();

  const emAndamento = allNames.filter(n =>  openTreinos[n]).sort((a, b) => a.localeCompare(b));
  const disponiveis = allNames.filter(n => !openTreinos[n]).sort((a, b) => a.localeCompare(b));
  const ordenados   = [...emAndamento, ...disponiveis];
  const hasOpen     = emAndamento.length > 0;

  const treinosHTML = ordenados.map(name => {
    const label  = name.replace(/\.md$/i, '');
    const ativo  = !!openTreinos[name];
    const action = ativo ? `voltarTreino('${name}')` : `openRecent('${name}')`;
    const icone  = getTipoIcone(_getTreinoTipo(name));
    return `<button class="recent-btn" onclick="${action}">
      <i class="ti ${icone}"></i>${label}
      ${ativo ? `<i class="ti ti-player-play" style="margin-left:auto;font-size:16px"></i>` : ''}
    </button>`;
  }).join('');

  document.getElementById('app').innerHTML = `
    <div class="picker">
      <div class="recent-label">Treinos</div>
      ${ordenados.length
        ? `<div class="recent-list">${treinosHTML}</div>`
        : `<p>Nenhum treino salvo</p>`}
      ${hasOpen ? `<button class="limpar-btn" onclick="limparAtividades()"><i class="ti ti-trash"></i> Limpar atividades</button>` : ''}
      <button class="registros-btn" onclick="verTreinos()"><i class="ti ti-list"></i> Gerir treinos</button>
      <div class="recent-label" style="margin-top:1.5rem">Registros de treino</div>
      ${hasOpen ? `<button class="registrar-btn" onclick="registrar()"><i class="ti ti-download"></i> Registrar treino</button>` : ''}
      <button class="registros-btn" onclick="verRegistros()"><i class="ti ti-history"></i> Ver registros</button>
    </div>`;
}

function _renderHomeBrowser() {
  let recentNames = [];
  try { recentNames = JSON.parse(localStorage.getItem('recentTreinos') || '[]'); } catch(e) {}
  recentNames.sort((a, b) => a.localeCompare(b));

  const openNames = Object.keys(openTreinos);
  const hasOpen   = openNames.length > 0;

  const openHTML = openNames.sort((a,b) => a.localeCompare(b)).map(name => {
    const label = openTreinos[name].title;
    return `<button class="recent-btn" onclick="voltarTreino('${name}')">
      <i class="ti ti-barbell"></i>${label}
    </button>`;
  }).join('');

  const closedNames = recentNames.filter(n => !openTreinos[n]);
  const closedHTML  = closedNames.map(name => {
    const label     = name.replace(/\.md$/i, '');
    const inSession = !!sessionFiles[name];
    return `<button class="recent-btn${inSession ? '' : ' stale'}" onclick="openRecent('${name}')">
      <i class="ti ti-barbell"></i>${label}${inSession ? '' : ' <span style="font-size:11px;font-weight:400;margin-left:auto;color:#8e8e93">selecionar arquivo</span>'}
    </button>`;
  }).join('');

  const hasRecent = closedNames.length > 0;

  document.getElementById('app').innerHTML = `
    <div class="picker">
      ${hasOpen ? `
        <div class="recent-label">Em andamento</div>
        <div class="recent-list">${openHTML}</div>
        <button class="limpar-btn" onclick="limparAtividades()"><i class="ti ti-trash"></i> Limpar tudo</button>
        <div class="home-divider">adicionar treino</div>` : ''}
      ${!hasOpen ? `<div class="recent-label">Selecione um treino</div>` : ''}
      ${hasRecent ? `<div class="recent-list">${closedHTML}</div><div class="home-divider">ou abrir outro</div>` : ''}
      <label>
        <i class="ti ti-folder-open"></i> Abrir treino
        <input type="file" accept=".md,text/markdown,text/plain" onchange="loadFile(this.files[0])">
      </label>
      <div class="drop-zone" id="dropZone">ou arraste o arquivo aqui</div>
      <div class="home-divider">registros de treino</div>
      ${hasOpen ? `<button class="registrar-btn" onclick="registrar()"><i class="ti ti-download"></i> Registrar treino</button>` : ''}
    </div>`;

  document.getElementById('dropZone').addEventListener('dragover', e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); });
  document.getElementById('dropZone').addEventListener('dragleave', e => e.currentTarget.classList.remove('dragover'));
  document.getElementById('dropZone').addEventListener('drop', e => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.md')) loadFile(file);
  });
}

function voltarTreino(name) {
  currentTreino = name;
  renderTabs();
}

function limparAtividades() {
  if (!confirm('Limpar todas as atividades em andamento?')) return;
  for (const key of Object.keys(openTreinos)) delete openTreinos[key];
  currentTreino = null;
  renderHome();
}

function fecharTreino(name) {
  delete openTreinos[name];
  const names = Object.keys(openTreinos);
  if (names.length === 0) {
    renderHome();
  } else {
    currentTreino = names[0];
    renderTabs();
  }
}

function goHome() {
  renderHome();
}

renderHome();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
