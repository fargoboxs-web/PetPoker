'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUploader from '@/components/ImageUploader';
import LoadingState from '@/components/LoadingState';
import CardSelector from '@/components/CardSelector';
import PokerCard from '@/components/PokerCard';

type AppState =
  | { step: 'upload' }
  | { step: 'generating'; petImage: string }
  | { step: 'select'; cards: [string, string] }
  | { step: 'result'; selectedCard: string };

export default function Home() {
  const [state, setState] = useState<AppState>({ step: 'upload' });
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = async (imageBase64: string) => {
    setState({ step: 'generating', petImage: imageBase64 });
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petImage: imageBase64 }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '生成失败，请重试');
      }

      setState({ step: 'select', cards: data.cards });
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试');
      setState({ step: 'upload' });
    }
  };

  const handleCardSelect = (selectedCard: string) => {
    setState({ step: 'result', selectedCard });
  };

  const handleDownload = () => {
    if (state.step !== 'result') return;

    const link = document.createElement('a');
    link.href = state.selectedCard;
    link.download = 'petpoker-king.png';
    link.click();
  };

  const handleReset = () => {
    setState({ step: 'upload' });
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-amber-50 to-yellow-50">
      {/* 头部 */}
      <header className="py-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent">
          新春宠物扑克牌
        </h1>
        <p className="mt-2 text-gray-600">
          上传宠物照片，AI 为您生成专属新春扑克牌
        </p>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* 上传状态 */}
          {state.step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center"
            >
              <ImageUploader onImageSelect={handleImageSelect} />
              {error && (
                <p className="mt-4 text-red-500 text-center">{error}</p>
              )}
            </motion.div>
          )}

          {/* 生成中状态 */}
          {state.step === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex justify-center"
            >
              <LoadingState />
            </motion.div>
          )}

          {/* 选择状态 */}
          {state.step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex justify-center"
            >
              <CardSelector
                cards={state.cards}
                onSelect={handleCardSelect}
              />
            </motion.div>
          )}

          {/* 结果状态 */}
          {state.step === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-8"
            >
              <h2 className="text-2xl font-bold text-gray-800">
                您的专属新春扑克牌
              </h2>

              <PokerCard
                imageUrl={state.selectedCard}
                isFlipped={true}
                size="large"
              />

              <div className="flex gap-4">
                <button
                  onClick={handleDownload}
                  className="px-8 py-3 bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  下载图片
                </button>
                <button
                  onClick={handleReset}
                  className="px-8 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-full hover:border-gray-400 transition-all"
                >
                  再来一张
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 底部装饰 */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-red-100/50 to-transparent pointer-events-none" />
    </div>
  );
}
