import move from 'public/assets/svg/tools-panel/move.svg';
import brush from 'public/assets/svg/tools-panel/brush.svg';
import roller from 'public/assets/svg/tools-panel/roller.svg';
import eraser from 'public/assets/svg/tools-panel/eraser.svg';
import resize from 'public/assets/svg/tools-panel/resize.svg';
import crop from 'public/assets/svg/tools-panel/crop.svg';
import rect from 'public/assets/svg/tools-panel/rect.svg';
import circle from '/public/assets/svg/tools-panel/crcl.svg';
import star from 'public/assets/svg/tools-panel/star.svg';
import arrow from 'public/assets/svg/tools-panel/arrow.svg';
import curvaarrow from 'public/assets/svg/tools-panel/trending.svg';
import direction from 'public/assets/svg/tools-panel/direction.svg';
import line from 'public/assets/svg/tools-panel/line.svg';
import text from 'public/assets/svg/tools-panel/text.svg';
import emoji from 'public/assets/svg/tools-panel/emoji.svg';
import blur from 'public/assets/svg/tools-panel/blur.svg';
import conversation from 'public/assets/svg/tools-panel/conversation.svg';
import watermark from 'public/assets/svg/tools-panel/watermark.svg';
import triangle from 'public/assets/svg/tools-panel/triangle.svg';
import heart from 'public/assets/svg/tools-panel/heart.svg';
import square from 'public/assets/svg/tools-panel/square.svg';
import blob from 'public/assets/svg/tools-panel/blob.svg';
import email from 'public/assets/svg/tools-panel/email.svg';
import drive from 'public/assets/svg/tools-panel/drive.svg';
import video from 'public/assets/svg/tools-panel/Videos.svg';
import undoIcon from 'public/assets/svg/tools-panel/undo.svg';
import redoIcon from 'public/assets/svg/tools-panel/redo.svg';
import clearIcon from 'public/assets/svg/tools-panel/clear.svg';
import square2 from 'public/assets/svg/tools-panel/square2.svg';
import slackIcon from 'public/assets/svg/tools-panel/slack.svg';
import whatsAppIcon from 'public/assets/svg/tools-panel/whatsApp.svg';
import marker from 'public/assets/svg/tools-panel/marker.svg';
import comments from 'public/assets/svg/tools-panel/comment.svg';
import save from 'public/assets/svg/tools-panel/download.svg';
import share from 'public/assets/svg/tools-panel/share.svg';

export interface ITool {
  tool: ToolName;
  title?: string;
  icon: string;
  cursorLink?: string;
  cursor?: string;
}

export type ToolName =
  | 'pointer'
  | 'pencil'
  | 'roller'
  | 'eraser'
  | 'resize'
  | 'crop'
  | 'rect'
  | 'elipse'
  | 'circle'
  | 'star'
  | 'text'
  | 'arrow'
  | 'line'
  | 'emoji'
  | 'blur'
  | 'conversation'
  | 'watermark'
  | 'triangle'
  | 'heart'
  | 'square'
  | 'blob'
  | 'comment'
  | 'curvaArrow'
  | 'direction'
  | 'email'
  | 'drive'
  | 'video'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'slack'
  | 'whatsApp'
  | 'marker'
  | 'comments'
  | 'saving'
  | 'share';

export const tools: Record<ToolName, ITool> = {
  pointer: {
    tool: 'pointer',
    title: 'Pointer',
    icon: move,
    cursor: 'move',
  },
  pencil: {
    tool: 'pencil',
    title: 'Pencil',
    icon: brush,
    cursorLink: brush,
  },
  roller: {
    tool: 'roller',
    title: 'Pen',
    icon: roller,
    cursorLink: roller,
  },
  eraser: {
    tool: 'eraser',
    title: 'Eraser',
    icon: eraser,
    cursorLink: eraser,
  },
  resize: {
    tool: 'resize',
    title: 'Resize',
    icon: resize,
  },
  crop: {
    tool: 'crop',
    title: 'Crop',
    icon: crop,
    cursor: 'cell',
  },
  rect: {
    tool: 'rect',
    title: 'Rectangle',
    icon: rect,
    cursorLink: rect,
  },
  elipse: {
    tool: 'elipse',
    title: 'Elipse',
    icon: circle,
    cursorLink: circle,
  },
  circle: {
    tool: 'circle',
    title: 'Circle',
    icon: circle,
    cursorLink: circle,
  },
  star: {
    tool: 'star',
    title: 'Star',
    icon: star,
    cursorLink: star,
  },
  arrow: {
    tool: 'arrow',
    title: 'Arrow',
    icon: arrow,
    cursor: 'crosshair',
  },
  curvaArrow: {
    tool: 'curvaArrow',
    title: 'Curved Arrow',
    icon: curvaarrow,
    cursor: 'crosshair',
  },
  direction: {
    tool: 'direction',
    title: 'Direction',
    icon: direction,
    cursor: 'crosshair',
  },
  line: {
    tool: 'line',
    title: 'Line',
    icon: line,
    cursor: 'crosshair',
  },
  text: {
    tool: 'text',
    title: 'Text',
    icon: text,
    cursor: 'text',
  },
  emoji: {
    tool: 'emoji',
    title: 'Emoji',
    icon: emoji,
    cursor: 'cell',
  },
  blur: {
    tool: 'blur',
    title: 'Blur',
    icon: blur,
    cursor: 'cell',
  },
  conversation: {
    tool: 'conversation',
    title: 'Callouts',
    icon: conversation,
    cursor: 'cell',
  },
  watermark: {
    tool: 'watermark',
    title: 'Watermark',
    icon: watermark,
  },
  triangle: {
    tool: 'triangle',
    title: 'Triangle',
    icon: triangle,
    cursorLink: triangle,
  },
  heart: {
    tool: 'heart',
    title: 'Heart',
    icon: heart,
    cursorLink: heart,
  },
  square: {
    tool: 'square',
    title: 'Square',
    icon: square2,
    cursorLink: square,
  },
  blob: {
    tool: 'blob',
    title: 'Blob',
    icon: square,
    cursorLink: rect,
  },
  comment: {
    tool: 'comment',
    title: 'Comment',
    icon: blob,
    cursorLink: blob,
  },
  email: {
    tool: 'email',
    title: 'Email',
    icon: email,
  },
  drive: {
    tool: 'drive',
    title: 'Drive',
    icon: drive,
  },
  video: {
    tool: 'video',
    title: 'Video',
    icon: video,
  },
  undo: {
    tool: 'undo',
    title: 'Undo',
    icon: undoIcon,
  },
  redo: {
    tool: 'redo',
    title: 'Redo',
    icon: redoIcon,
  },
  clear: {
    tool: 'clear',
    title: 'Clear',
    icon: clearIcon,
  },
  slack: {
    tool: 'slack',
    title: 'Slack',
    icon: slackIcon,
  },
  whatsApp: {
    tool: 'whatsApp',
    title: 'Share on WhatsApp',
    icon: whatsAppIcon,
  },
  marker: {
    tool: 'marker',
    title: 'Marker',
    icon: marker,
  },
  comments: {
    tool: 'comments',
    title: 'Comments',
    icon: comments,
  },
  saving: {
    tool: 'saving',
    title: 'Saving options',
    icon: save,
  },
  share: {
    tool: 'share',
    title: 'Share',
    icon: share,
  },
};

export const compareTools = (
  firstTool: ITool | null,
  secondTool: ITool,
): boolean => firstTool?.tool === secondTool.tool;
