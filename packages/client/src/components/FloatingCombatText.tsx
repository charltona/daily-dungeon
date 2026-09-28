import React from 'react';

export type CombatTextType = 'damage' | 'heal' | 'shield' | 'dodge';

export interface FloatingTextItem {
  id: string;
  targetId: string;
  text: string;
  type: CombatTextType;
  offsetX: number;
}

interface FloatingCombatTextProps {
  items: FloatingTextItem[];
  className?: string;
  position?: 'center' | 'top';
}

export const FloatingCombatText: React.FC<FloatingCombatTextProps> = ({
  items,
  className = '',
  position = 'center',
}) => {
  if (!items || items.length === 0) return null;

  const topOffset = position === 'top' ? '20%' : '35%';

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-30 overflow-visible select-none ${className}`}
      aria-hidden="true"
    >
      {items.map((item) => {
        let styleClasses = 'text-red-400 drop-shadow-[0_4px_12px_rgba(239,68,68,0.9)]';
        let textSize = 'text-xl font-black';

        if (item.type === 'heal') {
          styleClasses = 'text-emerald-400 drop-shadow-[0_4px_12px_rgba(16,185,129,0.9)]';
          textSize = 'text-xl font-black';
        } else if (item.type === 'shield') {
          styleClasses = 'text-cyan-300 drop-shadow-[0_2px_8px_rgba(6,182,212,0.9)]';
          textSize = 'text-sm font-extrabold';
        } else if (item.type === 'dodge') {
          styleClasses = 'text-amber-300 drop-shadow-[0_2px_8px_rgba(245,158,11,0.9)] italic';
          textSize = 'text-sm font-black';
        }

        return (
          <div
            key={item.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `calc(50% + ${item.offsetX}px)`,
              top: topOffset,
            }}
          >
            <div
              className={`animate-float-combat combat-text-stroke font-mono whitespace-nowrap tracking-wider flex items-center gap-0.5 ${styleClasses} ${textSize}`}
            >
              {item.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};
