import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Code, Columns3, Heading1, Heading2, Heading3, Highlighter, ImagePlus, Italic,
  Link2, List, ListOrdered, Loader2, Minus, Quote, Redo2, Rows3, Strikethrough, Table2, Trash2, Underline as UIcon, Undo2,
} from "lucide-react";
import { useMediaUpload } from "@/components/admin/shared";
import { cdnUrl } from "@/lib/cdn";

const COLORS = ["#FFFFFF", "#F4F6F8", "#00A8FF", "#FF9900", "#22C55E", "#EF4444", "#A855F7", "#94A3B8"];

function Btn({ on, active, label, children, disabled }: { on: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return <button type="button" title={label} aria-label={label} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={on}
    className={`flex h-8 min-w-8 items-center justify-center rounded px-1.5 text-sm transition disabled:opacity-40 ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>{children}</button>;
}

function Toolbar({ editor }: { editor: Editor }) {
  const upload = useMediaUpload();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const c = () => editor.chain().focus();
  const inTable = editor.isActive("table");
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-card/95 p-1.5 backdrop-blur">
      <Btn label="Undo" on={() => c().undo().run()} disabled={!editor.can().undo()}><Undo2 className="h-4 w-4" /></Btn>
      <Btn label="Redo" on={() => c().redo().run()} disabled={!editor.can().redo()}><Redo2 className="h-4 w-4" /></Btn>
      <span className="mx-1 h-6 w-px bg-border" />
      <select aria-label="Text style" className="h-8 rounded bg-transparent px-1 text-sm text-foreground hover:bg-muted"
        value={editor.isActive("heading", { level: 1 }) ? "1" : editor.isActive("heading", { level: 2 }) ? "2" : editor.isActive("heading", { level: 3 }) ? "3" : "p"}
        onChange={(e) => { const v = e.target.value; v === "p" ? c().setParagraph().run() : c().toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run(); }}>
        <option value="p">Normal text</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option>
      </select>
      <Btn label="Heading 1" on={() => c().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}><Heading1 className="h-4 w-4" /></Btn>
      <Btn label="Heading 2" on={() => c().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}><Heading2 className="h-4 w-4" /></Btn>
      <Btn label="Heading 3" on={() => c().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}><Heading3 className="h-4 w-4" /></Btn>
      <span className="mx-1 h-6 w-px bg-border" />
      <Btn label="Bold" on={() => c().toggleBold().run()} active={editor.isActive("bold")}><Bold className="h-4 w-4" /></Btn>
      <Btn label="Italic" on={() => c().toggleItalic().run()} active={editor.isActive("italic")}><Italic className="h-4 w-4" /></Btn>
      <Btn label="Underline" on={() => c().toggleUnderline().run()} active={editor.isActive("underline")}><UIcon className="h-4 w-4" /></Btn>
      <Btn label="Strikethrough" on={() => c().toggleStrike().run()} active={editor.isActive("strike")}><Strikethrough className="h-4 w-4" /></Btn>
      <Btn label="Highlight" on={() => c().toggleHighlight({ color: "#FF990055" }).run()} active={editor.isActive("highlight")}><Highlighter className="h-4 w-4" /></Btn>
      <div className="flex items-center gap-0.5 px-1" aria-label="Text color">
        {COLORS.map((col) => <button key={col} type="button" title={`Color ${col}`} aria-label={`Text color ${col}`} onMouseDown={(e) => e.preventDefault()} onClick={() => c().setColor(col).run()}
          className={`h-5 w-5 rounded-full border ${editor.isActive("textStyle", { color: col }) ? "ring-2 ring-primary" : "border-border"}`} style={{ background: col }} />)}
        <label title="Custom color" className="relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border border-border bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]">
          <input type="color" className="absolute inset-0 opacity-0" onChange={(e) => c().setColor(e.target.value).run()} />
        </label>
        <button type="button" className="ml-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => c().unsetColor().run()}>Reset</button>
      </div>
      <span className="mx-1 h-6 w-px bg-border" />
      <Btn label="Bullet list" on={() => c().toggleBulletList().run()} active={editor.isActive("bulletList")}><List className="h-4 w-4" /></Btn>
      <Btn label="Numbered list" on={() => c().toggleOrderedList().run()} active={editor.isActive("orderedList")}><ListOrdered className="h-4 w-4" /></Btn>
      <Btn label="Quote" on={() => c().toggleBlockquote().run()} active={editor.isActive("blockquote")}><Quote className="h-4 w-4" /></Btn>
      <Btn label="Code" on={() => c().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}><Code className="h-4 w-4" /></Btn>
      <Btn label="Divider" on={() => c().setHorizontalRule().run()}><Minus className="h-4 w-4" /></Btn>
      <span className="mx-1 h-6 w-px bg-border" />
      {(["left", "center", "right", "justify"] as const).map((a) => { const I = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify }[a]; return <Btn key={a} label={`Align ${a}`} on={() => c().setTextAlign(a).run()} active={editor.isActive({ textAlign: a })}><I className="h-4 w-4" /></Btn>; })}
      <span className="mx-1 h-6 w-px bg-border" />
      <Btn label="Link" active={editor.isActive("link")} on={() => { const prev = editor.getAttributes("link")["href"] as string | undefined; const url = window.prompt("Link URL", prev ?? "https://"); if (url === null) return; url ? c().extendMarkRange("link").setLink({ href: url }).run() : c().unsetLink().run(); }}><Link2 className="h-4 w-4" /></Btn>
      <Btn label="Insert image" on={() => file.current?.click()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}</Btn>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
        setBusy(true);
        try { const key = await upload(f, "courses"); c().setImage({ src: cdnUrl(key)!, alt: f.name.replace(/\.[^.]+$/, "") }).run(); } catch (err) { toast.error((err as Error).message); }
        setBusy(false);
      }} />
      <Btn label="Insert table" on={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 className="h-4 w-4" /></Btn>
      {inTable && <>
        <Btn label="Add column" on={() => c().addColumnAfter().run()}><Columns3 className="h-4 w-4" /></Btn>
        <Btn label="Add row" on={() => c().addRowAfter().run()}><Rows3 className="h-4 w-4" /></Btn>
        <Btn label="Delete column" on={() => c().deleteColumn().run()}><span className="text-xs">−Col</span></Btn>
        <Btn label="Delete row" on={() => c().deleteRow().run()}><span className="text-xs">−Row</span></Btn>
        <Btn label="Delete table" on={() => c().deleteTable().run()}><Trash2 className="h-4 w-4 text-destructive" /></Btn>
      </>}
    </div>
  );
}

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline, TextStyle, Color, Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder: "Write the full course description…" }),
    ],
    content: value,
    editorProps: { attributes: { class: "rich-content min-h-[320px] px-5 py-4 focus:outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });
  if (!editor) return <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/30" />;
  return <div className="overflow-hidden rounded-xl border border-input bg-background"><Toolbar editor={editor} /><EditorContent editor={editor} /></div>;
}
