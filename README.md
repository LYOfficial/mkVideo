# mkVideo（MarkAVideo）

> **一款可以在视频上"打标记"的 Windows 视频播放器。**

mkVideo 是一款基于 **Tauri 2**（Rust）+ **Next.js**（React/TypeScript）开发的轻量级桌面视频播放器。它最具特色的功能是内置的 **遮罩画笔工具箱** —— 你可以在视频上叠加任意形状（矩形、圆形、椭圆、多边形、自由曲线），用来遮挡水印、字幕、Logo 或任何不想看到的内容。画好的遮罩可以保存为 **模板**，并一键 **批量应用** 到单个视频、整个播放合集，或者库里的全部视频。

---

## ✨ 功能特性

### 📂 播放合集（库管理）
- 把 **本地文件夹** 添加为"播放合集"。
- 添加时递归扫描（最多 3 层子目录），自动识别常见的视频文件。
- **自由重命名**合集 —— 显示名可以和文件夹路径完全无关。
- 合集内可对视频进行 **模糊搜索**。
- 侧边栏展示视频数量与总大小。
- 支持的视频格式：`mp4, mkv, avi, mov, wmv, flv, webm, m4v, mpg, mpeg, mpe, 3gp, ts, m2ts, vob, ogv, ogg, rm, rmvb, asf, amv, m4p, f4v, f4p` 等 30 余种。

### 🎬 视频播放器
- 原生 HTML5 `<video>` 渲染，通过 WebView2 硬件加速。
- 完整的播放控件：播放 / 暂停 / 进度拖拽 / 音量 / 静音 / 循环 / 全屏。
- 可调 **播放倍速**（0.25× ～ 3×）。
- **单帧步进**（`←` `→` 与 `,` `.`）。
- 当前视频播放结束后自动播放下一部（可由循环开关覆盖）。
- 全局键盘快捷键（`Space` `K` `←` `→` `,` `.` `M` `L` `F` `Delete` `Esc`）。
- 播放进度与音量等状态自动记忆。

### 🎭 遮罩画笔工具箱
五种形状，全部渲染在与视频等比缩放的透明 Canvas 画布上：

| 形状 | 说明 |
|---|---|
| `矩形` | 拖拽绘制，8 个调节手柄，支持圆角 |
| `圆形` | 拖拽绘制，4 个调节手柄 |
| `椭圆` | 拖拽绘制，4 个调节手柄（rx / ry 独立调节） |
| `多边形` | 逐点单击添加顶点，双击或回车闭合 |
| `曲线` | 自由平滑曲线（通过中点的二次贝塞尔），可开放可闭合 |

- **任意填充色** —— 通过原生颜色选择器选取（默认纯黑、不透明）。也可在色板旁的文本框中输入任意 hex 值。
- **同一视频支持多个遮罩**，并提供完整的图层面板：拖动调整叠加顺序、单击选中。
- **选择 / 移动 / 缩放** —— 每种形状都可以像 Photoshop 那样精确编辑。
- **多边形 / 曲线的顶点编辑模式** —— 拖动单个锚点微调形状。
- **删除** —— 通过图层面板、键盘快捷键（`Delete` / `Backspace`），或"清空全部"。
- **可见性 / 锁定** —— 每个图层可独立切换。

### 💾 遮罩模板与批量应用
- **将当前遮罩另存为模板** —— 命名后可跨视频复用。
- 三种应用范围，一键切换：
  - 🎬 **视频** —— 仅应用到当前选中的视频。
  - 📁 **合集** —— 应用到当前合集内的所有视频。
  - 🌐 **全部** —— 应用到库里的每一个视频。
- 再点一次同范围按钮即可取消应用。
- 在任意一个视频上编辑遮罩，都会回写到对应模板，因此应用范围里其他视频会自动同步更新。
- 保存模板时可选择"覆盖现有模板"，把当前画布上的遮罩写回已存在的模板。

### 💽 数据持久化
- 所有合集、模板、应用关系都持久化在本地：
  - **Tauri 打包版本**：`%APPDATA%\com.lyofficial.mkvideo\mkvideo-data.json`
  - **浏览器开发模式**：`localStorage`（仅用于 `npm run dev` 快速调试）
- 每次变更后自动保存（防抖 300 ms）。

