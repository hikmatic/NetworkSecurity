import Foundation
import SwiftData

@Model
final class Customer {
    var name: String
    var email: String
    var phone: String
    var address: String
    var notes: String
    var createdAt: Date

    @Relationship(deleteRule: .cascade, inverse: \Invoice.customer)
    var invoices: [Invoice] = []

    init(
        name: String,
        email: String = "",
        phone: String = "",
        address: String = "",
        notes: String = ""
    ) {
        self.name = name
        self.email = email
        self.phone = phone
        self.address = address
        self.notes = notes
        self.createdAt = .now
    }
}
