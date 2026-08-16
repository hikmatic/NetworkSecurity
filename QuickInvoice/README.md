# Quick Invoice

A native SwiftUI iPhone app for creating quick invoices for customers on the go.

## Features

- **Customers** — save name, email, phone, and address once, reuse on every invoice.
- **Quick invoice creation** — pick a customer, add line items (description, quantity, price), set a due date and tax rate; totals calculate live.
- **Auto invoice numbering** — invoices are numbered `INV-0001`, `INV-0002`, ... automatically.
- **Status tracking** — mark invoices Draft, Sent, or Paid; the Home tab shows total outstanding.
- **PDF export & share** — generate a clean PDF of any invoice and share it via Mail, Messages, AirDrop, etc. using the standard iOS share sheet.
- **Local storage** — all data is stored on-device with SwiftData (no account, no server, no network access required).

## Requirements

- macOS with Xcode 15 or later
- iOS 17+ deployment target (uses SwiftData)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) to generate the `.xcodeproj` (the project file itself isn't checked in, since it's generated)

## Setup

```bash
brew install xcodegen   # one-time install
cd QuickInvoice
xcodegen generate
open QuickInvoice.xcodeproj
```

Then in Xcode: pick an iPhone simulator (or your device) and press Run (⌘R).

## Project layout

```
QuickInvoice/
  project.yml                 # XcodeGen project spec
  QuickInvoice/
    QuickInvoiceApp.swift     # App entry point + SwiftData container
    RootView.swift            # Tab bar: Home / Invoices / Customers
    Models/                   # SwiftData models: Customer, Invoice, InvoiceItem
    Views/                    # SwiftUI screens
      Components/             # Small reusable views (rows, badges)
    Services/                 # PDF generation, share sheet wrapper
    Assets.xcassets/          # App icon + accent color placeholders
```

## Notes

- The app icon asset is a placeholder — drop a 1024×1024 PNG into `Assets.xcassets/AppIcon.appiconset` before shipping.
- All amounts use the device's current locale/currency for display and PDF export.
