import { useState, useRef } from 'react';
import type { Flashcard, FlashcardProgress, BoxLevel } from '../../types/flashcard';

interface Props {
  allCards: Flashcard[];
  fcProgress: FlashcardProgress;
  onUpdate: (cardId: string, box: BoxLevel) => Promise<void>;
  onBack: () => void;
  title: string;
}

export function FlashcardDeck({ allCards, fcProgress, onUpdate, onBack, title }: Props) {
  const unmastered = allCards.filter((c) => (fcProgress[c.id] || 0) < 3);
  const deckRef = useRef<Flashcard[]>(unmastered.length > 0 ? unmastered : [...allCards]);
  const deck = deckRef.current;

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [justRated, setJustRated] = useState<BoxLevel | null>(null);

  if (!deck.length)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Sin tarjetas</p>
          <button onClick={onBack} className="px-6 py-3 bg-indigo-600 rounded-xl text-white">← Volver</button>
        </div>
      </div>
    );

  const card = deck[idx];
  const newC = allCards.filter((c) => !fcProgress[c.id]).length;
  const learning = allCards.filter((c) => fcProgress[c.id] === 1 || fcProgress[c.id] === 2).length;
  const mastered = allCards.filter((c) => (fcProgress[c.id] || 0) >= 3).length;

  const rate = async (box: BoxLevel) => {
    setJustRated(box);
    await onUpdate(card.id, box);
    setTimeout(() => {
      setJustRated(null);
      if (idx >= deck.length - 1) setDone(true);
      else { setIdx((i) => i + 1); setFlipped(false); }
    }, 280);
  };

  const btns: Array<{ box: BoxLevel; label: string; icon: string; cls: string }> = [
    { box: 1, label: 'Otra vez', icon: '🔴', cls: 'bg-red-700/40 hover:bg-red-600/60 border-red-500/40 text-red-300' },
    { box: 2, label: 'Bien', icon: '🟡', cls: 'bg-yellow-700/40 hover:bg-yellow-600/60 border-yellow-500/40 text-yellow-300' },
    { box: 3 as BoxLevel, label: '¡Domino!', icon: '⭐', cls: 'bg-green-700/40 hover:bg-green-600/60 border-green-500/40 text-green-300' },
  ];

  if (done)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Sesión completa!</h2>
          <div className="grid grid-cols-3 gap-3 my-6">
            {[['🆕', 'Nuevas', newC], ['📚', 'Aprend.', learning], ['⭐', 'Dominadas', mastered]].map(([ic, lb, n]) => (
              <div key={String(lb)} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                <div className="text-2xl mb-1">{ic}</div>
                <div className="text-white font-bold text-lg">{n}</div>
                <div className="text-gray-500 text-xs">{lb}</div>
              </div>
            ))}
          </div>
          <button onClick={onBack} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold">← Volver</button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg text-xl leading-none">←</button>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Flashcards · {title}</p>
            <div className="h-1.5 bg-gray-800 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all" style={{ width: `${(idx / deck.length) * 100}%` }} />
            </div>
          </div>
          <span className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-1 rounded-lg">{idx + 1}/{deck.length}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 pt-4">
        <div className="flex gap-2">
          {[['🆕', newC, 'text-blue-400', 'bg-blue-900/30'], ['📚', learning, 'text-yellow-400', 'bg-yellow-900/20'], ['⭐', mastered, 'text-green-400', 'bg-green-900/20']].map(([ic, n, tc, bg]) => (
            <div key={String(ic)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${bg} text-xs font-semibold ${tc}`}>{ic} {n}</div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-lg">
          <div className="flex justify-center mb-4">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${card.type === 'quiz' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-purple-900/40 text-purple-300'}`}>
              {card.type === 'quiz' ? '❓ Pregunta' : '💡 Concepto'}
            </span>
          </div>

          <div style={{ perspective: '1000px', cursor: flipped ? 'default' : 'pointer' }} onClick={() => !flipped && setFlipped(true)}>
            <div className="min-h-[200px] sm:min-h-[260px]" style={{ position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)' }}>
              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }} className="bg-gray-900 border-2 border-gray-700 rounded-2xl p-8 flex flex-col items-center justify-center">
                <p className="text-white text-base font-semibold text-center leading-relaxed">{card.front}</p>
                <p className="text-gray-600 text-xs mt-6">👆 Toca para ver respuesta</p>
              </div>
              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                className={`rounded-2xl border-2 p-8 flex flex-col items-center justify-center ${justRated === 1 ? 'bg-red-900/30 border-red-500/40' : justRated === 2 ? 'bg-yellow-900/30 border-yellow-500/40' : justRated === 3 ? 'bg-green-900/30 border-green-500/40' : 'bg-indigo-900/20 border-indigo-500/30'}`}>
                <p className="text-white text-sm text-center whitespace-pre-line leading-relaxed">{card.back}</p>
              </div>
            </div>
          </div>

          {flipped && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
              {btns.map((b) => (
                <button key={b.box} onClick={() => rate(b.box)} className={`py-3 rounded-xl border text-sm font-bold transition-all active:scale-95 ${b.cls}`}>
                  {b.icon}<br /><span className="text-xs font-normal">{b.label}</span>
                </button>
              ))}
            </div>
          )}
          {!flipped && <p className="text-center text-gray-700 text-xs mt-5">Califica después de ver la respuesta</p>}
        </div>
      </div>
    </div>
  );
}
