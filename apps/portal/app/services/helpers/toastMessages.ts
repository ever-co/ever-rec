import { Id, toast, TypeOptions } from 'react-toastify';

export const clearToasts = () => {
  toast.dismiss();
};

export const successMessage = (text: string) => {
  toast.success(text, {
    theme: 'light',
    position: 'top-center',
    autoClose: 3000,
    closeOnClick: false,
    pauseOnHover: false,
    draggable: true,
    pauseOnFocusLoss: false,
    bodyStyle: {
      borderRadius: '30',
      textAlign: 'center',
      fontSize: 14,
    },
  });
};
export const errorMessage = (text: string) => {
  toast.error(text, {
    theme: 'light',
    position: 'top-center',
    autoClose: 3000,
    closeOnClick: false,
    pauseOnHover: false,
    draggable: true,
    pauseOnFocusLoss: false,
    bodyStyle: {
      borderRadius: '30',
      textAlign: 'center',
      fontSize: 14,
    },
  });
};

export const infoMessage = (text: string) => {
  toast.info(text, {
    theme: 'light',
    position: 'top-center',
    autoClose: 3000,
    closeOnClick: false,
    pauseOnHover: false,
    draggable: true,
    pauseOnFocusLoss: false,
    bodyStyle: {
      borderRadius: '30',
      textAlign: 'center',
      fontSize: 14,
    },
  });
};
export const warnMessage = (text: string) => {
  toast.warn(text, {
    theme: 'light',
    position: 'top-center',
    autoClose: 3000,
    closeOnClick: false,
    pauseOnHover: false,
    draggable: true,
    pauseOnFocusLoss: false,
    bodyStyle: {
      borderRadius: '30',
      textAlign: 'center',
      fontSize: 14,
    },
  });
};

export const loadingMessage = (message = 'Please wait...') => {
  const id: Id = toast.loading(message, {
    theme: 'light',
    position: 'top-center',
    autoClose: 3000,
    closeOnClick: false,
    pauseOnHover: false,
    draggable: true,
    pauseOnFocusLoss: false,
    bodyStyle: {
      borderRadius: '30',
      textAlign: 'center',
      fontSize: 14,
    },
  });
  return id;
};

export const updateMessage = (id: Id, message: string, type: TypeOptions) => {
  toast.update(id, {
    render: message,
    type,
    isLoading: false,
    theme: 'light',
    position: 'top-center',
    autoClose: 3000,
    closeOnClick: false,
    pauseOnHover: false,
    draggable: true,
    pauseOnFocusLoss: false,
    bodyStyle: {
      borderRadius: '30',
      textAlign: 'center',
      fontSize: 14,
    },
  });
};
