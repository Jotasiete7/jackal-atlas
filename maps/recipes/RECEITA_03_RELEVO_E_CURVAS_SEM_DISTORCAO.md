# ⛰️ RECEITA 03: RELEVO TRIDIMENSIONAL E CURVAS DE NÍVEL

> **Objetivo:** Aplicar sombreamento de relevo (Hillshading) e curvas de nível milimetricamente alinhadas com o terreno, eliminando estrias em corpos d'água e distorções geométricas.

---

## 🎯 1. O Desafio da Isometria e a Nossa Solução

No motor de renderização nativo do Wurm Online, o mapa sombreado padrão (`classic` ou `iso`) é gerado com uma inclinação de câmera a $45^\circ$ olhando para o Norte:
- Isso projeta o topo das montanhas de 20 a 40 pixels mais ao Norte em relação à base.
- Se o relevo for simplesmente multiplicado sobre o terreno sem cuidados, **as estradas nas encostas parecem escorregar montanha abaixo** e os limites de *deeds* ficam desalinhados.
- Além disso, o relevo padrão gera ruído e estrias de ondas dentro do mar e dos lagos.

### Como o `build_jackal_map.py` resolve:
1. **Máscara Neutra de Água:** O script detecta os corpos d'água por assinatura espectral de cor e trava o fator de iluminação em $1.0$ (neutro absoluto). Resultado: **água 100% lisa, limpa e cristalina**, exatamente como nas melhores cartas geográficas do mundo.
2. **Relevo Suave:** Utiliza a razão de luminância isolada com interpolação configurável (recomendado: 45% a 55%), conferindo profundidade às montanhas de Jackal sem esmagar as cores das clareiras de Beacons.

---

## 📐 2. Curvas de Nível Vetorizadas de 1 Pixel

A camada topográfica (`topo.png`) contém as curvas de nível originais do jogo.
O script executa a extração matemática exata:
$$\text{Mask} = (\text{topo} == [0,0,0]) \land \neg(\text{terrain} == [0,0,0])$$

- **Preservação de Minas:** Pixels pretos que já existiam no terreno original (portas de mina escavadas pelos jogadores) são preservados como mina e não viram curva de nível.
- **Estilização Suíça:**
  - Na terra: traço em **sépia alpino** `RGB(90, 70, 52)`.
  - Na água: traço em **azul suave batimétrico** `RGB(86, 128, 158)`.
  - Opacidade padrão: $80\%$ (`0.80`), garantindo que estradas e construções embaixo da linha ainda sejam perfeitamente visíveis.

---

## ⚙️ 3. Ajuste de Parâmetros

Você pode testar variações de relevo e contraste usando os argumentos da linha de comando:

```bash
# Relevo mais sutil (35%) e curvas mais suaves (70% opacidade)
python Jackal-Atlas/maps/tools/build_jackal_map.py -r 35 -c 0.70

# Relevo dramático e contrastado (60%) e curvas bem marcadas (85% opacidade)
python Jackal-Atlas/maps/tools/build_jackal_map.py -r 60 -c 0.85
```
