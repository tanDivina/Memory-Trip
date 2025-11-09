import React, { useState, useEffect } from 'react';
import { StoredTrip } from '../types';
import { generatePostcard } from '../services/postcardService';
import Button from './Button';
import Spinner from './Spinner';

interface GalleryDetailModalProps {
  trip: StoredTrip;
  onClose: () => void;
}

// Helper from GameOverScreen
const dataURLtoFile = (dataurl: string, filename: string): File | null => {
    const arr = dataurl.split(',');
    if (arr.length < 2) { return null; }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) { return null; }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
};

const GalleryDetailModal: React.FC<GalleryDetailModalProps> = ({ trip, onClose }) => {
  const [postcardUrl, setPostcardUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false); // for share/download
  const canShare = typeof navigator.share === 'function';

  useEffect(() => {
    const createPostcard = async () => {
      setIsLoading(true);
      try {
        const url = await generatePostcard({
          finalImageSrc: `data:${trip.mimeType};base64,${trip.finalImage}`,
          summary: trip.summary,
          items: trip.items,
          location: trip.location,
        });
        setPostcardUrl(url);
      } catch (error) {
        console.error("Failed to generate postcard in gallery", error);
        // could set an error state here
      } finally {
        setIsLoading(false);
      }
    };
    createPostcard();
  }, [trip]);

  const handleDownload = () => {
    if (!postcardUrl) return;
    
    const sanitizedLocation = trip.location
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
        .substring(0, 50); // Avoid overly long filenames

    const link = document.createElement('a');
    link.href = postcardUrl;
    link.download = `memory-trip-${sanitizedLocation}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleShare = async () => {
    if (!postcardUrl || !canShare) return;
    setIsInteracting(true);
    try {
        const sanitizedLocation = trip.location
            .toLowerCase()
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
            .substring(0, 50); // Avoid overly long filenames

        const file = dataURLtoFile(postcardUrl, `memory-trip-${sanitizedLocation}.png`);
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: `My Memory Trip to ${trip.location}!`,
                text: 'Check out the wild trip I went on!',
                files: [file],
            });
        } else {
            handleDownload();
        }
    } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error("Failed to share postcard:", error);
        }
    } finally {
        setIsInteracting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70"
      onClick={onClose}
    >
      <div className="bg-brand-bg rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-brand-text-muted hover:text-brand-text z-10"
            aria-label="Close"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <Spinner />
                  <p className="mt-4 text-brand-text-muted">Creating your postcard...</p>
              </div>
          )}
          {!isLoading && postcardUrl && (
            <div className="flex flex-col items-center gap-6">
                <img src={postcardUrl} alt={`Postcard from ${trip.location}`} className="w-full max-w-2xl rounded-md shadow-lg" />
                <div className="flex flex-wrap justify-center gap-4">
                    {canShare && <Button onClick={handleShare} disabled={isInteracting} variant="secondary">{isInteracting ? 'Sharing...': 'Share'}</Button>}
                    <Button onClick={handleDownload} disabled={isInteracting} variant="secondary">Download</Button>
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryDetailModal;