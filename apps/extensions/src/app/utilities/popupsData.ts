import png from '@/content/assests/svg/tools-panel/save_popup/png.svg';
import jpg from '@/content/assests/svg/tools-panel/save_popup/jpg.svg';
import pdf from '@/content/assests/svg/tools-panel/save_popup/pdf.svg';
import drive from '@/content/assests/svg/tools-panel/save_popup/drive.svg';
import box from '@/content/assests/svg/tools-panel/save_popup/box.svg';
import dbox from '@/content/assests/svg/tools-panel/save_popup/dbox.svg';
import onedrive from '@/content/assests/svg/tools-panel/save_popup/onedrive.svg';
import email from '@/content/assests/svg/tools-panel/share_popup/email.svg';
import slack from '../../../images/panel/settings/slack-icon.svg';
import whatsapp from '../../../images/panel/settings/whatsapp.svg';
export const savingData = [
  {
    local_save: true,
    type: 'png',
    icon: png,
  },
  {
    local_save: true,
    type: 'jpg',
    icon: jpg,
  },
  {
    local_save: true,
    type: 'pdf',
    icon: pdf,
  },
  {
    local_save: false,
    type: 'Google Drive',
    icon: drive,
  },

  {
    local_save: false,
    type: 'Dropbox',
    icon: dbox,
  },

  {
    local_save: false,
    type: 'onedrive',
    icon: onedrive,
  },

  {
    local_save: false,
    type: 'box',
    icon: box,
  },
];
export const shareData = [
  {
    type: 'email',
    icon: email,
  },

  {
    type: 'slack',
    icon: slack,
  },
  {
    type: 'whatsapp',
    icon: whatsapp,
  },
];
