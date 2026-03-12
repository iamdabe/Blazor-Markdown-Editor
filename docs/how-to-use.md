# How to Use Blazor Markdown Editor

## Build
```bash
npm ci
npm run build
```

## Include in Blazor / MudBlazor
Add built assets to your host page or static web assets pipeline:

```html
<link rel="stylesheet" href="_content/<YourPackageOrProject>/blazor-markdown-editor.css" />
<script src="_content/<YourPackageOrProject>/blazor-markdown-editor.js"></script>
```

## JSInterop API
Use the global object:

- `window.blazorMarkdownEditor.create(target, { markdown })` → `editorId`
- `window.blazorMarkdownEditor.setMarkdown(editorId, markdown)`
- `window.blazorMarkdownEditor.getMarkdown(editorId)`
- `window.blazorMarkdownEditor.focus(editorId)`
- `window.blazorMarkdownEditor.destroy(editorId)`

## Typical lifecycle (Blazor)
1. On first render, call `create` with the target element.
2. Push external value changes with `setMarkdown`.
3. Pull current editor state with `getMarkdown` when saving.
4. Dispose with `destroy` in component cleanup.

## Notes
- Keep `wwwroot` outputs as release artifacts (`js`, `min.js`, `css`).
- Use the packaging guidance in [jsinterop-packaging.md](jsinterop-packaging.md).
