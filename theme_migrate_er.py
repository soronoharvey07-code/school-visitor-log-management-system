import os
import re

replacements = [
    (r"bg-\[\#f3f6f9\]", "bg-app-bg"),
    (r"bg-\[\#f3f6fc\]", "bg-app-bg"),
    (r"bg-\[\#f8fafc\]", "bg-hover-bg"),
    (r"bg-\[\#e2e8f0\]", "bg-hover-bg"),
    (r"border-\[\#cbd5e1\]", "border-app-border"),
    (r"text-\[\#475569\]", "text-main-fg"),
    (r"hover:bg-\[\#f1f5f9\]", "hover:bg-hover-bg"),
    (r"bg-white", "bg-card-bg"),
    (r"text-slate-900", "text-heading-fg"),
    (r"text-slate-500", "text-muted-fg"),
    (r"text-slate-600", "text-muted-fg"),
    (r"text-slate-700", "text-label-fg"),
]

with open("src/components/views/EventRegistration.tsx", "r") as f:
    content = f.read()

new_content = content
for old, new in replacements:
    new_content = re.sub(old, new, new_content)

with open("src/components/views/EventRegistration.tsx", "w") as f:
    f.write(new_content)
