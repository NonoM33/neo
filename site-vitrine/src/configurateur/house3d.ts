// Scène 3D « maison de poupée » low-poly pour le configurateur.
// Plateau + pièces cliquables (tuiles arrondies + murs en L semi-transparents),
// hotspot lumineux par pièce, pastille de quantité live, survol qui soulève la
// pièce, auto-rotation au repos. Tout est procédural : aucun asset .glb requis.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { boardSize, roomGridPositions } from './layout';
import { makeBadgeSprite, makeLabelSprite, type BadgeSprite } from './sprites';

export interface Room3DConfig {
  key: string;
  label: string;
  accent: string;
}

export interface House3DOptions {
  rooms: Room3DConfig[];
  onRoomClick: (key: string) => void;
  onRoomHover?: (key: string | null) => void;
}

interface RoomObject {
  key: string;
  accent: string;
  accentColor: THREE.Color;
  group: THREE.Group;
  tile: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  wallMat: THREE.MeshStandardMaterial;
  hotspot: THREE.Group;
  badge: BadgeSprite;
  baseHotspotY: number;
  lift: number;
  count: number;
  pop: number;
}

const TILE_W = 1.7;
const TILE_D = 1.9;
const CLICK_TOLERANCE = 7;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class House3D {
  private readonly container: HTMLElement;
  private readonly opts: House3DOptions;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly rooms: RoomObject[] = [];
  private readonly tiles: THREE.Object3D[] = [];
  private readonly resizeObserver: ResizeObserver;

  private hoverKey: string | null = null;
  private pointerDown: { x: number; y: number } | null = null;
  private picking = true;
  private rafId = 0;
  private active = false;
  private clock = new THREE.Clock();
  private disposed = false;

  constructor(container: HTMLElement, opts: House3DOptions) {
    this.container = container;
    this.opts = opts;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0.5, 8.2, 9.5);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 17;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = 1.32;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.55;
    this.controls.target.set(0, 0.4, 0);
    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false;
    });

    this.scene.fog = new THREE.Fog(0x0b0d12, 16, 30);
    this.buildLights();
    this.buildBoard(opts.rooms.length);
    this.buildRooms(opts.rooms);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointerleave', this.onPointerLeave);
  }

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xb9d2ff, 0x0a0c10, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(6, 11, 5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x6ea8fe, 0.6);
    rim.position.set(-7, 5, -6);
    this.scene.add(rim);
  }

  private buildBoard(roomCount: number): void {
    const { width, depth } = boardSize(roomCount, 2.15, 2.35, 4, 1.2);
    const geo = new RoundedBoxGeometry(width, 0.4, depth, 4, 0.28);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0e1117, roughness: 0.9, metalness: 0.05 });
    const board = new THREE.Mesh(geo, mat);
    board.position.y = -0.22;
    this.scene.add(board);

    const grid = new THREE.GridHelper(Math.max(width, depth), 14, 0x2b3656, 0x18202f);
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.35;
    grid.position.y = 0.002;
    this.scene.add(grid);
  }

  private buildRooms(configs: Room3DConfig[]): void {
    const cells = roomGridPositions(configs.length, 2.15, 2.35, 4);
    configs.forEach((cfg, i) => {
      const cell = cells[i];
      const accentColor = new THREE.Color(cfg.accent);
      const group = new THREE.Group();
      group.position.set(cell.x, 0, cell.z);

      const tileMat = new THREE.MeshStandardMaterial({
        color: 0x161b25,
        roughness: 0.55,
        metalness: 0.15,
        emissive: accentColor,
        emissiveIntensity: 0.06,
      });
      const tile = new THREE.Mesh(new RoundedBoxGeometry(TILE_W, 0.22, TILE_D, 3, 0.12), tileMat);
      tile.position.y = 0.11;
      tile.userData.roomKey = cfg.key;
      group.add(tile);
      this.tiles.push(tile);

      const wallMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.22,
        roughness: 0.4,
        emissive: accentColor,
        emissiveIntensity: 0.18,
      });
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(TILE_W, 0.62, 0.06), wallMat);
      backWall.position.set(0, 0.43, -TILE_D / 2 + 0.03);
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, TILE_D), wallMat);
      leftWall.position.set(-TILE_W / 2 + 0.03, 0.43, 0);
      group.add(backWall, leftWall);

      const hotspot = this.buildHotspot(accentColor);
      hotspot.position.set(0, 0.95, 0);
      group.add(hotspot);

      const label = makeLabelSprite(cfg.label, '#e4ebff');
      label.position.set(0, 0.16, TILE_D / 2 + 0.28);
      group.add(label);

      const badge = makeBadgeSprite();
      badge.sprite.position.set(0.52, 1.32, 0);
      group.add(badge.sprite);

      this.scene.add(group);
      this.rooms.push({
        key: cfg.key,
        accent: cfg.accent,
        accentColor,
        group,
        tile,
        wallMat,
        hotspot,
        badge,
        baseHotspotY: 0.95,
        lift: 0,
        count: 0,
        pop: 0,
      });
    });
  }

  private buildHotspot(accent: THREE.Color): THREE.Group {
    const g = new THREE.Group();
    const ringMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.85 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 12, 32), ringMat);
    ring.rotation.x = Math.PI / 2;
    const pinMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6 });
    const pin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 18), pinMat);
    pin.position.y = 0.32;
    pin.rotation.x = Math.PI;
    g.add(ring, pin);
    return g;
  }

  // ── Pointer / picking ──
  private setPointer(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pick(): string | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.tiles, false);
    if (!hits.length) return null;
    const key = hits[0].object.userData.roomKey;
    return typeof key === 'string' ? key : null;
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDown = { x: e.clientX, y: e.clientY };
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.picking) return;
    this.setPointer(e);
    const key = this.pick();
    if (key !== this.hoverKey) {
      this.hoverKey = key;
      this.renderer.domElement.style.cursor = key ? 'pointer' : 'grab';
      if (this.opts.onRoomHover) this.opts.onRoomHover(key);
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down || !this.picking) return; // overlay ouvert/cooldown → on ignore
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved > CLICK_TOLERANCE) return; // c'était un drag d'orbite
    this.setPointer(e);
    const key = this.pick();
    if (key) this.opts.onRoomClick(key);
  };

  private onPointerLeave = (): void => {
    this.hoverKey = null;
    if (this.opts.onRoomHover) this.opts.onRoomHover(null);
  };

  // ── API publique ──
  setRoomCount(key: string, count: number): void {
    const room = this.rooms.find((r) => r.key === key);
    if (!room) return;
    if (count > room.count) room.pop = 1;
    room.count = count;
    room.badge.set(count, room.accent);
  }

  /** Active/désactive le picking des pièces (coupé quand l'overlay est ouvert). */
  setPicking(enabled: boolean): void {
    this.picking = enabled;
    if (!enabled) {
      this.hoverKey = null;
      this.renderer.domElement.style.cursor = 'grab';
    }
  }

  setActive(active: boolean): void {
    if (active === this.active) return;
    this.active = active;
    if (active) {
      this.resize();
      this.clock.getDelta();
      this.loop();
    } else if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  resize(): void {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = (): void => {
    if (!this.active || this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;

    this.rooms.forEach((room) => {
      const hovered = room.key === this.hoverKey;
      const targetLift = hovered ? 0.14 : 0;
      room.lift = lerp(room.lift, targetLift, 0.15);
      room.group.position.y = room.lift;

      const targetEmissive = hovered ? 0.3 : room.count > 0 ? 0.2 : 0.06;
      const m = room.tile.material;
      m.emissiveIntensity = lerp(m.emissiveIntensity, targetEmissive, 0.15);
      room.wallMat.opacity = lerp(room.wallMat.opacity, hovered || room.count > 0 ? 0.38 : 0.2, 0.15);

      // hotspot : flottement + pop quand on ajoute un équipement
      room.pop *= 0.9;
      const bob = Math.sin(t * 1.6 + room.group.position.x) * 0.05;
      room.hotspot.position.y = room.baseHotspotY + bob;
      room.hotspot.rotation.y += dt * 0.8;
      const scale = 1 + room.pop * 0.4 + (hovered ? 0.12 : 0);
      room.hotspot.scale.setScalar(scale);
      room.badge.sprite.scale.setScalar(0.55 * (1 + room.pop * 0.5));
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.active = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    this.controls.dispose();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
      else if (mat) mat.dispose();
    });
    this.renderer.dispose();
    if (el.parentElement === this.container) this.container.removeChild(el);
  }
}
