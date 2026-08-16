import SwiftUI

struct InvoiceRow: View {
    let invoice: Invoice

    private var currencyCode: String { Locale.current.currency?.identifier ?? "USD" }

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(invoice.number)
                    .font(.headline)
                Text(invoice.customer?.name ?? "No customer")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(NSDecimalNumber(decimal: invoice.total).doubleValue, format: .currency(code: currencyCode))
                    .font(.headline)
                StatusBadge(status: invoice.status)
            }
        }
        .padding(.vertical, 4)
    }
}

struct StatusBadge: View {
    let status: InvoiceStatus

    private var color: Color {
        switch status {
        case .draft: return .gray
        case .sent: return .orange
        case .paid: return .green
        }
    }

    var body: some View {
        Text(status.rawValue)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}
