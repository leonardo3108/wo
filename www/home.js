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
      ${hasOpen ? `<button class="registrar-btn" onclick="registrar()"><i class="ti ti-flag-check"></i> Concluir treino</button>` : ''}
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
      ${hasOpen ? `<button class="registrar-btn" onclick="registrar()"><i class="ti ti-flag-check"></i> Concluir treino</button>` : ''}
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
