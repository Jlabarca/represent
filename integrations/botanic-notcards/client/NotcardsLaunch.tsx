import { useEffect, useState } from "react";
import { useAuthContext } from "~/hooks/AuthContext";

type Pending = { jti: string; cardId: string; question: string };

/**
 * Render only in the Notcards native workspace. The trusted server endpoint
 * returns a launch only after validating the signed-in Google `googleId`.
 * This component never sends a message; it only offers a one-time composer fill.
 */
export function NotcardsLaunch() {
  const { isAuthenticated, token, user } = useAuthContext();
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!isAuthenticated || user?.provider !== "google" || !token) return;
    let cancelled = false;
    fetch("/api/botanic/notcards/pending", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "same-origin",
      cache: "no-store",
    }).then(async response => {
      if (!response.ok) return null;
      return response.json() as Promise<Pending>;
    }).then(value => { if (!cancelled && value?.jti) setPending(value); })
      .catch(() => { if (!cancelled) setError("Notcards launch unavailable."); });
    return () => { cancelled = true; };
  }, [isAuthenticated, token, user?.provider]);

  function fillComposer(question = pending?.question) {
    if (!question) return false;
    const input = document.querySelector<HTMLTextAreaElement>("#prompt-textarea");
    if (!input) { setError("Open a new Notcards chat to load its first question."); return false; }
    if (input.value.trim()) { setError("The composer already has text. Clear it before loading the Notcards question."); return false; }
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(input, question);
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: question }));
    setLoaded(true);
    setError("First question loaded. Review it and press Botanic Send once.");
    return true;
  }

  useEffect(() => {
    if (!pending) return;
    let done = false;
    const attempt = () => {
      if (done) return;
      if (document.querySelector("#prompt-textarea")) {
        done = true;
        fillComposer(pending.question);
      }
    };
    attempt();
    const observer = new MutationObserver(attempt);
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 8000);
    return () => { done = true; observer.disconnect(); window.clearTimeout(timeout); };
  }, [pending]);

  if (!pending) return error ? <p role="status">{error}</p> : null;
  return <aside aria-label="Notcards handoff" data-testid="notcards-launch">
    <p>Notcards card ready. Its saved source context will be added to this conversation.</p>
    {!loaded && <button type="button" onClick={() => fillComposer()}>Load first question</button>}
    {error && <p role="status">{error}</p>}
  </aside>;
}
