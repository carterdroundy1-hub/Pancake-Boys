"""Keep GitHub Pages' root entry on the maintained website implementation.

Run after editing website/index.html or website/catering/index.html. Shared
CSS/JS stay in website/ so the root entry, /catering/, and /website/ preview
use the same styles and media paths.
"""
from pathlib import Path
import re

def publish_root_home():
    source = Path('website/index.html').read_text(encoding='utf-8')
    source = re.sub(r'(src|poster|href|data-photo)="assets/', r'\1="website/assets/', source)
    source = re.sub(r'(href|src)="(styles\.css|content\.js|app\.js)', r'\1="website/\2', source)
    Path('index.html').write_text(source, encoding='utf-8')
    print('Root entry now loads the shared website implementation and correct media paths.')

def publish_root_catering():
    source = Path('website/catering/index.html').read_text(encoding='utf-8')
    source = source.replace('../assets/', '../website/assets/')
    source = source.replace('../styles.css', '../website/styles.css')
    source = source.replace('../content.js', '../website/content.js')
    source = source.replace('../catering.js', '../website/catering.js')
    dest = Path('catering/index.html')
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(source, encoding='utf-8')
    print('Root /catering/ now loads the shared website implementation and correct media paths.')

if __name__ == '__main__':
    publish_root_home()
    publish_root_catering()
