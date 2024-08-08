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
        onClick={() => setFavorite((prev) => !prev)}
      >
        <AppSvg
          size="27px"
          path={favorite ? favoriteFilled.src : favoriteEmpty.src}
        />
      </div>
    )
  );
};

export default WhiteboardCardFavoriteIcon;
