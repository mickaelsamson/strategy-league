window.GameModeTabs = {
  init({
    defaultMode = 'local',
    localButtonId = 'localModeBtn',
    onlineButtonId = 'onlineModeBtn',
    localPanelId = 'localSetupPanel',
    onlinePanelId = 'onlineSetupPanel'
  } = {}){
    const localButton = document.getElementById(localButtonId);
    const onlineButton = document.getElementById(onlineButtonId);
    const localPanel = document.getElementById(localPanelId);
    const onlinePanel = document.getElementById(onlinePanelId);

    if(!localButton || !onlineButton || !localPanel || !onlinePanel){
      return null;
    }

    const setMode = mode => {
      const localActive = mode === 'local';
      localButton.classList.toggle('is-active', localActive);
      onlineButton.classList.toggle('is-active', !localActive);
      localPanel.hidden = !localActive;
      localPanel.classList.toggle('is-hidden', !localActive);
      onlinePanel.hidden = localActive;
      onlinePanel.classList.toggle('is-hidden', localActive);
    };

    localButton.addEventListener('click', () => setMode('local'));
    onlineButton.addEventListener('click', () => setMode('online'));
    setMode(defaultMode);
    return { setMode };
  }
};
