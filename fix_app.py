from pathlib import Path

filepath = Path("js/app.js")
if filepath.exists():
    with filepath.open("r") as f:
        lines = f.readlines()

    # Part 1: DOM elements
    for i, line in enumerate(lines):
        if "themeMenu: document.getElementById('themeMenu')," in line:
            lines.insert(
                i + 1,
                "    episodesNavBtn: document.querySelector('[data-action=\"scroll-to-episodes\"]'),\n",
            )
            lines.insert(
                i + 2,
                "    episodesSection: document.getElementById('episodesSection'),\n",
            )
            break

    # Part 2: bindEvents
    for i, line in enumerate(lines):
        if "if (DOM.heroBtn) DOM.heroBtn.addEventListener('click'" in line:
            scroll_listener = [
                "    // Navbar Episodes Scroll\n",
                "    if (DOM.episodesNavBtn && DOM.episodesSection) {\n",
                "        DOM.episodesNavBtn.addEventListener('click', () => {\n",
                "            DOM.episodesSection.scrollIntoView({ behavior: 'smooth' });\n",
                "            if (document.body.classList.contains('mobile-nav-active')) {\n",
                "                document.body.classList.remove('mobile-nav-active');\n",
                "                if (DOM.menuToggle) DOM.menuToggle.setAttribute('aria-expanded', 'false');\n",
                "            }\n",
                "        });\n",
                "    }\n",
                "\n",
            ]
            for idx, new_line in enumerate(scroll_listener):
                lines.insert(i + idx, new_line)
            break

    with filepath.open("w") as f:
        f.writelines(lines)
