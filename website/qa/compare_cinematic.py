"""Pair existing before captures with the cinematic browser screenshots."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).parent
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
for screen, width in [('desktop', 700), ('mobile', 375)]:
    captures = [Image.open(root / f'before-{screen}.jpg'), Image.open(root / f'cinematic-{screen}-hero.jpg')]
    height = round(captures[0].height * width / captures[0].width)
    canvas = Image.new('RGB', (width * 2 + 24, height + 52), '#f1eee7')
    draw = ImageDraw.Draw(canvas)
    for i, (label, capture) in enumerate(zip(['BEFORE', 'CINEMATIC PASS'], captures)):
        x = i * (width + 24)
        draw.text((x + 12, 14), f'{screen.upper()} / {label}', fill='#242721', font=font)
        canvas.paste(capture.resize((width, height), Image.Resampling.LANCZOS), (x, 52))
    canvas.save(root / f'cinematic-comparison-{screen}.jpg', quality=94)
