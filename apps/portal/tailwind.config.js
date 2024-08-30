/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'tw-',
  mode: 'jit',
  purge: {
    enabled: true,
    content: ['./apps/portal/**/*.{tsx,ts,js,jsx}'],
  },
  darkMode: 'class', // false | 'media' | 'class'
  theme: {
    fontFamily: {
      roboto: 'Roboto, Helvetica, Arial, sans-serif',
      'roboto-bold': 'Roboto Bold',
      'poppins-semi-bold': 'PoppinsSemiBold',
      'poppins-medium': '"Poppins Medium"',
    },
    screens: {
      default: '0px',
      sm: '480px',
      md: '768px',
      lg: '992px',
      xl: '1200px',
      '2xl': '1535px',
      'mx-2xl': { max: '1534px' },
      'mx-xl': { max: '1199px' },
      'mx-lg': { max: '991px' },
      'mx-md': { max: '767px' },
      'mx-sm': { max: '479px' },
      'max-small': { max: '975px' },
      'across-btns': { min: '1540px', max: '1612px' },
      'h-mx-sm': { raw: '(min-height: 670px)' },
      'h-mx-md': { raw: '(min-height: 860px)' },
      'h-max-sm': { raw: '(max-height: 670px)' },
      'h-max-md': { raw: '(max-height: 860px)' },
    },
    extend: {
      gridTemplateColumns: {
        autoFit90px: 'repeat(auto-fit, 90px)',
      },
      colors: {
        'primary-purple': '#5b4dbe',
        'primary-light-purple': '#8576FF',
        primary: '#006dd2',
        'primary-lighter': '#009ed1',
        'primary-violet-30': '#CECAEC',
        secondary: '#00b3cd',
        danger: '#d32f2f',
        'app-dark': '#0e263b',
        'light-beige': '#f9f4f0',
        'dark-blue': '#383c44',
        'dark-blue-active': '#5c5c5c',
        'yellow-accent': '#f3de3a',
        'app-grey': '#a1a1a1',
        'app-grey-darker': '#6e6e6e',
        'light-grey': '#fbfbfb',
        'dark-grey': '#D8D8D8',
        'blue-grey': '#F5F4F7',
        'mid-grey': '#9B9B9B',
        blue: '#2b70ed',
        'ghost-white': '#fbfaff',
        purple: '#b5aeff',
        'purple-active': '#998fff',
        green: '#008000',
        red: '#f45046',
        'app-black': '#24262F',
        'panel-black': '#121212',
        'section-black': '#1E1E1E',
        'overlay-black': '#2A292F',
        'lime-moon': '#a3e635',
        'light-peach': '#fdba74',
        'light-sky': '#67e8f9',
        'light-amber': '#fde68a',
        'peach-amber': '#fcd34d',
        'light-rose': '#f43f5e',
        'dark-blue2': '#2A292F',
        trans: 'transparent',
        transparent: 'transparent',
        'toolbox-light': '#e5e4ed',
        'select-area': '#555459',
        'grey-light': '#84868A',
        light2: '#d7dcde',
        'upload-border': '#DCDCDC',
        'gallery-grey': '#eeedef',
        'iron-grey': '#d4d2d4',
        'torea-bay': '#3c3099',
        'grey-light4': '#D1D1D6',
        cosmos: '#ffd5d2',
        'sub-btn': '#cdbbff',
        'conv-active': '#362e72',
        'star-dust': '#c3c3c3',
        'picker-red': '#FF2116',
        'picker-orange': '#FF7A00',
        'picker-yellow': '#FFCC00',
        'picker-green': '#3EAF3F',
        'picker-blue': '#2A5CF6',
        'picker-purple': '#7737FF',
        'picker-pink': '#FA00FF',
        'picker-grey': '#8D8D8D',
        'choose-btn': 'rgba(0, 0, 0, 0.553)',
        'choose-btn-active': 'rgba(0, 0, 0, 0.253)',
        seashell: 'rgb(241, 241, 241)',
        'whiteboard-purple': 'rgb(86, 84, 221)',
        'primary-violet': '#DEDBF2',
        'grey-dark2': '#636366',
        'violet-dark': '#363071',
        'light-grey2': '#f7f7f7',
        'wb-grey': '#AEAEB2',
      },
      borderRadius: {
        3: '3px',
        5: '5px',
        '6px': '6px',
        '2lg': '10px',
        '4xl': '40px',
      },
      boxShadow: {
        'app-blocks': '0px 16px 40px rgba(112, 144, 176, 0.2)',
        'round-sm': '0px 0px 16px 3px rgba(0,0,0,0.2)',
      },
      spacing: {
        '13negative': '-13px',
        '250negative': '-250px',
        '360negative': '-360px',
        '500negative': '-500px',
        neg20px: '-20px',
        '0px': '0px',
        '1px': '1px',
        '2px': '2px',
        '3px': '3px',
        '4px': '4px',
        '5px': '5px',
        '6px': '6px',
        '10px': '10px',
        '13px': '13px',
        '15px': '15px',
        '16px': '16px',
        '17px': '17px',
        '20px': '20px',
        '24px': '24px',
        '25px': '25px',
        '30px': '30px',
        '35px': '35px',
        '38px': '38px',
        '40px': '40px',
        '45px': '45px',
        '50px': '50px',
        '52px': '52px',
        '55px': '55px',
        '60px': '60px',
        '64px': '64px',
        '65px': '65px',
        '70px': '70px',
        '80px': '80px',
        '86px': '86px',
        '90px': '90px',
        '98px': '98px',
        '100px': '100px',
        '110px': '110px',
        '120px': '120px',
        '125px': '125px',
        '130px': '130px',
        '150px': '150px',
        '170px': '170px',
        '177px': '177px',
        '200px': '200px',
        '210px': '210px',
        '220px': '220px',
        '280px': '280px',
        '300px': '300px',
        '330px': '330px',
        '350px': '350px',
        '420px': '420px',
        '450px': '450px',
        '500px': '500px',
        '550px': '550px',
        '580px': '580px',
        '600px': '600px',
        '1000px': '1000px',
        '2point5p': '2.5%',
        '93p': '93%',
      },
      maxWidth: {
        '100px': '100px',
        '170px': '170px',
        '330px': '330px',
        '400px': '400px',
        1700: '1700px',
        '95p': '95%',
        '80p': '80%',
        '90p': '90%',
      },
      minWidth: {
        '20px': '20px',
        '25px': '25px',
        '40px': '40px',
        '100px': '100px',
        '330px': '330px',
        '95p': '95%',
        '88px': '88px',
      },
      width: {
        '3px': '3px',
        '160px': '160px',
        '180px': '180px',
        '195px': '195px',
        '220px': '220px',
        '260px': '260px',
        '300px': '300px',
        '350px': '350px',
        '395px': '395px',
        '500px': '500px',
        '30p': '30%',
        '80p': '80%',
        '90p': '90%',
        '98p': '98%',
        '95p': '95%',
        '90vw': '90vw',
        '105p': '105%',
        '125p': '125%',
        '150p': '150%',
        '200p': '200%',
        '26rem': '26rem',
        '13.5rem': '13.5rem',
      },
      height: {
        '20px': '20px',
        '200px': '200px',
        '42vw': '42vw',
        '500px': '500px',
        '550px': '550px',
        '600px': '600px',
        '665px': '665px',
        '10vh': '10vh',
        '20vh': '20vh',
        '30vh': '30vh',
        '56vh': '56vh',
        '50vh': '50vh',
        '53vh': '53vh',
        '60vh': '60vh',
        '63vh': '63vh',
        '66vh': '66vh',
        '70vh': '70vh',
        '73vh': '73vh',
        '75vh': '75vh',
        '76vh': '76vh',
        '85vh': '85.5vh',
        '90vh': '90vh',
        '100vh': '100vh',
      },
      minHeight: {
        '65vh': '65vh',
        '500px': '500px',
        '125px': '125px',
      },
      maxHeight: {
        '200px': '200px',
        '300px': '300px',
        '320px': '320px',
        '350px': '350px',
        '395px': '395px',
      },
      margin: {
        '5px': '5px',
        '10px': '10px',
        '15px': '15px',
        '20px': '20px',
        '30px': '30px',
        '52px': '52px',
        '2point5p': '2.5%',
        1.25: '0.3rem',
      },
      padding: {
        '10px': '10px',
      },
      fontFamily: {
        roboto: ['Roboto', 'sans-serif'],
        smooch: ['Smooch Sans', 'sans-serif'],
      },
      zIndex: {
        10: '10',
        20: '20',
        2000: '2000',
      },
      scale: {
        80: '0.80',
        60: '0.60',
      },
    },
    backgroundImage: {
      'camera-icon': "url('/images/contentImages/camera-block.svg')",
    },
  },
  variants: {
    extend: {},
    scrollbar: ['rounded'],
  },
  plugins: [require('@tailwindcss/line-clamp'), require('tailwind-scrollbar')],
};
