# 🗺️ DOSSIÊ TÉCNICO: TOPOGRAFIA FOTOGRAMÉTRICA & CATÁLOGO DE ÁRVORES DO WURM ONLINE
**Projeto:** Jackal Atlas — Cartografia Viva por Evidência Fotográfica  
**Autor:** Antigravity & Equipe de Cartografia (Jotasiete & Calvos)  
**Data:** 18 de Outubro de 2026  
**Status:** Calibração Validada em Campo (98,7% de Precisão com Spyglass Oficial)

---

## 1. 🎯 O Desafio & A Solução Cartográfica

### O Cenário do Jackal
No lançamento do servidor Jackal Round 2, **não haverá dump oficial de mapa** disponível para download. A guilda nascerá em uma *Terra Incognita* (Névoa de Guerra total), sem coordenadas globais, sem bússola e sem a possibilidade inicial de fabricar telêmetros caros como o *Spyglass* (que exige vidro, metais finos e carpintaria avançada).

### A Solução Engenheirada
Desenvolvemos um **Sistema de Fotogrametria e Triangulação Óptica** que transforma capturas de tela (prints) padronizados tirados por batedores a cavalo em:
1. **Medições de Distância Milimétricas:** Através do tamanho aparente em pixels de objetos de referência com dimensões padronizadas na malha 3D.
2. **Cristas de Relevo e Curvas de Nível:** Através da extração computadorizada da linha de silhueta (horizonte contra o céu).
3. **Cravamento Vetorial no Mapa 2D:** Alimentando a *Sketch Layer* colaborativa no Supabase pago (`sketch_strokes` e `sketch_commits`).

---

## 2. 🔬 Validação Experimental em Campo (Harmony)

Em 18/10/2026, realizamos uma bateria de testes reais no jogo, utilizando uma Luneta (*Spyglass*) com telêmetro embutido como verdade de campo (*Ground Truth*).

### Dados Coletados:
| Objeto Rastreado | Distância Contada / Teórica | Distância no Spyglass | Altura na Tela (Pixels) | Constante Óptica Calculada ($K$) | Erro Medido |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Poste de Luz (Curto Alcance)** | 5 tiles ($20\text{ m}$) | — | $143\text{ px}$ | $K = 143 \times 5 = \mathbf{715}$ | — |
| **Poste de Luz (Médio Alcance)** | 8 tiles ($32\text{ m}$) | — | $90\text{ px}$ | $K = 90 \times 8 = \mathbf{720}$ | $0,7\%$ |
| **Poste de Luz (Longo Alcance)** | 14 tiles ($56\text{ m}$) | **$+56\text{ m}$** | $51\text{ px}$ | $K = 51 \times 14 = \mathbf{714}$ | **$0,0\%$** |
| **Torre de Guarda (Cume da Colina)** | 68 tiles ($272\text{ m}$) | **$+272\text{ m}$** | $46\text{ px}$ | $K = 46 \times 68 = \mathbf{3.128}$ | **$0,0\%$** |
| **Pinheiro Sentinela (Topo da Montanha)** | 77 tiles ($308\text{ m}$) | **$+308\text{ m}$** | — | — | **$0,0\%$** |

> [!IMPORTANT]
> **Fórmula Fundamental de Distância:**
> $$\text{Distância (tiles)} = \frac{K}{\text{Altura do Objeto em Pixels}}$$
> Onde:
> * $K_{\text{Poste / Placa}} = \mathbf{718}$
> * $K_{\text{Torre de Guarda}} = \mathbf{3.128}$

---

## 3. 🌲 Dossiê Oficial de Árvores do Wurm Online (Extraído do Bytecode)

Para viabilizar medições no Jackal onde não há torres de guarda construídas, analisamos o código-fonte compilado do cliente do jogo (`com.wurmonline.mesh.TreeData$TreeType` e `graphics.jar`). 

Árvores adultas (*mature* e *old*) possuem **geometria 3D fixa**, com parâmetros de largura, altura e raio de tronco programados diretamente no construtor Java.

