let _listaRegistros = [];
let _modoSelecao    = false;

let _registroConteudo  = '';
let _registroTitulo    = '';
let _registroFileName  = '';

async function verRegistros() {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="registros-view"><div class="registros-header"><button class="icon-btn" onclick="renderHome()"><i class="ti ti-arrow-left"></i></button><h2>Registros</h2><div style="width:32px"></div></div><div style="padding:2rem;text-align:center;color:#636366">Carregando...</div></div>`;

  if (!window.Capacitor?.isNativePlatform?.()) {
    app.innerHTML = `<div class="registros-view"><div class="registros-header"><button class="icon-btn" onclick="renderHome()"><i class="ti ti-arrow-left"></i></button><h2>Registros</h2><div style="width:32px"></div></div><div style="padding:2rem;text-align:center;color:#636366">Disponível apenas no app nativo.</div></div>`;
    return;
  }

  try {
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    let files = [];
    try {
      const result = await Filesystem.readdir({ path: REGISTROS_DIR, directory: 'EXTERNAL' });
      files = result.files.filter(f => (f.name || f).toString().endsWith('.txt'));
    } catch(e) { /* pasta ainda não existe */ }

    if (!files.length) {
      app.innerHTML = `<div class="registros-view"><div class="registros-header"><button class="icon-btn" onclick="renderHome()"><i class="ti ti-arrow-left"></i></button><h2>Registros</h2><div style="width:32px"></div></div><div style="padding:2rem;text-align:center;color:#636366">Nenhum registro encontrado.</div></div>`;
      return;
    }

    const sorted = files
      .map(f => typeof f === 'string' ? f : f.name)
      .sort((a, b) => {
        const da = a.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || '';
        const db = b.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || '';
        return db.localeCompare(da);
      });

    const itemsHTML = sorted.map(name => {
      const label = name.replace(/\.txt$/, '');
      const m = label.match(/^(\d{4})-(\d{2})-(\d{2})\s+(.+?)(\s+-\d+)?$/);
      const dateStr   = m ? `${m[3]}/${m[2]}/${m[1]}` : '';
      const treinoStr = m ? m[4] : label;
      const sufixo    = m?.[5]?.trim() ?? '';
      const safeN = name.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
      return `<button class="registro-item" data-filename="${safeN}">
        <div class="selecao-check"><i class="ti ti-check"></i></div>
        <i class="ti ti-file-description registro-item-icon"></i>
        <div class="registro-item-info">
          <div class="registro-item-name">${treinoStr}${sufixo ? `<span style="font-size:12px;font-weight:400;color:#8e8e93;margin-left:6px">${sufixo}</span>` : ''}</div>
          ${dateStr ? `<div class="registro-item-date"><i class="ti ti-calendar" style="font-size:12px"></i> ${dateStr}</div>` : ''}
        </div>
        <i class="ti ti-chevron-right" style="color:#c7c7cc;font-size:18px;flex-shrink:0"></i>
      </button>`;
    }).join('');

    _listaRegistros = sorted;
    app.innerHTML = `<div class="registros-view"><div class="registros-header"><button class="icon-btn" onclick="renderHome()"><i class="ti ti-arrow-left"></i></button><h2>Registros</h2><button class="icon-btn" onclick="iniciarModoSelecao()" title="Exportar registros"><i class="ti ti-file-zip"></i></button></div><div class="registros-list">${itemsHTML}</div></div>`;

    app.querySelectorAll('.registro-item[data-filename]').forEach(btn => {
      const name = btn.dataset.filename;
      let timer = null;
      let longPressed = false;

      btn.addEventListener('click', () => {
        if (_modoSelecao) {
          btn.classList.toggle('selecionado');
          atualizarContadorSelecao();
        } else if (!longPressed) {
          mostrarRegistro(name);
        }
      });

      btn.addEventListener('touchstart', () => {
        longPressed = false;
        timer = setTimeout(() => { longPressed = true; confirmarDelecao(name); }, 600);
      }, { passive: true });
      btn.addEventListener('touchend',  () => clearTimeout(timer));
      btn.addEventListener('touchmove', () => clearTimeout(timer), { passive: true });

      btn.addEventListener('mousedown', () => {
        longPressed = false;
        timer = setTimeout(() => { longPressed = true; confirmarDelecao(name); }, 600);
      });
      btn.addEventListener('mouseup',    () => clearTimeout(timer));
      btn.addEventListener('mouseleave', () => clearTimeout(timer));
    });
  } catch(e) {
    app.innerHTML = `<div class="registros-view"><div class="registros-header"><button class="icon-btn" onclick="renderHome()"><i class="ti ti-arrow-left"></i></button><h2>Registros</h2><div style="width:32px"></div></div><div style="padding:2rem;text-align:center;color:#636366">Erro: ${e.message||e}</div></div>`;
  }
}

// --- Modo de seleção ---

function iniciarModoSelecao() {
  _modoSelecao = true;
  const view = document.querySelector('.registros-view');
  view?.classList.add('selecao-ativa');
  view?.querySelectorAll('.registro-item').forEach(b => b.classList.add('selecionado'));

  const bar = document.createElement('div');
  bar.className = 'selecao-bar';
  bar.id = 'selecao-bar';
  bar.innerHTML = `
    <button class="modal-cancel" style="flex:1" onclick="cancelarSelecao()">Cancelar</button>
    <button class="selecao-toggle-btn" id="selecao-toggle-btn" onclick="toggleSelecaoTodos()">Nenhum</button>
    <button class="modal-confirm" style="flex:2" id="selecao-exportar-btn" onclick="exportarRegistros()">Exportar todos</button>`;
  view?.appendChild(bar);
}

function cancelarSelecao() {
  _modoSelecao = false;
  const view = document.querySelector('.registros-view');
  view?.classList.remove('selecao-ativa');
  view?.querySelectorAll('.registro-item').forEach(b => b.classList.remove('selecionado'));
  document.getElementById('selecao-bar')?.remove();
}

function atualizarContadorSelecao() {
  const n = document.querySelectorAll('.registro-item.selecionado').length;
  const btn = document.getElementById('selecao-exportar-btn');
  const toggle = document.getElementById('selecao-toggle-btn');
  if (btn) {
    if (n === 0) btn.textContent = 'Exportar';
    else if (n === _listaRegistros.length) btn.textContent = 'Exportar todos';
    else btn.textContent = `Exportar ${n}`;
  }
  if (toggle) toggle.textContent = n > 0 ? 'Nenhum' : 'Todos';
}

function toggleSelecaoTodos() {
  const anySelected = document.querySelector('.registro-item.selecionado');
  document.querySelectorAll('.registro-item').forEach(b => {
    if (anySelected) b.classList.remove('selecionado');
    else b.classList.add('selecionado');
  });
  atualizarContadorSelecao();
}

// --- Delete ---

function confirmarDelecao(fileName) {
  const label = fileName.replace(/\.txt$/, '');
  const m = label.match(/^(\d{4})-(\d{2})-(\d{2})\s+(.+?)(\s+-\d+)?$/);
  const treinoStr = m ? m[4] : label;
  const dateStr   = m ? `${m[3]}/${m[2]}/${m[1]}` : '';
  const descricao = [treinoStr, dateStr].filter(Boolean).join(' — ');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <h3>Excluir registro?</h3>
      <p style="font-size:14px;color:#636366;margin:8px 0 16px">${descricao}</p>
      <div class="modal-actions">
        <button class="modal-cancel" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="modal-danger" onclick="deletarRegistro('${fileName.replace(/'/g, "\\'")}',this)">Excluir</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

async function deletarRegistro(fileName, btn) {
  btn.closest('.modal-overlay').remove();
  try {
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    await Filesystem.deleteFile({ path: `${REGISTROS_DIR}/${fileName}`, directory: 'EXTERNAL' });
    showToast('Registro excluído.');
    verRegistros();
  } catch(e) {
    alert('Erro ao excluir: ' + (e.message || e));
  }
}

// --- Exportar ---

async function exportarRegistros() {
  const selecionados = _modoSelecao
    ? [...document.querySelectorAll('.registro-item.selecionado')].map(b => b.dataset.filename)
    : _listaRegistros;

  if (!selecionados.length) { showToast('Nenhum registro selecionado.'); return; }
  cancelarSelecao();
  showToast('Gerando arquivo…');

  try {
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    const zip = new JSZip();

    for (const name of selecionados) {
      const result = await Filesystem.readFile({
        path: `${REGISTROS_DIR}/${name}`,
        directory: 'EXTERNAL',
        encoding: 'utf8',
      });
      zip.file(name, result.data);
    }

    const base64 = await zip.generateAsync({ type: 'base64' });
    const now = new Date();
    const ymd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const zipName = `registros-${ymd}.zip`;

    await Filesystem.writeFile({
      path: `wo/${zipName}`,
      data: base64,
      directory: 'EXTERNAL',
      recursive: true,
    });

    const { uri } = await Filesystem.getUri({ path: `wo/${zipName}`, directory: 'EXTERNAL' });
    await window.Capacitor.Plugins.Share.share({
      title: zipName,
      files: [uri],
      dialogTitle: 'Exportar registros',
    });

    await Filesystem.deleteFile({ path: `wo/${zipName}`, directory: 'EXTERNAL' });
  } catch(e) {
    if (e.name !== 'AbortError' && !/cancel/i.test(e.message)) {
      alert('Erro ao exportar: ' + (e.message || e));
    }
  }
}

// --- Visualizar registro ---

async function mostrarRegistro(fileName) {
  const app = document.getElementById('app');
  _registroFileName = fileName;
  app.innerHTML = `<div class="registro-detalhe"><div class="registros-header"><button class="icon-btn" onclick="verRegistros()"><i class="ti ti-arrow-left"></i></button><h2>Carregando...</h2><div style="width:32px"></div></div></div>`;

  try {
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    const result = await Filesystem.readFile({ path: `${REGISTROS_DIR}/${fileName}`, directory: 'EXTERNAL', encoding: 'utf8' });
    _registroConteudo = result.data;

    const label = fileName.replace(/\.txt$/,'');
    const m = label.match(/^(\d{4})-(\d{2})-(\d{2})\s+(.+?)(\s+-\d+)?$/);
    const sufixo    = m?.[5]?.trim() ?? '';
    const treinoStr = m ? m[4] : label;
    const dateStr   = m ? `${m[3]}/${m[2]}/${m[1]}` : '';

    const mHora = _registroConteudo.split('\n')[0].match(/as\s+(\d{2}:\d{2})/);
    const horaStr = mHora ? mHora[1] : '';

    _registroTitulo = [treinoStr, sufixo].filter(Boolean).join(' ');
    const subtitulo = [dateStr, horaStr].filter(Boolean).join(' - ');
    const tituloCompleto = subtitulo ? `${_registroTitulo} - ${subtitulo}` : _registroTitulo;

    const conteudo = _registroConteudo.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    app.innerHTML = `<div class="registro-detalhe">
      <div class="registros-header">
        <button class="icon-btn" onclick="verRegistros()"><i class="ti ti-arrow-left"></i></button>
        <h2 style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tituloCompleto}</h2>
        <button class="icon-btn" onclick="compartilharRegistro()" title="Compartilhar"><i class="ti ti-share"></i></button>
      </div>
      <pre class="registro-texto">${conteudo}</pre>
      <div style="padding:0.75rem 1rem calc(1.5rem + env(safe-area-inset-bottom))">
        <button class="registros-btn" style="width:100%" onclick="usarComoNovoTreino()"><i class="ti ti-file-plus"></i> Usar como novo Treino</button>
      </div>
    </div>`;
  } catch(e) {
    app.innerHTML = `<div class="registro-detalhe"><div class="registros-header"><button class="icon-btn" onclick="verRegistros()"><i class="ti ti-arrow-left"></i></button><h2>Erro</h2><div style="width:32px"></div></div><div style="padding:2rem;text-align:center;color:#636366">${e.message||e}</div></div>`;
  }
}

// --- Usar como novo treino ---

function usarComoNovoTreino() {
  const m = _registroFileName.replace(/\.txt$/, '').match(/^(\d{4}-\d{2}-\d{2})\s+(.+?)(\s+-\d+)?$/);
  const sugestao = (m ? m[2] : _registroTitulo).replace(/"/g, '&quot;');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <h3>Novo treino</h3>
      <div class="modal-field">
        <label>Nome do treino</label>
        <input id="novo-treino-nome" type="text" value="${sugestao}" placeholder="Ex: Treino A Léo">
      </div>
      <div class="modal-actions">
        <button class="modal-cancel">Cancelar</button>
        <button class="modal-confirm">Criar</button>
      </div>
    </div>`;
  overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('.modal-confirm').addEventListener('click', () => _criarTreinoDeRegistro(overlay));
  document.body.appendChild(overlay);
  setTimeout(() => {
    const input = document.getElementById('novo-treino-nome');
    if (input) { input.focus(); input.select(); }
  }, 50);
}

