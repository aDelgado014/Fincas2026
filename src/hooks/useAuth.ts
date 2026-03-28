import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Validate token is not expired by checking /api/auth/me
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (!res.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    }).catch(() => {
      // Network error — allow offline-ish usage, don't force logout
    });
  }, [navigate]);

  return {
    token: localStorage.getItem('token'),
    user: (() => {
      try {
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
      } catch {
        return null;
      }
    })(),
  };
}
