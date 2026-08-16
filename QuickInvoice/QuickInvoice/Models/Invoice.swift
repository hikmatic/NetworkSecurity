import Foundation
import SwiftData

enum InvoiceStatus: String, Codable, CaseIterable, Identifiable {
    case draft = "Draft"
    case sent = "Sent"
    case paid = "Paid"

    var id: String { rawValue }
}

@Model
final class Invoice {
    var number: String
    var date: Date
    var dueDate: Date
    var taxRatePercent: Double
    var notes: String
    var statusRaw: String
    var createdAt: Date

    var customer: Customer?

    @Relationship(deleteRule: .cascade, inverse: \InvoiceItem.invoice)
    var items: [InvoiceItem] = []

    var status: InvoiceStatus {
        get { InvoiceStatus(rawValue: statusRaw) ?? .draft }
        set { statusRaw = newValue.rawValue }
    }

    init(
        number: String,
        customer: Customer?,
        date: Date = .now,
        dueDate: Date = Calendar.current.date(byAdding: .day, value: 14, to: .now) ?? .now,
        taxRatePercent: Double = 0,
        notes: String = "",
        status: InvoiceStatus = .draft
    ) {
        self.number = number
        self.customer = customer
        self.date = date
        self.dueDate = dueDate
        self.taxRatePercent = taxRatePercent
        self.notes = notes
        self.statusRaw = status.rawValue
        self.createdAt = .now
    }

    var subtotal: Decimal {
        items.reduce(Decimal(0)) { $0 + $1.lineTotal }
    }

    var taxAmount: Decimal {
        subtotal * Decimal(taxRatePercent / 100)
    }

    var total: Decimal {
        subtotal + taxAmount
    }
}
