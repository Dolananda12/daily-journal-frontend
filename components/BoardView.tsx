"use client";

import React, { useState, useEffect } from "react";
import StickyNote from "@/components/StickyNote";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

interface BoardNote {
  id: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export default function BoardView() {
  const [notes, setNotes] = useState<BoardNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For creating a new note via Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContent, setNewContent] = useState("");

  const colors = ["yellow", "pink", "blue", "green", "purple"];

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/board-notes");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to load notes.");
      }
      setNotes(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load board notes.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    // Pick a random light color
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    try {
      const res = await apiFetch("/api/board-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent, color: randomColor }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create note");
      }
      const created = await res.json();
      setNotes([created, ...notes]);
      setNewContent("");
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to create note.");
    }
  };

  const handleUpdateNote = async (id: string, content: string) => {
    try {
      const res = await apiFetch(`/api/board-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update note");
      }
      const updated = await res.json();
      setNotes(notes.map((n) => (n.id === id ? updated : n)));
    } catch (err: any) {
      setError(err.message || "Failed to update note.");
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await apiFetch(`/api/board-notes/${id}`, {
        method: "DELETE",
      });
      setNotes(notes.filter((n) => n.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete note.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div className="board-header">
        <h1 className="date-heading" style={{ margin: 0 }}>Idea Board</h1>
        <p className="date-sub" style={{ margin: 0, marginTop: 4 }}>Write something, and it sticks.</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', borderLeft: '4px solid #f87171', padding: '16px', marginBottom: '24px' }}>
          <p style={{ fontSize: '0.875rem', color: '#b91c1c' }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="entry-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <div className="quote-loading"><span /><span /><span /></div>
        </div>
      ) : notes.length === 0 ? (
        <div className="no-entry-box">
          <span className="no-entry-icon">📌</span>
          <p>No notes yet. Get started by clicking the + button to create a new sticky note.</p>
        </div>
      ) : (
        <div className="board-grid">
          {notes.map((note, idx) => (
            <StickyNote
              key={note.id || idx}
              id={note.id || String(idx)}
              content={note.content}
              color={note.color}
              onUpdate={handleUpdateNote}
              onDelete={handleDeleteNote}
            />
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="board-fab"
        title="Create new note"
      >
        <Plus size={32} />
      </button>

      {/* Create Note Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">New Sticky Note</h2>
            <form onSubmit={handleCreateNote}>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What's on your mind?"
                className="modal-textarea"
                autoFocus
              />
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewContent("");
                  }}
                  className="modal-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newContent.trim()}
                  className="modal-btn-save"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
