import { useState, useCallback, useRef, useEffect } from 'react';
import { ResolutionEvent, CharacterSheet } from '@daily-dungeon/shared';
import { FloatingTextItem, CombatTextType } from '../components/FloatingCombatText';

export type ImpactType = 'damage' | 'heal';

export function useCombatVisuals() {
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [impactEffects, setImpactEffects] = useState<Record<string, ImpactType>>({});

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const addFloatingText = useCallback((targetId: string, text: string, type: CombatTextType) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const offsetX = Math.floor(Math.random() * 32) - 16; // Random jitter between -16px and +16px

    const newItem: FloatingTextItem = {
      id,
      targetId,
      text,
      type,
      offsetX,
    };

    setFloatingTexts((prev) => [...prev, newItem]);

    // Auto-remove after animation completes (1200ms)
    const removeTimer = setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 1200);

    timersRef.current.push(removeTimer);
  }, []);

  const triggerImpact = useCallback((targetId: string, type: ImpactType) => {
    setImpactEffects((prev) => ({ ...prev, [targetId]: type }));

    // Reset impact effect after 350ms
    const timer = setTimeout(() => {
      setImpactEffects((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
    }, 350);

    timersRef.current.push(timer);
  }, []);

  const triggerEventVisual = useCallback(
    (event: ResolutionEvent, players: Record<string, CharacterSheet>) => {
      // 1. Damage Dealt
      if (typeof event.damageDealt === 'number' && event.damageDealt > 0) {
        if (event.targetId === 'ALL_PLAYERS') {
          // Party-wide AoE
          Object.values(players).forEach((p) => {
            if (p.currentHp > 0) {
              addFloatingText(p.id, `-${event.damageDealt}`, 'damage');
              triggerImpact(p.id, 'damage');
            }
          });
        } else {
          addFloatingText(event.targetId, `-${event.damageDealt}`, 'damage');
          triggerImpact(event.targetId, 'damage');
        }
      }

      // 2. Healing Done
      if (typeof event.healingDone === 'number' && event.healingDone > 0) {
        addFloatingText(event.targetId, `+${event.healingDone}`, 'heal');
        triggerImpact(event.targetId, 'heal');
      }

      // 3. Shield Gained
      if (typeof event.shieldGained === 'number' && event.shieldGained > 0) {
        addFloatingText(event.targetId, `+${event.shieldGained} 🛡️`, 'shield');
      }

      // 4. Dodged / Miss
      if (event.dodged) {
        addFloatingText(event.targetId, 'DODGED!', 'dodge');
      }
    },
    [addFloatingText, triggerImpact]
  );

  const getTextsForTarget = useCallback(
    (targetId: string) => {
      return floatingTexts.filter((t) => t.targetId === targetId);
    },
    [floatingTexts]
  );

  const clearAllVisuals = useCallback(() => {
    setFloatingTexts([]);
    setImpactEffects({});
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  return {
    floatingTexts,
    impactEffects,
    triggerEventVisual,
    getTextsForTarget,
    clearAllVisuals,
  };
}
