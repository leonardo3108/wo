const TREINOS_DIR = 'wo/treinos';
const TREINO_META_KEY = 'treinoMeta';

function _tipoFromSubtitle(subtitle) {
  const TIPOS = ['Musculação', 'Aeróbico', 'Outros'];
  const t = (subtitle || '').split(' - ')[0];
  return TIPOS.includes(t) ? t : 'Musculação';
}

function getTipoIcone(tipo) {
  if (tipo === 'Aeróbico') return 'ti-run';
  if (tipo === 'Outros')   return 'ti-stretching';
  return 'ti-barbell';
}

function _getTreinoTipo(fileName) {
  try { return JSON.parse(localStorage.getItem(TREINO_META_KEY) || '{}')[fileName] || 'Musculação'; }
  catch(e) { return 'Musculação'; }
}

function _setTreinoTipo(fileName, tipo) {
  try {
    const meta = JSON.parse(localStorage.getItem(TREINO_META_KEY) || '{}');
    meta[fileName] = tipo;
    localStorage.setItem(TREINO_META_KEY, JSON.stringify(meta));
  } catch(e) {}
}

function _removeTreinoMeta(fileName) {
  try {
    const meta = JSON.parse(localStorage.getItem(TREINO_META_KEY) || '{}');
    delete meta[fileName];
    localStorage.setItem(TREINO_META_KEY, JSON.stringify(meta));
  } catch(e) {}
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

function saveRecent(file) {
  sessionFiles[file.name] = file;
  try {
    const names = JSON.parse(localStorage.getItem('recentTreinos') || '[]');
    if (!names.includes(file.name)) names.unshift(file.name);
    localStorage.setItem('recentTreinos', JSON.stringify(names.slice(0, 10)));
  } catch(e) {}
}

// --- Filesystem (nativo) ---

function _lerArquivoComoTexto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function _confirmarSubstituicao(fileName) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-handle"></div>
        <h3>Substituir treino?</h3>
        <p style="font-size:14px;color:#636366;margin:8px 0 16px">"${fileName}" já está salvo no app.</p>
        <div class="modal-actions">
          <button class="modal-cancel">Cancelar</button>
          <button class="modal-danger">Substituir</button>
        </div>
      </div>`;
    overlay.querySelector('.modal-cancel').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('.modal-danger').onclick = () => { overlay.remove(); resolve(true); };
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    document.body.appendChild(overlay);
  });
}

async function treinoExisteNoApp(fileName) {
  try {
    await window.Capacitor.Plugins.Filesystem.stat({
      path: `${TREINOS_DIR}/${fileName}`,
      directory: 'EXTERNAL',
    });
    return true;
  } catch(e) {
    return false;
  }
}

async function salvarTreinoNoApp(fileName, content) {
  await window.Capacitor.Plugins.Filesystem.writeFile({
    path: `${TREINOS_DIR}/${fileName}`,
    data: content,
    directory: 'EXTERNAL',
    encoding: 'utf8',
    recursive: true,
  });
}

async function lerTreinoDoApp(fileName) {
  const result = await window.Capacitor.Plugins.Filesystem.readFile({
    path: `${TREINOS_DIR}/${fileName}`,
    directory: 'EXTERNAL',
    encoding: 'utf8',
  });
  return result.data;
}

async function listarTreinosNoApp() {
  try {
    const result = await window.Capacitor.Plugins.Filesystem.readdir({
      path: TREINOS_DIR,
      directory: 'EXTERNAL',
    });
    return result.files
      .map(f => typeof f === 'string' ? f : f.name)
      .filter(n => n.endsWith('.md'))
      .sort((a, b) => a.localeCompare(b));
  } catch(e) {
    return [];
  }
}

// --- loadFile / openRecent ---

async function loadFile(file) {
  if (window.Capacitor?.isNativePlatform?.()) {
    const content = await _lerArquivoComoTexto(file);
    const existe = await treinoExisteNoApp(file.name);
    if (existe) {
      const confirmar = await _confirmarSubstituicao(file.name);
      if (!confirmar) return;
    }
    await salvarTreinoNoApp(file.name, content);
    render(content, file.name);
  } else {
    saveRecent(file);
    const reader = new FileReader();
    reader.onload = e => render(e.target.result, file.name);
    reader.readAsText(file);
  }
}

// --- Tela de gerenciamento de treinos ---

async function verTreinos() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="registros-view">
      <div class="registros-header">
        <button class="icon-btn" onclick="renderHome()"><i class="ti ti-arrow-left"></i></button>
        <h2>Treinos</h2>
        <div style="width:32px"></div>
      </div>
      <div style="padding:2rem;text-align:center;color:#636366">Carregando...</div>
    </div>`;

  const names = await listarTreinosNoApp();

  const itemsHTML = names.map(name => {
    const label = name.replace(/\.md$/i, '');
    const safeN = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const icone = getTipoIcone(_getTreinoTipo(name));
    return `<button class="registro-item" data-filename="${safeN}">
      <i class="ti ${icone} registro-item-icon"></i>
      <div class="registro-item-info">
        <div class="registro-item-name">${label}</div>
      </div>
      <i class="ti ti-chevron-right" style="color:#c7c7cc;font-size:18px;flex-shrink:0"></i>
    </button>`;
  }).join('');

  app.innerHTML = `
    <div class="registros-view">
      <div class="registros-header">
        <button class="icon-btn" onclick="renderHome()"><i class="ti ti-arrow-left"></i></button>
        <h2>Treinos</h2>
        <div style="width:32px"></div>
      </div>
      ${names.length
        ? `<div class="registros-list">${itemsHTML}</div>`
        : `<div style="padding:2rem;text-align:center;color:#636366">Nenhum treino salvo</div>`}
      <div style="padding:1.5rem 1rem 1rem;display:flex;flex-direction:column;gap:8px">
        <button class="registros-btn" onclick="novoTreino()"><i class="ti ti-plus"></i> Novo treino</button>
        <label class="registros-btn" style="font-family:inherit;display:flex;box-sizing:border-box">
          <i class="ti ti-folder-open"></i> Abrir treino
          <input type="file" accept=".md,text/markdown,text/plain" onchange="loadFile(this.files[0])" style="display:none">
        </label>
      </div>
    </div>`;

  app.querySelectorAll('.registro-item[data-filename]').forEach(btn => {
    const name = btn.dataset.filename;
    let timer = null;
    let longPressed = false;

    btn.addEventListener('click', () => {
      if (!longPressed) editarTreino(name);
    });

    btn.addEventListener('touchstart', () => {
      longPressed = false;
      timer = setTimeout(() => { longPressed = true; confirmarDelecaoTreino(name); }, 600);
    }, { passive: true });
    btn.addEventListener('touchend',  () => clearTimeout(timer));
    btn.addEventListener('touchmove', () => clearTimeout(timer), { passive: true });

    btn.addEventListener('mousedown', () => {
      longPressed = false;
      timer = setTimeout(() => { longPressed = true; confirmarDelecaoTreino(name); }, 600);
    });
    btn.addEventListener('mouseup',    () => clearTimeout(timer));
    btn.addEventListener('mouseleave', () => clearTimeout(timer));
  });
}

