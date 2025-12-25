import { useEffect, useRef } from 'react'

/**
 * Hook to prevent text selection and copying on protected elements
 * while allowing explicit copy buttons to work normally
 */
export const useCopyProtection = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      // Only prevent if the target is not a form input
      const target = e.target as HTMLElement
      if (!target.closest('input, textarea, select, button')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // Prevent keyboard shortcuts for copy/paste
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Ctrl+A (select all) but prevent Ctrl+C/Cmd+C (copy)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        // Only prevent if not in a form input
        const target = e.target as HTMLElement
        if (!target.closest('input, textarea, select')) {
          e.preventDefault()
          e.stopPropagation()
        }
      }
    }

    // Prevent drag selection
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('input, textarea, select, button')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // Prevent touch selection on mobile
    const handleTouchStart = (e: TouchEvent) => {
      // Allow if it's a form input
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, button')) {
        return
      }

      // Prevent multi-touch selection
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    // Prevent long press on mobile
    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('input, textarea, select, button')) {
        // Clear any text selection
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
        }
      }
    }

    // Add event listeners
    container.addEventListener('contextmenu', handleContextMenu, true)
    container.addEventListener('keydown', handleKeyDown, true)
    container.addEventListener('dragstart', handleDragStart, true)
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, true)

    // Cleanup function
    return () => {
      container.removeEventListener('contextmenu', handleContextMenu, true)
      container.removeEventListener('keydown', handleKeyDown, true)
      container.removeEventListener('dragstart', handleDragStart, true)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchend', handleTouchEnd, true)
    }
  }, [])

  return containerRef
}
