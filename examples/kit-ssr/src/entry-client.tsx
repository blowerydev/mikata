import { mount } from '@mikata/kit/client';
import routes, { notFound } from 'virtual:mikata-routes';

mount(routes, document.getElementById('root')!, { notFound });
