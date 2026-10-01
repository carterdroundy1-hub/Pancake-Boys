"""Review only the owner's archived footage; scratch media stays under ignored tmp/."""
import json
import re
import subprocess
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
archive = next(Path('C:/Users/carte/Downloads/Pancake Boys/Photos').glob('*.zip'))
folder = Path('tmp/video-review')
folder.mkdir(parents=True, exist_ok=True)
records = []
with zipfile.ZipFile(archive) as package:
    clips = [entry for entry in package.infolist() if Path(entry.filename).suffix.lower() in {'.mov', '.mp4', '.webm', '.m4v'}]
    for index, entry in enumerate(clips):
        source = folder / f'clip-{index:02}.mov'
        source.write_bytes(package.read(entry))
        info = subprocess.run([ffmpeg, '-hide_banner', '-i', str(source)], capture_output=True, text=True).stderr
        duration = re.search(r'Duration: (\d+):(\d+):([\d.]+)', info)
        seconds = sum(float(n) * m for n, m in zip(duration.groups(), [3600, 60, 1])) if duration else 0
        image = folder / f'clip-{index:02}.jpg'
        subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-ss', str(min(.5, seconds / 2)), '-i', str(source), '-frames:v', '1', '-vf', 'scale=360:240:force_original_aspect_ratio=decrease', '-y', str(image)], check=True)
        records.append({'index': index, 'original': entry.filename, 'duration': seconds, 'bytes': entry.file_size, 'source': str(source), 'info': info})
canvas = Image.new('RGB', (1440, ((len(records) + 3) // 4) * 280), '#f1eee7')
draw = ImageDraw.Draw(canvas)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
for record in records:
    index = record['index']
    x, y = index % 4 * 360, index // 4 * 280
    thumb = ImageOps.contain(Image.open(folder / f'clip-{index:02}.jpg'), (360, 240))
    canvas.paste(thumb, (x + (360 - thumb.width) // 2, y))
    label = f"{index:02} / {Path(record['original']).name[:27]} / {record['duration']:.1f}s"
    draw.text((x + 8, y + 247), label, fill='#242721', font=font)
canvas.save(folder / 'contact-sheet.jpg', quality=92)
(folder / 'clips.json').write_text(json.dumps(records, indent=2), encoding='utf-8')
print(json.dumps([{k: r[k] for k in ['index', 'original', 'duration', 'bytes']} for r in records], indent=2))
