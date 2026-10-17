import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(cleanup);
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} }) as unknown as MediaQueryList;
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
