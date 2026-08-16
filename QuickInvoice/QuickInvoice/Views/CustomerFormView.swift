import SwiftUI
import SwiftData

struct CustomerFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let customer: Customer?
    var onSave: ((Customer) -> Void)?

    @State private var name: String
    @State private var email: String
    @State private var phone: String
    @State private var address: String
    @State private var notes: String

    init(customer: Customer?, onSave: ((Customer) -> Void)? = nil) {
        self.customer = customer
        self.onSave = onSave
        _name = State(initialValue: customer?.name ?? "")
        _email = State(initialValue: customer?.email ?? "")
        _phone = State(initialValue: customer?.phone ?? "")
        _address = State(initialValue: customer?.address ?? "")
        _notes = State(initialValue: customer?.notes ?? "")
    }

    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        Form {
            Section("Contact") {
                TextField("Name", text: $name)
                    .textContentType(.name)
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                TextField("Phone", text: $phone)
                    .keyboardType(.phonePad)
            }
            Section("Address") {
                TextField("Address", text: $address, axis: .vertical)
                    .lineLimit(2...4)
            }
            Section("Notes") {
                TextField("Optional notes", text: $notes, axis: .vertical)
                    .lineLimit(2...4)
            }
        }
        .navigationTitle(customer == nil ? "New Customer" : "Edit Customer")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .disabled(!isValid)
            }
        }
    }

    private func save() {
        let target: Customer
        if let customer {
            target = customer
        } else {
            target = Customer(name: name)
            modelContext.insert(target)
        }
        target.name = name
        target.email = email
        target.phone = phone
        target.address = address
        target.notes = notes

        if let onSave {
            onSave(target)
        } else {
            dismiss()
        }
    }
}
