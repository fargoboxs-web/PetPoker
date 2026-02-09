'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface ImageUploaderProps {
  onImageSelect: (imageBase64: string) => void;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

async function fileToSquareJpegDataUrl(
  file: File,
  options?: { size?: number; quality?: number }
): Promise<string> {
  const size = options?.size ?? 1536;
  const quality = options?.quality ?? 0.9;

  // Decode
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // createImageBitmap may fail on some browsers; fall back to <img>.
  }

  if (!bitmap) {
    const dataUrl = await blobToDataUrl(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('解析图片失败'));
      el.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法处理图片（Canvas 不可用）');

    const s = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const sx = Math.floor(((img.naturalWidth || img.width) - s) / 2);
    const sy = Math.floor(((img.naturalHeight || img.height) - s) / 2);
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);

    const outBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('压缩图片失败'))),
        'image/jpeg',
        quality
      );
    });
    return await blobToDataUrl(outBlob);
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法处理图片（Canvas 不可用）');

  const s = Math.min(bitmap.width, bitmap.height);
  const sx = Math.floor((bitmap.width - s) / 2);
  const sy = Math.floor((bitmap.height - s) / 2);
  ctx.drawImage(bitmap, sx, sy, s, s, 0, 0, size, size);
  bitmap.close();

  const outBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('压缩图片失败'))),
      'image/jpeg',
      quality
    );
  });
  return await blobToDataUrl(outBlob);
}

export default function ImageUploader({ onImageSelect }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    (async () => {
      try {
        // Important: do NOT upload the raw 5-10MB file as base64.
        // Base64 inflates size (~33%) and may exceed Vercel's request body limit.
        const optimized = await fileToSquareJpegDataUrl(file, { size: 1536, quality: 0.9 });
        setPreview(optimized);
        onImageSelect(optimized);
      } finally {
        setIsProcessing(false);
      }
    })().catch(() => {
      setIsProcessing(false);
      setError('图片处理失败，请换一张照片或换个浏览器再试');
    });
  }, [onImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const handleReset = () => {
    setPreview(null);
    setError(null);
    setIsProcessing(false);
  };

  if (preview) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-64 h-64 rounded-2xl overflow-hidden border-4 border-amber-400 shadow-lg">
          <Image
            src={preview}
            alt="宠物预览"
            fill
            className="object-cover"
          />
        </div>
        <button
          onClick={handleReset}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          重新选择照片
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div
        {...getRootProps()}
        className={`
          w-full p-8 border-3 border-dashed rounded-2xl cursor-pointer
          transition-all duration-300 text-center
          ${isDragActive
            ? 'border-amber-500 bg-amber-50 scale-105'
            : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50/50'
          }
          ${isProcessing ? 'opacity-70 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="text-6xl">🐱🐶</div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isProcessing
                ? '正在处理图片...'
                : (isDragActive ? '松开鼠标上传' : '拖拽或点击上传宠物照片')
              }
            </p>
            <p className="mt-2 text-sm text-gray-500">
              建议上传头部特写，正方形效果最佳
            </p>
            <p className="text-xs text-gray-400 mt-1">
              支持 JPG、PNG、WebP，最大 10MB（上传前会在本地自动压缩优化）
            </p>
          </div>
        </div>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}
