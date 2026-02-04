import SwiftUI
import CoreImage

#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// Renders a QR code for the given URL string using CoreImage's built-in
/// CIQRCodeGenerator filter.  No external dependencies required.
struct QRCodeView: View {
    let url: String

    var body: some View {
        if let image = Self.generate(url) {
            image
                .interpolation(.none)
                .frame(width: 320, height: 320)
        } else {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.gray.opacity(0.2))
                .frame(width: 320, height: 320)
        }
    }

    /// Scale 10× so the native ~33-module QR renders crisply at 320 pt on tvOS.
    private static func generate(_ string: String) -> Image? {
        guard let data = string.data(using: .utf8) else { return nil }

        let filter = CIFilter(name: "CIQRCodeGenerator")!
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")   // medium error-correction

        guard let ci = filter.outputImage else { return nil }

        let scaled = ci.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
        let ctx    = CIContext()
        guard let cg = ctx.createCGImage(scaled, from: scaled.extent) else { return nil }

        #if canImport(UIKit)
        return Image(uiImage: UIImage(cgImage: cg))
        #elseif canImport(AppKit)
        let nsImage = NSImage()
        nsImage.addRepresentation(NSBitmapImageRep(cgImage: cg))
        return Image(nsImage: nsImage)
        #endif
    }
}
