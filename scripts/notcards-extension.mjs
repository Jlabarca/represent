import {createHash} from 'node:crypto';
import {lstat,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {zipFiles} from './clay-notes-package.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const key='MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoVyeYs7QI147lyOgl24/jGvf4tsz5hq3kx6jWbDmgDS9HJ+s+iI9wY3zOcEoK9Ej3bTiY+Luvn1QphFTo42Dl3fSyKKeaSdQqaZAi4jcoV1aotSE7MhWmV/h+Ho/2a7MsZzNqj0630eIlkX9pvt1SYtrpdVQHCfT6SmmESHjq+yFjtzKQn8nO8hSNLyFr350NkCFkExd/M0nssW80ZtlY5QrZMpS49f2O4SebCztDUg8eB23l80O2+gD7qAVu6zboTlMSihko9Vz4cak2LnzD4Kb23nGDvIRFoWq/YziNLv7bzIqaZYq5OIiHq6hyuKxLZU+JWn/UH7w+X7c5JDyTwIDAQAB';
const supported=['en','es','pt','fr','de','it','ja','zh_CN','ar','hi'];
const optionText={en:['Save a video. Keep the ideas.','Sign in to save videos to your Notcards collection.','Continue with Google','Forget this browser','Notcards only reads the video you choose to save.'],es:['Guarda videos. Conserva las ideas.','Inicia sesión para guardar videos en tu colección Notcards.','Continuar con Google','Olvidar este navegador','Notcards solo lee el video que eliges guardar.'],pt:['Salve vídeos. Guarde as ideias.','Entre para salvar vídeos na sua coleção Notcards.','Continuar com Google','Esquecer este navegador','O Notcards só lê o vídeo que você escolhe salvar.'],fr:['Enregistrez les vidéos. Gardez les idées.','Connectez-vous pour enregistrer dans votre collection Notcards.','Continuer avec Google','Oublier ce navigateur','Notcards lit uniquement la vidéo que vous choisissez.'],de:['Videos speichern. Ideen behalten.','Melde dich an, um Videos in deiner Notcards-Sammlung zu speichern.','Mit Google fortfahren','Dieses Gerät vergessen','Notcards liest nur das Video, das du speicherst.'],it:['Salva i video. Conserva le idee.','Accedi per salvare i video nella raccolta Notcards.','Continua con Google','Dimentica questo browser','Notcards legge solo il video che scegli di salvare.'],ja:['動画を保存して、アイデアを残す。','ログインしてNotcardsコレクションに動画を保存します。','Googleで続行','このブラウザの情報を削除','Notcardsは保存を選んだ動画のみ読み取ります。'],zh_CN:['保存视频，留住灵感。','登录后将视频保存到 Notcards 收藏。','使用 Google 继续','清除此浏览器登录','Notcards 仅读取你选择保存的视频。'],ar:['احفظ الفيديوهات واحتفظ بالأفكار.','سجّل الدخول لحفظ الفيديوهات في مجموعة Notcards.','المتابعة باستخدام Google','امسح هذا المتصفح','يقرأ Notcards الفيديو الذي تختار حفظه فقط.'],hi:['वीडियो सहेजें, विचार याद रखें।','वीडियो को Notcards संग्रह में सहेजने के लिए साइन इन करें।','Google से जारी रखें','इस ब्राउज़र को भूलें','Notcards केवल वही वीडियो पढ़ता है जिसे आप सहेजते हैं.']};
const descriptions={en:'Save YouTube videos and keep their ideas in Notcards.',es:'Guarda videos de YouTube y conserva sus ideas en Notcards.',pt:'Salve vídeos do YouTube e guarde suas ideias no Notcards.',fr:'Enregistrez des vidéos YouTube et gardez leurs idées dans Notcards.',de:'Speichere YouTube-Videos und behalte die Ideen in Notcards.',it:'Salva i video di YouTube e conserva le idee in Notcards.',ja:'YouTube動画とそのアイデアをNotcardsに保存します。',zh_CN:'将 YouTube 视频及其灵感保存到 Notcards。',ar:'احفظ فيديوهات YouTube وأفكارها في Notcards.',hi:'YouTube वीडियो और उनके विचार Notcards में सहेजें।'};
const extraText={en:['Sign in as','Open a YouTube video first.','This video is already being saved.','Sign-in failed. Try again.','This capture belongs to another account. Sign in to the original account to retry.','saved capture(s) waiting to sync'],es:['Sesión iniciada como','Abre un video de YouTube primero.','Este video ya se está guardando.','No se pudo iniciar sesión. Inténtalo de nuevo.','Esta captura pertenece a otra cuenta. Inicia sesión en la cuenta original para reintentarla.','captura(s) esperando sincronización'],pt:['Conectado como','Abra um vídeo do YouTube primeiro.','Este vídeo já está sendo salvo.','Não foi possível entrar. Tente novamente.','Esta captura pertence a outra conta. Entre na conta original para tentar novamente.','captura(s) salvas aguardando sincronização'],fr:['Connecté avec','Ouvrez d’abord une vidéo YouTube.','Cette vidéo est déjà en cours d’enregistrement.','Connexion impossible. Réessayez.','Cette capture appartient à un autre compte. Connectez-vous au compte d’origine pour réessayer.','capture(s) en attente de synchronisation'],de:['Angemeldet als','Öffne zuerst ein YouTube-Video.','Dieses Video wird bereits gespeichert.','Anmeldung fehlgeschlagen. Bitte erneut versuchen.','Dieser Clip gehört zu einem anderen Konto. Melde dich beim ursprünglichen Konto an, um es erneut zu versuchen.','Aufnahmen warten auf Synchronisierung'],it:['Accesso come','Apri prima un video YouTube.','Questo video è già in fase di salvataggio.','Accesso non riuscito. Riprova.','Questa acquisizione appartiene a un altro account. Accedi all’account originale per riprovare.','acquisizioni in attesa di sincronizzazione'],ja:['ログイン中','先にYouTube動画を開いてください。','この動画はすでに保存中です。','ログインできませんでした。もう一度お試しください。','この保存データは別のアカウントに紐付いています。元のアカウントで再試行してください。','同期を待っている保存データ'],zh_CN:['已登录账号','请先打开 YouTube 视频。','此视频正在保存。','登录失败，请重试。','此视频属于另一个账号。请登录原账号后重试。','个已保存项目等待同步'],ar:['تم تسجيل الدخول باسم','افتح فيديو YouTube أولاً.','يجري حفظ هذا الفيديو بالفعل.','تعذر تسجيل الدخول. حاول مرة أخرى.','هذا الالتقاط مرتبط بحساب آخر. سجّل الدخول إلى الحساب الأصلي لإعادة المحاولة.','لقطات محفوظة بانتظار المزامنة'],hi:['इस रूप में साइन इन','पहले YouTube वीडियो खोलें।','यह वीडियो पहले से सहेजा जा रहा है।','साइन इन नहीं हो सका। फिर कोशिश करें।','यह कैप्चर दूसरे खाते का है। फिर कोशिश करने के लिए मूल खाते में साइन इन करें।','सहेजे गए कैप्चर सिंक होने की प्रतीक्षा में']};
const sourceDefault = join(root, 'extensions/notcards');
const sourceFiles = ['manifest.json', 'background.js', 'auth.mjs', 'content.js', 'content.css', 'options.html', 'options.js', 'options.css'];
const iconFiles = [16, 32, 48, 128].map(size => `icons/${size}.png`);

export function extensionId(publicKey) {
  const digest = createHash('sha256').update(Buffer.from(publicKey, 'base64')).digest();
  return [...digest.subarray(0, 16)].map(byte => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15))).join('');
}

