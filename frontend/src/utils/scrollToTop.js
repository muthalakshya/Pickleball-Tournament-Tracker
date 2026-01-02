/**
 * Scroll to top utility
 * 
 * Smoothly scrolls the window to the top
 * Use this on button clicks, form submissions, and route changes
 */
export const scrollToTop = (behavior = 'smooth') => {
  // Handle event objects passed from onClick handlers
  const scrollBehavior = typeof behavior === 'string' ? behavior : 'smooth'
  
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: scrollBehavior
  })
}

/**
 * Scroll to top immediately (no animation)
 */
export const scrollToTopInstant = () => {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'auto'
  })
}

