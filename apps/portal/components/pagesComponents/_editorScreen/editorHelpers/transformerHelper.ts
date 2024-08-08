/* eslint-disable @typescript-eslint/ban-ts-comment */
import Konva from 'konva';
import { Group } from 'konva/lib/Group';
import { Layer } from 'konva/lib/Layer';
import { Shape } from 'konva/lib/Shape';
import { Stage } from 'konva/lib/Stage';
import { blurName, getLayer } from './editorHelper';

export const rotateAnchorOffset = 50;
export const destroyPointerTransformer = (stage: Stage | null): void => {
  const layer: Layer | undefined = getLayer(stage, '#drawLayer');
  layer?.findOne('#pointerTransformer')?.destroy();
  const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
  drawLayer?.children.forEach((element: Shape | Group) => {
    if (element.getAttr('id') === 'conversationGroup' && element.hasChildren) {
      // @ts-ignore
      element?.children[0].setAttrs({ shadowOpacity: 0 });
    }
    element.setAttrs({
      shadowOpacity: 0,
    });
  });
};

export const updateTransformer = (tr: Konva.Transformer) => {
  tr.update = function () {
    Konva.Transformer.prototype.update.call(tr);
    const rotateIcon = this.findOne('.rotater');
    const topResize = this.findOne('.top-center');
    const rightReize = this.findOne('.middle-right');
    const leftReize = this.findOne('.middle-left');
    const bottomResize = this.findOne('.bottom-center');

    rotateIcon.attrs.cornerRadius = 50;
    rotateIcon.attrs.width = 16;
    rotateIcon.attrs.height = 16;
    rotateIcon.attrs.offsetX = 8;
    leftReize.setAttrs({
      height: 20,
      width: 5,
      y: leftReize.y() - 5,
      x: 2.5,
      cornerRadius: 30,
    });
    rightReize.setAttrs({
      height: 20,
      width: 5,
      y: rightReize.y() - 5,
      x: rightReize.x() + 2.5,
      cornerRadius: 30,
    });
    topResize.setAttrs({
      height: 5,
      width: 20,
      x: topResize.x() - 5,
      y: 2.5,
      cornerRadius: 30,
    });
    bottomResize.setAttrs({
      height: 5,
      width: 20,
      x: bottomResize.x() - 5,
      y: bottomResize.y() + 2.5,
      cornerRadius: 30,
    });
  };
};

export const initPointerTransformer = (
  stage: Stage,
  nodes: any[],
  saveHistory: () => void,
) => {
  if (
    nodes[0].attrs.name !== 'arrow' &&
    nodes[0].attrs.name !== 'marker' &&
    nodes[0].attrs.name !== 'comments'
  ) {
    nodes[0].setAttrs({
      shadowColor: 'black',
      shadowBlur: 1.5,
      shadowOffset: { x: 0, y: 0 },
      shadowOpacity: 0.5,
    });

    const layer: Layer | undefined = getLayer(stage, '#drawLayer');
    const tr = new Konva.Transformer({
      id: 'pointerTransformer',
      ignoreStroke: true,
      padding: nodes[0].attrs.name === 'blur' ? 2 : 8,
      anchorStroke: 'rgb(91, 77, 190)',
      borderStroke: 'rgb(91, 77, 190)',
      borderDash: [3, 3],
      anchorStrokeWidth: 1,
      borderStrokeWidth: 1,
      anchorSize: 10,
      pixelRatio: 1,
      keepRatio: false,
      enabledAnchors:
        nodes[0].attrs.id === 'text' ? ['middle-left', 'middle-right'] : null,
      nodes,
      rotateAnchorOffset,
      rotateEnabled: nodes[0].attrs.name == blurName ? false : true,
    });
    updateTransformer(tr);
    tr.on('transformend', function () {
      saveHistory();
    });
    tr.on('dragend', function (e) {
      saveHistory();
    });
    tr.forceUpdate();
    layer?.add(tr);
  }
};
