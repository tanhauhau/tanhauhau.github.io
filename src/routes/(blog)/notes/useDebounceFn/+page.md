---
title: useDebounceFn
tags:
  - react
  - hooks
---

is this the right way of doing it? :thinking:
```
import * as React from 'react';

export default function useDebounceFn<T extends (...args: any) => void>(fn: T, delay: number): T {
  const timeoutId = React.useRef<NodeJS.Timeout>();
  const originalFn = React.useRef<T>();

  React.useEffect(() => {
    originalFn.current = fn;
    () => {
      originalFn.current = null;
    };
  }, [fn]);

  React.useEffect(() => {
    return () => {
      clearTimeout(timeoutId.current);
    };
  }, []);

  return React.useMemo<T>(
    () => (...args: any) => {
      clearTimeout(timeoutId.current);

      timeoutId.current = setTimeout(() => {
        if (originalFn.current) {
          originalFn.current(...args);
        }
      }, delay);
    },
    [delay]
  );
}
```
