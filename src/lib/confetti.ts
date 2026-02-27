import confetti from 'canvas-confetti';

export function fireConfetti() {
  const end = Date.now() + 600;
  const colors = ['#c0c0c0', '#3ecf8e', '#888888', '#f0b429', '#ec4899'];
  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function firePerfectDay() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#c0c0c0', '#3ecf8e', '#f0b429', '#888888'],
  });
}

export function fireLevelUp() {
  confetti({
    particleCount: 60,
    spread: 80,
    origin: { y: 0.5 },
    colors: ['#c0c0c0', '#888888', '#fbbf24', '#34d399'],
    shapes: ['star', 'circle'],
    scalar: 1.2,
  });
}
