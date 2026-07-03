// Type definitions for mkVideo
// These mirror the Rust backend types for collections and videos

export interface VideoFile {
  id: string;
  path: string;
  name: string;
  size: number;
  extension: string;
}

export interface Collection {
  id: string;
  name: string;     // user-defined display name (may differ from folder name)
  path: string;     // original folder path
  videos: VideoFile[];
  created_at: number;
  updated_at: number;
}

// Mask shapes - used for blocking watermark/subtitles/etc.
export type MaskShapeType = 'rect' | 'circle' | 'ellipse' | 'polygon' | 'curve';

export interface BaseMask {
  id: string;
  type: MaskShapeType;
  // Position in normalized [0..1] coordinates of the video display area,
  // so that masks scale with the video when window is resized.
  // Video-display coordinates are mapped to a 0..1 range to handle variable aspect ratios.
  fill: string;         // color (hex / rgba). Default: black (#000000) opaque
  opacity: number;      // 0..1
  // Whether mask is currently locked (cannot be edited)
  locked: boolean;
  // Visibility toggle
  visible: boolean;
  // Optional name/label for layer panel
  name?: string;
}

export interface RectMask extends BaseMask {
  type: 'rect';
  x: number;            // top-left x (normalized 0..1)
  y: number;            // top-left y
  w: number;            // width
  h: number;            // height
  borderRadius?: number; // for rounded corners (normalized)
}

export interface CircleMask extends BaseMask {
  type: 'circle';
  cx: number;           // center x
  cy: number;           // center y
  r: number;            // radius
}

export interface EllipseMask extends BaseMask {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface PolygonMask extends BaseMask {
  type: 'polygon';
  points: { x: number; y: number }[];   // normalized
}

export interface CurveMask extends BaseMask {
  type: 'curve';
  points: { x: number; y: number }[];   // anchor points for the smooth curve
  closed: boolean;                      // whether path is closed
}

export type Mask = RectMask | CircleMask | EllipseMask | PolygonMask | CurveMask;

// Mask assignment policy
export type MaskApplyScope = 'video' | 'collection' | 'all';

// Mask template is a named group of masks reusable across scopes
export interface MaskTemplate {
  id: string;
  name: string;
  masks: Mask[];
  created_at: number;
  updated_at: number;
}

// Persisted application: which template is applied to which entity
export interface MaskApplication {
  templateId: string;
  // Scope kind
  scope: MaskApplyScope;
  // The target id (videoId, collectionId, or 'all')
  targetId: string;
}

// Player state (runtime only)
export interface PlayerState {
  currentVideoId: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  fullscreen: boolean;
  loop: boolean;
}

export interface AppData {
  collections: Collection[];
  templates: MaskTemplate[];
  applications: MaskApplication[];
}