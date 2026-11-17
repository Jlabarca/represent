"""Install the Notcards integration in a disposable, pinned LibreChat build context."""
import argparse
from pathlib import Path
import shutil
import subprocess

PIN = "e8f3be08623663d4ad7f7241e693c94469b63bb0"


def apply(upstream):
    git = ["git", "-C", str(upstream)]
    if subprocess.check_output(git + ["rev-parse", "HEAD"], text=True).strip() != PIN:
        raise ValueError("The staging checkout must match the pinned LibreChat revision")
    if subprocess.check_output(git + ["status", "--porcelain"], text=True).strip():
        raise ValueError("Use a clean disposable checkout to preserve existing changes")
    changes = {}

    def insert(relative, anchor, replacement):
        path = upstream / relative
        original = changes.get(path, path.read_text(encoding="utf-8"))
        if original.count(anchor) != 1:
            raise ValueError("Unexpected source in " + relative)
        changes[path] = original.replace(anchor, replacement)

    native = "require('~/server/notcards/native.cjs')"
    mount = "  app.use('/api/mcp', routes.mcp);"
    insert("api/server/index.js", mount, "  app.use('/api/botanic/notcards', " + native + ".route);\n" + mount)
    insert("api/server/services/Endpoints/agents/initialize.js",
           "const primaryAgentPromise = endpointOption.agent;",
           "const primaryAgentPromise = Promise.resolve(endpointOption.agent).then(agent => " +
           native + ".apply(req, agent, conversationId));")
    saved = "        logAgentMemorySnapshot('after_terminal_save', terminalMemoryContext);"
    insert("api/server/controllers/agents/request.js", saved,
           "        if (!responseIsUnfinished && req.notcardsPendingBinding) {\n" +
           "          await " + native + ".persisted(req, conversationId, userMessage?.messageId, savedResponseMessage.messageId)\n" +
           "            .catch(() => logger.warn('Notcards could not confirm the saved conversation'));\n        }\n" + saved)
    for ending, ids in [("await checkpointDeletion?.acknowledge();", "deletedConversationIds"),
                        ("await deleteAllSharedLinksWithCleanup(req.user.id);", "dbResponse.conversationIds")]:
        insert("api/server/routes/convos.js", ending, ending + "\n    await " + native +
               ".deleted(req, " + ids + ").catch(() => logger.warn('Notcards could not confirm deleted conversations'));")
    view = "client/src/components/Chat/ChatView.tsx"
    insert(view, "import ChatForm from './Input/ChatForm';",
           "import ChatForm from './Input/ChatForm';\nimport { NotcardsLaunch } from './NotcardsLaunch';")
    insert(view, "<ChatFormProvider {...methods}>", "<ChatFormProvider {...methods}>\n" +
           "        {conversationId === Constants.NEW_CONVO && <NotcardsLaunch agentId={chatHelpers.conversation?.agent_id} />}")
    source = Path(__file__).resolve().parent
    server = upstream / "api/server/notcards"
    client = upstream / "client/src/components/Chat/NotcardsLaunch.tsx"
    if server.exists() or client.exists():
        raise ValueError("Notcards files already exist in this checkout")
    for file, content in changes.items():
        with file.open("w", encoding="utf-8", newline="\n") as target:
            target.write(content)
    shutil.copytree(source / "server", server)
    shutil.copyfile(source / "client/NotcardsLaunch.tsx", client)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("upstream", type=Path)
    apply(parser.parse_args().upstream.resolve())
