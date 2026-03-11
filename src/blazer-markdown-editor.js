import { Schema } from "prosemirror-model";
import { EditorState, Plugin, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { history, undo, redo } from "prosemirror-history";
import {
  InputRule,
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
} from "prosemirror-inputrules";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import {
  schema as mdSchema,
  defaultMarkdownSerializer,
  MarkdownSerializer,
} from "prosemirror-markdown";
import {
  tableNodes,
  columnResizing,
  tableEditing,
  goToNextCell,
} from "prosemirror-tables";
import {
  chainCommands,
  exitCode,
  newlineInCode,
  baseKeymap,
} from "prosemirror-commands";
import markdownit from "markdown-it";

const tNodes = tableNodes({
  tableGroup: "block",
  cellContent: "block+",
  cellAttributes: {
    alignment: {
      default: null,
      getFromDOM: (dom) => (dom.style && dom.style.textAlign) || null,
      setDOMAttr(v, a) {
        if (v) a.style = (a.style || "") + `text-align:${v};`;
      },
    },
  },
});

let nodes = mdSchema.spec.nodes;
for (const [n, s] of Object.entries(tNodes)) nodes = nodes.update(n, s);
const schema = new Schema({ nodes, marks: mdSchema.spec.marks });
const md = markdownit("default", { html: false });

const serializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    table(state, node) {
      const rows = [];
      node.forEach((row, i) => {
        const cells = [];
        row.forEach((cell) => {
          const text = cell.textContent.replace(/\|/g, "\\|");
          cells.push(` ${text} `);
        });
        rows.push(`|${cells.join("|")}|`);

        if (i === 0) {
          const separators = [];
          row.forEach((cell) => {
            const align = cell.attrs.alignment;
            if (align === "center") separators.push(":---:");
            else if (align === "right") separators.push("---:");
            else separators.push("---");
          });
          rows.push(`| ${separators.join(" | ")} |`);
        }
      });
      state.write(rows.join("\n"));
      state.closeBlock(node);
    },
    table_row() {},
    table_cell() {},
    table_header() {},
  },
  defaultMarkdownSerializer.marks,
);

function inlineNodes(tokens) {
  if (!tokens || !tokens.length) return [];
  const out = [];
  const marks = [];

  for (const t of tokens) {
    if (t.type === "text" && t.content) out.push(schema.text(t.content, marks.slice()));
    else if (t.type === "code_inline") out.push(schema.text(t.content, [...marks, schema.marks.code.create()]));
    else if (t.type === "strong_open") marks.push(schema.marks.strong.create());
    else if (t.type === "strong_close") marks.splice(marks.findIndex((m) => m.type === schema.marks.strong), 1);
    else if (t.type === "em_open") marks.push(schema.marks.em.create());
    else if (t.type === "em_close") marks.splice(marks.findIndex((m) => m.type === schema.marks.em), 1);
    else if (t.type === "link_open") marks.push(schema.marks.link.create({ href: (t.attrGet && t.attrGet("href")) || "", title: (t.attrGet && t.attrGet("title")) || "" }));
    else if (t.type === "link_close") marks.splice(marks.findIndex((m) => m.type === schema.marks.link), 1);
    else if (t.type === "softbreak") out.push(schema.text("\n", marks.slice()));
  }
  return out;
}

