const message = (name, fallback) => chrome.i18n?.getMessage(name) || fallback;
document.documentElement.lang = chrome.i18n?.getUILanguage() || 'en';
document.documentElement.dir = chrome.i18n?.getMessage('@@bidi_dir') || 'ltr';
for (const element of document.querySelectorAll('[data-msg]')) element.textContent = message(element.dataset.msg, element.textContent);

const account = document.getElementById('account');
const signIn = document.getElementById('signin');
const signOut = document.getElementById('signout');

function renderStatus(value) {
  account.textContent = value.user
    ? `${message('signedIn', 'Signed in as')} ${value.user.email || value.user.displayName || ''}${value.pending ? ` · ${value.pending} ${message('pendingCaptures', 'saved capture(s) waiting to sync')}` : ''}`
    : value.pending
      ? `${value.pending} ${message('pendingCaptures', 'saved capture(s) waiting to sync')}`
      : message('notSignedIn', 'Sign in to save to your account.');
  signIn.hidden = Boolean(value.user);
  signOut.hidden = !value.user;
}

async function refresh() {
  const value = await chrome.runtime.sendMessage({type: 'notcards.status'});
  renderStatus(value || {});
}

signIn.addEventListener('click', async () => {
  signIn.disabled = true;
  account.textContent = message('signingIn', 'Connecting to Google…');
  try {
    const result = await chrome.runtime.sendMessage({type: 'notcards.signin'});
    if (!result?.ok) throw new Error(result?.error || message('signInFailed', 'Sign-in could not be completed. Try again.'));
    await refresh();
  } catch (error) {
    account.textContent = error.message;
  } finally {
    signIn.disabled = false;
  }
});

signOut.addEventListener('click', async () => {
  signOut.disabled = true;
  try {
    await chrome.runtime.sendMessage({type: 'notcards.signout'});
    await refresh();
  } finally {
    signOut.disabled = false;
  }
});

void refresh();
