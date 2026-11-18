import { Node, mergeAttributes } from "@tiptap/core";
import { closeHistory } from '@tiptap/pm/history';

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggleBlock: {
      setToggleBlock: () => ReturnType;
    };
    callout: {
      setCallout: (attrs?: { variant?: string }) => ReturnType;
    };
  }
}

export const ToggleBlock = Node.create({
  name: "toggleBlock",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.hasAttribute("open"),
        renderHTML: (attributes) => (attributes.open ? { open: "" } : {}),
      },
      summary: {
        default: "Alternante",
        parseHTML: (element) => {
          const attr = element.getAttribute("data-summary");
          if (attr) return attr;
          const summaryEl = element.querySelector("summary");
          return summaryEl?.textContent?.trim() || "Alternante";
        },
        renderHTML: (attributes) => ({ "data-summary": attributes.summary }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'details[data-type="toggle-block"]' }, { tag: "details" }];
  },
  renderHTML({ HTMLAttributes }) {
    const { open, summary, ...rest } = HTMLAttributes as {
      open?: boolean | string;
      summary?: string;
      [key: string]: unknown;
    };
    return [
      "details",
      mergeAttributes(rest, {
        "data-type": "toggle-block",
        class: "toggle-block",
        ...(open === false || open === "false" ? {} : { open: "" }),
        "data-summary": summary ?? "Alternante",
      }),
      ["summary", { contenteditable: "false" }, summary ?? "Alternante"],
      ["div", { class: "toggle-content" }, 0],
    ];
  },
  addCommands() {
    return {
      setToggleBlock:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { open: true, summary: "Alternante" },
            content: [{ type: "paragraph" }],
          }),
    };
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      let currentNode = node;
      const wrapper = document.createElement('div');
      wrapper.className = 'toggle-wrapper';
      const dom = document.createElement("details");
      dom.className = "toggle-block";
      dom.dataset.type = "toggle-block";
      dom.dataset.summary = node.attrs.summary || "Alternante";
      if (node.attrs.open) dom.setAttribute("open", "");

      const summary = document.createElement("summary");
      const summaryTitle = document.createElement('span');
      summaryTitle.textContent = node.attrs.summary || "Alternante";
      summary.append(summaryTitle);
      summary.contentEditable = "false";
      summary.title = "F2 ou clique duas vezes para renomear este alternante";

      const rename = (event: MouseEvent | KeyboardEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const currentTitle = currentNode.attrs.summary || "Alternante";
        const newTitle = window.prompt("Título do alternante:", currentTitle);
        if (newTitle !== null && newTitle.trim()) {
          const position = typeof getPos === "function" ? getPos() : null;
          if (typeof position !== "number") return;
          editor
            .chain()
            .command(({ tr }) => {
              closeHistory(tr);
              tr.setNodeMarkup(position, undefined, {
                ...currentNode.attrs,
                summary: newTitle.trim(),
              });
              return true;
            })
            .run();
        }
      };
      const onSummaryKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'F2' && !event.isComposing && event.keyCode !== 229) rename(event);
      };
      summary.addEventListener("dblclick", rename);
      summary.addEventListener("keydown", onSummaryKeyDown);
      const renameButton = document.createElement('button');
      renameButton.type = 'button';
      renameButton.className = 'toggle-rename';
      renameButton.textContent = 'Renomear';
      renameButton.setAttribute('aria-label', 'Renomear alternante');
      renameButton.addEventListener('click', rename);
      const selectBlock = () => {
        const position = getPos();
        if (typeof position === 'number' && editor.state.selection.from !== position) editor.commands.setNodeSelection(position);
      };
      summary.addEventListener('focusin', selectBlock);
      renameButton.addEventListener('focus', selectBlock);

      const content = document.createElement("div");
      content.className = "toggle-content";

      dom.append(summary, content);
      wrapper.append(dom, renameButton);

      const onToggle = () => {
        // Native toggle events also fire after programmatic updates and undo.
        if (dom.open === currentNode.attrs.open) return;
        const position = typeof getPos === "function" ? getPos() : null;
        if (typeof position !== "number") return;
        editor
          .chain()
          .command(({ tr }) => {
            closeHistory(tr);
            tr.setNodeMarkup(position, undefined, {
              ...currentNode.attrs,
              open: dom.open,
            });
            return true;
          })
          .run();
      };

      dom.addEventListener("toggle", onToggle);

      return {
        dom: wrapper,
        contentDOM: content,
        update: (updated) => {
          if (updated.type.name !== "toggleBlock") return false;
          currentNode = updated;
          const title = updated.attrs.summary || "Alternante";
          if (summaryTitle.textContent !== title) summaryTitle.textContent = title;
          dom.dataset.summary = title;
          if (dom.open !== updated.attrs.open) dom.open = Boolean(updated.attrs.open);
          return true;
        },
        ignoreMutation: mutation => mutation.type !== 'selection' && !content.contains(mutation.target),
        stopEvent: event => summary.contains(event.target as globalThis.Node) || renameButton.contains(event.target as globalThis.Node),
        destroy: () => {
          dom.removeEventListener("toggle", onToggle);
          summary.removeEventListener("dblclick", rename);
          summary.removeEventListener("keydown", onSummaryKeyDown);
          renameButton.removeEventListener('click', rename);
          summary.removeEventListener('focusin', selectBlock);
          renameButton.removeEventListener('focus', selectBlock);
        },
      };
    };
  },
});

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (element) => {
          const attr = element.getAttribute("data-variant");
          if (attr) return attr;
          const match = element.className?.match(/callout-(\w+)/);
          return match ? match[1] : "info";
        },
        renderHTML: (attributes) => ({ "data-variant": attributes.variant }),
      },
    };
  },
  parseHTML() {
    return [
      { tag: 'aside[data-type="callout"]' },
      { tag: 'div[data-type="callout"]' },
      { tag: "aside.callout" },
      { tag: "div.callout" },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: `callout callout-${HTMLAttributes.variant ?? "info"}`,
      }),
      0,
    ];
  },
  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { variant: attrs?.variant ?? "info" },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Destaque" }] }],
          }),
    };
  },
});
