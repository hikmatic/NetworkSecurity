import SwiftUI
import SwiftData

struct InvoiceListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Invoice.createdAt, order: .reverse) private var invoices: [Invoice]
    @State private var showingNewInvoice = false
    @State private var searchText = ""

    private var filtered: [Invoice] {
        guard !searchText.isEmpty else { return invoices }
        return invoices.filter {
            $0.number.localizedCaseInsensitiveContains(searchText) ||
            ($0.customer?.name.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var body: some View {
        List {
            if filtered.isEmpty {
                ContentUnavailableView.search
            } else {
                ForEach(filtered) { invoice in
                    NavigationLink(value: invoice) {
                        InvoiceRow(invoice: invoice)
                    }
                }
                .onDelete(perform: deleteInvoices)
            }
        }
        .searchable(text: $searchText, prompt: "Search invoices")
        .navigationTitle("Invoices")
        .navigationDestination(for: Invoice.self) { invoice in
            InvoiceDetailView(invoice: invoice)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showingNewInvoice = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingNewInvoice) {
            NavigationStack {
                InvoiceFormView(invoice: nil)
            }
        }
    }

    private func deleteInvoices(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(filtered[index])
        }
    }
}
