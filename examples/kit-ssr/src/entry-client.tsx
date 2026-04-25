import { mount } from '@mikata/kit/client';
import * as manifest from 'virtual:mikata-routes';

mount(manifest, document.getElementById('root')!);