function confirmarDelecaoTreino(fileName) {
  const label = fileName.replace(/\.md$/, '');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <h3>Excluir treino?</h3>
      <p style="font-size:14px;color:#636366;margin:8px 0 16px">${label}</p>
      <div class="modal-actions">
        <button class="modal-cancel" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="modal-danger" onclick="deletarTreinoDoApp('${fileName.replace(/'/g, "\\'")}', this)">Excluir</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

async function deletarTreinoDoApp(fileName, btn) {
  btn.closest('.modal-overlay').remove();
  try {
    await window.Capacitor.Plugins.Filesystem.deleteFile({
      path: `${TREINOS_DIR}/${fileName}`,
      directory: 'EXTERNAL',
    });
    _removeTreinoMeta(fileName);
    showToast('Treino excluído.');
    verTreinos();
  } catch(e) {
    alert('Erro ao excluir: ' + (e.message || e));
  }
}

// --- Modo edição de treino ---

let _treinoEditFileName = null;
let _treinoPodeCompartilhar = false;

async function editarTreino(fileName) {
  _treinoEditFileName = fileName;
  _treinoPodeCompartilhar = true;  // arquivo já está no disco

  const content = await lerTreinoDoApp(fileName);
  const { title, subtitle, sections } = parseMarkdown(content);
  _setTreinoTipo(fileName, _tipoFromSubtitle(subtitle));
  const node = buildTreinoNode(title, subtitle, sections, fileName, true);

  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(node);
}

