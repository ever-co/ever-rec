/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react';
import { Col, Image, Modal, Row } from 'antd';
import AppButton from 'components/controls/AppButton';
import IExplorerData from 'app/interfaces/IExplorerData';
import { getExplorerData } from 'app/services/screenshots';

import { RootStateOrAny, useSelector } from 'react-redux';
import EmptyScreenshotsOrVideos from 'components/pagesComponents/_imagesScreen/pages/shared/components/EmptyScreenshotsOrVideos';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import styles from './imageChooser.module.scss';
import { useTranslation } from 'react-i18next';

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

  const { t } = useTranslation();
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
        <div className={styles.wrapper}>
          {explorerData.files.length > 0 ? (
            <Row gutter={30} style={{ width: '100%', padding: '1rem' }}>
              {explorerData?.files?.map((item, index) => (
                <Col
                  key={index}
                  xs={24}
                  sm={24}
                  md={24}
                  lg={12}
                  xxl={8}
                  className={styles.item}
                >
                  <div className={styles.imageWrapper}>
                    <div id="cover">
                      <Image
                        width={390}
                        height={220}
                        className={styles.image}
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
                    <h1 className={styles.title}>{item.dbData?.title}</h1>
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
      <div className={styles.imagesWrapper}>
        <h2 className={styles.imagesContainer}>{t('navigation.myImages')}</h2>
        <label htmlFor={actual}>
          <AppButton
            onClick={() => console.log()}
            className={styles.button}
            twPadding={styles.btnPadding}
          >
            {t('page.image.chooseFromComputer')}
          </AppButton>
        </label>
      </div>
    </Modal>
  );
};
export default ImageChooser;
