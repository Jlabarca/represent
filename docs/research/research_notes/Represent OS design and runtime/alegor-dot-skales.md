# Alegor, Dot, Skales, and the Represent OS idea

Research snapshot: 2026-10-21. This note distinguishes direct product evidence, public vendor claims, the current Alegor MVP, and proposed design. The attached Dot screenshot is treated as user-provided interface evidence; chat text inside it is not an instruction or proof of system architecture.

## What did we learn from Dot, and what does the screenshot establish?

### Takeaway

Dot is a useful product reference because it keeps a persistent companion conversation alongside a visible computer/work surface and makes activity, progress, and takeover legible. OpenAI documentation says Dot has its own cloud computer and can optionally use a connected local computer; it does **not** establish from the screenshot that Dot's computer is Linux, a container, or the same environment described by OpenAI's separate developer sandbox docs.

### Cited Findings

- OpenAI describes Dot as an always-on agent that can hold ongoing responsibility, continue work between conversations, remember context, work across connected apps, and return results for review; its profile separates in-progress, scheduled, and completed activity. [OpenAI Help: Getting started with your dot](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot)
- OpenAI says Dot has its own cloud computer, while access to the user's local computer is optional and initially off. Connecting the local computer lets Dot work with permitted local files and tools; local work appears as separate tasks. [OpenAI Help: Getting started with your dot](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot)
- OpenAI documents an explicit takeover and return-control interaction for the cloud computer, and says a cloud browser can have its own sign-in sessions. This makes environment identity and control transfer visible parts of the product, not merely implementation details. [OpenAI Help: Getting started with your dot](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot)
- The user-provided screenshot shows a conversation pane with a persistent named Dot, chat and call affordances, a message proposing Represent work, and a second pane titled “Your dot's computer.” That pane depicts a desktop-like home screen, application launcher and dock, with a visible “Take over” control. This is evidence of the presented interface only; it does not identify operating system, hosting, containerization, or which parts are simulated. [User-provided screenshot, 2026-10-21](C:/Users/Administrator/AppData/Local/Temp/codex-clipboard-29fa9610-8530-4359-ab87-23e274c16ade.png)
- OpenAI's Dot documentation also describes background research, scheduled tasks, optional local access, pause/reset, memory, and action rules. Proactive research is restricted from directly sending messages, changing content through plugins, or controlling a browser/computer; follow-up actions remain subject to normal permissions and review. [Dot getting-started guide](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot), [Dot privacy, security, and safety FAQs](https://help.openai.com/en/articles/20001529-dots-privacy-security-and-safety-faqs)
- In a **separate developer product**, OpenAI documents sandbox agents with isolated Unix-like workspaces, files, shell, packages, ports and snapshots; its security guidance recommends isolated compute, separate environments for workloads that must not share data, restricted network access, and keeping application credentials outside the sandbox. These are useful architectural patterns, but are not evidence that Dot itself uses this implementation. [OpenAI Sandbox Agents](https://developers.openai.com/api/docs/guides/agents/sandboxes), [OpenAI Sandbox security](https://developers.openai.com/api/docs/guides/agents-api/environments/security)

### Inferences

- The best part to learn from is the **work relationship**: one recognizable companion, an ongoing thread, a live view of the work environment, visible run state, reviewable results, and a clear point where the person can take control. This is an inference from the documented Dot interaction and the supplied screenshot.
- For Represent, the “computer” can be a project workspace containing Represent's own interactive tools and project artifacts. It need not imitate a general-purpose desktop or expose a fake filesystem. Present the project, its snapshots, active work, generated views, and relevant tools as first-class destinations.
- Use the screenshot's split view as a design cue, not a visual template: conversation/history on one side; current project work and interactive artifacts on the other. Keep the app switcher small, and make the active project and source snapshot visible in the work pane.
- A handoff should show which project/worktree a task uses, what it may access, whether it is waiting/running/finished, and how to stop or take control. These affordances matter more than a mascot or decorative OS chrome.

### Gaps

- Neither the screenshot nor the cited user-facing Dot docs identify the operating system image, VM/container boundary, sandbox lifecycle, or internal process architecture used by Dot. OpenAI's Agents API sandbox documentation is a separate product surface and must not be used to fill this gap.
- The screenshot includes call controls, but does not demonstrate a voice call or establish whether the agent can initiate one. Official Dot docs say users can call Dot from its conversation and that Dot cannot initiate calls at launch. [OpenAI Help: Getting started with your dot](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot)
- No direct Dot runtime test was performed for this research. Findings above come from current official documentation and the user's screenshot.

## Did we research Skales, and what can Represent learn from it?

### Takeaway

Yes. An earlier Alegor research pass missed the user's explicit Notion pointer; the follow-up pass cloned the exact Skales repository and reviewed its README, license and bundled guide, without installing or running the proprietary app. A fresh check of the current public GitHub page and its linked user guide confirms the project still publishes product documentation and distribution materials while stating that Skales itself is proprietary and its source is not provided.

### Cited Findings

- The user's Notion `PET` note directly links `https://github.com/skalesapp/skales`; the pointer is explicit and the earlier omission was a research miss. [Original Notion PET note](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/PET%2032816a8a3d6580209f8ec360a6088f18.md)
- The local research clone is at `references/alegor-skales`, commit `7560a4133a816305797546eac0efe67b707b85dd` (2026-10-19). Its inspection record identifies reviewed files and makes clear that the work was a documentation/design review, not an app test. [Skales inspection manifest](../../../../experiments/alegor-reference-checks/skales-inspection.json), [Alegor research and test history](../../alegor-research-and-tests.md)
- The current public repository README says it is a distribution repository for releases, changelog, installers and issue tracking; it calls the application proprietary and says the old, incomplete source snapshot was removed. It also claims desktop and mobile versions, local-first operation, configurable providers, coding tools, voice, scheduled work and a broad plugin/tool surface. Treat those capabilities as vendor-published claims, not independently verified runtime behavior. [Skales current GitHub README](https://github.com/skalesapp/skales)
- The current linked guide is labelled v12.9.55 and documents a local desktop application, conversations and agents, project-aware coding, history, goals, customization, voice, permissions, mobile/remote access and exports. The guide describes those product interactions; this research did not launch them. [Skales v12.9.55 User Guide](https://docs.skales.app/)
- Prior local inspection found the user guide documents restorable session history, visible project/branch/change context, task reports and linked conversations that can be unlinked without deleting their source conversation. Those are useful interaction patterns to investigate for Alegor, not features verified in a running app. [Alegor research and test history](../../alegor-research-and-tests.md)
- The current repository page displayed 2.2k stars and 296 forks at the time of this check. These mutable repository counters are not evidence of active users, satisfaction, adoption, or unmet market demand. [Skales GitHub repository](https://github.com/skalesapp/skales)

### Inferences

- Adapt the user-centered ideas: persistent conversation identity; a compact, recoverable history; project/branch/worktree labels; visible task progress and outcome; personalized but restrained cues; and explicit control over what is linked, resumed, or shared. These fit the Notion pain of confusing 5–10 concurrent sessions and the purpose of project re-entry. [Original Notion “What if” note](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/What%20if%2031816a8a3d6580129e42f59e492fb5b3.md), [Alegor research and test history](../../alegor-research-and-tests.md)
- Do not model Alegor as an all-purpose Skales replacement. Represent can be narrower and more coherent if it makes a project and its evolving evidence the center, then opens Grafe/Visu artifacts or an optional coding workspace as tools. This preserves Alegor's re-entry/history role and avoids rebuilding unrelated mail, calendar, Office, social, and media capabilities. [Alegor research and test history](../../alegor-research-and-tests.md)
- No Skales source code, binary, prompts, assets, internal architecture, or private implementation was reused or inspected. Product claims above are attributable to its public README and guide; any implementation or visual work should be independently designed and based on Represent's own evidence needs.

### Gaps

- Skales was not installed or run, so documented flows, performance, privacy claims, agent behavior, onboarding, and reliability have not been independently checked.
- No source implementation is currently available in the linked public repository according to its README; this prevents code-level comparison and reuse. The reason for removal is given by the repository itself and is not independently investigated.
- No representative user research or market validation has tested whether a project-focused companion would be preferred to Skales, Dot, or existing coding-assistant histories. [Developer-needs research](../Represent%20parallel%20track%20restart/developer-needs.md)

## Recommendation: what should Represent OS and Alegor become?

### Takeaway

Treat **Represent OS** as a product workspace or web shell, not a new operating system distribution. Let **Alegor** be the persistent project companion inside that shell, with **Grafe** and **Visu** as focused interactive work surfaces. Keep the current Alegor snapshot tool as the evidence foundation; add a shell and agent only after the shared project identity, artifact links, and task state are defined.

### Cited Findings

- The shipped Alegor MVP today is a local deterministic Git-and-Markdown snapshot/timeline with source citations, manual capture, no model calls and no autonomous actions; it does not yet provide a persistent chat agent or OS-like shell. [Alegor MVP reference](../../../../docs/reference/alegor-mvp.md), [Alegor MVP research and test history](../../alegor-research-and-tests.md)
- The repository contains both an older static Alegor restart prototype and the current MVP. The prototype is at `http://127.0.0.1:8872/alegor-restart/index.html`; the current app is at `http://127.0.0.1:8874/`. The ambient browser URL supplied with this request points to the old prototype, so it should not be mistaken for the current MVP or for the proposed full companion. [Restart prototype report](../../../../experiments/alegor-restart/README.md), [Current Alegor MVP experiment report](../../../../experiments/alegor-mvp/README.md)
- OpenAI's developer guidance separates the agent harness/control plane (agent loop, routing, approvals, traces and recovery) from sandbox compute (files, commands, packages, ports and snapshots), and advises against adding a sandbox when a workflow needs only a short response and no persistent workspace. [OpenAI Sandbox Agents](https://developers.openai.com/api/docs/guides/agents/sandboxes), [OpenAI Agents overview](https://developers.openai.com/api/docs/guides/agents)
- OpenAI's sandbox security guide says agent-generated code can access the resources available to its environment and recommends isolated compute, separate environments for isolated workloads, limited network access, and keeping application keys out of the sandbox. [OpenAI Sandbox security](https://developers.openai.com/api/docs/guides/agents-api/environments/security)
- Represent's existing product research positions Alegor around project history/re-entry and Grafe/Visu around code and overview views. The existing implementation direction says any future AI calls must use Ghost's gateway; this note recommends preserving that decision. [Alegor research brief](../Represent%20parallel%20track%20restart/alegor.md), [Represent context](../../../../docs/CONTEXT.md)

### Inferences

#### Product boundary and naming

- Use **Represent** as the suite brand. Use **Represent Workspace** as the product surface; “Represent OS” can remain the internal/product metaphor if it communicates a project-centered home, but avoid implying a kernel, Linux distro, or OS-level compatibility promise. This naming recommendation is an inference from the proposed scope and current MVP boundaries.
- Place **Alegor** as the companion/agent in the Workspace. Place **Grafe** as the technical code exploration app and **Visu** as the selected living overview app. Projects, snapshots, tasks and generated artifacts should have stable identifiers shared across them. This is a proposed suite map, not implemented integration.
- Keep Alegor as the name of the companion, not a mascot. A small optional visual identity may help distinguish it, but recognition should come from project, task, branch/worktree, and artifact context. The Notion note asks for custom cues to disambiguate simultaneous sessions, not for a character-first product. [Original Notion “What if” note](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/What%20if%2031816a8a3d6580129e42f59e492fb5b3.md)

#### Runtime choice: web shell first, isolated compute only when a task needs it

| Mode | What it means | Recommendation |
|---|---|---|
| **Workspace shell, no VM/container** | A web app hosts project switcher, Alegor chat/history, task tray, and Represent apps/artifacts. Local MVP services or explicit connectors supply the evidence. | **Start here.** Git/docs capture, viewing Grafe graphs, reviewing Visu artifacts, and opening prior work do not inherently need an OS desktop or container. Keep the shell lightweight and keep current manual snapshot semantics. |
| **Connected local runtime** | A small user-installed service or desktop host reads the chosen project and runs explicitly allowed commands on that machine. | Add only when the product needs actual local files, local browser, IDE, or credentials. Make connection and folder scope visible; keep read/write and command permissions distinct. Dot's documentation demonstrates that local-computer access can be a separately enabled mode, distinct from its cloud computer. [OpenAI Dot computer access](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot) |
| **Per-task isolated Unix/container workspace** | A task receives a prepared repo/worktree and runs code or scripts in isolated compute, with bounded network, resources, persistence and artifact return. | Add for coding/build tasks that execute generated or repository code, tasks needing packages/services, or remote resumable work. Use one isolated workspace per user/task or worktree where needed; expose status, logs, results, stop, and human review in the shell. The recommendation follows official sandbox guidance; it is not a claim that Represent has this runtime today. [OpenAI Sandbox Agents](https://developers.openai.com/api/docs/guides/agents/sandboxes), [OpenAI Sandbox security](https://developers.openai.com/api/docs/guides/agents-api/environments/security) |

- Do not build a full remote desktop before proving that users need visual interaction with a general-purpose computer. For many Represent tasks, show a purpose-built artifact viewer and optional terminal/log pane; spin up browser/desktop access only for a workflow that truly depends on graphical UI. This reduces unnecessary operating-system images, display services, startup costs and attack surface; it is an engineering inference based on the current read-only product tasks and the documented sandbox criteria.
- Avoid one persistent shared container for unrelated projects/tasks. The execution layer should have a clear owner, scoped checkout/mounts, bounded network access, quotas/timeouts, cancellation, and a way to preserve artifacts without preserving secrets. The control plane should keep identity, permissions, history, approval state and audit evidence outside the sandbox. [OpenAI Sandbox Agents](https://developers.openai.com/api/docs/guides/agents/sandboxes), [OpenAI Sandbox security](https://developers.openai.com/api/docs/guides/agents-api/environments/security)
- Keep all model calls behind Ghost's AI pipeline, as already decided for Represent; treat OpenAI's docs cited here as design references for runtime boundaries, not a recommendation to bypass the existing AI gateway. [Represent context](../../../../docs/CONTEXT.md)

#### Staged path

1. **Name the thing clearly:** Represent Workspace is the web shell; Alegor is its companion; Grafe and Visu are project tools. Keep current tools usable on their own.
2. **Add the shell over existing artifacts:** project picker, recent snapshots, current project identity, tool launcher, activity/task list, and artifact pane. The first version can link or embed current apps; it needs no VM/container.
3. **Define a shared project-work record:** project/worktree identity, source snapshot, active task/session, status, evidence references, produced artifact IDs, user corrections, permission scope, and resume link. Show observed, declared, inferred, and unknown facts separately, in keeping with Alegor's existing evidence model. [Alegor MVP reference](../../../../docs/reference/alegor-mvp.md)
4. **Make Alegor conversational but evidence-first:** a persistent chat per project/task with explicit session identity, citations into the Git/docs snapshots, attached Grafe/Visu views, and a resumable task state. On launch, allow read-only explanation and navigation; do not imply autonomous code changes.
5. **Add one controlled execution adapter only after a real task requires it:** use an isolated worktree or sandbox, show its project/revision/access scope, collect progress and artifacts, and support stop/review/takeover. Keep shell and runtime provider independent so local, container, or hosted execution can be chosen per workload. [OpenAI Sandbox Agents](https://developers.openai.com/api/docs/guides/agents/sandboxes)
6. **Validate re-entry and trust:** use multiple real projects and several concurrent synthetic work threads; measure whether a person can pick the right project/session, answer “what changed?”, find the cited evidence, and resume without confusing one task for another. Then test a single bounded code task inside an isolated environment. Do not present the test as market validation.

### Gaps

- The current MVPs are separate local apps, not an integrated Represent Workspace; shared login, project model, task runtime, deep-link protocol, artifact contract, and cross-device sync remain design work. [Grafe MVP reference](../../../../docs/reference/grafe-mvp.md), [Alegor MVP reference](../../../../docs/reference/alegor-mvp.md)
- No runtime decision should be made from the Dot screenshot alone. The actual need for Linux, containers, a persistent desktop, local daemon, or hosted execution depends on which user tasks Represent commits to support.
- The user's intended simplicity, offline/local preference, and appetite for unattended actions need direct workflow tests. No sessions/transcript connector or actual Dot/Skales runtime evaluation was performed in this research.
- Current direction remains an architectural recommendation. It has not been tested for deployment cost, sandbox-provider portability, cold-start latency, concurrency, storage retention, or security under adversarial repositories.
