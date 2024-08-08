import React, { DragEvent, useEffect, useState } from 'react';
import { Button, Col, Image, Modal, Row } from 'antd';
import AppButton from '@/content/components/controls/appButton/AppButton';
import IExplorerData from '@/app/interfaces/IExplorerData';
import { getExplorerDataVideo } from '@/app/services/videos';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import EmptyScreenshotsOrVideos from '../../../imagesScreen/components/emptyScreenshotsOrVideos/EmptyScreenshotsOrVideos';
import { ItemTypeEnum } from '../../../imagesScreen/pages/shared/enums/itemTypeEnum';
import { IUser } from '@/app/interfaces/IUserData';
import Plyr from 'plyr';
import PlyrPlayer from '../../../videoEditorScreen/plyrPlayer/PlyrPlayer';

// import { Player, BigPlayButton } from 'video-react';

interface Props {
  visible: boolean;
  onOk: (source: string, type: boolean) => void;
  onCancel: () => void;
  actual: string;
}

const VideoChooser: React.FC<Props> = ({ visible, onOk, onCancel, actual }) => {
  const explorerData: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
  );
  const explorerDataVideos: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideos,
  );
  const explorerDataVideosLoaded: boolean = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideosLoaded,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);

  useEffect(() => {
    if (!explorerDataVideosLoaded) {
      (async function () {
        try {
          setLoading(true);
          await getExplorerDataVideo();
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [user, explorerDataVideosLoaded]);

  return (
    <Modal
      visible={visible}
      closable={true}
      onCancel={onCancel}
      width={1320}
      footer={
        <div className="tw-mt-4  tw-pb-4 tw-h-500px  tw-rounded-md  tw-overflow-auto  choose-modal ">
          {explorerDataVideos.files.length > 0 ? (
            <Row className="tw-w-full tw-p-4" gutter={30}>
              {explorerDataVideos?.files?.map((item, index) => (
                <Col
                  key={index}
                  xs={24}
                  sm={24}
                  md={24}
                  lg={12}
                  xxl={8}
                  className="tw-mb-10"
                >
                  <>
                    <div
                      className="tw-border tw-border-4 tw-border-primary-purple   tw-rounded-lg tw-bg-black tw-flex tw-items-center tw-justify-center tw-flex-col  "
                      style={{ height: '210px' }}
                    >
                      <Button
                        className=" !tw-absolute !tw-z-10 !tw-right-20px !tw-top-10px !tw-p-1 !tw-h-45px !tw-w-90px !tw-bg-choose-btn !tw-text-white !tw-rounded-lg  hover:!tw-text-white hover:!tw-shadow-xl hover:!tw-bg-choose-btn-active "
                        onClick={() => {
                          onOk(item.url, true);
                        }}
                      >
                        Choose{' '}
                      </Button>

                      <PlyrPlayer videoURL={item.url} disableOptions={true} />
                    </div>
                    <div>
                      <h1 className="tw-text-left tw-text-lg tw-truncate tw-mt-2">
                        {item?.dbData?.title}
                      </h1>
                    </div>
                  </>
                </Col>
              ))}
            </Row>
          ) : (
            <EmptyScreenshotsOrVideos emptyType={ItemTypeEnum.videos} />
          )}
        </div>
      }
    >
      <div className="tw-flex tw-items-center tw-justify-between tw-w-full tw-pr-5  ">
        <h2 className="tw-mb-6 tw-text-xl tw-font-bold">My Videos</h2>
        <label htmlFor={actual}>
          <AppButton
            disabled={true}
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
export default VideoChooser;
