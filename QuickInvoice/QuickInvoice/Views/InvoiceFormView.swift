import SwiftUI
import SwiftData

struct InvoiceFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query private var allInvoices: [Invoice]

    let invoice: Invoice?

    @State private var selectedCustomer: Customer?
    @State private var date: Date
    @State private var dueDate: Date
    @State private var taxRatePercent: String
    @State private var notes: String
    @State private var status: InvoiceStatus
    @State private var lineItems: [DraftLineItem]
    @State private var showingCustomerPicker = false

    private var currencyCode: String { Locale.current.currency?.identifier ?? "USD" }

    struct DraftLineItem: Identifiable {
        let id = UUID()
        var description: String = ""
        var quantity: String = "1"
        var unitPrice: String = ""
    }

    init(invoice: Invoice?) {
        self.invoice = invoice
        _selectedCustomer = State(initialValue: invoice?.customer)
        _date = State(initialValue: invoice?.date ?? .now)
        _dueDate = State(initialValue: invoice?.dueDate ?? Calendar.current.date(byAdding: .day, value: 14, to: .now) ?? .now)
        _taxRatePercent = State(initialValue: invoice.map { String(format: "%g", $0.taxRatePercent) } ?? "0")
        _notes = State(initialValue: invoice?.notes ?? "")
        _status = State(initialValue: invoice?.status ?? .draft)

        if let invoice, !invoice.items.isEmpty {
            let sorted = invoice.items.sorted { $0.sortIndex < $1.sortIndex }
            _lineItems = State(initialValue: sorted.map { item in
                DraftLineItem(
                    description: item.itemDescription,
                    quantity: String(format: "%g", item.quantity),
                    unitPrice: "\(item.unitPrice)"
                )
            })
        } else {
            _lineItems = State(initialValue: [DraftLineItem()])
        }
    }

    private func lineTotal(for item: DraftLineItem) -> Decimal {
        let qty = Decimal(Double(item.quantity) ?? 0)
        let price = Decimal(string: item.unitPrice) ?? 0
        return qty * price
    }

    private var subtotal: Decimal {
        lineItems.reduce(Decimal(0)) { $0 + lineTotal(for: $1) }
    }

    private var taxAmount: Decimal {
        subtotal * Decimal((Double(taxRatePercent) ?? 0) / 100)
    }

    private var total: Decimal {
        subtotal + taxAmount
    }

    private var isValid: Bool {
        selectedCustomer != nil &&
        lineItems.contains { !$0.description.trimmingCharacters(in: .whitespaces).isEmpty }
    }

    var body: some View {
        Form {
            Section("Customer") {
                if let selectedCustomer {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(selectedCustomer.name).font(.headline)
                            if !selectedCustomer.email.isEmpty {
                                Text(selectedCustomer.email).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        Button("Change") { showingCustomerPicker = true }
                            .font(.subheadline)
                    }
                } else {
                    Button {
                        showingCustomerPicker = true
                    } label: {
                        Label("Select Customer", systemImage: "person.crop.circle.badge.plus")
                    }
                }
            }

            Section("Details") {
                DatePicker("Invoice Date", selection: $date, displayedComponents: .date)
                DatePicker("Due Date", selection: $dueDate, displayedComponents: .date)
                Picker("Status", selection: $status) {
                    ForEach(InvoiceStatus.allCases) { Text($0.rawValue).tag($0) }
                }
                HStack {
                    Text("Tax Rate")
                    Spacer()
                    TextField("0", text: $taxRatePercent)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 60)
                    Text("%")
                }
            }

            Section("Items") {
                ForEach($lineItems) { $item in
                    VStack(alignment: .leading, spacing: 6) {
                        TextField("Description", text: $item.description)
                        HStack {
                            TextField("Qty", text: $item.quantity)
                                .keyboardType(.decimalPad)
                                .frame(width: 60)
                            Text("×").foregroundStyle(.secondary)
                            TextField("Price", text: $item.unitPrice)
                                .keyboardType(.decimalPad)
                            Spacer()
                            Text(NSDecimalNumber(decimal: lineTotal(for: item)).doubleValue, format: .currency(code: currencyCode))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .onDelete { lineItems.remove(atOffsets: $0) }

                Button {
                    lineItems.append(DraftLineItem())
                } label: {
                    Label("Add Item", systemImage: "plus.circle")
                }
            }

            Section {
                HStack {
                    Text("Subtotal")
                    Spacer()
                    Text(NSDecimalNumber(decimal: subtotal).doubleValue, format: .currency(code: currencyCode))
                }
                HStack {
                    Text("Tax")
                    Spacer()
                    Text(NSDecimalNumber(decimal: taxAmount).doubleValue, format: .currency(code: currencyCode))
                }
                HStack {
                    Text("Total").font(.headline)
                    Spacer()
                    Text(NSDecimalNumber(decimal: total).doubleValue, format: .currency(code: currencyCode)).font(.headline)
                }
            }

            Section("Notes") {
                TextField("Optional notes for this invoice", text: $notes, axis: .vertical)
                    .lineLimit(3...6)
            }
        }
        .navigationTitle(invoice == nil ? "New Invoice" : "Edit Invoice")
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
        .sheet(isPresented: $showingCustomerPicker) {
            NavigationStack {
                CustomerPickerView(selectedCustomer: $selectedCustomer)
            }
        }
    }

    private func nextInvoiceNumber() -> String {
        String(format: "INV-%04d", allInvoices.count + 1)
    }

    private func save() {
        let targetInvoice: Invoice
        if let invoice {
            targetInvoice = invoice
            for item in targetInvoice.items {
                modelContext.delete(item)
            }
            targetInvoice.items = []
        } else {
            targetInvoice = Invoice(number: nextInvoiceNumber(), customer: selectedCustomer)
            modelContext.insert(targetInvoice)
        }

        targetInvoice.customer = selectedCustomer
        targetInvoice.date = date
        targetInvoice.dueDate = dueDate
        targetInvoice.taxRatePercent = Double(taxRatePercent) ?? 0
        targetInvoice.notes = notes
        targetInvoice.status = status

        for (index, draft) in lineItems.enumerated()
        where !draft.description.trimmingCharacters(in: .whitespaces).isEmpty {
            let item = InvoiceItem(
                itemDescription: draft.description,
                quantity: Double(draft.quantity) ?? 0,
                unitPrice: Decimal(string: draft.unitPrice) ?? 0,
                sortIndex: index
            )
            item.invoice = targetInvoice
            targetInvoice.items.append(item)
            modelContext.insert(item)
        }

        dismiss()
    }
}
