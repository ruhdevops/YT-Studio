const API = import.meta.env.VITE_API_URL || '';

export const getData = async (route = '/api/your-route', options = {}) => {
  if (!API) {
    throw new Error('VITE_API_URL is not configured');
  }

  const response = await fetch(`${API}${route}`, options);
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
};
