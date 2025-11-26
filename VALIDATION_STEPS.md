# PinSpace Feature Validation Steps

## 1. PDF Upload → Image Frames

### Setup
- Ensure `pdfjs-dist` is installed: `npm install pdfjs-dist`
- Verify `/public/pdfjs/pdf.worker.min.js` exists (or rename/copy to `.mjs` if needed)

### Testing Steps
1. Open a board (`/app/board/[id]`)
2. Drag and drop a PDF file onto the canvas
3. Verify:
   - PDF is converted to image elements (one per page)
   - Each page appears as a separate image element on the canvas
   - Images are positioned with slight offsets (20px apart)
   - Images are selectable and can be moved/resized
4. Test error handling:
   - Try a corrupted PDF file
   - Verify error message is shown
   - Try a very large PDF (test performance)

### Expected Behavior
- PDF pages appear as image elements
- Each page is a separate canvas element
- Images maintain aspect ratio (capped at 800x600 for display)

---

## 2. Realtime Optionality (localStorage Fallback)

### Testing Steps
1. **With PeerJS working:**
   - Open Live Crit session
   - Verify comments sync in real-time between tabs
   - Check browser console for `[realtime]` logs showing PeerJS connection

2. **With PeerJS failing (simulate):**
   - Block PeerJS server in browser DevTools (Network tab)
   - Or set `NEXT_PUBLIC_REALTIME=false` in `.env.local`
   - Open Live Crit session
   - Verify:
     - No errors in console
     - Comments still sync via localStorage (may have slight delay)
     - Check console for `[realtime] PeerJS unavailable, using localStorage fallback`

3. **Cross-tab sync:**
   - Open same board in two browser tabs
   - Post a comment in one tab
   - Verify it appears in the other tab (within 1-2 seconds)

### Expected Behavior
- Always returns a working transport (never throws)
- Falls back silently to localStorage if PeerJS fails
- Comments sync across tabs regardless of transport method

---

## 3. Element-Scoped Comments Parity

### Testing Steps

**Student Canvas (`/app/board/[id]`):**
1. Select an element on the canvas
2. Verify RightPanel shows only comments for that element
3. Post a new comment
4. Verify it appears in the panel and is attached to the selected element
5. Deselect the element
6. Verify panel shows "Select an element to view its comments" or similar

**Live Crit (`/app/live/[sessionId]`):**
1. Join a live crit session
2. Select an element
3. Verify RightPanel shows only comments for that element
4. Post a comment
5. Verify it appears immediately

**Cross-session sync:**
1. Open Student Canvas in one tab
2. Open Live Crit in another tab (same board)
3. Select the same element in both
4. Post a comment from Live Crit
5. Verify it appears in Student Canvas (within 1-2 seconds)
6. Post a comment from Student Canvas
7. Verify it appears in Live Crit

### Expected Behavior
- Comments are filtered by `selectedElementId`
- Comments sync between Student Canvas and Live Crit
- Only comments for the selected element are shown
- Empty state shown when no element is selected

---

## 4. Multi-Select Delete

### Testing Steps

**Marquee Selection:**
1. On Student Canvas or Live Crit, use Select tool
2. Click and drag on empty canvas to create marquee
3. Verify:
   - Marquee box appears
   - Elements within box are selected (highlighted)
4. Release mouse
5. Verify selected elements remain selected

**Delete Selected:**
1. Select multiple elements (via marquee or Shift+click)
2. Press `Delete` or `Backspace`
3. Verify:
   - All selected elements are removed
   - Selection is cleared
   - Elements are removed from storage

**Live Crit Overlay Elements:**
1. In Live Crit, create multiple sticky notes
2. Select multiple stickies (marquee or Shift+click)
3. Press `Delete`
4. Verify all selected stickies are removed

### Expected Behavior
- Marquee selection works on both base elements and overlay elements
- Delete removes all selected elements
- Works for both base board elements and Live Crit overlay elements

---

## 5. RightPanel Cleanup

### Testing Steps
1. Open any board or Live Crit session
2. Verify:
   - **No Category dropdown** visible
   - Composer is at the top (textarea + "Make this a task" checkbox + "Submit note" button)
   - Comment list is below composer
   - Each comment shows:
     - Author name
     - Timestamp
     - Comment text
     - Small "Delete" button (🗑️) only for comments by current user
3. Test delete:
   - Post a comment as current user
   - Verify delete button appears
   - Click delete
   - Verify confirmation dialog appears
   - Confirm deletion
   - Verify comment is removed

### Expected Behavior
- No category UI anywhere
- Composer always at top
- Delete button only for own comments
- Clean, simple comment cards

---

## 6. Next.js Config

### Verification
1. Check `next.config.ts`:
   - Should be ESM format (`export default`)
   - Should have Turbopack aliases for `canvas`
   - Should have Webpack aliases for `canvas`
2. Verify canvas shim exists at `src/shims/canvas.ts`
3. Build the project: `npm run build`
4. Verify no errors related to canvas module

### Expected Behavior
- Config is ESM-compatible
- Canvas module is shimmed for SSR
- Build succeeds without canvas-related errors

---

## 7. Static Assets

### Verification
1. Check `/public/pdfjs/pdf.worker.min.js` exists
2. If you have `.mjs` version, ensure it's also in `/public/pdfjs/`
3. Update `src/lib/pdf.ts` worker path if needed

### Expected Behavior
- PDF worker file is accessible at `/pdfjs/pdf.worker.min.js`
- PDF conversion works without worker errors

---

## Quick Test Checklist

- [ ] PDF upload converts to images
- [ ] Realtime falls back to localStorage when PeerJS fails
- [ ] Comments filter by selected element
- [ ] Comments sync between Student Canvas and Live Crit
- [ ] Marquee selection works
- [ ] Multi-select delete works
- [ ] No category dropdown visible
- [ ] Composer at top of RightPanel
- [ ] Delete button only for own comments
- [ ] Next.js config is ESM
- [ ] Canvas shim exists
- [ ] PDF worker file accessible

---

## Common Issues & Solutions

1. **PDF conversion fails:**
   - Check worker file path in `src/lib/pdf.ts`
   - Verify `pdfjs-dist` is installed
   - Check browser console for worker errors

2. **Comments not syncing:**
   - Check localStorage is enabled
   - Verify `pinspace_comments_*` keys in localStorage
   - Check browser console for errors

3. **Multi-select not working:**
   - Verify `selectedIds` state is updating
   - Check `onSelectionChangeIds` callback is wired
   - Verify Delete key handler is active

4. **Category dropdown still visible:**
   - Clear browser cache
   - Verify RightPanel component is updated
   - Check for multiple RightPanel instances












