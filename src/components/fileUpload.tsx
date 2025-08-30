import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';

type Props = {
  onImageUpload: (url: string | null, file: File | null) => void;
  uploadedImage?: string | null;
};

export default function FileUpload({ onImageUpload, uploadedImage }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      onImageUpload(url, file);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${dragActive ? 'border-red-400 bg-red-500/10' : 'border-red-300/30 bg-red-500/5 hover:bg-red-500/10'}`}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {uploadedImage ? (
          <div className="relative">
            <div className="mx-auto rounded-lg relative w-full h-64 sm:h-80 md:h-96 overflow-hidden">
              <Image src={uploadedImage || ''} alt="Uploaded" fill className="object-contain rounded-lg" unoptimized />
            </div>
            <button
              onClick={() => onImageUpload(null, null)}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 z-20"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto mb-4 text-red-400" size={48} />
            <p className="text-lg font-medium text-white mb-2">Upload Your Photo</p>
            <p className="text-red-200 mb-4">Drag and drop or click to select</p>
          </>
        )}

        {/* file input overlay (works for both states). z-10 sits under the X button (z-20) */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
      </div>
    </div>
  );
}