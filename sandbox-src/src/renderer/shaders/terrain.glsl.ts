// ==============================================================================
// JACKAL SANDBOX — SHADERS GLSL DO TERRENO 3D
// Curvas de nível contínuas na vista de topo, grade procedural e eixos de spawn
// ==============================================================================

export const TERRAIN_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aStateConf; // x = isKnown (0..1), y = isWater (0..1), z = confidence (0..2)

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vAltitude;
  varying float vIsKnown;
  varying float vIsWater;
  varying float vConfidence;

  void main() {
    vAltitude = position.y;
    vIsKnown = aStateConf.x;
    vIsWater = aStateConf.y;
    vConfidence = aStateConf.z;

    // Normal em Espaço de Mundo (independente da rotação da câmera / vista isométrica)
    vNormal = normalize(mat3(modelMatrix) * normal);

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const TERRAIN_FRAGMENT_SHADER = /* glsl */ `
  uniform float uShowGrid;
  uniform float uShowContours;
  uniform float uShowHillshade;
  uniform float uContourInterval;
  uniform float uMasterEvery;
  uniform float uShowConfidence;
  uniform float uTileMeters;
  uniform vec3 uSunDirection;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vAltitude;
  varying float vIsKnown;
  varying float vIsWater;
  varying float vConfidence;

  void main() {
    // 1. ÁREA DESCONHECIDA / NÃO ESCULPIDA: Pergaminho Cartográfico Contínuo (#efe6cf)
    // Permite que todo o mapa pareça uma folha oficial sobre a mesa tática
    vec3 parchmentBase = vec3(0.937, 0.902, 0.812); // #efe6cf
    if (vIsKnown < 0.05) {
      vec3 finalUnknown = parchmentBase;
      if (uShowGrid > 0.5) {
        vec2 worldTile = vec2(vWorldPosition.x, -vWorldPosition.z) / uTileMeters;
        vec2 g10 = abs(fract(worldTile / 10.0 - 0.5) - 0.5) / fwidth(worldTile / 10.0);
        float line10 = 1.0 - min(min(g10.x, g10.y), 1.0);

        vec2 g100 = abs(fract(worldTile / 100.0 - 0.5) - 0.5) / fwidth(worldTile / 100.0);
        float line100 = 1.0 - min(min(g100.x, g100.y), 1.0);

        vec2 axisDist = abs(worldTile) / fwidth(worldTile);
        float axisZero = 1.0 - min(min(axisDist.x, axisDist.y), 1.0);

        finalUnknown = mix(finalUnknown, vec3(0.357, 0.290, 0.196), line10 * 0.25); // Sepia suave #5b4a32
        finalUnknown = mix(finalUnknown, vec3(0.961, 0.651, 0.137), line100 * 0.70); // Ambar Jackal #f5a623
        finalUnknown = mix(finalUnknown, vec3(0.961, 0.651, 0.137), axisZero * 0.95);
      }
      gl_FragColor = vec4(finalUnknown, 1.0);
      return;
    }

    // 2. COR BASE: ÁGUA vs TERRA
    vec3 baseColor;
    if (vIsWater > 0.5) {
      // Água em tom azul marinho cartográfico
      baseColor = vec3(0.12, 0.38, 0.72);
    } else {
      // Escala Hipsométrica Mundial Adaptada (Eduard Imhof / Swisstopo / USGS):
      // 0 a 15m: Verde costeiro e várzea
      // 15 a 35m: Verde-oliva suave e prados
      // 35 a 65m: Camurça e colinas ocres
      // 65 a 100m: Terracota e encostas altas
      // 100 a 135m: Rocha e montanha
      // 135m+: Cumes e calcário alpino
      vec3 c0 = vec3(0.18, 0.48, 0.25);  // 0m: Verde costeiro
      vec3 c1 = vec3(0.32, 0.58, 0.28);  // 15m: Prados baixos
      vec3 c2 = vec3(0.58, 0.62, 0.32);  // 35m: Colinas camurça
      vec3 c3 = vec3(0.72, 0.54, 0.30);  // 65m: Encostas terracota
      vec3 c4 = vec3(0.56, 0.48, 0.44);  // 100m: Rocha de montanha
      vec3 c5 = vec3(0.88, 0.86, 0.83);  // 135m+: Picos e calcário alpino

      float alt = max(0.0, vAltitude);
      if (alt < 15.0) {
        baseColor = mix(c0, c1, alt / 15.0);
      } else if (alt < 35.0) {
        baseColor = mix(c1, c2, (alt - 15.0) / 20.0);
      } else if (alt < 65.0) {
        baseColor = mix(c2, c3, (alt - 35.0) / 30.0);
      } else if (alt < 100.0) {
        baseColor = mix(c3, c4, (alt - 65.0) / 35.0);
      } else {
        baseColor = mix(c4, c5, clamp((alt - 100.0) / 40.0, 0.0, 1.0));
      }

      // Mapa de Confiança (se ativo)
      if (uShowConfidence > 0.5) {
        vec3 confColor;
        if (vConfidence >= 2.5) {
          // CONSOLIDADO / TRANCADO 🔒 (Cadeado do Cartógrafo - Verde Esmeralda com hachura sutil)
          vec2 screenP = gl_FragCoord.xy;
          float stripe = step(4.0, mod(screenP.x - screenP.y, 14.0));
          vec3 emerald = vec3(0.05, 0.85, 0.45);
          vec3 goldStripe = vec3(0.96, 0.75, 0.15);
          confColor = mix(emerald, goldStripe, stripe * 0.30);
        } else if (vConfidence >= 1.5) {
          confColor = vec3(0.13, 0.77, 0.36); // MEASURED (Verde Esmeralda)
        } else if (vConfidence >= 0.5) {
          confColor = vec3(0.96, 0.62, 0.04); // ESTIMATED (Laranja Âmbar)
        } else {
          confColor = vec3(0.55, 0.65, 0.75); // SPECULATIVE (Azul Pálido)
        }
        baseColor = mix(baseColor, confColor, 0.55);
      }

      // Iluminação Hillshade Direcional suave (Normal em World Space vs Sol)
      if (uShowHillshade > 0.5) {
        float NdotL = max(dot(vNormal, uSunDirection), 0.0);
        float lighting = 0.45 + 0.55 * NdotL;
        baseColor *= lighting;
      }

      // 3. CURVAS DE NÍVEL CONTÍNUAS (Padrão Topográfico Mundial - USGS / Swisstopo)
      // Nitidez constante em espaço de tela (pixels) e linhas em Sépia/Umber de alto contraste
      if (uShowContours > 0.5 && vIsKnown > 0.02) {
        float knownFade = smoothstep(0.02, 0.20, vIsKnown);
        float dH = max(fwidth(vAltitude), 0.001);

        // Curva Normal (a cada uContourInterval metros)
        float cDist = abs(fract(vAltitude / uContourInterval - 0.5) - 0.5) * uContourInterval;
        float cDistPixels = cDist / dH;
        float cLine = (1.0 - smoothstep(0.35, 1.25, cDistPixels)) * knownFade;

        // Curva Mestra / Diretora (a cada uContourInterval * uMasterEvery metros)
        float masterInterval = uContourInterval * uMasterEvery;
        float mDist = abs(fract(vAltitude / masterInterval - 0.5) - 0.5) * masterInterval;
        float mDistPixels = mDist / dH;
        float mLine = (1.0 - smoothstep(0.5, 2.2, mDistPixels)) * knownFade;
        float mHalo = (1.0 - smoothstep(1.5, 3.8, mDistPixels)) * knownFade;

        // Cores em Sépia e Umber profundo garantem legibilidade em qualquer cota
        vec3 normalContourColor = vec3(0.24, 0.14, 0.07);
        vec3 masterContourColor = vec3(0.12, 0.06, 0.03);
        vec3 haloColor = vec3(1.0, 0.97, 0.90);

        baseColor = mix(baseColor, haloColor, mHalo * 0.35);
        baseColor = mix(baseColor, normalContourColor, cLine * 0.85);
        baseColor = mix(baseColor, masterContourColor, mLine * 0.95);
      }
    }

    // 4. GRADE CARTOGRÁFICA 10/100 TILES & EIXOS CENTRAIS (0,0) EM ÁREAS ESCULPIDAS
    if (uShowGrid > 0.5) {
      vec2 worldTile = vec2(vWorldPosition.x, -vWorldPosition.z) / uTileMeters;

      // Linha fraca a cada 10 tiles (Sépia)
      vec2 g10 = abs(fract(worldTile / 10.0 - 0.5) - 0.5) / fwidth(worldTile / 10.0);
      float line10 = 1.0 - min(min(g10.x, g10.y), 1.0);

      // Linha forte a cada 100 tiles (Âmbar Jackal)
      vec2 g100 = abs(fract(worldTile / 100.0 - 0.5) - 0.5) / fwidth(worldTile / 100.0);
      float line100 = 1.0 - min(min(g100.x, g100.y), 1.0);

      // Eixos Centrais de Origem (Spawn 0, 0)
      vec2 axisDist = abs(worldTile) / fwidth(worldTile);
      float axisZero = 1.0 - min(min(axisDist.x, axisDist.y), 1.0);

      baseColor = mix(baseColor, vec3(0.357, 0.290, 0.196), line10 * 0.30); // #5b4a32
      baseColor = mix(baseColor, vec3(0.961, 0.651, 0.137), line100 * 0.75); // #f5a623
      baseColor = mix(baseColor, vec3(0.961, 0.651, 0.137), axisZero * 0.95);
    }

    gl_FragColor = vec4(baseColor, 1.0);
  }
`;
