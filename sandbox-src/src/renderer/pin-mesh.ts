import * as THREE from 'three';
import { CONFIG } from '../config';
import { MapPin } from '../core/types';
import { PinManager } from '../core/pins';
import { HeightfieldManager } from '../core/heightfield';
import { modeloPilar } from '../wurm/models';

export class PinMeshManager {
  private parentGroup: THREE.Group;
  private pinManager: PinManager;
  private heightfield: HeightfieldManager;
  private pinObjects: Map<string, THREE.Group> = new Map();
  public isVisible = true;
  private currentExaggeration = 1.0;

  private onPinSelectCallback?: (pin: MapPin) => void;

  constructor(parentGroup: THREE.Group, pinManager: PinManager, heightfield: HeightfieldManager) {
    this.parentGroup = parentGroup;
    this.pinManager = pinManager;
    this.heightfield = heightfield;

    this.pinManager.subscribe(() => {
      this.rebuildPins();
    });

    this.rebuildPins();
  }

  public setOnPinSelect(cb: (pin: MapPin) => void): void {
    this.onPinSelectCallback = cb;
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.parentGroup.visible = visible;
  }

  public setVerticalExaggeration(factor: number): void {
    this.currentExaggeration = factor;
    this.updatePinsElevation();
  }

  public updatePinsElevation(): void {
    for (const [pinId, group] of this.pinObjects.entries()) {
      const pin = this.pinManager.getById(pinId);
      if (pin) {
        const groundY = this.heightfield.getInterpolatedHeightAtTile(pin.x, pin.y);
        const effectiveZ = (pin.lockAltitude && pin.z !== null) ? pin.z : groundY;
        group.position.y = effectiveZ * this.currentExaggeration;

        const roundZ = Math.round(effectiveZ);
        const uData = (group as any).userData;
        if (uData && uData.labelSprite && uData.lastZ !== roundZ) {
          uData.lastZ = roundZ;
          const labelTitle = `${pin.type.toUpperCase()} (${roundZ}m)`;
          this.updatePinLabelTexture(uData.labelSprite, labelTitle, uData.badgeColor);
        }
      }
    }
  }

  public rebuildPins(): void {
    for (const group of this.pinObjects.values()) {
      this.parentGroup.remove(group);
      group.traverse((child) => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      });
    }
    this.pinObjects.clear();

