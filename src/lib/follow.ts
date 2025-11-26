// Follow functionality - client-side only
// Stores following list in localStorage

const STORAGE_KEY_FOLLOWING = "pinspace_following";

export function getFollowingUsernames(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_FOLLOWING);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Error reading following list from localStorage", err);
    return [];
  }
}

export function toggleFollow(targetUsername: string): void {
  if (typeof window === "undefined") return;
  try {
    const following = getFollowingUsernames();
    const index = following.indexOf(targetUsername);
    
    if (index >= 0) {
      // Already following, unfollow
      following.splice(index, 1);
    } else {
      // Not following, follow
      following.push(targetUsername);
    }
    
    localStorage.setItem(STORAGE_KEY_FOLLOWING, JSON.stringify(following));
  } catch (err) {
    console.error("Error saving following list to localStorage", err);
  }
}

export function isFollowing(targetUsername: string): boolean {
  const following = getFollowingUsernames();
  return following.includes(targetUsername);
}

