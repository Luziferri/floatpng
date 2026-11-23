const {
  app, BrowserWindow, ipcMain, Menu, Tray, dialog, nativeImage, screen, shell,
} = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

if (process.env.FLOATPNG_USER_DATA) app.setPath('userData', process.env.FLOATPNG_USER_DATA);

const PAD = 28; // espaço transparente à volta do PNG para o brilho e a animação
const SCALES = [0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
function stepScale(scale, dir) {
  if (dir > 0) return SCALES.find((v) => v > scale + 0.001) ?? SCALES[SCALES.length - 1];
  return [...SCALES].reverse().find((v) => v < scale - 0.001) ?? SCALES[0];
}
const MAX_SCALE = 20;

const GLOWS = {
  lilas: 'Lilás',
  branco: 'Branco',
  dourado: 'Dourado',
  ciano: 'Ciano',
  sombra: 'Sombra',
  nenhum: 'Nenhum',
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let store = { sprites: [], allHidden: false };
let panel = null;
let tray = null;
const windows = new Map(); // id -> BrowserWindow
let drag = null; // { id, offX, offY, timer }
let resize = null; // { id, corner, ax, ay, timer }

/* ---------- persistência ---------- */

const dataDir = () => app.getPath('userData');
const storeFile = () => path.join(dataDir(), 'floatpng.json');
const imagesDir = () => path.join(dataDir(), 'sprites');

function load() {
  try {
    store = { ...store, ...JSON.parse(fs.readFileSync(storeFile(), 'utf8')) };
  } catch { /* primeira vez */ }
  store.sprites = store.sprites.filter((s) => fs.existsSync(s.file));
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.writeFileSync(storeFile(), JSON.stringify(store, null, 2));
  }, 200);
}

/* ---------- sprites ---------- */

function imageSize(file) {
  const size = nativeImage.createFromPath(file).getSize();
  return { w: size.width || 64, h: size.height || 64 };
}

function windowSize(s) {
  return {
    width: Math.max(1, Math.round(s.w * s.scale)) + PAD * 2,
    height: Math.max(1, Math.round(s.h * s.scale)) + PAD * 2,
  };
}

function clampToScreen(s) {
  const { width, height } = windowSize(s);
  const displays = screen.getAllDisplays();
  const visible = displays.some(({ workArea: a }) => (
    s.x + width - PAD > a.x && s.x + PAD < a.x + a.width
    && s.y + height - PAD > a.y && s.y + PAD < a.y + a.height
  ));
  if (!visible) {
    const a = screen.getPrimaryDisplay().workArea;
    s.x = Math.round(a.x + a.width / 2 - width / 2);
    s.y = Math.round(a.y + a.height / 2 - height / 2);
  }
}

function addSprite(srcPath, at) {
  if (!/\.(png|gif|webp|jpe?g)$/i.test(srcPath)) return null;
  fs.mkdirSync(imagesDir(), { recursive: true });
  const id = crypto.randomUUID();
  const file = path.join(imagesDir(), `${id}${path.extname(srcPath).toLowerCase()}`);
  fs.copyFileSync(srcPath, file);
  const { w, h } = imageSize(file);
  // pixel art pequeno começa maior, imagens grandes começam mais pequenas
  let scale = 1;
  if (Math.max(w, h) <= 64) scale = 2;
  if (Math.max(w, h) > 600) scale = 0.5;
  const s = {
    id,
    name: path.basename(srcPath, path.extname(srcPath)),
    file, w, h, scale,
    x: 0, y: 0,
    flip: false, glow: 'lilas', bob: true, pixel: Math.max(w, h) <= 256,
    locked: false, hidden: false, opacity: 1,
  };
  const { width, height } = windowSize(s);
  const p = at || screen.getCursorScreenPoint();
  s.x = Math.round(p.x - width / 2);
  s.y = Math.round(p.y - height / 2);
  if (!at) {
    const a = screen.getDisplayNearestPoint(p).workArea;
    s.x = Math.round(a.x + a.width / 2 - width / 2 + (Math.random() - 0.5) * 200);
    s.y = Math.round(a.y + a.height / 2 - height / 2 + (Math.random() - 0.5) * 120);
  }
  store.sprites.push(s);
  save();
  openSpriteWindow(s);
  broadcast();
  return s;
}

