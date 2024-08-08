import { conversationData } from 'app/utilities/conversation.data';
import { IArrowGroupOptions } from 'app/interfaces/tools_interfaces/IArrowGroupOptions';
import { IConversationOptions } from 'app/interfaces/tools_interfaces/IConversationOptions';
import { IEmojiOptions } from 'app/interfaces/tools_interfaces/IEmojiOptions';
import { IPencilGroupOptions } from 'app/interfaces/tools_interfaces/IPencilGroupOptions';
import { IShapeGroupOptions } from 'app/interfaces/tools_interfaces/IShapeGroupOptions';
import { ITextOptions } from 'app/interfaces/tools_interfaces/ITextOptions';
import { IWatermarkOptions } from 'app/interfaces/tools_interfaces/IWatermarkOptions';
import { IMarkerOptions } from 'app/interfaces/tools_interfaces/IMarkerGroupOptions';
import { ICommentsOptions } from 'app/interfaces/tools_interfaces/ICommentsGroupOptions';
export const initShapeGroupOptions = (): IShapeGroupOptions => ({
  fillColor: 'rgba(255, 255, 255, 0)',
  strokeColor: 'rgb(0, 0, 0)',
  strokeWidth: 8,
  numPoints: 5,
  innerRadius: 20,
  outerRadius: 20,
});

export const initEmojiOptions = (): IEmojiOptions => ({
  id: 1,
  filename: '',
  url: '',
  emoji: '',
});

export const initConversationOptions = (): IConversationOptions => ({
  filename: conversationData[0].fileName,
  category: conversationData[0]?.category,
  fillColor: conversationData[0]?.fillColor,
  strokeColor: conversationData[0]?.strokeColor,
  strokeWidth: conversationData[0]?.strokeWidth,
  textColor: conversationData[0]?.textStrokeColor,
  textStrokeColor: conversationData[0]?.textStrokeColor,
  textStrokeWidth: conversationData[0]?.textStrokeWidth,
  textSize: conversationData[0]?.textSize,
  fontFamily: conversationData[0]?.fontFamily,
  data: conversationData[0]?.data,
  dash: conversationData[0].dash,
});

export const initPencilGroupOptions = (): IPencilGroupOptions => ({
  strokeColor: 'black',
  strokeWidth: 8,
});

export const initMarkerOptions = (): IMarkerOptions => ({
  id: '',
  text: '',
  type: 'number',
  fill: 'orange',
  position: { x: 0, y: 0 },
});

export const initCommentsOptions = (): ICommentsOptions => ({
  id: '',
  fill: 'white',
  position: { x: 0, y: 0 },
  text: '',
});

export const initWatermarkOptions = (): IWatermarkOptions => ({
  size: 10,
  fontsize: 100,
  imageopacity: 100,
  textopacity: 100,
  textposition: 'Top Left',
  imageposition: 'Top Left',
  rotation: 0,
  text: '',
});

export const initArrowGroupOptions = (): IArrowGroupOptions => ({
  color: 'rgb(0, 0, 0)',
  width: 8,
  points: [0, 0, 0, 0, 0, 0, 0, 0],
  points1: [0, 0, 0, 0],
});

export const initTextOptions = (): ITextOptions => ({
  fontFamily: 'Times New Roman',
  fontSize: 35,
  fill: 'rgb(0, 0, 0)',
  stroke: 'rgba(0, 0, 0)',
  shadow: false,
  align: 'center',
  textDecoration: '',
  fontStyle: '',
  fontVariant: 'normal',
  text: '',
});
