import React, { useState } from 'react';
import { Play, Shield, Sword, Dices, Loader2 } from 'lucide-react';
import { ClassType, CLASS_ABILITIES, CLASS_BASE_STATS } from '@daily-dungeon/shared';

interface CharacterSelectScreenProps {
  user: any;
  token: string;
  onCharacterCreated: (character: any) => void;
  onLogout: () => void;
}

export const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({
  user,
  token,
  onCharacterCreated,
  onLogout,
}) => {
  const [selectedClass, setSelectedClass] = useState<ClassType>('warrior');
  const [charName, setCharName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const classCards: { type: ClassType; label: string; desc: string }[] = [
    { type: 'warrior', label: 'Warrior', desc: 'High durability protector. Builds Rage on strikes and taking damage. Intercepts hits for allies.' },
    { type: 'rogue', label: 'Rogue', desc: 'Lightning fast (Speed 15). Builds Combo Points for vulnerable debuffs (+30% dmg) and smoke screens.' },
    { type: 'priest', label: 'Priest', desc: 'Tactical backline healer and shielder. Uses Mana to cast Flash Heal, Sanctuary shields, and speed smites.' },
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!charName.trim()) return;
    
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: charName.trim(), classType: selectedClass }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create character');
      }

      const newChar = await res.json();
      onCharacterCreated(newChar);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
      setIsLoading(false);
    }
  };

  const selectedClassLabel = selectedClass.charAt(0).toUpperCase() + selectedClass.slice(1);

  return (
    <div className="min-h-screen bg-dungeon-darkest text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-dungeon-card border border-dungeon-border rounded-2xl shadow-2xl p-6">
        
        {/* Header / User Greeting */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center mb-4 gap-2">
            <div className="inline-block px-3 py-1 rounded-full bg-amber-950/40 border border-amber-900/50 text-amber-500 text-xs font-bold uppercase tracking-widest">
              Welcome, {user?.displayName}
            </div>
            <button 
              onClick={onLogout}
              className="text-[11px] text-slate-400 hover:text-amber-400 transition-colors uppercase font-bold tracking-wider"
            >
              Sign Out
            </button>
          </div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">
            Create Your Hero
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Choose your path. Your class determines your role in the party and abilities in the crypt.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-lg bg-red-950/50 border border-red-900 text-red-400 text-sm text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-6">
          
          {/* Character Name */}
          <div>
            <label htmlFor="char-name" className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
              Character Name
            </label>
            <input
              id="char-name"
              type="text"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              placeholder="Enter hero name..."
              className="w-full bg-dungeon-darker border border-dungeon-border rounded-xl px-4 py-3 font-bold text-slate-100 focus:outline-none focus:border-amber-500"
              required
              maxLength={24}
            />
          </div>

          {/* Class Selection */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
              Select Class
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {classCards.map((c) => {
                const isSelected = selectedClass === c.type;
                const stats = CLASS_BASE_STATS[c.type];
                return (
                  <div
                    key={c.type}
                    onClick={() => setSelectedClass(c.type)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-500/50 shadow-lg scale-102'
                        : 'border-dungeon-border bg-dungeon-darker/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-lg text-slate-100">{c.label}</span>
                      <span className="text-[11px] font-mono text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                        Spd {stats.baseSpeed}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-snug mb-4">{c.desc}</p>

                    <div className="text-xs font-mono text-slate-300 border-t border-dungeon-border/60 pt-2 flex justify-between">
                      <span>HP: {stats.maxHp}</span>
                      <span className="capitalize">{stats.resourceType}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Class Abilities Preview */}
          <div className="bg-dungeon-darker/60 p-4 rounded-xl border border-dungeon-border">
            <div className="text-xs font-bold uppercase text-slate-400 mb-3">
              {selectedClassLabel} Abilities:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              {CLASS_ABILITIES[selectedClass].map((ab) => (
                <div key={ab.id} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="font-bold text-amber-300 truncate mb-1">{ab.name}</div>
                  <div className="text-[11px] text-slate-400 leading-tight">{ab.description}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-bold text-lg tracking-wide shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            Confirm Hero & Enter the Lobby
          </button>
        </form>

      </div>
    </div>
  );
};