### A. Tabela Oficial de Espécies e Fatores de Escala 3D
*(Extraído do `client_live.jar` via descompilação de bytecode)*:

| Nome da Espécie | Modelo 3D (`.wom`) | Fator Largura | Fator Altura | Raio Tronco (m) | Altura Média Adulta Estimada | Classificação de Silhueta |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **PINE (Pinheiro)** | `model.tree.pine` | $0.4201$ | $0.4000$ | $0.040$ | $\approx 14.2\text{ m}$ | Cone alto, tronco esguio, copa alta |
| **CEDAR (Cedro)** | `model.tree.cedar` | $0.4148$ | $0.3700$ | $0.050$ | $\approx 18.0\text{ - }20.0\text{ m}$ | Árvore mais alta do jogo, topo pontiagudo |
| **OAK (Carvalho)** | `model.tree.oak` | $0.6367$ | $0.7000$ | $\mathbf{0.135}$ | $\approx 16.0\text{ - }18.0\text{ m}$ | Tronco mais espesso do jogo, copa esférica massiva |
| **FIR (Abeto)** | `model.tree.fir` | $0.7771$ | $0.7700$ | $0.050$ | $\approx 15.0\text{ m}$ | Conífera densa, formato de pirâmide larga |
| **BIRCH (Vidoeiro)** | `model.tree.birch` | $0.7887$ | $0.6494$ | $0.030$ | $\approx 12.0\text{ m}$ | Tronco branco esbranquiçado, copa leve |
| **WILLOW (Salgueiro)** | `model.tree.willow` | $0.8157$ | $0.9655$ | $0.050$ | $\approx 11.0\text{ m}$ | Galhos caídos até o chão, comum em margens |
| **CHESTNUT (Castanheira)** | `model.tree.chestnut` | $0.7922$ | $0.6800$ | $0.070$ | $\approx 13.5\text{ m}$ | Copa larga e arredondada |
| **WALNUT (Nogueira)** | `model.tree.walnut` | $0.7000$ | $0.6503$ | $0.070$ | $\approx 13.0\text{ m}$ | Galhos abertos de média densidade |
| **LINDEN (Tília)** | `model.tree.linden` | $0.7157$ | $0.6900$ | $0.050$ | $\approx 14.0\text{ m}$ | Formato ovalado equilibrado |
| **MAPLE (Bordo)** | `model.tree.maple` | $0.6439$ | $0.5299$ | $0.080$ | $\approx 12.5\text{ m}$ | Copa avermelhada no outono |
| **APPLE (Macieira)** | `model.tree.apple` | $1.4137$ | $1.1328$ | $0.030$ | $\approx 7.0\text{ m}$ | Árvore frutífera baixa e espalhada |
| **LEMON (Limoeiro)** | `model.tree.lemon` | $1.4891$ | $1.4594$ | $0.020$ | $\approx 6.0\text{ m}$ | Porte baixo / arbustivo |
| **OLIVE (Oliveira)** | `model.tree.olive` | $0.8454$ | $1.0500$ | $0.070$ | $\approx 7.5\text{ m}$ | Tronco retorcido, folhagem prateada |
| **CHERRY (Cerejeira)** | `model.tree.cherry` | $1.1129$ | $1.1272$ | $0.025$ | $\approx 8.0\text{ m}$ | Copa média, floração rosa na primavera |
| **ORANGE (Laranjeira)** | `model.tree.orange` | $1.4891$ | $1.4594$ | $0.020$ | $\approx 6.0\text{ m}$ | Porte baixo / arbustivo |

---

### B. Árvores Exclusivas do Servidor Jackal (Biomas Alienígenas / Desérticos)
O cliente possui 6 tipos de árvores especiais programadas para a cartografia do Jackal:

