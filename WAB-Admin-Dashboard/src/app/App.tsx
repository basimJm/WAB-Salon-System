import { Suspense, useMemo } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Spinner } from '@/presentation/components/feedback/Spinner';
import { useContainer } from './ContainerContext';
import { buildRoutes } from './routes';

export function App() {
  const { config } = useContainer();
  const router = useMemo(
    () => createBrowserRouter(buildRoutes(config.variant.allowMock)),
    [config],
  );
  return (
    <Suspense fallback={<Spinner />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
