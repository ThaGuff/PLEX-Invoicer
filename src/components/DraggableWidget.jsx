/**
 * DraggableWidget — Makes any widget draggable and resizable on desktop
 * Saves position/size to localStorage per widget ID
 * On mobile: renders normally without drag behavior
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GripHorizontal, Minimize2, Maximize2 } from 'lucide-react';

const isMobile = () => window.innerWidth < 768;

export default function DraggableWidget({ id, title, icon, defaultPos = { x: 0, y: 0 }, defaultSize = { w: 400, h: 'auto' }, children, accent = '#2563EB', className = '', style = {} }) {
  const storageKey = `revanew_widget_${id}`;
  const [pos, setPos] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(storageKey) || '{}'); return s.pos || defaultPos; } catch { return defaultPos; }
  });
  const [size, setSize] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(storageKey) || '{}'); return s.size || defaultSize; } catch { return defaultSize; }
  });
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const widgetRef = useRef(null);

  // Save to localStorage when pos/size changes
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ pos, size })); } catch {}
  }, [pos, size, storageKey]);

  const handleMouseDown = useCallback((e) => {
    if (isMobile()) return;
    e.preventDefault();
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y };
    setDragging(true);

    const handleMouseMove = (e) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      setPos({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
    };

    const handleMouseUp = () => {
      dragStart.current = null;
      setDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [pos]);

  // On mobile, just render as a regular card
  if (typeof window !== 'undefined' && isMobile()) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <div
      ref={widgetRef}
      style={{
        position: 'relative',
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        width: size.w,
        transition: dragging ? 'none' : 'transform 0.1s ease',
        zIndex: dragging ? 100 : 1,
        userSelect: 'none',
        ...style,
      }}
      className={className}
    >
      {/* Drag handle bar */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px', background: `${accent}10`, borderRadius: '12px 12px 0 0',
          border: `1px solid ${accent}20`, borderBottom: 'none',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <GripHorizontal size={13} style={{ color: accent, opacity: 0.6 }} />
          {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
          <span style={{ fontSize: 11, fontWeight: 600, color: accent }}>{title}</span>
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, opacity: 0.6, padding: 2 }}
        >
          {collapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div style={{ borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
          {children}
        </div>
      )}
      {collapsed && (
        <div style={{ padding: '6px 12px', background: 'var(--bg-surface)', border: `1px solid ${accent}20`, borderRadius: '0 0 12px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
          Click ↑ to expand
        </div>
      )}
    </div>
  );
}