function openSpriteWindow(s) {
  if (windows.has(s.id)) return;
  clampToScreen(s);
  const { width, height } = windowSize(s);
  const win = new BrowserWindow({
    x: s.x, y: s.y, width, height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    // no Mac, um NSPanel pode aparecer por cima de apps em ecrã inteiro
    ...(process.platform === 'darwin' ? { type: 'panel' } : {}),
    acceptFirstMouse: true, // o primeiro clique já agarra o boneco, mesmo com a app inativa
    backgroundColor: '#00000000',
    title: s.name,
    webPreferences: {
      preload: path.join(__dirname, 'sprite-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  pinToAllSpaces(win);
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'sprite.html'), { query: { id: s.id } });
  win.once('ready-to-show', () => {
    if (!s.hidden && !store.allHidden) win.showInactive();
    pinToAllSpaces(win); // o macOS só aplica isto de forma fiável depois de a janela existir no ecrã
  });
  win.on('blur', () => { if (resize && resize.id === s.id) stopResize(); });
  win.on('closed', () => windows.delete(s.id));
  windows.set(s.id, win);
}

// fica em todos os desktops e por cima de apps em ecrã inteiro
function pinToAllSpaces(win) {
  if (win.isDestroyed()) return;
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
  win.setAlwaysOnTop(true, 'screen-saver', 1);
}

function spriteById(id) {
  return store.sprites.find((s) => s.id === id);
}

function spriteState(s) {
  return { ...s, pad: PAD };
}

function updateSprite(id, patch) {
  const s = spriteById(id);
  if (!s) return;
  const win = windows.get(id);
  const before = windowSize(s);
  Object.assign(s, patch);
  if (win && !win.isDestroyed()) {
    if ('scale' in patch) {
      const after = windowSize(s);
      // mantém o centro no mesmo sítio
      s.x = Math.round(s.x + before.width / 2 - after.width / 2);
      s.y = Math.round(s.y + before.height / 2 - after.height / 2);
      win.setBounds({ x: s.x, y: s.y, ...after });
    }
    if ('hidden' in patch) applyVisibility(s);
    win.webContents.send('sprite:state', spriteState(s));
  }
  save();
  broadcast();
}

function applyVisibility(s) {
  const win = windows.get(s.id);
  if (!win || win.isDestroyed()) return;
  if (s.hidden || store.allHidden) win.hide();
  else { win.showInactive(); pinToAllSpaces(win); }
}

function removeSprite(id) {
  const s = spriteById(id);
  if (!s) return;
  store.sprites = store.sprites.filter((x) => x.id !== id);
  const win = windows.get(id);
  if (win && !win.isDestroyed()) win.close();
  fs.rm(s.file, { force: true }, () => {});
  save();
  broadcast();
}

function setAllHidden(hidden) {
  store.allHidden = hidden;
  store.sprites.forEach(applyVisibility);
  save();
  broadcast();
  buildTrayMenu();
}

function duplicateSprite(id) {
  const s = spriteById(id);
  if (!s) return;
  const copy = addSprite(s.file, null);
  if (!copy) return;
  copy.name = s.name;
  updateSprite(copy.id, {
    scale: s.scale, flip: s.flip, glow: s.glow, bob: s.bob, pixel: s.pixel, opacity: s.opacity,
  });
  const win = windows.get(copy.id);
  copy.x = s.x + 40; copy.y = s.y + 20;
  if (win) win.setPosition(copy.x, copy.y);
  save();
}

/* ---------- arrastar ---------- */

function startDrag(id) {
  const s = spriteById(id);
  const win = windows.get(id);
  if (!s || !win || s.locked) return;
  stopDrag();
  const c = screen.getCursorScreenPoint();
  const [wx, wy] = win.getPosition();
  drag = { id, offX: c.x - wx, offY: c.y - wy };
  drag.timer = setInterval(() => {
    if (win.isDestroyed()) return stopDrag();
    const p = screen.getCursorScreenPoint();
    s.x = p.x - drag.offX;
    s.y = p.y - drag.offY;
    win.setPosition(Math.round(s.x), Math.round(s.y));
  }, 8);
}

/* ---------- redimensionar com pegas (como no Word) ---------- */

function enterResizeMode(id) {
  const s = spriteById(id);
  const win = windows.get(id);
  if (!s || !win) return;
  if (s.hidden || store.allHidden) {
    store.allHidden = false;
    s.hidden = false;
    store.sprites.forEach(applyVisibility);
  }
  win.setIgnoreMouseEvents(false);
  if (process.platform === 'darwin') app.focus({ steal: true });
  win.focus();
  win.webContents.send('sprite:resize-mode', true);
}

function startResize(id, corner) {
  const s = spriteById(id);
  const win = windows.get(id);
  if (!s || !win) return;
  stopResize();
  const [wx, wy] = win.getPosition();
  const L = wx + PAD;
  const T = wy + PAD;
  const R = L + Math.round(s.w * s.scale);
  const B = T + Math.round(s.h * s.scale);
  const east = corner.includes('e');
  const south = corner.includes('s');
  // o canto oposto fica parado, como no Word
  resize = { id, corner, ax: east ? L : R, ay: south ? T : B };
  const minScale = Math.max(0.02, 6 / Math.max(s.w, s.h));
  resize.timer = setInterval(() => {
    if (win.isDestroyed()) return stopResize();
    const c = screen.getCursorScreenPoint();
    const dx = east ? c.x - resize.ax : resize.ax - c.x;
    const dy = south ? c.y - resize.ay : resize.ay - c.y;
    const scale = Math.min(MAX_SCALE, Math.max(minScale, Math.max(dx / s.w, dy / s.h)));
    if (Math.abs(scale - s.scale) < 0.0005) return;
    s.scale = Math.round(scale * 1000) / 1000;
    const nw = Math.max(1, Math.round(s.w * s.scale));
    const nh = Math.max(1, Math.round(s.h * s.scale));
    s.x = (east ? resize.ax : resize.ax - nw) - PAD;
    s.y = (south ? resize.ay : resize.ay - nh) - PAD;
    win.setBounds({ x: s.x, y: s.y, width: nw + PAD * 2, height: nh + PAD * 2 });
    win.webContents.send('sprite:state', spriteState(s));
  }, 8);
}

function stopResize() {
  if (!resize) return;
  clearInterval(resize.timer);
  resize = null;
  save();
  broadcast();
}

function stopDrag() {
  if (!drag) return;
  clearInterval(drag.timer);
  const s = spriteById(drag.id);
  if (s) { s.x = Math.round(s.x); s.y = Math.round(s.y); }
  drag = null;
  save();
}

/* ---------- menus ---------- */

function spriteMenu(s) {
  const step = (dir) => updateSprite(s.id, { scale: stepScale(s.scale, dir) });
  return Menu.buildFromTemplate([
    { label: s.name, enabled: false },
    { type: 'separator' },
    {
      label: 'Tamanho',
      submenu: [
        { label: 'Maior', accelerator: 'Plus', click: () => step(1) },
        { label: 'Mais pequeno', accelerator: '-', click: () => step(-1) },
        { type: 'separator' },
        ...SCALES.map((v) => ({
          label: `${Math.round(v * 100)}%`,
          type: 'radio',
          checked: Math.abs(v - s.scale) < 0.001,
          click: () => updateSprite(s.id, { scale: v }),
        })),
      ],
    },
    {
      label: 'Brilho',
      submenu: Object.entries(GLOWS).map(([key, label]) => ({
        label, type: 'radio', checked: s.glow === key,
        click: () => updateSprite(s.id, { glow: key }),
      })),
    },
    {
      label: 'Opacidade',
      submenu: [1, 0.8, 0.6, 0.4].map((v) => ({
        label: `${Math.round(v * 100)}%`, type: 'radio', checked: Math.abs(s.opacity - v) < 0.01,
        click: () => updateSprite(s.id, { opacity: v }),
      })),
    },
    { label: 'Flutuar (animação)', type: 'checkbox', checked: s.bob, click: () => updateSprite(s.id, { bob: !s.bob }) },
    { label: 'Espelhar', type: 'checkbox', checked: s.flip, click: () => updateSprite(s.id, { flip: !s.flip }) },
    { label: 'Pixel art nítido', type: 'checkbox', checked: s.pixel, click: () => updateSprite(s.id, { pixel: !s.pixel }) },
    { label: 'Redimensionar…', click: () => enterResizeMode(s.id) },
    { label: 'Fixar posição', type: 'checkbox', checked: s.locked, click: () => updateSprite(s.id, { locked: !s.locked }) },
    { type: 'separator' },
    { label: 'Duplicar', click: () => duplicateSprite(s.id) },
    { label: 'Esconder', click: () => updateSprite(s.id, { hidden: true }) },
    { label: 'Remover', click: () => removeSprite(s.id) },
    { type: 'separator' },
    { label: 'Abrir painel', click: showPanel },
  ]);
}

function trayIcon() {
  // ícone desenhado em código: um autocolante com o canto dobrado
  const size = 32;
  const buf = Buffer.alloc(size * size * 4);
  const isMac = process.platform === 'darwin';
  const [r, g, b] = isMac ? [0, 0, 0] : [255, 138, 92];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inBox = x >= 4 && x < 28 && y >= 4 && y < 28;
      const corner = x + y >= 46; // canto dobrado
      const fold = corner && x + y < 50 && x < 28 && y < 28;
      let a = 0;
      if (inBox && !corner) a = 255;
      if (fold) a = isMac ? 150 : 255;
      const i = (y * size + x) * 4;
      buf[i] = b; buf[i + 1] = g; buf[i + 2] = r; buf[i + 3] = a; // BGRA
    }
  }
  const img = nativeImage.createFromBitmap(buf, { width: size, height: size, scaleFactor: 2 });
  if (isMac) img.setTemplateImage(true);
  return img;
}

function buildTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Adicionar PNG…', click: pickFiles },
    { label: 'Abrir painel', click: showPanel },
    { type: 'separator' },
    { label: 'Esconder todos', type: 'checkbox', checked: store.allHidden, click: () => setAllHidden(!store.allHidden) },
    { type: 'separator' },
    { label: 'Sair do FloatPNG', role: 'quit' },
  ]));
}

async function pickFiles() {
  const res = await dialog.showOpenDialog(panel && panel.isVisible() ? panel : undefined, {
    title: 'Escolhe imagens para pôr a flutuar',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Imagens', extensions: ['png', 'gif', 'webp', 'jpg', 'jpeg'] }],
  });
  if (!res.canceled) res.filePaths.forEach((f) => addSprite(f));
}

/* ---------- painel ---------- */

function showPanel() {
  if (panel && !panel.isDestroyed()) {
    panel.show();
    panel.focus();
    return;
  }
  panel = new BrowserWindow({
    width: 420,
    height: 620,
    minWidth: 360,
    minHeight: 420,
    title: 'FloatPNG',
    backgroundColor: '#1b1a19',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    acceptFirstMouse: true,
    webPreferences: {
      preload: path.join(__dirname, 'panel-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  panel.loadFile(path.join(__dirname, 'panel.html'));
  panel.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      panel.hide();
    }
  });
}

function panelState() {
  return {
    sprites: store.sprites.map((s) => ({ ...s, url: pathToFileURL(s.file).href })),
    allHidden: store.allHidden,
    openAtLogin: app.getLoginItemSettings().openAtLogin,
    platform: process.platform,
  };
}

function broadcast() {
  if (panel && !panel.isDestroyed()) panel.webContents.send('panel:state', panelState());
}

/* ---------- IPC ---------- */

ipcMain.handle('sprite:init', (e, id) => {
  const s = spriteById(id);
  if (!s) return null;
  const data = fs.readFileSync(s.file).toString('base64');
  const ext = path.extname(s.file).slice(1).replace('jpg', 'jpeg');
  return { state: spriteState(s), dataUrl: `data:image/${ext};base64,${data}` };
});
ipcMain.on('sprite:hit', (e, opaque) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || drag || resize) return;
  win.setIgnoreMouseEvents(!opaque, { forward: true });
});
ipcMain.on('sprite:drag-start', (e, id) => startDrag(id));
ipcMain.on('sprite:drag-end', () => stopDrag());
ipcMain.on('sprite:resize-start', (e, id, corner) => startResize(id, corner));
ipcMain.on('sprite:resize-end', () => stopResize());
ipcMain.on('sprite:resize-exit', (e, id) => {
  stopResize();
  const win = windows.get(id);
  if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(true, { forward: true });
});
ipcMain.on('panel:resize', (e, id) => enterResizeMode(id));
ipcMain.on('sprite:menu', (e, id) => {
  const s = spriteById(id);
  const win = windows.get(id);
  if (s && win) spriteMenu(s).popup({ window: win });
});
ipcMain.on('sprite:wheel', (e, id, dir) => {
  const s = spriteById(id);
  if (!s || s.locked) return;
  const next = stepScale(s.scale, dir);
  if (next !== s.scale) updateSprite(id, { scale: next });
});

