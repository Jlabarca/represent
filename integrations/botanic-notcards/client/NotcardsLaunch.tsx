import { useEffect, useState } from "react";
import { useAuthContext } from "~/hooks/AuthContext";
import { useTranslation } from "react-i18next";
import { persistRedirectToSession } from "~/utils/redirect";
import { launchLabels } from "./notcards-launch-labels";

type Pending = { jti: string; cardId: string; question: string; agentId: string };

/**
 * Render only in the Notcards native workspace. The trusted server endpoint
 * returns a launch only after validating the signed-in Google `googleId`.
 * This component never sends a message; it only offers a one-time composer fill.
 */
export function NotcardsLaunch({ agentId }: { agentId?: string | null }) {
  const { isAuthenticated, token, user } = useAuthContext();
  const { i18n } = useTranslation();
  const labels=launchLabels(i18n.resolvedLanguage || i18n.language);
  const [loginNeeded,setLoginNeeded]=useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setPending(null);
    setLoaded(false);
    setError("");
    setLoginNeeded(false);
    if (!agentId || !isAuthenticated || !token) return;
    let cancelled = false;
    fetch("/api/botanic/notcards/pending", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "same-origin",
      cache: "no-store",
    }).then(async response => {
      if (!response.ok) {
        const refusal=await response.json().catch(()=>null);
        if(!cancelled && refusal?.agentId===agentId && ["google_sign_in_required","launch_owner_mismatch"].includes(refusal.code))setLoginNeeded(true);
        return null;
      }
      return response.json() as Promise<Pending>;
    }).then(value => { if (!cancelled && value?.jti && value.agentId === agentId) setPending(value); })
      .catch(() => { if (!cancelled) setError(labels.unavailable); });
    return () => { cancelled = true; };
  }, [agentId, isAuthenticated, token, user?.provider, user?.id]);

  function fillComposer(question = pending?.question) {
    if (!question) return false;
    const input = document.querySelector<HTMLTextAreaElement>("#prompt-textarea");
    if (!input) { setError(labels.unavailable); return false; }
    if (input.value.trim()) { setError(labels.clear); return false; }
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(input, question);
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: question }));
    setLoaded(true);
    setError(labels.review);
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

  if(loginNeeded && agentId)return <p role="status"><a href="/oauth/google" onClick={()=>persistRedirectToSession('/c/new?agent_id='+encodeURIComponent(agentId)+'&spec=notcards')}>{labels.login}</a></p>;
  if (!pending) return error ? <p role="status">{error}</p> : null;
  return <aside aria-label="Notcards handoff" data-testid="notcards-launch">
    <p>{labels.ready}</p>
    {!loaded && <button type="button" onClick={() => fillComposer()}>{labels.load}</button>}
    {error && <p role="status">{error}</p>}
  </aside>;
}