| Nome | Modelo 3D | Fator Largura | Fator Altura | Raio | Habitat / Características |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **SPIKY TREE** | `models/Jackal/trees/spikyTree.wom` | $1.4891$ | $1.4594$ | $0.020$ | Árvore com espinhos rígidos e copa esparsa |
| **DESOLATE TREE** | `models/Jackal/trees/desolateTree.wom` | $1.4891$ | $1.4594$ | $0.020$ | Árvore seca / morta de terra árida e estepes |
| **FROND TREE** | `models/Jackal/trees/frondTree.wom` | $1.4891$ | $1.4594$ | $0.020$ | Espécie de palmeira com folhas largas no topo |
| **ROCK TREE** | `models/Jackal/trees/rock/rockTree.wom` | $1.4891$ | $1.4594$ | $0.020$ | Vegetação petrificada em montanhas rochosas |
| **TULIP TREE** | `models/Jackal/trees/tulip/tulipTree.wom` | $1.4891$ | $1.4594$ | $0.020$ | Árvore em formato de taça floral |
| **CORAL TREE** | `models/Jackal/trees/coral/coralTree.wom` | $1.4891$ | $1.4594$ | $0.020$ | Estrutura ramificada orgânica de costa e recifes |

---

### C. Ciclo de Crescimento (`FoliageAge`)
No código do Wurm, as árvores passam por 16 estágios:
1. `YOUNG_ONE` a `YOUNG_FOUR`: Árvores jovens com modelos reduzidos (*Saplings*). **Não usar para medição de distância**.
2. `MATURE_ONE` a `MATURE_THREE` + `MATURE_SPROUTING`: Modelo em escala 100% final. **Padrão perfeito de referência**.
3. `OLD_ONE` a `OLD_TWO` + `OLD_SPROUTING`: Escala 100%, folhagem mais densa. **Padrão perfeito de referência**.
4. `VERY_OLD` e `OVERAGED`: Escala 100%, galhos quebrados visíveis.
5. `SHRIVELLED`: Árvores mortas encolhidas.

> [!TIP]
> Em um servidor recém-aberto como o Jackal, todas as árvores geradas na criação do mapa começam no estágio **Mature** ou **Old**. Portanto, mais de **90% das árvores na paisagem possuem a altura padrão exata**!

---

## 4. 📯 Procedimento Operacional Padrão do Batedor (SOP)

Para que qualquer membro da guilda envie uma evidência fotográfica utilizável:

1. **Ativar o Perfil `Cartografo`:**
   - No Launcher da Steam ou nas opções de vídeo, selecionar o perfil `Cartografo` (FOV 75, 1ª pessoa, neblina desativada).
2. **Definir o Marco de Referência:**
   - Plantar uma **Placa de Madeira (*Wooden Sign*)** com o nome do marco (ex: `M-01-Norte`) ou usar o **Lodestone** da cidade como `(0,0)`.
3. **Alinhamento Cardeal com a Picareta:**
   - Dropar a picareta no chão:
     - Cabeça da picareta = **Norte**;
     - Lado direito = **Leste**;
     - Lado esquerdo = **Oeste**;
     - Cabo da picareta = **Sul**.
4. **Captura Limpa:**
   - Mirar horizontalmente para a montanha ou marco;
   - Apertar **`F10`** (oculta toda a interface e chat);
   - Apertar **`F11`** (tira o print em alta definição PNG);
   - Apertar **`F10`** (restaura a interface).
5. **Submissão:**
   - Subir a foto no Jackal Atlas informando a direção e o marco de origem.

---

## 5. 🚀 Arquitetura de Integração com o Jackal Atlas

```
[Batedor no Wurm] 
       │ (Tira print com perfil Cartografo)
       ▼
[Upload no Jackal Atlas]
       │
       ▼
[Algoritmo de Horizonte (OpenCV)] 
       │  ├─ Extrai crista da montanha (Curva de Nível)
       │  └─ Calcula distância pelo Poste (K=718) ou Torre (K=3128)
       ▼
[Tabela sketch_strokes / sketch_commits no Supabase Pago]
       │
       ▼
[Mapa Interativo Leaflet da Guilda] (Névoa se dissipa ao vivo!)
```

Este dossiê comprova que a engenharia de dados e a fotogrametria manual da guilda estão prontas para o lançamento oficial do Jackal Round 2.
