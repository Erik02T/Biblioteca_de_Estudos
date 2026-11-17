import Highlight from "@tiptap/extension-highlight";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { Callout, ToggleBlock } from "./editor-blocks";
import { DocumentCodeBlock } from './document-code';
import { DocumentImage, DocumentAttachment, PageReference } from './document-nodes';
import { DocumentIdentity, DocumentBlockKeys } from './document-identity';

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },
    codeBlock: false,
  }),
  DocumentCodeBlock,
  Highlight.configure({ multicolor: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
  ToggleBlock,
  Callout,
  DocumentImage,
  DocumentAttachment,
  PageReference,
  DocumentIdentity,
  DocumentBlockKeys,
];
