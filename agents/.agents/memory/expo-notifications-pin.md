---
name: expo-notifications version pin
description: expo-notifications and expo-device must be pinned to Expo SDK 54 compatible versions
---

When installing expo-notifications or expo-device in the Drop & Sell mobile artifact (Expo SDK ~54), the default `pnpm add` pulls incompatible major versions.

**Rule:** Always pin to the SDK 54 expected versions:
- `expo-notifications@~0.32.17`
- `expo-device@~8.0.10`

**Why:** `pnpm add expo-notifications` pulled v57.x which is for a newer SDK. Metro starts but with warnings, and notification APIs may behave differently. Pinning avoids the mismatch warning and ensures API compatibility.

**How to apply:** Use `pnpm add expo-notifications@~0.32.17 expo-device@~8.0.10` — never bare `pnpm add expo-notifications`.
