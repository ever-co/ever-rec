import { RootStateOrAny, useSelector } from 'react-redux';
import ImageModal from '@/content/panel/screens/singleImageScreen/imageModal/ImageModal';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import { IWorkspaceImage } from '@/app/interfaces/IWorkspace';
import UniqueViews from '@/content/panel/components/UniqueViews/UniqueViews';
import { getWorkspaceImageAPI } from '@/app/services/api/workspace';
import { ResStatusEnum } from '@/app/interfaces/IDataResponse';
import { copySourceURL } from '@/content/utilities/scripts/singleItemFunctions';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import UserShortInfo from '@/content/panel/components/containers/dashboardLayout/elements/UserShortInfo';
import TopMenuBar from '@/content/panel/screens/singleImageScreen/topMenuBar/TopMenuBar';
import { errorHandler } from '@/app/services/helpers/errors';
import AppContainer from '@/content/components/containers/appContainer/AppContainer';
import ItemsFolderModal from '@/content/panel/screens/imagesScreen/components/itemsFolderModal/ItemsFolderModal';
import { useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
//@ts-ignore
import styles from '../singleImageScreen/SingleImageScreen.module.scss';
import { Col, Row } from 'antd';
import AppSvg from '@/content/components/elements/AppSvg';
import SingleImagePageManageAreaTemplate from '@/content/panel/screens/singleImageScreen/SingleImagePageManageAreaTemplate';
import useInitImageVideoItem from '@/content/utilities/hooks/useInitImageVideoItem';
import { updateItemDataWorkspace } from '@/app/services/workspace';
import useWorkspaceItemsPermission from '../../hooks/useWorkspaceItemsPermission';
import VideoComments from '../videoEditorScreen/comments/VideoComments/VideoComments';
import { IUserShort } from '@/app/interfaces/IUserData';

const WorkspaceSingleImageScreen = () => {
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const [searchParams] = useSearchParams();
  const [loaderState, setLoaderState] = useState<boolean>(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [imageModalState, setImageModalState] = useState(false);
  const [image, setImage] = useState<IWorkspaceImage | null>(null);
  const activeWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const { canEditItem } = useWorkspaceItemsPermission({ item: image?.dbData });
  const { titleContainer, editTitle, created, setTitleFocus } =
    useInitImageVideoItem({
      updateTitle,
      item: image,
      forSinglePage: true,
      canEditTitle: canEditItem(image?.dbData),
    });
  const [imageOwner, setImageOwner] = useState<IUserShort | null>(null);

  const getImage = useCallback(async () => {
    setLoaderState(true);
    const itemId = searchParams.get('id');
    if (activeWorkspace && itemId) {
      const response = await getWorkspaceImageAPI(activeWorkspace?.id, itemId);

      if (response.status === ResStatusEnum.error) {
        errorHandler(response);
        return;
      }

      const image = response.data;
      setImage(image);
      setImageOwner(image?.dbData?.user || null);
    }

    setLoaderState(false);
  }, [activeWorkspace]);

  useEffect(() => {
    !image && getImage();
  }, [activeWorkspace]);

  const [imageHeight, setImageHeight] = useState(0);
  const getImageFromRef = (image: HTMLImageElement) => {
    if (!image) return;

    // handle browser refresh case
    image.onload = function () {
      //@ts-ignore
      setImageHeight(this.height);
    };

    setImageHeight(image.clientHeight);
  };

  async function updateTitle(newTitle: string) {
    if (!image) return;

    const { dbData } = image;
    if (dbData) {
      dbData.title = newTitle;
      await updateItemDataWorkspace(activeWorkspace.id, dbData, 'image');
    }
  }

  return (
    <>
      {image && (
        <>
          <TopMenuBar user={user} fromPage="image" />
          <AppContainer className={classNames(styles.appContainer, 'tw-pt-10')}>
            <Row
              gutter={30}
              style={{
                minHeight: '85vh',
                marginLeft: 0,
                marginRight: 0,
              }}
              className="max-small:tw-block sm:tw-justify-center md:tw-justify-center"
            >
              <Col
                xs={24}
                sm={22}
                lg={16}
                xl={17}
                md={22}
                className="max-small:!tw-m-8 "
              >
                <div className="tw-flex tw-flex-col tw-w-full">
                  <div
                    className={classNames(
                      styles.imageWrapper,
                      'tw-w-full tw-py-5 tw-px-5 tw-rounded-md tw-bg-blue-grey tw-shadow-round-sm',
                    )}
                  >
                    <div
                      className="tw-overflow-y-scroll
tw-scrollbar-thin tw-scrollbar-thumb-gray-400 tw-scrollbar-track-gray-100
tw-scrollbar-thumb-rounded-full tw-scrollbar-track-rounded-full
tw-rounded-2lg tw-flex
tw-items-center tw-justify-center tw-bg-blue-grey tw-h-500px"
                    >
                      {image && (
                        <img
                          ref={getImageFromRef}
                          src={image.url}
                          onClick={() => setImageModalState(true)}
                          className={classNames(
                            'tw-cursor-pointer',
                            (imageHeight > 600 || imageHeight === 0) &&
                              'tw-self-start', // match height of the parent component
                          )}
                          alt=""
                        />
                      )}
                    </div>
                  </div>

                  <div className="tw-flex tw-my-4">
                    <div className="tw-flex tw-justify-between tw-w-full tw-items-center">
                      <div
                        className={classNames(
                          'tw-flex tw-items-center tw-mb-0 tw-bg-transparent tw-resize-none tw-w-full tw-overflow-hidden',
                          'default:tw-text-2xl lg:tw-text-4xl',
                        )}
                      >
                        {titleContainer}
                        {!editTitle && (
                          <AppSvg
                            className="tw-ml-3 tw-cursor-pointer tw-min-w-25px tw-text-dark-grey"
                            path="images/panel/common/edit-pencil-light.svg"
                            size={25 + 'px'}
                            onClick={() => setTitleFocus()}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="tw-flex default:tw-justify-between mx-lg:tw-flex-wrap">
                    <UserShortInfo
                      user={imageOwner}
                      avaSize={80}
                      fullNameClasses="tw-text-xl tw-font-semibold"
                      emailClasses="tw-text-base"
                    />
                    <div className="tw-ml-auto tw-flex tw-flex-col default:tw-justify-center mx-lg:tw-mt-25px mx-sm:tw-w-full mx-sm:tw-flex mx-sm:tw-items-end ">
                      <div className="tw-flex tw-flex-col tw-items-end">
                        <div className="tw-flex tw-justify-end">
                          <div
                            className="tw-flex tw-cursor-pointer"
                            onClick={() => copySourceURL(image)}
                          >
                            <AppSvg
                              className="tw-mr-2"
                              path="images/panel/common/Link.svg"
                              size={'20px'}
                            />
                            <div className="tw-text-app-grey-darker tw-text-sm ">
                              Source URL
                            </div>
                          </div>
                        </div>

                        <div className="tw-font-sm tw-flex tw-flex-wrap tw-justify-end tw-mt-4 tw-items-center">
                          <div className="tw-text-app-grey-darker tw-mr-2 tw-whitespace-nowrap">{`${
                            image?.dbData?.likes?.length || 'No'
                          } likes`}</div>
                          <div className="tw-mr-2">&bull;</div>
                          <UniqueViews
                            item={image}
                            user={user}
                            isOwner={true}
                            itemType="image"
                            isWorkspace
                            hasBorderStyle={false}
                          />
                          {/* <div className="tw-text-app-grey-darker tw-mr-2 tw-whitespace-nowrap">{`${
                            image.dbData?.views || 'No'
                          } views`}</div> */}
                          <div className="tw-mr-2">&bull;</div>
                          <div className="tw-font-sm tw-flex tw-justify-end tw-text-app-grey-darker tw-whitespace-nowrap">
                            {created}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <VideoComments
                  itemId={image?.dbData?.id || ''}
                  userId={user?.id}
                  itemOwnerId={user?.id}
                />
              </Col>

              <Col
                xs={24}
                sm={22}
                lg={8}
                xl={7}
                md={22}
                className=" mx-lg:tw-my-0px max-small:!tw-my-60px max-small:!tw-m-8 mx-md:!tw-my-60px"
              >
                <SingleImagePageManageAreaTemplate
                  image={image}
                  user={user}
                  setImage={setImage}
                  workspace={activeWorkspace}
                  setLoaderState={setLoaderState}
                />
              </Col>
            </Row>
          </AppContainer>
          <ImageModal
            imageUrl={image.url}
            closeModal={() => setImageModalState(false)}
            visible={imageModalState}
          />
        </>
      )}
      <AppSpinner show={loaderState} />
    </>
  );
};

export default WorkspaceSingleImageScreen;
