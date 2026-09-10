import React, { useState, useEffect, useRef } from "react";
import { Upload, X, Maximize2, Trash2, Image as ImageIcon } from "lucide-react";

interface Photo {
  id: string;
  fileName: string;
  contentType: string;
}

export default function PhotosView() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8080/api/photos");
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch (error) {
      console.error("Failed to fetch photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8080/api/photos", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await fetchPhotos();
      } else {
        alert("Failed to upload photo.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this photo?")) return;

    try {
      const res = await fetch(`http://localhost:8080/api/photos/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPhotos(photos.filter(p => p.id !== id));
        if (selectedPhoto?.id === id) setSelectedPhoto(null);
      }
    } catch (error) {
      console.error("Failed to delete photo:", error);
    }
  };

  // Drag and drop handlers
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full anim-fade-in" style={{ padding: '0 2rem' }}>
      
      {/* Upload Zone */}
      <div 
        className={`w-full mb-8 mt-4 rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
          dragActive ? 'border-black bg-black/5' : 'border-black/20 hover:border-black/40 hover:bg-black/5'
        }`}
        style={{ minHeight: '160px' }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileInput} 
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="quote-loading">
              <span /><span /><span />
            </div>
            <p className="text-sm text-black/60 font-medium">Uploading high-res image...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <div className="p-3 bg-white rounded-full shadow-sm mb-2 text-black">
              <Upload size={24} />
            </div>
            <h3 className="font-semibold text-black/80">Drop your photos here</h3>
            <p className="text-sm text-black/50">Or click to browse from your device</p>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex justify-center p-12">
           <div className="quote-loading"><span /><span /><span /></div>
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center opacity-50">
          <ImageIcon size={48} className="mb-4" />
          <h2 className="text-xl font-medium mb-2">No photos yet</h2>
          <p>Drop a photo above to start building your gallery.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
          {photos.map((photo) => (
            <div 
              key={photo.id}
              className="group relative aspect-square rounded-xl overflow-hidden bg-black/5 cursor-zoom-in border border-black/10 shadow-sm hover:shadow-md transition-all duration-300"
              onClick={() => setSelectedPhoto(photo)}
            >
              {/* Using standard img tag pointing to API endpoint */}
              <img 
                src={`http://localhost:8080/api/photos/${photo.id}`}
                alt={photo.fileName}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-start justify-end p-2 opacity-0 group-hover:opacity-100">
                <button 
                  onClick={(e) => handleDelete(photo.id, e)}
                  className="p-2 rounded-full bg-white/90 text-red-600 hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                  title="Delete photo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="absolute bottom-3 right-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md">
                <Maximize2 size={20} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 anim-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <button 
            className="absolute top-6 right-6 p-3 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all z-50"
            onClick={() => setSelectedPhoto(null)}
            title="Close"
          >
            <X size={24} />
          </button>
          
          <img 
            src={`http://localhost:8080/api/photos/${selectedPhoto.id}`}
            alt={selectedPhoto.fileName}
            className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-sm"
            onClick={(e) => e.stopPropagation()} // Prevent clicking image from closing modal
          />
        </div>
      )}
    </div>
  );
}