ipcMain.handle('panel:get', () => panelState());
ipcMain.on('panel:pick', pickFiles);
ipcMain.on('panel:add-paths', (e, paths) => paths.forEach((p) => addSprite(p)));
ipcMain.on('panel:add-data', (e, name, bytes) => {
  const safe = path.basename(String(name || 'imagem.png')).replace(/[^\w.\- ]/g, '_') || 'imagem.png';
  const withExt = /\.(png|gif|webp|jpe?g)$/i.test(safe) ? safe : `${safe}.png`;
  const dir = path.join(app.getPath('temp'), 'floatpng-drop');
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, withExt);
  fs.writeFileSync(tmp, Buffer.from(bytes));
  addSprite(tmp);
  fs.rm(tmp, { force: true }, () => {});
});
ipcMain.on('panel:update', (e, id, patch) => updateSprite(id, patch));
ipcMain.on('panel:remove', (e, id) => removeSprite(id));
ipcMain.on('panel:duplicate', (e, id) => duplicateSprite(id));
ipcMain.on('panel:all-hidden', (e, v) => setAllHidden(v));
ipcMain.on('panel:locate', (e, id) => {
  const s = spriteById(id);
  if (!s) return;
  if (s.hidden || store.allHidden) {
    store.allHidden = false;
    updateSprite(id, { hidden: false });
    store.sprites.forEach(applyVisibility);
  }
  const win = windows.get(id);
  if (win) win.webContents.send('sprite:ping');
});
ipcMain.on('panel:center', (e, id) => {
  const s = spriteById(id);
  const win = windows.get(id);
  if (!s || !win) return;
  const a = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const { width, height } = windowSize(s);
  s.x = Math.round(a.x + a.width / 2 - width / 2);
  s.y = Math.round(a.y + a.height / 2 - height / 2);
  win.setPosition(s.x, s.y);
  updateSprite(id, { hidden: false });
  win.webContents.send('sprite:ping');
});
ipcMain.on('panel:login', (e, v) => {
  app.setLoginItemSettings({ openAtLogin: v, openAsHidden: true });
  broadcast();
});
ipcMain.on('panel:open-data', () => shell.openPath(imagesDir()));

