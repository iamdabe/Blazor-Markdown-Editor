# Blazer Markdown Editor
A lightweight ProseMirror-based Markdown editor for Blazor (including MudBlazor) with slash commands, table editing, and JSInterop-friendly APIs.

## Contents
- **[Features](#features)**
- **[Preview](#preview)**
  - [Desktop](#desktop)
  - [Mobile](#mobile)
- **[Install](#install)**
  - [Install Method 1](#install-method-1)
- **[Third-Party](#third-party)**

Additional docs:
- [JSInterop Packaging](docs/jsinterop-packaging.md)
- [How to Use](docs/how-to-use.md)

## Features
* Markdown-first authoring with ProseMirror document model and serializer
* Blazor-focused JSInterop API: `create`, `setMarkdown`, `getMarkdown`, `focus`, `destroy`
* Productive editing features: slash menu, table controls, link toolbar, and keyboard shortcuts

## Preview
### Desktop
Use `samples/index.html` to preview editor behavior in desktop browsers.

### Mobile
Use device emulation (or a real device) with `samples/index.html` to validate responsive behavior and touch interactions.

## Install
### Install Method 1
1. Install dependencies:
   - `npm ci`
2. Build distributable assets:
   - `npm run build`
3. Include generated assets from `wwwroot` in your Blazor app:
   - `blazer-markdown-editor.css`
   - `blazer-markdown-editor.js`
   - `blazer-markdown-editor.min.js`
4. Call the global API via JSInterop:
   - `window.blazerMarkdownEditor.create(...)`
   - `window.blazerMarkdownEditor.setMarkdown(...)`
   - `window.blazerMarkdownEditor.getMarkdown(...)`
   - `window.blazerMarkdownEditor.focus(...)`
   - `window.blazerMarkdownEditor.destroy(...)`

Versioning uses a calendar schema: `YYYY.MINOR.PATCH` (current: `2026.2.1`).

## Third-Party
* markdown-it 14.1.0
* prosemirror-commands 1.6.2
* prosemirror-dropcursor 1.8.1
* prosemirror-gapcursor 1.3.2
* prosemirror-history 1.4.1
* prosemirror-inputrules 1.4.0
* prosemirror-keymap 1.2.2
* prosemirror-markdown 1.13.2
* prosemirror-model 1.24.1
* prosemirror-schema-list 1.5.1
* prosemirror-state 1.4.3
* prosemirror-tables 1.8.3
* prosemirror-view 1.38.1