function editSubtitulo(el) {
  const TIPOS    = ['Musculação', 'Aeróbico', 'Outros'];
  const SUBTIPOS = ['Parte superior', 'Parte inferior', 'Completa'];

  // Parse subtítulo atual
  let tipo = 'Musculação', subtipo = '';
  const raw = el.textContent.trim();
  if (!raw.includes('adicionar subtítulo')) {
    const sep = raw.indexOf(' - ');
    if (sep !== -1) {
      const t = raw.slice(0, sep);
      if (TIPOS.includes(t)) { tipo = t; subtipo = raw.slice(sep + 3); }
    } else if (TIPOS.includes(raw)) {
      tipo = raw;
    }
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  document.body.appendChild(overlay);

  function draw() {
    const isFree = tipo !== 'Musculação';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-handle"></div>
        <h3>Tipo de treino</h3>
        <div class="modal-field">
          <label>Tipo</label>
          <div class="pill-group">
            ${TIPOS.map(t =>
              `<button class="pill-btn${tipo === t ? ' active' : ''}" data-tipo="${t}">${t}</button>`
            ).join('')}
          </div>
        </div>
        ${!isFree ? `
        <div class="modal-field">
          <label>Parte do corpo</label>
          <div class="pill-group">
            ${SUBTIPOS.map(s =>
              `<button class="pill-btn${subtipo === s ? ' active' : ''}" data-sub="${s}">${s}</button>`
            ).join('')}
          </div>
        </div>` : `
        <div class="modal-field">
          <label>Descrição <span style="font-weight:400;color:#8e8e93">(opcional)</span></label>
          <input id="sub-input" type="text" value="${subtipo}"
            placeholder="${tipo === 'Aeróbico' ? 'Ex: Corrida, Natação...' : 'Ex: Yoga, Pilates...'}">
        </div>`}
        <div class="modal-actions">
          <button class="modal-cancel">Cancelar</button>
          <button class="modal-confirm">OK</button>
        </div>
      </div>`;

    overlay.querySelectorAll('[data-tipo]').forEach(btn => btn.addEventListener('click', () => {
      tipo = btn.dataset.tipo;
      subtipo = '';
      draw();
    }));
    overlay.querySelectorAll('[data-sub]').forEach(btn => btn.addEventListener('click', () => {
      subtipo = btn.dataset.sub;
      draw();
    }));

    overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('.modal-confirm').addEventListener('click', () => {
      if (isFree) subtipo = overlay.querySelector('#sub-input')?.value.trim() || '';
      el.textContent = subtipo ? `${tipo} - ${subtipo}` : tipo;
      el.style.opacity = '';
      overlay.remove();
      if (_treinoEditFileName) _treinoPodeCompartilhar = false;
    });

    if (isFree) setTimeout(() => overlay.querySelector('#sub-input')?.focus(), 50);
  }

  draw();
}

function confirmarRemocaoSection(btn) {
  const section = btn.closest('.section');
  const name = section.querySelector('.section-title span')?.textContent.trim()
            || section.querySelector('.section-title')?.textContent.trim()
            || 'esta atividade';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <h3>Remover atividade?</h3>
      <p style="font-size:14px;color:#636366;margin:8px 0 16px">${name}</p>
      <div class="modal-actions">
        <button class="modal-cancel">Cancelar</button>
        <button class="modal-danger">Remover</button>
      </div>
    </div>`;
  overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.modal-danger').addEventListener('click', () => {
    section.remove();
    overlay.remove();
    if (_treinoEditFileName) _treinoPodeCompartilhar = false;
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function editIntervalBlock(el) {
  const sub = el.closest('.subsection');
  if (!sub) return;

  const items = [...sub.querySelectorAll('.interval-item')];
  const current = items.map(item => {
    const phase   = item.querySelector('.interval-header')?.textContent.trim() || '';
    const details = [...item.querySelectorAll('.interval-details span')].map(s => s.textContent.trim());
    return [phase, ...details].filter(Boolean).join(' - ');
  }).join('\n');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <h3>Editar linhas</h3>
      <p style="font-size:13px;color:#8e8e93;margin:4px 0 12px">Uma por linha. Use " - " para separar fase, duração, zona/bpm...</p>
      <textarea id="interval-ta" rows="8" style="width:100%;font:inherit;font-size:14px;padding:8px;border:1.5px solid #e0e0e5;border-radius:8px;resize:vertical;box-sizing:border-box">${current}</textarea>
      <div class="modal-actions" style="margin-top:12px">
        <button class="modal-cancel">Cancelar</button>
        <button class="modal-confirm">OK</button>
      </div>
    </div>`;

  overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('.modal-confirm').addEventListener('click', () => {
    const lines = overlay.querySelector('#interval-ta').value
      .split('\n').map(l => l.trim()).filter(Boolean);

    // remove itens existentes
    items.forEach(i => i.remove());

    // insere novos antes do botão "+ Linha"
    const addBtn = sub.querySelector('.add-line-btn');
    for (const line of lines) {
      const [phase, ...rest] = line.split(' - ');
      const item = document.createElement('div');
      item.className = 'interval-item';
      item.setAttribute('onclick', 'editIntervalBlock(this)');
      item.style.cursor = 'pointer';
      item.innerHTML = `<div class="interval-header">${phase}</div>`
        + (rest.length ? `<div class="interval-details">${rest.map(p => `<span>${p}</span>`).join('')}</div>` : '');
      if (addBtn) sub.insertBefore(item, addBtn);
      else sub.appendChild(item);
    }

    overlay.remove();
    if (_treinoEditFileName) _treinoPodeCompartilhar = false;
  });

  document.body.appendChild(overlay);
  setTimeout(() => {
    const ta = overlay.querySelector('#interval-ta');
    ta?.focus();
    ta?.setSelectionRange(ta.value.length, ta.value.length);
  }, 50);
}

function addStretchItem(btn) {
  const list = btn.closest('.stretch-list');
  const item = document.createElement('div');
  item.className = 'stretch-item';
  const span = document.createElement('span');
  span.setAttribute('onclick', 'editInPlace(this)');
  span.style.cursor = 'pointer';
  span.textContent = 'Novo item';
  item.appendChild(span);
  list.insertBefore(item, btn);
  editInPlace(span);
  if (_treinoEditFileName) _treinoPodeCompartilhar = false;
}

function editInPlace(el) {
  if (el.querySelector('input')) return;
  const current = el.textContent.trim();
  el.textContent = '';
  const input = document.createElement('input');
  input.value = current;
  input.style.cssText = 'font:inherit;font-weight:inherit;font-size:inherit;color:inherit;text-align:inherit;background:transparent;border:none;border-bottom:2px solid #1a56db;outline:none;width:100%;';
  el.appendChild(input);
  input.focus();
  input.select();
  function save() {
    el.textContent = input.value.trim() || current;
    if (_treinoEditFileName) _treinoPodeCompartilhar = false;
  }
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { el.textContent = current; }
  });
}


function serializarTreinoParaMarkdown(node) {
  const lines = [];

  const title = node.querySelector('h1')?.textContent.trim() || '';
  lines.push(`# ${title}`, '');

  const subtitleEl = node.querySelector('.header p');
  const subtitle   = subtitleEl?.textContent.trim();
  if (subtitle && !subtitle.includes('adicionar subtítulo')) lines.push(subtitle, '');

  const isAerobic = (subtitle || '').startsWith('Aeróbico');

  // Filtra header e edit-bar para processar apenas o conteúdo
  const children = [...node.children].filter(c =>
    !c.classList.contains('header') && !c.classList.contains('edit-bar')
  );

  // Verifica se uma section de exercícios tem cards
  function hasCards(el) {
    return el.classList.contains('exercises-section') &&
           el.querySelectorAll('.exercise-card').length > 0;
  }

  // Determina título de seção cárdio (musculação/misto): posição relativa aos exercícios
  function getCardioTitle(idx) {
    const before = children.slice(0, idx).some(hasCards);
    const after  = children.slice(idx + 1).some(hasCards);
    if (!before) return 'Aquecimento';
    if (!after)  return 'Pós-Treino';
    return 'Cárdio';
  }

  // Pré-computação para treinos aeróbicos: índice de cada grupo de cárdio
  const _cardioGroupStarts = [];
  if (isAerobic) {
    let k = 0;
    while (k < children.length) {
      if (children[k].dataset?.type === 'cardio') {
        _cardioGroupStarts.push(k);
        while (k < children.length && children[k].dataset?.type === 'cardio') k++;
      } else k++;
    }
  }

  // Aquecimento → Desenvolvimento → Desaquecimento
  function getAerobicCardioTitle(startIdx) {
    const n     = _cardioGroupStarts.indexOf(startIdx);
    const total = _cardioGroupStarts.length;
    if (n === 0) return 'Aquecimento';
    if (n === total - 1 && total > 1) return 'Desaquecimento';
    return 'Desenvolvimento';
  }

  // Serializa os intervalos de uma subsection
  function serializeSubsection(sub) {
    const subTitle = sub.querySelector('.sub-title-text')?.textContent.trim();
    if (subTitle) lines.push(`### ${subTitle}`);
    for (const interval of sub.querySelectorAll('.interval-item')) {
      const p = interval.querySelector('.interval-header')?.textContent.trim();
      const r = [...interval.querySelectorAll('.interval-details span')].map(s => s.textContent.trim());
      if (p) lines.push([p, ...r].filter(Boolean).join(' - '));
    }
    lines.push('');
  }

  let i = 0;
  while (i < children.length) {
    const child = children[i];

    // Seções de cárdio adicionadas via modal (data-type="cardio")
    // Seções adjacentes são agrupadas sob um único ## com subsections ###
    if (child.dataset?.type === 'cardio') {
      const startIdx = i;
      const group = [];
      while (i < children.length && children[i].dataset?.type === 'cardio') {
        group.push(children[i]);
        i++;
      }
      const cardioLabel = isAerobic ? getAerobicCardioTitle(startIdx) : getCardioTitle(startIdx);
      lines.push(`## ${cardioLabel}`, '');
      group.forEach(cardio => cardio.querySelectorAll('.subsection').forEach(serializeSubsection));
      continue;
    }

    if (child.classList.contains('section')) {
      const secTitle = child.querySelector('.section-title')?.textContent.trim() || '';
      lines.push(`## ${secTitle}`, '');

      const stretchList = child.querySelector('.stretch-list');
      if (stretchList) {
        for (const item of stretchList.querySelectorAll('.stretch-item')) {
          const text = (item.querySelector('span') || item).textContent.trim();
          if (text) lines.push(text);
        }
        lines.push('');
      } else {
        child.querySelectorAll('.subsection').forEach(serializeSubsection);
      }
    }

    if (child.classList.contains('exercises-section')) {
      for (const card of child.querySelectorAll('.exercise-card')) {
        const exerciseName = card.querySelector('.exercise-name')?.textContent.trim();
        if (!exerciseName) continue;
        lines.push(`## ${exerciseName}`);

        const specMap = {};
        for (const specItem of card.querySelectorAll('.spec-item')) {
          const label = specItem.querySelector('.spec-label')?.textContent.trim();
          const value = (specItem.querySelector('.spec-value') || specItem.querySelector('.spec-value-sm'))?.textContent.trim();
          if (label && value) specMap[label] = value;
        }

        const equipDiv = card.querySelector('.equipment');
        if (equipDiv) {
          const nameEl   = equipDiv.querySelector('.equipment-name') ?? equipDiv.querySelector('a');
          const equipName = nameEl?.textContent.trim() || '';
          const url       = equipDiv.dataset.url ?? equipDiv.querySelector('a')?.href ?? '';
          const loc       = specMap['Localização'] || '';
          if (equipName) lines.push(`[${equipName}](${url})${loc ? ` ${loc}` : ''}`);
        }

        if (specMap['Séries'])    lines.push(specMap['Séries']);
        if (specMap['Carga'])     lines.push(`carga ${specMap['Carga']}`);
        if (specMap['Regulagem']) lines.push(`regulagem ${specMap['Regulagem']}`);

        lines.push('');
      }
    }

    i++;
  }

  return lines.join('\n').trimEnd();
}

async function salvarTreinoEditado() {
  document.activeElement?.blur();
  const editNode = document.querySelector('.treino-content');
  if (!editNode || !_treinoEditFileName) return;

  const md = serializarTreinoParaMarkdown(editNode);
  try {
    await salvarTreinoNoApp(_treinoEditFileName, md);
    const subtitleEl = editNode.querySelector('.header p');
    const subtitleRaw = subtitleEl?.textContent.trim() || '';
    if (!subtitleRaw.includes('adicionar subtítulo'))
      _setTreinoTipo(_treinoEditFileName, _tipoFromSubtitle(subtitleRaw));
    _treinoPodeCompartilhar = true;
    showToast('Treino salvo.');
  } catch(e) {
    alert('Erro ao salvar: ' + (e.message || e));
  }
}

async function compartilharTreinoEditado() {
  if (!_treinoPodeCompartilhar) {
    showToast('Salve o treino antes de compartilhar.');
    return;
  }
  try {
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    const uriResult  = await Filesystem.getUri({ path: `${TREINOS_DIR}/${_treinoEditFileName}`, directory: 'EXTERNAL' });
    await window.Capacitor.Plugins.Share.share({
      title: _treinoEditFileName,
      files: [uriResult.uri],
      dialogTitle: 'Compartilhar treino',
    });
  } catch(e) {
    const canceled = e.name === 'AbortError' || /cancel/i.test(e.message) || /dismiss/i.test(e.message);
    if (!canceled) alert('Erro ao compartilhar: ' + (e.message || e));
  }
}

function duplicarTreino() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <h3>Duplicar treino</h3>
      <div class="modal-field">
        <label>Novo título</label>
        <input id="dup-title" type="text" placeholder="Ex: Treino A2 Léo">
      </div>
      <div class="modal-actions">
        <button class="modal-cancel" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="modal-confirm" onclick="confirmarDuplicacao(this)">Duplicar</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  document.getElementById('dup-title').focus();
}

async function confirmarDuplicacao(btn) {
  const input    = document.getElementById('dup-title');
  const newTitle = input.value.trim();
  if (!newTitle) { input.focus(); return; }

  const newFileName = `${newTitle}.md`;
  const existe = await treinoExisteNoApp(newFileName);
  if (existe) {
    input.style.boxShadow = '0 0 0 2px #ff3b30';
    input.placeholder = 'Já existe um treino com este título';
    input.value = '';
    input.focus();
    return;
  }

  btn.closest('.modal-overlay').remove();

  document.activeElement?.blur();
  const editNode = document.querySelector('.treino-content');
  const md       = serializarTreinoParaMarkdown(editNode);
  const newMd    = md.replace(/^# .+/m, `# ${newTitle}`);

  try {
    await salvarTreinoNoApp(newFileName, newMd);
    _setTreinoTipo(newFileName, _getTreinoTipo(_treinoEditFileName));
    showToast('Treino duplicado.');
  } catch(e) {
    alert('Erro ao duplicar: ' + (e.message || e));
  }
}

// --- Novo treino ---

function novoTreino() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <h3>Novo treino</h3>
      <div class="modal-field">
        <label>Título</label>
        <input id="novo-titulo" type="text" placeholder="Ex: Treino A Léo">
      </div>
      <div class="modal-actions">
        <button class="modal-cancel">Cancelar</button>
        <button class="modal-confirm">Criar</button>
      </div>
    </div>`;
  overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('.modal-confirm').addEventListener('click', () => criarNovoTreino(overlay));
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('novo-titulo')?.focus(), 50);
}

async function criarNovoTreino(overlay) {
  const input = document.getElementById('novo-titulo');
  const title = input.value.trim();
  if (!title) { input.focus(); return; }

  const fileName = `${title}.md`;
  const existe = await treinoExisteNoApp(fileName);
  if (existe) {
    input.style.boxShadow = '0 0 0 2px #ff3b30';
    input.value = '';
    input.placeholder = 'Já existe um treino com este título';
    input.focus();
    return;
  }

  try {
    await salvarTreinoNoApp(fileName, `# ${title}\n`);
    overlay.remove();
    editarTreino(fileName);
  } catch(e) {
    alert('Erro ao criar treino: ' + (e.message || e));
  }
}

// --- openRecent ---

async function openRecent(name) {
  if (window.Capacitor?.isNativePlatform?.()) {
    try {
      const content = await lerTreinoDoApp(name);
      render(content, name);
    } catch(e) {
      alert('Erro ao abrir treino: ' + (e.message || e));
    }
  } else {
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
}
