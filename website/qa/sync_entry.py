"""Keep GitHub Pages' root entry on the maintained website implementation.

Run after editing website/index.html. Shared CSS/JS stay in website/ so the root
entry and /website/ preview use the same motion and media configuration.
"""
from pathlib import Path
import re

source = Path('website/index.html').read_text(encoding='utf-8')
source = re.sub(r'(src|poster|href|data-photo)="assets/', r'\1="website/assets/', source)
for asset in ['styles.css', 'content.js', 'app.js']:
    source = source.replace(f'"{asset}"', f'"website/{asset}"')
Path('index.html').write_text(source, encoding='utf-8')
print('Root entry now loads the shared website implementation and correct media paths.')
