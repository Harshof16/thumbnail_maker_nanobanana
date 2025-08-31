"use client";

import { useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { Download, Copy, Share, Edit3, RotateCcw } from 'lucide-react';

type Thumbnail = {
  id: string;
  prompt: string;
  horizontal: string;
  vertical: string;
  square: string;
};

type Props = {
  thumbnails: Thumbnail[];
  onCustomize: (t: Thumbnail) => void;
  onRegenerate: () => void;
  loading?: boolean;
};

export default function ThumbnailGrid({ thumbnails, onCustomize, onRegenerate, loading = false }: Props) {
  const [selectedRatio, setSelectedRatio] = useState('horizontal');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string>('');
  const [modalPrompt, setModalPrompt] = useState<string>('');

  const ratios = {
    horizontal: { label: 'YouTube (16:9)', key: 'horizontal' },
    vertical: { label: 'Shorts (9:16)', key: 'vertical' },
    square: { label: 'Square (1:1)', key: 'square' }
  };

  const handleCopy = async (imageUrl: string, id: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
  console.error('Failed to copy', err);
    }
  };

  const handleDownload = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      await Promise.all(thumbnails.map(async (thumb, index) => {
        const key = selectedRatio as 'horizontal' | 'vertical' | 'square';
        const url = thumb[key];
        const res = await axios.get(url, { responseType: 'blob' });
        const blob = res.data as Blob;
        zip.file(`thumbnail_${index + 1}_${selectedRatio}.jpg`, blob);
      }));

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `thumbnails_${selectedRatio}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to create zip', err);
      const key = selectedRatio as 'horizontal' | 'vertical' | 'square';
      thumbnails.forEach((thumb, index) => {
        handleDownload(thumb[key], `thumbnail_${index + 1}_${selectedRatio}.jpg`);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Ratio Selector */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          {Object.entries(ratios).map(([key, ratio]) => (
            <button
              key={key}
              onClick={() => setSelectedRatio(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all
                ${selectedRatio === key
                  ? 'bg-red-600/90 hover:bg-red-700/95 text-white'
                  : 'bg-white/10 text-red-200 hover:bg-white/20'
                }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={onRegenerate}
            className="flex items-center cursor-pointer space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-red-200 transition-all"
          >
            <RotateCcw size={16} />
            <span>Regenerate</span>
          </button>
          <button
            onClick={downloadAll}
            className="flex items-center cursor-pointer space-x-2 px-4 py-2 bg-red-600/90 hover:bg-red-700/95 rounded-lg text-white transition-all"
          >
            <Download size={16} />
            <span>Download All</span>
          </button>
        </div>
      </div>

      {/* Thumbnails Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Render skeleton placeholders while loading
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`skeleton_${i}`} className="group">
              <div className="relative overflow-hidden rounded-xl bg-white/5 border border-red-300/20 backdrop-blur-sm">
                <div className="w-full h-48 skeleton" />
              </div>
              <div className="mt-3 p-3 bg-white/5 rounded-lg border border-red-300/20">
                <div className="h-3 w-3/4 skeleton mb-2" />
                <div className="h-3 w-full skeleton" />
              </div>
            </div>
          ))
        ) : (
          thumbnails.map((thumbnail, index) => (
    <div key={thumbnail.id} className="group card-sheen" onClick={() => {
            const key = selectedRatio as 'horizontal' | 'vertical' | 'square';
            setModalImage(thumbnail[key]);
            setModalPrompt(thumbnail.prompt);
            setModalOpen(true);
          }}>
            <div className="relative overflow-hidden rounded-xl bg-white/5 border border-red-300/20 backdrop-blur-sm">
              <div className="w-full relative h-48">
                <Image
                  src={thumbnail[selectedRatio as 'horizontal' | 'vertical' | 'square']}
                  alt={`Thumbnail ${index + 1}`}
                  fill
      className="object-cover img-zoom"
                  unoptimized
                />
              </div>
              
              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(thumbnail[selectedRatio as 'horizontal' | 'vertical' | 'square'], `thumbnail_${index + 1}.jpg`); }}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm"
                    title="Download"
                  >
                    <Download size={20} className="text-white" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopy(thumbnail[selectedRatio as 'horizontal' | 'vertical' | 'square'], thumbnail.id); }}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm"
                    title="Copy Link"
                  >
                    <Copy size={20} className={copiedId === thumbnail.id ? 'text-green-400' : 'text-white'} />
                  </button>
                  {/* Customize removed: clicking a card opens the preview modal */}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.share?.({ url: thumbnail[selectedRatio as 'horizontal' | 'vertical' | 'square'] }); }}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm"
                    title="Share"
                  >
                    <Share size={20} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Thumbnail Info */}
            <div className="mt-3 p-3 bg-white/5 rounded-lg border border-red-300/20">
              <p className="text-xs text-red-300 mb-1">{ratios[selectedRatio as 'horizontal' | 'vertical' | 'square'].label} prompt</p>
              <p className="text-sm text-red-200 line-clamp-3">
                {thumbnail.prompt} — {ratios[selectedRatio as 'horizontal' | 'vertical' | 'square'].label}
              </p>
            </div>
          </div>
        ))) }
      </div>
      {/* Modal for large preview */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto flex items-start justify-center pt-10 pb-10 bg-black/90 overlay-animate" onClick={() => setModalOpen(false)}>
          <div className="bg-neutral-900/95 rounded-lg p-4 max-w-3xl w-full mx-4 shadow-xl border border-red-700/30 modal-pop overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full h-[60vh]">
              <Image src={modalImage} alt="Preview" fill className="object-contain" unoptimized />
            </div>
            <div className="mt-3 p-3 bg-white/5 rounded-lg border border-red-300/20">
              <p className="text-sm text-red-200 whitespace-pre-wrap">{modalPrompt}</p>
              <div className="mt-3 flex justify-end">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-red-500 text-white rounded-lg btn-focus">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}