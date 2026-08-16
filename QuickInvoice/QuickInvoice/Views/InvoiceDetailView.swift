import SwiftUI
import SwiftData

struct InvoiceDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Bindable var invoice: Invoice
    @State private var showingEdit = false
    @State private var shareURL: URL?
    @State private var showingShareSheet = false
    @State private var showingDeleteConfirm = false

    private var currencyCode: String { Locale.current.currency?.identifier ?? "USD" }

    var body: some View {
        List {
            Section {
                HStack {
                    VStack(alignment: .leading) {
                        Text(invoice.number).font(.title2.bold())
                        Text(invoice.customer?.name ?? "No customer")
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    StatusBadge(status: invoice.status)
                }
                LabeledContent("Date", value: invoice.date.formatted(date: .abbreviated, time: .omitted))
                LabeledContent("Due", value: invoice.dueDate.formatted(date: .abbreviated, time: .omitted))
            }

            Section("Items") {
                ForEach(invoice.items.sorted(by: { $0.sortIndex < $1.sortIndex })) { item in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(item.itemDescription)
                            Text("\(String(format: "%g", item.quantity)) × \(NSDecimalNumber(decimal: item.unitPrice).doubleValue.formatted(.currency(code: currencyCode)))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(NSDecimalNumber(decimal: item.lineTotal).doubleValue, format: .currency(code: currencyCode))
                    }
                }
            }

            Section {
                HStack {
                    Text("Subtotal")
                    Spacer()
                    Text(NSDecimalNumber(decimal: invoice.subtotal).doubleValue, format: .currency(code: currencyCode))
                }
                HStack {
                    Text("Tax (\(String(format: "%g", invoice.taxRatePercent))%)")
                    Spacer()
                    Text(NSDecimalNumber(decimal: invoice.taxAmount).doubleValue, format: .currency(code: currencyCode))
                }
                HStack {
                    Text("Total").font(.headline)
                    Spacer()
                    Text(NSDecimalNumber(decimal: invoice.total).doubleValue, format: .currency(code: currencyCode)).font(.headline)
                }
            }

            if !invoice.notes.isEmpty {
                Section("Notes") {
                    Text(invoice.notes)
                }
            }

            Section {
                Picker("Status", selection: $invoice.status) {
                    ForEach(InvoiceStatus.allCases) { Text($0.rawValue).tag($0) }
                }
            }

            Section {
                Button {
                    shareInvoice()
                } label: {
                    Label("Share PDF", systemImage: "square.and.arrow.up")
                }
                Button("Edit Invoice") { showingEdit = true }
                Button("Delete Invoice", role: .destructive) { showingDeleteConfirm = true }
            }
        }
        .navigationTitle("Invoice")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingEdit) {
            NavigationStack {
                InvoiceFormView(invoice: invoice)
            }
        }
        .sheet(isPresented: $showingShareSheet) {
            if let shareURL {
                ShareSheet(activityItems: [shareURL])
            }
        }
        .confirmationDialog("Delete this invoice?", isPresented: $showingDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                modelContext.delete(invoice)
                dismiss()
            }
        }
    }

    private func shareInvoice() {
        do {
            shareURL = try InvoicePDFGenerator.generatePDF(for: invoice)
            showingShareSheet = true
        } catch {
            print("Failed to generate invoice PDF: \(error)")
        }
    }
}
