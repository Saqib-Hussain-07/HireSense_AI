import React, { useRef, useState, useCallback } from 'react';

/**
 * Reusable DropZone component for CV and JD PDF upload.
 */
export default function DropZone({ onFile, accept = '.pdf', busy, label, sublabel, accepted }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <label
      className={`drop-zone block border border-dashed rounded-xl p-8 text-center cursor-pointer ${
        dragging ? 'drag-over' : 'border-hairline'
      } bg-panel2 hover:border-onair/40 transition-colors`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
      {busy ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-onair/30 border-t-onair rounded-full animate-spin" />
          <p className="text-sm text-muted">Uploading & analysing…</p>
        </div>
      ) : accepted ? (
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl">✅</span>
          <p className="text-sm font-medium text-signal">{accepted}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl text-muted">↑</span>
          <p className="text-sm font-medium text-text">{label}</p>
          <p className="text-xs text-muted">{sublabel}</p>
        </div>
      )}
    </label>
  );
}
