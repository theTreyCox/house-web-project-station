window.addEventListener('DOMContentLoaded', () => {
  const { ipcRenderer, shell } = require('electron');

  // Expose the required modules or specific functionalities using the window object
  window.ipcRenderer = ipcRenderer;
  window.shell = shell;
});