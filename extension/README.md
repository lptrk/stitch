# Stitch Picker – Browser Extension

Click any element in your app to automatically fill selector fields in Stitch. Works with your existing browser session – no re-login needed.

## Install (Chrome / Edge)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. Done – the extension icon appears in your toolbar

## How to use

1. Open Stitch at `http://localhost:3000`
2. Open your app in another tab and **log in as usual**
3. In Stitch, add a block that has a selector field (e.g. Click, Fill, Expect Visible)
4. Click the **🎯 pick button** next to the selector field
5. Switch to your app tab – a blue banner appears at the top
6. **Hover** over elements to preview their selector
7. **Click** the element you want
8. Stitch automatically fills in the selector and switches back

## Tips

- The picker stays in your current session – you don't need to reload or re-login
- Press **Esc** to cancel picking
- Green indicator = unique match (good)
- Yellow indicator = multiple matches (try a more specific selector)
- The picker prefers stable selectors in this order:
  1. `data-testid` / `data-test` / `data-cy`
  2. `id` (non-auto-generated)
  3. `aria-label`
  4. `name` attribute
  5. `placeholder`
  6. Button/link text
  7. CSS path (fallback)

## Updates

When you pull a new version of Stitch, reload the extension:
`chrome://extensions` → find Stitch Picker → click the reload icon
