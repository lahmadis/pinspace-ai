# RLS Update Policy Setup Instructions

## Step-by-Step: Add Update Policy in Supabase Dashboard

### Step 1: Open Supabase Dashboard
1. Go to [supabase.com](https://supabase.com) and sign in
2. Select your PinSpace project

### Step 2: Navigate to SQL Editor
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New Query"** button (top right)

### Step 3: Run the RLS Policy SQL
1. Copy the SQL from `SUPABASE_RLS_UPDATE_POLICY.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** button or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
4. You should see: "Success. No rows returned"

### Step 4: Verify Policy Was Created
1. In the left sidebar, click **"Authentication"** → **"Policies"**
2. Or go to **"Database"** → **"Tables"** → **"boards"** → **"Policies"** tab
3. You should see a policy named **"Anyone can update boards"** with:
   - **Operation**: UPDATE
   - **Using expression**: `true`
   - **With check expression**: `true`

### Step 5: Test the Policy
1. Try updating a board through your app (rename, change visibility, etc.)
2. The update should now work without RLS errors

---

## Alternative: Verify/Update Existing Policy

If an update policy already exists:

1. Go to **"Database"** → **"Tables"** → **"boards"**
2. Click the **"Policies"** tab
3. Find the update policy (e.g., "Users can update their own boards")
4. Click the **three dots (⋮)** → **"Edit policy"**
5. Change both expressions:
   - **Using expression**: `true`
   - **With check expression**: `true`
6. Click **"Save"**

Or delete and recreate:
1. Click **three dots (⋮)** → **"Delete policy"**
2. Then run the SQL from `SUPABASE_RLS_UPDATE_POLICY.sql`

---

## Testing Checklist

### Browser Testing
- [ ] Open a board in browser: `http://localhost:3000/board/{board-id}`
- [ ] Try to rename the board (if edit modal exists)
- [ ] Try to change board visibility (Public/Private)
- [ ] Changes should save successfully
- [ ] Refresh page - changes should persist
- [ ] Check browser console for any errors
- [ ] Verify no "Update forbidden" errors

### Postman Testing

#### Test 1: Update Existing Board (Title)
```http
PATCH http://localhost:3000/api/boards/{board-id}
Content-Type: application/json

{
  "title": "Updated Board Title"
}
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "id": "{board-id}",
    "title": "Updated Board Title",
    "description": "...",
    "visibility": "private",
    "updated_at": "2024-01-01T12:00:00.000Z",
    ...
  },
  "error": null
}
```

#### Test 2: Update Existing Board (Visibility)
```http
PATCH http://localhost:3000/api/boards/{board-id}
Content-Type: application/json

{
  "visibility": "public"
}
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "id": "{board-id}",
    "title": "...",
    "visibility": "public",
    "updated_at": "2024-01-01T12:00:00.000Z",
    ...
  },
  "error": null
}
```

#### Test 3: Update Non-Existent Board
```http
PATCH http://localhost:3000/api/boards/non-existent-id
Content-Type: application/json

{
  "title": "New Title"
}
```

**Expected Response** (404 Not Found):
```json
{
  "data": null,
  "error": {
    "message": "Board not found",
    "details": "No board found with ID: non-existent-id. Cannot update a board that does not exist."
  }
}
```

#### Test 4: Update with Invalid Data
```http
PATCH http://localhost:3000/api/boards/{valid-board-id}
Content-Type: application/json

{
  "title": "",
  "visibility": "invalid"
}
```

**Expected Response** (400 Bad Request):
```json
{
  "data": null,
  "error": {
    "message": "Invalid title",
    "details": "Title cannot be empty"
  }
}
```

#### Test 5: Verify RLS Allows Update
```http
PATCH http://localhost:3000/api/boards/{valid-board-id}
Content-Type: application/json

{
  "title": "Updated Title"
}
```

**Expected**: 200 OK (not 403 Forbidden)

### Verify Response Format
For ALL responses (success or error), verify:
- ✅ Response has `data` field
- ✅ Response has `error` field
- ✅ `data` and `error` are never both non-null
- ✅ Error responses have `error.message` and optionally `error.details`
- ✅ Success responses have `data` with the updated board object
- ✅ Response is valid JSON

---

## Troubleshooting

### Issue: Still getting "Update forbidden" error

**Solution**:
1. Verify policy was created: Check **"Database"** → **"Tables"** → **"boards"** → **"Policies"**
2. Check policy **Using expression** is exactly: `true`
3. Check policy **With check expression** is exactly: `true` (required for UPDATE)
4. Try dropping and recreating the policy using the SQL
5. Verify RLS is enabled: **"Database"** → **"Tables"** → **"boards"** → **"Settings"** → **"Row Level Security"** should be ON

### Issue: Getting "Board not found" when board exists

**Solution**:
1. Verify the board ID is correct in your API call
2. Check if the board exists in Supabase: **"Database"** → **"Tables"** → **"boards"** → **"Table"** tab
3. Verify the board ID format matches (should be UUID)
4. Check browser Network tab for the actual API response

### Issue: Policy exists but update still fails

**Solution**:
1. Check if multiple update policies exist (they might conflict)
2. Drop all update policies and create just one
3. Verify you're using the correct endpoint: `PATCH /api/boards/{id}` (not `/api/boards`)
4. Check Supabase logs: **"Logs"** → **"API Logs"** for detailed errors

### Issue: Response format is wrong

**Solution**:
1. Verify you're using the updated `/api/boards/[id].js` endpoint
2. Clear `.next` cache: `rm -rf .next` then restart dev server
3. Check browser Network tab to see actual response format

---

## SQL Reference

The policy SQL allows all users (public) to update boards:
```sql
CREATE POLICY "Anyone can update boards"
  ON boards 
  FOR UPDATE
  USING (true)  -- Allow all update operations
  WITH CHECK (true);  -- Allow all updated values (required for UPDATE)
```

**For production**, consider more restrictive policies:
- **Authenticated users only**: 
  ```sql
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL)
  ```
- **Owners only**: 
  ```sql
  USING (auth.uid()::text = owner_id OR owner_id IS NULL)
  WITH CHECK (auth.uid()::text = owner_id OR owner_id IS NULL)
  ```

---

## Key Differences: UPDATE vs DELETE Policies

- **UPDATE policies** require **both** `USING` and `WITH CHECK` clauses:
  - `USING`: Determines which existing rows can be updated
  - `WITH CHECK`: Validates the new values after update
- **DELETE policies** only require `USING` clause
- Both use `true` to allow all operations for public access






