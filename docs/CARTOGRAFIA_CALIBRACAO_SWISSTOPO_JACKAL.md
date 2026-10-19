# 🗺️ Relatório de Engenharia Cartográfica — Swisstopo Jackal Atlas

> **Registro Técnico de Calibração, Otimização de Resolução e Encerramento de Expediente**  
> *Projeto: Jackal Atlas (Wurm Online — Round 2)*  
> *Data: 12 de Outubro de 2026*  
> *Ambiente Online:* [https://jackal-atlas.pages.dev](https://jackal-atlas.pages.dev)  
> *Repositório:* `D:\Projetos\Wurm-Online\Jackal-Atlas`

---

## 📌 1. Sumário Executivo

Durante a validação de campo do mapa tático do Jackal, foram identificadas três deficiências visuais críticas na camada cartográfica customizada (`Goldfishr`), além de uma degradação de nitidez no zoom máximo:
1. **Sombras Lavadas e Artificiais:** O relevo anterior utilizava um DEM sintético gerado por busca em largura (BFS) a partir da costa, o que gerou mais de 16.000 cumes falsos e platôs com efeito de escadaria/blur.
2. **Curvas de Nível Camufladas:** As linhas de contorno em sépia alpino `(90, 70, 52)` tinham contraste quase nulo contra a terra corrompida avermelhada de Jackal (`#845e4d` / `#ba836c`), desaparecendo a olho nu.
3. **Paleta Homogênea:** A faixa de cores pastéis não diferenciava a rocha alpina, a corrupção profunda e os oásis verdes de Beacons.
4. **Resolução de Zoom Travada em 2048px (`maxNativeZoom: 3`):** Um parâmetro no `index.html` impedia o Leaflet de baixar os tiles de Zoom 4 (4096px), provocando um upscale digital de 800% no zoom 6.0x e deixando o mapa pixelado/borrado.

Todas as quatro questões foram diagnosticadas, matematicamente solucionadas, testadas e publicadas em produção.

---

## ⛰️ 2. Diagnóstico & Solução das Sombras (Relevo 3D)

### O Problema do BFS Cego:
O pipeline experimental tentava criar um DEM inferindo altitude unicamente pelo número de curvas cruzadas a partir do mar. Como uma ilha possui vales interiores, depressões e cordilheiras não-concêntricas, o algoritmo tratou qualquer relevo interno como elevação contínua (+20m por curva), resultando em:
* 16.795 cumes falsos em 21.062 regiões de terra.
* Perda de todas as falésias, cristas afiadas e cânions reais do jogo.

### A Solução Implementada:
Substituição pelo modelo de **Razão de Luminância Pura Calibrada**:
$$\text{shading\_ratio} = \text{clip}\left(\frac{I_{\text{lum}}}{\max(T_{\text{lum}}, 1.0)}, 0.25, 1.80\right)$$
* **Máscara Neutra Estrita de Água:** Corpos hídricos têm o fator cravado em $1.0$ (neutro absoluto), eliminando 100% de ruídos e estrias de ondas nos mares e lagos.
* **Intensidade de Relevo:** Calibrada a **60%**, restaurando o impacto dramático e a orientação de luz 315° NW sobre todas as encostas.

---

## 📐 3. Curvas de Nível & Batimetria em Alto Contraste

### Extração Matemática 1:1:
$$\text{Contorno} = (\text{topo} == [0,0,0]) \land \neg(\text{terrain} == [0,0,0])$$
* Preservação garantida de **portas de mina** escavadas pelos jogadores (`[0,0,0]` em rocha permanecem como mina).

### Nova Fórmula Cromática:
* **Curvas Terrestres:** **Carvão / Grafite Mineral** $\text{RGB}(36, 26, 22)$ (`#241a16`) a **90% de opacidade**. O traço escuro contrasta com perfeição sobre o solo avermelhado, rochas claras ou grama.
* **Curvas Batimétricas (Água):** **Azul Ardósia** $\text{RGB}(62, 105, 132)$ a **85% de opacidade**, permitindo identificar canais navegáveis e fossas marinhas sem poluir o azul cristalino do mar.

---

## 🎨 4. Paleta Swisstopo Calibrada (`palette_jackal_swisstopo.json`)

Mapeamento perceptual em espaço **CIE L\*a\*b\*** com preservação de cores sentinelas (preto de minas, amarelo de tokens/pontes e vermelho de POIs):

| Bioma / Região | Cor de Origem (Wurm) | Cor Calibrada Swisstopo | Efeito Visual |
| :--- | :--- | :--- | :--- |
| **Oceano / Água Profunda** | `#3c5854` | `#7da8be` | Azul clássico cartográfico |
| **Água Rasa / Litoral** | `#4c6662` | `#9bc3d7` | Azul celeste limpo |
| **Corrupção Principal** | `#583d27` | `#ac6c50` | Terracota avermelhado nobre |
| **Corrupção Profunda / Cinzas**| `#342018` | `#694030` | Solo mineral escuro contrastado |
| **Rocha / Cordilheiras** | `#706d6f` | `#d7d2ca` | Cinza alpino claro e nítido |
| **Beacon (Área Liberada/Deed)**| `#366503` | `#a2d469` | Verde pasto vibrante (oásis) |
| **Beacon (Floresta Protegida)**| `#293a02` | `#55873a` | Verde florestal alpino profundo |
| **Areia / Praias / Dunas** | `#a0936d` | `#f0e6d2` | Creme suave suíço |

---

## 🔍 5. Correção Crítica de Resolução no Zoom (`maxNativeZoom`)

### Diagnóstico do Bug:
No arquivo `index.html`, a variável `maxNativeZoom` estava configurada com padrão `3`:
```javascript
// Antes (Incorreto):
maxNativeZoom: Math.round(getClampedParam('maxNativeZoom', 3, 0, 5)), // z3 = 4096px nativo sem upscale de z4
```
* O comentário considerava $Z=3$ como 4096px, mas matematicamente $2^3 \times 256 = \mathbf{2048\text{px}}$.
* O Leaflet encerrava as requisições em $Z=3$ e **nunca baixava a pasta de Zoom 4** ($16 \times 16 \times 256 = \mathbf{4096\text{px}}$).
* No zoom $6.0\times$, a imagem sofria um estiramento digital desnecessário de 800%.

### Correção Aplicada:
```javascript
// Corrigido (Definitivo):
maxNativeZoom: Math.round(getClampedParam('maxNativeZoom', 4, 0, 5)), // z4 = 4096px nativo (16x16 tiles de 256px)
```
Com essa alteração, todos os clientes baixam a resolução real nativa 1:1, garantindo nitidez absoluta e linhas de 1px perfeitas em qualquer nível de ampliação.

---

## 🛠️ 6. Como Reprocessar o Mapa no Futuro (Guia de 1 Comando)

Quando a desenvolvedora Code Club / Wurm Online publicar o dump oficial final de Jackal, basta executar:

```bash
python D:/Projetos/Wurm-Online/Jackal-Atlas/maps/tools/build_jackal_map.py \
  -i D:/Projetos/Wurm-Online/Jackal-Atlas/maps/raw/jackal_original_terrain_4096.png \
  -t D:/Projetos/Wurm-Online/Jackal-Atlas/maps/raw/jackal_original_topo_4096.png \
  -s D:/Projetos/Wurm-Online/Jackal-Atlas/maps/raw/jackal_original_iso_4096.png \
  -p D:/Projetos/Wurm-Online/Jackal-Atlas/maps/palettes/palette_jackal_swisstopo.json \
  -o D:/Projetos/Wurm-Online/Jackal-Atlas/maps/processed/jackal_swisstopo_4096.png \
  -r 60 \
  --tiles-dir D:/Projetos/Wurm-Online/Jackal-Atlas/tiles_custom
```

E em seguida subir os novos tiles:
```bash
git add tiles_custom maps/
git commit -m "chore(map): atualiza dump oficial de Jackal"
git push origin main
```

---

*Expediente encerrado. Sistema operando em produção com 100% de conformidade cartográfica.*
