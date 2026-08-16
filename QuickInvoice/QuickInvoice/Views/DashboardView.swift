import SwiftUI
import SwiftData

struct DashboardView: View {
    @Query(sort: \Invoice.createdAt, order: .reverse) private var invoices: [Invoice]
    @State private var showingNewInvoice = false

    private var currencyCode: String { Locale.current.currency?.identifier ?? "USD" }

    private var outstandingTotal: Decimal {
        invoices
            .filter { $0.status != .paid }
            .reduce(Decimal(0)) { $0 + $1.total }
    }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Outstanding")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(NSDecimalNumber(decimal: outstandingTotal).doubleValue, format: .currency(code: currencyCode))
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                }
                .padding(.vertical, 8)

                Button {
                    showingNewInvoice = true
                } label: {
                    Label("New Invoice", systemImage: "plus.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                }
                .buttonStyle(.borderedProminent)
            }

            Section("Recent Invoices") {
                if invoices.isEmpty {
                    ContentUnavailableView(
                        "No Invoices Yet",
                        systemImage: "doc.text",
                        description: Text("Tap New Invoice to create your first one.")
                    )
                } else {
                    ForEach(invoices.prefix(5)) { invoice in
                        NavigationLink(value: invoice) {
                            InvoiceRow(invoice: invoice)
                        }
                    }
                }
            }
        }
        .navigationTitle("Quick Invoice")
        .navigationDestination(for: Invoice.self) { invoice in
            InvoiceDetailView(invoice: invoice)
        }
        .sheet(isPresented: $showingNewInvoice) {
            NavigationStack {
                InvoiceFormView(invoice: nil)
            }
        }
    }
}