### 🎨 界面与交互
- 自定义 **无边框窗口**，自带手绘标题栏（`─` `❐`/`☐` `✕`），支持整行拖拽。
- 暗色主题，Tailwind 设计系统统一管理。
- 完全响应式布局 —— 侧边栏 / 视频列表 / 播放器 / 图层面板均可独立隐藏。
- 图层面板可临时收起，不丢失任何状态。

---

## 📦 安装使用（终端用户）

1. 下载最新发行版中的 **`mkVideo_1.0.0_x64-setup.exe`** 安装包。
2. 双击运行安装程序（无需管理员权限，每用户安装）。
3. 在开始菜单中找到并启动 **mkVideo**。
4. Windows 11 自带 WebView2 运行时，绝大多数 Windows 10 也已自带。若打开后窗口是空白的，请从 <https://developer.microsoft.com/microsoft-edge/webview2/> 下载并安装 WebView2 Runtime。

> 项目同时提供了免安装的便携版 **`mkvideo.exe`**，直接双击即可使用。

---

## 🛠 开发环境搭建

### 环境要求
- **Node.js ≥ 18**（已在 24.13 上验证）
- **Rust stable**（已在 1.93 上验证），含 `x86_64-pc-windows-msvc` 工具链
- **Microsoft Visual Studio Build Tools**，并安装"使用 C++ 的桌面开发"工作负载
- **WebView2 Runtime**（Windows 11 自带）

### 安装依赖
```bash
git clone <repo>
cd mkVideo
npm install
```

### 开发模式（热更新）
```bash
npm run tauri:dev
```
该命令会启动 Tauri 外壳并启动 Next.js 开发服务器。前端支持热更新；Rust 端修改后会自动重新编译。

### 生产构建（Windows 安装包 + 便携 .exe）
```bash
npm run tauri:build
```
构建产物：
- `src-tauri/target/release/mkvideo.exe` —— 免安装便携版
- `src-tauri/target/release/bundle/nsis/mkVideo_1.0.0_x64-setup.exe` —— NSIS 安装包

### 仅前端（浏览器开发，不含 Tauri 外壳）
```bash
npm run dev
```
浏览器访问 <http://localhost:3000>。该模式下文件夹扫描是占位的，仅用于调试 UI。

---

## ⌨ 键盘快捷键

| 按键 | 功能 |
|---|---|
| `Space` / `K` | 播放 / 暂停 |
| `←` / `→` | 进度 ±5 秒 |
| `Shift` + `←` / `→` | 上一部 / 下一部视频 |
| `,` / `.` | 上一帧 / 下一帧 |
| `M` | 静音 / 取消静音 |
| `L` | 切换循环 |
| `F` | 切换全屏 |
| `Delete` / `Backspace` | 删除当前选中的遮罩 |
| `Esc` | 退出多边形/曲线绘制 / 退出顶点编辑 / 切换回选择工具 |
| `Enter` | 完成多边形/曲线的绘制 |
| 单击视频画面 | 切换播放 / 暂停 |

> 当焦点位于文本输入框中时，所有快捷键自动失效，避免误触。

---

## 🧩 项目结构

```
mkVideo/
├── src/                          # Next.js（App Router）+ React
│   ├── app/
│   │   ├── layout.tsx           # 根布局与全局 Provider
│   │   ├── page.tsx             # 主界面（标题栏 + 侧边栏 + 主视图）
│   │   └── globals.css          # Tailwind 与设计令牌
│   ├── components/
│   │   ├── TitleBar.tsx         # 自定义无边框窗口标题栏
│   │   ├── Sidebar.tsx          # 标签页（合集 / 模板）
│   │   ├── CollectionList.tsx   # 侧边栏合集列表
│   │   ├── TemplateList.tsx     # 侧边栏模板列表 + 应用范围按钮
│   │   ├── VideoList.tsx        # 当前合集的视频浏览器
│   │   ├── VideoPlayer.tsx      # 主播放画面与键盘事件
│   │   ├── MaskCanvas.tsx       # 遮罩画布（绘制 / 选择 / 编辑）
│   │   ├── LayerPanel.tsx       # 右侧工具 + 图层面板
│   │   ├── PlayerControls.tsx   # 底部播放控制条
│   │   ├── AddCollectionDialog.tsx
│   │   ├── RenameCollectionDialog.tsx
│   │   └── SaveTemplateDialog.tsx
│   └── lib/
│       ├── AppContext.tsx       # 合集 / 模板 / 应用关系 状态管理
│       ├── PlayerContext.tsx    # 当前选中的合集 / 视频状态
│       ├── storage.ts           # Tauri Store 封装 + localStorage 兜底
│       ├── tauri.ts             # invoke('scan_folder', …) 等命令的封装
│       ├── types.ts             # 共享 TypeScript 类型（与 Rust 类型镜像）
│       └── masks.ts             # 遮罩几何 / 命中检测 / 绘制 / 平移
└── src-tauri/                    # Rust 后端
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/default.json # Tauri 2 权限声明
    ├── icons/                    # 32x32, 128x128, 128x128@2x, .ico, .icns
    └── src/
        ├── main.rs               # 入口；Release 下隐藏控制台
        └── lib.rs                # #[tauri::command]：
                                  #   scan_folder, rescan_collection,
                                  #   check_path_exists, get_app_data_dir
```

