import { RouteObject } from 'react-router-dom';
import HomePage from '@/pages/home';
import NotFound from '@/pages/NotFound';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/auth/Login';
import ConfigPage from '@/pages/settings/ConfigPage';
import ProfilesPage from '@/pages/profiles/ProfilesPage';
import GoogleAuthPage from '@/pages/google-auth/GoogleAuthPage';

export const routes: RouteObject[] = [
  {
    path: '/auth/login',
    element: <Login />,
  },
  {
    path: '/google-auth',
    element: <GoogleAuthPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        path: '',
        element: <HomePage />,
        index: true,
      },
      {
        path: 'settings',
        element: <ConfigPage />,
      },
      {
        path: 'profiles',
        element: <ProfilesPage />,
      },
    ]
  }
];

export default routes; 