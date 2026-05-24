const TREINOS_DIR = 'wo/treinos';

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
    return `<button class="registro-item" data-filename="${safeN}">
      <i class="ti ti-barbell registro-item-icon"></i>
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
      <div style="padding:1.5rem 1rem 1rem">
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
      if (!longPressed) openRecent(name);
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
    showToast('Treino excluído.');
    verTreinos();
  } catch(e) {
    alert('Erro ao excluir: ' + (e.message || e));
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