/* ---------- ciclo de vida ---------- */

const imageArgs = (argv) => argv.slice(1).filter((a) => /\.(png|gif|webp|jpe?g)$/i.test(a) && fs.existsSync(a));
const pendingOpen = [];
app.on('open-file', (e, file) => {
  e.preventDefault();
  if (app.isReady()) addSprite(file); else pendingOpen.push(file);
});
app.on('second-instance', (e, argv) => {
  const files = imageArgs(argv);
  if (files.length) files.forEach((f) => addSprite(f)); else showPanel();
});
app.on('before-quit', () => { app.isQuitting = true; });
app.on('window-all-closed', (e) => e.preventDefault?.());
app.on('activate', showPanel);

app.whenReady().then(() => {
  load();
  fs.mkdirSync(imagesDir(), { recursive: true });
  tray = new Tray(trayIcon());
  tray.setToolTip('FloatPNG');
  buildTrayMenu();
  if (process.platform === 'win32') tray.on('click', showPanel);

  store.sprites.forEach(openSpriteWindow);
  [...pendingOpen, ...imageArgs(process.argv)].forEach((f) => addSprite(f));

  const startedHidden = app.getLoginItemSettings().wasOpenedAsHidden
    || process.argv.includes('--hidden');
  if (!startedHidden || store.sprites.length === 0) showPanel();

  screen.on('display-removed', () => {
    store.sprites.forEach((s) => {
      clampToScreen(s);
      const win = windows.get(s.id);
      if (win) win.setPosition(s.x, s.y);
    });
    save();
  });
});
