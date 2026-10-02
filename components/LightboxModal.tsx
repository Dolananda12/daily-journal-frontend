import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Download, Trash2, ZoomIn, ZoomOut, Info } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

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
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }
    },
    [images.length, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: newFav }),
      });
    } catch (err) {
      console.error('Failed to update favorite status:', err);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Move this photo to trash?')) {
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
    const link = document.createElement('a');
    link.href = currentImage.displayUrl || currentImage.thumbUrl;
    link.download = `photo-${currentImage.id}.webp`;
    link.target = '_blank';
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
      // Swipe down to dismiss
      if (touchDeltaY.current > threshold * 1.5) {
        onClose();
      }
    }
  };

  const formattedDate = new Date(currentImage.takenAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const fileSizeKb = currentImage.sizeBytes ? Math.round(currentImage.sizeBytes / 1024) : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col justify-between anim-fade-in select-none"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ backdropFilter: 'blur(10px)' }}
    >
      {/* Top Header Bar */}
      <div
        className="flex items-center justify-between p-4 z-50 bg-gradient-to-b from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-2.5 py-1 bg-white/10 rounded-full border border-white/10">
            {currentIndex + 1} / {images.length}
          </span>
          <span className="text-sm font-medium text-white/80 hidden sm:inline">
            {formattedDate}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={handleFavoriteClick}
            className={`p-2.5 rounded-full transition-all ${
              currentImage.isFavorite
                ? 'text-red-500 bg-white/20'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title={currentImage.isFavorite ? 'Unfavourite' : 'Favourite'}
          >
            <Heart size={18} fill={currentImage.isFavorite ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={handleToggleZoom}
            className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
            title={zoomLevel === 1 ? 'Zoom In' : 'Zoom Out'}
          >
            {zoomLevel === 1 ? <ZoomIn size={18} /> : <ZoomOut size={18} />}
          </button>

          <button
            onClick={() => setShowInfo((prev) => !prev)}
            className={`p-2.5 rounded-full transition-all ${
              showInfo ? 'text-white bg-white/20' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="Image Info"
          >
            <Info size={18} />
          </button>

          <button
            onClick={handleDownload}
            className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
            title="Download full image"
          >
            <Download size={18} />
          </button>

          <button
            onClick={handleDeleteClick}
            className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-all"
            title="Delete photo"
          >
            <Trash2 size={18} />
          </button>

          <button
            onClick={onClose}
            className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all ml-1"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Image Display */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 z-40 p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 rounded-full transition-all hidden md:flex items-center justify-center"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {/* Progressive Image Container */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200"
          style={{
            transform: `scale(${zoomLevel})`,
            cursor: zoomLevel === 1 ? 'zoom-in' : 'zoom-out',
          }}
          onClick={handleToggleZoom}
        >
          {/* 1. Fast Thumbnail (visible first) */}
          {currentImage.thumbUrl && !isDisplayLoaded && (
            <img
              src={currentImage.thumbUrl}
              alt={currentImage.caption || 'Thumbnail preview'}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-md filter blur-sm transition-opacity duration-300"
            />
          )}

          {/* 2. High-res Display Image (swaps in smoothly) */}
          <img
            src={currentImage.displayUrl || currentImage.thumbUrl}
            alt={currentImage.caption || 'Photo'}
            onLoad={() => setIsDisplayLoaded(true)}
            className={`max-w-[90vw] max-h-[80vh] object-contain rounded-md shadow-2xl transition-opacity duration-300 ${
              isDisplayLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0 m-auto'
            }`}
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 z-40 p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 rounded-full transition-all hidden md:flex items-center justify-center"
            title="Next (Right Arrow)"
          >
            <ChevronRight size={28} />
          </button>
        )}

        {/* Floating Info Drawer */}
        {showInfo && (
          <div
            className="absolute bottom-6 right-6 z-40 bg-zinc-900/90 border border-white/10 rounded-xl p-4 text-xs max-w-xs shadow-2xl backdrop-blur-md anim-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-semibold text-white mb-2 text-sm">Image Information</h4>
            <div className="space-y-1.5 text-zinc-300">
              <p>
                <span className="text-zinc-500">Date Taken:</span> {formattedDate}
              </p>
              {currentImage.width && currentImage.height && (
                <p>
                  <span className="text-zinc-500">Dimensions:</span> {currentImage.width} × {currentImage.height} px
                </p>
              )}
              {fileSizeKb && (
                <p>
                  <span className="text-zinc-500">File Size:</span> ~{fileSizeKb} KB
                </p>
              )}
              {currentImage.caption && (
                <p className="mt-2 text-zinc-100 pt-2 border-t border-white/10">
                  <span className="text-zinc-500 block mb-0.5">Caption:</span>
                  {currentImage.caption}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: Swipe / Navigation hint */}
      <div className="p-3 text-center text-xs text-white/40 bg-gradient-to-t from-black/80 to-transparent">
        <span className="hidden sm:inline">Use Arrow keys or Click buttons to browse • Esc to close</span>
        <span className="sm:hidden">Swipe left/right to browse • Swipe down to close</span>
      </div>
    </div>
  );
}
