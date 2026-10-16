from pathlib import Path

content = Path("index.html").read_text()

# Add title attribute to search button
old_search = '<button class="nav-link" id="searchToggleBtn" aria-controls="searchSection" aria-expanded="false">'
new_search = '<button class="nav-link" id="searchToggleBtn" aria-controls="searchSection" aria-expanded="false" title="Search (/)">'
content = content.replace(old_search, new_search)

Path("index.html").write_text(content)
