import axios from 'axios';

// Determine the API base URL based on environment
const getApiBaseURL = () => {
  // In production or when accessing from different device, use full URL
  if (process.env.NODE_ENV === 'production') {
    return '/api/v1';
  }
  
  // In development, check if we're on mobile/different device
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // Mobile or network access - use the current hostname with backend port
    return `http://${hostname}:5000/api/v1`;
  }
  
  // Local development on same machine
  return '/api/v1';
};

const api = axios.create({
  baseURL: getApiBaseURL(),
  withCredentials: true
});

// Interceptor odpowiedzi (Response)
api.interceptors.response.use(
  (response) => response, // Jeśli 2xx, po prostu zwróć odpowiedź
  async (error) => {
    const originalRequest = error.config;

    // Jeśli błąd 401 i nie próbowaliśmy jeszcze odświeżać i to nie jest refresh endpoint
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/token/refresh')) {
      
      originalRequest._retry = true;

      try {
        console.log('Token expired, attempting refresh...');
        
        // Próba odświeżenia tokena - używamy axios bezpośrednio
        // żeby uniknąć nieskończonej pętli z interceptorem
        const refreshResponse = await axios.post(
          `${getApiBaseURL()}/token/refresh`,
          {},
          { 
            withCredentials: true,
            baseURL: window.location.protocol + '//' + window.location.host
          }
        );

        console.log('Token refresh successful');
        
        // Jeśli refresh się udał, ponawiamy oryginalne zapytanie
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Jeśli refresh też rzucił 401 (bo np. minęła godzina), wylogowujemy usera
        if (refreshError.response?.status === 401 && window.location.pathname !== '/login') {
          console.error("Refresh token expired - redirecting to login");
          window.location.href = '/login'; 
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;