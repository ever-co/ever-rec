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

  if (refreshToken && idToken) {
    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const user: IUser | null = await getUserServerSideProps(
      refreshToken,
      idToken,
      baseURL as any,
    );
    if (user) {
      return { props: { user } };
    } else {
      return { props: { user: null } };
    }
  } else {
    return { props: { user: null } };
  }
};

const SharedImage: React.FC<ISharedItem> = ({ user }) => {
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
    // Workspace items have no comment storage: nothing is requested for them.
    item: (isWorkspace ? null : image) as any,
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
    const { id } = router.query;
    if (!image?.dbData || typeof id !== 'string') return;

    // Only the share link is sent: the API knows the viewer and the address.
    addUniqueView(id, 'image', isWorkspace).catch(() => undefined);
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
              className={classNames(styles.appContainer, 'tw-pt-8')}
            >
              <Row
                gutter={30}
                style={{ minHeight: '85vh', marginLeft: 0, marginRight: 0 }}
              >
                <Col xs={24} lg={16} xl={17} md={16}>
                  <div className="tw-flex tw-flex-col tw-w-full">
                    <div
                      className={classNames(
                        styles.imageWrapper,
                        'tw-w-full tw-p-3 tw-rounded-xl',
                      )}
                    >
                      <div
                        className="tw-overflow-y-scroll
tw-rounded-md tw-flex
tw-items-center tw-justify-center tw-h-500px"
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

                    <div className="tw-flex tw-mt-4 tw-mb-3">
                      <div className="tw-flex tw-justify-between tw-w-full tw-items-center">
                        <h3 className="tw-mb-0 tw-max-w-90p tw-line-clamp-2 tw-text-xl tw-font-semibold tw-text-foreground">
                          <span>{image.dbData?.title}</span>
                        </h3>
                        {user && (
                          <div
                            className={classNames(
                              'tw-flex tw-size-9 tw-shrink-0 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-md tw-transition-colors tw-duration-150 hover:tw-bg-accent',
                              isLiked
                                ? 'tw-text-destructive-text'
                                : 'tw-text-muted-foreground hover:tw-text-foreground',
                            )}
                            onClick={onItemLike}
                          >
                            {isLiked ? (
                              <AiFillHeart size={20} />
                            ) : (
                              <AiOutlineHeart size={20} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="tw-flex default:tw-justify-between mx-md:tw-flex-wrap">
                      <UserShortInfo
                        user={itemOwner as any}
                        avaSize={40}
                        fullNameClasses="tw-text-sm tw-font-medium tw-truncate"
                        emailClasses="tw-text-xs"
                        disableGoToProfile
                      />
                      <div className="tw-ms-auto tw-flex tw-flex-col default:tw-justify-center mx-sm:tw-mt-10px mx-sm:tw-w-full mx-sm:tw-flex mx-sm:tw-items-end ">
                        <div className="tw-flex tw-flex-col tw-items-center">
                          <div className="tw-flex tw-flex-wrap tw-justify-end tw-items-center tw-text-[13px] tw-text-muted-foreground">
                            <div className="tw-me-2 tw-whitespace-nowrap">{`${
                              likes?.length || 'No'
                            } likes`}</div>
                            <div className="tw-me-2">&bull;</div>
                            <UniqueViews
                              item={image}
                              user={user as any}
                              isOwner={user?.id == image?.dbData?.uid}
                              itemType="image"
                              isWorkspace={isWorkspace}
                              isPublic
                            />
                            <div className="tw-me-2">&bull;</div>
                            <div className="tw-flex tw-justify-end tw-whitespace-nowrap">
                              {created}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Col>

                {!isWorkspace && (
                  <Col
                    xs={24}
                    lg={8}
                    xl={7}
                    md={8}
                    className="mx-lg:tw-my-30px"
                  >
                    <div className="tw-rounded-xl tw-border tw-border-solid tw-border-border tw-bg-card tw-p-3">
                      <div className="tw-flex tw-flex-col tw-justify-between">
                        {commentsTemplate}
                      </div>
                    </div>
                  </Col>
                )}
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
