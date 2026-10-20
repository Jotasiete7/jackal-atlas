// ==============================================================================
// JACKAL SANDBOX — CONTROLADOR DE CÂMERAS CARTOGRÁFICAS
// Topo (Norte p/ cima), Isométrica (passos 90° e livre), Perfil Lateral e Órbita Livre
// ==============================================================================

import * as THREE from 'three';
import { CameraMode, CardinalDirection } from '../core/types';
import { CONFIG } from '../config';

export class CameraController {
  public mode: CameraMode = 'top';
  public orthoCamera: THREE.OrthographicCamera;
  public perspectiveCamera: THREE.PerspectiveCamera;

  // Ponto pivô de rotação e foco (Reference Target)
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private targetGoal: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Ângulos orbitais esféricos
  private theta = 0; // Azimute horizontal (rad)
  private phi = Math.PI / 4; // Elevação vertical (rad)
  private distance = 400; // Distância do pivô (metros)
  private orthoFrustumSize = 500; // Tamanho do frustum da câmera ortográfica

  // Estado de controle de mouse / arrasto
  private isOrbiting = false;
  private isPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private domElement: HTMLElement;

  // Navegação contínua por Teclado (WASD / Setas)
  private keysDown: Set<string> = new Set();
  public keyboardNavigationEnabled = true;

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;
    const aspect = domElement.clientWidth / domElement.clientHeight || 1;