### 数据模型

```ts
Collection       { id, name, path, videos[], created_at, updated_at }
VideoFile        { id, path, name, size, extension }
MaskTemplate     { id, name, masks[], created_at, updated_at }
Mask             = RectMask | CircleMask | EllipseMask | PolygonMask | CurveMask
MaskApplication  { templateId, scope: 'video'|'collection'|'all', targetId }
```

所有遮罩坐标都使用 **归一化 0~1** 表示，相对的是视频画面的显示区域。这意味着无论窗口大小、视频分辨率如何变化，遮罩的位置与形状都保持视觉一致。

### 遮罩解析顺序（一个视频上最终显示哪些遮罩）
对于合集 `C` 中的视频 `V`，mkVideo 会按下列顺序合成所有可用的遮罩：
1. 所有 `scope='video'` 且 `targetId === V.id` 的应用关系对应的模板
2. 加上所有 `scope='collection'` 且 `targetId === C.id` 的应用关系对应的模板
3. 加上所有 `scope='all'` 且 `targetId === 'all'` 的应用关系对应的模板

---

## 🎯 设计决策

- **为什么选 Tauri + Next.js 而不是 Electron？** Tauri 产物体积约为 5 MB 的便携 exe 和 2 MB 的安装包，而 Electron 通常 100 MB+。Rust 端负责文件系统扫描（比 JS 快约 3 倍），React 端负责 UI。
- **为什么用 Canvas 画遮罩而不是 SVG / DOM？** Canvas 即使在数百次编辑后仍能保持 60 fps，并且与底层视频的编解码、变换完全解耦。
- **为什么用归一化坐标？** 它让遮罩与视频实际像素分辨率以及窗口大小解耦。在 1080p 视频上调整好的位置，在 4K 视频上看起来完全一致。
- **为什么用模板而不是"每个视频一份遮罩"？** 模板是核心杀手锏：支持一键批量应用到整个库。当你重新整理视频文件时，模板也跟着你走。

---

## 🐛 常见问题

| 现象 | 解决办法 |
|---|---|
| 启动后窗口空白 | 安装 WebView2 Runtime（见上文链接）。 |
| 播放器提示"无法播放 X" | 该视频使用了系统未安装的解码器（例如老系统上的 HEVC）。可在 Microsoft Store 安装 **HEVC 视频扩展**，或转码为 H.264 / MP4。 |
| 文件夹选择器无法打开 | 请使用 Tauri 构建版本（`npm run tauri:dev` 或安装后的 `.exe`），而不是纯 `npm run dev` 浏览器模式。 |
| 切换视频后遮罩不显示 | 需要先在侧边栏"Templates"标签中点击 🎬 Video / 📁 Collection / 🌐 All 把模板应用过来。 |
| 想清空全部数据 | 删除 `%APPDATA%\com.lyofficial.mkvideo\mkvideo-data.json` 即可重置。 |

---

## 📜 许可证

MIT 协议 —— 详见 [LICENSE](LICENSE)。

---

## 🙏 致谢

本项目使用以下开源技术构建：

- [Tauri](https://tauri.app) —— 基于 Rust 的桌面应用外壳
- [Next.js](https://nextjs.org) —— React 全栈框架
- [Tailwind CSS](https://tailwindcss.com) —— 设计系统
- [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) —— Windows 渲染引擎