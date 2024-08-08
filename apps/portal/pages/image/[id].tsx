import React, { useEffect, useState } from 'react';
import TopMenuBar from 'components/pagesComponents/_singleImageScreen/topMenuBar/TopMenuBar';
import AppContainer from 'components/containers/appContainer/AppContainer';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { Col, Row } from 'antd';
import IEditorImage from 'app/interfaces/IEditorImage';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import UserShortInfo from 'components/containers/dashboardLayout/elements/UserShortInfo/UserShortInfo';
import 'react-tabs/style/react-tabs.css';
import {
  getExplorerData,
  getImageById,
  updateImageData,
} from 'app/services/screenshots';
import { panelRoutes, preRoutes } from 'components/_routes';
import PanelAC from 'app/store/panel/actions/PanelAC';
import classNames from 'classnames';
import ImageModal from 'components/pagesComponents/_singleImageScreen/imageModal/ImageModal';
import { BsPencil } from 'react-icons/bs';
import { IoLinkOutline } from 'react-icons/io5';
import { useRouter } from 'next/router';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import { copySourceURL } from 'misc/singleItemFunctions';
import styles from '../../pagesScss/image/Image.module.scss';
import UniqueViews from 'components/elements/UniqueViews';
import useInitImageVideoItem from 'hooks/useInitImageVideoItem';
import SingleImagePageManageAreaTemplate from '../../components/pagesComponents/_singleImageScreen/SingleImagePageManageAreaTemplate';
import VideoComments from 'components/pagesComponents/_videoEditorScreen/comments/VideoComments/VideoComments';

export interface deletionModalIntF {
  state: boolean;
  screenshot: IEditorImage | null;
}

export interface emailModalIntF {
  state: boolean;
  screenshot: IEditorImage | null;
}

const Image: React.FC = () => {
  const router = useRouter();
  const user = useAuthenticateUser();
  const dispatch = useDispatch();
  const image: IEditorImage = useSelector(
    (state: RootStateOrAny) => state.panel.editorImage,
  );
  const [loaderState, setLoaderState] = useState<boolean>(false);
  const [imageModalState, setImageModalState] = useState(false);
  const [imageHeight, setImageHeight] = useState(0);

  useEffect(() => {
    !image && getImage();
  }, [router.isReady]);

  const getImage = async () => {
    if (router.isReady) {
      try {
        setLoaderState(true);
        const { id } = router.query;
        if (id && typeof id === 'string') {
          const image = await getImageById(id);
          !image && router.push(preRoutes.media + panelRoutes.images);
          dispatch(PanelAC.setEditorImage({ editorImage: image }));
          getExplorerData(image.dbData?.parentId);
          dispatch(PanelAC.resetExplorerDataLoader());
        }
        setLoaderState(false);
      } catch (e) {
        console.log(e);
      }
    }
  };

  const updateImageTitle = async (image: IEditorImage, newTitle: string) => {
    const { dbData } = image;
    if (dbData) {
      dbData.title = newTitle;
      await updateImageData(dbData);
      dispatch(PanelAC.updateExplorerImageData({ image }));
    }
  };

  const updateTitle = (title: string) => {
    updateImageTitle(image, title);
  };

  const { titleContainer, editTitle, created, setTitleFocus } =
    useInitImageVideoItem({
      updateTitle,
      item: image,
      forSinglePage: true,
      canEditTitle: true,
    });

  const getImageFromRef = (image: HTMLImageElement) => {
    if (!image) return;

    // handle browser refresh case
    image.onload = function () {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      setImageHeight(this.height);
    };

    setImageHeight(image.clientHeight);
  };

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
tw-items-center tw-justify-center tw-bg-blue-grey tw-h-600px"
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

                  <div className="tw-flex tw-mt-2 tw-mb-3">
                    <div className="tw-flex tw-justify-between tw-w-full tw-items-center">
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

                  <div className="tw-flex default:tw-justify-between mx-lg:tw-flex-wrap">
                    <UserShortInfo
                      user={user}
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
                            <IoLinkOutline
                              size={20}
                              className="tw-min-w-20px tw-text-app-grey-darker tw-mr-2"
                            />
                            <div className="tw-text-app-grey-darker tw-text-sm ">
                              Source URL
                            </div>
                          </div>
                        </div>
                        <div className="tw-font-sm tw-flex tw-flex-wrap tw-justify-end tw-mt-4 tw-items-center ">
                          <div className="tw-text-app-grey-darker tw-mr-2 tw-whitespace-nowrap">{`${
                            image.dbData?.likes?.length || 'No'
                          } likes`}</div>
                          <div className="tw-mr-2">&bull;</div>
                          <UniqueViews
                            item={image}
                            user={user}
                            isOwner={true}
                            itemType="image"
                            hasBorderStyle={false}
                          />
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

export default Image;
