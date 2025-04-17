/**
 * Auth utilities for the backup application
 */

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('user');
  return !!token && !!user;
};

// Get user info from localStorage
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Fetch user info from server
export const fetchUserInfo = async (): Promise<any | null> => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    const response = await fetch('/me', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        // Save user info to localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
};

// Sync auth state
export const syncAuthState = async (): Promise<boolean> => {
  // If not logged in, no need to sync
  if (!localStorage.getItem('auth_token')) {
    return false;
  }

  // If missing user info, try to fetch from server
  if (!localStorage.getItem('user')) {
    const user = await fetchUserInfo();
    return !!user;
  }

  return true;
};

// Logout function
export const logout = async (): Promise<void> => {
  try {
    const token = localStorage.getItem('auth_token');
    
    // Call logout API
    await fetch('/logout', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    // Clear auth data regardless of API success
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = '/login';
  }
}; 