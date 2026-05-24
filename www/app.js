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

function parseMarkdown(md) {
  const lines = md.trim().split('\n');
  let title = '', subtitle = '';
  const sections = [];
  let cur = null, sub = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('# '))   { title = line.slice(2); }
    else if (!line.startsWith('#') && !cur && title) { subtitle = line; }
    else if (line.startsWith('## ')) {
      if (cur) sections.push(cur);
      cur = { title: line.slice(3), content: [] };
      sub = null;
    } else if (line.startsWith('### ')) {
      sub = { title: line.slice(4), type: 'subsection', content: [] };
      cur?.content.push(sub);
    } else {
      const link = line.match(/^\[([^\]]+)\]\(([^)]+)\)(.*)/);
      if (link) {
        const eq = { name: link[1], url: link[2], extra: link[3].trim() };
        if (sub) sub.equipment = eq;
        else if (cur) cur.equipment = eq;
      } else {
        (sub ?? cur)?.content.push(line);
      }
    }
  }
  if (cur) sections.push(cur);
  return { title, subtitle, sections };
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

function renderIntervals(lines) {
  return lines
    .filter(l => l.includes(' - '))
    .map(line => {
      const [phase, ...rest] = line.split(' - ');
      return `<div class="interval-item">
        <div class="interval-header">${phase}</div>
        <div class="interval-details">${rest.map(p => `<span>${p}</span>`).join('')}</div>
      </div>`;
    }).join('');
}

function renderWarmup(section) {
  const subs = section.content.filter(s => s.type === 'subsection');
  return `<div class="section">
    <div class="section-title"><i class="ti ti-flame"></i>${section.title}</div>
    ${subs.map(sub => `
      <div class="subsection">
        <div class="subsection-title">
          <span class="sub-title-text">${sub.title}</span>
          <div style="display:flex;gap:6px">
            <button class="obs-btn-sm" onclick="editSubTitle(this)" title="Editar"><i class="ti ti-pencil"></i></button>
            <button class="check-btn-sm" onclick="toggleDoneSm(this)" title="Marcar como feito"><i class="ti ti-check"></i></button>
          </div>
        </div>
        ${renderIntervals(sub.content)}
      </div>`).join('')}
  </div>`;
}

function renderExercise(section) {
  const specs = extractSpecs(section.content.filter(l => typeof l === 'string'), section.equipment);
  const icon = getIcon(section.title);

  const specCells = [
    specs.series   ? `<div class="spec-item editable" onclick="editCarga(this)" data-original="${specs.series}"><div class="spec-label">Séries</div><div class="spec-value">${specs.series}</div></div>` : '',
    specs.location ? `<div class="spec-item"><div class="spec-label">Localização</div><div class="spec-value-sm">${specs.location}</div></div>` : '',
    specs.carga    ? `<div class="spec-item editable" onclick="editCarga(this)" data-original="${specs.carga}"><div class="spec-label">Carga</div><div class="spec-value">${specs.carga}</div></div>` : '',
    specs.regulagem? `<div class="spec-item"><div class="spec-label">Regulagem</div><div class="spec-value-sm">${specs.regulagem}</div></div>` : '',
  ].filter(Boolean).join('');

  return `<div class="exercise-card" draggable="true">
    <div class="exercise-header">
      <div class="drag-handle"><i class="ti ti-grip-vertical"></i></div>
      <div class="exercise-icon"><i class="ti ${icon}"></i></div>
      <div>
        <div class="exercise-name">${section.title}</div>
        ${section.equipment ? `<div class="equipment"><a href="${section.equipment.url}" target="_blank">${section.equipment.name}</a></div>` : ''}
      </div>
      <button class="obs-btn" onclick="toggleObs(this)" title="Observações">
        <i class="ti ti-note"></i>
      </button>
      <button class="check-btn" onclick="toggleDone(this)" title="Marcar como feito">
        <i class="ti ti-check"></i>
      </button>
    </div>
    ${specCells ? `<div class="specs">${specCells}</div>` : ''}
    <textarea class="obs-input" placeholder="Observações..." rows="1"
      oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
  </div>`;
}

function renderStretching(section) {
  const items = section.content.filter(l => typeof l === 'string');
  return `<div class="section">
    <div class="section-title"><i class="ti ti-stretching"></i>${section.title}</div>
    <div class="stretch-list">${items.map(i => `<div class="stretch-item" onclick="this.classList.toggle('done');this.querySelector('.check-btn-sm').classList.toggle('done')">${i}<button class="check-btn-sm" style="pointer-events:none"><i class="ti ti-check"></i></button></div>`).join('')}</div>
  </div>`;
}

