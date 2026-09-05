import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

login_patch = """
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = (formData.get('username') as string).trim();
    const password = (formData.get('password') as string).trim();
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Login failed');
        return;
      }
      localStorage.setItem('token', data.token);
      setCurrentUser(data.user);
      
      if (data.user.role === 'admin') {
        setCurrentTab('admin');
      } else {
        setCurrentTab('dashboard');
      }
    } catch (err) {
      alert('Network error');
    }
  };
"""

content = re.sub(r'const handleLogin =.*?alert\(\'Invalid credentials or inactive account\'\);\n    }\n  };', login_patch, content, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(content)
