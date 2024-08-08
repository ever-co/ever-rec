import React, { ChangeEvent, createRef } from 'react';

interface InjectedFileUploaderProps {
  onFileSelectorOpen: () => void;
}

interface FileUploaderProps {
  onFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  children(props: InjectedFileUploaderProps): JSX.Element;
}

export class FileUploader extends React.Component<FileUploaderProps> {
  fileSelectorOpen = () => {
    this.fileUploader.current?.click();
  };

  private fileUploader = createRef<HTMLInputElement>();

  render() {
    return (
      <>
        <input
          type="file"
          id="file"
          ref={this.fileUploader}
          style={{ display: 'none' }}
          accept="image/png, image/gif, image/jpeg"
          onChange={this.props.onFileSelected}
        />
        {this.props.children({
          onFileSelectorOpen: this.fileSelectorOpen,
        })}
      </>
    );
  }
}
