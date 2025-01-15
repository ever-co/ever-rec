import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import classNames from 'classnames';
import TopMenuBar from '../../../components/pagesComponents/_singleImageScreen/topMenuBar/TopMenuBar';
import AppContainer from '../../../components/containers/appContainer/AppContainer';
import { Col, Row } from 'antd';
import UserShortInfo from '../../../components/containers/dashboardLayout/elements/UserShortInfo/UserShortInfo';
import ImageModal from '../../../components/pagesComponents/_singleImageScreen/imageModal/ImageModal';
import AppSpinner from '../../../components/containers/appSpinner/AppSpinner';
import { ILike } from 'app/interfaces/IEditorImage';
import useEnableComments from '../../../hooks/useEnableComments/useEnableComments';
import { getImageForPublicPage, likeImage } from 'app/services/screenshots';
import moment from 'moment';
import { newAppDateFormat } from 'app/utilities/common';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';
import { IUser } from 'app/interfaces/IUserData';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { getUserServerSideProps } from 'app/services/api/auth';
import { ISharedItem } from 'app/interfaces/ISharedItem';
import styles from '../../../pagesScss/image/Image.module.scss';
import UniqueViews from 'components/elements/UniqueViews';
import { IWorkspaceImage } from 'app/interfaces/IWorkspace';
import { addUniqueView } from 'app/services/imageandvideo';
import NoAccess from 'pages/no-access';

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const { refreshToken, idToken } = context.req.cookies;
  const forwarded = context.req.headers['x-forwarded-for'];

  const ip =
    typeof forwarded === 'string'
      ? forwarded.split(/, /)[0]
      : context.req.socket.remoteAddress;

  if (refreshToken && idToken) {
    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const user: IUser | null = await getUserServerSideProps(
      refreshToken,
      idToken,
      baseURL as any,
    );
    if (user) {
      return { props: { user, ip } };
    } else {
      return { props: { user: null, ip } };
    }
  } else {
    return { props: { user: null, ip } };
  }
};

