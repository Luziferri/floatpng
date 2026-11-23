const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sprite', {
  init: (id) => ipcRenderer.invoke('sprite:init', id),
  hit: (opaque) => ipcRenderer.send('sprite:hit', opaque),
  dragStart: (id) => ipcRenderer.send('sprite:drag-start', id),
  dragEnd: () => ipcRenderer.send('sprite:drag-end'),
  menu: (id) => ipcRenderer.send('sprite:menu', id),
  wheel: (id, dir) => ipcRenderer.send('sprite:wheel', id, dir),
  onState: (fn) => ipcRenderer.on('sprite:state', (e, s) => fn(s)),
  onPing: (fn) => ipcRenderer.on('sprite:ping', () => fn()),
});
