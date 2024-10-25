/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { getBlobFromStage } from 'components/pagesComponents/_editorScreen/editorHelpers/utils';
import { updateImage, updateStage, updateMarkers } from '../screenshots';
import { Stage } from 'konva/lib/Stage';
import { IHistory, ISize } from 'pages/edit/[id]';
import IEditorImage from 'app/interfaces/IEditorImage';
import { IWorkspaceImage } from 'app/interfaces/IWorkspace';
import saveAs from 'file-saver';
import { infoMessage, successMessage } from '../helpers/toastMessages';
import { ITool } from 'components/pagesComponents/_editorScreen/toolsPanel/tools';
import {
  blobToDataURL,
  dataURLSetFormat,
  getBlobfromUrl,
  pdfFromImageUrl,
} from 'app/utilities/images';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import { Group } from 'konva/lib/Group';
import { driveUploadFile } from '../google/drive';
import { IMarker } from 'app/interfaces/IMarker';

export class ToolbarService {
  static async saveToDatabase(
    forWorkspace: boolean,
    activeWorkspace: any,
    stage: Stage,
    markers: IMarker[],
    resizeDimentions: ISize,
    initialDimentions: ISize,
    stageScale: number,
    editorImage: IEditorImage | IWorkspaceImage,
    cropped: boolean,
    disableNotification?: boolean,
  ) {
    try {
      if (stage) {
        const blob = await getBlobFromStage(
          stage,
          resizeDimentions.height !== 0 && resizeDimentions.width !== 0
            ? resizeDimentions
            : initialDimentions,
          stageScale,
        );

        // setActiveTool(null);
        blob &&
          (await updateImage(
            editorImage,
            blob,
            forWorkspace && activeWorkspace,
            disableNotification,
          ));

        const cloned_stage = stage.clone();
        stage &&
          (await updateStage(
            editorImage,
            {
              stage: cloned_stage.toJSON(),
              renderDimentions: {
                width:
                  resizeDimentions.width !== 0
                    ? resizeDimentions.width
                    : initialDimentions.width,
                height:
                  resizeDimentions.height !== 0
                    ? resizeDimentions.height
                    : initialDimentions.height,
              },
              cropped: cropped,
            },
            forWorkspace && activeWorkspace,
          ));
      }
    } catch (e) {
      console.log(e);
    }
  }

  static async saveImageAs(
    stage: Stage,
    resizeDimentions: ISize,
    initialDimentions: ISize,
    stageScale: number,
    setActiveTool: React.Dispatch<React.SetStateAction<ITool>>,
    editorImage: IEditorImage | IWorkspaceImage,
    format: 'pdf' | 'png' | 'jpg',
  ) {
    async function download() {
      if (stage) {
        const blob = await getBlobFromStage(
          stage,
          resizeDimentions.height !== 0 && resizeDimentions.width !== 0
            ? resizeDimentions
            : initialDimentions,
          stageScale,
        );
        const updatedPictureURL = await blobToDataURL(blob);
        let formatBlob;

        switch (format) {
          case 'pdf':
            formatBlob = await pdfFromImageUrl(updatedPictureURL);
            saveAs(formatBlob, editorImage.dbData?.title + '.pdf');
            break;

          case 'jpg':
            formatBlob = dataURLSetFormat(updatedPictureURL, format);
            saveAs(formatBlob, editorImage.dbData?.title + '.jpg');
            break;

          case 'png':
            formatBlob = dataURLSetFormat(updatedPictureURL, format);
            saveAs(formatBlob, editorImage.dbData?.title + '.png');
            break;
        }
      }
    }

    new Promise<boolean>((res) => {
      setActiveTool(null as any);
      res(true);
    }).then(async (res) => {
      await download();
      infoMessage('Image downloaded!');
    });
  }

