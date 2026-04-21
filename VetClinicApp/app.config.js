import 'dotenv/config';

export default {
  expo: {
    name: 'Ветклініки Львова',
    slug: 'vet-clinic-lviv',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: false,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#2D6A4F',
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Для відображення найближчих клінік та побудови маршруту',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#2D6A4F',
      },
      permissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-sqlite',
      'expo-asset',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Для відображення найближчих клінік та побудови маршруту',
        },
      ],
    ],
  },
};
