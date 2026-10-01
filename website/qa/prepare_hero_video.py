"""Create the silent hero loop from actual owner-supplied Stewart Falls footage."""
from pathlib import Path
import subprocess
import zipfile
import imageio_ffmpeg

archive = next(Path('C:/Users/carte/Downloads/Pancake Boys/Photos').glob('*.zip'))
source = Path('tmp/video-review/hero-original.mov')
source.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(archive) as package:
    name = next(name for name in package.namelist() if name.endswith('/IMG_6085.MOV'))
    source.write_bytes(package.read(name))
output = Path('website/assets/hero-hike.mp4')
filters = ('[0:v]crop=iw:trunc(iw*9/16/2)*2:0:0,scale=1280:720,setsar=1,setpts=PTS-STARTPTS,fps=24,split=2[main][start];'
           '[start]trim=duration=0.6,setpts=PTS-STARTPTS,fps=24[head];'
           '[main][head]xfade=transition=fade:duration=0.6:offset=7.4,format=yuv420p[out]')
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error',
                '-ss', '3', '-t', '8', '-i', str(source), '-filter_complex', filters,
                '-map', '[out]', '-an', '-map_metadata', '-1', '-c:v', 'libx264',
                '-preset', 'medium', '-crf', '27', '-profile:v', 'main', '-maxrate', '1800k',
                '-bufsize', '3600k', '-movflags', '+faststart', '-y', str(output)], check=True)
print(f'{output}: {output.stat().st_size:,} bytes; 8-second 1280x720 H.264 loop, no audio')
