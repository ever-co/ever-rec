import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import styles from 'pagesScss/image/Image.module.scss';
import { Col, Row } from 'antd';
import { useRouter } from 'next/router';
import { RootStateOrAny, useSelector } from 'react-redux';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import useInitImageVideoItem from 'hooks/useInitImageVideoItem';
import { IWorkspace, IWorkspaceImage } from 'app/interfaces/IWorkspace';
import { ResStatusEnum } from 'app/interfaces/IApiResponse';
import { errorHandler } from 'app/services/helpers/errors';
import { getWorkspaceImageAPI } from 'app/services/api/workspace';
import TopMenuBar from 'components/pagesComponents/_singleImageScreen/topMenuBar/TopMenuBar';
import AppContainer from 'components/containers/appContainer/AppContainer';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import UserShortInfo from 'components/containers/dashboardLayout/elements/UserShortInfo/UserShortInfo';
import { copySourceURL } from 'misc/singleItemFunctions';
import UniqueViews from 'components/elements/UniqueViews';
import ImageModal from 'components/pagesComponents/_singleImageScreen/imageModal/ImageModal';
import SingleImagePageManageAreaTemplate from 'components/pagesComponents/_singleImageScreen/SingleImagePageManageAreaTemplate';
import { updateItemDataWorkspace } from 'app/services/workspace';
import { BsPencil } from 'react-icons/bs';
import { IoLinkOutline } from 'react-icons/io5';
import useWorkspaceItemsPermission from 'hooks/useWorkspaceItemsPermission';
import { IUserShort } from 'app/interfaces/IUserData';
import VideoComments from 'components/pagesComponents/_videoEditorScreen/comments/VideoComments/VideoComments';

// TODO: Refactor that so some logic from the single image page can be abstracted.
const WorkspaceSingleImage = () => {
  const router = useRouter();
  const user = useAuthenticateUser();
  const [image, setImage] = useState<IWorkspaceImage | null>(null);
  const activeWorkspace: IWorkspace | null = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const [loaderState, setLoaderState] = useState<boolean>(false);
  const [imageModalState, setImageModalState] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [imageHeight, setImageHeight] = useState(0);
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
    const { imageId } = router.query;
    if (activeWorkspace && imageId && typeof imageId === 'string') {
      const response = await getWorkspaceImageAPI(activeWorkspace?.id, imageId);

      if (response.status === ResStatusEnum.error) {
        errorHandler(response);
        return;
      }

      const image = response.data;
      setImage(image);
      setImageOwner(image.dbData?.user || null);
    }
    setLoaderState(false);
  }, [activeWorkspace, router.query]);

  useEffect(() => {
    !image && getImage();
  }, [image, getImage]);

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
                        // eslint-disable-next-line @next/next/no-img-element
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
                          <BsPencil
                            color="#6E6E6E"
                            size={25}
                            className="tw-ml-3 tw-cursor-pointer tw-min-w-25px tw-text-dark-grey"
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
                      disableGoToProfile={imageOwner?.id !== user?.id}
                    />
                    <div className="tw-ml-auto tw-flex tw-flex-col default:tw-justify-center mx-lg:tw-mt-25px mx-sm:tw-w-full mx-sm:tw-flex mx-sm:tw-items-end ">
                      <div className="tw-flex tw-flex-col tw-items-end">
                        <div className="tw-flex tw-justify-end">
                          <div
                            className="tw-flex tw-cursor-pointer"
                            onClick={() => copySourceURL(image)}
                          >
                            <IoLinkOutline
                              size={20}
                              className="tw-min-w-20px tw-text-app-grey-darker tw-mr-2"
                            />
                            <div className="tw-text-app-grey-darker tw-text-sm ">
                              Source URL
                            </div>
                          </div>
                        </div>

                        <div className="tw-font-sm tw-flex tw-flex-wrap tw-justify-end tw-mt-4 tw-items-center">
                          <div className="tw-text-app-grey-darker tw-mr-2 tw-whitespace-nowrap">{`${
                            image.dbData?.likes?.length || 'No'
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
                  itemId={image?.dbData?.id}
                  userId={user?.id}
                  itemOwnerId={imageOwner?.id}
                />
              </Col>

              <Col
                xs={24}
                sm={22}
                lg={8}
                xl={7}
                md={22}
                className="mx-lg:tw-my-0px max-small:!tw-my-60px max-small:!tw-m-8 mx-md:!tw-my-60px"
              >
                <SingleImagePageManageAreaTemplate
                  image={image}
                  setImage={setImage}
                  workspace={activeWorkspace}
                  setLoaderState={setLoaderState}
                />
              </Col>
            </Row>
          </AppContainer>
        </>
      )}

      <ImageModal
        imageUrl={image?.url}
        closeModal={() => setImageModalState(false)}
        visible={imageModalState}
      />
      <AppSpinner show={loaderState} />
    </>
  );
};

export default WorkspaceSingleImage;
