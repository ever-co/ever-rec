import Konva from 'konva';
import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import { markerName, getLayer } from './editorHelper';
import { IMarkerOptions } from '../../editorScreen/toolsPanel/toolsOptions/interface/IMarkerGroupOptions';
import { Path } from 'konva/lib/shapes/Path';
import { Text } from 'konva/lib/shapes/Text';
import { Group } from 'konva/lib/Group';
import { alphabet } from './alphabet';
import { MarkerAPI } from '@/app/services/api/markers';
import { EditorService } from '@/app/services/editor/editor';
import { infoMessage } from '@/app/services/helpers/toastMessages';
import { v4 as uuidv4 } from 'uuid';
import { IMarker } from '@/app/interfaces/IMarker';
import { MarkerService } from '@/app/services/editor/markers';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import { updateMarkers } from '@/app/services/screenshots';
import IEditorImage from '@/app/interfaces/IEditorImage';
import { IWorkspaceImage } from '@/app/interfaces/IWorkspace';

export interface IMarkerDrawer {
  stage: Stage;
  options: IMarkerOptions;
  shapeType: string;
  imageId: string;
  userId: string;
  saveHistory: () => void;
  setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>;
  setCurrentShape: React.Dispatch<
    React.SetStateAction<Shape<ShapeConfig> | Group | null>
  >;
  editorImage: IEditorImage | IWorkspaceImage;
  activeWorkspace: any;
  forWorkspace: boolean;
}

export interface IMarkerDrawerListener {
  stage: Stage;
  options: IMarkerOptions;
  shapeType: string;
  imageId: string;
  userId: string;
  markerId: string;
  saveHistory: () => void;
  setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>;
  setCurrentShape: React.Dispatch<
    React.SetStateAction<Shape<ShapeConfig> | Group | null>
  >;
  editorImage: IEditorImage | IWorkspaceImage;
  activeWorkspace: any;
  forWorkspace: boolean;
}

export const initMarkerDraw = ({
  stage,
  options,
  shapeType,
  imageId,
  userId,
  saveHistory,
  setMarkers,
  setCurrentShape,
  editorImage,
  activeWorkspace,
  forWorkspace,
}: IMarkerDrawer) => {
  stage.on('mousedown', (e) => {
    if (e.target.getAttr('shapeType') !== 'marker') {
      const markerId = uuidv4();
      drawMarkerListener({
        stage,
        options,
        shapeType,
        imageId,
        userId,
        markerId,
        saveHistory,
        setMarkers,
        setCurrentShape,
        editorImage,
        activeWorkspace,
        forWorkspace,
      });
    }
  });
};

export const baseMarkerTextOptions: any = {
  fill: 'white',
  fontSize: 28,
  padding: 20,
  align: 'center',
  verticalAlign: 'middle',
  listening: false,
  rotation: 0,
  shadowColor: 'black',
  shadowBlur: 2,
  shadowOpacity: 0.5,
  shadowOffset: { x: 1, y: 1 },
};

export const baseMarkerOptions: any = {
  data: 'M2.04985 25.686C1.5377 25.1739 1.27699 24.4672 1.33418 23.7595L2.85119 4.99041C2.94395 3.84267 3.84272 2.9439 4.99046 2.85114L23.7596 1.33413C24.4672 1.27694 25.1739 1.53764 25.6861 2.04979L43.3487 19.7124C44.3036 20.6673 44.3087 22.1858 43.3903 23.1041L23.1042 43.3902C22.1858 44.3086 20.6674 44.3035 19.7125 43.3486L2.04985 25.686ZM14.1076 14.1076C15.4232 12.7919 15.4232 10.6589 14.1076 9.34323C12.792 8.0276 10.6589 8.0276 9.34327 9.34323C8.02764 10.6589 8.02764 12.7919 9.34327 14.1076C10.6589 15.4232 12.792 15.4232 14.1076 14.1076Z',
  scale: {
    x: 1.5,
    y: 1.5,
  },
  pixelRatio: 1,
};

