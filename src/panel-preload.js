const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('floatpng', {
  get: () => ipcRenderer.invoke('panel:get'),
  onState: (fn) => ipcRenderer.on('panel:state', (e, s) => fn(s)),
  pick: () => ipcRenderer.send('panel:pick'),
  // recebe um File de cada vez: uma FileList inteira não atravessa a contextBridge
  pathForFile: (file) => {
    try { return webUtils.getPathForFile(file) || ''; } catch { return ''; }
  },
  addPath: (p) => ipcRenderer.send('panel:add-paths', [p]),
  addData: (name, bytes) => ipcRenderer.send('panel:add-data', name, bytes),
  update: (id, patch) => ipcRenderer.send('panel:update', id, patch),
  remove: (id) => ipcRenderer.send('panel:remove', id),
  duplicate: (id) => ipcRenderer.send('panel:duplicate', id),
  resize: (id) => ipcRenderer.send('panel:resize', id),
  locate: (id) => ipcRenderer.send('panel:locate', id),
  center: (id) => ipcRenderer.send('panel:center', id),
  setAllHidden: (v) => ipcRenderer.send('panel:all-hidden', v),
  setLogin: (v) => ipcRenderer.send('panel:login', v),
  openData: () => ipcRenderer.send('panel:open-data'),
});
