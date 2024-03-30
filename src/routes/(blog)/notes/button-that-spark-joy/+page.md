---
title: Button that spark joy
tags:
  - CSS transform
  - GreenSock Animation
---

> Notes for reading [Frontend Horse: Button that Spark Joy](https://frontend.horse/articles/buttons-that-spark-joy/)

## Confirm Confetti Button

There's so much more details than the confetti cannon

### Button tilted in the direction of the mouse cursor

- transform `::before` instead of the button itself, because the hover hit area will change as we transform the button.
- use `rotateX` and `rotateY`
- transformZ, for some parallex kind of effect