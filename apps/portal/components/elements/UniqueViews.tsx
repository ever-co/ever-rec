import { ReactElement, useEffect, useRef, useState } from 'react';
import styles from './elementsStyles/UniqueViews.module.scss';
import { Popover, Spin } from 'antd';
import IEditorImage from 'app/interfaces/IEditorImage';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import { UniqueView } from 'app/interfaces/IUniqueView';
import { IUser } from 'app/interfaces/IUserData';
import { getItemUniqueViews } from 'app/services/imageandvideo';
import UserShortInfo from 'components/containers/dashboardLayout/elements/UserShortInfo/UserShortInfo';
import classNames from 'classnames';
import UniqueImage from './UniqueImage';
import { ItemType } from 'app/interfaces/ItemType';
import { useRouter } from 'next/router';

interface IUniqueViewsProps {
  item: IEditorImage | IEditorVideo;
  isOwner: boolean;
  user: IUser;
  itemType: ItemType;
  isWorkspace?: boolean;
  isPublic?: boolean;
  icon?: ReactElement | null;
  hasBorderStyle?: boolean;
}

const UniqueViews: React.FC<IUniqueViewsProps> = ({
  item,
  isOwner,
  user,
  itemType,
  icon = null,
  isWorkspace = false,
  isPublic = false,
  hasBorderStyle = true,
}) => {
  const shouldFetch = useRef(true);
  const router = useRouter();
  const [uniqueViews, setUniqueViews] = useState<UniqueView[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const getUniqueViews = async () => {
      if (!item || !item?.dbData || !shouldFetch.current) return;

      setLoading(true);

      const uniqueViewsDb = await getItemUniqueViews(
        user,
        item.dbData,
        itemType,
        isWorkspace,
      );

      uniqueViewsDb && setUniqueViews(uniqueViewsDb);
      shouldFetch.current = false;
      setLoading(false);
    };

    getUniqueViews();
  }, [isWorkspace, item, itemType, user, router.isReady]);

  let views: number;
  if (Array.isArray(item?.dbData?.views)) {
    views = item?.dbData && item.dbData.views.length;
  } else {
    views = (item?.dbData && item.dbData.views) || 0;
  }

  const viewString = views == 1 ? 'view' : 'views';
  const uniqueLength = uniqueViews.length;
  const uniqueString = uniqueViews.length === 1 ? 'view' : 'views';

  return isOwner ? (
    <Popover
      className="tw-p-0"
      placement="top"
      content={
        loading ? (
          <div className="tw-py-8 tw-px-12 tw-flex tw-items-center">
            <Spin spinning={loading} style={{ width: 18, height: 18 }} />
          </div>
        ) : (
          <div className={classNames(`${styles.bgColor}`, 'tw-p-5')}>
            <div className="tw-text-sm tw-font-bold tw-text-left tw-mb-2">
              Viewer Insights
            </div>
            <div className="tw-text-sm tw-text-center tw-mb-2 tw-bg-white tw-p-2 tw-rounded-lg">
              {`${views} unique ${viewString} | ${uniqueLength} user ${uniqueString}`}
            </div>
            {uniqueViews.length != 0 && (
              <div
                className={classNames(
                  'scroll-div scroll-div-unique-views tw-overflow-y-auto tw-max-h-200px',
                  uniqueLength > 3 && 'tw-pr-2',
                )}
              >
                {uniqueViews.map((view) => (
                  <div
                    key={view.id}
                    className={classNames(
                      'tw-flex tw-items-center tw-bg-white tw-p-2 tw-rounded-2xl tw-mb-1 tw-over',
                      uniqueLength > 3 && 'tw-pr-2',
                    )}
                  >
                    <UserShortInfo
                      user={{
                        id: view.id,
                        email: view.email,
                        photoURL: view.photoURL,
                      }}
                      hideInfo={true}
                      disableGoToProfile={true}
                    />
                    {view.displayName}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }
      trigger="click"
    >
      <button
        className={classNames(styles.noViews, hasBorderStyle && styles.border)}
      >
        {icon}

        {uniqueViews.length >= 1 && (
          <div className="tw-flex tw-items-center tw-mr-4">
            {uniqueViews.map(
              (view, index) =>
                index < 3 && <UniqueImage key={index} view={view} />,
            )}
          </div>
        )}

        <span className="tw-whitespace-nowrap">
          {`
          ${views || 'No'}
          ${viewString}
          `}
        </span>
      </button>
    </Popover>
  ) : (
    <div
      className={classNames(styles.border, styles.noViews, styles.noPointer)}
    >
      <span>{icon}</span>
      {`${views || 'No'} ${viewString}`}
    </div>
  );
};

export default UniqueViews;
