'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

// All user-facing strings live here. Default language is Simplified Chinese.
// Add a new language by extending the `Translations` interface and providing a dictionary.

export type LangCode = 'zh-CN' | 'en';

export interface Translations {
  // App / window
  appTitle: string;
  appSubtitle: string;

  // Title bar
  minimize: string;
  maximize: string;
  restore: string;
  close: string;

  // Sidebar tabs
  collections: string;
  templates: string;
  addCollection: string;
  noCollections: string;
  noCollectionsHint: string;

  // Collection list
  collectionCount: (n: number) => string;
  videoCount: (n: number) => string;
  renameCollection: string;
  removeCollection: string;
  confirmRemoveCollection: (name: string) => string;

  // Add collection dialog
  addCollectionDialogTitle: string;
  addCollectionDialogDesc: string;
  browsePlaceholder: string;
  browse: string;
  cancel: string;
  save: string;
  add: string;
  scanning: string;
  pathPlaceholder: string;
  browseOnlyInDesktop: string;

  // Rename dialog
  renameDialogTitle: string;
  renameDialogDesc: string;
  folderLabel: string;
  collectionNamePlaceholder: string;

  // Template list
  maskTemplates: string;
  noTemplates: string;
  noTemplatesHint: string;
  applyTo: string;
  applyVideo: string;
  applyCollection: string;
  applyAll: string;
  deleteTemplate: string;
  confirmDeleteTemplate: (name: string) => string;

  // Main view / welcome
  welcome: string;
  welcomeHint: string;

  // Video list
  searchVideosPlaceholder: string;
  noVideosInFolder: string;
  noVideosMatchSearch: string;
  selectVideo: string;
  selectVideoHint: string;

  // Player controls
  play: string;
  pause: string;
  previousFrame: string;
  nextFrame: string;
  mute: string;
  unmute: string;
  toggleLoop: string;
  loopOn: string;
  loopOff: string;
  fullscreen: string;
  playbackSpeed: string;
  toggleMaskPanel: string;
  saveAsTemplate: string;
  saveAsTemplateHint: string;

  // Layer panel
  maskTools: string;
  hidePanel: string;
  selectTool: string;
  rectTool: string;
  circleTool: string;
  ellipseTool: string;
  polygonTool: string;
  curveTool: string;
  fillLabel: string;
  resetColor: string;
  selectToolHint: string;
  drawShapeHint: string;
  drawPolyHint: string;
  layersCount: (n: number) => string;
  noMasks: string;
  noMasksHint: string;
  clearAll: string;
  deleteLayer: string;
  editPoints: string;
  stopEditing: string;
  fromTemplate: string;

  // Save template dialog
  saveTemplateTitle: string;
  saveTemplateDesc: (n: number) => string;
  templateNamePlaceholder: string;
  orUpdateExisting: string;
  update: string;
  noMasksToSave: string;
  noMasksToSaveHint: string;
  ok: string;
  untitledTemplate: string;

  // Errors
  cannotPlay: (name: string) => string;
  cannotPlayHint: string;

  // Misc
  appName: string;
}

