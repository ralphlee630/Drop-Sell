---
name: react-native-maps web stub
description: react-native-maps crashes the web bundler; must be isolated behind a platform-specific file pair
---

Importing `react-native-maps` directly in any screen causes Metro web bundler to fail with "Importing react-native internals is not supported on web."

**Rule:** Never import `react-native-maps` from a screen file. Wrap it in a platform-specific component pair:
- `components/AreaMapView.tsx` — native implementation (imports MapView, Marker, Callout)
- `components/AreaMapView.web.tsx` — web fallback (renders a plain View with a message)

**Why:** Metro resolves `.web.tsx` before `.tsx` on web builds, so the native import is never reached.

**How to apply:** Any component that needs a map must go through this stub pair. The screen only imports `AreaMapView` and passes `areas` + `primaryColor` props.
