import { IDbFolderData } from 'app/interfaces/IEditorImage';
import React, { useEffect, useRef, useState } from 'react';
import SidebarFolderItem from '../folderItem/SidebarFolderItem';
import classNames from 'classnames';
import styles from './Folder.module.scss';
import { SlideDown } from 'react-slidedown';
import { IWorkspaceDbFolder } from 'app/interfaces/IWorkspace';
import 'react-slidedown/lib/slidedown.css';

interface IFolderProps {
  leftMargin: number;
  folder: IDbFolderData | IWorkspaceDbFolder;
  children?: any;
  setSelectedFolder: React.Dispatch<
    React.SetStateAction<IWorkspaceDbFolder | IDbFolderData>
  >;
  highlightedRef: React.Ref<HTMLDivElement>;
  RootFolderName?: string;
  setHighlightedRef: (state: React.Ref<HTMLDivElement>) => void;
}

const Folder: React.FC<IFolderProps> = ({
  leftMargin,
  folder,
  children,
  setSelectedFolder,
  highlightedRef,
  RootFolderName,
  setHighlightedRef,
}) => {
  const [showSubFolders, setShowSubFolders] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const currentRef = useRef(null);
  const showChildren = children && children.length > 0;

  useEffect(() => {
    if (currentRef === highlightedRef) {
      setHighlighted(true);
    } else {
      setHighlighted(false);
    }
  }, [currentRef, highlightedRef]);

  const toggleExpand = () => {
    setIsExpanded((oldState) => !oldState);
    setShowSubFolders((oldState) => !oldState);
  };

  return (
    <div ref={currentRef}>
      <SidebarFolderItem
        style={{ marginLeft: `${leftMargin}px` }}
        className={`${styles.folder} ${highlighted && styles.highlighted}`}
        key={folder ? `${folder.id}` : undefined}
        title={(folder?.name || RootFolderName) as any}
        showArrow={showChildren}
        isExpanded={isExpanded}
        toggleExpand={toggleExpand}
        onClick={() => {
          setHighlightedRef(currentRef);
          setSelectedFolder(folder);
        }}
        color={folder && folder.color ? folder.color : '#7737FF'}
      />
      <SlideDown
        transitionOnAppear={true}
        className={classNames(styles.subItemsWrapper, 'my-dropdown-slidedown')}
      >
        {children && showSubFolders && (
          <div className={styles.show}>
            <div className={styles.slideInDiv}>{children}</div>
          </div>
        )}
      </SlideDown>
    </div>
  );
};

export default Folder;
