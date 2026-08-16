import Foundation
import SwiftData

@Model
final class InvoiceItem {
    var itemDescription: String
    var quantity: Double
    var unitPrice: Decimal
    var sortIndex: Int

    var invoice: Invoice?

    init(
        itemDescription: String,
        quantity: Double = 1,
        unitPrice: Decimal = 0,
        sortIndex: Int = 0
    ) {
        self.itemDescription = itemDescription
        self.quantity = quantity
        self.unitPrice = unitPrice
        self.sortIndex = sortIndex
    }

    var lineTotal: Decimal {
        Decimal(quantity) * unitPrice
    }
}