  static async clipboardCopy(
    stage: Stage,
    resizeDimentions: ISize,
    initialDimentions: ISize,
    stageScale: number,
    setClipboardCopyEnabled: (enabled: boolean) => void,
    setActiveTool: (tool: ITool) => void,
    errorHandler: (error: { message: string }) => void,
    successMessage: (message: string) => void,
  ) {
    const copy = async () => {
      const blob: Blob | null = await getBlobFromStage(
        stage,
        resizeDimentions.height !== 0 && resizeDimentions.width !== 0
          ? resizeDimentions
          : initialDimentions,
        stageScale,
      );

      if (!blob) {
        return errorHandler({
          message: 'Could not copy the image to clipboard...',
        });
      }

      const item = new window.ClipboardItem({
        'image/png': blob,
      });
      item && navigator.clipboard.write([item]);

      successMessage('Copied to clipboard');
    };

    setClipboardCopyEnabled(false);

    await copy();

    setActiveTool(null as any);
    setTimeout(() => setClipboardCopyEnabled(true), 2000);
  }

  static async cut(
    pointerTarget: Stage | Shape<ShapeConfig> | Group,
    stage: Stage,
    destroyPointerTransformer: (stage: any) => void,
  ) {
    if (pointerTarget) {
      const blob: Blob | null = await getBlobfromUrl(pointerTarget.toDataURL());
      const item = new window.ClipboardItem({
        'image/png': blob,
      });
      item && (await navigator.clipboard.write([item]));
      destroyPointerTransformer(stage);
      pointerTarget.destroy();
    }
  }

  static redo(
    historyStep: number,
    history: IHistory[],
    setHistoryStep: (value: React.SetStateAction<number>) => void,
    renderStep: (step: number) => void,
    setUndoState: (value: React.SetStateAction<boolean>) => void,
    setPointerTarget: (
      value: React.SetStateAction<Stage | Shape<ShapeConfig> | Group>,
    ) => void,
    clearActiveTool: () => void,
  ) {
    const newStep = historyStep + 1;
    if (newStep < history.length) {
      setHistoryStep(newStep);
      renderStep(newStep);
      setUndoState(false);
      setPointerTarget(null as any);
    }
    clearActiveTool();
  }

  static undo(
    historyStep: number,
    setHistoryStep: (value: React.SetStateAction<number>) => void,
    renderStep: (step: number) => void,
    setUndoState: (value: React.SetStateAction<boolean>) => void,
    setPointerTarget: (
      value: React.SetStateAction<Stage | Shape<ShapeConfig> | Group>,
    ) => void,
    setCropped: (value: boolean) => void,
    clearActiveTool: () => void,
    all: boolean = false,
  ) {
    const newStep = all ? 0 : historyStep - 1;
    if (newStep >= 0) {
      setHistoryStep(newStep);
      renderStep(newStep);
      setUndoState(false);
      setPointerTarget(null as any);
    }

    if (all) {
      setCropped(false);
    }

    clearActiveTool();
  }

  static clear(
    stage: Stage,
    history: IHistory[],
    setHistory: (updatedHistory: IHistory[]) => void,
  ) {
    stage?.offsetX(0);
    stage?.offsetY(0);
    const clearHistory: IHistory[] = [];
    clearHistory?.push(history[0]);
    setHistory(clearHistory);
  }

  static async uploadToCloudHandler(
    name: string,
    stage: Stage,
    resizeDimentions: ISize,
    initialDimentions: ISize,
    stageScale: number,
    setImageLoaded: (loaded: boolean) => void,
  ) {
    setImageLoaded(false);
    if (stage) {
      const blob = await getBlobFromStage(
        stage,
        resizeDimentions.height !== 0 && resizeDimentions.width !== 0
          ? resizeDimentions
          : initialDimentions,
        stageScale,
        // mainScale,
      );
      const updatedPictureURL = await blobToDataURL(blob);
      const imageURL = await dataURLSetFormat(updatedPictureURL, 'jpg');
      const res = await fetch(imageURL);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const imageId = await driveUploadFile(name, await res.blob());
      if (imageId) {
        successMessage('Image uploaded successfully.');
      }
      setImageLoaded(true);
    }
  }
}
