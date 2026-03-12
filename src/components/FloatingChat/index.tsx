interface Props {
  onClick: () => void;
}

export function FloatingChat({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-full shadow-2xl shadow-indigo-900/60 flex items-center justify-center text-2xl transition-all hover:scale-110"
      title="Preguntar al asistente"
    >
      🤖
    </button>
  );
}
