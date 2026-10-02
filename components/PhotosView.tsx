"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  Plus,
  Image as ImageIcon,
  Heart,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Trash2,
  X,
  Maximize2
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { processAndUploadBatch, UploadItem } from "@/lib/uploadQueue";
import LightboxModal, { GalleryImage } from "./LightboxModal";

interface DateGroup {
  label: string;
  dateKey: string;
  images: GalleryImage[];
}

export default function PhotosView() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterFavorite, setFilterFavorite] = useState(false);

  // Upload queue state
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Lightbox state
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // 1. Fetch images from Spring Boot backend
  const fetchImages = useCallback(async (isReset = false, favOnly = filterFavorite) => {
    try {
      if (isReset) {
        setLoadingInitial(true);
        setCursor(null);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({ limit: "60" });
      if (favOnly) params.append("favorite", "true");
      if (!isReset && cursor) params.append("cursor", cursor);

      const res = await apiFetch(`/api/images?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items: GalleryImage[] = data.items || [];
        setImages((prev) => (isReset ? items : [...prev, ...items]));
        setCursor(data.nextCursor || null);
        setHasMore(Boolean(data.hasMore));
      }
    } catch (err) {
      console.error("Failed to load gallery images:", err);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [cursor, filterFavorite]);

  useEffect(() => {
    fetchImages(true, filterFavorite);
  }, [filterFavorite]);

  // 2. Keyset pagination infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingInitial) {
          fetchImages(false, filterFavorite);
        }
      },
      { threshold: 0.1 }
    );

    const currentEl = observerTarget.current;
    if (currentEl) observer.observe(currentEl);
    return () => {
      if (currentEl) observer.unobserve(currentEl);
    };
  }, [hasMore, loadingMore, loadingInitial, fetchImages, filterFavorite]);

  // 3. Process and Upload Files
  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (f) =>
        f.type.startsWith("image/") ||
        f.name.toLowerCase().endsWith(".heic") ||
        f.name.toLowerCase().endsWith(".heif")
    );

    if (fileArray.length === 0) return;

    setUploadError(null);
    setIsUploading(true);

    processAndUploadBatch(fileArray, {
      onItemUpdated: (item) => {
        setUploadItems((prev) => {
          const index = prev.findIndex((p) => p.id === item.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = item;
            return next;
          }
          return [item, ...prev];
        });
      },
      onItemCompleted: (item, serverImage) => {
        if (serverImage) {
          setImages((prev) => {
            if (prev.some((img) => img.id === serverImage.id)) return prev;
            return [serverImage, ...prev];
          });
        }
      },
      onAllCompleted: () => {
        setIsUploading(false);
        // Refresh list to ensure all thumbnails/signed URLs are loaded
        fetchImages(true, filterFavorite);
        setTimeout(() => {
          setUploadItems((prev) => prev.filter((i) => i.status === "error" || i.status === "duplicate"));
        }, 3000);
      },
    });
  };

  // 4. Paste listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        handleFiles(e.clipboardData.files);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // 5. Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // 6. Delete & Favorite Actions
  const handleDelete = async (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    try {
      await apiFetch(`/api/images/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete image:", err);
    }
  };

  const handleToggleFavorite = (id: string, isFav: boolean) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, isFavorite: isFav } : img))
    );
  };

  // 7. Group images by capture date (Google Photos style)
  const groupImagesByDate = (imgs: GalleryImage[]): DateGroup[] => {
    const groupsMap = new Map<string, { label: string; dateKey: string; images: GalleryImage[] }>();

    const now = new Date();
    const todayStr = now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    imgs.forEach((img) => {
      const d = new Date(img.takenAt);
      const dateStr = d.toDateString();
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      let label = "";
      if (dateStr === todayStr) {
        label = "Today";
      } else if (dateStr === yesterdayStr) {
        label = "Yesterday";
      } else if (d.getFullYear() === now.getFullYear()) {
        label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      } else {
        label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, { label, dateKey, images: [] });
      }
      groupsMap.get(dateKey)!.images.push(img);
    });

    return Array.from(groupsMap.values());
  };

  const dateGroups = groupImagesByDate(images);

  const activeUploadCount = uploadItems.filter(
    (i) => i.status === "processing" || i.status === "uploading"
  ).length;

  return (
    <div
      className="gallery-container anim-fade-in"
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*,.heic,.heif"
        multiple
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
        }}
      />

      {/* Header Row */}
      <div className="gallery-header-row">
        <div className="gallery-title-block">
          <h1>Photos & Memories</h1>
          <p>Durable, private photo library • Grouped by capture date</p>
        </div>

        <div className="gallery-controls">
          <button
            onClick={() => setFilterFavorite((prev) => !prev)}
            className={`gallery-btn-secondary ${filterFavorite ? "active" : ""}`}
            title="Filter favorite photos"
          >
            <Heart size={15} fill={filterFavorite ? "currentColor" : "none"} />
            <span>Favourites</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="gallery-btn-primary"
          >
            <Plus size={16} />
            <span>Add Photos</span>
          </button>
        </div>
      </div>

      {/* Active Uploading Banner */}
      {isUploading && (
        <div className="gallery-upload-banner anim-scale-in">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Loader2 size={20} className="spin" style={{ color: "var(--accent-dark)" }} />
            <div>
              <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: "var(--text)" }}>
                Uploading {activeUploadCount} photo{activeUploadCount > 1 ? "s" : ""}...
              </p>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Generating thumbnails and streaming to private storage
              </p>
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--text-2)", background: "var(--surface-2)", padding: "4px 8px", borderRadius: "var(--radius-sm)" }}>
            WebP 2560px
          </span>
        </div>
      )}

      {/* Optimistic Preview Tiles */}
      {uploadItems.length > 0 && (
        <div className="gallery-queue-grid">
          {uploadItems.map((item) => (
            <div key={item.id} className="gallery-queue-card">
              <img
                src={item.previewUrl}
                alt="Uploading preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div className="gallery-queue-overlay">
                {item.status === "completed" ? (
                  <CheckCircle2 size={24} color="#48BB78" />
                ) : item.status === "duplicate" ? (
                  <span style={{ fontSize: "0.72rem", background: "rgba(0,0,0,0.7)", padding: "2px 6px", borderRadius: "4px" }}>
                    Already saved
                  </span>
                ) : item.status === "error" ? (
                  <AlertCircle size={24} color="#F56565" />
                ) : (
                  <>
                    <Loader2 size={20} className="spin" style={{ marginBottom: "6px" }} />
                    <div style={{ width: "80%", background: "rgba(255,255,255,0.3)", height: "4px", borderRadius: "999px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${item.progress}%`,
                          height: "100%",
                          background: "#fff",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading Skeleton */}
      {loadingInitial ? (
        <div className="entry-card" style={{ minHeight: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="quote-loading">
            <span /><span /><span />
          </div>
        </div>
      ) : images.length === 0 ? (
        /* Empty State */
        <div
          className="gallery-empty-box"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="gallery-empty-icon">
            <ImageIcon size={28} />
          </div>
          <h3>{filterFavorite ? "No favourite photos" : "Your photo gallery is empty"}</h3>
          <p style={{ margin: 0 }}>
            {filterFavorite
              ? "Mark any photo with the heart icon to easily access it here."
              : "Start adding photos from your phone camera roll or computer. Drag and drop anywhere or paste with Ctrl+V."}
          </p>
        </div>
      ) : (
        /* Google Photos Date Grouped Grid */
        <div>
          {dateGroups.map((group) => (
            <div key={group.dateKey} className="gallery-date-section">
              {/* Sticky Date Header */}
              <div className="gallery-date-header">
                <div className="gallery-date-label">
                  <Calendar size={14} style={{ color: "var(--accent-dark)" }} />
                  <span>{group.label}</span>
                </div>
                <span className="gallery-date-count">
                  {group.images.length} photo{group.images.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Photo Tiles Grid */}
              <div className="gallery-grid">
                {group.images.map((photo) => {
                  const globalIndex = images.findIndex((img) => img.id === photo.id);
                  return (
                    <div
                      key={photo.id}
                      className="gallery-card"
                      onClick={() => setSelectedImageIndex(globalIndex >= 0 ? globalIndex : 0)}
                    >
                      {/* Image Thumbnail */}
                      <img
                        src={photo.thumbUrl || photo.displayUrl}
                        alt={photo.caption || "Photo"}
                        loading="lazy"
                      />

                      {/* Favorite Heart Badge */}
                      {photo.isFavorite && (
                        <div className="gallery-fav-indicator">
                          <Heart size={13} fill="currentColor" />
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="gallery-card-overlay">
                        <div className="gallery-card-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(photo.id, !photo.isFavorite);
                              apiFetch(`/api/images/${photo.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ isFavorite: !photo.isFavorite }),
                              });
                            }}
                            className="gallery-icon-btn"
                            title={photo.isFavorite ? "Unfavourite" : "Favourite"}
                          >
                            <Heart
                              size={15}
                              style={{
                                color: photo.isFavorite ? "#E53E3E" : "var(--text)",
                                fill: photo.isFavorite ? "#E53E3E" : "none",
                              }}
                            />
                          </button>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="gallery-time-badge">
                            {new Date(photo.takenAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          <Maximize2 size={14} style={{ opacity: 0.8 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Keyset Pagination Infinite Scroll Target */}
      <div ref={observerTarget} style={{ padding: "16px 0", display: "flex", justifyContent: "center" }}>
        {loadingMore && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            <Loader2 size={16} className="spin" />
            <span>Loading older photos...</span>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {selectedImageIndex !== null && images[selectedImageIndex] && (
        <LightboxModal
          images={images}
          initialIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
          onDelete={handleDelete}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </div>
  );
}
