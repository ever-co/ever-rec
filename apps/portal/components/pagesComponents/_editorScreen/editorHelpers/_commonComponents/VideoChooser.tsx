/* eslint-disable @next/next/no-img-element */
import React, { DragEvent, useEffect, useState } from 'react';
import { Button, Col, Image, Modal, Row } from 'antd';
import AppButton from 'components/controls/AppButton';
import IExplorerData from 'app/interfaces/IExplorerData';
import { getExplorerDataVideo } from 'app/services/videos';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import EmptyScreenshotsOrVideos from 'components/pagesComponents/_imagesScreen/pages/shared/components/EmptyScreenshotsOrVideos';
import PanelSplitter from '../../toolsPanel/PanelSplitter';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import { IUser } from 'app/interfaces/IUserData';
import Plyr from 'plyr';
import PlyrPlayer from 'components/shared/plyrPlayer/PlyrPlayer';
import styles from './videoChooser.module.scss';
// import { Player, BigPlayButton } from 'video-react';

interface Props {
  visible: boolean;
  onOk: (source: string, type: boolean) => void;
  onCancel: () => void;
  actual: string;
}

const VideoChooser: React.FC<Props> = ({ visible, onOk, onCancel, actual }) => {
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
        <div className={styles.footer}>
          {explorerDataVideos.files.length > 0 ? (
            <Row style={{ width: '100%', padding: '1rem' }} gutter={30}>
              {explorerDataVideos?.files?.map((item, index) => (
                <Col
                  key={index}
                  xs={24}
                  sm={24}
                  md={24}
                  lg={12}
                  xxl={8}
                  style={{ marginBottom: '2.5rem' }}
                >
                  <>
                    <div
                      className={styles.btnWrapper}
                      style={{ height: '210px' }}
                    >
                      <Button
                        className={styles.button}
                        onClick={() => {
                          onOk(item.url, true);
                        }}
                      >
                        Choose{' '}
                      </Button>

                      <PlyrPlayer videoURL={item.url} disableOptions={true} />
                    </div>
                    <div>
                      <h1 className={styles.title}>{item.dbData.title}</h1>
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
      <div className={styles.videosContainer}>
        <h2 className={styles.videosInnerContainer}>My Videos</h2>
        <label htmlFor={actual}>
          <AppButton
            disabled={true}
            onClick={() => console.log()}
            className={styles.appButton}
            twPadding={styles.appBtnPadding}
          >
            Choose from your computer
          </AppButton>
        </label>
      </div>
    </Modal>
  );
};
export default VideoChooser;
