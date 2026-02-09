'use client';

import { useState } from 'react';
import PokerCard from './PokerCard';

interface CardSelectorProps {
  cards: string[];
  onSelect: (selectedCard: string) => void;
}

export default function CardSelector({ cards, onSelect }: CardSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFlipped, setIsFlipped] = useState(cards.map(() => false));

  const handleCardClick = (index: number) => {
    // 先翻牌
    if (!isFlipped[index]) {
      const newFlipped = [...isFlipped];
      newFlipped[index] = true;
      setIsFlipped(newFlipped);
      return;
    }
    // 已翻开则选择
    setSelectedIndex(index);
  };

  const handleConfirm = () => {
    if (selectedIndex !== null) {
      onSelect(cards[selectedIndex]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          选择您喜欢的扑克牌
        </h2>
        <p className="text-gray-600">
          点击卡片翻开，选择最满意的一张
        </p>
      </div>

      <div className="flex gap-8">
        {cards.map((card, index) => (
          <div key={index} className="flex flex-col items-center">
            <span className="text-sm text-gray-600 mb-2">
              红桃 {['J', 'Q', 'K'][index]}
            </span>
            <PokerCard
              imageUrl={card}
              isFlipped={isFlipped[index]}
              isSelected={selectedIndex === index}
              onClick={() => handleCardClick(index)}
            />
          </div>
        ))}
      </div>

      {selectedIndex !== null && (
        <button
          onClick={handleConfirm}
          className="px-8 py-3 bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
        >
          确认选择
        </button>
      )}
    </div>
  );
}
