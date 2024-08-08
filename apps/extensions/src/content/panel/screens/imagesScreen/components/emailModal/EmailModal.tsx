import React, { useState, useEffect } from 'react';
import { Checkbox, Modal } from 'antd';
import IEditorImage from '@/app/interfaces/IEditorImage';
import AppButton from '@/content/components/controls/appButton/AppButton';
import IEditorVideo, { DbVideoData } from '@/app/interfaces/IEditorVideo';
import { ReactMultiEmail } from 'react-multi-email';
import { sendItem } from '@/app/services/imageandvideo';
import { ItemType } from '@/app/interfaces/ItemTypes';
import TextArea from 'antd/lib/input/TextArea';
import {
  errorMessage,
  loadingMessage,
  warnMessage,
  infoMessage,
} from '@/app/services/helpers/toastMessages';
import { getShareLink } from '@/app/services/screenshots';
import {
  createVideoTemplate,
  getShareLinkVideo,
  getTemplateRefName,
  setTemplateRefName,
} from '@/app/services/videos';
import { errorHandler } from '@/app/services/helpers/errors';
import AppSvg from '@/content/components/elements/AppSvg';
import { RootStateOrAny, useSelector, useDispatch } from 'react-redux';
import PanelAC from '@/app/store/panel/actions/PanelAC';

interface IEmailModalProps {
  visible: boolean;
  onCancel: () => void;
  item: IEditorImage | IEditorVideo | null;
  itemType: ItemType;
  itemPublicLink: string;
  onSave?: () => void;
  fromEditor?: boolean;
}

const EmailModal: React.FC<IEmailModalProps> = ({
  onCancel,
  visible,
  item,
  itemType,
  itemPublicLink,
  onSave,
  fromEditor,
}) => {
  const dispatch = useDispatch();
  const [messagestatus, setMesagestatus] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [emailcollection, setEmailcollection] = useState<{
    emails: string[];
  }>();
  const { emailImageLink } = useSelector(
    (state: RootStateOrAny) => state.panel.emailImageState,
  );

  const onOkHandler = async () => {
    if (
      emailcollection?.emails &&
      emailcollection?.emails.length > 0 &&
      item &&
      item.dbData?.id
    ) {
      onCancel();
      try {
        const id = undefined;
        let templateUrl: string | false = false;
        const itemLink =
          itemType == 'image'
            ? await getShareLink(item.dbData?.id)
            : await getShareLinkVideo(item.dbData?.id);

        const itemData = item.dbData as DbVideoData;
        const streamData = itemData?.streamData;
        if (streamData) {
          templateUrl = streamData.thumbnailUrl;
        } else {
          const templateRefName: string | false =
            itemType == 'video' && (await getTemplateRefName(item.dbData?.id));

          if (!templateRefName && itemType == 'video') {
            const template: Blob | null = await createVideoTemplate(item.url);

            if (template) {
              templateUrl = await setTemplateRefName(template, item.dbData.id);
            }
          } else {
            templateUrl = templateRefName;
          }
        }

        if (messagestatus) {
          sendItem(
            emailcollection?.emails,
            itemLink,
            itemType,
            itemPublicLink,
            id,
            templateUrl,
            message,
          );
          setMessage('');
          setMesagestatus(false);
        } else {
          sendItem(
            emailcollection?.emails,
            itemLink,
            itemType,
            itemPublicLink,
            id,
            templateUrl,
          );
        }
        infoMessage('Email sent successfully');
        setEmailcollection({ emails: [] });
      } catch (err) {
        console.log(err);
        errorHandler(err);
      }
    } else {
      warnMessage('Email field cannot be empty');
    }
  };

  const saveAndSend = async () => {
    if (emailcollection?.emails && emailcollection.emails.length > 0) {
      onCancel();
      try {
        dispatch(
          PanelAC.setEmailImage({
            emailImage: true,
            emailImageLink: null,
            itemPublicLink: null,
          }),
        );
        if (onSave) {
          await onSave();
        }
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
  };

  useEffect(() => {
    if (emailImageLink && emailcollection) {
      const id = undefined;
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
    <Modal
      visible={visible}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-mx-4 tw-pb-1 tw-pt-1"
            twPadding="tw-px-8"
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={fromEditor ? saveAndSend : onOkHandler}
            className="tw-pb-1 tw-pt-1"
            twPadding="tw-px-8"
            disabled={
              !emailcollection?.emails || emailcollection?.emails?.length === 0
            }
          >
            Send Email
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-text-2xl tw-font-semibold tw-mb-2">
        Send {itemType} to
      </h2>
      <ReactMultiEmail
        placeholder="Add Email"
        className="tw-border tw-border-solid tw-border-purple-active tw-rounded-5 tw-w-full "
        emails={emailcollection?.emails}
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
              <div
                className="tw-cursor-pointer"
                onClick={() => removeEmail(index)}
              >
                <AppSvg path="images/panel/common/close.svg" size="18px" />
              </div>
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
        ></div>
      </div>
    </Modal>
  );
};

export default EmailModal;
