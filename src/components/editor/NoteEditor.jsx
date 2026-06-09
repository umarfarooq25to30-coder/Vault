// Tiptap-based rich-text note editor component with auto-saving, placeholder support, and embedded assets.

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { Typography } from "@tiptap/extension-typography";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Link } from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Youtube } from "@tiptap/extension-youtube";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import {
  GripVertical,
  Loader2,
  CheckCircle2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  LayoutList,
  Scissors,
  Group,
} from "lucide-react";
import { common, createLowlight } from "lowlight";
import CodeBlockWithLineNumbers from "./CodeBlockWithLineNumbers";
import { Extension } from "@tiptap/core";

import EditorToolbar from "./EditorToolbar";
import ResizableImage from "./ResizableImage";
import ResizableVideo from "./ResizableVideo";

// Simple debounce helper
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Custom FontSize extension
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});

// Custom LineHeight extension
const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() {
    return {
      types: ["paragraph", "heading"],
      defaultLineHeight: "1.75",
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: (el) =>
              el.style.lineHeight || this.options.defaultLineHeight,
            renderHTML: (attrs) => {
              if (!attrs.lineHeight) return {};
              return { style: `line-height: ${attrs.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lh) =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { lineHeight: lh }),
          );
        },
    };
  },
});

// Custom TableCell extension with support for colors, alignments and details.
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
      },
      textColor: {
        default: null,
        parseHTML: (element) => element.style.color || null,
      },
      textAlign: {
        default: "left",
        parseHTML: (element) => element.style.textAlign || "left",
      },
      width: {
        default: null,
        parseHTML: (element) => element.style.width || null,
      },
      height: {
        default: null,
        parseHTML: (element) => element.style.height || null,
      },
      borderTop: {
        default: null,
        parseHTML: (element) => element.style.borderTop || null,
      },
      borderRight: {
        default: null,
        parseHTML: (element) => element.style.borderRight || null,
      },
      borderBottom: {
        default: null,
        parseHTML: (element) => element.style.borderBottom || null,
      },
      borderLeft: {
        default: null,
        parseHTML: (element) => element.style.borderLeft || null,
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const styles = [];
    if (node.attrs.backgroundColor)
      styles.push(`background-color: ${node.attrs.backgroundColor}`);
    if (node.attrs.textColor) styles.push(`color: ${node.attrs.textColor}`);
    if (node.attrs.textAlign && node.attrs.textAlign !== "left")
      styles.push(`text-align: ${node.attrs.textAlign}`);
    if (node.attrs.width) styles.push(`width: ${node.attrs.width}`);
    if (node.attrs.height) styles.push(`height: ${node.attrs.height}`);
    if (node.attrs.borderTop)
      styles.push(`border-top: ${node.attrs.borderTop}`);
    if (node.attrs.borderRight)
      styles.push(`border-right: ${node.attrs.borderRight}`);
    if (node.attrs.borderBottom)
      styles.push(`border-bottom: ${node.attrs.borderBottom}`);
    if (node.attrs.borderLeft)
      styles.push(`border-left: ${node.attrs.borderLeft}`);

    const styleAttr = styles.length > 0 ? styles.join("; ") + ";" : undefined;

    const {
      backgroundColor,
      textColor,
      textAlign,
      width,
      height,
      borderTop,
      borderRight,
      borderBottom,
      borderLeft,
      ...restAttrs
    } = HTMLAttributes;

    return [
      "td",
      {
        ...restAttrs,
        style:
          [restAttrs.style, styleAttr].filter(Boolean).join("; ") || undefined,
      },
      0,
    ];
  },
});

// Custom TableHeader extension with support for custom colors and text alignment.
const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
      },
      textColor: {
        default: null,
        parseHTML: (element) => element.style.color || null,
      },
      textAlign: {
        default: "left",
        parseHTML: (element) => element.style.textAlign || "left",
      },
      width: {
        default: null,
        parseHTML: (element) => element.style.width || null,
      },
      height: {
        default: null,
        parseHTML: (element) => element.style.height || null,
      },
      borderTop: {
        default: null,
        parseHTML: (element) => element.style.borderTop || null,
      },
      borderRight: {
        default: null,
        parseHTML: (element) => element.style.borderRight || null,
      },
      borderBottom: {
        default: null,
        parseHTML: (element) => element.style.borderBottom || null,
      },
      borderLeft: {
        default: null,
        parseHTML: (element) => element.style.borderLeft || null,
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const styles = [];
    if (node.attrs.backgroundColor)
      styles.push(`background-color: ${node.attrs.backgroundColor}`);
    if (node.attrs.textColor) styles.push(`color: ${node.attrs.textColor}`);
    if (node.attrs.textAlign && node.attrs.textAlign !== "left")
      styles.push(`text-align: ${node.attrs.textAlign}`);
    if (node.attrs.width) styles.push(`width: ${node.attrs.width}`);
    if (node.attrs.height) styles.push(`height: ${node.attrs.height}`);
    if (node.attrs.borderTop)
      styles.push(`border-top: ${node.attrs.borderTop}`);
    if (node.attrs.borderRight)
      styles.push(`border-right: ${node.attrs.borderRight}`);
    if (node.attrs.borderBottom)
      styles.push(`border-bottom: ${node.attrs.borderBottom}`);
    if (node.attrs.borderLeft)
      styles.push(`border-left: ${node.attrs.borderLeft}`);

    const styleAttr = styles.length > 0 ? styles.join("; ") + ";" : undefined;

    const {
      backgroundColor,
      textColor,
      textAlign,
      width,
      height,
      borderTop,
      borderRight,
      borderBottom,
      borderLeft,
      ...restAttrs
    } = HTMLAttributes;

    return [
      "th",
      {
        ...restAttrs,
        style:
          [restAttrs.style, styleAttr].filter(Boolean).join("; ") || undefined,
      },
      0,
    ];
  },
});

const lowlight = createLowlight(common);

const TableCellSelectAll = Extension.create({
  name: "tableCellSelectAll",
  addKeyboardShortcuts() {
    return {
      "Mod-a": () => {
        const { state } = this.editor;
        const { selection } = state;
        let cellDepth = -1;
        for (let depth = selection.$anchor.depth; depth > 0; depth--) {
          const node = selection.$anchor.node(depth);
          if (
            node.type.name === "tableCell" ||
            node.type.name === "tableHeader"
          ) {
            cellDepth = depth;
            break;
          }
        }
        if (cellDepth > -1) {
          const start = selection.$anchor.start(cellDepth);
          const end = selection.$anchor.end(cellDepth);
          this.editor.commands.setTextSelection({ from: start, to: end });
          return true;
        }
        return false;
      },
    };
  },
});

const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },
    codeBlock: false, // Replaced by CodeBlockLowlight
    bulletList: { keepMarks: true, keepAttributes: true },
    orderedList: { keepMarks: true, keepAttributes: true },
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Underline,
  TextStyle,
  Color,
  FontFamily.configure({
    types: ["textStyle"],
  }),
  FontSize,
  LineHeight,
  TextAlign.configure({
    types: ["heading", "paragraph"],
    alignments: ["left", "center", "right", "justify"],
  }),
  Highlight.configure({ multicolor: true }),
  Typography,
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "heading") {
        return "Heading...";
      }
      return "Start writing, or type / for commands...";
    },
    showOnlyWhenEditable: true,
  }),
  CharacterCount,
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: {
      class: "editor-link",
      rel: "noopener noreferrer",
      target: "_blank",
    },
  }),
  ResizableImage.configure({
    allowBase64: true,
    HTMLAttributes: {
      class: "editor-image",
    },
  }),
  ResizableVideo,
  Table.configure({ resizable: true }),
  TableRow,
  CustomTableHeader,
  CustomTableCell,
  TableCellSelectAll,
  Youtube.configure({
    width: 640,
    height: 360,
  }),
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: "javascript",
  }).extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockWithLineNumbers);
    },
  }),
];

const TABLE_CELL_COLORS = [
  "#1A1A1A",
  "#2A2A2A",
  "#3A3A3A",
  "#1a2744",
  "#1a3a2a",
  "#3a1a1a",
  "#2a1a3a",
  "#3a2a1a",
  "#1a3a3a",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F0F0F0",
  "#FECACA",
  "#BBF7D0",
  "#BFDBFE",
  "#E9D5FF",
  "#FED7AA",
  "#FEF08A",
];

export function NoteEditor({
  note,
  onSave,
  derivedKey,
  saveStatus,
  setSaveStatus,
  readOnly = false,
}) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [toolbarTick, setToolbarTick] = useState(0);
  const [cellBgColor, setCellBgColor] = useState(null);
  const [styleScope, setStyleScope] = useState("cell"); // 'cell', 'row', 'column', 'table'
  const [borderStyle, setBorderStyle] = useState("solid"); // 'solid', 'dashed', 'dotted', 'double'
  const [borderWidth, setBorderWidth] = useState("1px"); // '1px', '2px', '3px', '4px'
  const [borderColor, setBorderColor] = useState("#888888"); // border color hex
  const [borderDirection, setBorderDirection] = useState("all"); // 'all', 'top', 'bottom', 'left', 'right', 'none'

  // Custom sizing targets and visibility controllers for table tools
  const [resizeTarget, setResizeTarget] = useState("single");
  const [showTableToolbar, setShowTableToolbar] = useState(false);

  const noteIdRef = useRef(note?.id);
  const isToolbarActionRef = useRef(false);

  // Dummy to preserve signature locally without crashing
  const syncTableActiveState = useCallback((editorInst) => {}, []);

  // Synchronize ref
  useEffect(() => {
    noteIdRef.current = note?.id;
  }, [note?.id]);

  // Debounced save
  const debouncedSave = useMemo(
    () =>
      debounce(async (contentUpdates, currentNoteId) => {
        if (!currentNoteId || !derivedKey) return;
        setSaveStatus("saving");
        try {
          await onSave(currentNoteId, {
            data: contentUpdates.content,
          });
          setSaveStatus("saved");
          setTimeout(() => {
            setSaveStatus("idle");
          }, 2000);
        } catch (err) {
          setSaveStatus("error");
        }
      }, 1000),
    [derivedKey, onSave, setSaveStatus],
  );

  // Command executor wrapping tool behavior
  const runCommand = useCallback((commandFn) => {
    isToolbarActionRef.current = true;
    commandFn();
    setToolbarTick((t) => t + 1);
  }, []);

  const editor = useEditor({
    extensions,
    content: note?.data || "",
    editable: !readOnly,
    autofocus: readOnly ? false : "end",
    editorProps: {
      attributes: {
        class:
          "vault-editor focus:outline-none min-h-[450px] text-[#1A1A1A] dark:text-white",
        spellcheck: readOnly ? "false" : "true",
      },
    },
    onSelectionUpdate: ({ editor }) => {
      if (readOnly) return;
      setToolbarTick((t) => t + 1);
      syncTableActiveState(editor);
    },
    onUpdate: ({ editor }) => {
      if (readOnly) return;
      syncTableActiveState(editor);
      // Avoid debounced saving during formatting/toolbar commands to guarantee immediate tool-indicator bg responsiveness
      if (isToolbarActionRef.current) {
        isToolbarActionRef.current = false;
        return;
      }

      const html = editor.getHTML();
      const text = editor.getText();
      const wordCount =
        text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
      const charCount = editor.storage.characterCount.characters();

      if (noteIdRef.current) {
        debouncedSave(
          {
            content: html,
            wordCount,
            characterCount: charCount,
          },
          noteIdRef.current,
        );
      }
    },
    onBlur: ({ editor }) => {
      if (readOnly) return;
      // Force instant synchronous background save on blur
      const html = editor.getHTML();
      if (noteIdRef.current && derivedKey) {
        onSave(noteIdRef.current, { data: html });
      }
    },
  });

  useKeyboardShortcuts({
    onSave: () => {
      // Force instant save based on the debounce logic
      if (noteIdRef.current && derivedKey && !readOnly && onSave && editor) {
        onSave(noteIdRef.current, { data: htmlMode ? htmlContent : editor.getHTML() });
        setSaveStatus("saved");
      }
    }
  });

  // Update on editor selection change to manage table toolbar visibility
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      setShowTableToolbar(editor.isActive("table"));
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  // Action to change column width or row height
  const updateCellSize = (dimension, change, target = "single") => {
    if (!editor) return;
    runCommand(() => {
      const { state, view } = editor;
      const { selection } = state;

      let cellPos = null;
      let cellNode = null;

      // Traverse to locate active cell element and position
      for (let depth = selection.$anchor.depth; depth > 0; depth--) {
        const node = selection.$anchor.node(depth);
        if (
          node.type.name === "tableCell" ||
          node.type.name === "tableHeader"
        ) {
          cellPos = selection.$anchor.before(depth);
          cellNode = node;
          break;
        }
      }

      if (!cellNode || cellPos === null) return;

      const currentVal = cellNode.attrs[dimension];
      let numericVal = 0;
      if (
        currentVal &&
        typeof currentVal === "string" &&
        currentVal.endsWith("px")
      ) {
        numericVal = parseInt(currentVal, 10);
      } else {
        numericVal = dimension === "width" ? 120 : 40;
      }

      let newVal = null;
      if (change !== "reset") {
        newVal = `${Math.max(20, numericVal + change)}px`;
      }

      // Find parent table node and its position
      let resolvedTable = null;
      let tablePos = null;
      for (let depth = selection.$anchor.depth; depth > 0; depth--) {
        const node = state.doc.nodeAt(selection.$anchor.before(depth));
        if (node && node.type.name === "table") {
          resolvedTable = node;
          tablePos = selection.$anchor.before(depth);
          break;
        }
      }

      if (!resolvedTable || tablePos === null) return;

      // Map all cells of the table
      const cellMap = [];
      let rIndex = 0;
      state.doc.nodesBetween(
        tablePos,
        tablePos + resolvedTable.nodeSize,
        (node, pos) => {
          if (node.type.name === "tableRow") {
            cellMap.push({ rowPos: pos, cells: [] });
            rIndex = cellMap.length - 1;
          } else if (
            node.type.name === "tableCell" ||
            node.type.name === "tableHeader"
          ) {
            if (cellMap[rIndex]) {
              cellMap[rIndex].cells.push({ pos, node });
            }
          }
        },
      );

      // Find row and col index of active cell in map
      let targetRowIndex = -1;
      let targetCellIndex = -1;
      for (let r = 0; r < cellMap.length; r++) {
        for (let c = 0; c < cellMap[r].cells.length; c++) {
          if (cellMap[r].cells[c].pos === cellPos) {
            targetRowIndex = r;
            targetCellIndex = c;
            break;
          }
        }
      }

      if (targetRowIndex === -1 || targetCellIndex === -1) return;

      const tr = state.tr;
      for (let r = 0; r < cellMap.length; r++) {
        for (let c = 0; c < cellMap[r].cells.length; c++) {
          const cell = cellMap[r].cells[c];
          let shouldUpdate = false;

          if (dimension === "height") {
            if (target === "single" && cell.pos === cellPos) {
              shouldUpdate = true;
            } else if (target === "column_row" && r === targetRowIndex) {
              shouldUpdate = true;
            }
          } else if (dimension === "width") {
            if (target === "single" && cell.pos === cellPos) {
              shouldUpdate = true;
            } else if (target === "column_row" && c === targetCellIndex) {
              shouldUpdate = true;
            }
          }

          if (shouldUpdate) {
            tr.setNodeMarkup(cell.pos, undefined, {
              ...cell.node.attrs,
              [dimension]: newVal,
            });
          }
        }
      }
      view.dispatch(tr);
    });
  };

  // Set background colors and customizable border styling across Cell, Row, Column, or Table scopes
  const applyTableStyle = (attribute, value, scope = "cell") => {
    if (!editor) return;
    runCommand(() => {
      const { state, view } = editor;
      const { selection } = state;

      // Look for parent table and find its position
      let resolvedTable = null;
      let tablePos = null;
      for (let depth = selection.$anchor.depth; depth > 0; depth--) {
        const node = state.doc.nodeAt(selection.$anchor.before(depth));
        if (node && node.type.name === "table") {
          resolvedTable = node;
          tablePos = selection.$anchor.before(depth);
          break;
        }
      }

      if (!resolvedTable || tablePos === null) return;

      // Let's list all selected cell positions
      const selectedCellPositions = [];
      if (selection.forEachCell) {
        selection.forEachCell((cellNode, cellPos) => {
          selectedCellPositions.push(cellPos);
        });
      } else {
        // Fallback to active cell under anchor
        let cellPos = null;
        for (let depth = selection.$anchor.depth; depth > 0; depth--) {
          const node = selection.$anchor.node(depth);
          if (
            node.type.name === "tableCell" ||
            node.type.name === "tableHeader"
          ) {
            cellPos = selection.$anchor.before(depth);
            break;
          }
        }
        if (cellPos !== null) {
          selectedCellPositions.push(cellPos);
        }
      }

      if (selectedCellPositions.length === 0) return;

      // Map all cells of the table
      const cellMap = [];
      let rIndex = 0;
      state.doc.nodesBetween(
        tablePos,
        tablePos + resolvedTable.nodeSize,
        (node, pos) => {
          if (node.type.name === "tableRow") {
            cellMap.push({ rowPos: pos, cells: [] });
            rIndex = cellMap.length - 1;
          } else if (
            node.type.name === "tableCell" ||
            node.type.name === "tableHeader"
          ) {
            if (cellMap[rIndex]) {
              cellMap[rIndex].cells.push({ pos, node });
            }
          }
        },
      );

      // Identify which rows and columns are containing our selected cells
      const selectedRows = new Set();
      const selectedCols = new Set();
      for (let r = 0; r < cellMap.length; r++) {
        for (let c = 0; c < cellMap[r].cells.length; c++) {
          const cell = cellMap[r].cells[c];
          if (selectedCellPositions.includes(cell.pos)) {
            selectedRows.add(r);
            selectedCols.add(c);
          }
        }
      }

      const tr = state.tr;
      for (let r = 0; r < cellMap.length; r++) {
        for (let c = 0; c < cellMap[r].cells.length; c++) {
          const cell = cellMap[r].cells[c];
          let shouldUpdate = false;

          if (scope === "cell") {
            if (selectedCellPositions.includes(cell.pos)) {
              shouldUpdate = true;
            }
          } else if (scope === "row") {
            if (selectedRows.has(r)) {
              shouldUpdate = true;
            }
          } else if (scope === "column") {
            if (selectedCols.has(c)) {
              shouldUpdate = true;
            }
          } else if (scope === "table") {
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            if (typeof attribute === "object" && attribute !== null) {
              const updatedAttrs = { ...cell.node.attrs };
              Object.entries(attribute).forEach(([key, val]) => {
                updatedAttrs[key] = val;
              });
              tr.setNodeMarkup(cell.pos, undefined, updatedAttrs);
            } else {
              tr.setNodeMarkup(cell.pos, undefined, {
                ...cell.node.attrs,
                [attribute]: value,
              });
            }
          }
        }
      }
      view.dispatch(tr);
    });
  };

  const handleBorderApply = (
    dirValue = borderDirection,
    styleValue = borderStyle,
    widthValue = borderWidth,
    colorValue = borderColor,
  ) => {
    if (!editor) return;

    const borderStr =
      dirValue === "none"
        ? "none"
        : `${widthValue} ${styleValue} ${colorValue}`;

    const attrUpdates = {};
    if (dirValue === "all" || dirValue === "none") {
      attrUpdates.borderTop = borderStr;
      attrUpdates.borderRight = borderStr;
      attrUpdates.borderBottom = borderStr;
      attrUpdates.borderLeft = borderStr;
    } else {
      if (dirValue === "top") attrUpdates.borderTop = borderStr;
      if (dirValue === "right") attrUpdates.borderRight = borderStr;
      if (dirValue === "bottom") attrUpdates.borderBottom = borderStr;
      if (dirValue === "left") attrUpdates.borderLeft = borderStr;
    }

    applyTableStyle(attrUpdates, null, styleScope);
  };

  // Click outside listener removed (handled by editor selection updates)

  // Synchronize editor content when note changes
  useEffect(() => {
    if (editor && note) {
      const dbContent = note.data || "";
      const currentHTML = editor.getHTML();
      if (currentHTML !== dbContent) {
        editor.commands.setContent(dbContent, false);
      }
    }
  }, [note?.id, editor]);

  // Handle direct HTML direct textarea changes
  const handleHtmlChange = (e) => {
    const val = e.target.value;
    setHtmlContent(val);
    if (noteIdRef.current) {
      const wordCount =
        val.replace(/<[^>]*>/g, "").trim() === ""
          ? 0
          : val
              .replace(/<[^>]*>/g, "")
              .trim()
              .split(/\s+/).length;
      debouncedSave(
        {
          content: val,
          wordCount,
          characterCount: val.length,
        },
        noteIdRef.current,
      );
    }
  };

  const toggleHtmlMode = () => {
    if (!editor) return;
    if (!htmlMode) {
      setHtmlContent(editor.getHTML());
      setHtmlMode(true);
    } else {
      editor.commands.setContent(htmlContent, true);
      setHtmlMode(false);
    }
  };

  if (!editor) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <span className="text-sm">Initializing secure editor...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full select-text relative no-transition">
      {/* Dynamic Saving Micro badge */}
      <div className="absolute right-6 -top-12 z-10 flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
        {saveStatus === "saving" && (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Saving...</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-500 font-medium">Saved ✓</span>
          </>
        )}
        {saveStatus === "error" && (
          <span className="text-red-500">Error saving offline</span>
        )}
      </div>

      {/* SOLID OPAQUE STICKY TOP SHELF (Z-INDEX 100 TO HIDE CONTENT COMPLETELY SCROLLING UNDERNEATH) */}
      {!readOnly && (
        <div className="sticky top-0 z-[100] w-full flex flex-col bg-white dark:bg-[#1E1E1E] select-none pb-[15px]">
          {/* Floating Table Edit Options sub-toolbar inside sticky header */}
          {showTableToolbar && !htmlMode && (
            <div className="table-tools-container flex items-center gap-1.5 px-3 py-2 bg-[#EEEEEE] dark:bg-[#252525] flex-wrap text-zinc-750 dark:text-zinc-200 z-[101]">
              <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider px-1">
                Table Controls:
              </span>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() => editor.chain().focus().addRowBefore().run())
                }
                title="Add Row Above"
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#333333]"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() => editor.chain().focus().addRowAfter().run())
                }
                title="Add Row Below"
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#333333]"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() => editor.chain().focus().deleteRow().run())
                }
                title="Delete Row"
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-red-500 hover:bg-red-205 dark:hover:bg-red-950/40"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-zinc-350 dark:bg-zinc-700 mx-1.5" />

              <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider px-1">
                Col:
              </span>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() =>
                    editor.chain().focus().addColumnBefore().run(),
                  )
                }
                title="Insert Column Left"
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#333333]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() =>
                    editor.chain().focus().addColumnAfter().run(),
                  )
                }
                title="Insert Column Right"
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#333333]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() => editor.chain().focus().deleteColumn().run())
                }
                title="Delete Column"
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-red-500 hover:bg-red-205 dark:hover:bg-red-950/40"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-zinc-350 dark:bg-zinc-700 mx-1.5" />

              <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider px-1">
                Apply to:
              </span>
              <div className="flex bg-[#D8D8D8] dark:bg-[#1A1A1A] rounded p-0.5 gap-0.5">
                {[
                  ["cell", "Cell"],
                  ["row", "Row"],
                  ["column", "Col"],
                  ["table", "Table"],
                ].map(([scopeId, label]) => (
                  <button
                    key={scopeId}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setStyleScope(scopeId)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded cursor-pointer transition-colors ${
                      styleScope === scopeId
                        ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black font-semibold"
                        : "text-zinc-550 hover:text-zinc-750 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                    title={`Apply background shading/border styling to selected ${label}(s)`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Cell / Row / Column / Table shading background preset grids */}
              <div className="relative group">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  title={`Shading color (Scope: ${styleScope.toUpperCase()})`}
                  className="px-1.5 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-650 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#333333] gap-1"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-sm border border-zinc-400 dark:border-zinc-600 animate-none"
                    style={{ backgroundColor: cellBgColor || "transparent" }}
                  />
                  <span className="text-[10px] uppercase font-bold text-zinc-500">
                    {styleScope} BG
                  </span>
                </button>

                <div className="absolute top-full left-0 mt-1 bg-[#E1E1E1] dark:bg-[#2D2D2D] rounded-xl p-2.5 z-50 hidden group-hover:grid grid-cols-6 gap-1 w-[150px]">
                  {TABLE_CELL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        runCommand(() => {
                          applyTableStyle("backgroundColor", color, styleScope);
                          setCellBgColor(color);
                        });
                      }}
                      className="w-4.5 h-4.5 rounded-sm cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      runCommand(() => {
                        applyTableStyle("backgroundColor", null, styleScope);
                        setCellBgColor(null);
                      });
                    }}
                    title="Clear shading color"
                    className="col-span-6 py-1 rounded bg-[#333333] hover:bg-[#444444] text-[9px] text-zinc-300 font-bold uppercase cursor-pointer text-center mt-1"
                  >
                    Clear BG
                  </button>
                </div>
              </div>

              {/* Fully custom Border Builder tool */}
              <div className="relative group/border">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  className="px-2 py-1 flex items-center justify-center rounded cursor-pointer bg-zinc-300 dark:bg-[#333333] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-350 dark:hover:bg-[#444444] font-bold text-[10px] uppercase gap-1"
                  title="Customize borders for active scope"
                >
                  <span>Borders</span>
                  {borderDirection === "none" ? (
                    <span className="text-[9px] text-[#9B9B9B]">(None)</span>
                  ) : (
                    <span className="text-[9px] text-zinc-500">
                      ({borderDirection})
                    </span>
                  )}
                </button>

                {/* Dropdown panel */}
                <div className="absolute top-full left-0 mt-1 bg-[#E8E8E8] dark:bg-[#2D2D2D] rounded-xl p-3 z-50 hidden group-hover/border:flex flex-col gap-2.5 w-[240px] text-zinc-800 dark:text-zinc-200 select-none shadow-xl border border-zinc-300 dark:border-zinc-700">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-zinc-450 dark:text-[#9B9B9B] tracking-wider block mb-1">
                      1. Side:
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        ["all", "All"],
                        ["top", "Top"],
                        ["bottom", "Bottom"],
                        ["left", "Left"],
                        ["right", "Right"],
                        ["none", "Remove"],
                      ].map(([dir, label]) => (
                        <button
                          key={dir}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setBorderDirection(dir);
                            handleBorderApply(
                              dir,
                              borderStyle,
                              borderWidth,
                              borderColor,
                            );
                          }}
                          className={`px-1.5 py-1 text-[10px] font-medium uppercase rounded cursor-pointer text-center ${
                            borderDirection === dir
                              ? "bg-[#1A1A1A] dark:bg-white text-white dark:text-black font-semibold"
                              : "bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-300"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-bold text-zinc-450 dark:text-[#9B9B9B] tracking-wider block mb-1">
                      2. Line Style:
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {["solid", "dashed", "dotted", "double"].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setBorderStyle(st);
                            if (borderDirection !== "none") {
                              handleBorderApply(
                                borderDirection,
                                st,
                                borderWidth,
                                borderColor,
                              );
                            }
                          }}
                          className={`px-1 py-1 text-[9px] font-medium uppercase rounded cursor-pointer text-center ${
                            borderStyle === st
                              ? "bg-[#1A1A1A] dark:bg-white text-white dark:text-black font-semibold"
                              : "bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-300"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-bold text-zinc-450 dark:text-[#9B9B9B] tracking-wider block mb-1">
                      3. Thickness:
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {["1px", "2px", "3px", "4px"].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setBorderWidth(w);
                            if (borderDirection !== "none") {
                              handleBorderApply(
                                borderDirection,
                                borderStyle,
                                w,
                                borderColor,
                              );
                            }
                          }}
                          className={`px-1 py-1 text-[9px] font-medium uppercase rounded cursor-pointer text-center ${
                            borderWidth === w
                              ? "bg-[#1A1A1A] dark:bg-white text-white dark:text-black font-semibold"
                              : "bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-300"
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-bold text-zinc-450 dark:text-[#9B9B9B] tracking-wider block mb-1">
                      4. Line Color:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        "#1A1A1A",
                        "#555555",
                        "#888888",
                        "#CCCCCC",
                        "#EF4444",
                        "#3B82F6",
                        "#22C55E",
                        "#EAB308",
                      ].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setBorderColor(c);
                            if (borderDirection !== "none") {
                              handleBorderApply(
                                borderDirection,
                                borderStyle,
                                borderWidth,
                                c,
                              );
                            }
                          }}
                          className={`w-5 h-5 rounded-sm cursor-pointer hover:scale-110 transition-transform ${
                            borderColor === c
                              ? "ring-1 ring-zinc-400 dark:ring-zinc-650"
                              : ""
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-1.5 mt-1 pt-2">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        handleBorderApply(
                          borderDirection,
                          borderStyle,
                          borderWidth,
                          borderColor,
                        )
                      }
                      className="flex-1 py-1.5 text-[10px] font-bold uppercase rounded cursor-pointer bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black hover:opacity-95 text-center"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setBorderDirection("none");
                        handleBorderApply(
                          "none",
                          borderStyle,
                          borderWidth,
                          borderColor,
                        );
                      }}
                      className="flex-1 py-1.5 text-[10px] font-bold uppercase rounded cursor-pointer bg-red-650 hover:bg-red-700 text-white text-center"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              {/* Alignment inside cell */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() =>
                    editor
                      .chain()
                      .focus()
                      .setCellAttribute("textAlign", "left")
                      .run(),
                  )
                }
                title="Align Left in Cell"
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#333333]"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() =>
                    editor
                      .chain()
                      .focus()
                      .setCellAttribute("textAlign", "center")
                      .run(),
                  )
                }
                title="Align Center in Cell"
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#333333]"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() =>
                    editor
                      .chain()
                      .focus()
                      .setCellAttribute("textAlign", "right")
                      .run(),
                  )
                }
                title="Align Right in Cell"
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#333333]"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-zinc-350 dark:bg-zinc-700 mx-1.5" />

              {/* Merge/Split cells */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() => editor.chain().focus().mergeCells().run())
                }
                title="Merge Cells"
                className="px-2 py-0.5 text-[10px] font-bold uppercase rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#333333]"
              >
                Merge
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() => editor.chain().focus().splitCell().run())
                }
                title="Split Cell"
                className="px-2 py-0.5 text-[10px] font-bold uppercase rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#333333]"
              >
                Split
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() =>
                    editor.chain().focus().toggleHeaderRow().run(),
                  )
                }
                title="Toggle Headers Row"
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#333333]"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-zinc-350 dark:bg-zinc-700 mx-1.5" />

              <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider px-1">
                Resize:
              </span>

              {/* Resize Target Toggle ('single' cell or entire 'column_row') */}
              <div className="flex bg-[#D8D8D8] dark:bg-[#1A1A1A] rounded p-0.5 gap-0.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setResizeTarget("single")}
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded cursor-pointer transition-colors ${
                    resizeTarget === "single"
                      ? "bg-white dark:bg-[#2A2A2A] text-zinc-900 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                  title="Resize active cell only"
                >
                  Cell
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setResizeTarget("column_row")}
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded cursor-pointer transition-colors ${
                    resizeTarget === "column_row"
                      ? "bg-white dark:bg-[#2A2A2A] text-zinc-900 dark:text-white"
                      : "text-zinc-550 hover:text-zinc-750 dark:hover:text-zinc-350"
                  }`}
                  title="Resize entire column/row index"
                >
                  Col/Row
                </button>
              </div>

              {/* Width & Height increment adjusters */}
              <div className="flex items-center gap-1 select-none">
                <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 ml-1">
                  W:
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateCellSize("width", -20, resizeTarget)}
                  className="w-6 h-6 flex items-center justify-center rounded bg-zinc-300 dark:bg-[#333333] hover:bg-zinc-400 dark:hover:bg-[#444444] cursor-pointer text-zinc-800 dark:text-zinc-100 font-bold transition-all"
                  title="Decrease Width"
                >
                  -
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateCellSize("width", 20, resizeTarget)}
                  className="w-6 h-6 flex items-center justify-center rounded bg-zinc-300 dark:bg-[#333333] hover:bg-zinc-400 dark:hover:bg-[#444444] cursor-pointer text-zinc-800 dark:text-zinc-100 font-bold transition-all"
                  title="Increase Width"
                >
                  +
                </button>

                <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 ml-1">
                  H:
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateCellSize("height", -10, resizeTarget)}
                  className="w-6 h-6 flex items-center justify-center rounded bg-zinc-300 dark:bg-[#333333] hover:bg-zinc-400 dark:hover:bg-[#444444] cursor-pointer text-zinc-800 dark:text-zinc-100 font-bold transition-all"
                  title="Decrease Height"
                >
                  -
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateCellSize("height", 10, resizeTarget)}
                  className="w-6 h-6 flex items-center justify-center rounded bg-zinc-300 dark:bg-[#333333] hover:bg-zinc-400 dark:hover:bg-[#444444] cursor-pointer text-zinc-800 dark:text-zinc-100 font-bold transition-all"
                  title="Increase Height"
                >
                  +
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    updateCellSize("width", "reset", resizeTarget);
                    updateCellSize("height", "reset", resizeTarget);
                  }}
                  className="px-1.5 py-1 text-[9px] font-bold uppercase rounded bg-zinc-300 dark:bg-[#333333] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-400 dark:hover:bg-[#444444] cursor-pointer transition-all"
                  title="Reset sizes to automatic cell bounds"
                >
                  Reset
                </button>
              </div>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  runCommand(() => editor.chain().focus().deleteTable().run())
                }
                title="Delete whole Table"
                className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-red-500 hover:bg-red-205 dark:hover:bg-red-950/40 ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Embedded main editor toolbar */}
          <div className="bg-white dark:bg-[#1E1E1E]">
            <EditorToolbar
              editor={editor}
              htmlMode={htmlMode}
              toggleHtmlMode={toggleHtmlMode}
              runCommand={runCommand}
              tick={toolbarTick}
            />
          </div>
        </div>
      )}

      {/* Floating Table Edit Options sub-toolbar when user aligns cell inside table */}
      {false && editor.isActive("table") && !htmlMode && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-[#EFEFEF] dark:bg-[#1C1C1C] rounded-lg mb-2 flex-wrap text-zinc-700 dark:text-zinc-300 transition-colors z-[49]">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wide px-1">
            Row:
          </span>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() => editor.chain().focus().addRowBefore().run())
            }
            title="Add Row Above"
            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-[#E5E5E5] dark:hover:bg-[#252525]"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() => editor.chain().focus().addRowAfter().run())
            }
            title="Add Row Below"
            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-[#E5E5E5] dark:hover:bg-[#252525]"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() => editor.chain().focus().deleteRow().run())
            }
            title="Delete Row"
            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-red-500 hover:bg-red-100 dark:hover:bg-red-950/30"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-300 dark:bg-zinc-700 mx-1.5" />

          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wide px-1">
            Col:
          </span>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() => editor.chain().focus().addColumnBefore().run())
            }
            title="Insert Column Left"
            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-[#E5E5E5] dark:hover:bg-[#252525]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() => editor.chain().focus().addColumnAfter().run())
            }
            title="Insert Column Right"
            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-[#E5E5E5] dark:hover:bg-[#252525]"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() => editor.chain().focus().deleteColumn().run())
            }
            title="Delete Column"
            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-red-500 hover:bg-red-100 dark:hover:bg-red-950/30"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-300 dark:bg-zinc-700 mx-1.5" />

          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wide px-1">
            Cell:
          </span>

          {/* Cell highlight background preset grids */}
          <div className="relative group">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              title="Cell BG color"
              className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-[#E5E5E5] dark:hover:bg-[#252525]"
            >
              <div
                className="w-4 h-4 rounded-sm border border-zinc-400 dark:border-zinc-650"
                style={{ backgroundColor: cellBgColor || "#333333" }}
              />
            </button>

            <div className="absolute top-full left-0 mt-1 bg-[#1E1E1E] rounded-xl p-2.5 z-50 hidden group-hover:grid grid-cols-6 gap-1 w-[150px] shadow-xl">
              {TABLE_CELL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    runCommand(() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("backgroundColor", color)
                        .run();
                      setCellBgColor(color);
                    });
                  }}
                  className="w-4.5 h-4.5 rounded-sm cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  runCommand(() => {
                    editor
                      .chain()
                      .focus()
                      .setCellAttribute("backgroundColor", null)
                      .run();
                    setCellBgColor(null);
                  });
                }}
                title="Clear color"
                className="w-4.5 h-4.5 rounded-sm cursor-pointer hover:scale-110 transition-transform bg-[#333333] flex items-center justify-center text-[10px] text-zinc-400 font-bold"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Alignment inside cell */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() =>
                editor
                  .chain()
                  .focus()
                  .setCellAttribute("textAlign", "left")
                  .run(),
              )
            }
            title="Align Left in Cell"
            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-[#E5E5E5] dark:hover:bg-[#252525]"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() =>
                editor
                  .chain()
                  .focus()
                  .setCellAttribute("textAlign", "center")
                  .run(),
              )
            }
            title="Align Center in Cell"
            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-[#E5E5E5] dark:hover:bg-[#252525]"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() =>
                editor
                  .chain()
                  .focus()
                  .setCellAttribute("textAlign", "right")
                  .run(),
              )
            }
            title="Align Right in Cell"
            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-[#E5E5E5] dark:hover:bg-[#252525]"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-300 dark:bg-zinc-700 mx-1.5" />

          {/* Merge/Split cells */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() => editor.chain().focus().mergeCells().run())
            }
            title="Merge Cells"
            className="px-2 py-0.5 text-[10px] font-bold uppercase rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-[#E5E5E5] dark:hover:bg-[#252525]"
          >
            Merge
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() => editor.chain().focus().splitCell().run())
            }
            title="Split Cell"
            className="px-2 py-0.5 text-[10px] font-bold uppercase rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-[#E5E5E5] dark:hover:bg-[#252525]"
          >
            Split
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() => editor.chain().focus().toggleHeaderRow().run())
            }
            title="Toggle Headers Row"
            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-zinc-600 dark:text-zinc-300 hover:bg-[#E5E5E5] dark:hover:bg-[#252525]"
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              runCommand(() => editor.chain().focus().deleteTable().run())
            }
            title="Delete whole Table"
            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-red-500 hover:bg-red-100 dark:hover:bg-red-950/30 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 relative overflow-y-auto custom-scrollbar pt-[15px]">
        {htmlMode ? (
          <textarea
            value={htmlContent}
            onChange={handleHtmlChange}
            className="w-full h-full min-h-[400px] p-6 font-mono text-sm bg-zinc-50 dark:bg-[#121212] border-0 focus:ring-0 focus:outline-none text-zinc-800 dark:text-white resize-none animate-fade-in"
            placeholder="<html>Write raw note HTML here...</html>"
          />
        ) : (
          <div className="relative h-full">
            <DragHandle editor={editor}>
              <div className="flex items-center bg-[#EFEFEF] dark:bg-[#1C1C1C] p-0.5 rounded gap-0.5 transition-colors select-none hover:opacity-100 opacity-90">
                {/* Drag Grip */}
                <button
                  type="button"
                  className="p-1 rounded hover:bg-[#EEEEEE] dark:hover:bg-[#252525] text-zinc-400 hover:text-zinc-700 dark:text-[#888888] dark:hover:text-[#F0F0F0] transition-colors cursor-grab active:cursor-grabbing"
                  title="Drag block"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </button>

                {/* Quick Convert/Insert Dropdown */}
                <div className="relative group/blockmenu">
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-[#EEEEEE] dark:hover:bg-[#252525] text-zinc-500 hover:text-[#1A1A1A] dark:text-[#888888] dark:hover:text-[#F0F0F0] transition-colors cursor-pointer text-[11px] font-extrabold flex items-center justify-center leading-none"
                    title="Quick Insert/Convert block"
                  >
                    +
                  </button>
                  {/* Floating options panel on hover */}
                  <div className="hidden group-hover/blockmenu:block absolute left-0 bottom-full mb-1 w-32 bg-white dark:bg-[#1E1E1E] py-1 rounded z-[5555] text-left font-sans select-none shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setParagraph().run();
                      }}
                      className="w-full px-2.5 py-1 text-left text-[11px] text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] font-medium block cursor-pointer"
                    >
                      Paragraph
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .toggleHeading({ level: 1 })
                          .run();
                      }}
                      className="w-full px-2.5 py-1 text-left text-[11px] text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] font-medium block cursor-pointer"
                    >
                      Heading 1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .toggleHeading({ level: 2 })
                          .run();
                      }}
                      className="w-full px-2.5 py-1 text-left text-[11px] text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] font-medium block cursor-pointer"
                    >
                      Heading 2
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().toggleBulletList().run();
                      }}
                      className="w-full px-2.5 py-1 text-left text-[11px] text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] font-medium block cursor-pointer"
                    >
                      Bullet List
                    </button>
                  </div>
                </div>

                {/* Instant deletion */}
                <button
                  type="button"
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .selectParentNode()
                      .deleteSelection()
                      .run();
                  }}
                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-750 transition-colors cursor-pointer"
                  title="Remove component"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </DragHandle>
            <EditorContent editor={editor} className="h-full" />
          </div>
        )}
      </div>
    </div>
  );
}

export default NoteEditor;
