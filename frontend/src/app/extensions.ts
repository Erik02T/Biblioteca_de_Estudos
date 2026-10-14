import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },
  }),
  Highlight.configure({ multicolor: true }),
  Placeholder.configure({ placeholder: "Escreva aqui o que você quer lembrar..." }),
  CharacterCount,
  Link.configure({ openOnClick: false }),
  Underline,
];
