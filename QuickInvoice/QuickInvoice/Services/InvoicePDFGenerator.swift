import UIKit

enum InvoicePDFGenerator {
    static func generatePDF(for invoice: Invoice) throws -> URL {
        let pageWidth: CGFloat = 612
        let pageHeight: CGFloat = 792
        let pageRect = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)
        let margin: CGFloat = 48

        let currencyCode = Locale.current.currency?.identifier ?? "USD"
        func currency(_ value: Decimal) -> String {
            NSDecimalNumber(decimal: value).doubleValue.formatted(.currency(code: currencyCode))
        }

        let titleAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.boldSystemFont(ofSize: 24)]
        let headingAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.boldSystemFont(ofSize: 14)]
        let bodyAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 12)]
        let secondaryAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 12),
            .foregroundColor: UIColor.darkGray
        ]

        let colDescX = margin
        let colQtyX = pageWidth - margin - 220
        let colPriceX = pageWidth - margin - 150
        let colTotalX = pageWidth - margin - 70

        let renderer = UIGraphicsPDFRenderer(bounds: pageRect)
        let data = renderer.pdfData { context in
            context.beginPage()
            var y: CGFloat = margin

            "Invoice \(invoice.number)".draw(at: CGPoint(x: margin, y: y), withAttributes: titleAttrs)
            y += 36

            "Date: \(invoice.date.formatted(date: .abbreviated, time: .omitted))"
                .draw(at: CGPoint(x: margin, y: y), withAttributes: secondaryAttrs)
            "Due: \(invoice.dueDate.formatted(date: .abbreviated, time: .omitted))"
                .draw(at: CGPoint(x: pageWidth - margin - 160, y: y), withAttributes: secondaryAttrs)
            y += 28

            "Bill To:".draw(at: CGPoint(x: margin, y: y), withAttributes: headingAttrs)
            y += 18

            if let customer = invoice.customer {
                customer.name.draw(at: CGPoint(x: margin, y: y), withAttributes: bodyAttrs)
                y += 16
                if !customer.email.isEmpty {
                    customer.email.draw(at: CGPoint(x: margin, y: y), withAttributes: bodyAttrs)
                    y += 16
                }
                if !customer.address.isEmpty {
                    let addressRect = CGRect(x: margin, y: y, width: pageWidth - margin * 2, height: 48)
                    customer.address.draw(in: addressRect, withAttributes: bodyAttrs)
                    y += 48
                }
            }
            y += 16

            "Description".draw(at: CGPoint(x: colDescX, y: y), withAttributes: headingAttrs)
            "Qty".draw(at: CGPoint(x: colQtyX, y: y), withAttributes: headingAttrs)
            "Price".draw(at: CGPoint(x: colPriceX, y: y), withAttributes: headingAttrs)
            "Total".draw(at: CGPoint(x: colTotalX, y: y), withAttributes: headingAttrs)
            y += 18

            drawLine(from: CGPoint(x: margin, y: y), to: CGPoint(x: pageWidth - margin, y: y))
            y += 10

            for item in invoice.items.sorted(by: { $0.sortIndex < $1.sortIndex }) {
                if y > pageHeight - margin - 160 {
                    context.beginPage()
                    y = margin
                }
                item.itemDescription.draw(at: CGPoint(x: colDescX, y: y), withAttributes: bodyAttrs)
                String(format: "%g", item.quantity).draw(at: CGPoint(x: colQtyX, y: y), withAttributes: bodyAttrs)
                currency(item.unitPrice).draw(at: CGPoint(x: colPriceX, y: y), withAttributes: bodyAttrs)
                currency(item.lineTotal).draw(at: CGPoint(x: colTotalX, y: y), withAttributes: bodyAttrs)
                y += 20
            }

            y += 16
            drawLine(from: CGPoint(x: colPriceX - 20, y: y), to: CGPoint(x: pageWidth - margin, y: y))
            y += 10

            "Subtotal".draw(at: CGPoint(x: colPriceX, y: y), withAttributes: bodyAttrs)
            currency(invoice.subtotal).draw(at: CGPoint(x: colTotalX, y: y), withAttributes: bodyAttrs)
            y += 18

            "Tax (\(String(format: "%g", invoice.taxRatePercent))%)".draw(at: CGPoint(x: colPriceX, y: y), withAttributes: bodyAttrs)
            currency(invoice.taxAmount).draw(at: CGPoint(x: colTotalX, y: y), withAttributes: bodyAttrs)
            y += 18

            "Total".draw(at: CGPoint(x: colPriceX, y: y), withAttributes: headingAttrs)
            currency(invoice.total).draw(at: CGPoint(x: colTotalX, y: y), withAttributes: headingAttrs)
            y += 30

            if !invoice.notes.isEmpty {
                "Notes".draw(at: CGPoint(x: margin, y: y), withAttributes: headingAttrs)
                y += 18
                let notesRect = CGRect(x: margin, y: y, width: pageWidth - margin * 2, height: 100)
                invoice.notes.draw(in: notesRect, withAttributes: bodyAttrs)
            }
        }

        let fileName = "\(invoice.number).pdf"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        try data.write(to: url)
        return url
    }

    private static func drawLine(from start: CGPoint, to end: CGPoint) {
        let path = UIBezierPath()
        path.move(to: start)
        path.addLine(to: end)
        UIColor.lightGray.setStroke()
        path.stroke()
    }
}
