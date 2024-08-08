import { ChangeEvent, useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import { Select } from 'antd';
import { Tabs } from 'antd';
import { getLayer } from '../../../../editorHelpers/editorHelper';
import { fileGetBase64, imageFromUrl } from '@/app/utilities/images';
import { ITool, tools } from '../../../tools';
import {
  IWatermarkOptions,
  WatermarkPosition,
} from '../../../toolsOptions/interface/IWatermarkOptions';
import ToolBtn from '../../ToolBtn';
import WatermarkToolSlider from './WatermarkToolSlider';
import AppInput from '@/content/components/controls/appInput/AppInput';

interface IWatermarkToolBtnProps {
  stage: Stage;
  options: IWatermarkOptions;
  isActive: boolean;
  isOpenEditTool: boolean;
  onChange: (options: IWatermarkOptions) => void;
  onToolChange: (tool: ITool) => void;
  onSaveHistory: () => void;
  scale: number;
}
const { TabPane } = Tabs;
const watermarkPositions: WatermarkPosition[] = [
  'Top Left',
  'Top Right',
  'Bottom Left',
  'Bottom Right',
  'Center',
  'Top Center',
  'Bottom Center',
  'Left Center',
  'Right Center',
];

const WatermarkToolBtn: React.FC<IWatermarkToolBtnProps> = ({
  stage,
  options,
  isActive,
  isOpenEditTool,
  onChange,
  onToolChange,
  onSaveHistory,
  scale,
}) => {
  const fileUploader = useRef<HTMLInputElement>(null);
  const [tabstate, setTabstate] = useState<number>(1);
  const textRef = useRef(null);
  const clickAddImageHandler = () => {
    fileUploader.current?.click();
  };

  const changeUploadFileHandler = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.value.length && event.target.files?.length) {
      const imageBase64 = await fileGetBase64(event.target.files[0]);
      imageBase64 && optionsChangeHandler('imageBase64', imageBase64);
    }
  };

  useEffect(() => {
    destroyWatermarkText();
    if (tabstate === 1) {
      if (options.imageBase64) {
        drawWatermarkImage().then(() => {
          scaleAndPlaceWatermark();
        });
      }
    }
  }, [options.imageBase64, tabstate]);

  useEffect(() => {
    destroyWatermarkImage();
    if (tabstate === 2) {
      drawWatermarkText();
      placeAndRotation();
    }
  }, [tabstate]);

  useEffect(() => {
    changeText();
    placeAndRotation();
  }, [options.text]);

  useEffect(() => {
    scaleAndPlaceWatermark();
  }, [options.size, options.imageposition]);

  useEffect(() => {
    changeFontSize();
    placeAndRotation();
  }, [options.fontsize]);

  useEffect(() => {
    changeRotation();
  }, [options.rotation]);

  useEffect(() => {
    placeAndRotation();
  }, [options.textposition]);

  useEffect(() => {
    changeImageOpacity();
  }, [options.imageopacity]);

  useEffect(() => {
    changeTextOpacity();
  }, [options.textopacity]);

  const optionsChangeHandler = (field: string, value: any) => {
    onChange({ ...options, [field]: value });
  };

  const drawWatermarkImage = async () => {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer && options.imageBase64) {
      const watermarks = drawLayer.find('#watermarkimage');
      watermarks && watermarks.forEach((w) => w.destroy());

      const image = await imageFromUrl(options.imageBase64);
      const width = (stage.width() / 100) * options.size;
      const height = width / (image.width / image.height);

      const imageNode = new Konva.Image({
        id: 'watermarkimage',
        width,
        height,
        draggable: false,
        opacity: options.imageopacity / 100,
        image,
      });

      drawLayer.add(imageNode);
      onSaveHistory();
    }
  };

  const drawWatermarkText = async () => {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer) {
      const watermarks = drawLayer.find('#watermarktext');
      watermarks && watermarks.forEach((w) => w.destroy());
      const textNode = new Konva.Text({
        id: 'watermarktext',
        draggable: false,
        text: options.text,
        fontSize: options.fontsize,
        opacity: options.textopacity / 100,
        rotation: options.rotation,
      });

      drawLayer.add(textNode);
      onSaveHistory();
    }
  };

  const scaleAndPlaceWatermark = async () => {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer && options.imageBase64) {
      const watermark = drawLayer.findOne('#watermarkimage');
      if (!watermark) {
        return;
      }

      const width = (stage.width() / 100) * options.size;
      const height = width / (watermark.width() / watermark.height());
      let x = stage.offsetX();
      let y = stage.offsetY();
      switch (options.imageposition) {
        case 'Top Right': {
          x = stage.attrs.width / stage.scaleX() + stage.offsetX() - width;
          break;
        }
        case 'Bottom Left': {
          y = stage.attrs.height / stage.scaleY() + stage.offsetY() - height;
          break;
        }
        case 'Bottom Right': {
          x = stage.attrs.width / stage.scaleX() + stage.offsetX() - width;
          y = stage.attrs.height / stage.scaleY() + stage.offsetY() - height;
          break;
        }
        case 'Center': {
          x =
            stage.attrs.width / 2 / stage.scaleX() +
            stage.offsetX() -
            width / 2;
          y =
            stage.attrs.height / 2 / stage.scaleY() +
            stage.offsetY() -
            height / 2;
          console.log('x', x, 'y', y);
          break;
        }
        case 'Top Center': {
          x =
            stage.attrs.width / 2 / stage.scaleX() +
            stage.offsetX() -
            width / 2;
          break;
        }
        case 'Bottom Center': {
          x =
            stage.attrs.width / 2 / stage.scaleX() +
            stage.offsetX() -
            width / 2;
          y = stage.attrs.height / stage.scaleY() + stage.offsetY() - height;
          break;
        }
        case 'Left Center': {
          y =
            stage.attrs.height / 2 / stage.scaleY() +
            stage.offsetY() -
            height / 2;
          break;
        }
        case 'Right Center': {
          x = stage.attrs.width / stage.scaleX() + stage.offsetX() - width;
          y =
            stage.attrs.height / 2 / stage.scaleY() +
            stage.offsetY() -
            height / 2;
          break;
        }
      }
      watermark.setAttrs({
        x: x,
        y: y,
        width: width,
        height: height,
      });
    }
  };

  const placeAndRotation = async () => {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer) {
      const watermark = drawLayer.findOne('#watermarktext');
      if (!watermark) {
        return;
      }

      let x = stage.offsetX();
      let y = stage.offsetY();
      switch (options.textposition) {
        case 'Top Right': {
          x =
            stage.attrs.width / stage.scaleX() +
            stage.offsetX() -
            watermark.width();
          y = stage.offsetY();
          break;
        }
        case 'Bottom Left': {
          x = stage.offsetX();

          y =
            stage.attrs.height / stage.scaleY() +
            stage.offsetY() -
            watermark.height();
          break;
        }
        case 'Bottom Right': {
          x =
            stage.attrs.width / stage.scaleX() +
            stage.offsetX() -
            watermark.width();
          y =
            stage.attrs.height / stage.scaleY() +
            stage.offsetY() -
            watermark.height();
          break;
        }
        case 'Center': {
          x =
            stage.attrs.width / 2 / stage.scaleX() +
            stage.offsetX() -
            watermark.width() / 2;
          y =
            stage.attrs.height / 2 / stage.scaleY() +
            stage.offsetY() -
            watermark.height() / 2;
          break;
        }
        case 'Top Center': {
          x =
            stage.attrs.width / 2 / stage.scaleX() +
            stage.offsetX() -
            watermark.width() / 2;
          break;
        }
        case 'Bottom Center': {
          x =
            stage.attrs.width / 2 / stage.scaleX() +
            stage.offsetX() -
            watermark.width() / 2;
          y =
            stage.attrs.height / stage.scaleY() +
            stage.offsetY() -
            watermark.height();
          break;
        }
        case 'Left Center': {
          y =
            stage.attrs.height / 2 / stage.scaleY() +
            stage.offsetY() -
            watermark.height() / 2;
          break;
        }
        case 'Right Center': {
          x =
            stage.attrs.width / stage.scaleX() +
            stage.offsetX() -
            watermark.width();
          y =
            stage.attrs.height / 2 / stage.scaleY() +
            stage.offsetY() -
            watermark.height() / 2;
          break;
        }
      }
      watermark.setAttrs({
        x: x,
        y: y,
      });
    }
  };
  const changeImageOpacity = async () => {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer && options.imageBase64) {
      const watermark = drawLayer.findOne('#watermarkimage');
      if (watermark) {
        watermark.opacity(options.imageopacity / 100);
      }
    }
  };
  const changeTextOpacity = async () => {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer) {
      const watermark = drawLayer.findOne('#watermarktext');
      if (watermark) {
        watermark.opacity(options.textopacity / 100);
      }
    }
  };

  const changeFontSize = async () => {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer) {
      const watermark = drawLayer.findOne('#watermarktext');
      if (watermark) {
        watermark.setAttrs({ fontSize: options.fontsize });
      }
    }
  };

  const changeText = async () => {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer) {
      const watermark = drawLayer.findOne('#watermarktext');
      if (watermark) {
        watermark.setAttrs({ text: options.text });
      }
    }
  };

  const changeRotation = async () => {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer) {
      const watermark = drawLayer.findOne('#watermarktext');
      if (watermark) {
        watermark.setAttrs({ rotation: options.rotation });
      }
    }
  };

  const destroyWatermarkText = async () => {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer) {
      const watermark = drawLayer.findOne('#watermarktext');
      if (watermark) {
        watermark.destroy();
      }
    }
  };
  const destroyWatermarkImage = async () => {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer) {
      const watermark = drawLayer.findOne('#watermarkimage');
      if (watermark) {
        watermark.destroy();
      }
    }
  };

  const textHandler = (e: any) => {
    // @ts-ignore
    const text = textRef.current?.value;
    if (e && e.keyCode === 67 && e.altKey && e.ctrlKey) {
      return optionsChangeHandler('text', text + '©');
    }
    if (e && e.keyCode === 84 && e.altKey && e.ctrlKey) {
      return optionsChangeHandler('text', text + '™');
    }
    if (e && e.keyCode === 82 && e.altKey && e.ctrlKey) {
      return optionsChangeHandler('text', text + '®');
    }
  };

  const addEventListener = () => {
    if (textRef && textRef.current) {
      // @ts-ignore
      textRef?.current.addEventListener('keydown', (e: any) => textHandler(e));
    }
  };

  const insertSymbol = (symbol: string) => {
    optionsChangeHandler('text', options?.text + symbol);
  };

  return (
    <ToolBtn
      isOpenEditTool={isOpenEditTool}
      onSelect={() => onToolChange(tools.watermark)}
      icon={tools.watermark.icon}
      active={isActive}
      placement="right"
      title="watermark"
      toolTitle={tools.watermark.title}
      toolSubPanelClasses="tw-w-280px "
    >
      <div className="watermark">
        <h2 className="tw-text-xl tw-font-semibold tw-mb-2">Watermark</h2>

        <Tabs defaultActiveKey={tabstate.toString()} className="tw-w-full">
          <TabPane
            tab={
              <span
                className="styled-tabs-watermark"
                onClick={() => setTabstate(1)}
              >
                Image
              </span>
            }
            key="1"
          >
            <div>
              <div
                className="tw-h-100px tw-my-4"
                onClick={clickAddImageHandler}
              >
                {options.imageBase64 ? (
                  <img
                    className="tw-w-full tw-h-full tw-object-contain tw-cursor-pointer tw-rounded-3"
                    src={options.imageBase64}
                  />
                ) : (
                  <div className="tw-bg-app-dark tw-bg-opacity-40 tw-rounded-3 tw-p-6 tw-h-full">
                    <div className="tw-border tw-border-dashed tw-border-white tw-border-opacity-40 tw-h-full tw-w-full tw-flex tw-items-center tw-justify-center tw-py-5 tw-cursor-pointer">
                      <div className="tw-opacity-40">Upload image</div>
                    </div>
                  </div>
                )}
              </div>
              <input
                type="file"
                id="file"
                ref={fileUploader}
                style={{ display: 'none' }}
                accept="image/png, image/gif, image/jpeg"
                onChange={changeUploadFileHandler}
              />

              <Select
                value={options.imageposition || ''}
                onChange={(val) => optionsChangeHandler('imageposition', val)}
                className="tw-w-full tw-rounded tw-bg-white app-selectable"
              >
                {watermarkPositions.map((position, index) => (
                  <Select.Option
                    key={`position_${index}`}
                    value={position}
                    className="app-selectable"
                  >
                    {position}
                  </Select.Option>
                ))}
              </Select>

              <WatermarkToolSlider
                value={options.size}
                title="Size"
                min={1}
                onChange={(val) => optionsChangeHandler('size', val)}
              />

              <WatermarkToolSlider
                value={options.imageopacity}
                title="Opacity"
                onChange={(val) => optionsChangeHandler('imageopacity', val)}
              />
            </div>
          </TabPane>
          <TabPane
            tab={
              <span
                className="styled-tabs-watermark"
                onClick={() => setTabstate(2)}
              >
                Text
              </span>
            }
            key="2"
          >
            <div onClick={addEventListener}>
              <AppInput
                inputRef={textRef}
                className="tw-border-transparent"
                placeholder="Text here"
                value={options.text.toString()}
                onChange={(e) => optionsChangeHandler('text', e.value)}
              />
              <p>
                Insert standard symbol <br />{' '}
              </p>
              <p className="tw-text-2xl tw-select-text tw-flex tw-gap-2">
                <span onClick={() => insertSymbol('©')}>©</span>
                <span onClick={() => insertSymbol('®')}>®</span>
                <span onClick={() => insertSymbol('™')}>™</span>
              </p>
              <Select
                value={options.textposition || ''}
                onChange={(val) => optionsChangeHandler('textposition', val)}
                className="tw-w-full tw-rounded tw-bg-white app-selectable"
              >
                {watermarkPositions.map((position, index) => (
                  <Select.Option
                    key={`position_${index}`}
                    value={position}
                    className="app-selectable"
                  >
                    {position}
                  </Select.Option>
                ))}
              </Select>

              <WatermarkToolSlider
                value={options.fontsize}
                title="Size"
                min={1}
                max={100}
                onChange={(val) => optionsChangeHandler('fontsize', val)}
              />

              <WatermarkToolSlider
                value={options.textopacity}
                title="Opacity"
                onChange={(val) => optionsChangeHandler('textopacity', val)}
              />

              <WatermarkToolSlider
                value={options.rotation}
                title="Angle"
                min={0}
                max={360}
                onChange={(val) => optionsChangeHandler('rotation', val)}
              />
            </div>
          </TabPane>
        </Tabs>
      </div>
    </ToolBtn>
  );
};

export default WatermarkToolBtn;
