import React, { useEffect, useRef, useState } from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import { ReactMultiEmail } from 'react-multi-email';
import AppButton from 'components/controls/AppButton';
import { Checkbox, Input } from 'antd';
import {
  errorMessage,
  loadingMessage,
} from 'app/services/helpers/toastMessages';
import { errorHandler } from 'app/services/helpers/errors';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { RootStateOrAny, useSelector, useDispatch } from 'react-redux';
import { sendItem } from 'app/services/imageandvideo';
import IconBtn from '../../components/IconBtn';
const { TextArea } = Input;
import closeIcon from '/public/assets/svg/tools-panel/close.svg';
import styles from './sendEmailTool.module.scss';
import classNames from 'classnames';

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
        setMessage('');
        setMesagestatus(false);
      }
      sendItem(
        emailcollection?.emails,
        emailImageLink,
        'image',
        itemPublicLink,
        id,
        false,
        message,
      );
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
      toolTitle="Email"
    >
      <div className={styles.parentContainer}>
        <div className={styles.innerContainer}>
          <h2 className={styles.title}>Email to</h2>
          <ReactMultiEmail
            placeholder="Add Email"
            className={styles.emailContainer}
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
                <div className={styles.emailInput} data-tag key={index}>
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
            className={classNames(
              styles.wrapper,
              messagestatus ? styles.column : styles.row,
            )}
          >
            <Checkbox
              checked={messagestatus}
              onChange={() => setMesagestatus(!messagestatus)}
            >
              <span style={{ color: 'black' }}> Add message</span>
            </Checkbox>
            {messagestatus ? (
              <TextArea
                className={styles.textarea}
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
              style={{ display: 'flex' }}
              className={
                messagestatus ? styles.fullWidth : styles.flexContainer
              }
            >
              <AppButton
                className={styles.button}
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