function renderPostWorkout(section) {
  const lines = section.content.filter(l => typeof l === 'string');
  const subTitle = lines.find(l => !l.includes(' - ')) || section.title;
  return `<div class="section">
    <div class="section-title"><i class="ti ti-run"></i>${section.title}</div>
    <div class="subsection">
      <div class="subsection-title" style="margin-bottom:10px">
        <span class="sub-title-text">${subTitle}</span>
        <div style="display:flex;gap:6px">
          <button class="obs-btn-sm" onclick="editSubTitle(this)" title="Editar"><i class="ti ti-pencil"></i></button>
          <button class="check-btn-sm" onclick="toggleDoneSm(this)" title="Marcar como feito"><i class="ti ti-check"></i></button>
        </div>
      </div>
      ${renderIntervals(lines)}
    </div>
  </div>`;
}

function buildTreinoNode(title, subtitle, sections, fileName) {
  const node = document.createElement('div');
  node.className = 'treino-content';

  let html = `<div class="header">
    <div class="header-row">
      <button class="close-btn" onclick="fecharTreino('${fileName}')" title="Fechar treino"><i class="ti ti-x"></i></button>
      <h1>${title}</h1>
      <button class="home-btn" onclick="goHome()" title="Voltar"><i class="ti ti-home"></i></button>
    </div>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
  </div>`;

  const cards = [];
  function flushCards() {
    if (cards.length) {
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
    if (key.includes('aquecimento'))  { flushCards(); html += renderWarmup(section); }
    else if (key.includes('alongamento')) { flushCards(); html += renderStretching(section); }
    else if (key.includes('pós-treino')) { flushCards(); html += renderPostWorkout(section); }
    else { cards.push(renderExercise(section)); }
  }
  flushCards();

  node.innerHTML = html;
  node.querySelectorAll('.exercises-section').forEach(s => initDragAndDrop(s));
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
  const node = buildTreinoNode(title, subtitle, sections, fileName);
  openTreinos[fileName] = { title, node };
  currentTreino = fileName;
  renderTabs();
}

let _targetSection = null;

function openAddModal(btn) {
  _targetSection = btn.closest('.exercises-section');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <h3>Novo exercício</h3>
      <div class="modal-field">
        <label>Nome</label>
        <input id="m-name" type="text" placeholder="Ex: Leg Press">
      </div>
      <div class="modal-row">
        <div class="modal-field" style="margin:0">
          <label>Séries</label>
          <input id="m-series" type="text" placeholder="Ex: 3 x 12">
        </div>
        <div class="modal-field" style="margin:0">
          <label>Carga</label>
          <input id="m-carga" type="text" placeholder="Ex: 40">
        </div>
      </div>
      <div class="modal-row">
        <div class="modal-field" style="margin:0">
          <label>Regulagem (opcional)</label>
          <input id="m-reg" type="text" placeholder="Ex: banco 6">
        </div>
        <div class="modal-field" style="margin:0">
          <label>Localização (opcional)</label>
          <input id="m-loc" type="text" placeholder="Ex: 8 NE">
        </div>
      </div>
      <div class="modal-field">
        <label>Equipamento (opcional)</label>
        <input id="m-equip" type="text" placeholder="Ex: Leg Press Machine">
      </div>
      <div class="modal-actions">
        <button class="modal-cancel" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="modal-confirm" onclick="addExercise(this)">Adicionar</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  document.getElementById('m-name').focus();
}

function addExercise(btn) {
  const name   = document.getElementById('m-name').value.trim();
  const series = document.getElementById('m-series').value.trim();
  const carga  = document.getElementById('m-carga').value.trim();
  const reg    = document.getElementById('m-reg').value.trim();
  const loc    = document.getElementById('m-loc').value.trim();
  const equip  = document.getElementById('m-equip').value.trim();
  if (!name) { document.getElementById('m-name').focus(); return; }

  const specCells = [
    series ? `<div class="spec-item editable" onclick="editCarga(this)"><div class="spec-label">Séries</div><div class="spec-value">${series}</div></div>` : '',
    loc    ? `<div class="spec-item"><div class="spec-label">Localização</div><div class="spec-value-sm">${loc}</div></div>` : '',
    carga  ? `<div class="spec-item editable" onclick="editCarga(this)"><div class="spec-label">Carga</div><div class="spec-value">${carga}</div></div>`  : '',
    reg    ? `<div class="spec-item"><div class="spec-label">Regulagem</div><div class="spec-value-sm">${reg}</div></div>` : '',
  ].filter(Boolean).join('');

  const card = document.createElement('div');
  card.className = 'exercise-card';
  card.setAttribute('draggable', 'true');
  card.innerHTML = `
    <div class="exercise-header">
      <div class="drag-handle"><i class="ti ti-grip-vertical"></i></div>
      <div class="exercise-icon"><i class="ti ti-barbell"></i></div>
      <div>
        <div class="exercise-name">${name}</div>
        ${equip ? `<div class="equipment">${equip}</div>` : ''}
      </div>
      <button class="obs-btn" onclick="toggleObs(this)" title="Observações">
        <i class="ti ti-note"></i>
      </button>
      <button class="check-btn" onclick="toggleDone(this)" title="Marcar como feito">
        <i class="ti ti-check"></i>
      </button>
    </div>
    ${specCells ? `<div class="specs">${specCells}</div>` : ''}
    <textarea class="obs-input" placeholder="Observações..." rows="1"
      oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>`;

  const ab = _targetSection.querySelector('.add-exercise-btn');
  _targetSection.insertBefore(card, ab);
  btn.closest('.modal-overlay').remove();
}

function initDragAndDrop(section) {
  let dragged = null;

  section.addEventListener('dragstart', e => {
    dragged = e.target.closest('.exercise-card');
    if (!dragged) return;
    setTimeout(() => dragged.classList.add('dragging'), 0);
  });

  section.addEventListener('dragend', () => {
    if (dragged) dragged.classList.remove('dragging');
    section.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('drag-over'));
    dragged = null;
  });

  section.addEventListener('dragover', e => {
    e.preventDefault();
    const target = e.target.closest('.exercise-card');
    if (!target || target === dragged) return;
    section.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('drag-over'));
    target.classList.add('drag-over');
  });

  section.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.exercise-card');
    if (!target || target === dragged) return;
    target.classList.remove('drag-over');
    const cards = [...section.querySelectorAll('.exercise-card')];
    const draggedIdx = cards.indexOf(dragged);
    const targetIdx  = cards.indexOf(target);
    if (draggedIdx < targetIdx) target.after(dragged);
    else target.before(dragged);
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
  valueEl.innerHTML = `<input class="spec-input" type="text" value="${current}">`;
  const input = valueEl.querySelector('input');
  input.focus();
  input.select();
  function save() {
    const val = input.value.trim() || current;
    valueEl.textContent = val;
  }
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { valueEl.textContent = current; }
  });
}

