# VS Code Tunnel

Open the workspace’s worktree through a tunnel detected with `code tunnel status`.

The **VS Code** button appears in the workspace header on desktop and in each agent’s composer on mobile. It tries the VS Code app first, with a fallback to vscode.dev. In a browser, the fallback uses a timer and page focus; it cannot reliably detect whether the app launched.
