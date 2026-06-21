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
  let lines = section.content.filter(l => typeof l === 'string');
  if (!lines.length) {
    const sub = section.content.find(s => s.type === 'subsection');
    if (sub) lines = sub.content.filter(l => typeof l === 'string');
  }
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
      html += `<div class="exercises-section">${cards.join('')}</div>`;
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
    html += `<div class="exercises-section"></div>`;
  }

  html += `<button class="add-exercise-btn" onclick="openAddModal(this)">
    <i class="ti ti-plus"></i> Adicionar exercício
  </button>`;

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

  // Reposiciona o botão logo após o último exercises-section
  const addBtn = node.querySelector('.add-exercise-btn');
  const lastEx = [...node.querySelectorAll('.exercises-section')].at(-1);
  if (addBtn && lastEx) lastEx.after(addBtn);

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
          <i class="ti ti-flag-check"></i> Concluir treino
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
