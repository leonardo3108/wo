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

// Retorna Promise<string|null> — null se o usuário cancelar.
function _subtituloModal(current) {
  return new Promise(resolve => {
    const TIPOS    = ['Musculação', 'Aeróbico', 'Outros'];
    const SUBTIPOS = ['Parte superior', 'Parte inferior', 'Completa'];

    let tipo = 'Musculação', subtipo = '';
    if (current && !current.includes('adicionar subtítulo')) {
      const sep = current.indexOf(' - ');
      if (sep !== -1) {
        const t = current.slice(0, sep);
        if (TIPOS.includes(t)) { tipo = t; subtipo = current.slice(sep + 3); }
      } else if (TIPOS.includes(current)) {
        tipo = current;
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
        tipo = btn.dataset.tipo; subtipo = ''; draw();
      }));
      overlay.querySelectorAll('[data-sub]').forEach(btn => btn.addEventListener('click', () => {
        subtipo = btn.dataset.sub; draw();
      }));

      overlay.querySelector('.modal-cancel').addEventListener('click', () => { overlay.remove(); resolve(null); });
      overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(null); } });

      overlay.querySelector('.modal-confirm').addEventListener('click', () => {
        if (isFree) subtipo = overlay.querySelector('#sub-input')?.value.trim() || '';
        overlay.remove();
        resolve(subtipo ? `${tipo} - ${subtipo}` : tipo);
      });

      if (isFree) setTimeout(() => overlay.querySelector('#sub-input')?.focus(), 50);
    }

    draw();
  });
}

function editSubtitulo(el) {
  _subtituloModal(el.textContent.trim()).then(result => {
    if (result !== null) {
      el.textContent = result;
      el.style.opacity = '';
      if (_treinoEditFileName) _treinoPodeCompartilhar = false;
    }
  });
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

    items.forEach(i => i.remove());

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

  const children = [...node.children].filter(c =>
    !c.classList.contains('header') && !c.classList.contains('edit-bar')
  );

  function hasCards(el) {
    return el.classList.contains('exercises-section') &&
           el.querySelectorAll('.exercise-card').length > 0;
  }

  function getCardioTitle(idx) {
    const before = children.slice(0, idx).some(hasCards);
    const after  = children.slice(idx + 1).some(hasCards);
    if (!before) return 'Aquecimento';
    if (!after)  return 'Pós-Treino';
    return 'Cárdio';
  }

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

  function getAerobicCardioTitle(startIdx) {
    const n     = _cardioGroupStarts.indexOf(startIdx);
    const total = _cardioGroupStarts.length;
    if (n === 0) return 'Aquecimento';
    if (n === total - 1 && total > 1) return 'Desaquecimento';
    return 'Desenvolvimento';
  }

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
