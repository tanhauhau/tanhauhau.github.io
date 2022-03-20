---
title: Converting movie to gif
tags:
  - ffmpeg
---

movie to gif via `ffmpeg`

```sh
ffmpeg -i ~/Desktop/darkmode.mov -filter_complex "[0:v] fps=40, setpts=0.5*PTS" -f gif ~/Desktop/darkmode-2.gif
```

`-i` specify input file
`-f` specify format
lastly sepcify output file

extras:
- `-ss` for seeking
- `-filter_complex` to do filtering
  - `fps=40` control frame per second, more or less detail
  - `setpts=0.5*PTS` speed up the video [reference](https://trac.ffmpeg.org/wiki/How%20to%20speed%20up%20/%20slow%20down%20a%20video)
  