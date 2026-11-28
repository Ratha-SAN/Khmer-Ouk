# Put the promo together: game footage (cropped under a caption band) + captions + end card + music and sounds.
import json, os, subprocess, random
D = os.environ.get('PROMO_WORK', '/tmp/ouk-promo')  # recordings, audio, captions and the result (see README.md)
OUT = os.path.join(D, 'out'); os.makedirs(OUT, exist_ok=True)
FPS, XF = 30, 0.35            # frame rate, cross-fade length between scenes
# scene clips: (clip, clip start, clip end, [(overlay, from, to) in segment time], segment length)
SEGS = [
    ('play',   0.00, 9.50, [('intro', 0, 3.6), ('play', 3.6, 99)], 9.60),
    ('themes', 0.05, 5.60, [('themes', 0, 99)], 5.55),
    ('learn',  0.05, 5.60, [('learn', 0, 99)], 5.55),
    ('win',    0.40, 6.40, [('win', 0, 99)], 5.60),
]
END_LEN = 5.10
GAME = "crop=810:1150:0:290,scale=1080:1533:flags=lanczos,pad=1080:1920:0:387:color=0x140c06"
def run(cmd): subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def footage(name, a, b, L):
    """frames of a clip between page times a and b -> a constant 30 fps video of length L (the last frame held)"""
    tl = json.load(open(os.path.join(D, 'clips', name, 'timeline.json')))
    fr = tl['frames']
    sel = [f for f in fr if a <= f['t'] <= b]
    before = [f for f in fr if f['t'] < a]
    if before: sel = [dict(before[-1], t=a)] + sel   # (the picture on screen at time a)
    lst = os.path.join(OUT, name + '.ffconcat')
    with open(lst, 'w') as fh:
        fh.write('ffconcat version 1.0\n')
        for i, f in enumerate(sel):
            nxt = sel[i + 1]['t'] if i + 1 < len(sel) else a + L
            fh.write("file '%s'\nduration %.4f\n" % (f['f'], max(0.001, nxt - f['t'])))
        fh.write("file '%s'\n" % sel[-1]['f'])
    return lst, tl['sfx']

def segment(i, name, a, b, ovs, L):
    lst, sfx = footage(name, a, b, L)
    out = os.path.join(OUT, 'seg%d.mp4' % i)
    inputs = ['-f', 'concat', '-safe', '0', '-i', lst]
    chain = '[0]%s,fps=%d,trim=duration=%.3f,setpts=PTS-STARTPTS[v0]' % (GAME, FPS, L)
    for k, (ov, t0, t1) in enumerate(ovs):
        inputs += ['-loop', '1', '-t', str(L), '-i', os.path.join(D, 'ov', ov + '.png')]
        fin = 'fade=in:st=%.2f:d=0.35:alpha=1' % t0 if t0 > 0 else 'null'
        chain += ';[%d]format=rgba,%s[o%d];[v%d][o%d]overlay=0:0:enable=\'between(t,%.3f,%.3f)\'[v%d]' % (k + 1, fin, k, k, k, t0, min(t1, L), k + 1)
    run(['ffmpeg', '-y', '-v', 'error'] + inputs + ['-filter_complex', chain, '-map', '[v%d]' % len(ovs), '-r', str(FPS),
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out])
    return out, [(s['kind'], s['t'] - a) for s in sfx if a - 0.05 <= s['t'] <= a + L]

def endcard():
    out = os.path.join(OUT, 'seg_end.mp4')
    # a slow push-in on the end card
    run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-t', str(END_LEN), '-i', os.path.join(D, 'ov', 'end.png'),
         '-vf', "scale=2160:3840,zoompan=z='1+0.035*on/%d':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=%d,format=yuv420p" % (int(END_LEN * FPS), FPS),
         '-frames:v', str(int(END_LEN * FPS)), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out])
    return out

segs, events, start = [], [], 0.0
for i, (name, a, b, ovs, L) in enumerate(SEGS):
    path, ev = segment(i, name, a, b, ovs, L)
    segs.append((path, L)); events += [(k, start + t) for k, t in ev]
    start += L - XF
segs.append((endcard(), END_LEN))
total = sum(L for _, L in segs) - XF * (len(segs) - 1)

# the scenes joined with cross-fades
inputs, chain, prev, off = [], '', '[0:v]', 0.0
for i, (p, L) in enumerate(segs): inputs += ['-i', p]
for i in range(1, len(segs)):
    off += segs[i - 1][1] - XF
    chain += '%s[%d:v]xfade=transition=fade:duration=%.2f:offset=%.3f[x%d];' % (prev, i, XF, off, i); prev = '[x%d]' % i
video = os.path.join(OUT, 'video.mp4')
run(['ffmpeg', '-y', '-v', 'error'] + inputs + ['-filter_complex', chain.rstrip(';'), '-map', prev, '-r', str(FPS),
     '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', video])

# the soundtrack: the game's Khmer roneat music under the game's own move, capture and win sounds, each when it is heard
A = os.path.join(D, 'audio'); random.seed(7)
ain = ['-i', os.path.join(A, 'music_khmer1.wav')]; mix = '[0]atrim=0:%.2f,afade=t=in:d=0.6,afade=t=out:st=%.2f:d=1.6,volume=0.75[m]' % (total, total - 1.6)
labels = ['[m]']
for j, (k, t) in enumerate(events):
    f = 'win.wav' if k.startswith('end_win') else ('capture%d.wav' if k == 'capture' else 'move%d.wav') % random.randint(0, 2) if not k.startswith('end_') else None
    if not f or t < 0 or t > total: continue
    ain += ['-i', os.path.join(A, f)]
    n = len(ain) // 2 - 1
    mix += ';[%d]adelay=%d|%d,volume=%.2f[s%d]' % (n, int(t * 1000), int(t * 1000), 1.6 if k == 'capture' else 1.4, n); labels.append('[s%d]' % n)
mix += ';%samix=inputs=%d:normalize=0:duration=first,alimiter=limit=0.95[a]' % (''.join(labels), len(labels))
audio = os.path.join(OUT, 'audio.m4a')
run(['ffmpeg', '-y', '-v', 'error'] + ain + ['-filter_complex', mix, '-map', '[a]', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', audio])

final = os.path.join(D, 'ouk-chatrang-promo-30s-vertical.mp4')
run(['ffmpeg', '-y', '-v', 'error', '-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', final])
print('total %.2f s, sounds %s' % (total, [(k, round(t, 2)) for k, t in events]))
print(final)
