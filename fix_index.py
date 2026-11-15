from pathlib import Path

index_path = Path("index.html")
with index_path.open() as f:
    content = f.read()

# Add title attribute to search button
old_search = '<button class="nav-link" id="searchToggleBtn" aria-controls="searchSection" aria-expanded="false">'
new_search = '<button class="nav-link" id="searchToggleBtn" aria-controls="searchSection" aria-expanded="false" title="Search (/)">'
content = content.replace(old_search, new_search)

with index_path.open("w") as f:
    f.write(content)
