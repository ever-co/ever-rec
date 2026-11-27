import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder } from 'lucide-react';
import useFavoritesFolders from 'hooks/useFavoritesFolders';

interface IStarredFolder {
  id: string;
  name: string;
  color?: string;
}

const Group: FC<{ title: string; folders: IStarredFolder[] }> = ({
  title,
  folders,
}) => (
  <div>
    <div className="tw-px-2.5 tw-pb-1 tw-pt-2 tw-text-xs tw-text-muted-foreground">
      {title}
    </div>
    <ul className="tw-m-0 tw-list-none tw-p-0">
      {folders.map((folder) => (
        <li
          key={folder.id}
          className="tw-flex tw-h-8 tw-items-center tw-gap-2 tw-px-2.5 tw-text-sm tw-text-sidebar-foreground"
        >
          <Folder
            className="tw-size-4 tw-shrink-0"
            // The folder's own colour is the person's label for it, so it stays.
            style={folder.color ? { color: folder.color } : undefined}
            fill={folder.color ? 'currentColor' : 'none'}
            fillOpacity={0.25}
            aria-hidden="true"
          />
          <span className="tw-min-w-0 tw-flex-1 tw-truncate">
            {folder.name}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * The starred folders under the "Starred" row. Mounted only while that row is open, so the
 * folders are asked for when somebody wants to see them.
 */
const StarredFolders: FC = () => {
  const { t } = useTranslation();
  const { favoritesImages, favoritesVideos, loader } = useFavoritesFolders();
  const none = !favoritesImages.length && !favoritesVideos.length;

  return (
    <div className="tw-ml-[19px] tw-max-h-48 tw-overflow-y-auto tw-border-0 tw-border-l tw-border-solid tw-border-sidebar-border tw-pl-2">
      {favoritesImages.length > 0 && (
        <Group title={t('common.images')} folders={favoritesImages as any} />
      )}
      {favoritesVideos.length > 0 && (
        <Group title={t('common.videos')} folders={favoritesVideos as any} />
      )}
      {none && (
        <div
          className="tw-px-2.5 tw-py-2 tw-text-xs tw-text-muted-foreground"
          role="status"
        >
          {loader ? t('shell.loading') : t('shell.noStarredFolders')}
        </div>
      )}
    </div>
  );
};

export default StarredFolders;