    // Câmera Ortográfica (para Topo, Isométrico e Perfil)
    const halfH = this.orthoFrustumSize / 2;
    const halfW = halfH * aspect;
    this.orthoCamera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, -25000, 50000);

    // Câmera Perspectiva (para Órbita Livre, com FOV parametrizável de 75°)
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      CONFIG.WURM_CLIENT_FOV_DEG,
      aspect,
      1,
      50000
    );

    this.setMode('top');
    this.bindEvents();
  }

  public getActiveCamera(): THREE.Camera {
    return this.mode === 'free' ? this.perspectiveCamera : this.orthoCamera;
  }

  public setMode(newMode: CameraMode): void {
    this.mode = newMode;

    switch (newMode) {
      case 'top':
        // Topo: Olhando diretamente de cima para baixo
        // Convenção: Norte é -Z em Three.js, então up = (0, 0, -1) faz o Norte apontar para o TOPO da tela!
        this.theta = 0;
        this.phi = 0.0001; // Quase 0 para olhar de cima
        this.orthoCamera.up.set(0, 0, -1);
        break;

      case 'isometric':
        // Isométrico clássico a ~45° de elevação
        this.phi = Math.PI / 4;
        this.orthoCamera.up.set(0, 1, 0);
        break;

      case 'side':
        // Perfil lateral horizontal
        this.phi = Math.PI / 2 - 0.001;
        this.orthoCamera.up.set(0, 1, 0);
        break;

      case 'free':
        // Câmera livre com perspectiva
        this.perspectiveCamera.up.set(0, 1, 0);
        if (this.phi < 0.1) this.phi = Math.PI / 4;
        break;
    }

    this.updateCameraTransform();
  }

  /**
   * Rotaciona em passos de 90° no modo isométrico ou lateral
   */
  public rotateStep(direction: CardinalDirection): void {
    let targetTheta = 0;
    switch (direction) {
      case 'N': targetTheta = 0; break;
      case 'L': targetTheta = Math.PI / 2; break;
      case 'S': targetTheta = Math.PI; break;
      case 'O': targetTheta = (3 * Math.PI) / 2; break;
    }
    this.theta = targetTheta;
    this.updateCameraTransform();
  }

  /**
   * Define o ponto de referência / pivô da câmera com transição suave
   */
  public setReferencePoint(worldX: number, worldY: number, worldZ: number, immediate = false): void {
    this.targetGoal.set(worldX, worldY, worldZ);
    if (immediate) {
      this.target.copy(this.targetGoal);
      this.updateCameraTransform();
    }
  }

  /**
   * Atualização contínua a cada frame (interpolação de foco e navegação WASD)
   */
  public update(): void {
    if (this.target.distanceTo(this.targetGoal) > 0.05) {
      this.target.lerp(this.targetGoal, 0.15);
      this.updateCameraTransform();
    }

    // Navegação Contínua por Teclado (WASD / Setas)
    if (this.keyboardNavigationEnabled && this.keysDown.size > 0) {
      let forward = 0;
      let right = 0;

      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) forward += 1;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) forward -= 1;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) right += 1;
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) right -= 1;

      if (forward !== 0 || right !== 0) {
        // Velocidade suave proporcional ao nível de zoom atual
        const speedFactor = this.mode === 'free'
          ? (this.distance / 400)
          : (this.orthoFrustumSize / 400);

        const moveDist = 6.0 * Math.max(0.2, speedFactor);
        this.panRelative(forward * moveDist, right * moveDist);
      }
    }
  }

  public panRelative(forwardDist: number, rightDist: number): void {
    if (this.mode === 'top') {
      this.target.x += rightDist;
      this.target.z -= forwardDist; // Norte é -Z em Three.js
    } else {
      const forward = new THREE.Vector3(-Math.sin(this.theta), 0, -Math.cos(this.theta));
      const right = new THREE.Vector3(Math.cos(this.theta), 0, -Math.sin(this.theta));
      this.target.addScaledVector(right, rightDist);
      this.target.addScaledVector(forward, forwardDist);
    }
    this.targetGoal.copy(this.target);
    this.updateCameraTransform();
  }

  /** Centraliza a câmera instantaneamente em uma coordenada de tile */
  public jumpToTile(tileX: number, tileY: number, elevation = 0): void {
    const worldX = tileX * CONFIG.TILE_METERS;
    const worldZ = -tileY * CONFIG.TILE_METERS;
    this.target.set(worldX, elevation, worldZ);
    this.targetGoal.set(worldX, elevation, worldZ);
    this.updateCameraTransform();
  }

  public updateCameraTransform(): void {
    if (this.mode === 'free') {
      const x = this.distance * Math.sin(this.phi) * Math.sin(this.theta);
      const y = this.distance * Math.cos(this.phi);
      const z = this.distance * Math.sin(this.phi) * Math.cos(this.theta);
      this.perspectiveCamera.position.set(this.target.x + x, this.target.y + y, this.target.z + z);
      this.perspectiveCamera.lookAt(this.target);
    } else {
      // Ajusta frustum ortográfico com base no aspecto
      const aspect = this.domElement.clientWidth / this.domElement.clientHeight || 1;
      const halfH = this.orthoFrustumSize / 2;
      const halfW = halfH * aspect;

      this.orthoCamera.left = -halfW;
      this.orthoCamera.right = halfW;
      this.orthoCamera.top = halfH;
      this.orthoCamera.bottom = -halfH;
      this.orthoCamera.updateProjectionMatrix();

      // Distância ampla em projeção ortográfica para nunca cortar o relevo pelo plano near
      const orthoDist = 8000;
      if (this.mode === 'top') {
        // Câmera no topo fixa diretamente acima do target
        this.orthoCamera.position.set(this.target.x, this.target.y + orthoDist, this.target.z);
        this.orthoCamera.lookAt(this.target.x, this.target.y, this.target.z);
      } else {
        const ox = orthoDist * Math.sin(this.phi) * Math.sin(this.theta);
        const oy = orthoDist * Math.cos(this.phi);
        const oz = orthoDist * Math.sin(this.phi) * Math.cos(this.theta);
        this.orthoCamera.position.set(this.target.x + ox, this.target.y + oy, this.target.z + oz);
        this.orthoCamera.lookAt(this.target);
      }
    }
  }

  public setFov(fovDeg: number): void {
    this.perspectiveCamera.fov = fovDeg;
    this.perspectiveCamera.updateProjectionMatrix();
  }

  public handleResize(): void {
    const aspect = this.domElement.clientWidth / this.domElement.clientHeight || 1;
    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();

    const halfH = this.orthoFrustumSize / 2;
    const halfW = halfH * aspect;
    this.orthoCamera.left = -halfW;
    this.orthoCamera.right = halfW;
    this.orthoCamera.top = halfH;
    this.orthoCamera.bottom = -halfH;
    this.orthoCamera.updateProjectionMatrix();
  }

  private bindEvents(): void {
    // Zoom via roda do mouse
    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;

      if (this.mode === 'free') {
        this.distance = Math.max(20, Math.min(10000, this.distance * zoomFactor));
      } else {
        this.orthoFrustumSize = Math.max(30, Math.min(15000, this.orthoFrustumSize * zoomFactor));
      }
      this.updateCameraTransform();
    }, { passive: false });

    // Início de arrasto
    this.domElement.addEventListener('mousedown', (e) => {
      // Botão direito (2) ou botão do meio (1) ou (botão esquerdo + alt/space)
      if (e.button === 2 || (e.button === 0 && (e.altKey || e.shiftKey))) {
        this.isOrbiting = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        e.preventDefault();
      } else if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        this.isPanning = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isOrbiting && !this.isPanning) return;

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (this.isOrbiting && this.mode !== 'top') {
        const rotSpeed = 0.006;
        this.theta -= deltaX * rotSpeed;
        this.phi = Math.max(0.05, Math.min(Math.PI / 2 - 0.01, this.phi - deltaY * rotSpeed));
        this.updateCameraTransform();
      } else if (this.isPanning) {
        // Pan proporcional ao nível de zoom atual
        const scale = this.mode === 'free'
          ? (this.distance / 800)
          : (this.orthoFrustumSize / this.domElement.clientHeight);

        const panX = -deltaX * scale;
        const panZ = -deltaY * scale;

        // Desloca o target
        if (this.mode === 'top') {
          this.target.x += panX;
          this.target.z -= panZ; // Norte é -Z
        } else {
          // Desloca em relação à orientação atual da câmera
          const forward = new THREE.Vector3(-Math.sin(this.theta), 0, -Math.cos(this.theta));
          const right = new THREE.Vector3(Math.cos(this.theta), 0, -Math.sin(this.theta));
          this.target.addScaledVector(right, panX);
          this.target.addScaledVector(forward, -panZ);
        }
        this.targetGoal.copy(this.target);
        this.updateCameraTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isOrbiting = false;
      this.isPanning = false;
    });

    // Desativa menu de contexto padrão no canvas para permitir órbita com botão direito
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Navegação WASD e Setas
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        this.keysDown.add(e.code);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keysDown.has(e.code)) {
        this.keysDown.delete(e.code);
      }
    });

    window.addEventListener('blur', () => {
      this.keysDown.clear();
    });
  }
}
