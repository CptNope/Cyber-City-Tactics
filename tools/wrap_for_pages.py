"""Wrap the artifact-style game fragment into a full HTML document for static hosting (GitHub Pages).
The claude.ai artifact viewer supplies <html>/<head>/<body>, a mobile viewport tag and a small reset;
a plain web host does not, so phones would render the game as a zoomed-out desktop page."""
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
split = s.index('<div id="app">')
head, body = s[:split], s[split:]
doc = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
{head.strip()}
<style>
/* Static-hosting reset (the artifact viewer normally provides this) */
body{{margin:0}}
#app{{padding-top:max(8px,env(safe-area-inset-top,0px));padding-bottom:max(8px,env(safe-area-inset-bottom,0px))}}
</style>
</head>
<body>
{body.strip()}
</body>
</html>
'''
open(out, 'w', encoding='utf-8').write(doc)
print('wrote', out, len(doc))
