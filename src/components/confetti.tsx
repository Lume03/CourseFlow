'use client';

import { useState, useEffect } from 'react';

const Confetti = () => {
  const [pieces, setPieces] = useState<any[]>([]);

  useEffect(() => {
    const newPieces = Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 100,
      r: Math.random() * 360,
      s: Math.random() * 0.8 + 0.2, // scale
      d: Math.random() * 1000 + 500, // duration
      c: `hsl(${Math.random() * 360}, 70%, 60%)`, // color
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}vw`,
            top: `${p.y}vh`,
            width: '8px',
            height: '16px',
            backgroundColor: p.c,
            opacity: 0.9,
            transform: `rotate(${p.r}deg)`,
            animation: `fall ${p.d}ms linear forwards`,
            animationDelay: `${Math.random() * 500}ms`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(120vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Confetti;
