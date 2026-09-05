import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

logout_patch = """
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('school-current-user');
    setCurrentUser(null);
    setIsMenuOpen(false);
  };
"""

content = re.sub(r'  const handleLogout = \(\) => \{.*?setIsMenuOpen\(false\);\n  \};', logout_patch, content, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(content)
