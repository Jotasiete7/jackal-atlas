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
    // 1. ÁREA DESCONHECIDA (Hachura diagonal tática sutil)
    if (vIsKnown < 0.05) {
      vec2 screenP = gl_FragCoord.xy;
      float diag = mod(screenP.x + screenP.y, 16.0);
      float stripe = step(8.0, diag);
      vec3 stripeColor = mix(vec3(0.08, 0.09, 0.11), vec3(0.12, 0.13, 0.16), stripe);
      gl_FragColor = vec4(stripeColor, 1.0);
      return;
    }

    // 2. COR BASE: ÁGUA vs TERRA
    vec3 baseColor;
    if (vIsWater > 0.5) {
      // Água em tom azul marinho cartográfico
      baseColor = vec3(0.12, 0.38, 0.72);
    } else {
      // Terra em gradiente hipsométrico: Vales e planícies verdes (0 a 35m), colinas ocres (35m a 80m), picos rochosos (80m+)
      float normAlt = clamp(vAltitude / 130.0, 0.0, 1.0);
      vec3 lowColor = vec3(0.18, 0.58, 0.24);  // Vales e planícies verdes vivos (Cartographic Green)
      vec3 midColor = vec3(0.68, 0.58, 0.30);  // Encostas e colinas ocres
      vec3 highColor = vec3(0.85, 0.82, 0.78); // Picos rochosos
      baseColor = normAlt < 0.35 
        ? mix(lowColor, vec3(0.26, 0.62, 0.28), normAlt / 0.35) 
        : (normAlt < 0.70 
          ? mix(vec3(0.26, 0.62, 0.28), midColor, (normAlt - 0.35) / 0.35)
          : mix(midColor, highColor, (normAlt - 0.70) / 0.30));

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

      // 3. CURVAS DE NÍVEL CONTÍNUAS (Otimizadas para Vista de Topo e 3D)
      // Só desenha curva se a superfície for inclinada (slopeFilter) e tiver variação de altitude em tela (dAltFilter)
      if (uShowContours > 0.5 && vIsKnown > 0.02) {
        float knownFade = smoothstep(0.02, 0.25, vIsKnown);
        
        // Inclinação da encosta a partir da normal em World Space:
        // Se a superfície for plana (normal = 0, 1, 0), length(vNormal.xz) == 0.0
        float slope = length(vNormal.xz);
        float slopeFilter = smoothstep(0.02, 0.08, slope);

        // Derivada suave de espaço de tela (se dAlt for zero, é um platô plano nivelado)
        float dAltScreen = fwidth(vAltitude);
        float dAltFilter = smoothstep(0.005, 0.04, dAltScreen);
        float activeFilter = slopeFilter * dAltFilter * knownFade;

        // Só calcula e desenha se não for um platô plano
        if (activeFilter > 0.01) {
          float dAlt = max(dAltScreen, 0.06);

          // Curva Normal (a cada uContourInterval metros)
          float cDist = abs(fract(vAltitude / uContourInterval - 0.5) - 0.5);
          float cLine = (1.0 - smoothstep(0.0, dAlt * 0.75, cDist * uContourInterval)) * activeFilter;

          // Curva Mestra (a cada uContourInterval * uMasterEvery metros)
          float masterInterval = uContourInterval * uMasterEvery;
          float mDist = abs(fract(vAltitude / masterInterval - 0.5) - 0.5);
          float mLine = (1.0 - smoothstep(0.0, dAlt * 1.1, mDist * masterInterval)) * activeFilter;

          vec3 normalContourColor = vec3(0.85, 0.65, 0.28);
          vec3 masterContourColor = vec3(1.0, 0.98, 0.92);

          baseColor = mix(baseColor, normalContourColor, cLine * 0.75);
          baseColor = mix(baseColor, masterContourColor, mLine * 0.95);
        }
      }
    }

    // 4. GRADE CARTOGRÁFICA 10/100 TILES & EIXOS CENTRAIS (0,0)
    if (uShowGrid > 0.5) {
      vec2 worldTile = vec2(vWorldPosition.x, -vWorldPosition.z) / uTileMeters;

      // Linha fraca a cada 10 tiles
      vec2 g10 = abs(fract(worldTile / 10.0 - 0.5) - 0.5) / fwidth(worldTile / 10.0);
      float line10 = 1.0 - min(min(g10.x, g10.y), 1.0);

      // Linha forte a cada 100 tiles
      vec2 g100 = abs(fract(worldTile / 100.0 - 0.5) - 0.5) / fwidth(worldTile / 100.0);
      float line100 = 1.0 - min(min(g100.x, g100.y), 1.0);

      // Eixos Centrais de Origem (Spawn 0, 0) acompanham o relevo sem atravessá-lo
      vec2 axisDist = abs(worldTile) / fwidth(worldTile);
      float axisZero = 1.0 - min(min(axisDist.x, axisDist.y), 1.0);

      baseColor = mix(baseColor, vec3(0.24, 0.27, 0.32), line10 * 0.40);
      baseColor = mix(baseColor, vec3(0.38, 0.65, 0.98), line100 * 0.85);
      baseColor = mix(baseColor, vec3(0.96, 0.62, 0.04), axisZero * 0.95); // Eixo de Spawn Dourado
    }

    gl_FragColor = vec4(baseColor, 1.0);
  }
`;