const sessionFiles = {};
const openTreinos = {};
let currentTreino = null;

function saveRecent(file) {
  sessionFiles[file.name] = file;
  try {
    const names = JSON.parse(localStorage.getItem('recentTreinos') || '[]');
    if (!names.includes(file.name)) names.unshift(file.name);
    localStorage.setItem('recentTreinos', JSON.stringify(names.slice(0, 10)));
  } catch(e) {}
}

function renderHome() {
  let recentNames = [];
  try { recentNames = JSON.parse(localStorage.getItem('recentTreinos') || '[]'); } catch(e) {}
  recentNames.sort((a, b) => a.localeCompare(b));

  const openNames   = Object.keys(openTreinos);
  const hasOpen     = openNames.length > 0;

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
        <button class="limpar-btn" onclick="limparTudo()"><i class="ti ti-trash"></i> Limpar tudo</button>
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
      ${window.Capacitor?.isNativePlatform?.() ? `<button class="registros-btn" onclick="verRegistros()"><i class="ti ti-history"></i> Ver registros</button>` : ''}
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

function limparTudo() {
  if (!confirm('Limpar todos os treinos em andamento?')) return;
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

function openRecent(name) {
  if (sessionFiles[name]) {
    loadFile(sessionFiles[name]);
  } else {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,text/markdown,text/plain';
    input.onchange = e => { if (e.target.files[0]) loadFile(e.target.files[0]); };
    input.click();
  }
}

function goHome() {
  renderHome();
}

function loadFile(file) {
  saveRecent(file);
  const reader = new FileReader();
  reader.onload = e => render(e.target.result, file.name);
  reader.readAsText(file);
}

renderHome();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