function parseMarkdown(src) {
  const tokens = md.parse(src || "", {});
  const stack = [{ type: "doc", children: [] }];
  const top = () => stack[stack.length - 1];
  const push = (n) => top().children.push(n);

  for (const t of tokens) {
    if (t.type === "paragraph_open") { stack.push({ type: "paragraph", children: [] }); continue; }
    if (t.type === "heading_open") { stack.push({ type: "heading", attrs: { level: +t.tag.slice(1) }, children: [] }); continue; }
    if (t.type === "blockquote_open") { stack.push({ type: "blockquote", children: [] }); continue; }
    if (t.type === "bullet_list_open") { stack.push({ type: "bullet_list", children: [] }); continue; }
    if (t.type === "ordered_list_open") { stack.push({ type: "ordered_list", attrs: { order: +(t.attrGet && t.attrGet("start")) || 1 }, children: [] }); continue; }
    if (t.type === "list_item_open") { stack.push({ type: "list_item", children: [] }); continue; }
    if (t.type === "table_open") { stack.push({ type: "table", children: [] }); continue; }
    if (t.type === "tr_open") { stack.push({ type: "table_row", children: [] }); continue; }
    if (t.type === "thead_open" || t.type === "tbody_open") continue;
    if (t.type === "th_open" || t.type === "td_open") {
      const sty = (t.attrGet && t.attrGet("style")) || "";
      const m = sty.match(/text-align:\s*(\w+)/);
      stack.push({ type: t.type === "th_open" ? "table_header" : "table_cell", attrs: { alignment: m ? m[1] : null }, children: [] });
      continue;
    }

    if (t.type === "paragraph_close") { const f = stack.pop(); push(schema.node("paragraph", null, inlineNodes(f.children))); continue; }
    if (t.type === "heading_close") { const f = stack.pop(); push(schema.node("heading", f.attrs, inlineNodes(f.children))); continue; }
    if (t.type === "blockquote_close") { const f = stack.pop(); push(schema.node("blockquote", null, f.children.length ? f.children : [schema.node("paragraph")])); continue; }
    if (t.type === "bullet_list_close") { const f = stack.pop(); push(schema.node("bullet_list", null, f.children)); continue; }
    if (t.type === "ordered_list_close") { const f = stack.pop(); push(schema.node("ordered_list", f.attrs, f.children)); continue; }
    if (t.type === "list_item_close") { const f = stack.pop(); push(schema.node("list_item", null, f.children.length ? f.children : [schema.node("paragraph")])); continue; }
    if (t.type === "table_close") { const f = stack.pop(); push(schema.node("table", null, f.children)); continue; }
    if (t.type === "tr_close") { const f = stack.pop(); push(schema.node("table_row", null, f.children)); continue; }
    if (t.type === "th_close" || t.type === "td_close") {
      const f = stack.pop();
      const il = inlineNodes(f.children);
      push(schema.node(f.type, f.attrs, il.length ? [schema.node("paragraph", null, il)] : [schema.node("paragraph")]));
      continue;
    }

    if (t.type === "fence" || t.type === "code_block") {
      const txt = (t.content || "").replace(/\n$/, "");
      push(schema.node("code_block", null, txt ? [schema.text(txt)] : []));
      continue;
    }
    if (t.type === "hr") { push(schema.node("horizontal_rule")); continue; }
    if (t.type === "inline" && t.children) { top().children.push(...t.children); continue; }
  }

  const doc = stack[0];
  return schema.node("doc", null, doc.children.length ? doc.children : [schema.node("paragraph")]);
}

