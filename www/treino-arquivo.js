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

function loadFile(file) {
  saveRecent(file);
  const reader = new FileReader();
  reader.onload = e => render(e.target.result, file.name);
  reader.readAsText(file);
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
