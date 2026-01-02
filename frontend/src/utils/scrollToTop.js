/**
 * Scroll to top utility
 * 
 * Smoothly scrolls the window to the top
 * Use this on button clicks, form submissions, and route changes
 */
export const scrollToTop = (behavior = 'smooth') => {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: behavior
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

