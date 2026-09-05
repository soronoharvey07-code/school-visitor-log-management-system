import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

import_patch = """
import { API } from './api';
"""

content = content.replace("import rhmcLogo from './assets/images/rhmc-logo.webp';", "import rhmcLogo from './assets/images/rhmc-logo.webp';\nimport { API } from './api';")

fetch_patch = """
  useEffect(() => {
    if (currentUser) {
      API.getUsers().then(data => {
        if(Array.isArray(data)) setUsers(data);
      }).catch(console.error);
      
      API.getVisitors().then(data => {
        if(Array.isArray(data)) setVisitors(data);
      }).catch(console.error);
    }
  }, [currentUser]);
"""

content = content.replace("  // Protect the admin route\n  useEffect(() => {", fetch_patch + "\n  // Protect the admin route\n  useEffect(() => {")

with open('src/App.tsx', 'w') as f:
    f.write(content)
