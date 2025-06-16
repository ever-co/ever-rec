import React, { useEffect, useRef, useState } from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import { ReactMultiEmail } from 'react-multi-email';
import AppButton from '@/content/components/controls/appButton/AppButton';
import { Checkbox, Input } from 'antd';
import {
  errorMessage,
  loadingMessage,
} from '@/app/services/helpers/toastMessages';
import { errorHandler } from '@/app/services/helpers/errors';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { sendItem } from '@/app/services/imageandvideo';
import IconBtn from '../../components/IconBtn';
import closeIcon from '@/content/assests/svg/tools-panel/close.svg';

const { TextArea } = Input;
interface IEmailToolProps {
  active: boolean;
  isOpenEmailTool: boolean;
  onSelect: (tool: ITool | null) => void;
  emails?: string[];
  onSave: () => void;
}

const SendEmailTool: React.FC<IEmailToolProps> = ({
  active,
  isOpenEmailTool,
  onSelect,
  emails,
  onSave,
}) => {
  const dispatch = useDispatch();

  const subpanelRef = useRef<{
    closePanel: () => void;
  }>(null);

  const closeSubpanelHandler = () => onSelect(null);

  const closeSubpanel = () => subpanelRef?.current?.closePanel();
  const { emailImageLink, itemPublicLink } = useSelector(
    (state: RootStateOrAny) => state.panel.emailImageState,
  );

  const [messagestatus, setMesagestatus] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [emailcollection, setEmailcollection] = useState<{
    emails: string[];
  }>();

  useEffect(() => {
    if (emailImageLink && emailcollection) {
      const id = loadingMessage();
      if (messagestatus) {
        sendItem(
          emailcollection?.emails,
          emailImageLink,
          'image',
          itemPublicLink,
          id,
          false,
          message,
        );
        setMessage('');
        setMesagestatus(false);
      } else {
        sendItem(
          emailcollection?.emails,
          emailImageLink,
          'image',
          itemPublicLink,
          id,
          false,
        );
      }
      setEmailcollection({ emails: [] });
    }
  }, [emailImageLink]);

  return (
    <ToolBtn
      isOpenEditTool={isOpenEmailTool}
      onSelect={() => onSelect(tools.email)}
      icon={tools.email.icon}
      active={active}
      onSubpanelClose={closeSubpanelHandler}
      ref={subpanelRef}
      placement="right"
      toolTitle={tools.email.title}
    >
      <div className="tw-flex tw-flex-col tw-w-280px  ">
        <div className="tw-flex tw-w-full tw-items-start tw-justify-start  tw-flex-col  ">
          <h2 className="tw-text-2xl tw-font-semibold tw-mb-2">Email to</h2>
          <ReactMultiEmail
            placeholder="Add Email"
            className="tw-border tw-border-solid tw-border-purple-active tw-rounded-5 tw-w-full "
            emails={emailcollection?.emails || emails}
            onChange={(_emails: string[]) => {
              setEmailcollection({ emails: _emails });
            }}
            getLabel={(
              email: string,
              index: number,
              removeEmail: (index: number) => void,
            ) => {
              return (
                <div
                  className=" tw-bg-white tw-px-0px tw-py-0px "
                  data-tag
                  key={index}
                >
                  {email}

                  <IconBtn
                    size="15px"
                    onSelect={() => removeEmail(index)}
                    icon={closeIcon}
                  />
                </div>
              );
            }}
          />
          <div
            className={`tw-pt-13px tw-flex tw-w-full tw-items-start tw-justify-between  tw-flex-${
              messagestatus ? 'col' : 'row'
            } `}
          >
            <Checkbox
              checked={messagestatus}
              onChange={() => setMesagestatus(!messagestatus)}
            >
              <span className="tw-text-black"> Add message</span>
            </Checkbox>
            {messagestatus ? (
              <TextArea
                className=" tw-rounded-5 tw-w-full tw-my-10px "
                style={{
                  margin: '10px 0px',
                  border: '1px solid #998fff',
                  borderRadius: '5px',
                }}
                onChange={(e) => {
                  setMessage(e.target.value);
                }}
                defaultValue={message}
                placeholder="Type your message here"
                autoSize={{ minRows: 3, maxRows: 5 }}
              />
            ) : (
              <></>
            )}
            <div
              className={`tw-flex tw-w-${
                messagestatus ? 'full' : ''
              } tw-items-center tw-justify-end`}
            >
              <AppButton
                className="tw-px-5 tw-pb-1 tw-pt-1 tw-rounded-full tw-border-2 tw-border-torea-bay "
                onClick={async () => {
                  if (
                    emailcollection?.emails &&
                    emailcollection.emails.length > 0
                  ) {
                    closeSubpanel();
                    try {
                      dispatch(
                        PanelAC.setEmailImage({
                          emailImage: true,
                          emailImageLink: null,
                          itemPublicLink: null,
                        }),
                      );
                      await onSave();
                    } catch (error: any) {
                      errorHandler(error);
                      dispatch(
                        PanelAC.setEmailImage({
                          emailImage: false,
                          emailImageLink: null,
                          itemPublicLink: null,
                        }),
                      );
                    }
                  } else errorMessage('Email filed cannot be empty');
                }}
              >
                <span>Send</span>
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </ToolBtn>
  );
};

export default SendEmailTool;
