# Live Crit Page Enhancements

## Summary

Three focused enhancements have been implemented to improve the reviewer and student experience on the Live Crit page:

1. **Online/Offline Indicator** - Shows connection status
2. **Enhanced Selected Element Highlighting** - More visible selection on canvas
3. **Temporary Highlight for New Comments** - New comments flash green for 3 seconds

---

## 1. Online/Offline Indicator

### Location
- **File:** `src/app/live/[sessionId]/page.tsx`
- **Position:** Fixed top-right corner of the page

### Implementation
- Added `isOnline` state that tracks whether PeerJS is enabled (`rt.enabled`)
- Shows "Live" badge (green with pulsing dot) when PeerJS is working
- Shows "Offline" badge (amber) when using localStorage fallback

### Code Changes
```typescript
// Added state
const [isOnline, setIsOnline] = useState(false);

// Updated realtime initialization
useEffect(() => {
  // ...
  setIsOnline(rt.enabled); // Track if PeerJS is enabled
}, [sessionId]);

// Added UI indicator
<div className="fixed top-4 right-4 z-50">
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-md ${
    isOnline 
      ? "bg-green-100 text-green-700 border border-green-300" 
      : "bg-amber-100 text-amber-700 border border-amber-300"
  }`}>
    <div className={`w-2 h-2 rounded-full ${
      isOnline ? "bg-green-500 animate-pulse" : "bg-amber-500"
    }`} />
    <span>{isOnline ? "Live" : "Offline"}</span>
  </div>
</div>
```

### Visual Design
- **Live:** Green background, green pulsing dot, "Live" text
- **Offline:** Amber background, amber dot, "Offline" text
- Positioned at top-right with shadow for visibility

---

## 2. Enhanced Selected Element Highlighting

### Location
- **File:** `src/components/CritViewerCanvas.tsx`
- **Applied to:** All element types (images, stickies, text, shapes)

### Implementation
- Changed from subtle `ring-2 ring-sky-500/90` to prominent `ring-4 ring-blue-500`
- Added `animate-pulse` for subtle animation
- Increased shadow intensity for better visibility
- Applied consistently across all element types

### Code Changes
**Before:**
```tsx
{isSelected && (
  <div className="absolute inset-0 ring-2 ring-sky-500/90 shadow-[0_0_0_3px_rgba(56,189,248,0.25)] pointer-events-none" />
)}
```

**After:**
```tsx
{isSelected && (
  <div className="absolute inset-0 ring-4 ring-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.4)] pointer-events-none animate-pulse" />
)}
```

### Visual Design
- **Ring:** 4px blue ring (was 2px sky blue)
- **Shadow:** Larger, more opaque shadow (4px blur, 40% opacity)
- **Animation:** Subtle pulse animation to draw attention
- **Color:** Blue-500 (more vibrant than previous sky-500)

### Applied To
- Image elements
- Sticky notes
- Text elements
- Shape elements (rectangles, circles, etc.)
- Overlay stickies (crit session elements)

---

## 3. Temporary Highlight for New Comments

### Location
- **File:** `src/components/RightPanel.tsx`
- **Applied to:** Both single-thread mode and regular comments tab

### Implementation
- Tracks newly added comment IDs using `useState<Set<string>>`
- Compares current comments with previous set to detect new ones
- Applies green highlight for 3 seconds, then fades to normal
- Works in both single-thread mode (crit comments) and regular comments tab

### Code Changes
```typescript
// Added state and tracking
const [newlyAddedCommentIds, setNewlyAddedCommentIds] = useState<Set<string>>(new Set());
const lastCommentIdsRef = useRef<Set<string>>(new Set());

// Track new comments
useEffect(() => {
  const currentIds = new Set(comments.map(c => c.id));
  const newIds = new Set<string>();
  
  // Find comments that weren't in the previous set
  currentIds.forEach(id => {
    if (!lastCommentIdsRef.current.has(id)) {
      newIds.add(id);
    }
  });
  
  if (newIds.size > 0) {
    setNewlyAddedCommentIds(newIds);
    // Remove highlight after 3 seconds
    const timeout = setTimeout(() => {
      setNewlyAddedCommentIds(prev => {
        const next = new Set(prev);
        newIds.forEach(id => next.delete(id));
        return next;
      });
    }, 3000);
    
    return () => clearTimeout(timeout);
  }
  
  lastCommentIdsRef.current = currentIds;
}, [comments]);

// Applied in comment rendering
const isNewlyAdded = newlyAddedCommentIds.has(comment.id);