const drawMarkerListener = ({
  stage,
  options,
  shapeType,
  imageId,
  userId,
  markerId,
  saveHistory,
  setMarkers,
  setCurrentShape,
  editorImage,
  activeWorkspace,
  forWorkspace,
}: IMarkerDrawerListener) => {
  const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
  const group = new Konva.Group({
    id: 'markerGroup',
    draggable: true,
  });

  const marker = new Path(baseMarkerOptions);
  marker.setAttrs({
    shapeType: shapeType,
    x: stage.getRelativePointerPosition().x,
    y: stage.getRelativePointerPosition().y,
    fill: options.fill,
    name: markerName,
    id: markerId,
  });

  const text: Text = new Text(baseMarkerTextOptions);
  text.setAttrs({
    id: 'markerText',
    x: stage.getRelativePointerPosition().x,
    y: stage.getRelativePointerPosition().y,
    text: alphabet[stage.find('#markerText').length],
    name: markerName + 'Text',
  });

  const numbers: Text = new Text(baseMarkerTextOptions);
  numbers.setAttrs({
    id: 'markerNumbers',
    x: stage.getRelativePointerPosition().x,
    y: stage.getRelativePointerPosition().y,
    name: markerName + 'Text',
    text: String(stage.find('#markerNumbers').length + 1),
  });

  group.add(marker);

  if (options.type === 'number') {
    group.add(numbers);
    drawLayer?.add(group);
  } else if (
    options.type === 'alphabet' &&
    stage.find('#markerText').length < alphabet.length
  ) {
    group.add(text);
    drawLayer?.add(group);
  }

  if (drawLayer) {
    stage.on('mouseup', () => drawImageMouseUpListener(stage, saveHistory));
    initEventListenersMarker(
      stage,
      marker,
      text,
      group,
      options,
      setMarkers,
      setCurrentShape,
      editorImage,
      activeWorkspace,
      forWorkspace,
    );
    MarkerService.addMarker(userId, markerId, imageId, setMarkers);

    // initEventListenersMarker(stage, marker, text, group, options);
    // await MarkerAPI.create(markerId, imageId);
    // save(true);
  }
};

export const initEventListenersMarker = (
  stage: Stage,
  marker: Path,
  text: Text,
  group: Group,
  options: IMarkerOptions,
  setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>,
  setCurrentShape: React.Dispatch<
    React.SetStateAction<Shape<ShapeConfig> | Group | null>
  >,
  editorImage: IEditorImage | IWorkspaceImage,
  activeWorkspace: any,
  forWorkspace: boolean,
) => {
  marker?.on('mouseover', () => {
    marker.setAttrs({
      shadowColor: 'black',
      shadowBlur: 6,
      shadowOpacity: 0.5,
    });
  });

  marker?.on('click', () => {
    marker.setAttrs({
      shadowOpacity: 0.6,
    });
    setPosition(stage, marker);
  });

  group?.on('dragmove', () => {
    setPosition(stage, marker);
  });

  marker?.on('dblclick', async () => {
    const markerId = marker.getAttr('id');
    if (markerId) {
      try {
        group?.destroy();

        if (options.type === 'number') {
          const ctx = stage.find('#markerNumbers');
          for (let index = 0; index < ctx.length; index++) {
            ctx[index].setAttr('text', String(index + 1));
          }
        } else {
          const ctx = stage.find('#markerText');
          for (let index = 0; index < ctx.length; index++) {
            ctx[index].setAttr('text', alphabet[index]);
          }
        }
      } catch (error) {
        console.error('An error occurred:', error);
      } finally {
        MarkerService.removeMarker(
          markerId,
          setMarkers,
          async (updatedMarkers) =>
            await updateMarkers(
              editorImage,
              updatedMarkers,
              forWorkspace && activeWorkspace,
            ),
        );
        setCurrentShape(null);
      }
    }
  });

  group?.on('dragstart', () => {
    EditorService.toggleMarkerPopup(false);
    stage.container().style.cursor = 'move';
  });

  group?.on('dragend', () => {
    stage.container().style.cursor = 'default';
    EditorService.toggleMarkerPopup(true);
  });

  group.on('dragmove', () => {
    setPosition(stage, marker);
  });

  group?.on('click', () => {
    EditorService.toggleMarkerPopup(true);
    stage.container().style.cursor = 'default';
    setPosition(stage, marker);
  });

  marker?.on('mouseout', () => {
    marker.setAttrs({
      shadowOpacity: marker.getAttr('shadowOpacity') === 0.6 ? 0.6 : 0,
    });
  });
};

const drawImageMouseUpListener = (stage: Stage, saveHistory: () => void) => {
  stage?.off('mousemove');
  stage?.off('mouseup');
  saveHistory();
};

export const setPosition = (stage: Stage, tr: Path) => {
  const markerPopup = document.getElementById('comment');
  const stageHeight: number = stage?.height();
  const stageWith: number = stage?.width();
  const trHeight = markerPopup?.offsetHeight;
  const trWidth = markerPopup?.offsetWidth;
  const x = tr?.getAbsolutePosition()?.x;
  const y = tr?.getAbsolutePosition()?.y;

  if (tr && stage && trWidth && trHeight && x && y) {
    if (x + 66 < stageWith / 2) {
      markerPopup?.style.setProperty('left', x + 66 + 'px');
      markerPopup?.style.setProperty('top', y + 32 + 'px');
    }
    if (x + 66 > stageWith / 2) {
      markerPopup?.style.setProperty('left', x - trWidth + 'px');

      markerPopup?.style.setProperty('top', y + 32 + 'px');
    }
    if (y + 32 > stageHeight / 2 && x + 66 > stageWith / 2) {
      markerPopup?.style.setProperty('left', x - trWidth + 'px');

      markerPopup?.style.setProperty('top', y - trHeight + 32 + 'px');
    }

    if (y + 32 > stageHeight / 2 && x + 66 < stageWith / 2) {
      markerPopup?.style.setProperty('left', x + 66 + 'px');

      markerPopup?.style.setProperty('top', y - trHeight + 32 + 'px');
    }
  }
};
