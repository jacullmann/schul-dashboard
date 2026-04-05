/**
 * Composable for managing page layout and spacing
 * Provides consistent container styling and responsive behavior
 */
export const usePageLayout = () => {
  return {
    containerClasses: 'max-w-[1300px] w-full mx-auto px-4 lg:px-6',
    sectionClasses: 'w-full py-16 md:py-12',
    gridClasses: 'grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-6',
  };
};