    const pins = this.pinManager.getAll();
    for (const pin of pins) {
      const pinGroup = this.createPin3DObject(pin);
      this.parentGroup.add(pinGroup);
      this.pinObjects.set(pin.id, pinGroup);
    }
  }

  private createPin3DObject(pin: MapPin): THREE.Group {
    const group = new THREE.Group();
    group.name = `Pin_${pin.id}`;
    (group as any).userData = { pinId: pin.id };

    const worldX = pin.x * CONFIG.TILE_METERS;
    const worldZ = -pin.y * CONFIG.TILE_METERS; // Norte é -Z

    const groundY = this.heightfield.getInterpolatedHeightAtTile(pin.x, pin.y);
    const effectiveZ = (pin.lockAltitude && pin.z !== null) ? pin.z : groundY;
    const worldY = effectiveZ * this.currentExaggeration;

    group.position.set(worldX, worldY, worldZ);

    // Cor temática de validação
    const badgeColor = pin.validated ? '#f59e0b' : '#94a3b8';

    let modelHeight = 4.0;

    switch (pin.type) {
      case 'tower': {
        // Torre de Guarda do Wurm: 1 tile de base (4x4m), altura 12m
        modelHeight = 12.0;

        const stoneMat = new THREE.MeshStandardMaterial({
          color: pin.validated ? 0x64748b : 0x475569,
          roughness: 0.8,
          wireframe: !pin.validated,
        });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
        const roofMat = new THREE.MeshStandardMaterial({ color: pin.validated ? 0x991b1b : 0x57534e });

        // Base 4x4m (5m de altura)
        const baseGeom = new THREE.BoxGeometry(4.0, 5.0, 4.0);
        const base = new THREE.Mesh(baseGeom, stoneMat);
        base.position.set(0, 2.5, 0);
        (base as any).userData = { pinId: pin.id };
        group.add(base);

        // Nível superior com balcão (3.6x3.6m, 4m de altura)
        const midGeom = new THREE.BoxGeometry(3.6, 4.0, 3.6);
        const mid = new THREE.Mesh(midGeom, woodMat);
        mid.position.set(0, 7.0, 0);
        (mid as any).userData = { pinId: pin.id };
        group.add(mid);

        // Telhado cônico (3m)
        const roofGeom = new THREE.ConeGeometry(3.0, 3.2, 4);
        roofGeom.rotateY(Math.PI / 4);
        const roof = new THREE.Mesh(roofGeom, roofMat);
        roof.position.set(0, 10.6, 0);
        (roof as any).userData = { pinId: pin.id };
        group.add(roof);
        break;
      }

      case 'pillar': {
        // Real in-game survey pillar when the Wurm assets are extracted (~1.4 m square, ~5 m tall)
        const modeloWurm = modeloPilar();
        if (modeloWurm) {
          modelHeight = 5.0;
          const real = modeloWurm.clone();
          real.traverse(o => { (o as any).userData = { pinId: pin.id }; });
          group.add(real);
          break;
        }
        // Pilar Geodésico de Pedra do Wurm: Base quadrada 1.4m, altura 4.0m
        modelHeight = 4.5;
        const stoneMat = new THREE.MeshStandardMaterial({
          color: pin.validated ? 0xf59e0b : 0x94a3b8,
          roughness: 0.5,
          metalness: pin.validated ? 0.3 : 0.1,
          wireframe: !pin.validated,
        });

        // Plinto de base
        const plinthGeom = new THREE.BoxGeometry(1.6, 0.6, 1.6);
        const plinth = new THREE.Mesh(plinthGeom, stoneMat);
        plinth.position.set(0, 0.3, 0);
        (plinth as any).userData = { pinId: pin.id };
        group.add(plinth);

        // Fuste / Obelisco quadrado (3m)
        const shaftGeom = new THREE.BoxGeometry(1.1, 3.0, 1.1);
        const shaft = new THREE.Mesh(shaftGeom, stoneMat);
        shaft.position.set(0, 2.1, 0);
        (shaft as any).userData = { pinId: pin.id };
        group.add(shaft);

        // Capitel piramidal (0.8m)
        const capGeom = new THREE.ConeGeometry(0.9, 0.8, 4);
        capGeom.rotateY(Math.PI / 4);
        const cap = new THREE.Mesh(capGeom, stoneMat);
        cap.position.set(0, 4.0, 0);
        (cap as any).userData = { pinId: pin.id };
        group.add(cap);
        break;
      }

      case 'coast': {
        // Marco de Costa / Bóia de Nível d'água
        modelHeight = 2.5;
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
        const postGeom = new THREE.CylinderGeometry(0.3, 0.3, 2.5, 8);
        const post = new THREE.Mesh(postGeom, woodMat);
        post.position.set(0, 1.25, 0);
        (post as any).userData = { pinId: pin.id };
        group.add(post);

        const ringGeom = new THREE.TorusGeometry(1.2, 0.25, 8, 16);
        ringGeom.rotateX(Math.PI / 2);
        const ring = new THREE.Mesh(ringGeom, woodMat);
        ring.position.set(0, 0.2, 0);
        (ring as any).userData = { pinId: pin.id };
        group.add(ring);
        break;
      }

      case 'peak': {
        // Cume / Marco Geodésico de Montanha com bandeira de triangulação
        modelHeight = 3.5;
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
        const cairnGeom = new THREE.DodecahedronGeometry(1.4);
        const cairn = new THREE.Mesh(cairnGeom, stoneMat);
        cairn.position.set(0, 1.2, 0);
        (cairn as any).userData = { pinId: pin.id };
        group.add(cairn);

        // Mastro com bandeirola
        const poleGeom = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6);
        const pole = new THREE.Mesh(poleGeom, stoneMat);
        pole.position.set(0, 2.4, 0);
        (pole as any).userData = { pinId: pin.id };
        group.add(pole);
        break;
      }

      default: {
        // Genérico com pedestal e esfera
        modelHeight = 3.0;
        const mat = new THREE.MeshStandardMaterial({ color: 0xa855f7 });
        const sphereGeom = new THREE.SphereGeometry(1.0, 12, 12);
        const sphere = new THREE.Mesh(sphereGeom, mat);
        sphere.position.set(0, 2.0, 0);
        (sphere as any).userData = { pinId: pin.id };
        group.add(sphere);
        break;
      }
    }

    // Rótulo de texto flutuante proporcional
    const roundZ = Math.round(effectiveZ);
    const labelTitle = `${pin.type.toUpperCase()} (${roundZ}m)`;
    const labelSprite = this.createPinLabelSprite(labelTitle, badgeColor);
    labelSprite.position.set(0, modelHeight + 1.2, 0);
    (labelSprite as any).userData = { pinId: pin.id };
    group.add(labelSprite);

    (group as any).userData = {
      pinId: pin.id,
      labelSprite,
      lastZ: roundZ,
      badgeColor,
    };

    return group;
  }

  private drawLabelCanvas(canvas: HTMLCanvasElement, text: string, accentColor: string): void {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.roundRect(0, 0, canvas.width, canvas.height, 5);
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  private createPinLabelSprite(text: string, accentColor: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 42;
    this.drawLabelCanvas(canvas, text, accentColor);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(5.0, 1.2, 1);
    return sprite;
  }

  private updatePinLabelTexture(sprite: THREE.Sprite, text: string, accentColor: string): void {
    const mat = sprite.material as THREE.SpriteMaterial;
    if (mat && mat.map && mat.map.image) {
      const canvas = mat.map.image as HTMLCanvasElement;
      this.drawLabelCanvas(canvas, text, accentColor);
      mat.map.needsUpdate = true;
    }
  }

  public getRaycastTargets(): THREE.Object3D[] {
    const targets: THREE.Object3D[] = [];
    for (const group of this.pinObjects.values()) {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh || (child as THREE.Sprite).isSprite) {
          targets.push(child);
        }
      });
    }
    return targets;
  }

  public handlePinClick(pinId: string): void {
    const pin = this.pinManager.getById(pinId);
    if (pin && this.onPinSelectCallback) {
      this.onPinSelectCallback(pin);
    }
  }
}
