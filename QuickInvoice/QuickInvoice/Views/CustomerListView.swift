import SwiftUI
import SwiftData

struct CustomerListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Customer.name) private var customers: [Customer]
    @State private var showingNewCustomer = false
    @State private var searchText = ""

    private var filtered: [Customer] {
        guard !searchText.isEmpty else { return customers }
        return customers.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        List {
            if filtered.isEmpty {
                ContentUnavailableView(
                    "No Customers",
                    systemImage: "person.2",
                    description: Text("Tap + to add your first customer.")
                )
            } else {
                ForEach(filtered) { customer in
                    NavigationLink(value: customer) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(customer.name).font(.headline)
                            if !customer.email.isEmpty {
                                Text(customer.email).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                .onDelete(perform: deleteCustomers)
            }
        }
        .searchable(text: $searchText, prompt: "Search customers")
        .navigationTitle("Customers")
        .navigationDestination(for: Customer.self) { customer in
            CustomerDetailView(customer: customer)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showingNewCustomer = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingNewCustomer) {
            NavigationStack {
                CustomerFormView(customer: nil)
            }
        }
    }

    private func deleteCustomers(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(filtered[index])
        }
    }
}
