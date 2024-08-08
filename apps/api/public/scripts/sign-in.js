document.addEventListener('DOMContentLoaded', () => {
  const createAccount = document.querySelector('#create-account');
  const hasAccount = document.querySelector('#has-account');
  const forgotPassword = document.querySelector('#forgot-password');

  const formLogin = document.querySelector('#form-login');
  const formRegister = document.querySelector('#form-register');
  const formForgot = document.querySelector('#form-forgot-password');

  createAccount.addEventListener('click', function () {
    formLogin.classList.add('hide');
    formForgot.classList.add('hide');
    formRegister.classList.remove('hide');

    createAccount.classList.add('hide');
    hasAccount.classList.remove('hide');
  });

  forgotPassword.addEventListener('click', () => {
    formLogin.classList.add('hide');
    formForgot.classList.remove('hide');
    formRegister.classList.add('hide');

    createAccount.classList.add('hide');
    hasAccount.classList.remove('hide');
  });

  hasAccount.addEventListener('click', () => {
    formLogin.classList.remove('hide');
    formForgot.classList.add('hide');
    formRegister.classList.add('hide');

    createAccount.classList.remove('hide');
    hasAccount.classList.add('hide');
  });
});