async function _criarTreinoDeRegistro(overlay) {
  const input = document.getElementById('novo-treino-nome');
  const nome = input.value.trim();
  if (!nome) { input.focus(); return; }

  const fileName = `${nome}.md`;
  const existe = await treinoExisteNoApp(fileName);

  overlay.remove();

  if (existe) {
    const confirmar = await _confirmarSubstituicao(fileName);
    if (!confirmar) { usarComoNovoTreino(); return; }
  }

  const subtitle = await _subtituloModal('');
  if (subtitle === null) return;

  try {
    const md = _parseRegistroParaMarkdown(nome, subtitle, _registroConteudo);
    await salvarTreinoNoApp(fileName, md);
    _setTreinoTipo(fileName, _tipoFromSubtitle(subtitle));

    // Renomear registro para refletir o nome do novo treino
    const mDate = _registroFileName.match(/^(\d{4}-\d{2}-\d{2})/);
    if (mDate) {
      const newRegFileName = `${mDate[1]} ${nome}.txt`;
      if (newRegFileName !== _registroFileName) {
        const Filesystem = window.Capacitor.Plugins.Filesystem;
        const original = await Filesystem.readFile({
          path: `${REGISTROS_DIR}/${_registroFileName}`,
          directory: 'EXTERNAL',
          encoding: 'utf8',
        });
        // Atualiza o subtítulo do registro (1ª linha: "NomeAntigo - DD/MM/AAAA as HH:MM")
        const regLines = original.data.split('\n');
        regLines[0] = regLines[0].replace(/^.+?(?=\s*-\s*\d{2}\/\d{2}\/\d{4})/, nome);
        await Filesystem.writeFile({
          path: `${REGISTROS_DIR}/${newRegFileName}`,
          data: regLines.join('\n'),
          directory: 'EXTERNAL',
          encoding: 'utf8',
          recursive: true,
        });
        await Filesystem.deleteFile({ path: `${REGISTROS_DIR}/${_registroFileName}`, directory: 'EXTERNAL' });
        _registroFileName = newRegFileName;
      }
    }

    editarTreino(fileName);
  } catch(e) {
    alert('Erro ao criar treino: ' + (e.message || e));
  }
}

