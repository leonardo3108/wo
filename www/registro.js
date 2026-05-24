function coletarTreino(node, linhas) {
  let temAlgo = false;
  for (const bloco of node.children) {
    if (bloco.classList.contains('section')) {
      const secTitulo = bloco.querySelector('.section-title')?.textContent.trim();
      const doneSubs  = [...bloco.querySelectorAll('.subsection.done')];
      const doneStretches = [...bloco.querySelectorAll('.stretch-item.done')];

      if (doneSubs.length) {
        linhas.push(secTitulo.toUpperCase());
        doneSubs.forEach(sub => {
          linhas.push(`- ${sub.querySelector('.sub-title-text')?.textContent.trim()}`);
          temAlgo = true;
        });
        linhas.push('');
      }
      if (doneStretches.length) {
        linhas.push(secTitulo.toUpperCase());
        doneStretches.forEach(el => {
          linhas.push(`- ${el.childNodes[0]?.textContent.trim()}`);
          temAlgo = true;
        });
        linhas.push('');
      }
    }
    if (bloco.classList.contains('exercises-section')) {
      const doneCards = [...bloco.querySelectorAll('.exercise-card')].filter(c => c.querySelector('.check-btn.done'));
      if (doneCards.length) {
        linhas.push('EXERCÍCIOS');
        doneCards.forEach(card => {
          const nome  = card.querySelector('.exercise-name')?.textContent.trim();
          const equip = card.querySelector('.equipment a')?.textContent.trim();
          linhas.push(`- ${nome}${equip ? ` (${equip})` : ''}`);
          const specs = [...card.querySelectorAll('.spec-item')].map(s =>
            `${s.querySelector('.spec-label')?.textContent.trim()}: ${s.querySelector('.spec-value, .spec-value-sm')?.textContent.trim()}`
          );
          if (specs.length) linhas.push(`  ${specs.join('  |  ')}`);
          const obs = card.querySelector('.obs-input')?.value.trim();
          if (obs) linhas.push(`  Obs: ${obs}`);
          temAlgo = true;
        });
        linhas.push('');
      }
    }
  }
  return temAlgo;
}

function coletarAjustes(node) {
  const ajustes = [];
  [...node.querySelectorAll('.exercise-card')].filter(c => c.querySelector('.check-btn.done')).forEach(card => {
    const nome  = card.querySelector('.exercise-name')?.textContent.trim();
    const itens = [];
    card.querySelectorAll('.spec-item.editable[data-original]').forEach(item => {
      const original = item.dataset.original;
      const atual    = item.querySelector('.spec-value')?.textContent.trim();
      const label    = item.querySelector('.spec-label')?.textContent.trim();
      if (atual && atual !== original) itens.push(`${label} ${original} > ${atual}`);
    });
    if (itens.length) ajustes.push(`- ${nome}: ${itens.join('  |  ')}`);
  });
  return ajustes;
}

