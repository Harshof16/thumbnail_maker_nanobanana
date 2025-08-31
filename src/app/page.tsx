"use client";

import { useState } from "react";
import axios from 'axios';
import { toast } from 'react-toastify';
import FileUpload from "@/components/fileUpload";
import Questionnaire from "@/components/questionnaire";
import ThumbnailGrid from "@/components/thumbnailGrid";

export default function Home() {
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  type Responses = {
    videoType?: string;
    style?: string;
    mood?: string;
    audience?: string;
    context?: string;
    placement?: string;
    [key: string]: string | undefined;
  };

  type Thumbnail = {
    id: string;
    prompt: string;
    horizontal: string;
    vertical: string;
    square: string;
  };

  const [responses, setResponses] = useState<Responses>({});
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (url: string | null, file: File | null) => {
    setUploadedUrl(url);
    setUploadedFile(file);
  };


  const handleGenerate = async (userResponses?: Responses, placement?: string) => {
    // If called from Questionnaire's Generate button, it will pass responses + placement
    const payload = {
      userResponses: userResponses || responses,
      imageUrl: uploadedUrl,
      placement: placement || responses.placement || 'center'
    };

    if (!uploadedFile) {
      toast.error('Please upload a photo first');
      return;
    }
    setLoading(true);

    try {
      const form = new FormData();
      form.append('image', uploadedFile);
      form.append('payload', JSON.stringify(payload));

      const res = await axios.post('/api/generatethumbnails', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data;
      setThumbnails(data.thumbnails || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate thumbnails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans min-h-screen p-8 pb-20 bg-black text-white">
      <section className="max-w-6xl mx-auto mb-8">
        <div className="bg-gradient-to-b from-black/60 via-neutral-900/40 to-black/60 rounded-xl p-8 border border-red-900/20 backdrop-blur">
          <div className="md:flex md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Make Click-worthy YouTube Thumbnails — Fast.</h1>
              <p className="mt-2 text-red-200/80 max-w-2xl">Upload a photo, answer a few quick questions, and generate polished thumbnails for horizontal, vertical and square formats — powered by AI.</p>
              <div className="mt-4">
                <a href="#generate" className="inline-block px-5 py-3 bg-red-600 hover:bg-red-700 rounded text-white font-semibold">Generate Thumbnails</a>
                <a href="#how" className="ml-4 text-sm text-red-300/80 hover:text-red-100">How it works</a>
              </div>
            </div>
            <div className="mt-6 md:mt-0">
              <div className="w-64 h-36 rounded-lg bg-gradient-to-tr from-red-700 to-pink-500 shadow-lg flex items-center justify-center text-white font-medium">Sample Thumbnails</div>
            </div>
          </div>
          {/* <div id="features" className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-white/3 rounded">Fast multi-ratio generation</div>
            <div className="p-4 bg-white/3 rounded">Prompt rewrite for better results</div>
            <div className="p-4 bg-white/3 rounded">Zip download & preview modal</div>
          </div> */}
        </div>
      </section>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <FileUpload onImageUpload={handleImageUpload} uploadedImage={uploadedUrl} />
          <div className="p-4 text-sm text-gray-300">
            Uploaded image: {uploadedUrl ? 'Ready' : 'No image'}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Questionnaire onComplete={(resp: Responses, placement?: string) => { setResponses(resp); handleGenerate(resp, placement); }} responses={responses} setResponses={setResponses} loading={loading} />

          <div>
            <ThumbnailGrid
              thumbnails={thumbnails}
              onCustomize={(t: Thumbnail) => toast.info('Customize: ' + t.id)}
              onRegenerate={() => handleGenerate()}
              loading={loading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
