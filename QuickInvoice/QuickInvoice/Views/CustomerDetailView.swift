import SwiftUI
import SwiftData

struct CustomerDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Bindable var customer: Customer
    @State private var showingEdit = false
    @State private var showingDeleteConfirm = false

    private var sortedInvoices: [Invoice] {
        customer.invoices.sorted { $0.createdAt > $1.createdAt }
    }

    var body: some View {
        List {
            Section("Contact") {
                if !customer.email.isEmpty {
                    LabeledContent("Email", value: customer.email)
                }
                if !customer.phone.isEmpty {
                    LabeledContent("Phone", value: customer.phone)
                }
                if !customer.address.isEmpty {
                    LabeledContent("Address", value: customer.address)
                }
                if customer.email.isEmpty && customer.phone.isEmpty && customer.address.isEmpty {
                    Text("No contact details yet").foregroundStyle(.secondary)
                }
            }

            Section("Invoices") {
                if sortedInvoices.isEmpty {
                    Text("No invoices yet").foregroundStyle(.secondary)
                } else {
                    ForEach(sortedInvoices) { invoice in
                        NavigationLink(value: invoice) {
                            InvoiceRow(invoice: invoice)
                        }
                    }
                }
            }

            Section {
                Button("Delete Customer", role: .destructive) {
                    showingDeleteConfirm = true
                }
            }
        }
        .navigationTitle(customer.name)
        .navigationDestination(for: Invoice.self) { invoice in
            InvoiceDetailView(invoice: invoice)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Edit") { showingEdit = true }
            }
        }
        .sheet(isPresented: $showingEdit) {
            NavigationStack {
                CustomerFormView(customer: customer)
            }
        }
        .confirmationDialog(
            "Delete this customer? Their invoices will be deleted too.",
            isPresented: $showingDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                modelContext.delete(customer)
                dismiss()
            }
        }
    }
}