const zhCN: Translations = {
  appTitle: 'mkVideo',
  appSubtitle: '马克视频',

  minimize: '最小化',
  maximize: '最大化',
  restore: '还原',
  close: '关闭',

  collections: '播放合集',
  templates: '遮罩模板',
  addCollection: '添加合集',
  noCollections: '暂无播放合集',
  noCollectionsHint: '点击"添加"，选择一个本地视频文件夹。',

  collectionCount: (n) => `${n} 个合集`,
  videoCount: (n) => `${n} 个视频`,
  renameCollection: '重命名合集',
  removeCollection: '删除合集',
  confirmRemoveCollection: (name) => `确定要删除合集"${name}"吗？\n不会删除磁盘上的文件。`,

  addCollectionDialogTitle: '添加播放合集',
  addCollectionDialogDesc: '选择一个包含视频文件的文件夹。mkVideo 会扫描该文件夹内支持的视频格式（mp4、mkv、avi、mov 等）。',
  browsePlaceholder: 'C:\\Users\\你的名字\\Videos',
  browse: '浏览…',
  cancel: '取消',
  save: '保存',
  add: '添加',
  scanning: '扫描中…',
  pathPlaceholder: '请输入文件夹路径或点击浏览…',
  browseOnlyInDesktop: '文件夹选择器仅在桌面应用中可用，请使用 npm run tauri:dev 运行。',

  renameDialogTitle: '重命名合集',
  renameDialogDesc: '显示名可以与磁盘上的文件夹名不同。',
  folderLabel: '文件夹：',
  collectionNamePlaceholder: '合集名称',

  maskTemplates: '遮罩模板',
  noTemplates: '暂无模板',
  noTemplatesHint: '在播放视频时画好遮罩，然后点击"另存为模板"，即可创建可复用的遮罩模板。',
  applyTo: '应用范围：',
  applyVideo: '🎬 当前视频',
  applyCollection: '📁 当前合集',
  applyAll: '🌐 所有视频',
  deleteTemplate: '删除模板',
  confirmDeleteTemplate: (name) => `确定要删除模板"${name}"吗？\n所有应用此模板的范围也会一并取消。`,

  welcome: '欢迎使用 mkVideo',
  welcomeHint: '从左侧侧边栏添加一个视频文件夹即可开始使用。在视频上画遮罩，可以遮挡水印、字幕等不想看到的内容。',

  searchVideosPlaceholder: '搜索视频…',
  noVideosInFolder: '该文件夹内没有视频文件。',
  noVideosMatchSearch: '没有匹配的视频。',
  selectVideo: '选择一部视频',
  selectVideoHint: '从左侧列表中选择一部视频，或按 ← / → 切换。',

  play: '播放',
  pause: '暂停',
  previousFrame: '上一帧',
  nextFrame: '下一帧',
  mute: '静音',
  unmute: '取消静音',
  toggleLoop: '循环',
  loopOn: '已开启循环',
  loopOff: '未开启循环',
  fullscreen: '全屏',
  playbackSpeed: '播放倍速',
  toggleMaskPanel: '遮罩工具',
  saveAsTemplate: '另存为模板',
  saveAsTemplateHint: '把当前遮罩另存为可复用的模板',

  maskTools: '🎭 遮罩工具',
  hidePanel: '收起面板',
  selectTool: '✋ 选择',
  rectTool: '▭ 矩形',
  circleTool: '○ 圆形',
  ellipseTool: '⬭ 椭圆',
  polygonTool: '⬡ 多边形',
  curveTool: '∿ 曲线',
  fillLabel: '填充：',
  resetColor: '默认',
  selectToolHint: '单击遮罩选中，拖动调整大小，拖动内部移动。多边形/曲线图层可在右侧点击"编辑顶点"。',
  drawShapeHint: '在视频画面上按住拖动，绘制新遮罩。',
  drawPolyHint: '单击添加顶点，双击或回车完成，按 Esc 取消。',
  layersCount: (n) => `图层（${n}）`,
  noMasks: '当前视频上还没有遮罩',
  noMasksHint: '选择上方形状，然后在视频上画遮罩。',
  clearAll: '清空全部',
  deleteLayer: '删除',
  editPoints: '编辑顶点',
  stopEditing: '停止编辑',
  fromTemplate: ' · 来自模板',

  saveTemplateTitle: '另存为遮罩模板',
  saveTemplateDesc: (n) => `将当前 ${n} 个遮罩保存为可复用模板。保存后可一键应用到单部视频、整个合集或库中所有视频。`,
  templateNamePlaceholder: '例如：水印遮挡',
  orUpdateExisting: '或更新已有模板：',
  update: '更新',
  noMasksToSave: '当前没有遮罩可保存',
  noMasksToSaveHint: '请先在视频上画出至少一个遮罩，再回到这里保存为模板。',
  ok: '好的',
  untitledTemplate: '未命名模板',

  cannotPlay: (name) => `无法播放 "${name}"`,
  cannotPlayHint: '当前构建可能不支持该视频的编码。请尝试安装额外的编解码器，或将视频转换为 H.264 / MP4。',

  appName: 'mkVideo - 马克视频',
};

