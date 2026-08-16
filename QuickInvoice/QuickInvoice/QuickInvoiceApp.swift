import SwiftUI
import SwiftData

@main
struct QuickInvoiceApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([Customer.self, Invoice.self, InvoiceItem.self])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(sharedModelContainer)
    }
}
