import React, { useEffect, useRef, useState } from 'react';
import 'clipboard-polyfill/overwrite-globals';
import TopMenuBar from './topMenuBar/TopMenuBar';
import AppContainer from '@/content/components/containers/appContainer/AppContainer';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { Col, Row } from 'antd';
import IEditorImage from '@/app/interfaces/IEditorImage';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import UserShortInfo from '../../components/containers/dashboardLayout/elements/UserShortInfo';
import {
  getExplorerData,
  getImageById,
  updateImageData,
} from '@/app/services/screenshots';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { panelRoutes } from '../../router/panelRoutes';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import classNames from 'classnames';
import ImageModal from './imageModal/ImageModal';
import AppSvg from '@/content/components/elements/AppSvg';
import { IUser } from '@/app/interfaces/IUserData';
import { useCopySourceURL } from '@/content/utilities/scripts/singleItemFunctions';
//@ts-ignore
import * as styles from './SingleImageScreen.module.scss';
import UniqueViews from '../../components/UniqueViews/UniqueViews';
import useInitImageVideoItem from '@/content/utilities/hooks/useInitImageVideoItem';
import SingleImagePageManageAreaTemplate from '@/content/panel/screens/singleImageScreen/SingleImagePageManageAreaTemplate';
import useWorkspaceItemsPermission from '../../hooks/useWorkspaceItemsPermission';
import VideoComments from '../videoEditorScreen/comments/VideoComments/VideoComments';

const SingleImageScreen: React.FC = () => {
  const { copySourceURL } = useCopySourceURL();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loaderState, setLoaderState] = useState<boolean>(false);
  const [imageModalState, setImageModalState] = useState(false);
  const image: IEditorImage = useSelector(
    (state: RootStateOrAny) => state.panel.editorImage,
  );
  const goBackFlag = useRef(true);
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);

  useEffect(() => {
    if (!image) {
      goBackFlag.current = false;
      getImage();
    }

    if (goBackFlag.current) {
      goBackFlag.current = false;
      navigate(-1);
    }
  }, []);

  const getImage = async () => {
    setLoaderState(true);
    const id = searchParams.get('id');
    if (id) {
      const image = await getImageById(id);
      if (!image) {
        navigate(panelRoutes.images.path);
      } else {
        dispatch(PanelAC.setEditorImage({ editorImage: image }));
        //@ts-ignore
        getExplorerData(image.dbData?.parentId);
        dispatch(PanelAC.resetExplorerDataLoader());
      }
    }
    setLoaderState(false);
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
    if (image) {
      updateImageTitle(image, title);
    }
  };
  const { titleContainer, editTitle, created, setTitleFocus } =
    useInitImageVideoItem({
      updateTitle,
      item: image,
      forSinglePage: true,
      canEditTitle: true,
    });

  const openImageModal = () => {
    setImageModalState(true);
  };

  const closeImageModal = () => {
    setImageModalState(false);
  };

  const [imageHeight, setImageHeight] = useState(0);
  const getImageFromRef = (image: HTMLImageElement) => {
    if (!image) return;

    // handle browser refresh case
    image.onload = function () {
      // @ts-ignore
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
              style={{ minHeight: '85vh', marginLeft: 0, marginRight: 0 }}
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
                    <div className="tw-overflow-y-scroll tw-scrollbar-thin tw-scrollbar-thumb-gray-400 tw-scrollbar-track-gray-100 tw-scrollbar-thumb-rounded-full tw-scrollbar-track-rounded-full tw-rounded-2lg tw-flex tw-items-center tw-justify-center tw-bg-blue-grey tw-h-600px">
                      <img
                        ref={getImageFromRef}
                        src={image.url}
                        onClick={openImageModal}
                        className={classNames(
                          'tw-cursor-pointer',
                          imageHeight > 600 && 'tw-self-start', // match height of the parent component
                        )}
                        alt=""
                      />
                    </div>
                  </div>

                  <div className="tw-flex tw-mt-2 tw-mb-3">
                    <div className="tw-flex tw-justify-between tw-w-full tw-items-center">
                      {titleContainer}
                      {!editTitle && (
                        <div
                          className="tw-ml-3 tw-cursor-pointer tw-min-w-25px tw-text-dark-grey"
                          onClick={() => setTitleFocus()}
                        >
                          <AppSvg
                            path="images/panel/common/edit-pencil-light.svg"
                            size={'25px'}
                          />
                        </div>
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
                  setLoaderState={setLoaderState}
                />
              </Col>
            </Row>
          </AppContainer>
        </>
      )}

      <ImageModal
        imageUrl={image?.url}
        closeModal={closeImageModal}
        visible={imageModalState}
      />
      <AppSpinner show={loaderState} />
    </>
  );
};

export default SingleImageScreen;
