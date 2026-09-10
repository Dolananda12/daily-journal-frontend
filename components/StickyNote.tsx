"use client";

import React, { useState, useEffect, useRef } from "react";
import { Edit2, Trash2, Check, X } from "lucide-react";

interface StickyNoteProps {
  id: string;
  content: string;
  color: string;
  onUpdate: (id: string, newContent: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function StickyNote({ id, content, color, onUpdate, onDelete }: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editContent.trim() !== content) {
      await onUpdate(id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(id);
    setIsDeleting(false);
  };

  const getBackgroundColor = (c: string) => {
    switch (c) {
      case "pink": return "#fbcfe8";
      case "blue": return "#bfdbfe";
      case "green": return "#bbf7d0";
      case "purple": return "#e9d5ff";
      case "yellow":
      default: return "#fef08a";
    }
  };

  return (
    <div 
      className="sticky-note-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: getBackgroundColor(color),
        transform: isHovered && !isEditing ? 'scale(1.02) rotate(-1deg)' : 'scale(1) rotate(0)',
      }}
    >
      {/* Content Area */}
      <div className="sticky-note-content">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="sticky-note-textarea"
          />
        ) : (
          <div className="sticky-note-text">
            {content}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={`sticky-note-actions ${isHovered || isEditing ? 'visible' : ''}`}>
        {isEditing ? (
          <>
            <button
              onClick={handleCancel}
              className="sticky-note-btn"
              title="Cancel"
            >
              <X size={16} />
            </button>
            <button
              onClick={handleSave}
              className="sticky-note-btn save-btn-small"
              title="Save"
            >
              <Check size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="sticky-note-btn"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="sticky-note-btn"
              title="Delete"
            >
              {isDeleting ? <span className="save-spinner" style={{ width: 12, height: 12 }} /> : <Trash2 size={16} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
