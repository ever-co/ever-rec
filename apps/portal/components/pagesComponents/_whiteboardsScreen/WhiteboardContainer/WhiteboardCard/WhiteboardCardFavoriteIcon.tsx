import { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';
import favoriteEmpty from 'public/whiteboards/favorite.svg';
import favoriteFilled from 'public/whiteboards/favorite_red.svg';
import AppSvg from 'components/elements/AppSvg';

interface IProps {
  favorite: boolean;
  isTrash: boolean;
  setFavorite: Dispatch<SetStateAction<boolean>>;
}

const WhiteboardCardFavoriteIcon: FC<IProps> = ({
  isTrash,
  favorite,
  setFavorite,
}) => {
  return (
    !isTrash && (
      <div
        style={{ cursor: 'pointer' }}
        className="tw-flex tw-size-8 tw-items-center tw-justify-center tw-rounded-md tw-transition-colors tw-duration-150 hover:tw-bg-[hsl(var(--on-overlay)/0.16)]"
        onClick={() => setFavorite((prev) => !prev)}
      >
        {/* The empty mark follows the text colour; the filled one keeps its own red. */}
        <AppSvg
          size="20px"
          path={favorite ? favoriteFilled.src : favoriteEmpty.src}
          className={favorite ? undefined : '[&_path]:tw-fill-current'}
        />
      </div>
    )
  );
};

export default WhiteboardCardFavoriteIcon;
