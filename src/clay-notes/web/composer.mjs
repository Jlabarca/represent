import {extractLinks} from './composer-links.mjs';

const SESSION_DRAFT_KEY = 'notcards.quick-note.unclaimed.v1';

function ownerIdentity(getOwner) {
  const owner = getOwner?.();
  if (typeof owner === 'string' && owner) return owner;
  if (owner && typeof owner === 'object') {
    for (const key of ['id', 'userId', 'sub']) {
      if (typeof owner[key] === 'string' && owner[key]) return owner[key];
    }
  }
  return null;
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createComposer({t, save, signIn, canSave, getOwner, onSaved}) {
  let root = null;
  let toggle = null;
  let form = null;
  let titleInput = null;
  let bodyInput = null;
  let splitOffer = null;
  let splitInput = null;
  let splitCaption = null;
  let saveButton = null;
  let cancelButton = null;
  let shortcut = null;
  let titleCaption = null;
  let optionalCaption = null;
  let bodyCaption = null;
  let errorMessage = null;
  let expanded = false;
  let saving = false;
  let draftId = null;
  let draftOwner = null;
  let unclaimedDraft = false;
  let lastOwner = ownerIdentity(getOwner);
  let focusHeld = false;
  let lastFocused = null;
  let selection = null;
  let errorKey = null;

  function canSaveNow() {
    return Boolean(canSave?.());
  }

  function removeSessionDraft() {
    try { window.sessionStorage.removeItem(SESSION_DRAFT_KEY); } catch { /* Storage may be unavailable. */ }
  }

  function ensureDraft() {
    if (draftId) return;
    draftId = createId();
    draftOwner = lastOwner;
    unclaimedDraft = lastOwner === null;
  }

  function syncIdentity() {
    const nextOwner = ownerIdentity(getOwner);
    if (nextOwner === lastOwner) return;

    if (draftId) {
      if (unclaimedDraft && lastOwner === null && nextOwner !== null) {
        draftOwner = nextOwner;
        unclaimedDraft = false;
      } else if (draftOwner !== nextOwner) {
        clear();
      }
    }
    lastOwner = nextOwner;
  }

  function persistUnclaimedDraft() {
    if (!draftId || !unclaimedDraft || draftOwner !== null) return;
    try {
      window.sessionStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify({
        version: 1,
        draftId,
        title: titleInput.value,
        body: bodyInput.value,
        split: Boolean(splitInput?.checked)
      }));
    } catch { /* The in-memory draft still survives a non-navigating sign-in. */ }
  }

  function restoreUnclaimedDraft() {
    let saved;
    try {
      const value = window.sessionStorage.getItem(SESSION_DRAFT_KEY);
      if (!value) return;
      saved = JSON.parse(value);
    } catch {
      removeSessionDraft();
      return;
    }
    removeSessionDraft();
    if (saved?.version !== 1 || typeof saved.draftId !== 'string' || typeof saved.body !== 'string' || typeof saved.title !== 'string') return;
    draftId = saved.draftId;
    titleInput.value = saved.title;
    bodyInput.value = saved.body;
    splitInput.checked = saved.split === true;
    expanded = true;
    unclaimedDraft = lastOwner === null;
    draftOwner = lastOwner;
    renderState();
    updateSplitOffer();
  }

  function clearError() {
    errorKey = null;
    errorMessage.textContent = '';
    errorMessage.hidden = true;
  }

  function showError(key) {
    errorKey = key;
    errorMessage.textContent = t(key);
    errorMessage.hidden = false;
  }

  function showErrorText(message) {
    errorKey = null;
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }

  function renderState() {
    if (!root) return;
    root.classList.toggle('is-expanded', expanded);
    toggle.hidden = expanded;
    toggle.setAttribute('aria-expanded', String(expanded));
    form.hidden = !expanded;
    titleInput.disabled = saving;
    bodyInput.disabled = saving;
    splitInput.disabled = saving;
    cancelButton.disabled = saving;
    saveButton.disabled = saving || !bodyInput.value.trim();
    saveButton.textContent = saving ? t('Saving…') : canSaveNow() ? t('Save & close') : t('Sign in to save this note');
  }

  function updateTranslations() {
    if (!root) return;
    root.setAttribute('aria-label', t('Quick note'));
    toggle.textContent = t('Take a note…');
    toggle.setAttribute('aria-label', t('Take a note…'));
    shortcut.textContent = t('Press N to take a note');
    titleCaption.textContent = t('Title');
    optionalCaption.textContent = t('optional');
    titleInput.placeholder = t('Note title');
    titleInput.setAttribute('aria-label', t('Title'));
    bodyCaption.textContent = t('Note body');
    bodyInput.placeholder = t('Write a note…');
    bodyInput.setAttribute('aria-label', t('Write a note…'));
    splitCaption.textContent = t('Create one card per link');
    cancelButton.textContent = t('Cancel');
    if (errorKey) errorMessage.textContent = t(errorKey);
    renderState();
  }

  function updateSplitOffer() {
    if (!bodyInput || !splitOffer || !splitInput) return;
    const links = extractLinks(bodyInput.value);
    const showOffer = links.length > 1;
    splitOffer.hidden = !showOffer;
    if (!showOffer) splitInput.checked = false;
    if (!saving) splitInput.disabled = !showOffer;
  }

  function rememberFocus(event) {
    if (event.type === 'focusin' && root.contains(event.target)) {
      focusHeld = true;
      lastFocused = event.target;
      if (typeof event.target.selectionStart === 'number') {
        selection = [event.target.selectionStart, event.target.selectionEnd];
      }
      return;
    }
    if (event.type === 'focusout' && root.contains(event.target)) {
      focusHeld = !event.relatedTarget || event.relatedTarget === document.body || event.relatedTarget === document.documentElement;
      if (focusHeld) lastFocused = event.target;
    }
  }

  function build() {
    root = element('section', 'quick-note');
    root.setAttribute('aria-label', t('Quick note'));
    toggle = element('button', 'quick-note-toggle', t('Take a note…'));
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'quick-note-form');
    toggle.setAttribute('aria-label', t('Take a note…'));
    toggle.setAttribute('aria-describedby', 'quick-note-shortcut');

    shortcut = element('span', 'sr-only', t('Press N to take a note'));
    shortcut.id = 'quick-note-shortcut';
    shortcut.hidden = true;

    form = element('form', 'quick-note-form');
    form.id = 'quick-note-form';
    form.hidden = true;

    const titleLabel = element('label', 'quick-title-label');
    titleCaption = element('span', 'quick-title-caption', t('Title'));
    optionalCaption = element('span', 'optional', t('optional'));
    titleLabel.append(titleCaption, optionalCaption);
    titleInput = element('input', 'quick-title');
    titleInput.type = 'text';
    titleInput.maxLength = 200;
    titleInput.placeholder = t('Note title');
    titleInput.setAttribute('aria-label', t('Title'));
    titleInput.dir = 'auto';
    titleLabel.append(titleInput);

    const bodyLabel = element('label', 'quick-body-label');
    bodyCaption = element('span', 'sr-only', t('Note body'));
    bodyCaption.hidden = true;
    bodyLabel.append(bodyCaption);
    bodyInput = element('textarea', 'quick-body');
    bodyInput.rows = 4;
    bodyInput.placeholder = t('Write a note…');
    bodyInput.setAttribute('aria-label', t('Write a note…'));
    bodyInput.required = true;
    bodyInput.dir = 'auto';
    bodyLabel.append(bodyInput);

    splitOffer = element('div', 'quick-split');
    splitOffer.hidden = true;
    const splitLabel = element('label');
    splitInput = element('input');
    splitInput.type = 'checkbox';
    splitCaption = element('span', '', t('Create one card per link'));
    splitLabel.append(splitInput, splitCaption);
    splitOffer.append(splitLabel);

    errorMessage = element('p', 'quick-error');
    errorMessage.hidden = true;
    errorMessage.setAttribute('role', 'alert');
    errorMessage.setAttribute('aria-live', 'polite');

    const actions = element('div', 'quick-actions');
    cancelButton = element('button', 'quick-cancel', t('Cancel'));
    cancelButton.type = 'button';
    saveButton = element('button', 'quick-save', t('Save & close'));
    saveButton.type = 'submit';
    actions.append(cancelButton, saveButton);
    form.append(titleLabel, bodyLabel, splitOffer, errorMessage, actions);
    root.append(toggle, shortcut, form);

    toggle.addEventListener('click', () => focus());
    cancelButton.addEventListener('click', () => clear());
    bodyInput.addEventListener('input', () => {
      ensureDraft();
      clearError();
      updateSplitOffer();
      renderState();
    });
    titleInput.addEventListener('input', () => {
      ensureDraft();
      clearError();
      renderState();
    });
    form.addEventListener('submit', submit);
    root.addEventListener('focusin', rememberFocus);
    root.addEventListener('focusout', rememberFocus);
    restoreUnclaimedDraft();
    renderState();
  }

  async function submit(event) {
    event.preventDefault();
    if (saving || !bodyInput.value.trim()) return;
    syncIdentity();
    ensureDraft();
    clearError();
    const submittedDraftId = draftId;

    if (!canSaveNow()) {
      persistUnclaimedDraft();
      if (!signIn) {
        showError('Sign in to save this note');
        return;
      }
      saving = true;
      renderState();
      try {
        await signIn();
        syncIdentity();
        if (draftId !== submittedDraftId) return;
        if (!canSaveNow()) {
          persistUnclaimedDraft();
          showError('Sign in to save this note');
          return;
        }
        removeSessionDraft();
      } catch (error) {
        removeSessionDraft();
        if (draftId !== submittedDraftId) return;
        if (error?.message) showErrorText(error.message);
        else showError('Your note could not be saved. Try again.');
        return;
      } finally {
        saving = false;
        renderState();
      }
      if (draftId !== submittedDraftId) return;
    }

    const submittingOwner = ownerIdentity(getOwner);
    if (draftOwner !== null && draftOwner !== submittingOwner) {
      clear();
      return;
    }
    if (draftOwner === null && submittingOwner !== null) {
      draftOwner = submittingOwner;
      unclaimedDraft = false;
    }
    const payload = {
      draftId: submittedDraftId,
      body: bodyInput.value.trim(),
      title: titleInput.value.trim(),
      split: Boolean(splitInput.checked && extractLinks(bodyInput.value).length > 1)
    };

    saving = true;
    renderState();
    try {
      const result = await save(payload);
      const currentOwner = ownerIdentity(getOwner);
      if (draftId !== submittedDraftId || currentOwner !== submittingOwner) {
        syncIdentity();
        return;
      }
      if (!result || !Array.isArray(result.ids) || result.ids.some(id => typeof id !== 'string')) throw new Error(t('Your note could not be saved. Try again.'));
      if (draftId === submittedDraftId) clear();
      await onSaved?.(result.ids);
    } catch (error) {
      if (draftId !== submittedDraftId) return;
      const currentOwner = ownerIdentity(getOwner);
      if (draftOwner !== null && draftOwner !== currentOwner) {
        syncIdentity();
        return;
      }
      if (error?.message) showErrorText(error.message);
      else showError('Your note could not be saved. Try again.');
    } finally {
      if (draftId === submittedDraftId) {
        saving = false;
        renderState();
      }
    }
  }

  function mount(container) {
    if (!container) throw new TypeError('Composer needs a mount container');
    syncIdentity();
    if (!root) build();
    const activeWasComposer = root.contains(document.activeElement) || focusHeld;
    const focused = root.contains(document.activeElement) ? document.activeElement : lastFocused;
    if (root.parentElement !== container) container.append(root);
    updateTranslations();
    if (activeWasComposer && expanded && focused?.isConnected) {
      focused.focus({preventScroll: true});
      if (selection && typeof focused.setSelectionRange === 'function') {
        focused.setSelectionRange(...selection);
      }
    }
    renderState();
    return root;
  }

  function focus() {
    if (!root) return;
    syncIdentity();
    ensureDraft();
    expanded = true;
    clearError();
    renderState();
    bodyInput.focus({preventScroll: true});
  }

  function clear() {
    removeSessionDraft();
    saving = false;
    draftId = null;
    draftOwner = null;
    unclaimedDraft = false;
    expanded = false;
    if (!root) {
      focusHeld = false;
      lastFocused = null;
      selection = null;
      return;
    }
    if (titleInput) titleInput.value = '';
    if (bodyInput) bodyInput.value = '';
    if (splitInput) splitInput.checked = false;
    clearError();
    updateSplitOffer();
    renderState();
    focusHeld = false;
    lastFocused = null;
    selection = null;
  }

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.key.toLowerCase() !== 'n' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target?.closest?.('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return;
    if (document.querySelector('dialog[open]')) return;
    if (!root?.isConnected || !root.parentElement) return;
    event.preventDefault();
    focus();
  });

  return {mount, focus, clear};
}
