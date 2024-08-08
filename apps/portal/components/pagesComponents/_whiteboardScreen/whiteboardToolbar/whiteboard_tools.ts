import brush from 'public/assets/svg/whiteboard-tools-panel/draw.svg';
import rect from 'public/assets/svg/whiteboard-tools-panel/rect.svg';
import text from 'public/assets/svg/whiteboard-tools-panel/text.svg';
import comments from 'public/assets/svg/whiteboard-tools-panel/comments.svg';
import plus from 'public/assets/svg/whiteboard-tools-panel/Plus.svg';
import stickers from 'public/assets/svg/whiteboard-tools-panel/stickers.svg';
import undo from 'public/assets/svg/whiteboard-tools-panel/undo.svg';
import redo from 'public/assets/svg/whiteboard-tools-panel/redo.svg';
import note from 'public/assets/svg/whiteboard-tools-panel/note.svg';
import transcripe from 'public/assets/svg/whiteboard-tools-panel/transcripe.svg';
import blur from 'public/assets/svg/whiteboard-tools-panel/blur.svg';
import trim from 'public/assets/svg/whiteboard-tools-panel/cut.svg';
import thumbnail from 'public/assets/svg/whiteboard-tools-panel/thumbnail.svg';
import cta from 'public/assets/svg/whiteboard-tools-panel/call-to-action.svg';
import download from 'public/assets/svg/whiteboard-tools-panel/download.svg';
import remove from 'public/assets/svg/whiteboard-tools-panel/remove.svg';
import lock from 'public/assets/svg/whiteboard-tools-panel/lock.svg';
import circle from 'public/assets/svg/whiteboard-tools-panel/circle.svg';
import triangle from 'public/assets/svg/whiteboard-tools-panel/polygon.svg';
import star from 'public/assets/svg/whiteboard-tools-panel/star.svg';
import placeImg from 'public/assets/svg/whiteboard-tools-panel/image.svg';
import record from 'public/assets/svg/whiteboard-tools-panel/record.svg';
import task from 'public/assets/svg/whiteboard-tools-panel/task.svg';
import tag from 'public/assets/svg/whiteboard-tools-panel/tag.svg';
import upload from 'public/assets/svg/whiteboard-tools-panel/upload.svg';

export interface ITool {
  tool: ToolName;
  title?: string;
  icon: string;
  cursor?: string;
}

export type ToolName =
  | 'plus'
  | 'comments'
  | 'text'
  | 'rectangular'
  | 'circle'
  | 'polygon'
  | 'star'
  | 'image'
  | 'drawer'
  | 'stickers'
  | 'undo'
  | 'redo'
  | 'note'
  | 'transcripe'
  | 'blur'
  | 'trim'
  | 'thumbnail'
  | 'cta'
  | 'download'
  | 'remove'
  | 'lock'
  | 'pointer'
  | 'record'
  | 'task'
  | 'tag'
  | 'upload'

export const tools: Record<ToolName, ITool> = {
  plus: {
    tool: 'plus',
    title: 'Plus',
    icon: plus,
  },
  comments: {
    tool: 'comments',
    title: 'Add comment',
    icon: comments,
  },
  text: {
    tool: 'text',
    title: 'Text',
    icon: text,
    cursor: 'text',
  },
  rectangular: {
    tool: 'rectangular',
    title: 'Rectangle',
    icon: rect,
  },
  circle: {
    tool: 'circle',
    title: 'Circle',
    icon: circle,
  },
  polygon: {
    tool: 'polygon',
    title: 'Polygon',
    icon: triangle,
  },
  star: {
    tool: 'star',
    title: 'Star',
    icon: star,
  },
  image: {
    tool: 'image',
    title: 'Place image',
    icon: placeImg,
  },
  drawer: {
    tool: 'drawer',
    title: 'Drawing',
    icon: brush,
  },
  stickers: {
    tool: 'stickers',
    title: 'Stickers',
    icon: stickers,
  },
  undo: {
    tool: 'undo',
    title: 'Undo',
    icon: undo,
  },
  redo: {
    tool: 'redo',
    title: 'Redo',
    icon: redo,
  },
  note: {
    tool: 'note',
    title: 'Add note',
    icon: note,
  },
  transcripe: {
    tool: 'transcripe',
    title: 'Transcripe media',
    icon: transcripe,
  },
  blur: {
    tool: 'blur',
    title: 'Blur',
    icon: blur,
  },
  trim: {
    tool: 'trim',
    title: 'Trim & cut',
    icon: trim,
  },
  thumbnail: {
    tool: 'thumbnail',
    title: 'Change thumbnail',
    icon: thumbnail,
  },
  cta: {
    tool: 'cta',
    title: 'Add call-to-action',
    icon: cta,
  },
  download: {
    tool: 'download',
    title: 'Download selection',
    icon: download,
  },
  remove: {
    tool: 'remove',
    title: 'Remove',
    icon: remove,
  },
  lock: {
    tool: 'lock',
    title: 'Lock selection',
    icon: lock,
  },
  pointer: {
    tool: 'pointer',
    title: 'Pointer',
    icon: lock,
  },
  record:{
    tool: 'record',
    icon: record
  },
  task: {
    tool: 'task',
    icon: task
  },
  tag: {
    tool: 'tag',
    icon: tag
  },
  upload: {
    tool: 'upload',
    icon: upload
  }
};
export const compareWhiteboardTools = (
  firstTool: ITool | null,
  secondTool: ITool,
): boolean => firstTool?.tool === secondTool.tool;
