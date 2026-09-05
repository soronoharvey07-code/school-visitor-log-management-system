import os
import re

replacements = [
    (r"bg-\[\#121927\]", "bg-app-bg"),
    (r"bg-\[\#1b2336\]", "bg-card-bg"),
    (r"bg-\[\#1c2538\]", "bg-th-bg"),
    (r"bg-\[\#1f2940\]", "bg-hover-bg"),
    (r"hover:bg-\[\#1f2940\]", "hover:bg-hover-bg"),
    (r"hover:bg-\[\#1b2336\]", "hover:bg-card-bg"),
    (r"border-\[\#2a344a\]", "border-app-border"),
    (r"divide-\[\#2a344a\]", "divide-app-border"),
    (r"text-\[\#8b99b0\]", "text-muted-fg"),
    (r"text-slate-200", "text-main-fg"),
    (r"hover:text-slate-200", "hover:text-main-fg"),
    (r"text-slate-300", "text-label-fg"),
    (r"text-slate-400", "text-icon-fg"),
    (r"hover:text-slate-400", "hover:text-icon-fg"),
]

for root, _, files in os.walk("src"):
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r") as f:
                content = f.read()
            
            # Special case for text-white headers which are not buttons
            # We will handle text-white manually later or use a different strategy.
            
            new_content = content
            for old, new in replacements:
                new_content = re.sub(old, new, new_content)
                
            if content != new_content:
                with open(path, "w") as f:
                    f.write(new_content)
                print(f"Updated {path}")
