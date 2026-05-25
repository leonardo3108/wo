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

// --- Tela de lista de treinos ---

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

// --- Duplicar treino ---

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
