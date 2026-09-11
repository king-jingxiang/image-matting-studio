# Image Matting Studio

[English](README.md) | 简体中文

一个轻量级的在线图像抠图与精灵拆分工具。可以去除纯色背景、生成平滑的透明边缘，并将结果拆分为独立的行或元素导出。

![Vite](https://img.shields.io/badge/vite-5.x-646cff?style=flat&logo=vite)
![React](https://img.shields.io/badge/react-18-61dafb?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178c6?style=flat&logo=typescript)

**在线预览**：[https://king-jingxiang.github.io/image-matting-studio/](https://king-jingxiang.github.io/image-matting-studio/)

**代码仓库**：[https://github.com/king-jingxiang/image-matting-studio](https://github.com/king-jingxiang/image-matting-studio)

---

## 功能特性

- 基于估计背景色的**背景去除**，支持调节软边缘阈值。
- **Alpha 遮罩生成**，边缘过渡自然平滑。
- **形态学膨胀**，填补小孔洞、连接断裂区域。
- **连通区域过滤**，按最小面积去除噪点。
- **行分组与精灵拆分**，支持导出为 PNG 或 ZIP。

---

## 参数说明

### 参数总览

| 参数 | 默认值 | 调节范围 | 作用阶段 |
|---|---|---|---|
| 软边缘低阈值 `t0` | 10 | 0 ~ 100 | 前景/背景分离 |
| 软边缘高阈值 `t1` | 60 | 10 ~ 200 | 前景/背景分离 |
| 膨胀半径 | 1 px | 0 ~ 5 | 掩膜形态学处理 |
| 最小面积 | 50 | 10 ~ 500 | 连通区域过滤 |
| 行合并间距系数 | 0.60 | 0 ~ 2.0 | 行分组合并 |

### t0 — 软边缘低阈值

控制像素被判定为背景的严格程度。

程序会计算每个像素颜色与估计背景色的欧氏距离 `dist`：

- `dist <= t0` → 背景，alpha = 0
- `dist >= t1` → 前景，alpha = 255
- `t0 < dist < t1` → alpha 在 0 ~ 255 之间线性过渡

- **t0 越大**：越多接近背景色的像素变为透明，前景区域缩小，边缘更收缩。
- **t0 越小**：保留更多像素为前景，可能混入背景杂色。

### t1 — 软边缘高阈值

控制像素被判定为前景的严格程度。`t1` 必须大于 `t0`。

- **t1 越大**：只有与背景色差异很大的像素才会完全不透明，过渡区变宽。
- **t1 越小**：更多像素直接变为不透明，前景区域变实、变大。

### 膨胀半径

对前景掩膜进行形态学膨胀的迭代次数（8 邻域）。

- **0**：不膨胀，保留原始掩膜。
- **数值越大**：前景区域向外扩展，可填补小孔洞、连接断裂部分。
- **过大时**：相邻元素可能被粘连，导致后续分割变少。

### 最小面积

连通区域的最小像素数阈值。

- **数值越大**：只保留较大的元素，去除噪点和小碎片。
- **数值越小**：保留更多细小元素，但可能带来噪点。

### 行合并间距系数

控制同一行元素之间的横向间距容忍度。当两个元素满足：

- 垂直方向重叠比例 ≥ 0.5（固定阈值）
- 水平间距 < min(两元素高度) × 行合并间距系数

时，会被合并为同一行。

- **数值越大**：相距较远的元素也会被合并到同一行。
- **数值越小**：只有挨得很近的元素才会被视为同一行，分组更严格。
- **0**：基本只合并水平相邻且高度相近的元素。

---

## 推荐调节顺序

1. **先调 t0 / t1**：让前景和背景分离清晰，软边缘自然。
2. **再调膨胀半径**：修复缺口或断开的部分，或减少粘连。
3. **再调最小面积**：过滤掉不需要的噪点和细小碎片。
4. **最后调行合并间距系数**：根据元素布局调整行的分组粒度。

---

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

---

## 部署到 GitHub Pages

本仓库已包含 GitHub Actions 工作流（`.github/workflows/deploy.yml`），每次 push 到 `main` 分支时会自动构建并部署到 GitHub Pages。

### 配置步骤

1. 将代码 push 到 GitHub。
2. 进入仓库 **Settings → Pages**。
3. 在 **Build and deployment → Source** 中选择 **GitHub Actions**。
4. 向 `main` 分支 push 一次代码触发构建。

部署完成后访问：

```
https://king-jingxiang.github.io/image-matting-studio/
```

---

## 许可证

MIT
