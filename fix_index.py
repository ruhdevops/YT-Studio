from pathlib import Path

index_path = Path("index.html")
content = index_path.read_text()

# Add title attribute to search button
old_search = (
    '<button class="nav-link" id="searchToggleBtn"'
    ' aria-controls="searchSection" aria-expanded="false">'
)
new_search = (
    '<button class="nav-link" id="searchToggleBtn"'
    ' aria-controls="searchSection" aria-expanded="false"'
    ' title="Search (/)">'
)
content = content.replace(old_search, new_search)

index_path.write_text(content)