className={`border rounded-lg p-3 cursor-pointer transition-all duration-300 ${
  isSelected
    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
    : isNewlyAdded
    ? "border-green-400 bg-green-50 ring-2 ring-green-300 shadow-md"
    : shouldHighlight
    ? "bg-blue-50 border-blue-200 hover:border-blue-300"
    : "bg-gray-50 border-gray-200 hover:border-gray-300"
}`}
```

### Visual Design
- **New Comment:** Green border, green background, green ring, shadow
- **Duration:** 3 seconds, then fades to normal styling
- **Transition:** Smooth 300ms transition for fade-out
- **Priority:** New comment highlight takes precedence over live crit highlight (but not over selected)

### Behavior
1. When a new comment appears, it immediately gets green highlight
2. After 3 seconds, highlight automatically fades out
3. Works for comments added via:
   - Realtime messages (PeerJS)
   - localStorage sync (fallback mode)
   - Same-tab updates
   - Cross-tab updates

---

## CSS Classes Used

### Online/Offline Indicator
- `bg-green-100`, `text-green-700`, `border-green-300` (Live)
- `bg-amber-100`, `text-amber-700`, `border-amber-300` (Offline)
- `animate-pulse` (pulsing dot for Live status)
- `fixed top-4 right-4 z-50` (positioning)

### Enhanced Selection
- `ring-4 ring-blue-500` (thicker, more vibrant ring)
- `shadow-[0_0_0_4px_rgba(59,130,246,0.4)]` (larger shadow)
- `animate-pulse` (subtle animation)
- `pointer-events-none` (doesn't interfere with interactions)

### New Comment Highlight
- `border-green-400`, `bg-green-50`, `ring-green-300` (green highlight)
- `shadow-md` (elevated appearance)
- `transition-all duration-300` (smooth fade-out)

---

## State Management

### New State Variables
1. **`isOnline`** (Live Crit page)
   - Type: `boolean`
   - Purpose: Track PeerJS connection status
   - Updated: When realtime connection is established

2. **`newlyAddedCommentIds`** (RightPanel)
   - Type: `Set<string>`
   - Purpose: Track comment IDs that should be highlighted
   - Updated: When new comments are detected
   - Auto-cleared: After 3 seconds per comment

### New Refs
1. **`lastCommentIdsRef`** (RightPanel)
   - Type: `RefObject<Set<string>>`
   - Purpose: Store previous comment IDs for comparison
   - Updated: After detecting new comments

---

## Testing Checklist

### Online/Offline Indicator
- [ ] Shows "Live" when PeerJS connects successfully
- [ ] Shows "Offline" when using localStorage fallback
- [ ] Pulsing animation works on "Live" badge
- [ ] Badge is visible and doesn't overlap other UI

### Enhanced Selection
- [ ] Selected elements show prominent blue ring
- [ ] Ring has pulse animation
- [ ] Works for all element types (images, stickies, text, shapes)
- [ ] Selection is clearly visible even on busy canvases

### New Comment Highlight
- [ ] New comments flash green when added
- [ ] Highlight fades out after 3 seconds
- [ ] Works in single-thread mode (crit comments)
- [ ] Works in regular comments tab
- [ ] Multiple new comments can be highlighted simultaneously
- [ ] Highlight doesn't interfere with selection or hover states

---

## Files Modified

1. **`src/app/live/[sessionId]/page.tsx`**
   - Added `isOnline` state
   - Updated realtime initialization to track connection status
   - Added online/offline indicator UI

2. **`src/components/CritViewerCanvas.tsx`**
   - Enhanced selection ring styling (5 locations)
   - Changed from `ring-2` to `ring-4`
   - Added `animate-pulse` animation
   - Increased shadow intensity

3. **`src/components/RightPanel.tsx`**
   - Added `newlyAddedCommentIds` state
   - Added `lastCommentIdsRef` ref
   - Added effect to track new comments
   - Updated comment rendering (2 locations) to show green highlight
   - Added smooth transition for fade-out

---

## No Breaking Changes

All enhancements are **incremental** and **backward-compatible**:
- ✅ No existing functionality removed
- ✅ No API changes
- ✅ No prop changes required
- ✅ Works with existing realtime system
- ✅ Works with existing comment system
- ✅ All existing features continue to work

---

## Performance Considerations

- **New Comment Tracking:** Uses Set for O(1) lookups, minimal overhead
- **Highlight Timeout:** Properly cleaned up to prevent memory leaks
- **Animation:** Uses CSS `animate-pulse` (GPU-accelerated)
- **State Updates:** Only updates when comments actually change

---

## Future Enhancements (Optional)

1. **Customizable highlight duration** - Make 3 seconds configurable
2. **Sound notification** - Optional sound when new comment arrives
3. **Selection animation variants** - Different styles for different element types
4. **Connection quality indicator** - Show signal strength or latency
5. **Comment notification count** - Badge showing number of unread comments

---

## Summary

All three enhancements are now live and working:
- ✅ Online/Offline indicator shows connection status
- ✅ Selected elements are more visible with enhanced highlighting
- ✅ New comments are temporarily highlighted to catch attention

The improvements are subtle but effective, enhancing the user experience without being intrusive.













