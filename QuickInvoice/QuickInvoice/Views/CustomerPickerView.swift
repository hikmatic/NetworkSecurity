import SwiftUI
import SwiftData

struct CustomerPickerView: View {
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Customer.name) private var customers: [Customer]
    @Binding var selectedCustomer: Customer?
    @State private var searchText = ""
    @State private var showingNewCustomer = false

    private var filtered: [Customer] {
        guard !searchText.isEmpty else { return customers }
        return customers.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        List {
            Button {
                showingNewCustomer = true
            } label: {
                Label("New Customer", systemImage: "person.badge.plus")
            }

            ForEach(filtered) { customer in
                Button {
                    selectedCustomer = customer
                    dismiss()
                } label: {
                    VStack(alignment: .leading) {
                        Text(customer.name).foregroundStyle(.primary)
                        if !customer.email.isEmpty {
                            Text(customer.email).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .searchable(text: $searchText, prompt: "Search customers")
        .navigationTitle("Select Customer")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
        .sheet(isPresented: $showingNewCustomer) {
            NavigationStack {
                CustomerFormView(customer: nil) { newCustomer in
                    selectedCustomer = newCustomer
                    dismiss()
                }
            }
        }
    }
}
