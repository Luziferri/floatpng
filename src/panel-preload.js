const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('floatpng', {
  get: () => ipcRenderer.invoke('panel:get'),
  onState: (fn) => ipcRenderer.on('panel:state', (e, s) => fn(s)),
  pick: () => ipcRenderer.send('panel:pick'),
  addFiles: (files) => ipcRenderer.send(
    'panel:add-paths',
    Array.from(files).map((f) => webUtils.getPathForFile(f)).filter(Boolean),
  ),
  update: (id, patch) => ipcRenderer.send('panel:update', id, patch),
  remove: (id) => ipcRenderer.send('panel:remove', id),
  duplicate: (id) => ipcRenderer.send('panel:duplicate', id),
  locate: (id) => ipcRenderer.send('panel:locate', id),
  center: (id) => ipcRenderer.send('panel:center', id),
  setAllHidden: (v) => ipcRenderer.send('panel:all-hidden', v),
  setLogin: (v) => ipcRenderer.send('panel:login', v),
  openData: () => ipcRenderer.send('panel:open-data'),
});
