# PORSH Invoice Generator

A responsive, installable invoice generator based on `Porsh_Studios_Invoice_Concept.pdf`.

## Use locally

The app has no build step and no external dependencies. Start any static file server in this folder, for example:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

Invoice data is saved only in the browser's local storage. Use **Save as PDF** and choose the device's PDF destination in the print window. After confirming that the PDF was saved, the app preserves the invoice-number format and advances its trailing number (for example, `PS-INV-2026-0024` becomes `PS-INV-2026-0025`).

## Supported devices

- macOS and Windows desktop browsers
- iPhone and iPad Safari
- Android Chrome

When supported by the browser, the app can be installed to the home screen or desktop.