function _parseRegistroParaMarkdown(nome, subtitle, conteudo) {
  const lines = conteudo.split('\n');

  const exercises  = []; // { name, equip, specs: {}, obs }
  const adicionados = []; // { name, equip }
  const ajustesMap = {}; // { exerciseName: { label: newValue } }

  let inExercicios  = false;
  let inAdicionados = false;
  let inAjustes     = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Known section headers
    if (line === 'EXERCÍCIOS')           { inExercicios = true;  inAdicionados = false; inAjustes = false; continue; }
    if (line === 'EXERCÍCIOS ADICIONADOS') { inAdicionados = true; inExercicios = false;  inAjustes = false; continue; }
    if (line === 'AJUSTES / EVOLUÇÃO')   { inAjustes = true;     inExercicios = false;  inAdicionados = false; continue; }
    // Any other section-like header (not starting with - and not indented) resets context
    if (!rawLine.startsWith('-') && !rawLine.startsWith('  ') && !rawLine.startsWith('[')) {
      inExercicios = false; inAdicionados = false; inAjustes = false;
    }

    if (inAjustes && rawLine.startsWith('- ')) {
      // "- ExerciseName: Label original > atual  |  Label2 original2 > atual2"
      const content = rawLine.slice(2);
      const ci = content.indexOf(': ');
      if (ci !== -1) {
        const exName = content.slice(0, ci).trim();
        ajustesMap[exName] = {};
        for (const item of content.slice(ci + 2).split('  |  ')) {
          const arrow = item.indexOf(' > ');
          if (arrow !== -1) {
            const label = item.slice(0, item.indexOf(' ')).trim(); // first word = label
            ajustesMap[exName][label] = item.slice(arrow + 3).trim();
          }
        }
      }
    }

    if (inAdicionados && rawLine.startsWith('- ')) {
      const content = rawLine.slice(2).trim();
      const m = content.match(/^(.+?)\s+\((.+)\)\s*$/);
      adicionados.push({ name: m ? m[1].trim() : content, equip: m ? m[2].trim() : '' });
    }

    if (inExercicios) {
      if (rawLine.startsWith('- ')) {
        const content = rawLine.slice(2).trim();
        const m = content.match(/^(.+?)\s+\((.+)\)\s*$/);
        exercises.push({ name: m ? m[1].trim() : content, equip: m ? m[2].trim() : '', specs: {}, obs: '' });
      } else if (rawLine.startsWith('  ') && exercises.length > 0) {
        if (line.startsWith('Obs: ')) {
          exercises[exercises.length - 1].obs = line.slice(5);
        } else {
          for (const part of line.split('  |  ')) {
            const ci = part.indexOf(': ');
            if (ci !== -1)
              exercises[exercises.length - 1].specs[part.slice(0, ci).trim()] = part.slice(ci + 2).trim();
          }
        }
      }
    }
  }

  // Aplicar ajustes nas specs dos exercícios
  for (const ex of exercises) {
    const adj = ajustesMap[ex.name];
    if (!adj) continue;
    if (adj['Séries'])    ex.specs['Séries']    = adj['Séries'];
    if (adj['Carga'])     ex.specs['Carga']      = adj['Carga'];
    if (adj['Regulagem']) ex.specs['Regulagem']  = adj['Regulagem'];
  }

  // Gerar markdown
  const mdLines = [`# ${nome}`, ''];
  if (subtitle) mdLines.push(subtitle, '');

  for (const ex of exercises) {
    mdLines.push(`## ${ex.name}`);
    if (ex.equip) {
      const loc = ex.specs['Localização'];
      mdLines.push(`[${ex.equip}]()${loc ? ' ' + loc : ''}`);
    }
    if (ex.specs['Séries'])    mdLines.push(ex.specs['Séries']);
    if (ex.specs['Carga'])     mdLines.push(`carga ${ex.specs['Carga']}`);
    if (ex.specs['Regulagem']) mdLines.push(`regulagem ${ex.specs['Regulagem']}`);
    mdLines.push('');
  }

  for (const ex of adicionados) {
    mdLines.push(`## ${ex.name}`);
    if (ex.equip) mdLines.push(`[${ex.equip}]()`);
    mdLines.push('');
  }

  return mdLines.join('\n').trimEnd();
}

async function compartilharRegistro() {
  try {
    if (window.Capacitor?.isNativePlatform?.()) {
      const Filesystem = window.Capacitor.Plugins.Filesystem;
      const Share = window.Capacitor.Plugins.Share;
      const uriResult = await Filesystem.getUri({ path: `${REGISTROS_DIR}/${_registroFileName}`, directory: 'EXTERNAL' });
      await Share.share({
        title: _registroFileName,
        files: [uriResult.uri],
        dialogTitle: 'Compartilhar registro',
      });
    } else if (navigator.share) {
      await navigator.share({ title: _registroTitulo, text: _registroConteudo });
    } else {
      alert('Compartilhamento não disponível neste dispositivo.');
    }
  } catch(e) {
    const canceled = e.name === 'AbortError'
      || /cancel/i.test(e.message)
      || /dismiss/i.test(e.message);
    if (canceled) showToast('Compartilhamento cancelado.');
    else alert('Erro ao compartilhar: ' + e.message);
  }
}
