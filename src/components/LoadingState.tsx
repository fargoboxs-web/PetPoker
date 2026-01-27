'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const loadingMessages = [
  '正在分析宠物特征...',
  '为您的宠物挑选龙袍...',
  '绘制新春扑克牌...',
  '添加金色装饰...',
  '即将完成...',
];

export default function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* 动画卡片 */}
      <motion.div
        className="w-48 h-64 bg-gradient-to-br from-red-700 to-red-900 rounded-xl shadow-2xl flex items-center justify-center"
        animate={{
          rotateY: [0, 360],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="text-6xl">🎴</div>
      </motion.div>

      {/* 进度文字 */}
      <motion.div
        key={messageIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-center"
      >
        <p className="text-xl font-medium text-gray-700">
          {loadingMessages[messageIndex]}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          AI 正在创作您的专属扑克牌，请稍候...
        </p>
      </motion.div>

      {/* 进度条 */}
      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-400 to-red-500"
          animate={{ width: ['0%', '100%'] }}
          transition={{
            duration: 15,
            ease: 'linear',
          }}
        />
      </div>
    </div>
  );
}
