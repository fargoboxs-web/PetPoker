'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface ImageUploaderProps {
  onImageSelect: (imageBase64: string) => void;
}

export default function ImageUploader({ onImageSelect }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onImageSelect(base64);
    };
    reader.readAsDataURL(file);
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
    <div
      {...getRootProps()}
      className={`
        w-full max-w-md p-8 border-3 border-dashed rounded-2xl cursor-pointer
        transition-all duration-300 text-center
        ${isDragActive
          ? 'border-amber-500 bg-amber-50 scale-105'
          : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50/50'
        }
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl">🐱🐶</div>
        <div>
          <p className="text-lg font-medium text-gray-700">
            {isDragActive ? '松开鼠标上传' : '拖拽或点击上传宠物照片'}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            建议上传头部特写，正方形效果最佳
          </p>
          <p className="text-xs text-gray-400 mt-1">
            支持 JPG、PNG、WebP，最大 10MB
          </p>
        </div>
      </div>
    </div>
  );
}
