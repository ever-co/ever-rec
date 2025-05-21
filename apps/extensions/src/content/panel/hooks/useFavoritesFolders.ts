import { IFavoriteFolders } from '@/app/interfaces/Folders';
import { IDbFolderData } from '@/app/interfaces/IEditorImage';
import { getFoldersImageAPI } from '@/app/services/api/image';
import {
  getVideoFavFoldersAPI,
  getVideoFoldersAPI,
} from '@/app/services/api/video';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { useEffect, useState } from 'react';
import { RootStateOrAny, useSelector, useDispatch } from 'react-redux';

const useFavoritesFolders = (): {
  favoritesImages: IDbFolderData[];
  favoritesVideos: IDbFolderData[];
  setFavoritesImages: React.Dispatch<React.SetStateAction<IDbFolderData[]>>;
  setFavoritesVideos: React.Dispatch<React.SetStateAction<IDbFolderData[]>>;
  loader: boolean;
  refetch: () => void;
} => {
  const [favoritesImages, setFavoritesImages] = useState<IDbFolderData[]>([]);
  const [favoritesVideos, setFavoritesVideos] = useState<IDbFolderData[]>([]);
  const [loader, setLoader] = useState(true);
  const dispatch = useDispatch();
  const favoriteFolders: IFavoriteFolders = useSelector(
    (state: RootStateOrAny) => state.panel.favoriteFolders,
  );
  const refetchcount: number = useSelector(
    (state: RootStateOrAny) => state.panel.refetchFavorites,
  );
  const refetch = () => {
    dispatch(PanelAC.setFavoriteRefetch(0));
  };
  const getFavFolders = async () => {
    const [videoApi, imageApi, allData] = await Promise.all([
      getVideoFoldersAPI(),
      getFoldersImageAPI(),
      getVideoFavFoldersAPI(),
    ]);

    if (!allData.data.images && !allData.data.videos) {
      setLoader(false); // Sets loader if both are missing, but continues
      return;
    }
    const imagesFav = allData.data.images
      ? Object.keys(allData.data.images).map((key) => ({
          ...allData.data.images[key],
          uid: key,
        }))
      : [];

    const videosFav = allData.data.videos
      ? Object.keys(allData.data.videos).map((key) => ({
          ...allData.data.videos[key],
          uid: key,
        }))
      : [];
    const images = imageApi.data.filter((v) =>
      imagesFav.some((x) => x.id === v.id),
    );
    const videos = videoApi.data.filter((v) =>
      videosFav.some((x) => x.id === v.id),
    );
    setLoader(false);
    setFavoritesImages(images || []);
    setFavoritesVideos(videos || []);

    return {
      videoApi,
      imageApi,
      allData,
    };
  };

  const ifImagesDontExist =
    favoritesImages.length === 0 && !favoriteFolders.images;
  const ifVideosDontExist =
    favoritesVideos.length === 0 && !favoriteFolders.videos;
  const favImgLength = favoriteFolders.images
    ? Object.keys(favoriteFolders.images).length
    : 0;
  const favVidLength = favoriteFolders.videos
    ? Object.keys(favoriteFolders.videos).length
    : 0;
  const ifImagesEqual = favoritesImages.length === favImgLength;
  const ifVideosEqual = favoritesVideos.length === favVidLength;

  useEffect(() => {
    if (ifImagesDontExist && ifVideosDontExist && refetchcount !== 0) return;
    if (ifImagesEqual && ifVideosEqual && refetchcount !== 0) return;
    (async function () {
      try {
        await getFavFolders();
      } catch (error) {
        console.log('error', error);
      } finally {
        dispatch(PanelAC.setFavoriteRefetch(1));
      }
    })();
  }, [favoriteFolders, refetchcount]);
  return {
    favoritesImages,
    favoritesVideos,
    setFavoritesImages,
    setFavoritesVideos,
    loader,
    refetch,
  };
};

export default useFavoritesFolders;
