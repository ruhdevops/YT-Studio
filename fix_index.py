"""Patch index.html to add title attribute to the search toggle button."""
from pathlib import Path

filepath = Path("index.html")
content = filepath.read_text(encoding="utf-8")

old_search = '<button class="nav-link" id="searchToggleBtn" aria-controls="searchSection" aria-expanded="false">'
new_search = '<button class="nav-link" id="searchToggleBtn" aria-controls="searchSection" aria-expanded="false" title="Search (/)">'
content = content.replace(old_search, new_search)

filepath.write_text(content, encoding="utf-8")
