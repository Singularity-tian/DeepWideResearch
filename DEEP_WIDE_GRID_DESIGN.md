## Deep × Wide 参数网格交互设计

### 概述
- **目的**: 通过 5×5 网格直观设置 Wide 与 Deep，选中“交叉点”并以此形成覆盖面积 A = W × D。
- **取值域**: W, D ∈ {0.00, 0.25, 0.50, 0.75, 1.00}，步长 `step = 1 / (5 - 1) = 0.25`。
- **选择锚点**: 选择的是“网格线交叉点”（含外边框处），而非单元格中心。
- **覆盖语义**: 以原点到选中交叉点形成的轴对齐矩形作为“覆盖范围”（深色）。

### 线段示意（ASCII）
说明：顶部为 WIDE 轴，左侧为 DEEP 轴；原点在左上角（与实现一致）。

```text
           WIDE →
        0.00  0.25  0.50  0.75  1.00
DEEP ↓   +-----+-----+-----+-----+
 0.00    |     |     |     |     |
         +-----+-----+-----+-----+
 0.25    |     |     |     |     |
         +-----+-----●-----+-----+ ← 示例：选中交叉点 (W=0.50, D=0.50)
 0.50    |     |     |     |     |  
         +-----+-----+-----+-----+
 0.75    |     |     |     |     |
         +-----+-----+-----+-----+
 1.00    
```

- `+` 表示网格线交叉点（可选中）。
- `●` 表示当前选中交叉点。
- 单元格的底色用于表达“覆盖范围”（见下一节）。

### 覆盖规则（面积 A = W × D）
- 覆盖区域是从原点 `(0.00, 0.00)` 到选中交叉点 `(W, D)` 的矩形（含边界）。
- 单元格判定采用其左上角交叉点坐标 `(cellWide, cellDeep)`：
  - 若 `cellWide <= W_selected && cellDeep <= D_selected` 则此单元格为覆盖（深色）；否则为未覆盖（浅色）。
- 示例（`▒` 表示覆盖，`·` 表示未覆盖）：

```text
+-----+-----+-----+-----+
| ▒▒▒ | ▒▒▒ |  ·  |  ·  |
+-----+-----+-----+-----+
| ▒▒▒ | ▒▒▒ |  ·  |  ·  |
+-----+-----●-----+-----+
|  ·  |  ·  |  ·  |  ·  | 
+-----+-----+-----+-----+
|  ·  |  ·  |  ·  |  ·  |
+-----+-----+-----+-----+
```

### 像素定位与布局参数
- 单元格尺寸：`cellSize = 24px`
- 内部分隔线（单元格之间的边线）：`innerBorder = 1px`
- 外边框：`outerBorder = 1px`
- 容器布局：`gridTemplateColumns: repeat(5, 24px)`，`gridAutoRows: 24px`，`position: relative`

交叉点像素坐标（用于在交点绘制选中圆点）：

```text
step = 0.25
selectedRowIndexRaw = round(D / step)
selectedColIndexRaw = round(W / step)
selectedRowIndex = clamp(selectedRowIndexRaw, 0, 4)
selectedColIndex = clamp(selectedColIndexRaw, 0, 4)

selectedDotLeft = outerBorder
                  + selectedColIndex * (cellSize + innerBorder)
                  + (selectedColIndex === 4 ? cellSize : 0)
selectedDotTop  = outerBorder
                  + selectedRowIndex * (cellSize + innerBorder)
                  + (selectedRowIndex === 4 ? cellSize : 0)
```

- 以上“末列/末行”加 `cellSize` 的处理，确保当 W=1.00 或 D=1.00 时，交叉点精确落在右/下外边框上（视觉上对齐到边界线）。

### 交互与可访问性
- 点击任一单元格，会将 `researchParams = { wide: colIndex * step, deep: rowIndex * step }`，从而把选中锚点定位在该单元格左上角的交叉点。
- 当鼠标悬停在“与当前选中交叉点对应的单元格”上时，在交叉点上方显示提示气泡：
  - 格式：`W xx • D xx • A (xx)`（A 为面积，保留两位小数）。
  - 容器 `overflow: visible`，以允许气泡溢出显示；气泡具有投影与边框以保持可读性。
- 无障碍：单元格具备 `aria-label`（包含 W、D 数值）与 `aria-pressed`（是否为选中值）。

### 颜色体系（当前取值）
- 外框/分隔线：`#2a2a2a`
- 未覆盖单元格底色：常态 `#141414`，hover `#1b1b1b`
- 覆盖单元格底色：常态 `#1f1f1f`，hover `#262626`
- 选中交叉点圆点：`#ffffff`（带轻微阴影）
- 轴标签与数值：`#777`/`#bbb`

### 设计取舍与扩展
- 选择“交叉点”而非“单元格中心”，可使“面积 = W×D”的心智模型更直观（面积边界严格贴合网格线）。
- 若未来需要 N×N 网格，推荐步长 `step = 1 / (N - 1)` 以保证选值分布与网格线一致；像素定位仅需相应调整 `gridTemplateColumns/Rows` 与 `clamp` 上限。
- 可选增强：
  - 交叉点支持拖拽微调（按步长吸附）。
  - 数值气泡改为常显，或仅在选中改变时短暂出现。


