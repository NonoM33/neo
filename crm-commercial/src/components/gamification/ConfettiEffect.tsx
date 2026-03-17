import confetti from 'canvas-confetti';

type ConfettiPreset = 'celebration' | 'subtle' | 'gold';

export function fireConfetti(preset: ConfettiPreset = 'celebration') {
  switch (preset) {
    case 'celebration':
      // Big celebration burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7c3aed', '#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
      });
      // Second burst delayed
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#7c3aed', '#f59e0b', '#3b82f6'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#7c3aed', '#f59e0b', '#3b82f6'],
        });
      }, 200);
      break;

    case 'subtle':
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#7c3aed', '#f59e0b'],
        gravity: 1.2,
      });
      break;

    case 'gold':
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#d97706', '#b45309'],
        shapes: ['circle'],
      });
      break;
  }
}

export default fireConfetti;
