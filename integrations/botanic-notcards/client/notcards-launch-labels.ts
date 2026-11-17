const copy: Record<string, readonly string[]> = {
  en: ["Continue with the Google account used for this card","Your card’s sources are ready.","Load question","Review your question and press Send.","Clear the composer to load the card’s question.","Open this card in Notcards and try again."],
  es: ["Continuar con la cuenta de Google de esta carta","Las fuentes de tu carta están listas.","Cargar pregunta","Revisa tu pregunta y pulsa Enviar.","Vacía el cuadro de texto para cargar la pregunta de la carta.","Abre esta carta en Notcards e inténtalo de nuevo."],
  pt: ["Continuar com a conta Google deste cartão","As fontes do cartão estão prontas.","Carregar pergunta","Revise sua pergunta e pressione Enviar.","Limpe o campo de texto para carregar a pergunta do cartão.","Abra o cartão no Notcards e tente novamente."],
  fr: ["Continuer avec le compte Google de cette carte","Les sources de votre carte sont prêtes.","Charger la question","Vérifiez votre question puis cliquez sur Envoyer.","Videz le champ de saisie pour charger la question.","Ouvrez cette carte dans Notcards et réessayez."],
  de: ["Mit dem Google-Konto dieser Karte fortfahren","Die Quellen deiner Karte sind bereit.","Frage laden","Prüfe deine Frage und klicke auf Senden.","Leere das Eingabefeld, um die Frage zu laden.","Öffne diese Karte in Notcards und versuche es erneut."],
  it: ["Continua con l’account Google di questa carta","Le fonti della carta sono pronte.","Carica domanda","Controlla la domanda e premi Invia.","Svuota il campo di testo per caricare la domanda della carta.","Apri questa carta in Notcards e riprova."],
  ja: ["このカードで使用した Google アカウントで続行","カードの資料を読み込みました。","質問を読み込む","質問を確認して送信してください。","入力欄を空にしてカードの質問を読み込んでください。","Notcards でカードを開いてやり直してください。"],
  zh: ["使用此卡片所属的 Google 账号继续","卡片的资料已就绪。","载入问题","检查问题后点击发送。","请先清空输入框，再载入卡片的问题。","请在 Notcards 中打开此卡片并重试。"],
  ar: ["المتابعة باستخدام حساب Google المرتبط بهذه البطاقة","مصادر بطاقتك جاهزة.","تحميل السؤال","راجع سؤالك ثم اضغط على إرسال.","أفرغ حقل الكتابة لتحميل سؤال البطاقة.","افتح هذه البطاقة في Notcards وحاول مجددًا."],
  hi: ["इस कार्ड के Google खाते से जारी रखें","आपके कार्ड के स्रोत तैयार हैं।","सवाल लोड करें","अपना सवाल जाँचें और भेजें दबाएँ।","कार्ड का सवाल लोड करने के लिए टेक्स्ट फ़ील्ड खाली करें।","इस कार्ड को Notcards में खोलकर फिर कोशिश करें।"]
};

export function launchLabels(locale: string) {
  const [login,ready,load,review,clear,unavailable]=copy[locale?.toLowerCase().split('-')[0]] || copy.en;
  return {login,ready,load,review,clear,unavailable};
}
