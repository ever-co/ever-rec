import { IFavoriteFolders } from 'app/interfaces/Folders';
import { IDbFolderData } from 'app/interfaces/IEditorVideo';
import { getFoldersImageAPI } from 'app/services/api/image';
import {
  getVideoFavFoldersAPI,
  getVideoFoldersAPI,
} from 'app/services/api/video';
import { useEffect, useState } from 'react';
import { RootStateOrAny, useSelector, useDispatch } from 'react-redux';
import PanelAC from 'store/panel/actions/PanelAC';
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
    const data: any = await getVideoFavFoldersAPI();

    if (!data.data.images && !data.data.videos) {
      setLoader(false);
    }
    const imagesFav = data.data.images
      ? Object.keys(data.data.images).map((key) => ({
          ...data.data.images[key],
          uid: key,
        }))
      : [];

    const videosFav = data.data.videos
      ? Object.keys(data.data.videos).map((key) => ({
          ...data.data.videos[key],
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
        console.log(error);
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
