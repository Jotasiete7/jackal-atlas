// ==============================================================================
// JACKAL SANDBOX — PIPELINE DE CENA THREE.JS
// Iluminação de hillshade cartográfico, renderizador WebGL e loop de alta performance
// ==============================================================================

import * as THREE from 'three';

export class SceneManager {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public terrainGroup: THREE.Group;
  public overlayGroup: THREE.Group;
  public pinsGroup: THREE.Group;

  private canvas: HTMLCanvasElement;
  private fps = 60;
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private onFpsUpdate?: (fps: number) => void;
  private currentVerticalExaggeration = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121417); // Fundo escuro cartográfico suave

    // Grupos organizados na cena
    this.terrainGroup = new THREE.Group();
    this.terrainGroup.name = 'TerrainGroup';
    this.scene.add(this.terrainGroup);

    // OverlayGroup e PinsGroup mantêm escala Y = 1.0 para não deformar ícones/textos nem o cursor!
    this.overlayGroup = new THREE.Group();
    this.overlayGroup.name = 'OverlayGroup';
    this.scene.add(this.overlayGroup);

    this.pinsGroup = new THREE.Group();
    this.pinsGroup.name = 'PinsGroup';
    this.scene.add(this.pinsGroup);

    // Renderizador WebGL otimizado para notebooks (≥ 30 FPS meta)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // Essencial para exportação de PNG
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // Iluminação: Hillshade cartográfico calibrado (Azimute NW 315°, Elevação 45°)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff8ee, 1.25);
    // NW (Noroeste): X negativo, Z positivo (lembrando que Norte = -Z)
    this.sunLight.position.set(-800, 1000, 800);
    this.scene.add(this.sunLight);

    // Luz de preenchimento suave do quadrante oposto
    const fillLight = new THREE.DirectionalLight(0xb0c4de, 0.35);
    fillLight.position.set(800, 400, -800);
    this.scene.add(fillLight);

    window.addEventListener('resize', this.onResize);
  }

  public setOnFpsUpdate(cb: (fps: number) => void): void {
    this.onFpsUpdate = cb;
  }

  public updateFps(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
      if (this.onFpsUpdate) {
        this.onFpsUpdate(this.fps);
      }
    }
  }

  public getFps(): number {
    return this.fps;
  }

  public getVerticalExaggeration(): number {
    return this.currentVerticalExaggeration;
  }

  public setVerticalExaggeration(factor: number): void {
    // Afeta APENAS a geometria do terreno. Overlay e Pinos não são distorcidos!
    const clamped = Math.max(1.0, Math.min(5.0, factor));
    this.currentVerticalExaggeration = clamped;
    this.terrainGroup.scale.set(1.0, clamped, 1.0);
  }

  public onResize = (): void => {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.renderer.setSize(width, height, false);
    }
  };

  public render(camera: THREE.Camera): void {
    this.updateFps();
    this.renderer.render(this.scene, camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