export async function buildPackage({source = sourceDefault, output = join(root, 'dist/notcards-extension'), writeUnpacked = true, store = false} = {}) {
  source = resolve(typeof source === 'string' ? source : fileURLToPath(source));
  output = resolve(output);
  if ((await lstat(source)).isSymbolicLink()) throw new Error('Notcards extension source cannot be a symlink');

  const unpacked = join(output, 'unpacked');
  if (writeUnpacked) {
    await rm(unpacked, {recursive: true, force: true});
    await mkdir(unpacked, {recursive: true});
  }

  const sourceCache = new Map();
  const checkedPaths = new Map();
  const generatedFiles = new Map();
  const writtenDirectories = new Set([unpacked]);
  const allowedNames = new Set([...sourceFiles, ...iconFiles]);

  async function readSource(name) {
    if (!allowedNames.has(name) && !/^_locales\/[A-Za-z_]+\/messages\.json$/.test(name)) {
      throw new Error(`Unapproved resource: ${name}`);
    }
    if (sourceCache.has(name)) return sourceCache.get(name);

    let path = source;
    const parts = name.split('/');
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      if (!part || part === '.' || part === '..') throw new Error(`Unapproved resource: ${name}`);
      path = join(path, part);
      let info = checkedPaths.get(path);
      if (!info) {
        info = await lstat(path);
        checkedPaths.set(path, info);
      }
      if (info.isSymbolicLink()) throw new Error('Symlink in extension source');
      const finalPart = index === parts.length - 1;
      if (finalPart ? !info.isFile() || info.size > 1_000_000 : !info.isDirectory()) {
        throw new Error(`Invalid extension resource: ${name}`);
      }
    }

    const bytes = await readFile(path);
    sourceCache.set(name, bytes);
    return bytes;
  }

  async function addFile(name, bytes) {
    generatedFiles.set(name, bytes);
    if (!writeUnpacked) return;
    const target = join(unpacked, ...name.split('/'));
    const directory = dirname(target);
    if (!writtenDirectories.has(directory)) {
      await mkdir(directory, {recursive: true});
      writtenDirectories.add(directory);
    }
    await writeFile(target, bytes);
  }

  const manifestBytes = await readSource('manifest.json');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (manifest.manifest_version !== 3 || manifest.key !== key || extensionId(key) !== 'aimdojafaddgpjhiejbfihfljeacolmk') {
    throw new Error('Development extension identity changed');
  }
  if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(['https://www.youtube.com/*', 'https://not.maremoto.dev/*'])) {
    throw new Error('Unexpected extension host permission');
  }
  if (JSON.stringify(manifest.permissions) !== JSON.stringify(['storage', 'scripting', 'identity'])) {
    throw new Error('Unexpected extension permission');
  }

  const referencedFiles = [manifest.background?.service_worker, manifest.options_page,
    ...(manifest.background?.type === 'module' ? ['auth.mjs'] : []),
    ...(manifest.content_scripts || []).flatMap(script => [...(script.js || []), ...(script.css || [])])];
  if (referencedFiles.some(name => !sourceFiles.includes(name))) throw new Error('Manifest resource is outside the allow-list');

  const packedManifest = store ? {...manifest} : manifest;
  if (store) delete packedManifest.key;
  const packedManifestBytes = store ? Buffer.from(`${JSON.stringify(packedManifest, null, 2)}\n`) : manifestBytes;
  await addFile('manifest.json', packedManifestBytes);
  for (const name of sourceFiles.slice(1)) await addFile(name, await readSource(name));

  const localesDirectory = join(source, '_locales');
  const localeInfo = await lstat(localesDirectory);
  if (localeInfo.isSymbolicLink() || !localeInfo.isDirectory()) throw new Error('Locale directory must be a real directory');
  const currentLocales = (await readdir(localesDirectory)).sort();
  if (JSON.stringify(currentLocales) !== JSON.stringify([...supported].sort())) throw new Error('Expected all ten locales');

  for (const locale of supported) {
    const localePath = `_locales/${locale}/messages.json`;
    const sourceMessages = JSON.parse((await readSource(localePath)).toString('utf8'));
    const [heading, help, signIn, forget, privacy] = optionText[locale];
    const [signedIn, openVideo, alreadySaving, signInFailed, otherAccount, pending] = extraText[locale];
    const localized = {
      extName: 'Notcards', extDescription: descriptions[locale], library: sourceMessages.library.message,
      saveVideo: sourceMessages.saveVideo.message, saving: sourceMessages.saving.message,
      saved: sourceMessages.saved.message, needsTranscript: sourceMessages.needsTranscript.message,
      captureFailed: sourceMessages.captureFailed.message, captureLabel: sourceMessages.captureLabel.message,
      openVideo, alreadySaving, videoChanged: sourceMessages.captureFailed.message, signInFailed,
      otherAccount, optionsHeading: heading, optionsHelp: help, signIn, signedIn,
      forgetBrowser: forget, libraryLink: sourceMessages.library.message, privacy,
      noTranscript: sourceMessages.noTranscript?.message || sourceMessages.captureFailed.message,
      notSignedIn: help, signingIn: sourceMessages.saving.message, pendingCaptures: pending
    };
    const catalog = Object.fromEntries(Object.entries(localized).map(([name, message]) => [name, {message}]));
    await addFile(localePath, Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`));
  }

  for (const name of iconFiles) {
    const bytes = await readSource(name);
    const expectedSize = Number(name.match(/(\d+)\.png$/)[1]);
    if (bytes.readUInt32BE(0) !== 0x89504e47 || bytes.readUInt32BE(16) !== expectedSize) throw new Error(`Invalid icon: ${name}`);
    await addFile(name, bytes);
  }

  const names = [...generatedFiles.keys()].sort();
  const expectedNames = [...sourceFiles, ...iconFiles, ...supported.map(locale => `_locales/${locale}/messages.json`)].sort();
  if (JSON.stringify(names) !== JSON.stringify(expectedNames)) throw new Error('Notcards package is missing a required resource');
  const archive = zipFiles(names.map(name => [name, generatedFiles.get(name)]));
  await mkdir(output, {recursive: true});
  const filename = store ? 'notcards-store.zip' : 'notcards-dev.zip';
  const path = join(output, filename);
  await writeFile(path, archive);

  const report = {
    version: manifest.version, extensionId: store ? null : extensionId(key), filename,
    bytes: archive.length, sha256: createHash('sha256').update(archive).digest('hex'),
    members: names, locales: [...supported].sort(), credentialsIncluded: false,
    origin: 'https://not.maremoto.dev', status: store ? 'store candidate; assigned Store ID must be configured after publication' : 'development build; Chrome Web Store submission pending'
  };
  await writeFile(join(output, store ? 'notcards-store-report.json' : 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  return {...report, path, unpacked: writeUnpacked ? unpacked : null};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args=process.argv.slice(2);
    if(args.some(arg=>arg!=='--store')||args.filter(arg=>arg==='--store').length>1)throw new Error('Usage: node scripts/notcards-extension.mjs [--store]');
    const store=args.includes('--store');
    console.log(JSON.stringify(await buildPackage({store,writeUnpacked:!store}), null, 2));
  }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
