import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToTop } from '../../utils/scroll';

/**
 * ScrollToTop Component
 * Automatically scrolls the main scroll container and browser window to top (0, 0) whenever route location changes.
 */
export const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    scrollToTop();
  }, [pathname, search]);

  return null;
};
