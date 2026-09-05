import re

with open('src/api.ts', 'r') as f:
    content = f.read()

patch = """async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  
  try {
    const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });
    const data = await res.json().catch(() => null);
    
    if (!res.ok) {
      if (res.status === 401 && url !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('school-current-user');
        window.location.href = '/';
        return null;
      }
      throw new Error(data?.error || `API Error: ${res.status}`);
    }
    
    return data;
  } catch (error: any) {
    console.error('Fetch Error:', error);
    throw new Error(error.message || 'Network Error');
  }
}"""

content = re.sub(r'async function fetchWithAuth\(url: string, options: RequestInit = \{\}\) \{.*?return data;\n\}', patch, content, flags=re.DOTALL)

with open('src/api.ts', 'w') as f:
    f.write(content)
