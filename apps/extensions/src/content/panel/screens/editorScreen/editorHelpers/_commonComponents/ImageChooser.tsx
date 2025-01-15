import React, { useEffect } from 'react';
import { Col, Image, Modal, Row } from 'antd';
import AppButton from '@/content/components/controls/appButton/AppButton';
import IExplorerData from '@/app/interfaces/IExplorerData';
import { getExplorerData } from '@/app/services/screenshots';
import { RootStateOrAny, useSelector } from 'react-redux';
import EmptyScreenshotsOrVideos from '../../../imagesScreen/components/emptyScreenshotsOrVideos/EmptyScreenshotsOrVideos';
import { ItemTypeEnum } from '../../../imagesScreen/pages/shared/enums/itemTypeEnum';

interface Props {
  visible: boolean;
  onOk: (source: string, type: boolean) => void;
  onCancel: () => void;
  actual: string;
}

const ImageChooser: React.FC<Props> = ({ visible, onOk, onCancel, actual }) => {
  const explorerData: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
  );

  useEffect(() => {
    getExplorerData();
  }, []);

  return (
    <Modal
      open={visible}
      closable={true}
      onCancel={onCancel}
      width={1320}
      footer={
        <div className="tw-mt-4 tw-pt-10 tw-pb-4 tw-h-500px  tw-rounded-md  tw-overflow-auto   ">
          {explorerData.files.length > 0 ? (
            <Row className="tw-w-full tw-p-4" gutter={30}>
              {explorerData?.files?.map((item, index) => (
                <Col
                  key={index}
                  xs={24}
                  sm={24}
                  md={24}
                  lg={12}
                  xxl={8}
                  className="tw-mb-8 !tw-overflow-hidden "
                >
                  <div className="tw-border-2 tw-border-primary-purple tw-h-220px tw-rounded-lg tw-bg-black tw-flex tw-items-center tw-justify-center tw-flex-col !tw-overflow-hidden tw-cursor-pointer">
                    <div id="cover">
                      <Image
                        width={390}
                        height={220}
                        className=" tw-object-cover tw-w-full"
                        preview={false}
                        onClick={(e) => {
                          onOk((e.target as HTMLImageElement).src, false);
                        }}
                        src={item.url}
                        alt="ad"
                      />
                    </div>
                  </div>
                  <div>
                    <h1 className="tw-text-left tw-text-lg tw-truncate tw-mt-2">
                      {item?.dbData?.title}
                    </h1>
                  </div>
                </Col>
              ))}
            </Row>
          ) : (
            <EmptyScreenshotsOrVideos emptyType={ItemTypeEnum.images} />
          )}
        </div>
      }
    >
      <div className="tw-flex tw-items-center tw-justify-between tw-w-full tw-pr-5  ">
        <h2 className="tw-mb-6 tw-text-xl tw-font-bold">My Images</h2>
        <label htmlFor={actual}>
          <AppButton
            onClick={() => console.log()}
            className="tw-text-white tw-pb-2 tw-pt-2"
            twPadding="tw-px-14"
          >
            Choose from your computer
          </AppButton>
        </label>
      </div>
    </Modal>
  );
};
export default ImageChooser;
