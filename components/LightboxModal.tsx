"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Heart, Download, Trash2, ZoomIn, ZoomOut, Info } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

export interface GalleryImage {
  id: string;
  thumbUrl: string;
  displayUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  blurhash?: string;
  takenAt: string;
  createdAt?: string;
  caption?: string;
  isFavorite: boolean;
}

interface LightboxModalProps {
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
}

export default function LightboxModal({
  images,
  initialIndex,
  onClose,
  onDelete,
  onToggleFavorite,
}: LightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDisplayLoaded, setIsDisplayLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showInfo, setShowInfo] = useState(false);

  // Touch gesture tracking
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const touchDeltaY = useRef(0);

  const currentImage = images[currentIndex];

  // Preload neighbor display images
  useEffect(() => {
    if (!currentImage) return;

    setIsDisplayLoaded(false);
    setZoomLevel(1);

    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    const nextIndex = (currentIndex + 1) % images.length;

    [images[prevIndex], images[nextIndex]].forEach((img) => {
      if (img?.displayUrl) {
        const preloader = new Image();
        preloader.src = img.displayUrl;
      }
    });
  }, [currentIndex, images, currentImage]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }
    },
    [images.length, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!currentImage) return null;

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleToggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => (prev === 1 ? 2 : 1));
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFav = !currentImage.isFavorite;
    onToggleFavorite(currentImage.id, newFav);
    try {
      await apiFetch(`/api/images/${currentImage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newFav }),
      });
    } catch (err) {
      console.error("Failed to update favorite status:", err);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Move this photo to trash?")) {
      onDelete(currentImage.id);
      if (images.length <= 1) {
        onClose();
      } else {
        setCurrentIndex((prev) => (prev >= images.length - 1 ? 0 : prev));
      }
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = currentImage.displayUrl || currentImage.thumbUrl;
    link.download = `photo-${currentImage.id}.webp`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
  };

  const handleTouchEnd = () => {
    const threshold = 50;
    const isHorizontalSwipe = Math.abs(touchDeltaX.current) > Math.abs(touchDeltaY.current);

    if (isHorizontalSwipe) {
      if (touchDeltaX.current > threshold) {
        handlePrev();
      } else if (touchDeltaX.current < -threshold) {
        handleNext();
      }
    } else {
      if (touchDeltaY.current > threshold * 1.5) {
        onClose();
      }
    }
  };

  const formattedDate = new Date(currentImage.takenAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const fileSizeKb = currentImage.sizeBytes ? Math.round(currentImage.sizeBytes / 1024) : null;

  return (
    <div
      className="lightbox-backdrop"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar */}
      <div className="lightbox-topbar" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="lightbox-counter">
            {currentIndex + 1} / {images.length}
          </span>
          <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>
            {formattedDate}
          </span>
        </div>

        <div className="lightbox-actions">
          <button
            onClick={handleFavoriteClick}
            className={`lightbox-btn ${currentImage.isFavorite ? "active-fav" : ""}`}
            title={currentImage.isFavorite ? "Unfavourite" : "Favourite"}
          >
            <Heart size={18} fill={currentImage.isFavorite ? "currentColor" : "none"} />
          </button>

          <button
            onClick={handleToggleZoom}
            className="lightbox-btn"
            title={zoomLevel === 1 ? "Zoom In" : "Zoom Out"}
          >
            {zoomLevel === 1 ? <ZoomIn size={18} /> : <ZoomOut size={18} />}
          </button>

          <button
            onClick={() => setShowInfo((prev) => !prev)}
            className="lightbox-btn"
            title="Image Info"
          >
            <Info size={18} />
          </button>

          <button
            onClick={handleDownload}
            className="lightbox-btn"
            title="Download full image"
          >
            <Download size={18} />
          </button>

          <button
            onClick={handleDeleteClick}
            className="lightbox-btn"
            style={{ color: "#FF6B6B" }}
            title="Delete photo"
          >
            <Trash2 size={18} />
          </button>

          <button
            onClick={onClose}
            className="lightbox-btn"
            style={{ marginLeft: "6px" }}
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Image View */}
      <div className="lightbox-main-view">
        {/* Navigation Previous */}
        {images.length > 1 && (
          <button onClick={handlePrev} className="lightbox-nav-btn prev" title="Previous (Left Arrow)">
            <ChevronLeft size={28} />
          </button>
        )}

        {/* Image Container */}
        <div
          className="lightbox-image-container"
          style={{
            transform: `scale(${zoomLevel})`,
            cursor: zoomLevel === 1 ? "zoom-in" : "zoom-out",
          }}
          onClick={handleToggleZoom}
        >
          {/* 1. Fast Thumbnail Preview */}
          {currentImage.thumbUrl && !isDisplayLoaded && (
            <img
              src={currentImage.thumbUrl}
              alt={currentImage.caption || "Thumbnail preview"}
              style={{ filter: "blur(6px)", opacity: 0.8 }}
            />
          )}

          {/* 2. High-res Display Image */}
          <img
            src={currentImage.displayUrl || currentImage.thumbUrl}
            alt={currentImage.caption || "Photo"}
            onLoad={() => setIsDisplayLoaded(true)}
            style={{
              opacity: isDisplayLoaded ? 1 : 0,
              position: isDisplayLoaded ? "relative" : "absolute",
              transition: "opacity 0.3s ease",
            }}
          />
        </div>

        {/* Navigation Next */}
        {images.length > 1 && (
          <button onClick={handleNext} className="lightbox-nav-btn next" title="Next (Right Arrow)">
            <ChevronRight size={28} />
          </button>
        )}

        {/* Info Drawer */}
        {showInfo && (
          <div
            style={{
              position: "absolute",
              bottom: "24px",
              right: "24px",
              zIndex: 40,
              background: "rgba(30, 26, 22, 0.95)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px",
              padding: "16px",
              fontSize: "0.8rem",
              maxWidth: "280px",
              color: "#E8E2D9",
              boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "0.9rem" }}>Photo Details</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <p style={{ margin: 0 }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>Date:</span> {formattedDate}
              </p>
              {currentImage.width && currentImage.height && (
                <p style={{ margin: 0 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Dimensions:</span> {currentImage.width} × {currentImage.height} px
                </p>
              )}
              {fileSizeKb && (
                <p style={{ margin: 0 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Size:</span> ~{fileSizeKb} KB
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="lightbox-bottombar">
        Use Arrow keys or Click buttons to browse • Esc to close
      </div>
    </div>
  );
}
