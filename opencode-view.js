const vscode = require('vscode')

function activate(context) {
  let disposable = vscode.commands.registerCommand('antigravity.openOpenCodeWeb', function () {
    // Crear y mostrar el panel del Webview
    const panel = vscode.window.createWebviewPanel(
      'openCodeWeb', // Identificador interno
      'OpenCode Web', // Título de la pestaña
      vscode.ViewColumn.One, // Columna donde se abrirá
      {
        enableScripts: true, // Permitir que la web ejecute sus scripts
        retainContextWhenHidden: true, // Evita que la web se recargue al cambiar de pestaña
      }
    )

    // Inyectar el HTML con la URL de OpenCode Web
    panel.webview.html = getWebviewContent()
  })

  context.subscriptions.push(disposable)
}

function getWebviewContent() {
  return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>OpenCode Web</title>
            <style>
                body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background-color: #1e1e1e; }
                iframe { width: 100%; height: 100%; border: none; }
            </style>
        </head>
        <body>
            <iframe
                src="https://opencode.net"
                allow="clipboard-read; clipboard-write; microphone; camera"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads">
            </iframe>
        </body>
        </html>
    `
}

exports.activate = activate
