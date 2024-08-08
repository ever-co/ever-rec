import { useEffect, useState } from 'react';
import { IDbFolderData } from '@/app/interfaces/IEditorImage';
// import { DbFolderData as DbFolderVideoData } from '@/app/interfaces/IEditorVideo';
import IExplorerData from '@/app/interfaces/IExplorerData';
import { IWorkspace } from '@/app/interfaces/IWorkspace';

const useFolderNavigationHistory = (explorerData: IExplorerData | null) => {
  const [folderHistory, setFolderHistory] = useState<IDbFolderData[]>([]);

  // Effect for accumulating and resetting folders in history
  useEffect(() => {
    if (!explorerData) return;
    if (!explorerData.currentFolder) return setFolderHistory([]);

    const currentFolder: IDbFolderData = explorerData.currentFolder;
    setFolderHistory((prevFolders) => {
      const newFolders = [...prevFolders];

      // Remove all history if navigation occurs from favorite folder sidebar
      // Currently there is no easy way to recreate the full path
      if (explorerData?.navigationFromFavoriteFolder) {
        return [currentFolder];
      }

      // Check if folder exists in history
      const toPush = newFolders.every(
        (folder: IDbFolderData) => folder.id !== currentFolder.id,
      );
      if (!toPush && newFolders.length !== 0) {
        return prevFolders;
      }

      newFolders.push(currentFolder);
      return newFolders;
    });
  }, [explorerData]);

  const removeLastFolder = () => {
    setFolderHistory((prevFolders) => {
      const newFolders = [...prevFolders];
      newFolders.pop();
      return newFolders;
    });
  };

  const switchToFolder = (folder: IDbFolderData) => {
    setFolderHistory((prevFolders) => {
      const folders = [...prevFolders];
      const switchFolder = folders.indexOf(folder);
      const newFolders = folders.slice(0, switchFolder + 1); // [start, end)

      return newFolders;
    });
  };

  return { folderHistory, removeLastFolder, switchToFolder };
};
export default useFolderNavigationHistory;
