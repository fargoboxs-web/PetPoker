'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface PokerCardProps {
  imageUrl: string;
  isFlipped: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'normal' | 'large';
}

export default function PokerCard({
  imageUrl,
  isFlipped,
  isSelected = false,
  onClick,
  size = 'normal'
}: PokerCardProps) {
  const dimensions = size === 'large'
    ? { width: 300, height: 420 }
    : { width: 200, height: 280 };

  return (
    <div
      className={`perspective-1000 cursor-pointer ${onClick ? 'hover:scale-105 transition-transform' : ''}`}
      style={{ width: dimensions.width, height: dimensions.height }}
      onClick={onClick}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 0 : 180 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        {/* 正面 - 生成的扑克牌 */}
        <div
          className={`
            absolute inset-0 rounded-xl overflow-hidden shadow-2xl
            ${isSelected ? 'ring-4 ring-amber-400 ring-offset-2' : ''}
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <Image
            src={imageUrl}
            alt="生成的扑克牌"
            fill
            className="object-cover"
          />
        </div>

        {/* 背面 - 扑克牌花纹 */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-red-700 to-red-900"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-4/5 h-4/5 border-4 border-amber-400 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">🎴</div>
                <div className="text-amber-400 font-bold text-lg">PetPoker</div>
                <div className="text-amber-300 text-sm">新春特别版</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