function buildBlockInputRules() {
  const rules = [];
  if (schema.nodes.blockquote) rules.push(wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote));
  if (schema.nodes.ordered_list) rules.push(wrappingInputRule(/^\s*(\d+)\.\s$/, schema.nodes.ordered_list, (m) => ({ order: +m[1] })));
  if (schema.nodes.bullet_list) rules.push(wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bullet_list));
  if (schema.nodes.code_block) rules.push(textblockTypeInputRule(/^```$/, schema.nodes.code_block));
  if (schema.nodes.horizontal_rule) rules.push(new InputRule(/^---$/, (state, _m, start, end) => state.tr.replaceWith(start - 1, end, schema.nodes.horizontal_rule.create())));
  if (schema.nodes.heading) rules.push(textblockTypeInputRule(/^(#{1,6})\s$/, schema.nodes.heading, (m) => ({ level: m[1].length })));
  return inputRules({ rules });
}

function tableInputRulePlugin() {
  return new Plugin({
    props: {
      handleKeyDown(view, event) {
        if (event.key !== "Enter") return false;
        const { state } = view;
        const { $head } = state.selection;
        const parentNode = $head.parent;
        if (parentNode.type.name !== "paragraph") return false;

        const currentLine = parentNode.textContent;
        if (!currentLine.match(/^\s*\|[\s:]*-{3,}[\s:]*(?:\|[\s:]*-{3,}[\s:]*)+\|?\s*$/)) return false;

        const grandParent = $head.node($head.depth - 1);
        const myIndex = $head.index($head.depth - 1);
        if (myIndex === 0) return false;

        const headerBlock = grandParent.child(myIndex - 1);
        if (headerBlock.type.name !== "paragraph") return false;

        const headerText = headerBlock.textContent;
        if (!headerText.match(/^\s*\|.+\|/)) return false;

        const headerCells = headerText.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
        const sepCells = currentLine.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
        if (headerCells.length < 2 || sepCells.length !== headerCells.length) return false;

        const aligns = sepCells.map((s) => {
          const left = s.startsWith(":");
          const right = s.endsWith(":");
          if (left && right) return "center";
          if (right) return "right";
          return null;
        });

        const headerRow = schema.nodes.table_row.create(
          null,
          headerCells.map((text, i) =>
            schema.nodes.table_header.create(
              { alignment: aligns[i] || null },
              text ? [schema.node("paragraph", null, [schema.text(text)])] : [schema.node("paragraph")],
            ),
          ),
        );

        const emptyRow = schema.nodes.table_row.create(
          null,
          headerCells.map((_, i) => schema.nodes.table_cell.create({ alignment: aligns[i] || null }, [schema.node("paragraph")])),
        );

        const table = schema.nodes.table.create(null, [headerRow, emptyRow]);

        let pos = $head.before($head.depth - 1);
        for (let i = 0; i < myIndex - 1; i++) pos += grandParent.child(i).nodeSize;
        const hStart = pos;
        const sepEnd = hStart + headerBlock.nodeSize + parentNode.nodeSize;

        const tr = state.tr.replaceWith(hStart, sepEnd, table);
        view.dispatch(tr);
        event.preventDefault();
        return true;
      },
    },
  });
}

function codeBlockEscapeKeymap() {
  return keymap({
    Enter: (state, dispatch) => {
      const { $head } = state.selection;
      if ($head.parent.type.name !== "code_block") return false;

      const codeBlock = $head.parent;
      const cursorAtEnd = $head.parentOffset === codeBlock.content.size;
      if (!(cursorAtEnd && codeBlock.textContent.endsWith("\n"))) return false;

      if (dispatch) {
        const codeBlockPos = $head.before($head.depth);
        const tr = state.tr;
        tr.delete(codeBlockPos + codeBlock.content.size, codeBlockPos + codeBlock.content.size + 1);
        const afterPos = codeBlockPos + codeBlock.nodeSize - 1;
        tr.insert(afterPos, schema.node("paragraph"));
        tr.setSelection(TextSelection.near(tr.doc.resolve(afterPos + 1)));
        dispatch(tr);
      }
      return true;
    },
  });
}

function createPlugins() {
  return [
    tableInputRulePlugin(),
    history(),
    dropCursor(),
    gapCursor(),
    keymap({
      "Mod-z": undo,
      "Shift-Mod-z": redo,
      "Mod-y": redo,
      Enter: chainCommands(newlineInCode, exitCode),
    }),
    keymap(baseKeymap),
    buildBlockInputRules(),
    codeBlockEscapeKeymap(),
    columnResizing(),
    tableEditing(),
    keymap({ Tab: goToNextCell(1), "Shift-Tab": goToNextCell(-1) }),
  ];
}

const editors = new Map();
let idCounter = 1;

function resolveTarget(target) {
  if (typeof target === "string") return document.querySelector(target);
  return target;
}

function create(target, options = {}) {
  const el = resolveTarget(target);
  if (!el) throw new Error("blazerMarkdownEditor.create: target element not found");

  const doc = parseMarkdown(options.markdown || "");
  const view = new EditorView(el, {
    state: EditorState.create({ doc, plugins: createPlugins() }),
  });

  const id = String(idCounter++);
  editors.set(id, { view });
  return id;
}

function getEditor(id) {
  const editor = editors.get(String(id));
  if (!editor) throw new Error(`blazerMarkdownEditor: unknown editor id '${id}'`);
  return editor;
}

function setMarkdown(id, markdown) {
  const { view } = getEditor(id);
  const doc = parseMarkdown(markdown || "");
  view.updateState(EditorState.create({ doc, plugins: createPlugins() }));
}

function getMarkdown(id) {
  const { view } = getEditor(id);
  return serializer.serialize(view.state.doc);
}

function focus(id) {
  getEditor(id).view.focus();
}

function destroy(id) {
  const key = String(id);
  const editor = getEditor(key);
  editor.view.destroy();
  editors.delete(key);
}

export const blazerMarkdownEditor = { create, setMarkdown, getMarkdown, focus, destroy };
window.blazerMarkdownEditor = blazerMarkdownEditor;