const en: Translations = {
  appTitle: 'mkVideo',
  appSubtitle: 'MarkAVideo',

  minimize: 'Minimize',
  maximize: 'Maximize',
  restore: 'Restore',
  close: 'Close',

  collections: 'Collections',
  templates: 'Templates',
  addCollection: 'Add',
  noCollections: 'No collections yet',
  noCollectionsHint: 'Click "Add" to add a local folder.',

  collectionCount: (n) => `${n} collection${n === 1 ? '' : 's'}`,
  videoCount: (n) => `${n} video${n === 1 ? '' : 's'}`,
  renameCollection: 'Rename',
  removeCollection: 'Remove',
  confirmRemoveCollection: (name) => `Remove collection "${name}"?\nFiles on disk will not be deleted.`,

  addCollectionDialogTitle: 'Add a collection',
  addCollectionDialogDesc: 'Select a folder containing videos. mkVideo will scan for supported video files (mp4, mkv, avi, mov, etc.).',
  browsePlaceholder: 'C:\\Users\\You\\Videos',
  browse: 'Browse…',
  cancel: 'Cancel',
  save: 'Save',
  add: 'Add',
  scanning: 'Scanning…',
  pathPlaceholder: 'Enter folder path or click Browse…',
  browseOnlyInDesktop: 'Folder picker is only available in the desktop app. Run "npm run tauri:dev" to test.',

  renameDialogTitle: 'Rename collection',
  renameDialogDesc: 'The display name can be different from the folder name on disk.',
  folderLabel: 'Folder:',
  collectionNamePlaceholder: 'Collection name',

  maskTemplates: 'Mask templates',
  noTemplates: 'No templates yet',
  noTemplatesHint: 'While watching a video, draw some masks and click "Save as Template" to create a reusable mask template.',
  applyTo: 'Apply to:',
  applyVideo: '🎬 Video',
  applyCollection: '📁 Collection',
  applyAll: '🌐 All',
  deleteTemplate: 'Delete template',
  confirmDeleteTemplate: (name) => `Delete template "${name}"?\nThis will also remove all its applications.`,

  welcome: 'Welcome to mkVideo',
  welcomeHint: 'Add a folder of videos from the sidebar to get started. Draw mask shapes over the video to hide watermarks, subtitles, and other unwanted content.',

  searchVideosPlaceholder: 'Search videos…',
  noVideosInFolder: 'No videos in this folder.',
  noVideosMatchSearch: 'No videos match search.',
  selectVideo: 'Select a video',
  selectVideoHint: 'Pick a video from the list, or press ← / → to switch.',

  play: 'Play',
  pause: 'Pause',
  previousFrame: 'Previous frame',
  nextFrame: 'Next frame',
  mute: 'Mute',
  unmute: 'Unmute',
  toggleLoop: 'Loop',
  loopOn: 'Loop on',
  loopOff: 'Loop off',
  fullscreen: 'Fullscreen',
  playbackSpeed: 'Playback speed',
  toggleMaskPanel: 'Masks',
  saveAsTemplate: 'Save as Template',
  saveAsTemplateHint: 'Save current masks as a reusable template',

  maskTools: '🎭 Mask Tools',
  hidePanel: 'Hide panel',
  selectTool: '✋ Select',
  rectTool: '▭ Rect',
  circleTool: '○ Circle',
  ellipseTool: '⬭ Ellipse',
  polygonTool: '⬡ Polygon',
  curveTool: '∿ Curve',
  fillLabel: 'Fill:',
  resetColor: 'Reset',
  selectToolHint: 'Click on a mask to select. Drag handles to resize. Drag inside to move. Polygon/curve layers support "Edit Points" in the panel.',
  drawShapeHint: 'Drag on the video to draw a new mask.',
  drawPolyHint: 'Click to add points. Double-click or press Enter to finish. Press Esc to cancel.',
  layersCount: (n) => `Layers (${n})`,
  noMasks: 'No masks on this video yet.',
  noMasksHint: 'Pick a shape above and draw on the video.',
  clearAll: 'Clear all',
  deleteLayer: 'Delete',
  editPoints: 'Edit points',
  stopEditing: 'Stop editing',
  fromTemplate: ' · from template',

  saveTemplateTitle: 'Save mask template',
  saveTemplateDesc: (n) => `Save these ${n} mask${n === 1 ? '' : 's'} as a reusable template. You can then apply this template to a video, a whole collection, or all videos at once.`,
  templateNamePlaceholder: 'e.g. Watermark removal',
  orUpdateExisting: 'Or update an existing template:',
  update: 'Update',
  noMasksToSave: 'No masks to save',
  noMasksToSaveHint: 'Draw some masks first, then come back to save them as a reusable template.',
  ok: 'OK',
  untitledTemplate: 'Untitled Template',

  cannotPlay: (name) => `Cannot play "${name}"`,
  cannotPlayHint: 'The codec may not be supported by this build. Try installing additional codecs, or convert to H.264 / MP4.',

  appName: 'mkVideo - MarkAVideo',
};

const dictionaries: Record<LangCode, Translations> = {
  'zh-CN': zhCN,
  en,
};

interface I18nContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Default and only initial language is zh-CN.
  const [lang, setLang] = useState<LangCode>('zh-CN');

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: dictionaries[lang],
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useT(): Translations {
  return useI18n().t;
}