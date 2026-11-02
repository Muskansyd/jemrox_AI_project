function normalizeEscapedMarkup(value) {
  if (typeof value !== 'string') return '';

  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

function openFileInEditor(fileName) {
  if (!appState.currentProjectCode) return;

  let rawCode = "";
  if (fileName === 'index.html') rawCode = appState.currentProjectCode.html;
  else if (fileName === 'style.css') rawCode = appState.currentProjectCode.css;
  else if (fileName === 'script.js') rawCode = appState.currentProjectCode.js;

  const textarea = document.getElementById('codeEditorTextarea');

  if (textarea) {
    textarea.value = rawCode;
    textarea.style.whiteSpace = "pre";
    textarea.dispatchEvent(new Event('input'));
  }
}

// website preview summary rendering
// website preview rendering function - 100% Fixed and Cleaned

function renderWebsite(html, css, js) {
  // ⚡ SELECTION: Target your authentic container references present in index.html
  const targets = [
    document.getElementById('previewView'),
    document.getElementById('previewContainer'),
    document.getElementById('preview-sandbox')
  ].filter(Boolean); // Filters out any unrendered null slots safely

  // 🧽 CRITICAL CLEANER: Strip broken tailwind.min.css link coming from AI to prevent about:srcdoc 404 errors
  let cleanedHtml = normalizeEscapedMarkup(html || '');
  cleanedHtml = cleanedHtml.replace(/<link[^>]*href=["']?.*tailwind(?:.*\.css)?["']?[^>]*>/gi, '');

  // Clean robotic escaped characters if present
  cleanedHtml = cleanedHtml.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  targets.forEach(function (container) {
    if (!container) return;

    let iframe;
    if (container.tagName.toLowerCase() === 'iframe') {
      iframe = container;
    } else {
      container.innerHTML = '';
      iframe = document.createElement('iframe');
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.background = "#0b0f19"; // Standard beautiful dark layout match
      iframe.title = "Jemrox Active Sandboxed Preview Engine";
      container.appendChild(iframe);
    }

    const safeJsCode = normalizeEscapedMarkup(js || '');
    const safeCssCode = normalizeEscapedMarkup(css || '');

    const dynamicSourceDoc = 
        '<!DOCTYPE html>\n' +
        '<html lang="en">\n' +
        '<head>\n' +
        '    <meta charset="UTF-8">\n' +
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '    <!-- Official Standalone Tailwind CSS Play Engine with Production configurations -->\n' +
        '    <script src="https://tailwindcss.com"><\/script>\n' +
        '    <style>\n' +
        '        ' + safeCssCode + '\n' +
        '    </style>\n' +
        '</head>\n' +
        '<body class="bg-[#0b0f19] min-h-screen text-gray-100 p-6 flex flex-col items-center justify-start overflow-y-auto">\n' +
        '    ' + cleanedHtml + '\n' +
        '    <script>\n' +
        '        try {\n' +
        '            ' + safeJsCode + '\n' +
        '        } catch (sandboxException) {\n' +
        '            console.error("Runtime component failure inside Jemrox Sandbox:", sandboxException);\n' +
        '        }\n' +
        '    <\/script>\n' +
        '</body>\n' +
        '</html>';

    // Flush source documentation directly to freeze token leaks
    iframe.srcdoc = dynamicSourceDoc;
  });
}
