import re

with open('src/components/views/EventView.tsx', 'r') as f:
    content = f.read()

import_patch = "import { API } from '../../api';"
content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\n" + import_patch)

fetch_patch = """
  useEffect(() => {
    API.getEvents().then(data => {
      if(Array.isArray(data)) setEvents(data);
    }).catch(console.error);
  }, []);
"""

content = re.sub(r'  useEffect\(\(\) => \{\n    localStorage\.setItem\(\'schoolEvents\', JSON\.stringify\(events\)\);\n  \}, \[events\]\);', fetch_patch, content)

with open('src/components/views/EventView.tsx', 'w') as f:
    f.write(content)
