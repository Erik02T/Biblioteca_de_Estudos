import Highlight from "@tiptap/extension-highlight";
import StarterKit from "@tiptap/starter-kit";

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },
  }),
  Highlight.configure({ multicolor: true }),
];
