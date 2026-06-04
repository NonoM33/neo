// Sprites texte/badge rendus via canvas 2D → THREE.Sprite (billboard).
// Évite tout chargement de police 3D : on dessine dans un canvas et on en
// fait une texture. Utilisé pour les libellés de pièce et le compteur de qté.
import * as THREE from 'three';

const DPR = 2;

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context indisponible');
  return { canvas, ctx };
}

function spriteFromCanvas(canvas: HTMLCanvasElement): { sprite: THREE.Sprite; texture: THREE.CanvasTexture } {
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 10;
  return { sprite, texture };
}

/** Libellé texte (nom de pièce) qui fait toujours face à la caméra. */
export function makeLabelSprite(text: string, color: string): THREE.Sprite {
  const w = 320 * DPR;
  const h = 80 * DPR;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.scale(DPR, DPR);
  ctx.font = '600 30px Geist, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = color;
  ctx.fillText(text, 160, 40);
  const { sprite } = spriteFromCanvas(canvas);
  sprite.scale.set(2.0, 0.5, 1);
  return sprite;
}

export interface BadgeSprite {
  sprite: THREE.Sprite;
  set: (count: number, color: string) => void;
}

/** Pastille de compteur (nombre d'équipements posés dans la pièce). */
export function makeBadgeSprite(): BadgeSprite {
  const size = 128;
  const { canvas, ctx } = makeCanvas(size, size);
  const { sprite, texture } = spriteFromCanvas(canvas);
  sprite.renderOrder = 20;
  sprite.scale.set(0.55, 0.55, 1);

  function set(count: number, color: string): void {
    ctx.clearRect(0, 0, size, size);
    if (count > 0) {
      const r = size / 2 - 8;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(11,13,18,0.92)';
      ctx.stroke();
      ctx.fillStyle = '#0b0d12';
      ctx.font = `800 ${count > 9 ? 54 : 66}px Geist, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(count), size / 2, size / 2 + 4);
    }
    texture.needsUpdate = true;
    sprite.visible = count > 0;
  }

  set(0, '#6ea8fe');
  return { sprite, set };
}
