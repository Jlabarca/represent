(() => {
  const msg = (name, fallback) => chrome.i18n?.getMessage(name) || fallback;
  let previous = location.href;

  function mount() {
    const url = new URL(location.href);
    const video = url.pathname === '/watch' ? url.searchParams.get('v') : null;
    const existing = document.getElementById('notcards-capture');
    if (!video) { existing?.remove(); return; }
    const target = document.querySelector('#top-level-buttons-computed') || document.querySelector('#actions ytd-menu-renderer');
    if (!target || existing) return;
    const button = document.createElement('button');
    button.id = 'notcards-capture';
    button.type = 'button';
    button.className = 'notcards-button';
    button.textContent = msg('captureLabel', '▣ Notcards');
    button.title = msg('saveVideo', 'Save this video to Notcards');
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = msg('saving', 'Saving…');
      try {
        const result = await chrome.runtime.sendMessage({type: 'notcards.capture'});
        if (!result?.ok) throw new Error(result?.error || msg('captureFailed', 'Notcards could not save this video.'));
        button.textContent = `✓ ${msg('saved', 'Saved')}${result.needsTranscript ? ` · ${msg('needsTranscript', 'Add transcript')}` : ''}`;
        button.title = result.message;
        if (result.needsTranscript) showMessage(result.message);
      } catch (error) {
        button.textContent = `↻ ${msg('captureLabel', 'Notcards')}`;
        button.title = error.message;
        showMessage(error.message);
      } finally {
        button.disabled = false;
      }
    });
    target.append(button);
  }

  function showMessage(text) {
    document.getElementById('notcards-message')?.remove();
    const toast = document.createElement('div');
    toast.id = 'notcards-message';
    toast.setAttribute('role', 'status');
    toast.textContent = text;
    document.body.append(toast);
    setTimeout(() => toast.remove(), 12_000);
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      if (location.href !== previous) {
        document.getElementById('notcards-capture')?.remove();
        previous = location.href;
      }
      mount();
    }, 350);
  };
  document.addEventListener('yt-navigate-finish', schedule);
  new MutationObserver(schedule).observe(document.documentElement, {childList: true, subtree: true});
  mount();
})();
