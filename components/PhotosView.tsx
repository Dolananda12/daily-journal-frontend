import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload,
  Plus,
  Image as ImageIcon,
  Heart,
  Calendar,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { processAndUploadBatch, UploadItem } from '@/lib/uploadQueue';
import LightboxModal, { GalleryImage } from './LightboxModal';

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

  // Lightbox state
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // 1. Fetch initial photos
  const fetchImages = useCallback(async (isReset = false, favOnly = filterFavorite) => {
    try {
      if (isReset) {
        setLoadingInitial(true);
        setCursor(null);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({ limit: '60' });
      if (favOnly) params.append('favorite', 'true');
      if (!isReset && cursor) params.append('cursor', cursor);

      const res = await apiFetch(`/api/images?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items: GalleryImage[] = data.items || [];
        setImages((prev) => (isReset ? items : [...prev, ...items]));
        setCursor(data.nextCursor || null);
        setHasMore(Boolean(data.hasMore));
      }
    } catch (err) {
      console.error('Failed to load gallery images:', err);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [cursor, filterFavorite]);

  useEffect(() => {
    fetchImages(true, filterFavorite);
  }, [filterFavorite]);

  // 2. Infinite scroll observer
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

  // 3. Handle File Selection & Upload
  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (f) =>
        f.type.startsWith('image/') ||
        f.name.toLowerCase().endsWith('.heic') ||
        f.name.toLowerCase().endsWith('.heif')
    );

    if (fileArray.length === 0) return;

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
        // Clean up completed queue items after 4 seconds
        setTimeout(() => {
          setUploadItems((prev) => prev.filter((i) => i.status === 'error' || i.status === 'duplicate'));
        }, 4000);
      },
    });
  };

  // 4. Clipboard paste listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        handleFiles(e.clipboardData.files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // 5. Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
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
      await apiFetch(`/api/images/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  };

  const handleToggleFavorite = (id: string, isFav: boolean) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, isFavorite: isFav } : img))
    );
  };

  // 7. Group images by taken date (Google Photos style)
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
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      let label = '';
      if (dateStr === todayStr) {
        label = 'Today';
      } else if (dateStr === yesterdayStr) {
        label = 'Yesterday';
      } else if (d.getFullYear() === now.getFullYear()) {
        label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      } else {
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, { label, dateKey, images: [] });
      }
      groupsMap.get(dateKey)!.images.push(img);
    });

    return Array.from(groupsMap.values());
  };

  const dateGroups = groupImagesByDate(images);

  // Active upload count
  const activeUploadCount = uploadItems.filter(
    (i) => i.status === 'processing' || i.status === 'uploading'
  ).length;

  return (
    <div
      className="w-full pb-20 anim-fade-in relative"
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,.heic,.heif"
        multiple
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
        }}
      />

      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">Gallery</h1>
          <p className="text-xs text-black/50 mt-0.5">
            Private permanent photo library • Grouped by capture date
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Favorite Filter Toggle */}
          <button
            onClick={() => setFilterFavorite((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterFavorite
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-black/5 text-black/70 hover:bg-black/10 border border-transparent'
            }`}
          >
            <Heart size={14} fill={filterFavorite ? 'currentColor' : 'none'} />
            <span>Favourites</span>
          </button>

          {/* Add Photos Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-black text-white hover:bg-black/80 rounded-lg text-xs font-medium shadow-sm transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Add Photos</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Visual Overlay */}
      {dragActive && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white border-4 border-dashed border-white m-4 rounded-2xl pointer-events-none anim-fade-in">
          <Upload size={48} className="mb-3 animate-bounce" />
          <h2 className="text-xl font-semibold">Drop photos here to upload</h2>
          <p className="text-sm text-white/70">JPG, PNG, HEIC, WebP supported</p>
        </div>
      )}

      {/* Floating Upload Progress Banner */}
      {isUploading && (
        <div className="sticky top-20 z-30 mb-6 bg-white border border-black/10 shadow-lg rounded-xl p-3 flex items-center justify-between gap-4 anim-fade-in">
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-black" />
            <div>
              <p className="text-xs font-semibold text-black">
                Uploading {activeUploadCount} photo{activeUploadCount > 1 ? 's' : ''}...
              </p>
              <p className="text-[11px] text-black/50">Optimising and saving to private storage</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-black/5 rounded text-black/60">
            Client-side WebP
          </span>
        </div>
      )}

      {/* Active Upload Tile Previews (Optimistic UI) */}
      {uploadItems.length > 0 && (
        <div className="mb-8 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {uploadItems.map((item) => (
            <div
              key={item.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-black/10 bg-black/5 flex flex-col justify-end p-2"
            >
              <img
                src={item.previewUrl}
                alt="Uploading preview"
                className="absolute inset-0 w-full h-full object-cover filter brightness-90"
              />
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-2">
                {item.status === 'completed' ? (
                  <CheckCircle2 size={24} className="text-emerald-400 drop-shadow" />
                ) : item.status === 'duplicate' ? (
                  <span className="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">
                    Already saved
                  </span>
                ) : item.status === 'error' ? (
                  <AlertCircle size={24} className="text-red-400 drop-shadow" />
                ) : (
                  <>
                    <Loader2 size={20} className="animate-spin text-white mb-1.5" />
                    <div className="w-full bg-white/30 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-white h-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Gallery List */}
      {loadingInitial ? (
        <div className="space-y-6 pt-4">
          {[1, 2].map((g) => (
            <div key={g} className="space-y-3">
              <div className="h-4 bg-black/10 rounded w-28 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="aspect-square bg-black/5 rounded-xl border border-black/5 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : images.length === 0 ? (
        /* Empty State */
        <div
          className="my-12 py-16 px-6 border-2 border-dashed border-black/15 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-black/30 hover:bg-black/[0.02] transition-all"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-14 h-14 bg-black/5 rounded-full flex items-center justify-center mb-3 text-black/60">
            <ImageIcon size={28} />
          </div>
          <h3 className="text-base font-semibold text-black">
            {filterFavorite ? 'No favourite photos' : 'Your gallery is empty'}
          </h3>
          <p className="text-xs text-black/50 mt-1 max-w-sm">
            {filterFavorite
              ? 'Tap the heart icon on any photo to add it to your favourites.'
              : 'Tap here or drag and drop photos from your phone or desktop. Paste images directly with Ctrl+V.'}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="mt-5 px-4 py-2 bg-black text-white text-xs font-medium rounded-lg shadow-sm hover:bg-black/80 transition-all"
          >
            Select Photos
          </button>
        </div>
      ) : (
        /* Date-grouped Google Photos-style Grid */
        <div className="space-y-8">
          {dateGroups.map((group) => (
            <div key={group.dateKey} className="space-y-3">
              {/* Sticky Date Header */}
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md py-2 flex items-center justify-between border-b border-black/5">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-black/40" />
                  <h2 className="text-xs font-bold text-black uppercase tracking-wider">
                    {group.label}
                  </h2>
                </div>
                <span className="text-[11px] font-medium text-black/40">
                  {group.images.length} item{group.images.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Photo Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {group.images.map((photo) => {
                  const globalIndex = images.findIndex((img) => img.id === photo.id);
                  return (
                    <div
                      key={photo.id}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-black/5 cursor-zoom-in border border-black/10 shadow-xs hover:shadow-md transition-all duration-300"
                      onClick={() => setSelectedImageIndex(globalIndex >= 0 ? globalIndex : 0)}
                    >
                      {/* Thumbnail Image */}
                      <img
                        src={photo.thumbUrl || photo.displayUrl}
                        alt={photo.caption || 'Photo'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />

                      {/* Favorite Badge */}
                      {photo.isFavorite && (
                        <div className="absolute top-2 left-2 p-1 bg-black/40 rounded-full text-red-500 drop-shadow">
                          <Heart size={12} fill="currentColor" />
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(photo.id, !photo.isFavorite);
                              apiFetch(`/api/images/${photo.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isFavorite: !photo.isFavorite }),
                              });
                            }}
                            className="p-1.5 rounded-full bg-white/90 text-black hover:scale-110 transition-all shadow-sm"
                            title={photo.isFavorite ? 'Unfavourite' : 'Favourite'}
                          >
                            <Heart
                              size={14}
                              className={photo.isFavorite ? 'text-red-500 fill-red-500' : 'text-black/70'}
                            />
                          </button>
                        </div>
                        <p className="text-[10px] text-white/90 font-medium truncate">
                          {new Date(photo.takenAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Keyset Pagination Sentinel */}
      <div ref={observerTarget} className="py-8 flex justify-center">
        {loadingMore && (
          <div className="flex items-center gap-2 text-xs text-black/50">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading more photos...</span>
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
