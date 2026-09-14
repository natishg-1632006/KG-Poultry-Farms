/**
 * Helper function to scroll the scrollable main container and window to top (0, 0).
 */
export const scrollToTop = () => {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  // In Layout.jsx, <main> is the container with overflow-y-auto
  const mainElem = document.querySelector('main');
  if (mainElem) {
    mainElem.scrollTop = 0;
  }
};