async function registrar() {
  const now  = new Date();
  const data = now.toLocaleDateString('pt-BR');
  const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const ymd  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const dadosTreinos = [];
  for (const [, treino] of Object.entries(openTreinos)) {
    const linhasTreino = [];
    const achou = coletarTreino(treino.node, linhasTreino);
    const aj = coletarAjustes(treino.node);
    if (achou) dadosTreinos.push({ title: treino.title, linhas: linhasTreino, ajustes: aj });
  }

  if (!dadosTreinos.length) { alert('Nenhum exercício marcado como feito.'); return; }

  const multiplo = dadosTreinos.length > 1;
  const titulos  = dadosTreinos.map(d => d.title);
  const linhas   = [`${titulos.join(' + ')} - ${data} as ${hora}`, ''];
  const todosAjustes = [];

  for (const d of dadosTreinos) {
    if (multiplo) linhas.push(`== ${d.title} ==`, '');
    linhas.push(...d.linhas);
    todosAjustes.push(...d.ajustes.map(l => multiplo ? `[${d.title}] ${l.slice(2)}` : l));
  }

  if (todosAjustes.length) {
    linhas.push('AJUSTES / EVOLUÇÃO');
    todosAjustes.forEach(l => linhas.push(l));
  }

  const texto    = linhas.join('\n');
  const baseName = `${ymd} ${titulos.join(' ')}`;

  // Capacitor nativo (Android/iOS)
  if (window.Capacitor?.isNativePlatform?.()) {
    try {
      const Filesystem = window.Capacitor.Plugins.Filesystem;
      const perm = await Filesystem.requestPermissions();
      if (perm.publicStorage === 'denied') {
        alert('Permissão de armazenamento negada. Habilite nas configurações do app.');
        return;
      }
      let existentes = [];
      try {
        const dir = await Filesystem.readdir({ path: 'wo', directory: 'EXTERNAL' });
        existentes = dir.files.map(f => typeof f === 'string' ? f : f.name);
      } catch(e) { /* pasta ainda não existe */ }
      let fileName = `${baseName}.txt`;
      let i = 1;
      while (existentes.includes(fileName)) fileName = `${baseName} -${i++}.txt`;

      await Filesystem.writeFile({
        path: `wo/${fileName}`,
        data: texto,
        directory: 'EXTERNAL',
        encoding: 'utf8',
        recursive: true,
      });
      alert(`Salvo: ${fileName}`);
      return;
    } catch(e) {
      alert('Erro ao salvar: ' + (e.message || JSON.stringify(e)));
      return;
    }
  }

  const fileName = `${baseName}.txt`;

  // Browser: showSaveFilePicker
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'Texto', accept: { 'text/plain': ['.txt'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(texto);
      await writable.close();
      return;
    } catch(e) {
      if (e.name === 'AbortError') return;
    }
  }

  // Fallback
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

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
      const result = await Filesystem.readdir({ path: 'wo', directory: 'EXTERNAL' });
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
      const safeN = name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return `<button class="registro-item" onclick="mostrarRegistro('${safeN}')">
        <i class="ti ti-file-description registro-item-icon"></i>
        <div class="registro-item-info">
          <div class="registro-item-name">${treinoStr}${sufixo ? `<span style="font-size:12px;font-weight:400;color:#8e8e93;margin-left:6px">${sufixo}</span>` : ''}</div>
          ${dateStr ? `<div class="registro-item-date"><i class="ti ti-calendar" style="font-size:12px"></i> ${dateStr}</div>` : ''}
        </div>
        <i class="ti ti-chevron-right" style="color:#c7c7cc;font-size:18px;flex-shrink:0"></i>
      </button>`;
    }).join('');

    app.innerHTML = `<div class="registros-view"><div class="registros-header"><button class="icon-btn" onclick="renderHome()"><i class="ti ti-arrow-left"></i></button><h2>Registros</h2><div style="width:32px"></div></div><div class="registros-list">${itemsHTML}</div></div>`;
  } catch(e) {
    app.innerHTML = `<div class="registros-view"><div class="registros-header"><button class="icon-btn" onclick="renderHome()"><i class="ti ti-arrow-left"></i></button><h2>Registros</h2><div style="width:32px"></div></div><div style="padding:2rem;text-align:center;color:#636366">Erro: ${e.message||e}</div></div>`;
  }
}

let _registroConteudo  = '';
let _registroTitulo    = '';
let _registroFileName  = '';

async function mostrarRegistro(fileName) {
  const app = document.getElementById('app');
  _registroFileName = fileName;
  app.innerHTML = `<div class="registro-detalhe"><div class="registros-header"><button class="icon-btn" onclick="verRegistros()"><i class="ti ti-arrow-left"></i></button><h2>Carregando...</h2><div style="width:32px"></div></div></div>`;

  try {
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    const result = await Filesystem.readFile({ path: `wo/${fileName}`, directory: 'EXTERNAL', encoding: 'utf8' });
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
    </div>`;
  } catch(e) {
    app.innerHTML = `<div class="registro-detalhe"><div class="registros-header"><button class="icon-btn" onclick="verRegistros()"><i class="ti ti-arrow-left"></i></button><h2>Erro</h2><div style="width:32px"></div></div><div style="padding:2rem;text-align:center;color:#636366">${e.message||e}</div></div>`;
  }
}

async function compartilharRegistro() {
  try {
    if (window.Capacitor?.isNativePlatform?.()) {
      const Filesystem = window.Capacitor.Plugins.Filesystem;
      const Share = window.Capacitor.Plugins.Share;
      const uriResult = await Filesystem.getUri({ path: `wo/${_registroFileName}`, directory: 'EXTERNAL' });
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
    if (e.name !== 'AbortError') alert('Erro ao compartilhar: ' + e.message);
  }
}
