// A highly customizable resizable HTML5 video extension with 8 drag handles and floating controls.
import React, { useState, useRef } from 'react';
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';

function ResizableVideoComponent({ node, updateAttributes, selected }) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState(null);
  const videoRef = useRef(null);
  const startPos = useRef(null);
  const startSize = useRef(null);

  const { src, width, height, alignment } = node.attrs;

  const handleMouseDown = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeDir(direction);
    
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = {
      width: videoRef.current?.offsetWidth || 320,
      height: videoRef.current?.offsetHeight || 180,
    };

    const handleMouseMove = (moveEvent) => {
      if (!startPos.current) return;
      
      const dx = moveEvent.clientX - startPos.current.x;
      const dy = moveEvent.clientY - startPos.current.y;
      
      let newWidth = startSize.current.width;
      let newHeight = startSize.current.height;
      
      if (direction.includes('e')) {
        newWidth = Math.max(150, startSize.current.width + dx);
      }
      if (direction.includes('w')) {
        newWidth = Math.max(150, startSize.current.width - dx);
      }
      if (direction.includes('s')) {
        newHeight = Math.max(90, startSize.current.height + dy);
      }
      if (direction.includes('n')) {
        newHeight = Math.max(90, startSize.current.height - dy);
      }
      
      if (moveEvent.shiftKey) {
        const aspectRatio = startSize.current.width / startSize.current.height;
        if (direction.includes('e') || direction.includes('w')) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
      }
      
      updateAttributes({
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDir(null);
      startPos.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const alignStyle = {
    left: 'mr-auto block text-left',
    center: 'mx-auto block text-center',
    right: 'ml-auto block text-right',
    'full-width': 'w-full block',
  };

  return (
    <NodeViewWrapper className={`inline-block my-2 relative max-w-full ${alignStyle[alignment || 'left']}`}>
      <div
        className={`relative inline-block rounded-lg select-none transition-shadow ${selected ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          width: alignment === 'full-width' ? '100%' : (width ? `${width}px` : 'auto'),
          height: height ? `${height}px` : 'auto',
        }}
      >
        <video
          ref={videoRef}
          src={src}
          controls
          className="rounded-lg object-contain max-w-full"
          draggable={false}
          style={{
            width: alignment === 'full-width' ? '100%' : (width ? `${width}px` : 'auto'),
            height: height ? `${height}px` : 'auto',
          }}
        />
        
        {selected && (
          <>
            {/* 8 resize handles */}
            {[
              { dir: 'nw', style: { top: '-4px', left: '-4px', cursor: 'nw-resize' } },
              { dir: 'n', style: { top: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
              { dir: 'ne', style: { top: '-4px', right: '-4px', cursor: 'ne-resize' } },
              { dir: 'e', style: { right: '-4px', top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' } },
              { dir: 'se', style: { bottom: '-4px', right: '-4px', cursor: 'se-resize' } },
              { dir: 's', style: { bottom: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
              { dir: 'sw', style: { bottom: '-4px', left: '-4px', cursor: 'sw-resize' } },
              { dir: 'w', style: { left: '-4px', top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' } },
            ].map(({ dir, style }) => (
              <div
                key={dir}
                onMouseDown={e => handleMouseDown(e, dir)}
                className="absolute w-2.5 h-2.5 bg-blue-500 rounded-full z-10 hover:scale-125 transition-transform"
                style={style}
              />
            ))}
            
            {/* Video alignment/size floating toolbar */}
            <div
              className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-[#252525] rounded-lg shadow-lg whitespace-nowrap z-50 text-white"
              onMouseDown={e => e.preventDefault()}
            >
              {/* Width Input */}
              <input
                type="number"
                value={width || ''}
                onChange={e => updateAttributes({
                  width: parseInt(e.target.value) || null
                })}
                placeholder="Auto"
                title="Width (px)"
                className="w-14 bg-[#141414] text-[#F0F0F0] text-[11px] rounded px-1.5 py-0.5 border-0 focus:ring-0 text-center font-mono focus:outline-none"
              />
              <span className="text-[11px] text-zinc-500">×</span>
              {/* Height Input */}
              <input
                type="number"
                value={height || ''}
                onChange={e => updateAttributes({
                  height: parseInt(e.target.value) || null
                })}
                placeholder="Auto"
                title="Height (px)"
                className="w-14 bg-[#141414] text-[#F0F0F0] text-[11px] rounded px-1.5 py-0.5 border-0 focus:ring-0 text-center font-mono focus:outline-none"
              />
              
              <div className="w-[1px] h-3.5 bg-zinc-700/50 mx-1" />
              
              {/* Alignment Buttons */}
              {[
                { a: 'left', label: 'Left', icon: 'L' },
                { a: 'center', label: 'Center', icon: 'C' },
                { a: 'right', label: 'Right', icon: 'R' },
                { a: 'full-width', label: 'Full Width', icon: '↔' },
              ].map(({ a, icon, label }) => (
                <button
                  key={a}
                  type="button"
                  title={label}
                  onClick={() => updateAttributes({ alignment: a })}
                  className={`w-6 h-6 flex items-center justify-center rounded text-[11px] cursor-pointer font-bold transition-colors ${
                    (alignment || 'left') === a
                      ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-700 dark:text-zinc-50'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {icon}
                </button>
              ))}
              
              <div className="w-[1px] h-3.5 bg-zinc-700/50 mx-1" />
              
              {/* Reset Size Button */}
              <button
                type="button"
                title="Reset Size"
                onClick={() => updateAttributes({ width: null, height: null })}
                className="text-[11px] text-zinc-400 hover:text-emerald-400 cursor-pointer px-1 text-center font-mono"
              >
                Reset
              </button>
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ResizableVideo = Node.create({
  name: 'resizableVideo',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: el => el.style.width ? parseInt(el.style.width) : (el.getAttribute('width') ? parseInt(el.getAttribute('width')) : null),
        renderHTML: attrs => {
          if (!attrs.width) return {};
          return { style: `width: ${attrs.width}px` };
        },
      },
      height: {
        default: null,
        parseHTML: el => el.style.height ? parseInt(el.style.height) : (el.getAttribute('height') ? parseInt(el.getAttribute('height')) : null),
        renderHTML: attrs => {
          if (!attrs.height) return {};
          return { style: `height: ${attrs.height}px` };
        },
      },
      alignment: {
        default: 'left',
        parseHTML: el => el.getAttribute('data-alignment') || el.style.float || 'left',
        renderHTML: attrs => ({
          'data-alignment': attrs.alignment,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'video[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', HTMLAttributes];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableVideoComponent);
  },

  addCommands() {
    return {
      setVideo: options => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: options,
          })
          .run();
      },
    };
  },
});

export default ResizableVideo;
