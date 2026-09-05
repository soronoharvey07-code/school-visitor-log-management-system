import re

with open('src/api.ts', 'r') as f:
    content = f.read()

patch = """
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('school-current-user');
      window.location.reload();
    }
    throw new Error(data?.error || 'API Error');
  }
"""

content = re.sub(r'  if \(\!res\.ok\) \{\n    throw new Error\(data\?\.error \|\| \'API Error\'\);\n  \}', patch, content)

with open('src/api.ts', 'w') as f:
    f.write(content)
