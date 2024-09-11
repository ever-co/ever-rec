import {
  blobToDataURL,
  dataURLSetFormat,
  getBlobfromUrl,
} from '@/app/utilities/images';
import {
  IHistory,
  ISize,
} from '@/content/panel/screens/editorScreen/EditorScreen';
import { getLayer } from '@/content/panel/screens/editorScreen/editorHelpers/editorHelper';
import { getBlobFromStage } from '@/content/panel/screens/editorScreen/editorHelpers/utils';
import { Stage } from 'konva/lib/Stage';
import { infoMessage, successMessage } from '../helpers/toastMessages';
import { appLogger } from '@/app/AppLogger';
import { ITool } from '@/content/panel/screens/editorScreen/toolsPanel/tools';
import { updateImage, updateMarkers, updateStage } from '../screenshots';
import IEditorImage from '@/app/interfaces/IEditorImage';
import { IWorkspace, IWorkspaceImage } from '@/app/interfaces/IWorkspace';
import { ClipboardItemInterface } from 'clipboard-polyfill/dist/overwrite-globals/ClipboardItem/spec';
import { destroyPointerTransformer } from '@/content/panel/screens/editorScreen/editorHelpers/transformerHelper';
import { pdfFromImageUrl } from '@/app/utilities/pdfFromImageUrl';
import saveAs from 'file-saver';
import { IMarker } from '@/app/interfaces/IMarker';

export class ToolbarService {
  static async saveImageAs(
    stage: Stage | null,
    resizeDimentions: ISize,
    initialDimentions: ISize,
    stageScale: number,
    setActiveTool: (value: React.SetStateAction<ITool | null>) => void,
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
      setActiveTool(null);
      res(true);
    }).then(async (res) => {
      await download();
      infoMessage('Image downloaded!');
    });
  }

  static onCropHandler(
    stage: Stage | null,
    setResizeDimentions: (value: React.SetStateAction<ISize>) => void,
    saveHistory: (resizer?: ISize, newStage?: any) => Promise<void>,
    setCropped: (value: React.SetStateAction<boolean>) => void,
    clearActiveTool: () => void,
  ): void {
    const tr = getLayer(stage, '#cropperLayer')?.findOne('#cropperTransformer');
    const scale = stage?.scale();
    const scaleX: any = scale?.x;
    const scaleY: any = scale?.y;

    if (tr && stage && stage.scaleX() && stage.scaleY()) {
      const x = tr.x() / scaleX - stage?.position().x / scaleX;
      const y = tr.y() / scaleY - stage?.position().y / scaleY;

      stage.offsetX(stage.offsetX() + x);
      stage.offsetY(stage.offsetY() + y);

      setResizeDimentions({
        width: tr.width() / stage.scaleX(),
        height: tr.height() / stage.scaleY(),
      });

      saveHistory({
        width: tr.width() / stage.scaleX(),
        height: tr.height() / stage.scaleY(),
      });
      setCropped(true);
    }
    clearActiveTool();
  }

  static async uploadToCloudHandler(
    name: string,
    setLoadingIndicator: (value: React.SetStateAction<boolean>) => void,
    stage: Stage | null,
    resizeDimentions: ISize,
    initialDimentions: ISize,
    stageScale: number,
  ): Promise<void> {
    setLoadingIndicator(false);
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
       
      // @ts-ignore
      const imageId = await driveUploadFile(name, await res.blob());
      if (imageId) {
        successMessage('Image uploaded successfully.');
        appLogger.add({ eventType: 'UserHasSavedTheScreenshotToTheirGDrive' });
      }
      setLoadingIndicator(true);
    }
  }

  static clear(
    stage: Stage | null,
    history: IHistory[],
    setHistory: (value: React.SetStateAction<IHistory[]>) => void,
  ): void {
    stage?.offsetX(0);
    stage?.offsetY(0);
    const clearHistory: IHistory[] = [];
    clearHistory?.push(history[0]);
    setHistory(clearHistory);
  }

  static undo(
    historyStep: number,
    setHistoryStep: (value: React.SetStateAction<number>) => void,
    renderStep: (step: number) => void,
    setUndoState: (value: React.SetStateAction<boolean>) => void,
    setCropped: (value: React.SetStateAction<boolean>) => void,
    clearActiveTool: () => void,
    all = false,
  ): void {
    const newStep = all ? 0 : historyStep - 1;
    if (newStep >= 0) {
      setHistoryStep(newStep);
      renderStep(newStep);
      setUndoState(false);
    }
    if (all) {
      setCropped(false);
    }

    clearActiveTool();
  }

  static async redo(
    historyStep: number,
    history: IHistory[],
    setHistoryStep: (value: React.SetStateAction<number>) => void,
    renderStep: (step: number) => void,
    setUndoState: (value: React.SetStateAction<boolean>) => void,
    clearActiveTool: () => void,
  ): Promise<void> {
    const newStep = historyStep + 1;
    if (newStep < history.length) {
      setHistoryStep(newStep);
      renderStep(newStep);
      setUndoState(false);
    }
    clearActiveTool();
  }

  static async clipboardCopy(
    stage: Stage | null,
    resizeDimentions: ISize,
    initialDimentions: ISize,
    stageScale: number,
    setClipboardCopyEnabled: (enabled: boolean) => void,
    setActiveTool: (tool: ITool | null) => void,
    errorHandler: (error: { message: string }) => void,
  ) {
    const copy = async () => {
      if (stage) {
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
      }
    };

    setClipboardCopyEnabled(false);

    await copy();

    setActiveTool(null);
    setTimeout(() => setClipboardCopyEnabled(true), 2000);
  }

  static async saveToDatabase(
    forWorkspace: boolean,
    activeWorkspace: any,
    stage: Stage | null,
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

  static async cut(pointerTarget: any, stage: any): Promise<void> {
    if (pointerTarget) {
      const blob: Blob | null = await getBlobfromUrl(pointerTarget.toDataURL());
      if (blob) {
        const item: ClipboardItemInterface = new window.ClipboardItem({
          'image/png': blob,
        });
        item && (await navigator.clipboard.write([item]));
        destroyPointerTransformer(stage);
        pointerTarget.destroy();
      }
    }
  }
}
