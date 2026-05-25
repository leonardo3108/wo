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
