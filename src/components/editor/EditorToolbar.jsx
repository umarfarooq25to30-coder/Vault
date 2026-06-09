// Sophisticated two-row rich text formatting toolbar for the secure Tiptap editor.

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, CheckSquare, Quote, Code, Terminal, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon,
  Table as TableIcon, Undo, Redo, ChevronDown, Check, Palette, Highlighter, Type, 
  Code2, Trash2, Video
} from 'lucide-react';

export function EditorToolbar({ editor, htmlMode, toggleHtmlMode, runCommand, tick }) {
  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState(null); // 'font', 'size', 'color', 'highlight', 'lineHeight', 'link', 'image', 'video', 'table'
  const [customHexColor, setCustomHexColor] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTarget, setLinkTarget] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [tableHoverGrid, setTableHoverGrid] = useState({ r: 0, c: 0 });
  const [dropdownPos, setDropdownPos] = useState({ left: 0, top: 0, right: 0 });

  // Refs for tracking clicks outside
  const toolbarRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (event.target.closest('.portal-dropdown')) {
        return;
      }
      if (toolbarRef.current && !toolbarRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!editor) return null;

  const fontOptions = [
    { name: 'Default', value: '' },
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
  ];

  const fontSizeOptions = [
    '10px', '11px', '12px', '13px', '14px', '15px', '16px', '18px', '20px', 
    '24px', '28px', '32px', '36px', '48px', '64px', '72px', '96px'
  ];

  const colorGrid = [
    ['#000000', '#1A1A1A', '#333333', '#555555', '#777777', '#999999', '#BBBBBB', '#FFFFFF'],
    ['#FF0000', '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2', '#FFF5F5'],
    ['#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF'],
    ['#15803D', '#16A34A', '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#DCFCE7', '#F0FDF4'],
    ['#D97706', '#F59E0B', '#FCD34D', '#FEF08A', '#7C3AED', '#8B5CF6', '#A78BFA', '#EDE9FE'],
  ];

  const highlightPresets = [
    { name: 'Yellow', color: '#FEF08A' },
    { name: 'Green', color: '#BBF7D0' },
    { name: 'Blue', color: '#BFDBFE' },
    { name: 'Pink', color: '#FBCFE8' },
    { name: 'Orange', color: '#FED7AA' },
    { name: 'Purple', color: '#E9D5FF' },
  ];

  const lineHeightOptions = ['1.0', '1.15', '1.25', '1.5', '1.75', '2.0', '2.5', '3.0'];

  // Smart block formatter helper to prevent task list / blockquote format trapping
  const setBlockType = (commandFn) => {
    runCommand(() => {
      // If currently inside a task list, lift the list item type first
      if (editor.isActive('taskItem')) {
        editor.chain().focus().liftListItem('taskItem').run();
      }
      // If currently inside generic bullet list or ordered list, lift it
      if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
        editor.chain().focus().liftListItem('listItem').run();
      }
      commandFn();
    });
  };

  const toggleBold = () => runCommand(() => editor.chain().focus().toggleBold().run());
  const toggleItalic = () => runCommand(() => editor.chain().focus().toggleItalic().run());
  const toggleUnderline = () => runCommand(() => editor.chain().focus().toggleUnderline().run());
  const toggleStrike = () => runCommand(() => editor.chain().focus().toggleStrike().run());
  const toggleCode = () => runCommand(() => editor.chain().focus().toggleCode().run());

  const toggleBlockquote = () => setBlockType(() => {
    let chain = editor.chain().focus();
    if (editor.isActive('codeBlock')) {
      chain = chain.toggleCodeBlock();
    }
    chain.toggleBlockquote().run();
  });

  const toggleCodeBlock = () => setBlockType(() => {
    let chain = editor.chain().focus();
    if (editor.isActive('blockquote')) {
      chain = chain.toggleBlockquote();
    }
    chain.toggleCodeBlock().run();
  });

  const setParagraph = () => setBlockType(() => {
    let chain = editor.chain().focus();
    if (editor.isActive('blockquote')) {
      chain = chain.toggleBlockquote();
    }
    chain.setParagraph().run();
  });

  const toggleHeading = (level) => setBlockType(() => {
    let chain = editor.chain().focus();
    if (editor.isActive('blockquote')) {
      chain = chain.toggleBlockquote();
    }
    chain.toggleHeading({ level }).run();
  });

  const toggleBulletList = () => {
    runCommand(() => {
      let chain = editor.chain().focus();
      if (editor.isActive('blockquote')) {
        chain = chain.toggleBlockquote();
      }
      chain.toggleBulletList().run();
    });
  };

  const toggleOrderedList = () => {
    runCommand(() => {
      let chain = editor.chain().focus();
      if (editor.isActive('blockquote')) {
        chain = chain.toggleBlockquote();
      }
      chain.toggleOrderedList().run();
    });
  };

  const toggleTaskList = () => {
    runCommand(() => {
      let chain = editor.chain().focus();
      if (editor.isActive('blockquote')) {
        chain = chain.toggleBlockquote();
      }
      chain.toggleTaskList().run();
    });
  };

  const handleFontSelect = (fontVal) => {
    runCommand(() => {
      if (fontVal) {
        editor.chain().focus().setFontFamily(fontVal).run();
      } else {
        editor.chain().focus().unsetFontFamily().run();
      }
    });
    setActiveDropdown(null);
  };

  const handleFontSizeSelect = (size) => {
    runCommand(() => {
      editor.chain().focus().setFontSize(size).run();
    });
    setActiveDropdown(null);
  };

  const handleColorSelect = (color) => {
    runCommand(() => {
      editor.chain().focus().setColor(color).run();
    });
    setActiveDropdown(null);
  };

  const handleHighlightSelect = (color) => {
    runCommand(() => {
      editor.chain().focus().toggleHighlight({ color }).run();
    });
    setActiveDropdown(null);
  };

  const handleLineHeightSelect = (lh) => {
    runCommand(() => {
      editor.chain().focus().setLineHeight(lh).run();
    });
    setActiveDropdown(null);
  };

  const openDropdown = (type, e) => {
    e.stopPropagation();
    if (activeDropdown === type) {
      setActiveDropdown(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setDropdownPos({
        left: rect.left,
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
      setActiveDropdown(type);
    }
  };

  const handleAddLink = (e) => {
    e.preventDefault();
    runCommand(() => {
      if (!linkUrl) {
        editor.chain().focus().unsetLink().run();
      } else {
        editor.chain().focus().setLink({ 
          href: linkUrl, 
          target: linkTarget ? '_blank' : '_self' 
        }).run();
      }
    });
    setActiveDropdown(null);
    setLinkUrl('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        if (readerEvent.target?.result) {
          runCommand(() => {
            editor.chain().focus().setImage({ src: readerEvent.target.result }).run();
          });
        }
      };
      reader.readAsDataURL(file);
      setActiveDropdown(null);
    }
  };

  const handleImageInsertUrl = (e) => {
    e.preventDefault();
    if (imageUrl) {
      runCommand(() => {
        editor.chain().focus().setImage({ src: imageUrl }).run();
      });
      setImageUrl('');
      setActiveDropdown(null);
    }
  };

  const handleVideoInsert = (e) => {
    e.preventDefault();
    if (videoUrl) {
      runCommand(() => {
        // Support YouTube embeds vs Raw Video files
        if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
          editor.commands.setYoutubeVideo({
            src: videoUrl,
            width: 640,
            height: 360,
          });
        } else {
          // Standard resizable HTML5 video element
          editor.commands.insertContent({
            type: 'resizableVideo',
            attrs: {
              src: videoUrl,
              width: 480,
              alignment: 'center'
            }
          });
        }
      });
      setVideoUrl('');
      setActiveDropdown(null);
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        if (readerEvent.target?.result) {
          runCommand(() => {
            editor.commands.insertContent({
              type: 'resizableVideo',
              attrs: {
                src: readerEvent.target.result,
                width: 480,
                alignment: 'center'
              }
            });
          });
        }
      };
      reader.readAsDataURL(file);
      setActiveDropdown(null);
    }
  };

  const handleTableInsert = (rows, cols) => {
    runCommand(() => {
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    });
    setActiveDropdown(null);
  };

  const getSelectedFont = () => {
    for (const opt of fontOptions) {
      if (opt.value && editor.isActive('textStyle', { fontFamily: opt.value })) {
        return opt.name;
      }
    }
    return 'Default font';
  };

  const getSelectedSize = () => {
    const attrs = editor.getAttributes('textStyle');
    return attrs.fontSize || 'Size';
  };

  const getBtnClass = (isActive, customInactiveColor = 'text-[#1A1A1A] dark:text-white') => {
    return `p-2 rounded transition-none focus:outline-none disabled:opacity-35 cursor-pointer flex items-center justify-center min-w-[38px] h-[38px] ${
      isActive
        ? 'bg-[#E5E5E5] dark:bg-[#2A2A2A] text-[#1A1A1A] dark:text-white scale-105'
        : `${customInactiveColor} hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A]`
    }`;
  };

  const iconClass = "w-5 h-5 shadow-none border-0";

  return (
    <div ref={toolbarRef} className="relative flex flex-col bg-white dark:bg-[#1E1E1E] p-1.5 select-none gap-2">
      
      {/* ROW 1: Font Selection, Text Styling, Headers and Basic formatting */}
      <div className="flex flex-wrap items-center gap-1">
        
        {/* Font dropdown */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); openDropdown('font', e); }}
            disabled={htmlMode}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded text-zinc-700 dark:text-zinc-200 hover:bg-[#EEEEEE] dark:hover:bg-[#252525] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] transition-colors focus:outline-none disabled:opacity-35 cursor-pointer"
          >
            <span className="truncate max-w-[80px]">{getSelectedFont()}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
 
        {/* Font size dropdown */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); openDropdown('size', e); }}
            disabled={htmlMode}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded text-zinc-700 dark:text-zinc-200 hover:bg-[#EEEEEE] dark:hover:bg-[#252525] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] transition-colors focus:outline-none disabled:opacity-35 cursor-pointer"
          >
            <span>{getSelectedSize()}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-[#E5E5E5] dark:bg-[#2A2A2A] mx-1" />

        {/* Bold */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleBold}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('bold'))}
          title="Bold (Ctrl+B)"
        >
          <Bold className={iconClass} />
        </button>

        {/* Italic */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleItalic}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('italic'))}
          title="Italic (Ctrl+I)"
        >
          <Italic className={iconClass} />
        </button>

        {/* Underline */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleUnderline}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('underline'))}
          title="Underline (Ctrl+U)"
        >
          <Underline className={iconClass} />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleStrike}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('strike'))}
          title="Strikethrough"
        >
          <Strikethrough className={iconClass} />
        </button>

        <div className="h-5 w-[1px] bg-[#E5E5E5] dark:bg-[#2A2A2A] mx-1" />

        {/* Text color picker dropdown */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); openDropdown('color', e); }}
            disabled={htmlMode}
            className={getBtnClass(false)}
            title="Text Color"
          >
            <div className="relative flex items-center justify-center">
              <Palette className={iconClass} />
              <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-white dark:border-[#1E1E1E]" style={{ backgroundColor: editor.getAttributes('textStyle').color || 'currentColor' }} />
            </div>
          </button>
        </div>

        {/* Highlight text / Marker popover */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); openDropdown('highlight', e); }}
            disabled={htmlMode}
            className={getBtnClass(false)}
            title="Highlight Color"
          >
            <Highlighter className={iconClass} />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-[#E5E5E5] dark:bg-[#2A2A2A] mx-1" />

        {/* Paragraph Format Button */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={setParagraph}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('paragraph'))}
          title="Paragraph text"
        >
          <span className="font-bold text-sm">P</span>
        </button>

        {/* Header Heading 1 */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => toggleHeading(1)}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('heading', { level: 1 }))}
          title="Heading 1"
        >
          <Heading1 className={iconClass} />
        </button>

        {/* Heading 2 */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => toggleHeading(2)}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('heading', { level: 2 }))}
          title="Heading 2"
        >
          <Heading2 className={iconClass} />
        </button>

        {/* Heading 3 */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => toggleHeading(3)}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('heading', { level: 3 }))}
          title="Heading 3"
        >
          <Heading3 className={iconClass} />
        </button>

        {/* Heading 4 */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => toggleHeading(4)}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('heading', { level: 4 }))}
          title="Heading 4"
        >
          <Heading4 className={iconClass} />
        </button>

        <div className="h-5 w-[1px] bg-[#E5E5E5] dark:bg-[#2A2A2A] mx-1" />

        {/* Bullet List */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleBulletList}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('bulletList'))}
          title="Bullet List"
        >
          <List className={iconClass} />
        </button>

        {/* Ordered List */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleOrderedList}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('orderedList'))}
          title="Numbered List"
        >
          <ListOrdered className={iconClass} />
        </button>

        {/* Task List / Checklist */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleTaskList}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('taskList'))}
          title="Task List"
        >
          <CheckSquare className={iconClass} />
        </button>

        {/* Blockquote */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleBlockquote}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('blockquote'))}
          title="Quote"
        >
          <Quote className={iconClass} />
        </button>

        {/* Inline Code */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleCode}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('code'))}
          title="Inline Code"
        >
          <Code className={iconClass} />
        </button>

        {/* Lowlight Code Block */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleCodeBlock}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive('codeBlock'))}
          title="Code Block"
        >
          <Terminal className={iconClass} />
        </button>
      </div>

      {/* ROW 2: Alignment, Spacing/Line-height, Link, Embeds, Table Insert, and Actions */}
      <div className="flex flex-wrap items-center gap-1">
        
        {/* Alignment options */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => runCommand(() => editor.chain().focus().setTextAlign('left').run())}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive({ textAlign: 'left' }))}
          title="Align Left"
        >
          <AlignLeft className={iconClass} />
        </button>

        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => runCommand(() => editor.chain().focus().setTextAlign('center').run())}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive({ textAlign: 'center' }))}
          title="Align Center"
        >
          <AlignCenter className={iconClass} />
        </button>

        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => runCommand(() => editor.chain().focus().setTextAlign('right').run())}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive({ textAlign: 'right' }))}
          title="Align Right"
        >
          <AlignRight className={iconClass} />
        </button>

        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => runCommand(() => editor.chain().focus().setTextAlign('justify').run())}
          disabled={htmlMode}
          className={getBtnClass(editor.isActive({ textAlign: 'justify' }))}
          title="Justify"
        >
          <AlignJustify className={iconClass} />
        </button>

        <div className="h-5 w-[1px] bg-[#E5E5E5] dark:bg-[#2A2A2A] mx-1" />

        {/* Line height dropdown */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); openDropdown('lineHeight', e); }}
            disabled={htmlMode}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded text-zinc-700 dark:text-zinc-200 hover:bg-[#EEEEEE] dark:hover:bg-[#252525] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] transition-colors focus:outline-none disabled:opacity-35 cursor-pointer"
            title="Line Height"
          >
            <Type className="w-4 h-4" />
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-[#E5E5E5] dark:bg-[#2A2A2A] mx-1" />

        {/* Link popover dialog */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              const currentLinkAttribs = editor.getAttributes('link');
              setLinkUrl(currentLinkAttribs.href || '');
              setLinkTarget(currentLinkAttribs.target === '_blank');
              openDropdown('link', e);
            }}
            disabled={htmlMode}
            className={getBtnClass(editor.isActive('link'))}
            title="Insert Link"
          >
            <LinkIcon className={iconClass} />
          </button>
        </div>

        {/* IMAGE Insert popover dialog */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); openDropdown('image', e); }}
            disabled={htmlMode}
            className={getBtnClass(false)}
            title="Insert Image"
          >
            <ImageIcon className={iconClass} />
          </button>
        </div>

        {/* Video / Video embed insert popover */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); openDropdown('video', e); }}
            disabled={htmlMode}
            className={getBtnClass(false)}
            title="Insert Video (MP4 / YouTube)"
          >
            <Video className={iconClass} />
          </button>
        </div>

        {/* TABLE insert grid picker */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); openDropdown('table', e); }}
            disabled={htmlMode}
            className={getBtnClass(false)}
            title="Insert Table"
          >
            <TableIcon className={iconClass} />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-[#E5E5E5] dark:bg-[#2A2A2A] mx-1" />

        {/* Undo */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => runCommand(() => editor.chain().focus().undo().run())}
          disabled={!editor.can().undo() || htmlMode}
          className={getBtnClass(false)}
          title="Undo"
        >
          <Undo className={iconClass} />
        </button>

        {/* Redo */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => runCommand(() => editor.chain().focus().redo().run())}
          disabled={!editor.can().redo() || htmlMode}
          className={getBtnClass(false)}
          title="Redo"
        >
          <Redo className={iconClass} />
        </button>

        <div className="h-5 w-[1px] bg-[#E5E5E5] dark:bg-[#2A2A2A] mx-1" />

        {/* Toggle HTML view */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleHtmlMode}
          className={getBtnClass(htmlMode)}
          title="HTML Source Editor"
        >
          <Code2 className={iconClass} />
        </button>

        {/* Delete current block component */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => {
            runCommand(() => {
              editor.chain().focus().selectParentNode().deleteSelection().run();
            });
          }}
          disabled={htmlMode}
          className={getBtnClass(false, 'text-red-500 hover:text-red-750')}
          title="Delete current block/component"
        >
          <Trash2 className={iconClass} />
        </button>

      </div>

      {/* Render all open dropdowns using React Portals to guarantee they never get clipped */}
      {activeDropdown && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setActiveDropdown(null)} />
          
          <div
            style={{
              position: 'fixed',
              left: ['link', 'image', 'video', 'table'].includes(activeDropdown) ? 'auto' : `${dropdownPos.left}px`,
              right: ['link', 'image', 'video', 'table'].includes(activeDropdown) ? `${dropdownPos.right}px` : 'auto',
              top: `${dropdownPos.top}px`,
              zIndex: 9999,
              maxHeight: ['font', 'size', 'lineHeight'].includes(activeDropdown) ? '240px' : 'none',
            }}
            className="portal-dropdown bg-[#EEEEEE] dark:bg-[#252525] rounded-lg select-none overflow-y-auto custom-scrollbar animate-fade-in text-zinc-800 dark:text-zinc-100"
          >
            {/* Font dropdown */}
            {activeDropdown === 'font' && (
              <div className="w-48 py-1 max-h-60 overflow-y-auto custom-scrollbar font-sans text-xs">
                {fontOptions.map((f) => (
                  <button onMouseDown={(e) => e.preventDefault()}
                    key={f.name}
                    type="button"
                    onClick={() => handleFontSelect(f.value)}
                    className="flex items-center justify-between w-full px-3 py-1.5 text-xs text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    style={{ fontFamily: f.value || 'inherit' }}
                  >
                    <span>{f.name}</span>
                    {f.value ? (
                      editor.isActive('textStyle', { fontFamily: f.value }) && <Check className="w-3 h-3 text-[#1A1A1A] dark:text-[#F0F0F0]" />
                    ) : (
                      !editor.getAttributes('textStyle').fontFamily && <Check className="w-3 h-3 text-[#1A1A1A] dark:text-[#F0F0F0]" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Font size dropdown */}
            {activeDropdown === 'size' && (
              <div className="w-28 py-1 max-h-56 overflow-y-auto custom-scrollbar font-sans text-xs">
                {fontSizeOptions.map((s) => (
                  <button onMouseDown={(e) => e.preventDefault()}
                    key={s}
                    type="button"
                    onClick={() => handleFontSizeSelect(s)}
                    className="flex items-center justify-between w-full px-3 py-1 text-xs text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <span>{s}</span>
                    {editor.getAttributes('textStyle').fontSize === s && <Check className="w-3 h-3 text-[#1A1A1A] dark:text-[#F0F0F0]" />}
                  </button>
                ))}
                <div className="px-3 py-1 mt-1 flex flex-col gap-1 font-sans">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">Custom</span>
                  <input
                    type="text"
                    placeholder="e.g. 15px"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleFontSizeSelect(e.currentTarget.value);
                      }
                    }}
                    className="w-full text-xs px-1.5 py-1 bg-zinc-50 dark:bg-[#2A2A2A] border-0 focus:outline-none rounded text-zinc-800 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Text color picker */}
            {activeDropdown === 'color' && (
              <div className="p-3 font-sans text-xs">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-2">Preset Colors</span>
                <div className="grid grid-cols-8 gap-1.5">
                  {colorGrid.flat().map((c) => (
                    <button onMouseDown={(e) => e.preventDefault()}
                      key={c}
                      type="button"
                      onClick={() => handleColorSelect(c)}
                      className="w-4 h-4 rounded-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="mt-3 pt-2.5 flex flex-col gap-1.5 font-sans">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mix-blend-color-dodge">Custom HEX</span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={customHexColor}
                      onChange={(e) => setCustomHexColor(e.target.value)}
                      placeholder="#EF4444"
                      className="text-xs px-2 py-1 bg-zinc-50 dark:bg-[#2a2a2a] border-0 rounded focus:outline-none w-24 font-mono select-text text-zinc-850 dark:text-zinc-50"
                    />
                    <button onMouseDown={(e) => e.preventDefault()}
                      type="button"
                      onClick={() => handleColorSelect(customHexColor)}
                      className="px-2.5 py-1 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] text-xs font-semibold rounded hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Apply
                    </button>
                    <button onMouseDown={(e) => e.preventDefault()}
                      type="button"
                      onClick={() => handleColorSelect('')}
                      className="px-1.5 py-1 text-zinc-400 hover:text-zinc-650 text-xs font-semibold rounded cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Highlight color picker */}
            {activeDropdown === 'highlight' && (
              <div className="p-3 font-sans text-xs">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-2">Highlight Presets</span>
                <div className="flex gap-1.5">
                  {highlightPresets.map((hp) => (
                    <button onMouseDown={(e) => e.preventDefault()}
                      key={hp.name}
                      type="button"
                      onClick={() => handleHighlightSelect(hp.color)}
                      className="w-5 h-5 rounded hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      style={{ backgroundColor: hp.color }}
                      title={hp.name}
                    />
                  ))}
                </div>
                <div className="mt-3 pt-2 flex justify-between items-center">
                  <button onMouseDown={(e) => e.preventDefault()}
                    type="button"
                    onClick={() => {
                      runCommand(() => editor.chain().focus().unsetHighlight().run());
                      setActiveDropdown(null);
                    }}
                    className="text-xs text-zinc-500 hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] font-semibold cursor-pointer"
                  >
                    Clear Highlight
                  </button>
                </div>
              </div>
            )}

            {/* Line height dropdown */}
            {activeDropdown === 'lineHeight' && (
              <div className="w-28 py-1 max-h-56 overflow-y-auto custom-scrollbar font-sans text-xs">
                {lineHeightOptions.map((lh) => (
                  <button onMouseDown={(e) => e.preventDefault()}
                    key={lh}
                    type="button"
                    onClick={() => handleLineHeightSelect(lh)}
                    className="w-full px-3 py-1.5 text-xs text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{lh}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Insert Link popover */}
            {activeDropdown === 'link' && (
              <form onSubmit={handleAddLink} className="p-3 w-64 flex flex-col gap-2.5 font-sans text-xs">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Link Options</span>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="text-xs px-2.5 py-1.5 bg-zinc-50 dark:bg-[#2a2a2a] border-0 rounded text-zinc-800 dark:text-zinc-200 focus:outline-none font-sans select-text"
                />
                <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkTarget}
                    onChange={(e) => setLinkTarget(e.target.checked)}
                    className="rounded accent-[#1A1A1A] cursor-pointer"
                  />
                  <span>Open in a new tab</span>
                </label>
                <div className="flex gap-2 justify-end mt-1">
                  {editor.isActive('link') && (
                    <button onMouseDown={(e) => e.preventDefault()}
                      type="button"
                      onClick={() => {
                        runCommand(() => editor.chain().focus().unsetLink().run());
                        setActiveDropdown(null);
                      }}
                      className="mr-auto text-xs text-red-500 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Unlink
                    </button>
                  )}
                  <button onMouseDown={(e) => e.preventDefault()}
                    type="button"
                    onClick={() => setActiveDropdown(null)}
                    className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-600 font-semibold rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button onMouseDown={(e) => e.preventDefault()}
                    type="submit"
                    className="px-3 py-1 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] text-xs font-semibold rounded hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </form>
            )}

            {/* Insert Photo popover */}
            {activeDropdown === 'image' && (
              <div className="p-3 w-72 flex flex-col gap-3 font-sans text-xs">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Insert Photo</span>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide block mb-1">Local Image Upload</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs w-full text-zinc-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#EEEEEE] dark:file:bg-[#2A2A2A] file:text-zinc-700 dark:file:text-zinc-300 hover:file:opacity-90 cursor-pointer"
                  />
                </div>
                <div className="h-[1px] bg-zinc-150 dark:bg-zinc-800" />
                <form onSubmit={handleImageInsertUrl} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide block">Remote Image URL</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://domain.com/photo.png"
                      className="text-xs px-2.5 py-1.5 bg-zinc-50 dark:bg-[#2a2a2a] border-0 rounded text-zinc-805 dark:text-zinc-150 focus:outline-none flex-1 font-sans select-text"
                    />
                    <button onMouseDown={(e) => e.preventDefault()}
                      type="submit"
                      className="px-3 py-1 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] text-xs font-semibold rounded cursor-pointer animate-pulse"
                    >
                      Insert
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* YouTube video embedding */}
            {activeDropdown === 'video' && (
              <div className="p-3 w-72 flex flex-col gap-3 font-sans text-xs">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Add Video / Embed</span>
                
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide block mb-1">Local MP4 Upload</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="text-xs w-full text-zinc-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#EEEEEE] dark:file:bg-[#2A2A2A] file:text-zinc-700 dark:file:text-zinc-300 hover:file:opacity-90 cursor-pointer"
                  />
                </div>

                <div className="h-[1px] bg-zinc-150 dark:bg-zinc-800" />

                <form onSubmit={handleVideoInsert} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide d-block">Video URL or YouTube Link</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or .mp4 URL"
                      className="text-xs px-2.5 py-1.5 bg-zinc-50 dark:bg-[#2a2a2a] border-0 focus:outline-none rounded text-zinc-800 dark:text-zinc-200 flex-1 select-text"
                    />
                    <button onMouseDown={(e) => e.preventDefault()}
                      type="submit"
                      className="px-3 py-1 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] text-xs font-semibold rounded cursor-pointer"
                    >
                      Embed
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Table layout insertion */}
            {activeDropdown === 'table' && (
              <div className="p-3.5 w-48 font-sans text-xs">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-2 text-center">
                  {tableHoverGrid.r > 0 ? `${tableHoverGrid.r} × ${tableHoverGrid.c} Table` : 'Choose Grid Size'}
                </span>
                <div className="grid grid-cols-8 gap-0.5 mx-auto bg-zinc-50 dark:bg-[#252525] p-1 rounded-md">
                  {Array.from({ length: 8 }).map((_, rIdx) => {
                    const r = rIdx + 1;
                    return Array.from({ length: 8 }).map((_, cIdx) => {
                      const c = cIdx + 1;
                      const isSelected = r <= tableHoverGrid.r && c <= tableHoverGrid.c;
                      return (
                        <button onMouseDown={(e) => e.preventDefault()}
                          key={`${r}-${c}`}
                          type="button"
                          onMouseEnter={() => setTableHoverGrid({ r, c })}
                          onMouseLeave={() => setTableHoverGrid({ r: 0, c: 0 })}
                          onClick={() => handleTableInsert(r, c)}
                          className={`w-4.5 h-4.5 rounded-sm transition-all focus:outline-none cursor-pointer ${isSelected ? 'bg-zinc-800 dark:bg-zinc-300' : 'bg-zinc-200/50 dark:bg-zinc-700/50 hover:bg-zinc-300'}`}
                        />
                      );
                    });
                  })}
                </div>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export default EditorToolbar;
