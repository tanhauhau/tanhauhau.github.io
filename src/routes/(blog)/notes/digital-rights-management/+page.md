---
title: Digital Rights Management
tags:
  - DRM
  - streaming
---

- Hardware Level
  - DRM cryptography for certified players

- Software Level
  - prevent screen capturing:
    - Android 
      - [android.media.projection](https://developer.android.com/reference/android/media/projection/package-summary)
      - [`getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE)`](https://developer.android.com/reference/android/view/WindowManager.LayoutParams.html)
    - iOS
      - https://stackoverflow.com/questions/13484516/ios-detection-of-screenshot
    - Windows
      - [SetWindowDisplayAffinity](https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity) Windows API with a `WDA_MONITOR` affinity.

Reference:
- https://www.quora.com/What-technology-does-Netflix-and-other-streaming-services-use-to-prevent-someone-from-screen-capturing-a-movie-or-even-taking-a-screen-shot-I-am-a-Computer-Science-major-and-its-annoying-me-that-I-cant-figure-out-how-it-works
