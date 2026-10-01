"""Assemble unaltered before/after browser captures for local review."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).parent
try:
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
except OSError:
    font = ImageFont.load_default()

for screen, width in [('desktop', 700), ('mobile', 375)]:
    captures = [Image.open(root / f'{state}-{screen}.jpg') for state in ['before', 'after']]
    assert captures[0].size == captures[1].size, 'Compare matching viewport captures'
    height = round(captures[0].height * width / captures[0].width)
    canvas = Image.new('RGB', (width * 2 + 24, height + 52), '#f1eee7')
    draw = ImageDraw.Draw(canvas)
    for index, (state, capture) in enumerate(zip(['BEFORE', 'AFTER'], captures)):
        x = index * (width + 24)
        draw.text((x + 12, 14), f'{screen.upper()} / {state}', fill='#242721', font=font)
        canvas.paste(capture.resize((width, height), Image.Resampling.LANCZOS), (x, 52))
    canvas.save(root / f'comparison-{screen}.jpg', quality=94)
