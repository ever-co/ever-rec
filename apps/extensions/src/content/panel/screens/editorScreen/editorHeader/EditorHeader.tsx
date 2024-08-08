import Logo from '@/content/components/elements/Logo';


const EditorHeader: React.FC = ({children}) => {

  return (
    <div
    className="tw-fixed tw-z-50 tw-top-0 tw-w-full tw-flex tw-justify-between tw-items-center tw-bg-purple tw-px-7 tw-h-10"
    >
      <div className="tw-text-3xl tw-mr-4 tw-items-center">
        <Logo type="yellow" />
      </div>
      <div className="tw-w-full tw-text-center tw-font-semibold tw-text-lg">
        {children}
      </div>
    </div>
  );
}

export default EditorHeader;