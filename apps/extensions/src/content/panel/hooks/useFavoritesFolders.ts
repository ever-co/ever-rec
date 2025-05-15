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
const useFavoritesFolders = () => {
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
    const videoApi = await getVideoFoldersAPI();
    const imageApi = await getFoldersImageAPI();
    const data2: any = await getVideoFavFoldersAPI();

    if (!data2.data.images && !data2.data.videos) return;
    const imagesFav = data2?.data?.images
      ? Object.keys(data2.data.images).map((key) => ({
          ...data2.data.images[key],
          uid: key,
        }))
      : [];

    const videosFav = data2?.data?.videos
      ? Object.keys(data2.data.videos).map((key) => ({
          ...data2.data.videos[key],
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
      data2,
    };
  };

  const ifImagesDontExist =
    favoritesImages.length == 0 && !favoriteFolders.images;
  const ifVideosDontExist =
    favoritesVideos.length == 0 && !favoriteFolders.videos;
  const favImgLength = favoriteFolders.images
    ? Object.keys(favoriteFolders.images).length
    : 0;
  const favVidLength = favoriteFolders.videos
    ? Object.keys(favoriteFolders.videos).length
    : 0;
  const ifImagesEqual = favoritesImages.length == favImgLength;
  const ifVideosEqual = favoritesVideos.length == favVidLength;

  useEffect(() => {
    if (ifImagesDontExist && ifVideosDontExist && refetchcount !== 0) return;
    if (ifImagesEqual && ifVideosEqual && refetchcount !== 0) return;
    (async function () {
      try {
        const data = await getFavFolders();
        dispatch(PanelAC.setFavoriteRefetch(1));
        console.log('data1', data);
      } catch (error) {
        console.error('data1 Failed to load explorer data:', error);

        dispatch(PanelAC.setFavoriteRefetch(1));
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