const SharedImage: React.FC<ISharedItem> = ({ user, ip }) => {
  const router = useRouter();
  const [param, setParam] = useState('');
  const [image, setImage] = useState<IWorkspaceImage | null>(null);
  const [noImage, setNoImage] = useState(false);
  const [likes, setLikes] = useState<ILike[]>([]);
  const [itemOwner, setItemOwner] = useState<IUser | null>(null);
  const [isWorkspace, setIsWorkspace] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageHeight, setImageHeight] = useState(0);
  const { commentsTemplate } = useEnableComments({
    itemType: 'image',
    item: image as any,
    isPublic: true,
    user: user as any,
    isWorkspace,
    setPublicError: setNoImage,
    urlParams: param,
  });

  const getImage = useCallback(async () => {
    try {
      setIsLoading(true);
      const { id, ws } = router.query;
      if (id && typeof id === 'string') {
        const { image } = await getImageForPublicPage(id, Boolean(ws));

        if (!image) return setNoImage(true);

        setImage(image);
        setItemOwner(image.owner);
        image.dbData?.likes && setLikes(image.dbData.likes);
        setIsWorkspace(Boolean(ws));
      }

      setIsLoading(false);
    } catch (e) {
      console.log(e);
    }
  }, [router.query]);

  const setParams = useCallback(() => {
    const { id } = router.query;
    setParam('?shImage=' + id);
  }, [router.query]);

  useEffect(() => {
    if (!router.isReady) return;

    getImage();
    setParams();
  }, [router.isReady, getImage, setParams]);

  useEffect(() => {
    if (image?.dbData?.likes) {
      setIsLiked(likes.some((x) => x.uid === user?.id));
    }
  }, [image, likes, user?.id]);

  useEffect(() => {
    if (!image?.dbData) return;

    addUniqueView(user, ip, image.dbData, 'image', isWorkspace);
  }, [image]);

  const onItemLike = async () => {
    const { id: sharedLinkId, ws } = router.query;
    if (sharedLinkId && typeof sharedLinkId === 'string') {
      setIsLiked((prev) => !prev);
      const data = await likeImage(sharedLinkId, Boolean(ws));

      data && setLikes(data);
      !data && setIsLiked((prev) => !prev);
    }
  };

  const openImageModal = () => {
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
  };

  const getImageFromRef = (image: HTMLImageElement) => {
    if (!image) return;

    // handle browser refresh case
    image.onload = function () {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      setImageHeight(this.height);
    };

    setImageHeight(image.clientHeight);
  };

  const created =
    image?.dbData?.created &&
    moment(image.dbData?.created).format(newAppDateFormat);

  // Server-render loading state
  if (!image && !noImage) {
    return <AppSpinner show={true} />;
  }

  return (
    <>
      <TopMenuBar user={user as any} fromPage="image" />
      {noImage ? (
        <NoAccess />
      ) : (
        image && (
          <>
            <AppContainer
              className={classNames(styles.appContainer, 'tw-pt-10')}
            >
              <Row
                gutter={30}
                style={{ minHeight: '85vh', marginLeft: 0, marginRight: 0 }}
              >
                <Col xs={16} lg={16} xl={17} md={16}>
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
                            src={image.dbData?.link}
                            onClick={openImageModal}
                            className={classNames(
                              'tw-cursor-pointer',
                              (imageHeight > 580 || imageHeight === 0) &&
                                'tw-self-start', // match height of the parent component
                            )}
                            alt=""
                          />
                        )}
                      </div>
                    </div>

                    <div className="tw-flex tw-mt-7 tw-mb-5">
                      <div className="tw-flex tw-justify-between tw-mb-20px tw-w-full tw-items-center">
                        <h3 className="tw-text-3xl tw-mb-0 tw-max-w-90p tw-line-clamp-2">
                          <span className="default:tw-text-2xl lg:tw-text-4xl">
                            {image.dbData?.title}
                          </span>
                        </h3>
                        {user && (
                          <div
                            className="tw-cursor-pointer tw-min-w-35px"
                            onClick={onItemLike}
                          >
                            {isLiked ? (
                              <AiFillHeart color="#E6320C" size={35} />
                            ) : (
                              <AiOutlineHeart color="#E6320C" size={35} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="tw-flex default:tw-justify-between mx-md:tw-flex-wrap">
                      <UserShortInfo
                        user={itemOwner as any}
                        avaSize={80}
                        fullNameClasses="tw-text-xl tw-font-semibold"
                        emailClasses="tw-text-base"
                        disableGoToProfile
                      />
                      <div className="tw-ml-auto tw-flex tw-flex-col default:tw-justify-center mx-sm:tw-mt-10px mx-sm:tw-w-full mx-sm:tw-flex mx-sm:tw-items-end ">
                        <div className="tw-flex tw-flex-col tw-items-center">
                          <div className="tw-font-sm tw-flex tw-flex-wrap tw-justify-end tw-mt-4 tw-items-center">
                            <div className="tw-text-app-grey-darker tw-mr-2 tw-whitespace-nowrap">{`${
                              likes?.length || 'No'
                            } likes`}</div>
                            <div className="tw-mr-2">&bull;</div>
                            <UniqueViews
                              item={image}
                              user={user as any}
                              isOwner={user?.id == image?.dbData?.uid}
                              itemType="image"
                              isWorkspace={isWorkspace}
                              isPublic
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
                </Col>

                <Col xs={8} lg={8} xl={7} md={8} className="mx-lg:tw-my-30px">
                  <div className="tw-bg-blue-grey tw-rounded-2lg tw-py-6 tw-px-4 tw-shadow-md">
                    <div className="tw-bg-white tw-flex tw-flex-col tw-justify-between tw-rounded-b-md tw-rounded-tl-md tw-p-3">
                      {commentsTemplate}
                    </div>
                  </div>
                </Col>
              </Row>
            </AppContainer>
          </>
        )
      )}

      <ImageModal
        imageUrl={image?.dbData?.link as any}
        closeModal={closeImageModal}
        visible={showImageModal}
      />
      <AppSpinner show={isLoading} />
    </>
  );
};

export default SharedImage;
