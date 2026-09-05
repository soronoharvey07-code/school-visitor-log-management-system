import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

patch = """  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.removeItem('school-current-user');
      return null;
    }
    const saved = localStorage.getItem('school-current-user');
    return saved ? JSON.parse(saved) : null;
  });"""

content = re.sub(r'  const \[currentUser, setCurrentUser\] = useState<User \| null>\(\(\) => \{\n    const saved = localStorage\.getItem\(\'school-current-user\'\);\n    return saved \? JSON\.parse\(saved\) : null;\n  \}\);', patch, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
