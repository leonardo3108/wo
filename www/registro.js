const REGISTROS_DIR = 'wo/registros';

function coletarTreino(node, linhas) {
  let temAlgo = false;
  for (const bloco of node.children) {
    if (bloco.classList.contains('section') && !bloco.dataset.added) {
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
      const doneCards = [...bloco.querySelectorAll('.exercise-card')]
        .filter(c => c.querySelector('.check-btn.done') && !c.dataset.added);
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

function coletarAdicionados(node) {
  const adicionados = [];
  for (const bloco of node.children) {
    if (bloco.classList.contains('section') && bloco.dataset.added) {
      const titulo = bloco.querySelector('.section-title')?.textContent.trim();
      const sub    = bloco.querySelector('.sub-title-text')?.textContent.trim();
      if (titulo) adicionados.push(sub ? `${titulo} - ${sub}` : titulo);
    }
    if (bloco.classList.contains('exercises-section')) {
      bloco.querySelectorAll('.exercise-card[data-added]').forEach(card => {
        const nome  = card.querySelector('.exercise-name')?.textContent.trim();
        const equip = card.querySelector('.equipment a')?.textContent.trim()
                   || card.querySelector('.equipment')?.textContent.trim()
                   || '';
        if (nome) adicionados.push(`${nome}${equip ? ` (${equip})` : ''}`);
      });
    }
  }
  return adicionados;
}

function _coletarDadosAtualizacao(node) {
  const items = [];
  for (const bloco of node.children) {
    if (bloco.classList.contains('section') && bloco.dataset.added) {
      const titulo = bloco.querySelector('.section-title')?.textContent.trim();
      const sub    = bloco.querySelector('.sub-title-text')?.textContent.trim();
      items.push({ type: 'add', label: sub ? `${titulo} - ${sub}` : titulo, element: bloco });
    }
    if (bloco.classList.contains('exercises-section')) {
      bloco.querySelectorAll('.exercise-card[data-added]').forEach(card => {
        const nome  = card.querySelector('.exercise-name')?.textContent.trim();
        const equip = card.querySelector('.equipment a')?.textContent.trim()
                   || card.querySelector('.equipment')?.textContent.trim() || '';
        items.push({ type: 'add', label: `${nome}${equip ? ` (${equip})` : ''}`, element: card });
      });
      bloco.querySelectorAll('.exercise-card:not([data-added])').forEach(card => {
        if (!card.querySelector('.check-btn.done')) return;
        const nome  = card.querySelector('.exercise-name')?.textContent.trim();
        const equip = card.querySelector('.equipment a')?.textContent.trim()
                   || card.querySelector('.equipment')?.textContent.trim() || '';
        const specs = [];
        card.querySelectorAll('.spec-item.editable[data-original]').forEach(item => {
          const original = item.dataset.original;
          const atual    = item.querySelector('.spec-value')?.textContent.trim();
          if (atual && atual !== original) specs.push({ element: item, original });
        });
        if (specs.length) items.push({ type: 'ajust', label: `${nome}${equip ? ` (${equip})` : ''}`, specs });
      });
    }
  }
  return items;
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

let _pendingUpdates = [];
let _registroSalvo  = null; // { fileName, texto } — preenchido após salvar

async function registrar() {
  const now  = new Date();
  const data = now.toLocaleDateString('pt-BR');
  const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const ymd  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const dadosTreinos = [];
  for (const [, treino] of Object.entries(openTreinos)) {
    const linhasTreino = [];
    const achou = coletarTreino(treino.node, linhasTreino);
    const aj  = coletarAjustes(treino.node);
    const add = coletarAdicionados(treino.node);
    if (achou || add.length) dadosTreinos.push({ title: treino.title, linhas: linhasTreino, ajustes: aj, adicionados: add });
  }

  if (!dadosTreinos.length) { alert('Nenhum exercício marcado como feito.'); return; }

  const multiplo = dadosTreinos.length > 1;
  const titulos  = dadosTreinos.map(d => d.title);
  const linhas   = [`${titulos.join(' + ')} - ${data} as ${hora}`, ''];
  const todosAjustes    = [];
  const todosAdicionados = [];

  for (const d of dadosTreinos) {
    if (multiplo) linhas.push(`== ${d.title} ==`, '');
    linhas.push(...d.linhas);
    todosAjustes.push(...d.ajustes.map(l => multiplo ? `[${d.title}] ${l.slice(2)}` : l));
    todosAdicionados.push(...d.adicionados.map(l => multiplo ? `[${d.title}] ${l}` : `- ${l}`));
  }

  if (todosAdicionados.length) {
    linhas.push('EXERCÍCIOS ADICIONADOS');
    todosAdicionados.forEach(l => linhas.push(l));
    linhas.push('');
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
        const dir = await Filesystem.readdir({ path: REGISTROS_DIR, directory: 'EXTERNAL' });
        existentes = dir.files.map(f => typeof f === 'string' ? f : f.name);
      } catch(e) { /* pasta ainda não existe */ }
      let fileName = `${baseName}.txt`;
      let i = 1;
      while (existentes.includes(fileName)) fileName = `${baseName} -${i++}.txt`;

      await Filesystem.writeFile({
        path: `${REGISTROS_DIR}/${fileName}`,
        data: texto,
        directory: 'EXTERNAL',
        encoding: 'utf8',
        recursive: true,
      });
      showToast(`Salvo: ${fileName}`);
      _registroSalvo  = { fileName, texto };
      _pendingUpdates = [];
      for (const [fn, treino] of Object.entries(openTreinos)) {
        const items = _coletarDadosAtualizacao(treino.node);
        if (items.length) _pendingUpdates.push({ fileName: fn, title: treino.title, items });
      }
      if (_pendingUpdates.length) _mostrarModalAtualizacoes();
      else _concluirTreino();
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
      _concluirTreino();
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
  _concluirTreino();
}

function _mostrarModalAtualizacoes() {
  const multiplo = _pendingUpdates.length > 1;

  const itemsHTML = _pendingUpdates.map((treino, ti) => {
    const header = multiplo
      ? `<div style="font-weight:600;font-size:13px;color:#636366;margin:${ti > 0 ? '14px' : '0'} 0 4px">${treino.title}</div>`
      : '';
    const lista = treino.items.map((item, ii) => {
      const verb = item.type === 'add' ? 'Adicionar' : 'Ajustar';
      return `<label style="display:flex;align-items:center;gap:10px;padding:5px 0;font-size:14px;cursor:pointer">
        <input type="checkbox" data-ti="${ti}" data-ii="${ii}" checked style="width:18px;height:18px;flex-shrink:0;cursor:pointer">
        ${verb} ${item.label}
      </label>`;
    }).join('');
    return header + lista;
  }).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <h3>Atualizar treino${multiplo ? 's' : ''}?</h3>
      <div style="margin:10px 0 4px;max-height:40vh;overflow-y:auto">${itemsHTML}</div>
      <div class="modal-actions">
        <button class="modal-cancel">Não</button>
        <button class="modal-confirm">Atualizar</button>
      </div>
      <button class="registros-btn" id="_novo-treino-btn" style="width:100%;margin-top:8px">
        <i class="ti ti-file-plus"></i> Usar como novo treino
      </button>
    </div>`;
  overlay.querySelector('.modal-cancel').addEventListener('click', () => { overlay.remove(); _concluirTreino(); });
  overlay.querySelector('.modal-confirm').addEventListener('click', () => _aplicarAtualizacoesTreino(overlay));
  overlay.querySelector('#_novo-treino-btn').addEventListener('click', () => {
    overlay.remove();
    if (_registroSalvo) {
      const label = _registroSalvo.fileName.replace(/\.txt$/, '');
      const m = label.match(/^(\d{4})-(\d{2})-(\d{2})\s+(.+?)(\s+-\d+)?$/);
      _registroFileName = _registroSalvo.fileName;
      _registroConteudo = _registroSalvo.texto;
      _registroTitulo   = m ? m[4] : label;
    }
    for (const key of Object.keys(openTreinos)) delete openTreinos[key];
    currentTreino = null;
    usarComoNovoTreino();
  });
  document.body.appendChild(overlay);
}

async function _aplicarAtualizacoesTreino(overlay) {
  const estados = {};
  overlay.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    const ti = +cb.dataset.ti, ii = +cb.dataset.ii;
    if (!estados[ti]) estados[ti] = {};
    estados[ti][ii] = cb.checked;
  });
  overlay.remove();

  const salvosList = [];
  for (const [ti, treino] of _pendingUpdates.entries()) {
    const est = estados[ti] || {};
    if (!Object.values(est).some(Boolean)) continue;

    const treinoNode = openTreinos[treino.fileName]?.node;
    if (!treinoNode) continue;

    treino.items.forEach((item, ii) => {
      if (item.type === 'add') {
        item.element.dataset.uid = `u${ti}i${ii}`;
      } else {
        item.specs.forEach((spec, si) => { spec.element.dataset.uid = `u${ti}i${ii}s${si}`; });
      }
    });

    const clone = treinoNode.cloneNode(true);

    for (const [ii, item] of treino.items.entries()) {
      if (est[ii] === false) {
        if (item.type === 'add') {
          clone.querySelector(`[data-uid="u${ti}i${ii}"]`)?.remove();
        } else {
          item.specs.forEach((spec, si) => {
            const el = clone.querySelector(`[data-uid="u${ti}i${ii}s${si}"]`);
            if (el) el.querySelector('.spec-value').textContent = spec.original;
          });
        }
      }
    }

    treino.items.forEach(item => {
      if (item.type === 'add') delete item.element.dataset.uid;
      else item.specs.forEach(spec => delete spec.element.dataset.uid);
    });

    await salvarTreinoNoApp(treino.fileName, serializarTreinoParaMarkdown(clone));
    salvosList.push(treino.title);
  }

  if (salvosList.length)
    showToast(`Treino${salvosList.length > 1 ? 's' : ''} atualizado${salvosList.length > 1 ? 's' : ''}.`);
  _concluirTreino();
}

function _concluirTreino() {
  for (const key of Object.keys(openTreinos)) delete openTreinos[key];
  currentTreino = null;
  renderHome();
}
