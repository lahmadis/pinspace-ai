# RLS Delete Policy Setup Instructions

## Step-by-Step: Add Delete Policy in Supabase Dashboard

### Step 1: Open Supabase Dashboard
1. Go to [supabase.com](https://supabase.com) and sign in
2. Select your PinSpace project

### Step 2: Navigate to SQL Editor
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New Query"** button (top right)

### Step 3: Run the RLS Policy SQL
1. Copy the SQL from `SUPABASE_RLS_DELETE_POLICY.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** button or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
4. You should see: "Success. No rows returned"

### Step 4: Verify Policy Was Created
1. In the left sidebar, click **"Authentication"** → **"Policies"**
2. Or go to **"Database"** → **"Tables"** → **"boards"** → **"Policies"** tab
3. You should see a policy named **"Anyone can delete boards"** with:
   - **Operation**: DELETE
   - **Using expression**: `true`

### Step 5: Test the Policy
1. Try deleting a board through your app
2. The deletion should now work without RLS errors

---

## Alternative: Verify/Update Existing Policy

If a delete policy already exists:

1. Go to **"Database"** → **"Tables"** → **"boards"**
2. Click the **"Policies"** tab
3. Find the delete policy (e.g., "Users can delete their own boards")
4. Click the **three dots (⋮)** → **"Edit policy"**
5. Change the **Using expression** to: `true`
6. Click **"Save"**

Or delete and recreate:
1. Click **three dots (⋮)** → **"Delete policy"**
2. Then run the SQL from `SUPABASE_RLS_DELETE_POLICY.sql`

---

## Testing Checklist

### Browser Testing
- [ ] Open your app in browser: `http://localhost:3000/boards`
- [ ] Click "Delete" button on any board
- [ ] Confirm deletion in modal
- [ ] Board should disappear from list immediately
- [ ] Refresh page - board should still be deleted
- [ ] Check browser console for any errors
- [ ] Verify success message (if implemented)

### Postman Testing

#### Test 1: Delete Existing Board
```http
DELETE http://localhost:3000/api/boards/{board-id}
Content-Type: application/json
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "success": true,
    "message": "Board deleted successfully",
    "deletedId": "{board-id}"
  },
  "error": null
}
```

#### Test 2: Delete Non-Existent Board
```http
DELETE http://localhost:3000/api/boards/non-existent-id
```

**Expected Response** (404 Not Found):
```json
{
  "data": null,
  "error": {
    "message": "Board not found",
    "details": "No board found with ID: non-existent-id"
  }
}
```

#### Test 3: Verify RLS Allows Delete
```http
DELETE http://localhost:3000/api/boards/{valid-board-id}
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "success": true,
    "message": "Board deleted successfully",
    "deletedId": "{valid-board-id}"
  },
  "error": null
}
```

**NOT Expected** (403 Forbidden):
```json
{
  "data": null,
  "error": {
    "message": "Delete forbidden",
    "details": "You do not have permission to delete this board. RLS policy prevented deletion."
  }
}
```

### Verify Response Format
For ALL responses (success or error), verify:
- ✅ Response has `data` field
- ✅ Response has `error` field
- ✅ `data` and `error` are never both non-null
- ✅ Error responses have `error.message` and optionally `error.details`
- ✅ Success responses have `data` with useful information
- ✅ Response is valid JSON

---

## Troubleshooting

### Issue: Still getting "Delete forbidden" error

**Solution**:
1. Verify policy was created: Check **"Database"** → **"Tables"** → **"boards"** → **"Policies"**
2. Check policy **Using expression** is exactly: `true`
3. Try dropping and recreating the policy using the SQL
4. Verify RLS is enabled: **"Database"** → **"Tables"** → **"boards"** → **"Settings"** → **"Row Level Security"** should be ON

### Issue: Policy exists but delete still fails

**Solution**:
1. Check if multiple delete policies exist (they might conflict)
2. Drop all delete policies and create just one
3. Verify you're using the correct board ID in the API call
4. Check Supabase logs: **"Logs"** → **"API Logs"** for detailed errors

### Issue: Response format is wrong

**Solution**:
1. Verify you're using the updated `/api/boards/[id].js` endpoint
2. Clear `.next` cache: `rm -rf .next` then restart dev server
3. Check browser Network tab to see actual response format

---

## SQL Reference

The policy SQL allows all users (public) to delete boards:
```sql
CREATE POLICY "Anyone can delete boards"
  ON boards 
  FOR DELETE
  USING (true);
```

**For production**, consider more restrictive policies:
- **Authenticated users only**: `USING (auth.uid() IS NOT NULL)`
- **Owners only**: `USING (auth.uid()::text = owner_id)`






